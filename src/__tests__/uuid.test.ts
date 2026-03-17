import { describe, it, expect } from "vitest";
import { generateId } from "@/lib/uuid";

describe("generateId", () => {
  it("returns a valid UUID v4 string", () => {
    const id = generateId();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  it("generates unique IDs", () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });

  it("has correct version nibble (4)", () => {
    const id = generateId();
    expect(id[14]).toBe("4");
  });

  it("has correct variant bits (8, 9, a, or b)", () => {
    const id = generateId();
    expect(["8", "9", "a", "b"]).toContain(id[19].toLowerCase());
  });
});
