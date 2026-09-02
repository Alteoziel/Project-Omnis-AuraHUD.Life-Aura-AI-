import type { FollowThroughState } from "@/lib/store/schema";

export const HOUR_MS = 60 * 60 * 1000;
export const SNOOZE_MS = 2 * HOUR_MS;

/** Simulated hours before rungs 1–4 at a neutral score. Demo speed: 2s / 4s / 8s / 12s. */
export const RUNG_AT_HOURS = [2, 4, 8, 12] as const;

export const RUNG_LABELS = [
  "Waiting",
  "Soft nudge",
  "Pinned to Now",
  "System ping",
  "Takeover",
] as const;

export type Rung = 0 | 1 | 2 | 3 | 4;

export function clampScore(score: number): number {
  if (score < 0) return 0;
  if (score > 100) return 100;
  return Math.round(score);
}

/** 0 → 0.5× (faster), 50 → 1×, 100 → 1.5× (slower). */
export function delayMultiplier(score: number): number {
  return 0.5 + clampScore(score) / 100;
}

export function rungDelaysMs(score: number): number[] {
  const mult = delayMultiplier(score);
  return RUNG_AT_HOURS.map((hours) => hours * HOUR_MS * mult);
}

export function computedRung(startedAt: number | null, nowMs: number, score: number): Rung {
  if (startedAt == null) return 0;
  const elapsed = nowMs - startedAt;
  if (elapsed < 0) return 0;
  const delays = rungDelaysMs(score);
  let rung: Rung = 0;
  for (let i = 0; i < delays.length; i += 1) {
    if (elapsed >= delays[i]) rung = (i + 1) as Rung;
  }
  return rung;
}

export function isSnoozed(snoozedUntil: number | null, nowMs: number): boolean {
  return snoozedUntil != null && nowMs < snoozedUntil;
}

export function minutesOfDay(nowMs: number): number {
  const d = new Date(nowMs);
  return d.getHours() * 60 + d.getMinutes();
}

export function isQuietHours(
  nowMs: number,
  enabled: boolean,
  startMin: number,
  endMin: number,
): boolean {
  if (!enabled) return false;
  if (startMin === endMin) return false;
  const m = minutesOfDay(nowMs);
  if (startMin < endMin) return m >= startMin && m < endMin;
  return m >= startMin || m < endMin;
}

export function isFrozen(state: FollowThroughState, nowMs: number): boolean {
  if (state.muted) return true;
  if (isSnoozed(state.snoozedUntil, nowMs)) return true;
  return isQuietHours(nowMs, state.quietEnabled, state.quietStartMin, state.quietEndMin);
}

export function displayedRung(state: FollowThroughState, nowMs: number): Rung {
  if (state.watchingId == null || state.startedAt == null) return 0;
  const computed = computedRung(state.startedAt, nowMs, state.score);
  if (isFrozen(state, nowMs)) {
    const held = Math.max(0, Math.min(4, state.lastAnnouncedRung)) as Rung;
    return held;
  }
  return computed;
}

export function scoreDeltaForComplete(rung: Rung): number {
  if (rung <= 1) return 15;
  if (rung === 2) return 8;
  if (rung === 3) return 3;
  return 0;
}

export const SCORE_DELTA_IGNORED = -12;

export function canUseDailySkip(skipUsedOn: string | null, today: string): boolean {
  return skipUsedOn !== today;
}

export function intensitySentence(score: number): string {
  const n = clampScore(score);
  if (n >= 70) return "Aura is going easy. You have been following through.";
  if (n <= 30) return "Aura will nudge sooner. A few things have been sitting.";
  return "Aura is meeting you in the middle.";
}

export function notificationSupported(): boolean {
  return typeof Notification !== "undefined";
}
