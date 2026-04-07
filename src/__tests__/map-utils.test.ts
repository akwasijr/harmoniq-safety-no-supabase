import { describe, expect, it } from "vitest";
import { hasValidCoordinates } from "@/lib/map-utils";

describe("map utils", () => {
  it("accepts zero-value coordinates", () => {
    expect(hasValidCoordinates(0, 0)).toBe(true);
    expect(hasValidCoordinates(51.5074, 0)).toBe(true);
    expect(hasValidCoordinates(0, -0.1278)).toBe(true);
  });

  it("rejects nullish or non-finite coordinates", () => {
    expect(hasValidCoordinates(null, 10)).toBe(false);
    expect(hasValidCoordinates(10, null)).toBe(false);
    expect(hasValidCoordinates(undefined, 10)).toBe(false);
    expect(hasValidCoordinates(Number.NaN, 10)).toBe(false);
    expect(hasValidCoordinates(10, Number.POSITIVE_INFINITY)).toBe(false);
  });
});
