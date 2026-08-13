import { routeIntentLocal, type NegativeConstraint } from "@/lib/aura/intent-router";

export function parseConstraintRows(
  rows: Array<{ negative_constraints?: unknown }>,
): NegativeConstraint[] {
  const out: NegativeConstraint[] = [];
  for (const row of rows) {
    const raw = row.negative_constraints;
    if (!Array.isArray(raw)) continue;
    for (const item of raw) {
      if (
        item &&
        typeof item === "object" &&
        "type" in item &&
        "value" in item &&
        typeof (item as { type: unknown }).type === "string" &&
        typeof (item as { value: unknown }).value === "string"
      ) {
        out.push({
          type: (item as { type: string }).type,
          value: (item as { value: string }).value,
          action_type:
            "action_type" in item &&
            typeof (item as { action_type: unknown }).action_type === "string"
              ? (item as { action_type: string }).action_type
              : undefined,
        });
      }
    }
  }
  return out;
}

export function routeWithCorrections(
  input: string,
  constraintRows: Array<{ negative_constraints?: unknown }>,
) {
  const constraints = parseConstraintRows(constraintRows);
  return routeIntentLocal(input, constraints);
}
