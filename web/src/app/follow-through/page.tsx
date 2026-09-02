"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useStore } from "@/components/StoreProvider";
import { Button, Card, Chip, EmptyState } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/Toast";
import { rankOpen, todayIso } from "@/lib/aura/capture";
import {
  RUNG_LABELS,
  SCORE_DELTA_IGNORED,
  SNOOZE_MS,
  canUseDailySkip,
  clampScore,
  displayedRung,
  intensitySentence,
  isFrozen,
  notificationSupported,
  rungDelaysMs,
  scoreDeltaForComplete,
  type Rung,
} from "@/lib/aura/escalation";
import { newId } from "@/lib/store/db";
import type { FollowThroughState, TaskRecord } from "@/lib/store/schema";

function playTakeoverBeep() {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 440;
    gain.gain.value = 0.04;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.18);
    window.setTimeout(() => void ctx.close(), 400);
  } catch {
    // Autoplay or AudioContext can fail; the takeover UI still works.
  }
}

async function pingSystem(title: string): Promise<boolean> {
  if (!notificationSupported()) return false;
  if (Notification.permission !== "granted") return false;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const body = "Still on your list. Open AuraHUD when you can.";
    if (reg) {
      await reg.showNotification(title, {
        body,
        icon: "/icons/icon-192.png",
        tag: "aurahud-follow-through",
      });
    } else {
      new Notification(title, { body });
    }
    return true;
  } catch {
    return false;
  }
}

