import type { ImpulseRecord, SpendRecord } from "@/lib/store/schema";

export const ASPIRATION_CENTS = 80_000;
export const TAKEOUT_CUT_CENTS = 2200;
export const TAKEOUTS_PER_WEEK = 2;

export function formatDollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function hoursOfWork(amountCents: number, hourlyRateCents: number): number {
  if (hourlyRateCents <= 0) return 0;
  return amountCents / hourlyRateCents;
}

export function categoryTotals(spends: SpendRecord[]): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const spend of spends) {
    totals[spend.category] = (totals[spend.category] ?? 0) + spend.amountCents;
  }
  return totals;
}

export function keptCents(impulses: ImpulseRecord[]): number {
  return impulses
    .filter((item) => item.status === "skipped")
    .reduce((sum, item) => sum + item.amountCents, 0);
}

export function weeksToGoal(weeklySaveCents: number, targetCents: number): number {
  if (weeklySaveCents <= 0) return Number.POSITIVE_INFINITY;
  return Math.ceil(targetCents / weeklySaveCents);
}

export function coolingRemainingMs(coolingUntil: number, nowMs: number): number {
  return Math.max(0, coolingUntil - nowMs);
}
