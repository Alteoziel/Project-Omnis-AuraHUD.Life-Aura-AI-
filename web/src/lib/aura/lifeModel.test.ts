import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { describeCorrection } from "./lifeModel.ts";

describe("describeCorrection", () => {
  it("explains a hard reject in plain language", () => {
    const text = describeCorrection({
      id: "1",
      inputSnippet: "call the landlord tomorrow",
      rejectedOutput: "call the landlord",
      actionType: "task",
      status: "rejected_unspecified",
      constraints: [],
      createdAt: 0,
    });
    assert.match(text, /will not treat/i);
    assert.match(text, /landlord/);
  });
});
