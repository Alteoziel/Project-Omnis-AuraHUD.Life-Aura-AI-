"use client";

import Link from "next/link";
import { CommandBar } from "@/components/CommandBar";
import { TodayStream } from "@/components/TodayStream";
import { useToast } from "@/components/ui/Toast";
import { useStore } from "@/components/StoreProvider";
import {
  constraintsFromRejection,
  routeIntentLocal,
  type NegativeConstraint,
} from "@/lib/aura/intent-router";
import { intentToTask, rankOpen, todayIso } from "@/lib/aura/capture";
import { newId } from "@/lib/store/db";
import type { TaskRecord } from "@/lib/store/schema";

export default function NowPage() {
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
  const ranked = rankOpen(state.tasks, today);
  const current = ranked[0] ?? null;
  const next = ranked.slice(1, 4);
  const captured = state.tasks.filter(
    (task) => task.status === "captured" || task.kind === "unclear",
  );

  function capture(text: string) {
    const previous = state;
    const routed = routeIntentLocal(text, constraints, new Date(now()));
    const task = intentToTask(routed, now());
    setState({
      ...state,
      tasks: [task, ...state.tasks],
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
    show("Captured.", () => setState(previous));
  }

  function confirm() {
    show("Got it.");
  }

  function reject(task: TaskRecord) {
    const previous = state;
    const routed = {
      kind: task.kind,
      title: task.title,
      dueOn: task.dueOn,
      priority: task.priority,
      amountCents: task.amountCents,
      notes: task.notes,
      confidence: 0,
      sourceText: task.sourceText,
    };
    setState({
      ...state,
      tasks: state.tasks.filter((item) => item.id !== task.id),
      corrections: [
        {
          id: newId(),
          inputSnippet: task.sourceText,
          rejectedOutput: task.title,
          actionType: task.kind,
          status: "rejected_unspecified",
          constraints: constraintsFromRejection(task.sourceText, routed),
          createdAt: now(),
        },
        ...state.corrections,
      ],
    });
    show("Noted — I won't assume that again.", () => setState(previous));
  }

  function saveEdit(id: string, title: string) {
    const trimmed = title.trim();
    if (!trimmed) return;
    setState({
      ...state,
      tasks: state.tasks.map((task) =>
        task.id === id ? { ...task, title: trimmed } : task,
      ),
    });
  }

  function typeCaptured(id: string, kind: TaskRecord["kind"]) {
    setState({
      ...state,
      tasks: state.tasks.map((task) =>
        task.id === id
          ? { ...task, kind, status: kind === "unclear" ? "captured" : "open" }
          : task,
      ),
    });
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col px-4 pb-12">
      <CommandBar onCapture={capture} />
      <TodayStream
        now={current}
        next={next}
        captured={captured}
        onConfirm={() => confirm()}
        onReject={reject}
        onSaveEdit={saveEdit}
        onType={typeCaptured}
      />
      <div className="mt-10">
        <Link
          href="/"
          className="inline-flex min-h-tap w-full items-center justify-center rounded-pill border border-white/10 bg-white/5 text-sm font-semibold text-white"
        >
          Done for now
        </Link>
      </div>
    </main>
  );
}
