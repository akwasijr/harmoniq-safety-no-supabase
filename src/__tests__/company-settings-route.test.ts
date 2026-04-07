import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  profileMaybeSingleMock: vi.fn(),
  companyUpdateSingleMock: vi.fn(),
  auditInsertMock: vi.fn(),
  createAdminClientMock: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  createRateLimiter: () => ({
    check: () => ({ allowed: true }),
  }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: mocks.createAdminClientMock,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: mocks.getUserMock,
    },
    from: (table: string) => {
      if (table === "users") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: mocks.profileMaybeSingleMock,
            }),
          }),
        };
      }

      throw new Error(`Unexpected session table: ${table}`);
    },
  })),
}));

import { POST } from "@/app/api/company-settings/route";

describe("/api/company-settings POST", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.createAdminClientMock.mockReturnValue({
      from: (table: string) => {
        if (table === "companies") {
          return {
            update: () => ({
              eq: () => ({
                select: () => ({
                  single: mocks.companyUpdateSingleMock,
                }),
              }),
            }),
          };
        }

        if (table === "audit_logs") {
          return {
            insert: mocks.auditInsertMock,
          };
        }

        throw new Error(`Unexpected admin table: ${table}`);
      },
    });

    mocks.auditInsertMock.mockResolvedValue({ error: null });
  });

  it("lets company_admin update their own company branding", async () => {
    mocks.getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mocks.profileMaybeSingleMock.mockResolvedValue({
      data: { role: "company_admin", company_id: "company-1" },
    });
    mocks.companyUpdateSingleMock.mockResolvedValue({
      data: {
        id: "company-1",
        name: "Acme Safety",
        primary_color: "#7045d3",
        secondary_color: "#525252",
      },
      error: null,
    });

    const request = new NextRequest("http://localhost/api/company-settings", {
      method: "POST",
      body: JSON.stringify({
        companyId: "company-1",
        companyName: "Acme Safety",
        primaryColor: "#7045d3",
        secondaryColor: "#525252",
      }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.company).toMatchObject({
      id: "company-1",
      name: "Acme Safety",
      primary_color: "#7045d3",
    });
    expect(mocks.auditInsertMock).toHaveBeenCalledOnce();
  });

  it("blocks company_admin from updating another company", async () => {
    mocks.getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mocks.profileMaybeSingleMock.mockResolvedValue({
      data: { role: "company_admin", company_id: "company-1" },
    });

    const request = new NextRequest("http://localhost/api/company-settings", {
      method: "POST",
      body: JSON.stringify({
        companyId: "company-2",
        companyName: "Other Company",
        primaryColor: "#7045d3",
      }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({ error: "Forbidden" });
    expect(mocks.companyUpdateSingleMock).not.toHaveBeenCalled();
  });
});
