"use client";

import Link from "next/link";
import { CommandBar } from "@/components/CommandBar";
import { useStore } from "@/components/StoreProvider";
import { Button, Card, EmptyState } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/Toast";
import { capturePatch, todayIso } from "@/lib/aura/capture";
import {
  routeIntentLocal,
  type NegativeConstraint,
} from "@/lib/aura/intent-router";
import { formatClock, suggestSlot } from "@/lib/aura/schedule";
import { newId } from "@/lib/store/db";
import type { TaskRecord } from "@/lib/store/schema";

export default function HomeworkPage() {
  const { ready, state, setState, now } = useStore();
  const { show } = useToast();

  if (!ready) {
    return (
      <main className="mx-auto min-h-dvh max-w-lg px-4 pt-[calc(1.25rem+env(safe-area-inset-top))]">
        <p className="text-muted">Loading</p>
      </main>
    );
  }

  const constraints: NegativeConstraint[] = state.corrections.flatMap((row) =>
    row.constraints
      .filter(
        (c) =>
          c.type === "DO_NOT_ASSERT" ||
          c.type === "DO_NOT_ROUTE" ||
          c.type === "FACT_INVALID",
      )
      .map((c) => ({
        type: c.type as NegativeConstraint["type"],
        value: c.value,
        actionType: c.actionType as NegativeConstraint["actionType"],
      })),
  );

  const today = todayIso(now());
  const homework = state.tasks.filter(
    (task) => task.kind === "homework" && task.status === "open",
  );
  const dayEvents = state.calendar
    .slice()
    .sort((a, b) => a.day.localeCompare(b.day) || a.startMin - b.startMin);

  function capture(text: string) {
    const previous = state;
    const routed = routeIntentLocal(text, constraints, new Date(now()));
    const patch = capturePatch(routed, now());
    setState({
      ...state,
      tasks: patch.task ? [patch.task, ...state.tasks] : state.tasks,
      spends: patch.spend ? [patch.spend, ...state.spends] : state.spends,
      calendar: patch.calendar ? [patch.calendar, ...state.calendar] : state.calendar,
      groceries: patch.grocery ? [patch.grocery, ...state.groceries] : state.groceries,
      events: [
        {
          id: newId(),
          type: "capture",
          at: now(),
          payload: { kind: routed.kind },
        },
        ...state.events,
      ],
    });
    show(patch.toast, () => setState(previous));
  }

  function watch(task: TaskRecord) {
    setState((prev) => ({
      ...prev,
      followThrough: {
        ...prev.followThrough,
        watchingId: task.id,
        startedAt: now(),
        snoozedUntil: null,
        lastAnnouncedRung: 0,
      },
    }));
    show("Ladder armed. Open Follow-through to watch it climb.");
  }

  function complete(id: string) {
    const previous = state;
    setState({
      ...state,
      tasks: state.tasks.map((task) =>
        task.id === id ? { ...task, status: "done" } : task,
      ),
    });
    show("Marked done.", () => setState(previous));
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col px-4 pb-12">
      <CommandBar onCapture={capture} />
      <p className="text-xs font-medium uppercase tracking-[0.22em] text-flash">School</p>
      <h1 className="mt-3 font-display text-4xl font-extrabold text-white">Homework</h1>
      <p className="mt-3 text-sm leading-6 text-muted">
        Talk in an assignment, a class time, or groceries you already got. Times and
        due dates are code. This calendar lives on this phone — not Apple or Google yet.
      </p>

      <Card className="mt-6">
        <p className="text-xs uppercase tracking-[0.14em] text-muted">Assignments</p>
        {homework.length === 0 ? (
          <EmptyState
            title="No homework yet"
            body="Try “history essay due friday” in the bar."
          />
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {homework.map((task) => {
              const slot = suggestSlot(task.dueOn, today, state.calendar);
              return (
                <li key={task.id} className="rounded-2xl border border-white/10 p-4">
                  <p className="text-white">{task.title}</p>
                  <p className="mt-1 text-sm text-muted">
                    {task.dueOn ? `Due ${task.dueOn}` : "No due date"}
                    {slot
                      ? ` · suggested ${slot.day} ${formatClock(slot.startMin)}–${formatClock(slot.endMin)}`
                      : " · no open gap in the next week"}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button type="button" onClick={() => complete(task.id)}>
                      Done
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => watch(task)}>
                      Nudge me
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card className="mt-4">
        <p className="text-xs uppercase tracking-[0.14em] text-muted">Local calendar</p>
        {dayEvents.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            Try “math class thursday at 2pm”. Apple and Google calendars are not connected.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {dayEvents.map((event) => (
              <li key={event.id} className="flex min-h-tap items-center justify-between gap-3">
                <span className="text-sm text-white">{event.title}</span>
                <span className="text-xs text-muted">
                  {event.day} · {formatClock(event.startMin)}–{formatClock(event.endMin)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="mt-4">
        <p className="text-xs uppercase tracking-[0.14em] text-muted">Groceries you got</p>
        {state.groceries.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Try “I got milk”.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {state.groceries.map((item) => (
              <li key={item.id} className="text-sm text-white">
                {item.title}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Link
        href="/follow-through"
        className="mt-6 inline-flex min-h-tap items-center justify-center rounded-pill border border-white/10 bg-white/5 text-sm font-semibold text-white"
      >
        Open Follow-through
      </Link>
      <Link
        href="/"
        className="mt-3 inline-flex min-h-tap items-center justify-center rounded-pill border border-white/10 bg-white/5 text-sm font-semibold text-white"
      >
        Done for now
      </Link>
    </main>
  );
}
