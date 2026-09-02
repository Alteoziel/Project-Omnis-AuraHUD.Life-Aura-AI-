import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildSeedState, countSeededItems, emptyState } from "./schema.ts";

describe("seed", () => {
  it("starts empty with a $20 hourly rate", () => {
    const state = emptyState(0);
    assert.equal(state.hourlyRateCents, 2000);
    assert.equal(state.seededAt, null);
    assert.equal(countSeededItems(state), 0);
    assert.equal(state.followThrough.score, 50);
    assert.equal(state.followThrough.muted, false);
  });

  it("loads a week of history with mail, spends, and a skipped impulse", () => {
    const state = buildSeedState(1_700_000_000_000);
    assert.ok(state.seededAt);
    assert.equal(state.tasks.length, 4);
    assert.equal(state.calendar.length, 1);
    assert.equal(state.groceries.length, 1);
    assert.equal(state.spends.length, 4);
    assert.equal(state.mail.length, 1);
    assert.equal(state.impulses[0]?.status, "skipped");
    assert.equal(state.mail[0]?.amountCents, 21400);
    assert.ok(countSeededItems(state) >= 8);
  });
});
