const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

export const SILENCE_MS = 2200;

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
  if (/(take (the )?suit off|suit off|armor off|remove (the )?(suit|armor)|stand down|peel (the )?suit)/.test(text)) {
    return { type: "suit", on: false };
  }
  if (/(send the suit|suit up|deploy (the )?suit|armor on|nano.?suit|send (the )?armor)/.test(text)) {
    return { type: "suit", on: true };
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
  let speaking = false;
  let buffer = "";
  let silenceTimer = null;

  const clearSilence = () => {
    if (silenceTimer) {
      window.clearTimeout(silenceTimer);
      silenceTimer = null;
    }
  };

  const commit = () => {
    silenceTimer = null;
    const text = buffer.trim();
    buffer = "";
    if (!text || speaking) {
      return;
    }
    onHeard?.(text, true);
    const command = parseCommand(text);
    if (command.type !== "empty") {
      onCommand?.(command, text);
    }
  };

  const armSilence = () => {
    clearSilence();
    silenceTimer = window.setTimeout(commit, SILENCE_MS);
  };

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
    utter.onstart = () => {
      speaking = true;
      buffer = "";
      clearSilence();
    };
    utter.onend = () => {
      speaking = false;
    };
    utter.onerror = () => {
      speaking = false;
    };
    speaking = true;
    window.speechSynthesis.speak(utter);
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
      if (speaking) {
        return;
      }
      let interim = "";
      let finals = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const chunk = event.results[i][0]?.transcript || "";
        if (event.results[i].isFinal) {
          finals += `${finals ? " " : ""}${chunk}`;
        } else {
          interim += chunk;
        }
      }
      if (finals) {
        buffer = `${buffer} ${finals}`.replace(/\s+/g, " ").trim();
      }
      const display = `${buffer} ${interim}`.replace(/\s+/g, " ").trim();
      if (display) {
        onHeard?.(display, false);
        armSilence();
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
    clearSilence();
    buffer = "";
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
