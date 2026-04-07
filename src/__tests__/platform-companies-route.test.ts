import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const getUserMock = vi.fn();
const profileMaybeSingleMock = vi.fn();
const companyMaybeSingleMock = vi.fn();
const companyInsertSingleMock = vi.fn();
const auditInsertMock = vi.fn();

vi.mock("@/lib/rate-limit", () => ({
  createRateLimiter: () => ({
    check: () => ({ allowed: true }),
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: getUserMock,
    },
    from: (table: string) => {
      if (table === "users") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: profileMaybeSingleMock,
            }),
          }),
        };
      }

      if (table === "companies") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: companyMaybeSingleMock,
            }),
          }),
          insert: () => ({
            select: () => ({
              single: companyInsertSingleMock,
            }),
          }),
        };
      }

      if (table === "audit_logs") {
        return {
          insert: auditInsertMock,
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  })),
}));

import { POST } from "@/app/api/platform/companies/route";

describe("/api/platform/companies POST", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auditInsertMock.mockResolvedValue({ error: null });
  });

  it("forbids company_admin users", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } } });
    profileMaybeSingleMock.mockResolvedValue({
      data: { role: "company_admin", company_id: "company-1" },
    });

    const request = new NextRequest("http://localhost/api/platform/companies", {
      method: "POST",
      body: JSON.stringify({ name: "Acme Safety" }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({ error: "Forbidden" });
  });

  it("creates a company for super_admin users", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } } });
    profileMaybeSingleMock.mockResolvedValue({
      data: { role: "super_admin", company_id: "platform-company" },
    });
    companyMaybeSingleMock.mockResolvedValue({ data: null });
    companyInsertSingleMock.mockResolvedValue({
      data: { id: "company-2", name: "Acme Safety", tier: "trial" },
      error: null,
    });

    const request = new NextRequest("http://localhost/api/platform/companies", {
      method: "POST",
      body: JSON.stringify({
        name: "Acme Safety",
        country: "US",
        language: "en",
        currency: "USD",
        tier: "trial",
        seat_limit: 5,
        status: "trial",
        primary_color: "#2563eb",
        secondary_color: "#1e40af",
        ui_style: "rounded",
      }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      company: { id: "company-2", name: "Acme Safety", tier: "trial" },
    });
    expect(companyInsertSingleMock).toHaveBeenCalledOnce();
    expect(auditInsertMock).toHaveBeenCalledOnce();
  });
});
