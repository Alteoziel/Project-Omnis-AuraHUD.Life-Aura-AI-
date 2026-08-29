/**
 * Demo clock: real wall time, or compressed time when Demo speed is on.
 * 1 real second = 1 simulated hour (3600x) so a 24h cooling period is ~24s.
 */

export const DEMO_SPEED_FACTOR = 3600;

export type ClockSnapshot = {
  demoSpeed: boolean;
  originRealMs: number;
  originSimMs: number;
};

export function createClock(nowMs: number, demoSpeed: boolean): ClockSnapshot {
  return {
    demoSpeed,
    originRealMs: nowMs,
    originSimMs: nowMs,
  };
}

export function nowSimulated(clock: ClockSnapshot, realNowMs: number): number {
  if (!clock.demoSpeed) return realNowMs;
  const elapsed = Math.max(0, realNowMs - clock.originRealMs);
  return clock.originSimMs + elapsed * DEMO_SPEED_FACTOR;
}

export function toggleDemoSpeed(
  clock: ClockSnapshot,
  realNowMs: number,
  enabled: boolean,
): ClockSnapshot {
  const sim = nowSimulated(clock, realNowMs);
  return {
    demoSpeed: enabled,
    originRealMs: realNowMs,
    originSimMs: sim,
  };
}
