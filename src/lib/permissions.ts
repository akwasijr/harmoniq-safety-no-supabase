/**
 * RBAC Permission System
 *
 * Hierarchy: super_admin > company_admin > manager > safety_officer > employee > viewer
 */

export type Role =
  | "super_admin"
  | "company_admin"
  | "manager"
  | "safety_officer"
  | "employee"
  | "viewer";

export type Action = "create" | "read" | "update" | "delete";

const ALL_RESOURCES = [
  "companies",
  "teams",
  "locations",
  "users",
  "incidents",
  "assets",
  "content",
  "checklist_templates",
  "checklist_submissions",
  "risk_evaluations",
  "corrective_actions",
  "work_orders",
  "tickets",
  "notifications",
  "inspections",
  "parts",
  "asset_inspections",
  "meter_readings",
  "inspection_routes",
  "inspection_rounds",
] as const;

type Resource = (typeof ALL_RESOURCES)[number];

type PermissionMap = Record<Resource, Set<Action>>;

function actions(...a: Action[]): Set<Action> {
  return new Set(a);
}

const crud = actions("create", "read", "update", "delete");
const cru = actions("create", "read", "update");
const cr = actions("create", "read");
const r = actions("read");
const none = actions();

const PERMISSIONS: Record<Role, PermissionMap> = {
  super_admin: Object.fromEntries(ALL_RESOURCES.map((res) => [res, crud])) as PermissionMap,

  company_admin: {
    companies: actions("read", "update"),
    teams: crud,
    locations: crud,
    users: crud,
    incidents: crud,
    assets: crud,
    content: crud,
    checklist_templates: crud,
    checklist_submissions: crud,
    risk_evaluations: crud,
    corrective_actions: crud,
    work_orders: crud,
    tickets: crud,
    notifications: crud,
    inspections: crud,
    parts: crud,
    asset_inspections: crud,
    meter_readings: crud,
    inspection_routes: crud,
    inspection_rounds: crud,
  },

  manager: {
    companies: r,
    teams: cru,
    locations: cru,
    users: cru,
    incidents: cru,
    assets: cru,
    content: cru,
    checklist_templates: cru,
    checklist_submissions: cru,
    risk_evaluations: cru,
    corrective_actions: cru,
    work_orders: cru,
    tickets: cru,
    notifications: cru,
    inspections: cru,
    parts: cru,
    asset_inspections: cru,
    meter_readings: cru,
    inspection_routes: cru,
    inspection_rounds: cru,
  },

  safety_officer: {
    companies: r,
    teams: r,
    locations: r,
    users: r,
    incidents: cru,
    assets: actions("read", "update"),
    content: cru,
    checklist_templates: cru,
    checklist_submissions: cru,
    risk_evaluations: cru,
    corrective_actions: cru,
    work_orders: cru,
    tickets: cru,
    notifications: cr,
    inspections: cru,
    parts: r,
    asset_inspections: cru,
    meter_readings: cru,
    inspection_routes: cru,
    inspection_rounds: cru,
  },

  employee: {
    companies: r,
    teams: r,
    locations: r,
    users: r,
    incidents: cr,
    assets: r,
    content: r,
    checklist_templates: r,
    checklist_submissions: cr,
    risk_evaluations: cr,
    corrective_actions: r,
    work_orders: r,
    tickets: cr,
    notifications: r,
    inspections: r,
    parts: r,
    asset_inspections: cr,
    meter_readings: cr,
    inspection_routes: r,
    inspection_rounds: r,
  },

  viewer: Object.fromEntries(ALL_RESOURCES.map((res) => [res, r])) as PermissionMap,
};

const VALID_ROLES = new Set<string>(Object.keys(PERMISSIONS));

function resolveRole(role: string): Role | null {
  return VALID_ROLES.has(role) ? (role as Role) : null;
}

export function hasPermission(role: string, resource: string, action: Action): boolean {
  const resolved = resolveRole(role);
  if (!resolved) return false;
  const resourcePerms = PERMISSIONS[resolved][resource as Resource];
  if (!resourcePerms) return false;
  return resourcePerms.has(action);
}

export function getWritableTables(role: string): string[] {
  const resolved = resolveRole(role);
  if (!resolved) return [];
  return ALL_RESOURCES.filter((res) => {
    const perms = PERMISSIONS[resolved][res];
    return perms.has("create") || perms.has("update") || perms.has("delete");
  });
}

export function canAccessTable(role: string, table: string, action: Action): boolean {
  return hasPermission(role, table, action);
}
