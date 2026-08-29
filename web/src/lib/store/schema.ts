export const DEMO_IDS = [
  "now",
  "life-model",
  "money",
  "follow-through",
  "digest",
  "paperwork",
] as const;

export type DemoId = (typeof DEMO_IDS)[number];

export type AuraEvent = {
  id: string;
  type: string;
  at: number;
  payload: Record<string, unknown>;
};

export type TaskRecord = {
  id: string;
  title: string;
  dueOn: string | null;
  priority: number;
  status: "open" | "done" | "skipped";
  createdAt: number;
};

export type SpendRecord = {
  id: string;
  title: string;
  amountCents: number;
  category: string;
  at: number;
};

export type CorrectionRecord = {
  id: string;
  inputSnippet: string;
  rejectedOutput: string;
  actionType: string;
  status: "rejected_unspecified" | "corrected";
  createdAt: number;
};

export type ImpulseRecord = {
  id: string;
  title: string;
  amountCents: number;
  status: "cooling" | "bought" | "skipped";
  createdAt: number;
};

export type MailRecord = {
  id: string;
  payee: string;
  amountCents: number;
  dueOn: string;
  important: boolean;
};

export type MetricRecord = {
  id: string;
  demoId: DemoId;
  name: string;
  at: number;
};

export type AuraState = {
  version: 1;
  clock: {
    demoSpeed: boolean;
    originRealMs: number;
    originSimMs: number;
  };
  hourlyRateCents: number;
  seededAt: number | null;
  events: AuraEvent[];
  tasks: TaskRecord[];
  spends: SpendRecord[];
  corrections: CorrectionRecord[];
  impulses: ImpulseRecord[];
  mail: MailRecord[];
  metrics: MetricRecord[];
};

export const DEFAULT_HOURLY_RATE_CENTS = 2000;

export function emptyState(nowMs: number): AuraState {
  return {
    version: 1,
    clock: {
      demoSpeed: false,
      originRealMs: nowMs,
      originSimMs: nowMs,
    },
    hourlyRateCents: DEFAULT_HOURLY_RATE_CENTS,
    seededAt: null,
    events: [],
    tasks: [],
    spends: [],
    corrections: [],
    impulses: [],
    mail: [],
    metrics: [],
  };
}

function seedId(prefix: string, n: number): string {
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
        id: seedId("task", 1),
        title: "Call the landlord",
        dueOn: isoDaysAgo(nowMs, -1),
        priority: 2,
        status: "open",
        createdAt: nowMs - 2 * 86400000,
      },
      {
        id: seedId("task", 2),
        title: "Send Sam the notes",
        dueOn: isoDaysAgo(nowMs, 0),
        priority: 3,
        status: "open",
        createdAt: nowMs - 86400000,
      },
      {
        id: seedId("task", 3),
        title: "Pick up the prescription",
        dueOn: null,
        priority: 4,
        status: "done",
        createdAt: nowMs - 3 * 86400000,
      },
    ],
    spends: [
      {
        id: seedId("spend", 1),
        title: "Lunch",
        amountCents: 1240,
        category: "dining",
        at: nowMs - 1 * 86400000,
      },
      {
        id: seedId("spend", 2),
        title: "Groceries",
        amountCents: 4820,
        category: "groceries",
        at: nowMs - 2 * 86400000,
      },
      {
        id: seedId("spend", 3),
        title: "Rideshare",
        amountCents: 1800,
        category: "transit",
        at: nowMs - 4 * 86400000,
      },
      {
        id: seedId("spend", 4),
        title: "Takeout",
        amountCents: 2200,
        category: "dining",
        at: nowMs - 5 * 86400000,
      },
    ],
    corrections: [
      {
        id: seedId("corr", 1),
        inputSnippet: "I spent 12 on lunch",
        rejectedOutput: "Coffee",
        actionType: "budget_note",
        status: "corrected",
        createdAt: nowMs - 86400000,
      },
    ],
    impulses: [
      {
        id: seedId("impulse", 1),
        title: "Wireless headphones",
        amountCents: 7900,
        status: "skipped",
        createdAt: nowMs - 3 * 86400000,
      },
    ],
    mail: [
      {
        id: seedId("mail", 1),
        payee: "City Electric",
        amountCents: 21400,
        dueOn: isoDaysAgo(nowMs, -6),
        important: true,
      },
    ],
    events: [
      {
        id: seedId("evt", 1),
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

