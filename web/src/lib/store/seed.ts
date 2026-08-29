import { emptyState, type AuraState } from "./schema";

function id(prefix: string, n: number): string {
  return `${prefix}-${n}`;
}

function isoDaysAgo(nowMs: number, days: number): string {
  const d = new Date(nowMs - days * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

/** A realistic sample week used by every demo that needs history on day one. */
export function buildSeedState(nowMs: number): AuraState {
  const base = emptyState(nowMs);
  return {
    ...base,
    seededAt: nowMs,
    tasks: [
      {
        id: id("task", 1),
        title: "Call the landlord",
        dueOn: isoDaysAgo(nowMs, -1),
        priority: 2,
        status: "open",
        createdAt: nowMs - 2 * 86400000,
      },
      {
        id: id("task", 2),
        title: "Send Sam the notes",
        dueOn: isoDaysAgo(nowMs, 0),
        priority: 3,
        status: "open",
        createdAt: nowMs - 86400000,
      },
      {
        id: id("task", 3),
        title: "Pick up the prescription",
        dueOn: null,
        priority: 4,
        status: "done",
        createdAt: nowMs - 3 * 86400000,
      },
    ],
    spends: [
      {
        id: id("spend", 1),
        title: "Lunch",
        amountCents: 1240,
        category: "dining",
        at: nowMs - 1 * 86400000,
      },
      {
        id: id("spend", 2),
        title: "Groceries",
        amountCents: 4820,
        category: "groceries",
        at: nowMs - 2 * 86400000,
      },
      {
        id: id("spend", 3),
        title: "Rideshare",
        amountCents: 1800,
        category: "transit",
        at: nowMs - 4 * 86400000,
      },
      {
        id: id("spend", 4),
        title: "Takeout",
        amountCents: 2200,
        category: "dining",
        at: nowMs - 5 * 86400000,
      },
    ],
    corrections: [
      {
        id: id("corr", 1),
        inputSnippet: "I spent 12 on lunch",
        rejectedOutput: "Coffee",
        actionType: "budget_note",
        status: "corrected",
        createdAt: nowMs - 86400000,
      },
    ],
    impulses: [
      {
        id: id("impulse", 1),
        title: "Wireless headphones",
        amountCents: 7900,
        status: "skipped",
        createdAt: nowMs - 3 * 86400000,
      },
    ],
    mail: [
      {
        id: id("mail", 1),
        payee: "City Electric",
        amountCents: 21400,
        dueOn: isoDaysAgo(nowMs, -6),
        important: true,
      },
    ],
    events: [
      {
        id: id("evt", 1),
        type: "seeded",
        at: nowMs,
        payload: { days: 7 },
      },
    ],
    metrics: [],
  };
}

export function countSeededItems(state: AuraState): number {
  return (
    state.tasks.length +
    state.spends.length +
    state.corrections.length +
    state.impulses.length +
    state.mail.length
  );
}
