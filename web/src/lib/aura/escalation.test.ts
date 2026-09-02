import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  HOUR_MS,
  RUNG_AT_HOURS,
  SCORE_DELTA_IGNORED,
  canUseDailySkip,
  clampScore,
  computedRung,
  delayMultiplier,
  displayedRung,
  intensitySentence,
  isQuietHours,
  isSnoozed,
  pinFirst,
  rungDelaysMs,
  scoreDeltaForComplete,
} from "./escalation.ts";
import { defaultFollowThrough } from "../store/schema.ts";

describe("escalation ladder", () => {
  it("uses 1× delays at a neutral score of 50", () => {
    assert.equal(delayMultiplier(50), 1);
    assert.deepEqual(
      rungDelaysMs(50),
      RUNG_AT_HOURS.map((h) => h * HOUR_MS),
    );
  });

  it("escalates sooner at a low score and slower at a high score", () => {
    assert.equal(delayMultiplier(0), 0.5);
    assert.equal(delayMultiplier(100), 1.5);
    const low = computedRung(0, 2 * HOUR_MS, 0);
    const mid = computedRung(0, 2 * HOUR_MS, 50);
    const high = computedRung(0, 2 * HOUR_MS, 100);
    assert.equal(low, 2);
    assert.equal(mid, 1);
    assert.equal(high, 0);
    assert.equal(computedRung(0, 4 * HOUR_MS, 50), 2);
    assert.equal(computedRung(0, 8 * HOUR_MS, 50), 3);
    assert.equal(computedRung(0, 12 * HOUR_MS, 50), 4);
  });

  it("stays at waiting until armed", () => {
    assert.equal(computedRung(null, 99 * HOUR_MS, 50), 0);
  });

  it("freezes the displayed rung while muted, snoozed, or in quiet hours", () => {
    const muted = {
      ...defaultFollowThrough(),
      watchingId: "t1",
      startedAt: 0,
      lastAnnouncedRung: 1,
      muted: true,
      score: 50,
    };
    assert.equal(displayedRung(muted, 12 * HOUR_MS), 1);

    const snoozed = {
      ...defaultFollowThrough(),
      watchingId: "t1",
      startedAt: 0,
      lastAnnouncedRung: 2,
      snoozedUntil: 10 * HOUR_MS,
      score: 50,
    };
    assert.equal(isSnoozed(snoozed.snoozedUntil, 9 * HOUR_MS), true);
    assert.equal(displayedRung(snoozed, 9 * HOUR_MS), 2);
    assert.equal(displayedRung(snoozed, 12 * HOUR_MS), 4);

    const evening = new Date();
    evening.setHours(23, 0, 0, 0);
    assert.equal(isQuietHours(evening.getTime(), true, 22 * 60, 8 * 60), true);
    const morning = new Date();
    morning.setHours(10, 0, 0, 0);
    assert.equal(isQuietHours(morning.getTime(), true, 22 * 60, 8 * 60), false);
    assert.equal(isQuietHours(evening.getTime(), false, 22 * 60, 8 * 60), false);
  });

  it("allows one guilt-free skip per calendar day", () => {
    assert.equal(canUseDailySkip(null, "2026-09-02"), true);
    assert.equal(canUseDailySkip("2026-09-01", "2026-09-02"), true);
    assert.equal(canUseDailySkip("2026-09-02", "2026-09-02"), false);
  });

  it("rewards prompt completion and clamps the score", () => {
    assert.equal(scoreDeltaForComplete(0), 15);
    assert.equal(scoreDeltaForComplete(1), 15);
    assert.equal(scoreDeltaForComplete(4), 0);
    assert.equal(clampScore(50 + SCORE_DELTA_IGNORED), 38);
    assert.equal(clampScore(-4), 0);
    assert.equal(clampScore(140), 100);
  });

  it("describes intensity in one sentence", () => {
    assert.match(intensitySentence(80), /going easy/i);
    assert.match(intensitySentence(20), /nudge sooner/i);
    assert.match(intensitySentence(50), /middle/i);
  });

  it("pins the watched task to the front of Now", () => {
    const ranked = pinFirst([{ id: "a" }, { id: "b" }], "b");
    assert.equal(ranked[0]?.id, "b");
  });
});
