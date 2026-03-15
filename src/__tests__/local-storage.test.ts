import { describe, it, expect, beforeEach } from "vitest";
import {
  loadFromStorage,
  saveToStorage,
  loadOptionalStringFromStorage,
  clearAllHarmoniqStorage,
} from "@/lib/local-storage";

describe("loadFromStorage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("returns fallback when key does not exist", () => {
    expect(loadFromStorage("missing", [])).toEqual([]);
    expect(loadFromStorage("missing", "default")).toBe("default");
  });

  it("loads and parses stored JSON", () => {
    window.localStorage.setItem("test", JSON.stringify([{ id: "1", name: "A" }]));
    const result = loadFromStorage("test", []);
    expect(result).toEqual([{ id: "1", name: "A" }]);
  });

  it("returns fallback for invalid JSON", () => {
    window.localStorage.setItem("test", "not-json{{{");
    expect(loadFromStorage("test", [])).toEqual([]);
  });

  it("returns fallback when array expected but got non-array", () => {
    window.localStorage.setItem("test", JSON.stringify("string-value"));
    expect(loadFromStorage("test", [])).toEqual([]);
  });

  it("validates entity shape (must have id field)", () => {
    window.localStorage.setItem("test", JSON.stringify([{ noId: true }]));
    expect(loadFromStorage("test", [])).toEqual([]);
  });

  it("accepts arrays where all items have id", () => {
    const data = [{ id: "1" }, { id: "2" }];
    window.localStorage.setItem("test", JSON.stringify(data));
    expect(loadFromStorage("test", [])).toEqual(data);
  });

  it("accepts empty arrays", () => {
    window.localStorage.setItem("test", JSON.stringify([]));
    expect(loadFromStorage("test", [{ id: "fallback" }])).toEqual([]);
  });
});

describe("saveToStorage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("saves data to localStorage", () => {
    saveToStorage("key", [{ id: "1" }]);
    const stored = window.localStorage.getItem("key");
    expect(JSON.parse(stored!)).toEqual([{ id: "1" }]);
  });

  it("overwrites existing data", () => {
    saveToStorage("key", [{ id: "1" }]);
    saveToStorage("key", [{ id: "2" }]);
    const stored = JSON.parse(window.localStorage.getItem("key")!);
    expect(stored).toEqual([{ id: "2" }]);
  });
});

describe("loadOptionalStringFromStorage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("returns null when key does not exist", () => {
    expect(loadOptionalStringFromStorage("missing")).toBeNull();
  });

  it("returns string value", () => {
    window.localStorage.setItem("key", JSON.stringify("hello"));
    expect(loadOptionalStringFromStorage("key")).toBe("hello");
  });

  it("returns null for empty string", () => {
    window.localStorage.setItem("key", JSON.stringify(""));
    expect(loadOptionalStringFromStorage("key")).toBeNull();
  });

  it("returns null for non-string values", () => {
    window.localStorage.setItem("key", JSON.stringify(123));
    expect(loadOptionalStringFromStorage("key")).toBeNull();
  });
});

describe("clearAllHarmoniqStorage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("clears all harmoniq_ prefixed keys", () => {
    window.localStorage.setItem("harmoniq_incidents", "[]");
    window.localStorage.setItem("harmoniq_users", "[]");
    window.localStorage.setItem("other_key", "keep");

    clearAllHarmoniqStorage();

    expect(window.localStorage.getItem("harmoniq_incidents")).toBeNull();
    expect(window.localStorage.getItem("harmoniq_users")).toBeNull();
    expect(window.localStorage.getItem("other_key")).toBe("keep");
  });

  it("handles empty localStorage", () => {
    expect(() => clearAllHarmoniqStorage()).not.toThrow();
  });
});
