import type { RoutedIntent } from "@/lib/aura/intent-router";
import { newId } from "@/lib/store/db";
import type { TaskRecord } from "@/lib/store/schema";

export function intentToTask(intent: RoutedIntent, createdAt: number): TaskRecord {
  return {
    id: newId(),
    title: intent.title,
    dueOn: intent.dueOn,
    priority: intent.priority,
    status: intent.kind === "unclear" ? "captured" : "open",
    kind: intent.kind,
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

function score(task: TaskRecord, today: string): number {
  let value = (6 - task.priority) * 100;
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
  return tasks
    .filter((task) => task.status === "open")
    .slice()
    .sort((a, b) => {
      if (pinnedId && a.id === pinnedId && b.id !== pinnedId) return -1;
      if (pinnedId && b.id === pinnedId && a.id !== pinnedId) return 1;
      return score(b, today) - score(a, today) || b.createdAt - a.createdAt;
    });
}
