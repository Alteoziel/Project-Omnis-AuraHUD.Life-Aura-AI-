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
