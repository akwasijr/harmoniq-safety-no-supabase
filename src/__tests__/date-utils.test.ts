import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getDateRangeFromValue, isWithinDateRange, formatDateRange } from "@/lib/date-utils";

describe("getDateRangeFromValue", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-06-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns today's range", () => {
    const { start, end } = getDateRangeFromValue("today");
    expect(start.getDate()).toBe(15);
    expect(end.getDate()).toBe(15);
    expect(end.getHours()).toBe(23);
    expect(end.getMinutes()).toBe(59);
  });

  it("returns yesterday's range", () => {
    const { start, end } = getDateRangeFromValue("yesterday");
    expect(start.getDate()).toBe(14);
    expect(end.getDate()).toBe(14);
  });

  it("returns last 7 days range", () => {
    const { start } = getDateRangeFromValue("last_7_days");
    expect(start.getDate()).toBe(8);
  });

  it("returns last 30 days range", () => {
    const { start } = getDateRangeFromValue("last_30_days");
    const expected = new Date("2024-06-15");
    expected.setDate(expected.getDate() - 30);
    expect(start.getDate()).toBe(expected.getDate());
  });

  it("returns all time starting from epoch", () => {
    const { start } = getDateRangeFromValue("all_time");
    expect(start.getTime()).toBe(0);
  });

  it("handles custom date range", () => {
    const { start, end } = getDateRangeFromValue("custom", "2024-01-01", "2024-06-30");
    expect(start.getFullYear()).toBe(2024);
    expect(start.getMonth()).toBe(0); // January
    expect(end.getMonth()).toBe(5); // June
  });

  it("falls back to all_time when custom has no dates", () => {
    const { start } = getDateRangeFromValue("custom");
    expect(start.getTime()).toBe(0);
  });
});

describe("isWithinDateRange", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-06-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns true for all_time regardless of date", () => {
    expect(isWithinDateRange("2020-01-01", "all_time")).toBe(true);
    expect(isWithinDateRange("1990-01-01", "all_time")).toBe(true);
  });

  it("correctly filters for last 7 days", () => {
    expect(isWithinDateRange("2024-06-14", "last_7_days")).toBe(true);
    expect(isWithinDateRange("2024-06-01", "last_7_days")).toBe(false);
  });

  it("accepts Date objects", () => {
    expect(isWithinDateRange(new Date("2024-06-14"), "last_7_days")).toBe(true);
  });
});

describe("formatDateRange", () => {
  it("returns label for preset ranges", () => {
    expect(formatDateRange("today")).toBe("Today");
    expect(formatDateRange("last_7_days")).toBe("Last 7 days");
    expect(formatDateRange("all_time")).toBe("All time");
  });

  it("formats custom range with dates", () => {
    const result = formatDateRange("custom", "2024-01-01", "2024-06-30");
    expect(result).toContain("2024");
  });

  it("returns generic label for custom without dates", () => {
    expect(formatDateRange("custom")).toBe("Custom range");
  });
});
