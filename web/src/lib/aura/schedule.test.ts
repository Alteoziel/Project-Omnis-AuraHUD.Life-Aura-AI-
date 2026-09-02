import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  addDaysIso,
  formatClock,
  gapsOnDay,
  suggestSlot,
} from "./schedule.ts";

describe("schedule gaps", () => {
  it("places a 60-minute block after a 2pm class", () => {
    const gaps = gapsOnDay([{ startMin: 14 * 60, endMin: 15 * 60 + 20 }]);
    assert.equal(gaps[0]?.startMin, 8 * 60);
    assert.equal(gaps[0]?.endMin, 14 * 60);
    assert.equal(gaps[1]?.startMin, 15 * 60 + 20);
  });

  it("suggests the morning gap today before a due date", () => {
    const slot = suggestSlot("2026-09-04", "2026-09-02", [
      {
        id: "1",
        title: "Math",
        day: "2026-09-02",
        startMin: 14 * 60,
        endMin: 15 * 60 + 20,
        sourceText: "math",
        createdAt: 0,
      },
    ]);
    assert.ok(slot);
    assert.equal(slot?.day, "2026-09-02");
    assert.equal(slot?.startMin, 8 * 60);
    assert.equal(slot?.endMin, 9 * 60);
    assert.equal(formatClock(slot?.startMin ?? 0), "8:00am");
  });

  it("walks to the next day when today is packed", () => {
    const slot = suggestSlot("2026-09-04", "2026-09-02", [
      {
        id: "1",
        title: "Packed",
        day: "2026-09-02",
        startMin: 8 * 60,
        endMin: 22 * 60,
        sourceText: "packed",
        createdAt: 0,
      },
    ]);
    assert.equal(slot?.day, "2026-09-03");
    assert.equal(slot?.startMin, 8 * 60);
  });

  it("adds calendar days without UTC drift", () => {
    assert.equal(addDaysIso("2026-09-02", 1), "2026-09-03");
    assert.equal(addDaysIso("2026-08-31", 1), "2026-09-01");
  });
});
