import { describe, it, expect, beforeEach } from "vitest";
import {
  createTestCompany,
  createTestUser,
  createTestIncident,
  createTestLocation,
  createTestTeam,
  createTestTicket,
  resetIdCounter,
} from "./helpers";

describe("Test helpers", () => {
  beforeEach(() => {
    resetIdCounter();
  });

  describe("createTestCompany", () => {
    it("creates a company with defaults", () => {
      const company = createTestCompany();
      expect(company.id).toBe("test-1");
      expect(company.name).toBe("Test Company");
      expect(company.slug).toBe("test-company");
      expect(company.status).toBe("active");
    });

    it("allows overrides", () => {
      const company = createTestCompany({ name: "Custom", status: "trial" });
      expect(company.name).toBe("Custom");
      expect(company.status).toBe("trial");
    });
  });

  describe("createTestUser", () => {
    it("creates a user with defaults", () => {
      const user = createTestUser();
      expect(user.role).toBe("employee");
      expect(user.status).toBe("active");
    });

    it("creates different roles", () => {
      const admin = createTestUser({ role: "super_admin" });
      expect(admin.role).toBe("super_admin");
    });
  });

  describe("createTestIncident", () => {
    it("creates an incident with defaults", () => {
      const incident = createTestIncident();
      expect(incident.status).toBe("new");
      expect(incident.severity).toBe("medium");
      expect(incident.type).toBe("near_miss");
    });

    it("allows status overrides", () => {
      const resolved = createTestIncident({ status: "resolved" });
      expect(resolved.status).toBe("resolved");
    });
  });

  describe("createTestLocation", () => {
    it("creates a location with defaults", () => {
      const loc = createTestLocation();
      expect(loc.type).toBe("site");
      expect(loc.parent_id).toBeNull();
    });
  });

  describe("createTestTeam", () => {
    it("creates a team with defaults", () => {
      const team = createTestTeam();
      expect(team.member_ids).toEqual([]);
      expect(team.status).toBe("active");
    });
  });

  describe("createTestTicket", () => {
    it("creates a ticket with defaults", () => {
      const ticket = createTestTicket();
      expect(ticket.status).toBe("new");
      expect(ticket.priority).toBe("medium");
    });
  });

  describe("ID generation", () => {
    it("generates unique IDs", () => {
      const a = createTestUser();
      const b = createTestUser();
      expect(a.id).not.toBe(b.id);
    });

    it("resets counter between tests", () => {
      resetIdCounter();
      const user = createTestUser();
      expect(user.id).toBe("test-1");
    });
  });
});
