import { describe, it, expect } from "vitest";
import { clientSchema } from "../packages/contracts/src/index.js";
import {
  dateOnly,
  day,
  eventTiming,
  nextEventDate,
  rangeBounds,
  timing,
} from "../apps/api/src/domain.js";
describe("Domain boundaries", () => {
  it("normalizes Indian phones and email without guessing personal values", () => {
    const c = clientSchema.parse({
      name: "Test Person",
      phone: "90000 00001",
      email: "PERSON@EXAMPLE.TEST",
    });
    expect(c.phone).toBe("+919000000001");
    expect(c.email).toBe("person@example.test");
    expect(c.gender).toBeUndefined();
    expect(c.dob).toBeUndefined();
  });
  it("uses India midnight independently of UTC dates", () => {
    expect(day(new Date("2026-09-03T18:30:00Z"))).toBe("2026-09-04");
    expect(day(new Date("2026-09-03T18:29:59Z"))).toBe("2026-09-03");
  });
  it("separates task state, due date and exact overdue time", () => {
    expect(
      timing({ state: "pending", dueAt: new Date("2026-09-04T06:29:59Z") }),
    ).toBe("Overdue");
    expect(
      timing({ state: "pending", dueAt: new Date("2026-09-04T06:30:00Z") }),
    ).toBe("Due Today");
    expect(
      timing({ state: "completed", dueAt: new Date("2026-09-01T00:00:00Z") }),
    ).toBe("Completed");
  });
  it("uses inclusive start and exclusive end for overlapping ranges", () => {
    const r = rangeBounds("Next 7 Days")!;
    expect(r.gte?.toISOString()).toBe("2026-09-04T00:00:00.000Z");
    expect(r.lt.toISOString()).toBe("2026-09-11T00:00:00.000Z");
  });
  it("clamps month-end recurrence without losing historical date", () => {
    expect(
      nextEventDate(dateOnly("2026-01-31"), 1).toISOString().slice(0, 10),
    ).toBe("2026-02-28");
    expect(
      eventTiming({ status: "Confirmed", dueDate: dateOnly("2026-01-01") }),
    ).toBe("Renewed");
  });
});
