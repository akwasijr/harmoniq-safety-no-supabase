import { describe, expect, it, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

const getUserMock = vi.fn();
const profileSingleMock = vi.fn();
const incidentInsertSingleMock = vi.fn();

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
              single: profileSingleMock,
            }),
          }),
        };
      }

      if (table === "incidents") {
        return {
          insert: () => ({
            select: () => ({
              single: incidentInsertSingleMock,
            }),
          }),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  })),
}));

import { POST } from "@/app/api/incidents/route";

describe("/api/incidents POST", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when the user is not authenticated", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });

    const request = new NextRequest("http://localhost/api/incidents", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: "Unauthorized" });
  });

  it("returns 400 for invalid incident types before writing data", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } } });
    profileSingleMock.mockResolvedValue({
      data: { id: "user-1", role: "employee", company_id: "company-1" },
    });

    const request = new NextRequest("http://localhost/api/incidents", {
      method: "POST",
      body: JSON.stringify({
        title: "Broken ladder",
        description: "A ladder is damaged",
        type: "invalid-type",
        severity: "medium",
        priority: "high",
        incident_date: "2026-04-07",
        incident_time: "13:30",
      }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "Invalid incident type" });
    expect(incidentInsertSingleMock).not.toHaveBeenCalled();
  });

  it("creates an incident for a valid authenticated request", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } } });
    profileSingleMock.mockResolvedValue({
      data: { id: "user-1", role: "employee", company_id: "company-1" },
    });
    incidentInsertSingleMock.mockResolvedValue({
      data: { id: "incident-1", title: "Broken ladder" },
      error: null,
    });

    const request = new NextRequest("http://localhost/api/incidents", {
      method: "POST",
      body: JSON.stringify({
        title: "Broken ladder",
        description: "A ladder is damaged",
        type: "hazard",
        severity: "medium",
        priority: "high",
        incident_date: "2026-04-07",
        incident_time: "13:30",
      }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toEqual({
      incident: { id: "incident-1", title: "Broken ladder" },
    });
    expect(incidentInsertSingleMock).toHaveBeenCalledOnce();
  });
});
