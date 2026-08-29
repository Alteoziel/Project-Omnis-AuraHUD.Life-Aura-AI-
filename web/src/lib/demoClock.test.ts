import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEMO_SPEED_FACTOR,
  createClock,
  nowSimulated,
  toggleDemoSpeed,
} from "./demoClock.ts";

describe("demoClock", () => {
  it("returns wall time when demo speed is off", () => {
    const clock = createClock(1_000_000, false);
    assert.equal(nowSimulated(clock, 1_000_500), 1_000_500);
  });

  it("compresses 1 real second into 1 simulated hour", () => {
    const clock = createClock(0, true);
    assert.equal(nowSimulated(clock, 1_000), DEMO_SPEED_FACTOR * 1_000);
  });

  it("keeps simulated time continuous when toggling", () => {
    const off = createClock(10_000, false);
    const on = toggleDemoSpeed(off, 12_000, true);
    assert.equal(nowSimulated(on, 12_000), 12_000);
    assert.equal(nowSimulated(on, 12_000 + 2_000), 12_000 + 2_000 * DEMO_SPEED_FACTOR);
    const offAgain = toggleDemoSpeed(on, 12_000 + 2_000, false);
    assert.equal(nowSimulated(offAgain, 99_000), 12_000 + 2_000 * DEMO_SPEED_FACTOR);
  });
});
