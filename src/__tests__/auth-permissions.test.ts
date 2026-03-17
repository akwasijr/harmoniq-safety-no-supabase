/**
 * Auth permission logic tests
 *
 * Tests the permission system (ROLE_PERMISSIONS, hasPermission, hasAnyPermission,
 * hasAllPermissions) without needing React rendering or Supabase.
 */
import { describe, it, expect } from "vitest";
import { ROLE_PERMISSIONS } from "@/types";
import type { Permission, UserRole, CompanyRole } from "@/types";

// Replicate the permission-checking functions from use-auth.tsx
function getEffectivePermissions(role: UserRole | null, customPermissions?: Permission[]): Permission[] {
  if (!role) return [];
  if (role === "super_admin") return ROLE_PERMISSIONS["super_admin"];

  const rolePerms = ROLE_PERMISSIONS[role as CompanyRole] || [];
  const customPerms = customPermissions || [];
  return [...new Set([...rolePerms, ...customPerms])];
}

function hasPermission(role: UserRole | null, permission: Permission, customPermissions?: Permission[]): boolean {
  if (role === "super_admin") return true;
  return getEffectivePermissions(role, customPermissions).includes(permission);
}

function hasAnyPermission(role: UserRole | null, permissions: Permission[], customPermissions?: Permission[]): boolean {
  if (role === "super_admin") return true;
  const effectivePerms = getEffectivePermissions(role, customPermissions);
  return permissions.some((p) => effectivePerms.includes(p));
}

function hasAllPermissions(role: UserRole | null, permissions: Permission[], customPermissions?: Permission[]): boolean {
  if (role === "super_admin") return true;
  const effectivePerms = getEffectivePermissions(role, customPermissions);
  return permissions.every((p) => effectivePerms.includes(p));
}

// ---------------------------------------------------------------------------

describe("ROLE_PERMISSIONS structure", () => {
  const roles: UserRole[] = ["super_admin", "company_admin", "manager", "employee"];

  it("defines permissions for all 4 roles", () => {
    for (const role of roles) {
      expect(ROLE_PERMISSIONS[role]).toBeDefined();
      expect(Array.isArray(ROLE_PERMISSIONS[role])).toBe(true);
      expect(ROLE_PERMISSIONS[role].length).toBeGreaterThan(0);
    }
  });

  it("super_admin has the most permissions", () => {
    const superCount = ROLE_PERMISSIONS["super_admin"].length;
    const adminCount = ROLE_PERMISSIONS["company_admin"].length;
    const managerCount = ROLE_PERMISSIONS["manager"].length;
    const employeeCount = ROLE_PERMISSIONS["employee"].length;

    expect(superCount).toBeGreaterThanOrEqual(adminCount);
    expect(adminCount).toBeGreaterThanOrEqual(managerCount);
    expect(managerCount).toBeGreaterThanOrEqual(employeeCount);
  });

  it("employee has limited permissions", () => {
    const perms = ROLE_PERMISSIONS["employee"];
    expect(perms).toContain("incidents.view_own");
    expect(perms).toContain("incidents.create");
    expect(perms).not.toContain("incidents.delete");
    expect(perms).not.toContain("users.create");
    expect(perms).not.toContain("settings.edit");
  });

  it("manager can view team but not delete incidents", () => {
    const perms = ROLE_PERMISSIONS["manager"];
    expect(perms).toContain("incidents.view_team");
    expect(perms).toContain("incidents.assign");
    expect(perms).not.toContain("incidents.delete");
  });

  it("company_admin can manage settings and users", () => {
    const perms = ROLE_PERMISSIONS["company_admin"];
    expect(perms).toContain("settings.edit");
    expect(perms).toContain("settings.billing");
    expect(perms).toContain("users.manage_roles");
    expect(perms).toContain("incidents.delete");
  });
});

