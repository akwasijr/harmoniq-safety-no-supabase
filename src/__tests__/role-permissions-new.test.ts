import { describe, it, expect } from "vitest";
import { ROLE_PERMISSIONS } from "@/types";

describe("Updated Role Permissions", () => {
  it("viewer has expanded permissions", () => {
    const viewerPerms = ROLE_PERMISSIONS.viewer;
    expect(viewerPerms).toContain("incidents.view_all");
    expect(viewerPerms).toContain("incidents.create");
    expect(viewerPerms).toContain("reports.view_all");
    expect(viewerPerms).toContain("reports.export");
    expect(viewerPerms).toContain("risk_assessments.view");
  });

  it("viewer cannot manage users or settings", () => {
    const viewerPerms = ROLE_PERMISSIONS.viewer;
    expect(viewerPerms).not.toContain("users.create");
    expect(viewerPerms).not.toContain("users.edit");
    expect(viewerPerms).not.toContain("settings.edit");
  });

  it("safety_officer has all 6 roles defined", () => {
    expect(ROLE_PERMISSIONS.safety_officer).toBeDefined();
    expect(ROLE_PERMISSIONS.safety_officer.length).toBeGreaterThan(0);
  });

  it("all roles are defined", () => {
    const roles = ["super_admin", "company_admin", "manager", "safety_officer", "employee", "viewer"];
    for (const role of roles) {
      expect(ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS]).toBeDefined();
    }
  });
});
