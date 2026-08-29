"use client";

import Link from "next/link";
import { useStore } from "@/components/StoreProvider";
import { Button, EmptyState } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/Toast";
import { describeCorrection } from "@/lib/aura/lifeModel";

export default function LifeModelPage() {
  const { ready, state, setState } = useStore();
  const { show } = useToast();

  if (!ready) {
    return (
      <main className="mx-auto min-h-dvh max-w-lg px-4 pt-[calc(1.25rem+env(safe-area-inset-top))]">
        <p className="text-muted">Loading</p>
      </main>
    );
  }

  const rejects = state.corrections.filter((row) => row.status === "rejected_unspecified");
  const known = state.corrections.filter((row) => row.status === "corrected");
  const receipts = state.events.filter((event) => event.type === "capture").slice(0, 20);

  function remove(id: string) {
    const snapshot = state;
    setState({
      ...state,
      corrections: state.corrections.filter((row) => row.id !== id),
    });
    show("Forgot that rule.", () => setState(snapshot));
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col px-4 pb-12 pt-[calc(1.25rem+env(safe-area-inset-top))]">
      <p className="text-xs font-medium uppercase tracking-[0.22em] text-flash">D2</p>
      <h1 className="mt-3 font-display text-4xl text-white">What Aura knows</h1>
      <p className="mt-3 text-sm leading-6 text-muted">
        Every correction lives here. Delete a row and the old guess can come back.
      </p>

      <section className="mt-8">
        <h2 className="text-xs uppercase tracking-[0.16em] text-muted">
          What Aura will not assume
        </h2>
        <ul className="mt-3 flex flex-col gap-3">
          {rejects.length === 0 ? (
            <EmptyState
              title="Nothing rejected yet"
              body="Tap ✗ on a wrong capture in Now. It will show up here."
            />
          ) : (
            rejects.map((row) => (
              <li
                key={row.id}
                className="rounded-card border border-white/10 bg-white/[0.03] p-5"
              >
                <p className="text-sm leading-6 text-white">{describeCorrection(row)}</p>
                <p className="mt-2 text-xs text-muted">From: {row.inputSnippet}</p>
                <Button
                  type="button"
                  variant="ghost"
                  className="mt-3"
                  onClick={() => remove(row.id)}
                >
                  Delete
                </Button>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-xs uppercase tracking-[0.16em] text-muted">Edits you made</h2>
        <ul className="mt-3 flex flex-col gap-3">
          {known.length === 0 ? (
            <p className="text-sm text-muted">No edits stored yet.</p>
          ) : (
            known.map((row) => (
              <li
                key={row.id}
                className="rounded-card border border-white/10 bg-white/[0.03] p-5"
              >
                <p className="text-sm leading-6 text-white">{describeCorrection(row)}</p>
                <Button
                  type="button"
                  variant="ghost"
                  className="mt-3"
                  onClick={() => remove(row.id)}
                >
                  Delete
                </Button>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-xs uppercase tracking-[0.16em] text-muted">Stayed on this device</h2>
        <ul className="mt-3 flex flex-col gap-2">
          {receipts.length === 0 ? (
            <p className="text-sm text-muted">No captures yet.</p>
          ) : (
            receipts.map((event) => (
              <li key={event.id} className="text-sm text-muted">
                Capture · {String(event.payload.kind ?? "note")} · local rules · 0 words sent
                off device
              </li>
            ))
          )}
        </ul>
      </section>

      <Link
        href="/"
        className="mt-10 inline-flex min-h-tap items-center justify-center rounded-pill border border-white/10 bg-white/5 text-sm font-semibold text-white"
      >
        Done for now
      </Link>
    </main>
  );
}
