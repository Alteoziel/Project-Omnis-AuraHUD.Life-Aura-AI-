"use client";

import { useEffect, useRef, useState } from "react";
import { IconButton } from "@/components/ui/primitives";
import { getSpeechRecognition } from "@/lib/aura/speech";

export function CommandBar({
  onCapture,
}: {
  onCapture: (text: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [listening, setListening] = useState(false);
  const [speech, setSpeech] = useState<"ok" | "missing" | "denied">("ok");

  useEffect(() => {
    inputRef.current?.focus();
    if (!getSpeechRecognition()) setSpeech("missing");
  }, []);

  function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    onCapture(trimmed);
    setValue("");
    inputRef.current?.focus();
  }

  function startVoice() {
    const rec = getSpeechRecognition();
    if (!rec) {
      setSpeech("missing");
      return;
    }
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.continuous = false;
    rec.onresult = (event) => {
      const said = event.results[0]?.[0]?.transcript ?? "";
      if (said) submit(said);
    };
    rec.onerror = () => {
      setSpeech("denied");
      setListening(false);
    };
    rec.onend = () => setListening(false);
    try {
      rec.start();
      setListening(true);
    } catch {
      setSpeech("denied");
    }
  }

  return (
    <form
      className="sticky top-[env(safe-area-inset-top)] z-20 -mx-4 bg-ink/80 px-4 py-3 backdrop-blur-md"
      onSubmit={(event) => {
        event.preventDefault();
        submit(value);
      }}
    >
      <div className="flex items-center gap-2 rounded-pill border border-white/10 bg-white/5 px-3 py-1">
        <input
          ref={inputRef}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Say it or type it"
          aria-label="Capture"
          className="min-h-tap min-w-0 flex-1 bg-transparent text-base text-white outline-none placeholder:text-muted"
        />
        {speech === "missing" ? null : (
          <IconButton
            type="button"
            label={listening ? "Listening" : "Speak"}
            onClick={startVoice}
            className={listening ? "border-flash text-flash" : undefined}
          >
            {listening ? (
              <span className="h-2 w-2 rounded-full bg-flash" />
            ) : (
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.9V21h2v-3.1A7 7 0 0 0 19 11h-2Z"
                />
              </svg>
            )}
          </IconButton>
        )}
      </div>
      {speech === "denied" ? (
        <p className="mt-2 text-xs text-muted">Mic is off. Typing still works.</p>
      ) : (
        <p className="mt-2 text-xs text-muted">
          On iPhone, Safari may send audio to Apple to turn speech into text. Typed
          captures stay on this device.
        </p>
      )}
    </form>
  );
}
