const WEEKDAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

function startOfLocalDay(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function isoDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, n: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + n);
  return next;
}

/** Deterministic due-date parse. Returns YYYY-MM-DD or null. */
export function parseDueOn(text: string, now: Date): string | null {
  const lower = text.toLowerCase();
  const today = startOfLocalDay(now);
  if (/\btoday\b/.test(lower)) return isoDay(today);
  if (/\btomorrow\b/.test(lower)) return isoDay(addDays(today, 1));
  const inDays = lower.match(/\bin\s+(\d+)\s+days?\b/);
  if (inDays) {
    const n = Number(inDays[1]);
    if (Number.isFinite(n) && n >= 0 && n <= 366) return isoDay(addDays(today, n));
  }
  for (let i = 0; i < WEEKDAYS.length; i += 1) {
    if (!new RegExp(`\\b${WEEKDAYS[i]}\\b`).test(lower)) continue;
    const delta = (i - today.getDay() + 7) % 7;
    return isoDay(addDays(today, delta === 0 ? 7 : delta));
  }
  return null;
}

/** Deterministic money parse. Integer cents, or null if none. */
export function parseAmountCents(text: string): number | null {
  const match = text.match(
    /\$\s*(\d+(?:\.\d{1,2})?)|(\d+(?:\.\d{1,2})?)\s*(?:dollars?|bucks)\b/i,
  );
  if (!match) return null;
  const raw = match[1] ?? match[2];
  if (!raw) return null;
  const cents = Math.round(Number.parseFloat(raw) * 100);
  if (!Number.isFinite(cents) || cents < 0) return null;
  return cents;
}

export type IntentKind = "task" | "reminder" | "budget_note" | "unclear";

export type RoutedIntent = {
  kind: IntentKind;
  title: string;
  dueOn: string | null;
  priority: number;
  amountCents: number | null;
  notes: string;
  confidence: number;
  sourceText: string;
};

export type NegativeConstraint = {
  type: "DO_NOT_ASSERT" | "DO_NOT_ROUTE" | "FACT_INVALID";
  value: string;
  actionType: IntentKind;
};

export const CONFIDENCE_FLOOR = 0.6;

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function normalizeTitle(text: string): string {
  return text
    .replace(/^(remind me to|remind me|add|todo|task|please)\s+/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 240);
}

function normalizeUtterance(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 80);
}

function unclear(input: string, confidence: number): RoutedIntent {
  return {
    kind: "unclear",
    title: input.slice(0, 80) || "Needs a quick clarify",
    dueOn: null,
    priority: 3,
    amountCents: null,
    notes: input,
    confidence,
    sourceText: input,
  };
}

function constraintHit(
  candidate: RoutedIntent,
  constraints: NegativeConstraint[],
  rawInput: string,
): boolean {
  const utterance = normalizeUtterance(rawInput);
  const title = candidate.title.toLowerCase().trim();
  for (const constraint of constraints) {
    if (constraint.actionType !== candidate.kind) continue;
    const value = constraint.value.toLowerCase().trim();
    if (!value) continue;
    if (constraint.type === "DO_NOT_ROUTE") {
      if (utterance === value) return true;
    }
    if (constraint.type === "DO_NOT_ASSERT" || constraint.type === "FACT_INVALID") {
      if (title === value) return true;
    }
  }
  return false;
}

export function routeIntentLocal(
  rawInput: string,
  constraints: NegativeConstraint[] = [],
  now = new Date(),
): RoutedIntent {
  const input = rawInput.trim().slice(0, 500);
  if (!input) return unclear("", 0);

  const lower = input.toLowerCase();
  const amountCents = parseAmountCents(input);
  const dueOn = parseDueOn(input, now);
  const title = normalizeTitle(input) || input.slice(0, 80);

  let candidate: RoutedIntent;

  if (amountCents != null || /\b(spent|spend|paid|pay|afford|budget|bought|cost)\b/.test(lower)) {
    candidate = {
      kind: "budget_note",
      title: title || "Budget note",
      dueOn,
      priority: 2,
      amountCents,
      notes: input,
      confidence: amountCents != null ? 0.85 : 0.55,
      sourceText: input,
    };
  } else if (/\b(buy|call|email|text|finish|clean|schedule|pick up)\b/.test(lower)) {
    candidate = {
      kind: "task",
      title: title || input.slice(0, 80),
      dueOn,
      priority: 3,
      amountCents: null,
      notes: "",
      confidence: 0.74,
      sourceText: input,
    };
  } else if (/\b(remind me|reminder|deadline|remind)\b/.test(lower)) {
    candidate = {
      kind: "reminder",
      title: title || "Reminder",
      dueOn,
      priority: 2,
      amountCents: null,
      notes: input,
      confidence: 0.78,
      sourceText: input,
    };
  } else {
    candidate = unclear(input, 0.25);
  }

  if (candidate.confidence < CONFIDENCE_FLOOR) {
    candidate = { ...unclear(input, candidate.confidence), dueOn, amountCents };
  }

  if (constraintHit(candidate, constraints, input)) {
    return unclear(input, 0.15);
  }

  return candidate;
}

export function countWords(text: string): number {
  return wordCount(text);
}

export function constraintsFromRejection(
  input: string,
  rejected: RoutedIntent,
): NegativeConstraint[] {
  return [
    {
      type: "DO_NOT_ASSERT",
      value: rejected.title.slice(0, 120),
      actionType: rejected.kind,
    },
    {
      type: "DO_NOT_ROUTE",
      value: normalizeUtterance(input),
      actionType: rejected.kind,
    },
  ];
}
