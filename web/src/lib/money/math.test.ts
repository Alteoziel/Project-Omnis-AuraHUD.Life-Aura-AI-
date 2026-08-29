import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  hoursOfWork,
  keptCents,
  weeksToGoal,
  categoryTotals,
} from "./math.ts";

describe("money math", () => {
  it("converts price to hours at $20/hour", () => {
    assert.equal(hoursOfWork(6000, 2000), 3);
  });

  it("sums skipped impulses exactly", () => {
    assert.equal(
      keptCents([
        {
          id: "1",
          title: "Headphones",
          amountCents: 7900,
          status: "skipped",
          coolingUntil: 0,
          createdAt: 0,
        },
      ]),
      7900,
    );
  });

  it("computes weeks to a vacation from takeout cuts", () => {
    assert.equal(weeksToGoal(4400, 80_000), 19);
  });

  it("groups spend by category in cents", () => {
    const totals = categoryTotals([
      {
        id: "1",
        title: "Lunch",
        amountCents: 1200,
        category: "dining",
        at: 0,
      },
      {
        id: "2",
        title: "Dinner",
        amountCents: 1800,
        category: "dining",
        at: 0,
      },
    ]);
    assert.equal(totals.dining, 3000);
  });
});
