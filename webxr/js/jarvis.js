const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

export function parseCommand(raw) {
  const text = String(raw || "")
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) {
    return { type: "empty" };
  }
  if (/(minimi|stow|collapse|visor down|hud down|shut the visor)/.test(text)) {
    return { type: "minimize" };
  }
  if (/(restor|maximi|expand|visor up|full hud|wake visor|bring it back)/.test(text)) {
    return { type: "restore" };
  }
  if (/desk/.test(text)) {
    return { type: "toggle", id: "desk_light" };
  }
  if (/ceiling/.test(text)) {
    return { type: "toggle", id: "ceiling_light" };
  }
  if (/scan/.test(text)) {
    return { type: "toggle", id: "scan_room" };
  }
  if (/(status|report|system|how are we)/.test(text)) {
    return { type: "status" };
  }
  if (/sage/.test(text)) {
    return { type: "holo", id: "sage" };
  }
  if (/lord|mask/.test(text)) {
    return { type: "holo", id: "masked_lord" };
  }
  if (/emperor|hood/.test(text)) {
    return { type: "holo", id: "hooded_emperor" };
  }
  if (/knight/.test(text)) {
    return { type: "holo", id: "young_knight" };
  }
  if (/(holo|comm|projector|open channel|call)/.test(text)) {
    return { type: "holo", id: "sage" };
  }
  return { type: "unknown", text };
}

function pickVoice() {
  const voices = window.speechSynthesis?.getVoices?.() ?? [];
  return (
    voices.find((v) => /en-GB|Daniel|Google UK/i.test(`${v.name} ${v.lang}`)) ||
    voices.find((v) => /^en/i.test(v.lang)) ||
    null
  );
}

export function createJarvis({ onHeard, onCommand, onState } = {}) {
  let recognition = null;
  let enabled = false;
  let restarting = false;

  const speak = (line) => {
    if (!window.speechSynthesis) {
      return;
    }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(line);
    const voice = pickVoice();
    if (voice) {
      utter.voice = voice;
    }
    utter.rate = 1.04;
    utter.pitch = 0.86;
    utter.lang = voice?.lang || "en-GB";
    window.speechSynthesis.speak(utter);
  };

  const handleText = (text, isFinal) => {
    onHeard?.(text, isFinal);
    if (!isFinal) {
      return;
    }
    const command = parseCommand(text);
    if (command.type !== "empty") {
      onCommand?.(command, text);
    }
  };

  const attach = () => {
    if (!SpeechRecognition) {
      onState?.("unavailable");
      return null;
    }
    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    rec.onresult = (event) => {
      let interim = "";
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const chunk = event.results[i][0]?.transcript || "";
        if (event.results[i].isFinal) {
          finalText += chunk;
        } else {
          interim += chunk;
        }
      }
      if (interim) {
        handleText(interim, false);
      }
      if (finalText) {
        handleText(finalText, true);
      }
    };
    rec.onerror = () => {
      onState?.(enabled ? "live" : "standby");
    };
    rec.onend = () => {
      if (enabled && !restarting) {
        restarting = true;
        window.setTimeout(() => {
          restarting = false;
          if (enabled) {
            try {
              rec.start();
            } catch {
              /* already started */
            }
          }
        }, 240);
      }
    };
    return rec;
  };

  const start = async () => {
    if (enabled) {
      return true;
    }
    recognition = attach();
    if (!recognition) {
      return false;
    }
    enabled = true;
    try {
      recognition.start();
      onState?.("live");
      return true;
    } catch {
      enabled = false;
      onState?.("denied");
      return false;
    }
  };

  const stop = () => {
    enabled = false;
    try {
      recognition?.stop();
    } catch {
      /* ignore */
    }
    onState?.("standby");
  };

  return {
    start,
    stop,
    speak,
    parseCommand,
    get enabled() {
      return enabled;
    },
    get available() {
      return Boolean(SpeechRecognition);
    },
  };
}