export default function FollowThroughPage() {
  const { ready, state, setState, now, setDemoSpeed } = useStore();
  const { show } = useToast();
  const [, setTick] = useState(0);
  const [notifyNote, setNotifyNote] = useState<string | null>(null);
  const announced = useRef(state.followThrough.lastAnnouncedRung);

  useEffect(() => {
    announced.current = state.followThrough.lastAnnouncedRung;
  }, [state.followThrough.lastAnnouncedRung]);

  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 250);
    return () => window.clearInterval(id);
  }, []);

  const simNow = ready ? now() : 0;
  const ft = state.followThrough;
  const today = todayIso(simNow);
  const watching = state.tasks.find((task) => task.id === ft.watchingId) ?? null;
  const rung: Rung = displayedRung(ft, simNow);
  const frozen = isFrozen(ft, simNow);
  const openTasks = rankOpen(state.tasks, today, rung >= 2 ? ft.watchingId : null);
  const skipOk = canUseDailySkip(ft.skipUsedOn, today);

  const announce = useCallback(
    (nextRung: Rung, task: TaskRecord) => {
      if (nextRung === 1) {
        show(`Still on your list: ${task.title}`);
      }
      if (nextRung === 3) {
        void pingSystem(task.title).then((sent) => {
          if (!sent) {
            setNotifyNote(
              "No system banner. The in-app ladder still works. iPhone needs an installed Home Screen app, and background timing is unreliable.",
            );
          }
        });
      }
      if (nextRung === 4) playTakeoverBeep();
    },
    [show],
  );

  useEffect(() => {
    if (!ready || !watching || ft.startedAt == null) return;
    if (frozen) return;
    if (rung <= announced.current) return;
    for (let step = announced.current + 1; step <= rung; step += 1) {
      announce(step as Rung, watching);
    }
    announced.current = rung;
    setState((prev) => ({
      ...prev,
      followThrough: { ...prev.followThrough, lastAnnouncedRung: rung },
    }));
  }, [announce, frozen, ft.startedAt, ready, rung, setState, watching]);

  function patchFt(patch: Partial<FollowThroughState>) {
    setState((prev) => ({
      ...prev,
      followThrough: { ...prev.followThrough, ...patch },
    }));
  }

  function startWatching(task: TaskRecord) {
    announced.current = 0;
    setState((prev) => ({
      ...prev,
      followThrough: {
        ...prev.followThrough,
        watchingId: task.id,
        startedAt: now(),
        snoozedUntil: null,
        lastAnnouncedRung: 0,
      },
      events: [
        { id: newId(), type: "follow_through_start", at: now(), payload: { taskId: task.id } },
        ...prev.events,
      ],
    }));
    show("Ladder armed. Demo speed makes each rung a few seconds.");
  }

  function complete() {
    if (!watching) return;
    const previous = state;
    const delta = scoreDeltaForComplete(rung);
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((task) =>
        task.id === watching.id ? { ...task, status: "done" } : task,
      ),
      followThrough: {
        ...prev.followThrough,
        score: clampScore(prev.followThrough.score + delta),
        watchingId: null,
        startedAt: null,
        snoozedUntil: null,
        lastAnnouncedRung: 0,
      },
      events: [
        { id: newId(), type: "follow_through_done", at: now(), payload: { rung } },
        ...prev.events,
      ],
    }));
    announced.current = 0;
    show("Done. Aura will go easier next time.", () => setState(previous));
  }

  function snooze() {
    const until = now() + SNOOZE_MS;
    announced.current = 0;
    patchFt({
      snoozedUntil: until,
      startedAt: until,
      lastAnnouncedRung: 0,
    });
    show("Snoozed two hours.");
  }

  function skip() {
    if (!watching) return;
    if (!skipOk) {
      show("That skip is already used today.");
      return;
    }
    const previous = state;
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((task) =>
        task.id === watching.id ? { ...task, status: "skipped" } : task,
      ),
      followThrough: {
        ...prev.followThrough,
        skipUsedOn: today,
        watchingId: null,
        startedAt: null,
        snoozedUntil: null,
        lastAnnouncedRung: 0,
      },
    }));
    announced.current = 0;
    show("Skipped. No guilt, once a day.", () => setState(previous));
  }

  function dismissTakeover() {
    if (!watching) return;
    const nextScore = clampScore(ft.score + SCORE_DELTA_IGNORED);
    const delays = rungDelaysMs(nextScore);
    announced.current = 3;
    patchFt({
      score: nextScore,
      lastAnnouncedRung: 3,
      startedAt: now() - delays[2],
    });
    show("Noted. Aura will nudge sooner next time.");
  }

  async function requestNotify() {
    if (!notificationSupported()) {
      setNotifyNote("This browser has no Notification API. The in-app ladder still works.");
      return;
    }
    try {
      const result = await Notification.requestPermission();
      if (result === "granted") {
        setNotifyNote("Banners are on. iPhone still needs the installed Home Screen app.");
      } else {
        setNotifyNote(
          "Permission denied. Nothing is broken — rungs stay in the app.",
        );
      }
    } catch {
      setNotifyNote("Could not ask. The in-app ladder still works.");
    }
  }

  if (!ready) {
    return (
      <main className="mx-auto min-h-dvh max-w-lg px-4 pt-[calc(1.25rem+env(safe-area-inset-top))]">
        <p className="text-muted">Loading</p>
      </main>
    );
  }

  return (
    <main className="relative mx-auto flex min-h-dvh max-w-lg flex-col px-4 pb-12 pt-[calc(1.25rem+env(safe-area-inset-top))]">
      {state.clock.demoSpeed ? (
        <div
          role="status"
          className="mb-4 flex min-h-tap items-center justify-center rounded-pill border border-ice/30 bg-ice/10 text-xs font-semibold uppercase tracking-[0.16em] text-ice"
        >
          Demo speed on · 1s = 1 hour
        </div>
      ) : null}

      <p className="text-xs font-medium uppercase tracking-[0.22em] text-flash">D4</p>
      <h1 className="mt-3 font-display text-4xl font-extrabold text-white">Follow-through</h1>
      <p className="mt-3 text-sm leading-6 text-muted">
        A captured intention walks a four-rung ladder. It backs off when you actually do it.
      </p>

      <Card className="mt-6">
        <p className="text-xs uppercase tracking-[0.14em] text-muted">Intensity</p>
        <p className="mt-2 text-lg text-white">{intensitySentence(ft.score)}</p>
        <p className="mt-1 text-sm text-muted">Responsiveness {ft.score} of 100</p>
      </Card>

      <Card className="mt-4">
        <p className="text-xs uppercase tracking-[0.14em] text-muted">Ladder</p>
        <ol className="mt-4 flex flex-col gap-2">
          {RUNG_LABELS.map((label, index) => {
            const active = watching != null && rung === index;
            const passed = watching != null && rung > index;
            return (
              <li
                key={label}
                className={`flex min-h-tap items-center justify-between rounded-2xl border px-4 py-3 ${
                  active
                    ? "border-flash/60 bg-flash/10 text-white"
                    : "border-white/10 text-muted"
                }`}
              >
                <span className="text-sm">
                  {index}. {label}
                </span>
                <Chip className={active || passed ? "text-ice" : undefined}>
                  {active ? "Now" : passed ? "Passed" : "Next"}
                </Chip>
              </li>
            );
          })}
        </ol>
        {frozen ? (
          <p className="mt-3 text-sm text-ice">
            {ft.muted
              ? "Muted. The ladder is frozen."
              : ft.snoozedUntil && simNow < ft.snoozedUntil
                ? "Snoozed. It will start again in two simulated hours."
                : "Quiet hours. Nothing escalates until morning."}
          </p>
        ) : null}
      </Card>

      <Card className="mt-4">
        {watching ? (
          <>
            <p className="text-xs uppercase tracking-[0.14em] text-muted">Watching</p>
            <h2 className="mt-2 font-display text-2xl text-white">{watching.title}</h2>
            <p className="mt-2 text-sm text-muted">
              {watching.dueOn ? `Due ${watching.dueOn}` : "No date"}
              {rung >= 2 ? " · pinned to Now" : ""}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" onClick={complete}>
                Done
              </Button>
              <Button type="button" variant="ghost" onClick={snooze}>
                Snooze
              </Button>
              <Button type="button" variant="ghost" onClick={skip} disabled={!skipOk}>
                Skip today
              </Button>
            </div>
          </>
        ) : openTasks.length > 0 ? (
          <>
            <p className="text-xs uppercase tracking-[0.14em] text-muted">Pick a task</p>
            <ul className="mt-3 flex flex-col gap-2">
              {openTasks.slice(0, 5).map((task) => (
                <li key={task.id} className="flex min-h-tap items-center justify-between gap-3">
                  <span className="text-sm text-white">{task.title}</span>
                  <Button type="button" variant="ghost" onClick={() => startWatching(task)}>
                    Watch
                  </Button>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <EmptyState
            title="Nothing to watch"
            body="Capture a task in Now, or seed a week of history from home."
          />
        )}
      </Card>

      <Card className="mt-4">
        <p className="text-xs uppercase tracking-[0.14em] text-muted">Grace</p>
        <label className="mt-3 flex min-h-tap items-center justify-between gap-3 rounded-2xl border border-white/10 px-4 py-3">
          <span className="text-sm text-white">Demo speed</span>
          <input
            type="checkbox"
            className="h-5 w-5 accent-[#ff2d92]"
            checked={state.clock.demoSpeed}
            onChange={(event) => setDemoSpeed(event.target.checked)}
          />
        </label>
        <label className="mt-2 flex min-h-tap items-center justify-between gap-3 rounded-2xl border border-white/10 px-4 py-3">
          <span className="text-sm text-white">Hard mute</span>
          <input
            type="checkbox"
            className="h-5 w-5 accent-[#ff2d92]"
            checked={ft.muted}
            onChange={(event) => patchFt({ muted: event.target.checked })}
          />
        </label>
        <label className="mt-2 flex min-h-tap items-center justify-between gap-3 rounded-2xl border border-white/10 px-4 py-3">
          <span className="text-sm text-white">Quiet hours 10pm–8am</span>
          <input
            type="checkbox"
            className="h-5 w-5 accent-[#ff2d92]"
            checked={ft.quietEnabled}
            onChange={(event) => patchFt({ quietEnabled: event.target.checked })}
          />
        </label>
        <div className="mt-3">
          <Button type="button" variant="ghost" onClick={() => void requestNotify()}>
            Allow notifications
          </Button>
        </div>
        {notifyNote ? <p className="mt-3 text-sm leading-6 text-muted">{notifyNote}</p> : null}
        <p className="mt-3 text-xs leading-5 text-muted">
          The in-app ladder is the product. System banners are extra, and they are flaky on
          an iPhone PWA.
        </p>
      </Card>

      <Link
        href="/"
        className="mt-10 inline-flex min-h-tap items-center justify-center rounded-pill border border-white/10 bg-white/5 text-sm font-semibold text-white"
      >
        Done for now
      </Link>

      {watching && rung >= 4 && !frozen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="takeover-title"
          className="fixed inset-0 z-40 flex items-center justify-center bg-ink/95 px-6"
        >
          <div className="w-full max-w-md text-center">
            <p className="text-xs uppercase tracking-[0.18em] text-flash">Takeover</p>
            <h2 id="takeover-title" className="mt-4 font-display text-4xl text-white">
              {watching.title}
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted">
              This has been sitting. Do it, snooze it, or skip it once.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <Button type="button" onClick={complete}>
                Done
              </Button>
              <Button type="button" variant="ghost" onClick={snooze}>
                Snooze
              </Button>
              <Button type="button" variant="ghost" onClick={skip} disabled={!skipOk}>
                Skip today
              </Button>
              <Button type="button" variant="ghost" onClick={dismissTakeover}>
                Not now
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
