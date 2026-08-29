import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  constraintsFromRejection,
  routeIntentLocal,
} from "./intent-router.ts";

describe("routeIntentLocal", () => {
  const now = new Date(2026, 7, 28, 15, 0, 0);

  it("routes a dated call to a task with tomorrow's date", () => {
    const routed = routeIntentLocal("call the landlord tomorrow", [], now);
    assert.equal(routed.kind, "task");
    assert.equal(routed.dueOn, "2026-08-29");
    assert.ok(routed.confidence >= 0.6);
  });

  it("captures an amount without inventing a category", () => {
    const routed = routeIntentLocal("I spent $12 on lunch", [], now);
    assert.equal(routed.kind, "budget_note");
    assert.equal(routed.amountCents, 1200);
  });

  it("leaves a vague capture unclear instead of forcing a task", () => {
    const routed = routeIntentLocal("that thing about Sam", [], now);
    assert.equal(routed.kind, "unclear");
  });

  it("does not silently repeat a rejected route for the same utterance", () => {
    const first = routeIntentLocal("call the landlord tomorrow", [], now);
    const constraints = constraintsFromRejection("call the landlord tomorrow", first);
    const again = routeIntentLocal("call the landlord tomorrow", constraints, now);
    assert.equal(again.kind, "unclear");
  });

  it("still routes a different legitimate capture", () => {
    const first = routeIntentLocal("call the landlord tomorrow", [], now);
    const constraints = constraintsFromRejection("call the landlord tomorrow", first);
    const other = routeIntentLocal("buy milk tomorrow", constraints, now);
    assert.equal(other.kind, "task");
  });
});
