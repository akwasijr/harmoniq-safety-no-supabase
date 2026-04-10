import { describe, it, expect } from "vitest";
import { hasPermission, canAccessTable, getWritableTables } from "@/lib/permissions";

// ---------------------------------------------------------------------------
// hasPermission
// ---------------------------------------------------------------------------

describe("hasPermission", () => {
  describe("super_admin", () => {
    it("can do everything on every resource", () => {
      const resources = [
        "companies", "teams", "incidents", "checklist_templates",
        "checklist_submissions", "risk_evaluations", "corrective_actions",
        "work_orders", "tickets", "notifications",
      ];
      const actions = ["create", "read", "update", "delete"] as const;
      for (const res of resources) {
        for (const act of actions) {
          expect(hasPermission("super_admin", res, act), `super_admin should ${act} ${res}`).toBe(true);
        }
      }
    });
  });

  describe("company_admin", () => {
    it("can CRUD company resources", () => {
      expect(hasPermission("company_admin", "teams", "create")).toBe(true);
      expect(hasPermission("company_admin", "teams", "read")).toBe(true);
      expect(hasPermission("company_admin", "teams", "update")).toBe(true);
      expect(hasPermission("company_admin", "teams", "delete")).toBe(true);
    });

    it("can CRUD incidents", () => {
      expect(hasPermission("company_admin", "incidents", "create")).toBe(true);
      expect(hasPermission("company_admin", "incidents", "delete")).toBe(true);
    });

    it("can CRUD checklist_templates", () => {
      expect(hasPermission("company_admin", "checklist_templates", "create")).toBe(true);
      expect(hasPermission("company_admin", "checklist_templates", "delete")).toBe(true);
    });

    it("can read but not create/delete companies", () => {
      expect(hasPermission("company_admin", "companies", "read")).toBe(true);
      expect(hasPermission("company_admin", "companies", "create")).toBe(false);
      expect(hasPermission("company_admin", "companies", "delete")).toBe(false);
    });
  });

  describe("employee", () => {
    it("can create incidents", () => {
      expect(hasPermission("employee", "incidents", "create")).toBe(true);
    });

    it("can read incidents", () => {
      expect(hasPermission("employee", "incidents", "read")).toBe(true);
    });

    it("cannot create teams", () => {
      expect(hasPermission("employee", "teams", "create")).toBe(false);
    });

    it("cannot update teams", () => {
      expect(hasPermission("employee", "teams", "update")).toBe(false);
    });

    it("can create checklist_submissions", () => {
      expect(hasPermission("employee", "checklist_submissions", "create")).toBe(true);
    });

    it("cannot create checklist_templates", () => {
      expect(hasPermission("employee", "checklist_templates", "create")).toBe(false);
    });

    it("can read checklist_templates", () => {
      expect(hasPermission("employee", "checklist_templates", "read")).toBe(true);
    });

    it("cannot delete incidents", () => {
      expect(hasPermission("employee", "incidents", "delete")).toBe(false);
    });

    it("can create risk_evaluations", () => {
      expect(hasPermission("employee", "risk_evaluations", "create")).toBe(true);
    });
  });

  describe("viewer", () => {
    it("can read any resource", () => {
      expect(hasPermission("viewer", "incidents", "read")).toBe(true);
      expect(hasPermission("viewer", "teams", "read")).toBe(true);
      expect(hasPermission("viewer", "checklist_templates", "read")).toBe(true);
    });

    it("cannot create anything", () => {
      expect(hasPermission("viewer", "incidents", "create")).toBe(false);
      expect(hasPermission("viewer", "teams", "create")).toBe(false);
      expect(hasPermission("viewer", "checklist_submissions", "create")).toBe(false);
    });

    it("cannot update anything", () => {
      expect(hasPermission("viewer", "incidents", "update")).toBe(false);
    });

    it("cannot delete anything", () => {
      expect(hasPermission("viewer", "incidents", "delete")).toBe(false);
    });
  });

  describe("safety_officer", () => {
    it("can create risk_evaluations", () => {
      expect(hasPermission("safety_officer", "risk_evaluations", "create")).toBe(true);
    });

    it("can update risk_evaluations", () => {
      expect(hasPermission("safety_officer", "risk_evaluations", "update")).toBe(true);
    });

    it("can create corrective_actions", () => {
      expect(hasPermission("safety_officer", "corrective_actions", "create")).toBe(true);
    });

    it("can create and update incidents", () => {
      expect(hasPermission("safety_officer", "incidents", "create")).toBe(true);
      expect(hasPermission("safety_officer", "incidents", "update")).toBe(true);
    });

    it("cannot delete teams", () => {
      expect(hasPermission("safety_officer", "teams", "delete")).toBe(false);
    });

    it("can only read teams (not create)", () => {
      expect(hasPermission("safety_officer", "teams", "read")).toBe(true);
      expect(hasPermission("safety_officer", "teams", "create")).toBe(false);
    });
  });

  describe("manager", () => {
    it("can create and update most resources", () => {
      expect(hasPermission("manager", "incidents", "create")).toBe(true);
      expect(hasPermission("manager", "incidents", "update")).toBe(true);
      expect(hasPermission("manager", "teams", "create")).toBe(true);
      expect(hasPermission("manager", "checklist_templates", "create")).toBe(true);
      expect(hasPermission("manager", "work_orders", "create")).toBe(true);
      expect(hasPermission("manager", "tickets", "update")).toBe(true);
    });

    it("cannot delete resources", () => {
      expect(hasPermission("manager", "teams", "delete")).toBe(false);
      expect(hasPermission("manager", "incidents", "delete")).toBe(false);
    });

    it("can only read companies", () => {
      expect(hasPermission("manager", "companies", "read")).toBe(true);
      expect(hasPermission("manager", "companies", "create")).toBe(false);
    });
  });

  describe("unknown role", () => {
    it("returns false for any action", () => {
      expect(hasPermission("ghost", "incidents", "read")).toBe(false);
      expect(hasPermission("", "teams", "create")).toBe(false);
      expect(hasPermission("intern" as unknown as Parameters<typeof hasPermission>[0], "incidents", "create")).toBe(false);
    });
  });

  describe("unknown resource", () => {
    it("returns false for non-existent resource", () => {
      expect(hasPermission("super_admin", "unicorns", "read")).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// canAccessTable
// ---------------------------------------------------------------------------

describe("canAccessTable", () => {
  it("returns true for allowed table+action combos", () => {
    expect(canAccessTable("employee", "incidents", "create")).toBe(true);
    expect(canAccessTable("company_admin", "teams", "delete")).toBe(true);
    expect(canAccessTable("viewer", "incidents", "read")).toBe(true);
  });

  it("returns false for denied combos", () => {
    expect(canAccessTable("employee", "teams", "create")).toBe(false);
    expect(canAccessTable("viewer", "incidents", "create")).toBe(false);
    expect(canAccessTable("viewer", "incidents", "delete")).toBe(false);
    expect(canAccessTable("employee", "checklist_templates", "delete")).toBe(false);
  });

  it("returns false for unknown role", () => {
    expect(canAccessTable("unknown_role", "incidents", "read")).toBe(false);
    expect(canAccessTable("guest" as unknown as Parameters<typeof canAccessTable>[0], "incidents", "read")).toBe(false);
  });

  it("returns false for unknown table", () => {
    expect(canAccessTable("super_admin", "nonexistent_table", "read")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getWritableTables
// ---------------------------------------------------------------------------

describe("getWritableTables", () => {
  it("employee gets limited set including incidents and submissions", () => {
    const tables = getWritableTables("employee");
    expect(tables).toContain("incidents");
    expect(tables).toContain("checklist_submissions");
    expect(tables).toContain("risk_evaluations");
  });

  it("employee does NOT have writable access to teams or templates", () => {
    const tables = getWritableTables("employee");
    expect(tables).not.toContain("teams");
    expect(tables).not.toContain("checklist_templates");
    expect(tables).not.toContain("companies");
    expect(tables).not.toContain("content");
  });

  it("company_admin gets all tables (writable)", () => {
    const tables = getWritableTables("company_admin");
    expect(tables).toContain("teams");
    expect(tables).toContain("locations");
    expect(tables).toContain("incidents");
    expect(tables).toContain("checklist_templates");
    expect(tables).toContain("checklist_submissions");
    expect(tables).toContain("risk_evaluations");
    expect(tables).toContain("corrective_actions");
    expect(tables).toContain("work_orders");
    expect(tables).toContain("content");
    expect(tables).toContain("companies"); // read+update
  });

  it("viewer gets empty array", () => {
    const tables = getWritableTables("viewer");
    expect(tables).toEqual([]);
    expect(tables).toHaveLength(0);
  });

  it("super_admin gets all tables", () => {
    const tables = getWritableTables("super_admin");
    expect(tables.length).toBeGreaterThan(15);
    expect(tables).toContain("companies");
  });

  it("unknown role returns empty array", () => {
    expect(getWritableTables("nonexistent")).toEqual([]);
  });

  it("safety_officer includes risk_evaluations and corrective_actions", () => {
    const tables = getWritableTables("safety_officer");
    expect(tables).toContain("risk_evaluations");
    expect(tables).toContain("corrective_actions");
    expect(tables).toContain("incidents");
  });
});
