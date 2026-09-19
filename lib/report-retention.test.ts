import { describe, expect, it } from "vitest";

import {
  addCalendarYears,
  isReportExpired,
  parseReportExpiration,
} from "./report-retention";

describe("report retention", () => {
  const now = new Date("2026-09-19T16:00:00.000Z");

  it("treats the exact expiry instant and past timestamps as expired", () => {
    expect(isReportExpired("2026-09-19T16:00:00.000Z", now)).toBe(true);
    expect(isReportExpired("2026-09-19T15:59:59.999Z", now)).toBe(true);
  });

  it("keeps a report available before expiry", () => {
    expect(isReportExpired("2026-09-19T16:00:00.001Z", now)).toBe(false);
  });

  it.each([null, "", "not-a-date", "2026-09-19"])(
    "fails closed for invalid expiration metadata: %s",
    (value) => {
      expect(() => parseReportExpiration(value)).toThrow(
        "Stored report expiration is invalid",
      );
    },
  );

  it("adds financial retention in calendar years", () => {
    expect(addCalendarYears(new Date("2028-02-29T12:00:00.000Z"), 7).toISOString())
      .toBe("2035-03-01T12:00:00.000Z");
  });
});
