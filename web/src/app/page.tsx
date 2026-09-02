"use client";

import { useState } from "react";
import Link from "next/link";
import { useStore } from "@/components/StoreProvider";
import { Sheet } from "@/components/ui/Sheet";
import { Sparkline } from "@/components/ui/Sparkline";
import { Button, Card, Chip, Skeleton } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/Toast";
import { countSeededItems } from "@/lib/store/seed";
import { DEMO_IDS, type DemoId } from "@/lib/store/schema";

const DEMOS: Array<{
  id: DemoId;
  kicker: string;
  title: string;
  problem: string;
  href?: string;
}> = [
  {
    id: "now",
    kicker: "D1",
    title: "Now",
    problem: "Get it out of your head in 3 seconds, then do the one thing that matters.",
    href: "/now",
  },
  {
    id: "life-model",
    kicker: "D2",
    title: "Life Model",
    problem: "Correct Aura once. It stays corrected — and you can see what it believes.",
    href: "/life-model",
  },
  {
    id: "money",
    kicker: "D3",
    title: "Money",
    problem: "Stop the leak. Block the regret buy. Keep a dollar number you believe.",
    href: "/money",
  },
  {
    id: "follow-through",
    kicker: "D4",
    title: "Follow-through",
    problem: "Captured intentions actually get done. The nag backs off as you do.",
    href: "/follow-through",
  },
  {
    id: "digest",
    kicker: "D5",
    title: "Weekly digest",
    problem: "One true noticing about your week. One tap to act.",
  },
  {
    id: "paperwork",
    kicker: "D6",
    title: "Paperwork",
    problem: "Photo the mail. Get the due date, the amount, and what to do.",
  },
];

export default function HomePage() {
  const { ready, state, seedWeek, reset, setDemoSpeed, setState } = useStore();
  const { show } = useToast();
  const [confirmReset, setConfirmReset] = useState(false);
  const seededCount = countSeededItems(state);

  if (!ready) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-lg flex-col gap-4 px-4 pb-10 pt-[calc(1.25rem+env(safe-area-inset-top))]">
        <Skeleton className="h-28" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col px-4 pb-12 pt-[calc(1.25rem+env(safe-area-inset-top))]">
      {state.clock.demoSpeed ? (
        <div
          role="status"
          className="mb-4 flex min-h-tap items-center justify-center rounded-pill border border-ice/30 bg-ice/10 text-xs font-semibold uppercase tracking-[0.16em] text-ice"
        >
          Demo speed on · 1s = 1 hour
        </div>
      ) : null}

      <header className="animate-rise pb-8 pt-4">
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-flash">
          AuraHUD
        </p>
        <h1 className="mt-3 font-display text-5xl font-extrabold leading-[0.95] text-white">
          Your life,
          <br />
          in a glance.
        </h1>
        <p className="mt-4 max-w-sm text-sm leading-6 text-muted">
          Six polished demos. No account. Nothing leaves this phone unless you export it.
        </p>
      </header>

      <Card className="mb-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-muted">This device</p>
            <p className="mt-1 text-lg text-white">
              {state.seededAt ? `${seededCount} items in the vault` : "Empty vault"}
            </p>
          </div>
          <Sparkline
            className="h-8 w-24 text-flash"
            values={
              state.spends.length > 1
                ? state.spends.map((item) => item.amountCents)
                : [4, 8, 6, 12, 9]
            }
          />
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={() => {
              void seedWeek().then(() => show("A week of history is on this device."));
            }}
          >
            Seed a week of history
          </Button>
          <Button type="button" variant="ghost" onClick={() => setConfirmReset(true)}>
            Reset demo data
          </Button>
        </div>
        <label className="mt-5 flex min-h-tap items-center justify-between gap-3 rounded-2xl border border-white/10 px-4 py-3">
          <span className="text-sm text-white">Demo speed</span>
          <input
            type="checkbox"
            className="h-5 w-5 accent-[#ff2d92]"
            checked={state.clock.demoSpeed}
            onChange={(event) => setDemoSpeed(event.target.checked)}
          />
        </label>
      </Card>

      <ol className="flex flex-col gap-3">
        {DEMOS.map((demo, index) => (
          <li
            key={demo.id}
            className="animate-rise"
            style={{ animationDelay: `${index * 40}ms` }}
          >
            {demo.href ? (
              <Link href={demo.href} className="block rounded-card border border-white/10 bg-white/[0.03] p-5">
                <div className="flex items-center justify-between">
                  <Chip>{demo.kicker}</Chip>
                  <span className="text-xs uppercase tracking-[0.16em] text-ice">Open</span>
                </div>
                <h2 className="mt-4 font-display text-3xl text-white">{demo.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted">{demo.problem}</p>
              </Link>
            ) : (
              <article className="rounded-card border border-white/10 bg-white/[0.03] p-5">
                <div className="flex items-center justify-between">
                  <Chip>{demo.kicker}</Chip>
                  <span className="text-xs uppercase tracking-[0.16em] text-muted">Next</span>
                </div>
                <h2 className="mt-4 font-display text-3xl text-white">{demo.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted">{demo.problem}</p>
              </article>
            )}
          </li>
        ))}
      </ol>

      <p className="mt-8 text-center text-xs text-muted">
        {DEMO_IDS.length} demos · local only · Cloud AI off
      </p>

      <Sheet
        open={confirmReset}
        title="Reset this device?"
        onClose={() => setConfirmReset(false)}
      >
        <p className="text-sm leading-6 text-muted">
          Everything stored here is wiped. Undo is available for a few seconds after.
        </p>
        <div className="mt-5 flex gap-2">
          <Button
            type="button"
            variant="danger"
            onClick={() => {
              const snapshot = state;
              void reset().then(() => {
                setConfirmReset(false);
                show("Vault wiped.", () => setState(snapshot));
              });
            }}
          >
            Wipe it
          </Button>
          <Button type="button" variant="ghost" onClick={() => setConfirmReset(false)}>
            Keep it
          </Button>
        </div>
      </Sheet>
    </main>
  );
}
