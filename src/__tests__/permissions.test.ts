import { describe, it, expect } from "vitest";
import { ROLE_PERMISSIONS } from "@/types";
import type { Permission, UserRole } from "@/types";

describe("Role-based permissions", () => {
  describe("super_admin", () => {
    it("has all permissions", () => {
      const perms = ROLE_PERMISSIONS.super_admin;
      expect(perms).toContain("incidents.view_all");
      expect(perms).toContain("incidents.delete");
      expect(perms).toContain("users.create");
      expect(perms).toContain("users.delete");
      expect(perms).toContain("settings.billing");
      expect(perms).toContain("teams.delete");
    });
  });

  describe("company_admin", () => {
    it("has all incident permissions", () => {
      const perms = ROLE_PERMISSIONS.company_admin;
      expect(perms).toContain("incidents.view_all");
      expect(perms).toContain("incidents.create");
      expect(perms).toContain("incidents.delete");
      expect(perms).toContain("incidents.investigate");
    });

    it("has user management permissions", () => {
      const perms = ROLE_PERMISSIONS.company_admin;
      expect(perms).toContain("users.create");
      expect(perms).toContain("users.edit");
      expect(perms).toContain("users.delete");
      expect(perms).toContain("users.manage_roles");
    });

    it("has settings permissions", () => {
      const perms = ROLE_PERMISSIONS.company_admin;
      expect(perms).toContain("settings.view");
      expect(perms).toContain("settings.edit");
      expect(perms).toContain("settings.billing");
    });
  });

  describe("manager", () => {
    it("can view team incidents but not all", () => {
      const perms = ROLE_PERMISSIONS.manager;
      expect(perms).toContain("incidents.view_team");
      expect(perms).not.toContain("incidents.view_all");
    });

    it("can investigate incidents", () => {
      expect(ROLE_PERMISSIONS.manager).toContain("incidents.investigate");
    });

    it("cannot manage users or settings", () => {
      const perms = ROLE_PERMISSIONS.manager;
      expect(perms).not.toContain("users.create");
      expect(perms).not.toContain("users.delete");
      expect(perms).not.toContain("settings.edit");
    });

    it("can manage team members", () => {
      expect(ROLE_PERMISSIONS.manager).toContain("teams.manage_members");
    });

    it("can export reports", () => {
      expect(ROLE_PERMISSIONS.manager).toContain("reports.export");
    });
  });

  describe("employee", () => {
    it("can only view own incidents", () => {
      const perms = ROLE_PERMISSIONS.employee;
      expect(perms).toContain("incidents.view_own");
      expect(perms).not.toContain("incidents.view_team");
      expect(perms).not.toContain("incidents.view_all");
    });

    it("can create incidents", () => {
      expect(ROLE_PERMISSIONS.employee).toContain("incidents.create");
    });

    it("can complete checklists", () => {
      const perms = ROLE_PERMISSIONS.employee;
      expect(perms).toContain("checklists.view");
      expect(perms).toContain("checklists.complete");
    });

    it("cannot create templates", () => {
      expect(ROLE_PERMISSIONS.employee).not.toContain("checklists.create_templates");
    });

    it("cannot delete incidents", () => {
      expect(ROLE_PERMISSIONS.employee).not.toContain("incidents.delete");
    });

    it("cannot manage users", () => {
      const perms = ROLE_PERMISSIONS.employee;
      expect(perms).not.toContain("users.create");
      expect(perms).not.toContain("users.edit");
      expect(perms).not.toContain("users.delete");
    });
  });

  describe("permission hierarchy", () => {
    it("super_admin has at least as many permissions as company_admin", () => {
      const superPerms = new Set(ROLE_PERMISSIONS.super_admin);
      for (const perm of ROLE_PERMISSIONS.company_admin) {
        expect(superPerms.has(perm)).toBe(true);
      }
    });

    it("company_admin has at least as many permissions as manager", () => {
      const adminPerms = new Set(ROLE_PERMISSIONS.company_admin);
      for (const perm of ROLE_PERMISSIONS.manager) {
        expect(adminPerms.has(perm)).toBe(true);
      }
    });

    it("manager has at least as many permissions as employee", () => {
      const managerPerms = new Set(ROLE_PERMISSIONS.manager);
      for (const perm of ROLE_PERMISSIONS.employee) {
        expect(managerPerms.has(perm)).toBe(true);
      }
    });
  });

  describe("all roles are defined", () => {
    const allRoles: UserRole[] = ["super_admin", "company_admin", "manager", "employee"];

    it("ROLE_PERMISSIONS has entries for all roles", () => {
      for (const role of allRoles) {
        expect(ROLE_PERMISSIONS[role]).toBeDefined();
        expect(Array.isArray(ROLE_PERMISSIONS[role])).toBe(true);
        expect(ROLE_PERMISSIONS[role].length).toBeGreaterThan(0);
      }
    });
  });
});
