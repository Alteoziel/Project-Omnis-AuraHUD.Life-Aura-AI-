import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseAmountCents } from "./intent-router.ts";

describe("parseAmountCents", () => {
  it("parses $12 and 12 dollars", () => {
    assert.equal(parseAmountCents("I spent $12 on lunch"), 1200);
    assert.equal(parseAmountCents("I spent 12 dollars on lunch"), 1200);
  });

  it("parses cents", () => {
    assert.equal(parseAmountCents("$12.50"), 1250);
  });

  it("does not invent an amount", () => {
    assert.equal(parseAmountCents("call the landlord"), null);
  });
});
