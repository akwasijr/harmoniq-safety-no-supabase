import { describe, it, expect } from "vitest";
import { hasPermission, canAccessTable, getWritableTables } from "@/lib/permissions";

describe("RBAC permissions", () => {
  describe("hasPermission", () => {
    it("super_admin can do everything", () => {
      expect(hasPermission("super_admin", "companies", "create")).toBe(true);
      expect(hasPermission("super_admin", "companies", "delete")).toBe(true);
      expect(hasPermission("super_admin", "incidents", "create")).toBe(true);
      expect(hasPermission("super_admin", "teams", "delete")).toBe(true);
      expect(hasPermission("super_admin", "notifications", "update")).toBe(true);
    });

    it("company_admin can CRUD company resources", () => {
      expect(hasPermission("company_admin", "teams", "create")).toBe(true);
      expect(hasPermission("company_admin", "teams", "delete")).toBe(true);
      expect(hasPermission("company_admin", "locations", "create")).toBe(true);
      expect(hasPermission("company_admin", "incidents", "update")).toBe(true);
      expect(hasPermission("company_admin", "content", "create")).toBe(true);
    });

    it("company_admin cannot delete companies", () => {
      expect(hasPermission("company_admin", "companies", "delete")).toBe(false);
    });

    it("employee can create incidents", () => {
      expect(hasPermission("employee", "incidents", "create")).toBe(true);
    });

    it("employee cannot create teams", () => {
      expect(hasPermission("employee", "teams", "create")).toBe(false);
    });

    it("employee can create checklist_submissions but not templates", () => {
      expect(hasPermission("employee", "checklist_submissions", "create")).toBe(true);
      expect(hasPermission("employee", "checklist_templates", "create")).toBe(false);
    });

    it("employee can create risk_evaluations", () => {
      expect(hasPermission("employee", "risk_evaluations", "create")).toBe(true);
    });

    it("viewer can only read", () => {
      expect(hasPermission("viewer", "incidents", "read")).toBe(true);
      expect(hasPermission("viewer", "incidents", "create")).toBe(false);
      expect(hasPermission("viewer", "incidents", "update")).toBe(false);
      expect(hasPermission("viewer", "incidents", "delete")).toBe(false);
      expect(hasPermission("viewer", "teams", "read")).toBe(true);
      expect(hasPermission("viewer", "teams", "create")).toBe(false);
    });

    it("safety_officer can create risk_evaluations and corrective_actions", () => {
      expect(hasPermission("safety_officer", "risk_evaluations", "create")).toBe(true);
      expect(hasPermission("safety_officer", "corrective_actions", "create")).toBe(true);
      expect(hasPermission("safety_officer", "incidents", "create")).toBe(true);
    });

    it("manager can create and update most things", () => {
      expect(hasPermission("manager", "incidents", "create")).toBe(true);
      expect(hasPermission("manager", "incidents", "update")).toBe(true);
      expect(hasPermission("manager", "work_orders", "create")).toBe(true);
      expect(hasPermission("manager", "tickets", "update")).toBe(true);
    });

    it("unknown role returns false", () => {
      expect(hasPermission("intern" as any, "incidents", "create")).toBe(false);
    });
  });

  describe("canAccessTable", () => {
    it("returns true for allowed combos", () => {
      expect(canAccessTable("employee", "incidents", "create")).toBe(true);
      expect(canAccessTable("company_admin", "teams", "delete")).toBe(true);
    });

    it("returns false for denied combos", () => {
      expect(canAccessTable("employee", "teams", "create")).toBe(false);
      expect(canAccessTable("viewer", "incidents", "delete")).toBe(false);
    });

    it("unknown role returns false", () => {
      expect(canAccessTable("guest" as any, "incidents", "read")).toBe(false);
    });
  });

  describe("getWritableTables", () => {
    it("employee gets limited writable tables", () => {
      const tables = getWritableTables("employee");
      expect(tables).toContain("incidents");
      expect(tables).toContain("checklist_submissions");
      expect(tables).toContain("risk_evaluations");
      expect(tables).not.toContain("teams");
      expect(tables).not.toContain("companies");
      expect(tables).not.toContain("content");
    });

    it("company_admin gets many writable tables", () => {
      const tables = getWritableTables("company_admin");
      expect(tables).toContain("teams");
      expect(tables).toContain("locations");
      expect(tables).toContain("incidents");
      expect(tables).toContain("content");
    });

    it("viewer gets empty writable tables", () => {
      const tables = getWritableTables("viewer");
      expect(tables).toHaveLength(0);
    });

    it("super_admin gets all tables", () => {
      const tables = getWritableTables("super_admin");
      expect(tables.length).toBeGreaterThan(10);
      expect(tables).toContain("companies");
    });
  });
});
