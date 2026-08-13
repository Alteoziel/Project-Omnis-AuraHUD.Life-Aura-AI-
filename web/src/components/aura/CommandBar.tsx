"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type Receipt = {
  message: string;
  word_count: number;
  provider: string;
};

export function CommandBar() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = text.trim();
    if (!value || pending) return;
    setError(null);
    setNote(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/aura/route-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: value }),
        });
        const data = (await res.json()) as {
          error?: string;
          receipt?: Receipt;
        };
        if (!res.ok) {
          setError(data.error ?? "Capture failed");
          return;
        }
        setText("");
        setReceipt(data.receipt ?? null);
        router.refresh();
      } catch {
        setError("Network error — try again");
      }
    });
  }

  return (
    <div className="space-y-2">
      <form onSubmit={onSubmit} className="relative">
        <label htmlFor="aura-command" className="sr-only">
          Capture with Life Aura
        </label>
        <input
          id="aura-command"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Tell Aura anything — task, reminder, spend…"
          autoComplete="off"
          maxLength={500}
          className="w-full rounded-2xl border border-ink-900/10 bg-sand-50/90 px-4 py-4 pr-24 text-base text-ink-900 shadow-soft outline-none ring-moss-400/40 placeholder:text-ink-400 focus:ring-2"
        />
        <button
          type="submit"
          disabled={pending || !text.trim()}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl bg-moss-600 px-3 py-2 text-sm font-bold text-sand-50 disabled:opacity-50"
        >
          {pending ? "…" : "Capture"}
        </button>
      </form>
      {receipt ? (
        <p className="text-xs text-ink-500" role="status">
          {receipt.message}
        </p>
      ) : null}
      {note ? (
        <p className="text-xs font-semibold text-moss-600" role="status">
          {note}
        </p>
      ) : null}
      {error ? (
        <p className="text-xs font-semibold text-coral-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
