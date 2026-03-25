import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getDateRangeFromValue, type DateRangeValue } from "@/lib/date-utils";

describe("getDateRangeFromValue", () => {
  const FIXED_NOW = new Date("2026-03-16T12:00:00.000Z");

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns today range", () => {
    const { start, end } = getDateRangeFromValue("today");
    expect(start.getDate()).toBe(FIXED_NOW.getDate());
    expect(start.getHours()).toBe(0);
    expect(end.getHours()).toBe(23);
    expect(end.getMinutes()).toBe(59);
  });

  it("returns yesterday range", () => {
    const { start, end } = getDateRangeFromValue("yesterday");
    expect(start.getDate()).toBe(FIXED_NOW.getDate() - 1);
    expect(end.getDate()).toBe(FIXED_NOW.getDate() - 1);
    expect(end.getHours()).toBe(23);
  });

  it("returns last 7 days range", () => {
    const { start } = getDateRangeFromValue("last_7_days");
    const diffDays = Math.round(
      (FIXED_NOW.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    );
    expect(diffDays).toBeGreaterThanOrEqual(7);
  });

  it("returns last 30 days range", () => {
    const { start } = getDateRangeFromValue("last_30_days");
    const diffDays = Math.round(
      (FIXED_NOW.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    );
    expect(diffDays).toBeGreaterThanOrEqual(30);
  });

  it("returns last 90 days range", () => {
    const { start } = getDateRangeFromValue("last_90_days");
    const diffDays = Math.round(
      (FIXED_NOW.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    );
    expect(diffDays).toBeGreaterThanOrEqual(90);
  });

  it("returns last 6 months range", () => {
    const { start } = getDateRangeFromValue("last_6_months");
    const monthDiff =
      (FIXED_NOW.getFullYear() - start.getFullYear()) * 12 +
      (FIXED_NOW.getMonth() - start.getMonth());
    expect(monthDiff).toBeGreaterThanOrEqual(6);
  });

  it("returns all time for custom without dates", () => {
    const { start } = getDateRangeFromValue("custom");
    expect(start.getTime()).toBe(0); // epoch
  });

  it("parses custom date range", () => {
    const { start, end } = getDateRangeFromValue("custom", "2026-01-01", "2026-01-31");
    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(0); // Jan
    expect(end.getHours()).toBe(23); // end of day
  });

  it("handles custom range with ISO timestamps", () => {
    const { end } = getDateRangeFromValue(
      "custom",
      "2026-01-01T00:00:00.000Z",
      "2026-01-31T15:30:00.000Z"
    );
    // Should keep the provided time, not append 23:59:59
    expect(end.getMinutes()).toBe(30);
  });

  it("returns all_time with epoch start", () => {
    const { start } = getDateRangeFromValue("all_time");
    expect(start.getTime()).toBe(0);
  });
});
