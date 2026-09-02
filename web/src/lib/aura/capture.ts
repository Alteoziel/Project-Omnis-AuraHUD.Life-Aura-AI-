import type { RoutedIntent } from "./intent-router";
import { pinFirst } from "./escalation";
import { newId } from "@/lib/store/db";
import type {
  CalendarEventRecord,
  GroceryRecord,
  SpendRecord,
  TaskRecord,
} from "@/lib/store/schema";

function asTaskKind(kind: RoutedIntent["kind"]): TaskRecord["kind"] {
  if (kind === "homework") return "homework";
  if (kind === "reminder") return "reminder";
  if (kind === "budget_note") return "budget_note";
  if (kind === "unclear") return "unclear";
  return "task";
}

export function intentToTask(intent: RoutedIntent, createdAt: number): TaskRecord {
  return {
    id: newId(),
    title: intent.title,
    dueOn: intent.dueOn,
    priority: intent.priority,
    status: intent.kind === "unclear" ? "captured" : "open",
    kind: asTaskKind(intent.kind),
    notes: intent.notes,
    amountCents: intent.amountCents,
    sourceText: intent.sourceText,
    createdAt,
  };
}

export function todayIso(nowMs: number): string {
  const d = new Date(nowMs);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function capturePatch(
  routed: RoutedIntent,
  createdAt: number,
): {
  task: TaskRecord | null;
  spend: SpendRecord | null;
  calendar: CalendarEventRecord | null;
  grocery: GroceryRecord | null;
  toast: string;
} {
  if (routed.kind === "grocery") {
    return {
      task: null,
      spend: null,
      calendar: null,
      grocery: {
        id: newId(),
        title: routed.title,
        createdAt,
      },
      toast: "Logged what you got.",
    };
  }
  if (routed.kind === "event") {
    const startMin = routed.startMin ?? 12 * 60;
    return {
      task: null,
      spend: null,
      calendar: {
        id: newId(),
        title: routed.title,
        day: routed.dueOn ?? todayIso(createdAt),
        startMin,
        endMin: routed.endMin ?? Math.min(startMin + 60, 24 * 60),
        sourceText: routed.sourceText,
        createdAt,
      },
      grocery: null,
      toast: "On your local calendar.",
    };
  }
  const task = intentToTask(routed, createdAt);
  const spend =
    routed.kind === "budget_note" && routed.amountCents != null
      ? {
          id: newId(),
          title: routed.title,
          amountCents: routed.amountCents,
          category: "uncategorized",
          at: createdAt,
        }
      : null;
  const toast =
    routed.kind === "homework" ? "Homework captured." : "Captured.";
  return { task, spend, calendar: null, grocery: null, toast };
}

function score(task: TaskRecord, today: string): number {
  let value = (6 - task.priority) * 100;
  if (task.kind === "homework") value += 30;
  if (task.dueOn && task.dueOn < today) value += 120;
  else if (task.dueOn === today) value += 80;
  else if (task.dueOn) value += 40;
  return value;
}

export function rankOpen(
  tasks: TaskRecord[],
  today: string,
  pinnedId?: string | null,
): TaskRecord[] {
  const ranked = tasks
    .filter((task) => task.status === "open")
    .slice()
    .sort((a, b) => score(b, today) - score(a, today) || b.createdAt - a.createdAt);
  return pinFirst(ranked, pinnedId);
}
