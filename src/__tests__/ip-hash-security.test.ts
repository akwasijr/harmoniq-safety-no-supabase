import { describe, it, expect } from "vitest";
import crypto from "crypto";

// Replicate the analytics IP hash function for testing
function hashIp(ip: string, salt = "analytics-default"): string {
  return crypto.createHash("sha256").update(ip + salt).digest("hex").slice(0, 16);
}

// Replicate the consent IP hash function
function hashIpConsent(ip: string, salt = ""): string {
  return crypto.createHash("sha256").update(ip + salt).digest("hex").slice(0, 16);
}

describe("IP hash security", () => {
  it("same IP produces same hash", () => {
    expect(hashIp("192.168.1.1")).toBe(hashIp("192.168.1.1"));
  });

  it("different IPs produce different hashes", () => {
    expect(hashIp("192.168.1.1")).not.toBe(hashIp("192.168.1.2"));
  });

  it("hash is exactly 16 chars", () => {
    expect(hashIp("10.0.0.1")).toHaveLength(16);
    expect(hashIp("255.255.255.255")).toHaveLength(16);
  });

  it("hash is deterministic with same salt", () => {
    const h1 = hashIp("8.8.8.8", "my-salt");
    const h2 = hashIp("8.8.8.8", "my-salt");
    expect(h1).toBe(h2);
  });

  it("different salt produces different hash", () => {
    const h1 = hashIp("8.8.8.8", "salt-a");
    const h2 = hashIp("8.8.8.8", "salt-b");
    expect(h1).not.toBe(h2);
  });

  it("hash is hex string", () => {
    const h = hashIp("1.2.3.4");
    expect(h).toMatch(/^[0-9a-f]{16}$/);
  });

  it("empty IP still produces valid hash", () => {
    const h = hashIp("");
    expect(h).toHaveLength(16);
    expect(h).toMatch(/^[0-9a-f]+$/);
  });

  it("IPv6 addresses hash correctly", () => {
    const h = hashIp("2001:0db8:85a3:0000:0000:8a2e:0370:7334");
    expect(h).toHaveLength(16);
    expect(h).toMatch(/^[0-9a-f]+$/);
  });

  it("consent hash uses same SHA-256 pattern", () => {
    const h = hashIpConsent("192.168.1.1", "test-salt");
    expect(h).toHaveLength(16);
    expect(h).toMatch(/^[0-9a-f]+$/);
  });
});
