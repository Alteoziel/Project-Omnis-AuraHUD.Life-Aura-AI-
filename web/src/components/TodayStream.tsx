"use client";

import { useState } from "react";
import { Button, Chip } from "@/components/ui/primitives";
import type { TaskRecord } from "@/lib/store/schema";

function Feedback({
  onYes,
  onNo,
  onEdit,
}: {
  onYes: () => void;
  onNo: () => void;
  onEdit: () => void;
}) {
  return (
    <div className="mt-3 flex gap-2">
      <Button type="button" variant="ghost" onClick={onYes} aria-label="Looks right">
        ✓
      </Button>
      <Button type="button" variant="ghost" onClick={onNo} aria-label="Wrong">
        ✗
      </Button>
      <Button type="button" variant="ghost" onClick={onEdit} aria-label="Edit">
        ✎
      </Button>
    </div>
  );
}

function ItemCard({
  task,
  kicker,
  onConfirm,
  onReject,
  onSaveEdit,
  onType,
}: {
  task: TaskRecord;
  kicker: string;
  onConfirm: () => void;
  onReject: () => void;
  onSaveEdit: (title: string) => void;
  onType?: (kind: "task" | "reminder" | "budget_note") => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);

  return (
    <article className="rounded-card border border-white/10 bg-white/[0.03] p-5">
      <Chip>{kicker}</Chip>
      {editing ? (
        <form
          className="mt-3 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            onSaveEdit(title);
            setEditing(false);
          }}
        >
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="min-h-tap min-w-0 flex-1 rounded-pill border border-white/10 bg-transparent px-4 text-white"
            aria-label="Edit title"
          />
          <Button type="submit">Save</Button>
        </form>
      ) : (
        <h2 className="mt-3 font-display text-2xl text-white">{task.title}</h2>
      )}
      <p className="mt-2 text-sm text-muted">
        {task.dueOn ? `Due ${task.dueOn}` : "No date"}
        {task.amountCents != null ? ` · $${(task.amountCents / 100).toFixed(2)}` : ""}
      </p>
      {onType ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" variant="ghost" onClick={() => onType("task")}>
            Task
          </Button>
          <Button type="button" variant="ghost" onClick={() => onType("reminder")}>
            Reminder
          </Button>
          <Button type="button" variant="ghost" onClick={() => onType("budget_note")}>
            Spend
          </Button>
        </div>
      ) : (
        <Feedback
          onYes={onConfirm}
          onNo={onReject}
          onEdit={() => setEditing(true)}
        />
      )}
    </article>
  );
}

export function TodayStream({
  now,
  next,
  captured,
  onConfirm,
  onReject,
  onSaveEdit,
  onType,
}: {
  now: TaskRecord | null;
  next: TaskRecord[];
  captured: TaskRecord[];
  onConfirm: (id: string) => void;
  onReject: (task: TaskRecord) => void;
  onSaveEdit: (id: string, title: string) => void;
  onType: (id: string, kind: "task" | "reminder" | "budget_note") => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <section>
        <p className="text-xs uppercase tracking-[0.18em] text-flash">Now</p>
        {now ? (
          <div className="mt-3">
            <ItemCard
              task={now}
              kicker="Do this"
              onConfirm={() => onConfirm(now.id)}
              onReject={() => onReject(now)}
              onSaveEdit={(title) => onSaveEdit(now.id, title)}
            />
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted">Nothing right now. Capture something.</p>
        )}
      </section>
      <section>
        <p className="text-xs uppercase tracking-[0.18em] text-muted">Next</p>
        <div className="mt-3 flex flex-col gap-3">
          {next.map((task) => (
            <ItemCard
              key={task.id}
              task={task}
              kicker="Next"
              onConfirm={() => onConfirm(task.id)}
              onReject={() => onReject(task)}
              onSaveEdit={(title) => onSaveEdit(task.id, title)}
            />
          ))}
        </div>
      </section>
      <section>
        <p className="text-xs uppercase tracking-[0.18em] text-muted">Captured</p>
        <div className="mt-3 flex flex-col gap-3">
          {captured.map((task) => (
            <ItemCard
              key={task.id}
              task={task}
              kicker="Unclear"
              onConfirm={() => onConfirm(task.id)}
              onReject={() => onReject(task)}
              onSaveEdit={(title) => onSaveEdit(task.id, title)}
              onType={(kind) => onType(task.id, kind)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
