import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseDueOn } from "./intent-router.ts";

describe("parseDueOn", () => {
  const now = new Date(2026, 7, 28, 15, 0, 0); // Friday

  it("parses today and tomorrow", () => {
    assert.equal(parseDueOn("call today", now), "2026-08-28");
    assert.equal(parseDueOn("call tomorrow", now), "2026-08-29");
  });

  it("parses in N days", () => {
    assert.equal(parseDueOn("in 3 days", now), "2026-08-31");
  });

  it("parses the next named weekday", () => {
    assert.equal(parseDueOn("monday", now), "2026-08-31");
  });

  it("returns null when there is no date", () => {
    assert.equal(parseDueOn("that thing about Sam", now), null);
  });
});
