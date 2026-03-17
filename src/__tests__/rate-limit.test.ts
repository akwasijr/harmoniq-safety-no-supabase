import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRateLimiter, getClientIp } from "@/lib/rate-limit";
import { NextRequest } from "next/server";

function makeRequest(ip = "127.0.0.1"): NextRequest {
  return new NextRequest("http://localhost/api/test", {
    headers: { "x-forwarded-for": ip },
  });
}

describe("getClientIp", () => {
  it("extracts IP from x-forwarded-for", () => {
    const req = makeRequest("1.2.3.4");
    expect(getClientIp(req)).toBe("1.2.3.4");
  });

  it("takes first IP from comma-separated list", () => {
    const req = new NextRequest("http://localhost/api/test", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    expect(getClientIp(req)).toBe("1.2.3.4");
  });

  it("returns 'unknown' when no header", () => {
    const req = new NextRequest("http://localhost/api/test");
    expect(getClientIp(req)).toBe("unknown");
  });
});

describe("createRateLimiter", () => {
  it("allows requests within limit", () => {
    const limiter = createRateLimiter({ limit: 3, windowMs: 60_000, prefix: "test-allow" });
    const req = makeRequest("10.0.0.1");

    const r1 = limiter.check(req);
    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(2);

    const r2 = limiter.check(req);
    expect(r2.allowed).toBe(true);
    expect(r2.remaining).toBe(1);

    const r3 = limiter.check(req);
    expect(r3.allowed).toBe(true);
    expect(r3.remaining).toBe(0);
  });

  it("blocks requests over limit", () => {
    const limiter = createRateLimiter({ limit: 2, windowMs: 60_000, prefix: "test-block" });
    const req = makeRequest("10.0.0.2");

    limiter.check(req);
    limiter.check(req);
    const r3 = limiter.check(req);

    expect(r3.allowed).toBe(false);
    expect(r3.remaining).toBe(0);
    expect(r3.response.status).toBe(429);
  });

  it("resets after window expires", () => {
    vi.useFakeTimers();
    const limiter = createRateLimiter({ limit: 1, windowMs: 1000, prefix: "test-reset" });
    const req = makeRequest("10.0.0.3");

    limiter.check(req);
    const blocked = limiter.check(req);
    expect(blocked.allowed).toBe(false);

    vi.advanceTimersByTime(1100);

    const allowed = limiter.check(req);
    expect(allowed.allowed).toBe(true);

    vi.useRealTimers();
  });

  it("tracks IPs independently", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000, prefix: "test-multi-ip" });

    const r1 = limiter.check(makeRequest("10.0.0.4"));
    const r2 = limiter.check(makeRequest("10.0.0.5"));

    expect(r1.allowed).toBe(true);
    expect(r2.allowed).toBe(true);
  });

  it("includes rate limit headers on 429", async () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000, prefix: "test-headers" });
    const req = makeRequest("10.0.0.6");

    limiter.check(req);
    const blocked = limiter.check(req);

    expect(blocked.response.headers.get("Retry-After")).toBeTruthy();
    expect(blocked.response.headers.get("X-RateLimit-Remaining")).toBe("0");
  });
});