describe("getEffectivePermissions", () => {
  it("returns empty for null role", () => {
    expect(getEffectivePermissions(null)).toEqual([]);
  });

  it("returns role permissions for employee", () => {
    const perms = getEffectivePermissions("employee");
    expect(perms).toContain("incidents.view_own");
    expect(perms).toContain("incidents.create");
  });

  it("merges custom permissions with role permissions", () => {
    const perms = getEffectivePermissions("employee", ["reports.export" as Permission]);
    expect(perms).toContain("incidents.view_own"); // from role
    expect(perms).toContain("reports.export"); // custom
  });

  it("deduplicates permissions", () => {
    // incidents.view_own is already in employee role
    const perms = getEffectivePermissions("employee", ["incidents.view_own" as Permission]);
    const viewOwnCount = perms.filter((p) => p === "incidents.view_own").length;
    expect(viewOwnCount).toBe(1);
  });

  it("returns all super_admin permissions", () => {
    const perms = getEffectivePermissions("super_admin");
    expect(perms).toEqual(ROLE_PERMISSIONS["super_admin"]);
  });
});

describe("hasPermission", () => {
  it("super_admin always returns true", () => {
    expect(hasPermission("super_admin", "incidents.delete")).toBe(true);
    expect(hasPermission("super_admin", "settings.billing")).toBe(true);
  });

  it("employee can create incidents", () => {
    expect(hasPermission("employee", "incidents.create")).toBe(true);
  });

  it("employee cannot delete incidents", () => {
    expect(hasPermission("employee", "incidents.delete")).toBe(false);
  });

  it("null role has no permissions", () => {
    expect(hasPermission(null, "incidents.view_own")).toBe(false);
  });

  it("custom permissions grant access", () => {
    expect(hasPermission("employee", "reports.export", ["reports.export" as Permission])).toBe(true);
  });
});

describe("hasAnyPermission", () => {
  it("super_admin always returns true", () => {
    expect(hasAnyPermission("super_admin", ["settings.billing", "users.delete"])).toBe(true);
  });

  it("employee has at least one of view_own or delete", () => {
    expect(hasAnyPermission("employee", ["incidents.view_own", "incidents.delete"])).toBe(true);
  });

  it("employee has none of admin-only perms", () => {
    expect(hasAnyPermission("employee", ["users.create", "settings.edit"])).toBe(false);
  });

  it("returns false for empty permissions array", () => {
    expect(hasAnyPermission("employee", [])).toBe(false);
  });
});

describe("hasAllPermissions", () => {
  it("super_admin always returns true", () => {
    expect(hasAllPermissions("super_admin", ["settings.billing", "users.delete"])).toBe(true);
  });

  it("employee has all basic permissions", () => {
    expect(hasAllPermissions("employee", ["incidents.view_own", "incidents.create"])).toBe(true);
  });

  it("employee does NOT have all mixed permissions", () => {
    expect(hasAllPermissions("employee", ["incidents.view_own", "incidents.delete"])).toBe(false);
  });

  it("returns true for empty permissions array", () => {
    expect(hasAllPermissions("employee", [])).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Role checks (simple boolean logic from the hook)
// ---------------------------------------------------------------------------

describe("role checks", () => {
  function getRoleFlags(role: UserRole | null) {
    return {
      isSuperAdmin: role === "super_admin",
      isCompanyAdmin: role === "company_admin",
      isManager: role === "manager",
      isEmployee: role === "employee",
    };
  }

  it("identifies super_admin", () => {
    const flags = getRoleFlags("super_admin");
    expect(flags.isSuperAdmin).toBe(true);
    expect(flags.isCompanyAdmin).toBe(false);
  });

  it("identifies company_admin", () => {
    const flags = getRoleFlags("company_admin");
    expect(flags.isCompanyAdmin).toBe(true);
    expect(flags.isSuperAdmin).toBe(false);
  });

  it("identifies manager", () => {
    const flags = getRoleFlags("manager");
    expect(flags.isManager).toBe(true);
  });

  it("identifies employee", () => {
    const flags = getRoleFlags("employee");
    expect(flags.isEmployee).toBe(true);
  });

  it("returns all false for null", () => {
    const flags = getRoleFlags(null);
    expect(Object.values(flags).every((v) => v === false)).toBe(true);
  });
});
