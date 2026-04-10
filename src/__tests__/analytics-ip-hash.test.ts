import { describe, it, expect, beforeEach, afterEach } from "vitest";
import crypto from "crypto";

// ---------------------------------------------------------------------------
// Replicate the IP-hashing function from the analytics route
// ---------------------------------------------------------------------------

function hashIp(ip: string): string {
  const salt = process.env.IP_HASH_SALT || "analytics-default";
  return crypto
    .createHash("sha256")
    .update(ip + salt)
    .digest("hex")
    .slice(0, 16);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Analytics IP hash", () => {
  const ORIGINAL_ENV = process.env.IP_HASH_SALT;

  beforeEach(() => {
    delete process.env.IP_HASH_SALT;
  });

  afterEach(() => {
    if (ORIGINAL_ENV !== undefined) {
      process.env.IP_HASH_SALT = ORIGINAL_ENV;
    } else {
      delete process.env.IP_HASH_SALT;
    }
  });

  // -------------------------------------------------------------------------
  // Determinism
  // -------------------------------------------------------------------------

  it("same IP produces the same hash", () => {
    const hash1 = hashIp("192.168.1.1");
    const hash2 = hashIp("192.168.1.1");
    expect(hash1).toBe(hash2);
  });

  it("is deterministic across multiple calls", () => {
    const results = Array.from({ length: 10 }, () => hashIp("10.0.0.1"));
    expect(new Set(results).size).toBe(1);
  });

  // -------------------------------------------------------------------------
  // Uniqueness
  // -------------------------------------------------------------------------

  it("different IPs produce different hashes", () => {
    const h1 = hashIp("192.168.1.1");
    const h2 = hashIp("192.168.1.2");
    expect(h1).not.toBe(h2);
  });

  it("similar IPs still produce different hashes", () => {
    const h1 = hashIp("10.0.0.1");
    const h2 = hashIp("10.0.0.10");
    expect(h1).not.toBe(h2);
  });

  // -------------------------------------------------------------------------
  // Format
  // -------------------------------------------------------------------------

  it("hash is exactly 16 characters long", () => {
    expect(hashIp("172.16.0.1")).toHaveLength(16);
  });

  it("hash contains only hex characters", () => {
    const hash = hashIp("8.8.8.8");
    expect(hash).toMatch(/^[0-9a-f]{16}$/);
  });

  // -------------------------------------------------------------------------
  // Salt behaviour
  // -------------------------------------------------------------------------

  it("uses default salt when IP_HASH_SALT is not set", () => {
    delete process.env.IP_HASH_SALT;
    const hash = hashIp("1.2.3.4");
    // Manually compute expected hash with default salt
    const expected = crypto
      .createHash("sha256")
      .update("1.2.3.4" + "analytics-default")
      .digest("hex")
      .slice(0, 16);
    expect(hash).toBe(expected);
  });

  it("different salt produces different hash for same IP", () => {
    delete process.env.IP_HASH_SALT;
    const hashDefault = hashIp("1.2.3.4");

    process.env.IP_HASH_SALT = "custom-secret-salt";
    const hashCustom = hashIp("1.2.3.4");

    expect(hashDefault).not.toBe(hashCustom);
  });

  it("is deterministic with same custom salt", () => {
    process.env.IP_HASH_SALT = "my-salt";
    const h1 = hashIp("10.0.0.1");
    const h2 = hashIp("10.0.0.1");
    expect(h1).toBe(h2);
  });

  // -------------------------------------------------------------------------
  // Edge cases
  // -------------------------------------------------------------------------

  it("handles IPv6 addresses", () => {
    const hash = hashIp("::1");
    expect(hash).toHaveLength(16);
    expect(hash).toMatch(/^[0-9a-f]{16}$/);
  });

  it("handles empty string", () => {
    const hash = hashIp("");
    expect(hash).toHaveLength(16);
  });

  it("hashing is not reversible — cannot extract IP from hash", () => {
    const hash = hashIp("192.168.1.100");
    expect(hash).not.toContain("192");
    expect(hash).not.toContain("168");
  });
});
