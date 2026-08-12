"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export type StreamEvent = {
  id: string;
  kind: string;
  title: string;
  body: string;
  feedback: string | null;
  created_at: string;
};

export function MicroFeedback({
  eventId,
  disabled,
}: {
  eventId: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");

  function send(feedback: "confirmed" | "rejected" | "edited", editedTitle?: string) {
    startTransition(async () => {
      const res = await fetch("/api/aura/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, feedback, editedTitle }),
      });
      const data = (await res.json()) as { note?: string };
      if (feedback === "rejected") {
        setNote(data.note ?? "Noted — I won’t assume that again.");
      }
      setEditing(false);
      router.refresh();
    });
  }

  if (disabled) return null;

  return (
    <div className="mt-2 space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => send("confirmed")}
          className="rounded-lg bg-moss-500/15 px-2.5 py-1 text-xs font-bold text-moss-700"
          aria-label="Confirm"
        >
          ✓
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => send("rejected")}
          className="rounded-lg bg-coral-500/15 px-2.5 py-1 text-xs font-bold text-coral-700"
          aria-label="Reject — do not assume again"
        >
          ✗
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => setEditing((v) => !v)}
          className="rounded-lg bg-ink-900/8 px-2.5 py-1 text-xs font-bold text-ink-700"
          aria-label="Quick edit"
        >
          ✎
        </button>
      </div>
      {editing ? (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (editTitle.trim()) send("edited", editTitle.trim());
          }}
        >
          <input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="Correct title"
            className="min-w-0 flex-1 rounded-lg border border-ink-900/10 bg-sand-50 px-2 py-1 text-sm"
          />
          <button
            type="submit"
            className="rounded-lg bg-ink-900 px-2 py-1 text-xs font-bold text-sand-50"
          >
            Save
          </button>
        </form>
      ) : null}
      {note ? (
        <p className="text-xs font-semibold text-moss-600" role="status">
          {note}
        </p>
      ) : null}
    </div>
  );
}

export function TodayStream({
  events,
  tasks,
}: {
  events: StreamEvent[];
  tasks: Array<{
    id: string;
    title: string;
    due_on: string | null;
    priority: number;
    status: string;
  }>;
}) {
  const openTasks = tasks.filter((t) => t.status === "open").slice(0, 3);
  const recent = events.slice(0, 12);

  return (
    <div className="space-y-8">
      <section className="animate-rise">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-moss-500">
          Now
        </p>
        <h2 className="mt-1 font-display text-2xl font-semibold text-ink-900">
          {openTasks[0]?.title ?? "Nothing urgent — capture when ready"}
        </h2>
        {openTasks[0]?.due_on ? (
          <p className="mt-1 text-sm text-ink-600">Due {openTasks[0].due_on}</p>
        ) : null}
      </section>

      <section className="animate-rise-delay">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-moss-500">
          Next
        </p>
        <ul className="mt-3 space-y-2">
          {openTasks.slice(1).length === 0 ? (
            <li className="text-sm text-ink-600">Your next three will show here.</li>
          ) : (
            openTasks.slice(1).map((t) => (
              <li
                key={t.id}
                className="rounded-xl border border-ink-900/8 bg-sand-50/70 px-3 py-2 text-sm font-semibold text-ink-800"
              >
                {t.title}
                {t.due_on ? (
                  <span className="ml-2 text-xs font-medium text-ink-500">
                    {t.due_on}
                  </span>
                ) : null}
              </li>
            ))
          )}
        </ul>
      </section>

      <section>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-moss-500">
          Captured
        </p>
        <ul className="mt-3 space-y-3">
          {recent.length === 0 ? (
            <li className="text-sm text-ink-600">
              Captures land here with ✓ ✗ ✎ — an ✗ is never forgotten.
            </li>
          ) : (
            recent.map((ev) => (
              <li
                key={ev.id}
                className="rounded-2xl border border-ink-900/8 bg-sand-50/80 px-4 py-3 shadow-soft"
              >
                <p className="text-sm font-bold text-ink-900">{ev.title}</p>
                {ev.body ? (
                  <p className="mt-1 text-xs text-ink-600">{ev.body}</p>
                ) : null}
                {ev.feedback ? (
                  <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                    {ev.feedback}
                  </p>
                ) : (
                  <MicroFeedback eventId={ev.id} />
                )}
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
