"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useStore } from "@/components/StoreProvider";
import { Button, Card } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/Toast";
import { newId } from "@/lib/store/db";
import { DEMO_SPEED_FACTOR } from "@/lib/demoClock";
import {
  ASPIRATION_CENTS,
  TAKEOUT_CUT_CENTS,
  TAKEOUTS_PER_WEEK,
  categoryTotals,
  coolingRemainingMs,
  formatDollars,
  hoursOfWork,
  keptCents,
  weeksToGoal,
} from "@/lib/money/math";

const DAY_MS = 24 * 60 * 60 * 1000;

export default function MoneyPage() {
  const { ready, state, setState, now, setDemoSpeed } = useStore();
  const { show } = useToast();
  const [title, setTitle] = useState("");
  const [dollars, setDollars] = useState("60");
  const [rateDraft, setRateDraft] = useState(String(state.hourlyRateCents / 100));
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!state.clock.demoSpeed) return;
    const id = window.setInterval(() => setTick((n) => n + 1), 500);
    return () => window.clearInterval(id);
  }, [state.clock.demoSpeed]);

  if (!ready) {
    return (
      <main className="mx-auto min-h-dvh max-w-lg px-4 pt-[calc(1.25rem+env(safe-area-inset-top))]">
        <p className="text-muted">Loading</p>
      </main>
    );
  }

  const totals = categoryTotals(state.spends);
  const kept = keptCents(state.impulses);
  const weeklyCut = TAKEOUT_CUT_CENTS * TAKEOUTS_PER_WEEK;
  const weeks = weeksToGoal(weeklyCut, ASPIRATION_CENTS);
  const hours = hoursOfWork(6000, state.hourlyRateCents);
  const simNow = now();

  function addImpulse() {
    const amountCents = Math.round(Number.parseFloat(dollars) * 100);
    if (!title.trim() || !Number.isFinite(amountCents) || amountCents <= 0) return;
    const coolingUntil = simNow + DAY_MS;
    setState({
      ...state,
      impulses: [
        {
          id: newId(),
          title: title.trim(),
          amountCents,
          status: "cooling",
          coolingUntil,
          createdAt: simNow,
        },
        ...state.impulses,
      ],
    });
    setTitle("");
    show("On the rack. Wait it out.");
  }

  function resolve(id: string, status: "bought" | "skipped") {
    setState({
      ...state,
      impulses: state.impulses.map((item) =>
        item.id === id ? { ...item, status } : item,
      ),
    });
  }

  function saveRate() {
    const cents = Math.round(Number.parseFloat(rateDraft) * 100);
    if (!Number.isFinite(cents) || cents <= 0) return;
    setState({ ...state, hourlyRateCents: cents });
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

      <p className="text-xs font-medium uppercase tracking-[0.22em] text-flash">D3</p>
      <h1 className="mt-3 font-display text-4xl text-white">Money</h1>
      <p className="mt-3 text-sm leading-6 text-muted">
        Kept in your account this month:{" "}
        <span className="text-ice">{formatDollars(kept)}</span>
      </p>

      <Card className="mt-6">
        <p className="text-xs uppercase tracking-[0.14em] text-muted">This month</p>
        <ul className="mt-3 space-y-2 text-sm text-white">
          {Object.entries(totals).length === 0 ? (
            <li className="text-muted">No spends yet. Capture one in Now.</li>
          ) : (
            Object.entries(totals).map(([category, cents]) => (
              <li key={category} className="flex justify-between">
                <span className="capitalize">{category}</span>
                <span>{formatDollars(cents)}</span>
              </li>
            ))
          )}
        </ul>
      </Card>

      <Card className="mt-4">
        <p className="text-xs uppercase tracking-[0.14em] text-muted">Micro-sacrifice</p>
        <p className="mt-2 text-sm leading-6 text-white">
          Two fewer takeaways a week ({formatDollars(weeklyCut)}) reaches an $800 trip in{" "}
          {Number.isFinite(weeks) ? `${weeks} weeks` : "never"}.
        </p>
      </Card>

      <Card className="mt-4">
        <p className="text-xs uppercase tracking-[0.14em] text-muted">Impulse rack</p>
        <p className="mt-2 text-sm text-muted">
          At {formatDollars(state.hourlyRateCents)}/hour, $60 is about {hours.toFixed(1)} hours
          of work.
        </p>
        <label className="mt-3 block text-xs text-muted">
          Hour of my time (not salary)
          <input
            value={rateDraft}
            onChange={(event) => setRateDraft(event.target.value)}
            onBlur={saveRate}
            inputMode="decimal"
            className="mt-1 min-h-tap w-full rounded-pill border border-white/10 bg-transparent px-4 text-white"
          />
        </label>
        <div className="mt-3 flex gap-2">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Thing you want"
            aria-label="Impulse item"
            className="min-h-tap min-w-0 flex-1 rounded-pill border border-white/10 bg-transparent px-4 text-white"
          />
          <input
            value={dollars}
            onChange={(event) => setDollars(event.target.value)}
            aria-label="Price"
            className="min-h-tap w-24 rounded-pill border border-white/10 bg-transparent px-3 text-white"
          />
        </div>
        <Button type="button" className="mt-3" onClick={addImpulse}>
          Park it for 24 hours
        </Button>
        <label className="mt-4 flex min-h-tap items-center justify-between gap-3 text-sm text-white">
          Demo speed
          <input
            type="checkbox"
            className="h-5 w-5 accent-[#ff2d92]"
            checked={state.clock.demoSpeed}
            onChange={(event) => setDemoSpeed(event.target.checked)}
          />
        </label>
        <ul className="mt-4 flex flex-col gap-3">
          {state.impulses.map((item) => {
            const remaining = coolingRemainingMs(item.coolingUntil, simNow);
            const readyToDecide = remaining === 0 || item.status !== "cooling";
            const hoursItem = hoursOfWork(item.amountCents, state.hourlyRateCents);
            return (
              <li key={item.id} className="rounded-2xl border border-white/10 p-4">
                <p className="text-white">{item.title}</p>
                <p className="mt-1 text-sm text-muted">
                  {formatDollars(item.amountCents)} · {hoursItem.toFixed(1)} hours of work
                </p>
                <p className="mt-1 text-xs text-muted">
                  Skip it and that money covers groceries, a bill, or the trip fund. Buying
                  it now spends a future Saturday.
                </p>
                {item.status === "cooling" && remaining > 0 ? (
                  <p className="mt-2 text-xs text-ice">
                    Cooling: {Math.ceil(remaining / (state.clock.demoSpeed ? 1000 : 3_600_000))}{" "}
                    {state.clock.demoSpeed ? "simulated hours" : "hours"} left
                    {state.clock.demoSpeed
                      ? ` (~${Math.ceil(remaining / DEMO_SPEED_FACTOR / 1000)}s real)`
                      : ""}
                  </p>
                ) : null}
                {item.status === "cooling" && readyToDecide ? (
                  <div className="mt-3 flex gap-2">
                    <Button type="button" variant="ghost" onClick={() => resolve(item.id, "skipped")}>
                      Skipped it
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => resolve(item.id, "bought")}>
                      Bought it
                    </Button>
                  </div>
                ) : (
                  <p className="mt-2 text-xs uppercase tracking-[0.14em] text-muted">
                    {item.status}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </Card>

      <Link
        href="/"
        className="mt-10 inline-flex min-h-tap items-center justify-center rounded-pill border border-white/10 bg-white/5 text-sm font-semibold text-white"
      >
        Done for now
      </Link>
    </main>
  );
}
