import { z } from "zod";

export const IntentKindSchema = z.enum([
  "task",
  "budget_note",
  "reminder",
  "unclear",
]);
export type IntentKind = z.infer<typeof IntentKindSchema>;

export const RoutedIntentSchema = z.object({
  kind: IntentKindSchema,
  title: z.string().min(1).max(240),
  due_on: z.string().nullable().optional(),
  priority: z.number().int().min(1).max(5).default(3),
  amount_cents: z.number().int().nullable().optional(),
  notes: z.string().max(2000).default(""),
  confidence: z.number().min(0).max(1),
  provider: z.enum(["local_rules", "cloud"]),
});
export type RoutedIntent = z.infer<typeof RoutedIntentSchema>;

export type NegativeConstraint = {
  type: string;
  value: string;
  action_type?: string;
};

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function extractAmountCents(text: string): number | null {
  const match = text.match(/\$\s*(\d+(?:\.\d{1,2})?)|(\d+(?:\.\d{1,2})?)\s*dollars?/i);
  if (!match) return null;
  const raw = match[1] ?? match[2];
  if (!raw) return null;
  return Math.round(parseFloat(raw) * 100);
}

function extractDueOn(text: string, now = new Date()): string | null {
  const lower = text.toLowerCase();
  const iso = now.toISOString().slice(0, 10);
  if (/\btoday\b/.test(lower)) return iso;
  if (/\btomorrow\b/.test(lower)) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }
  return null;
}

function normalizeTitle(text: string): string {
  return text
    .replace(/^(remind me to|remind me|add|todo|task|please)\s+/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 240);
}

function violatesConstraints(
  candidate: RoutedIntent,
  constraints: NegativeConstraint[],
  rawInput: string,
): boolean {
  const inputLower = rawInput.toLowerCase().trim();
  for (const c of constraints) {
    const value = c.value.toLowerCase().trim();
    if (!value) continue;
    if (c.type === "DO_NOT_ASSERT" || c.type === "FACT_INVALID") {
      if (candidate.title.toLowerCase().includes(value)) return true;
      if (candidate.notes.toLowerCase().includes(value)) return true;
    }
    if (c.type === "DO_NOT_ROUTE") {
      // Same (or containing) utterance was rejected for this action type.
      if (
        (!c.action_type || c.action_type === candidate.kind) &&
        (inputLower === value ||
          inputLower.includes(value) ||
          value.includes(inputLower) ||
          candidate.title.toLowerCase().includes(value))
      ) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Local-first intent router. Always available when Cloud AI is off.
 * Cloud path (if ever enabled) must call this post-filter with the same constraints.
 */
export function routeIntentLocal(
  rawInput: string,
  constraints: NegativeConstraint[] = [],
  now = new Date(),
): RoutedIntent {
  const input = rawInput.trim().slice(0, 500);
  if (!input) {
    return {
      kind: "unclear",
      title: "Empty capture",
      priority: 3,
      notes: "",
      confidence: 0,
      provider: "local_rules",
      due_on: null,
      amount_cents: null,
    };
  }

  const lower = input.toLowerCase();
  const amount = extractAmountCents(input);
  const due = extractDueOn(input, now);

  let candidate: RoutedIntent;

  if (
    amount != null ||
    /\b(spent|spend|paid|pay|afford|budget|bought|cost)\b/.test(lower)
  ) {
    candidate = {
      kind: "budget_note",
      title: normalizeTitle(input) || "Budget note",
      notes: input,
      priority: 2,
      amount_cents: amount,
      due_on: due,
      confidence: amount != null ? 0.85 : 0.55,
      provider: "local_rules",
    };
  } else if (/\b(remind|tomorrow|today| tonight|deadline)\b/.test(lower)) {
    candidate = {
      kind: "reminder",
      title: normalizeTitle(input) || "Reminder",
      notes: input,
      priority: 2,
      due_on: due,
      amount_cents: null,
      confidence: 0.7,
      provider: "local_rules",
    };
  } else if (
    /\b(buy|call|email|text|finish|clean|schedule|pick up|todo)\b/.test(lower) ||
    input.length > 2
  ) {
    candidate = {
      kind: "task",
      title: normalizeTitle(input) || input.slice(0, 80),
      notes: "",
      priority: 3,
      due_on: due,
      amount_cents: null,
      confidence: 0.65,
      provider: "local_rules",
    };
  } else {
    candidate = {
      kind: "unclear",
      title: input.slice(0, 80),
      notes: input,
      priority: 3,
      due_on: null,
      amount_cents: null,
      confidence: 0.2,
      provider: "local_rules",
    };
  }

  if (violatesConstraints(candidate, constraints, input)) {
    return {
      kind: "unclear",
      title: "Needs a quick clarify",
      notes: input,
      priority: 3,
      due_on: null,
      amount_cents: null,
      confidence: 0.15,
      provider: "local_rules",
    };
  }

  return RoutedIntentSchema.parse(candidate);
}

export function countWords(text: string): number {
  return wordCount(text);
}

/** Build DO_NOT_* constraints from a rejected parse (Correction Memory). */
export function constraintsFromRejection(input: string, rejected: RoutedIntent): NegativeConstraint[] {
  const constraints: NegativeConstraint[] = [
    {
      type: "DO_NOT_ASSERT",
      value: rejected.title.slice(0, 120),
      action_type: rejected.kind,
    },
    {
      type: "DO_NOT_ROUTE",
      value: input.trim().slice(0, 80).toLowerCase(),
      action_type: rejected.kind,
    },
  ];
  return constraints;
}
