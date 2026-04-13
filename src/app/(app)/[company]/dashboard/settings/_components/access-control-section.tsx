"use client";

import * as React from "react";
import { Check, X, Info, RotateCcw, ChevronDown, Pencil, Save, ShieldAlert, ClipboardCheck, FileText, UserCog, Wrench, AlertTriangle, Eye, Briefcase, HardHat, User, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AccessControlSectionProps {
  t: (key: string) => string;
}

type RoleId = "super_admin" | "company_admin" | "manager" | "safety_officer" | "employee" | "viewer";

interface RoleColumn {
  id: RoleId;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface PermissionRow {
  id: string;
  label: string;
}

interface PermissionGroup {
  category: string;
  icon: React.ComponentType<{ className?: string }>;
  permissions: PermissionRow[];
}

const ROLES: RoleColumn[] = [
  { id: "company_admin", label: "Company Admin", shortLabel: "Admin", icon: ShieldCheck },
  { id: "manager", label: "Manager", shortLabel: "Manager", icon: Briefcase },
  { id: "safety_officer", label: "Safety Officer", shortLabel: "Officer", icon: HardHat },
  { id: "employee", label: "Employee", shortLabel: "Employee", icon: User },
  { id: "viewer", label: "Viewer", shortLabel: "Viewer", icon: Eye },
];

const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    category: "Incidents",
    icon: AlertTriangle,
    permissions: [
      { id: "incidents.view_own", label: "View own incidents" },
      { id: "incidents.view_team", label: "View team incidents" },
      { id: "incidents.view_all", label: "View all incidents" },
      { id: "incidents.create", label: "Create incidents" },
      { id: "incidents.edit_own", label: "Edit own incidents" },
      { id: "incidents.edit_all", label: "Edit all incidents" },
      { id: "incidents.delete", label: "Delete incidents" },
      { id: "incidents.assign", label: "Assign incidents" },
      { id: "incidents.investigate", label: "Investigate incidents" },
    ],
  },
  {
    category: "Checklists & Procedures",
    icon: ClipboardCheck,
    permissions: [
      { id: "checklists.view", label: "View checklists" },
      { id: "checklists.complete", label: "Complete checklists" },
      { id: "checklists.create_templates", label: "Create templates" },
      { id: "checklists.manage", label: "Manage templates" },
    ],
  },
  {
    category: "Risk Assessments",
    icon: ShieldAlert,
    permissions: [
      { id: "risk_assessments.view", label: "View assessments" },
      { id: "risk_assessments.create", label: "Create assessments" },
      { id: "risk_assessments.edit", label: "Edit assessments" },
    ],
  },
  {
    category: "Reports & Analytics",
    icon: FileText,
    permissions: [
      { id: "reports.view_own", label: "View own reports" },
      { id: "reports.view_team", label: "View team reports" },
      { id: "reports.view_all", label: "View all reports" },
      { id: "reports.export", label: "Export reports" },
    ],
  },
  {
    category: "Users & Teams",
    icon: UserCog,
    permissions: [
      { id: "users.view", label: "View users" },
      { id: "users.create", label: "Create users" },
      { id: "users.edit", label: "Edit users" },
      { id: "users.delete", label: "Delete users" },
      { id: "users.manage_roles", label: "Manage roles" },
      { id: "teams.view", label: "View teams" },
      { id: "teams.manage_members", label: "Manage teams" },
    ],
  },
  {
    category: "Work Orders",
    icon: Wrench,
    permissions: [
      { id: "work_orders.view", label: "View work orders" },
      { id: "work_orders.create", label: "Create work orders" },
      { id: "work_orders.assign", label: "Assign work orders" },
      { id: "work_orders.complete", label: "Complete work orders" },
    ],
  },
  {
    category: "Corrective Actions",
    icon: AlertTriangle,
    permissions: [
      { id: "corrective_actions.view", label: "View actions" },
      { id: "corrective_actions.create", label: "Create actions" },
      { id: "corrective_actions.edit", label: "Edit actions" },
    ],
  },
];

// Default permission matrix: which roles have which permissions
const DEFAULT_MATRIX: Record<string, Record<RoleId, boolean>> = {
  "incidents.view_own":       { super_admin: true, company_admin: true, manager: true, safety_officer: true, employee: true, viewer: true },
  "incidents.view_team":      { super_admin: true, company_admin: true, manager: true, safety_officer: true, employee: false, viewer: false },
  "incidents.view_all":       { super_admin: true, company_admin: true, manager: false, safety_officer: false, employee: false, viewer: true },
  "incidents.create":         { super_admin: true, company_admin: true, manager: true, safety_officer: true, employee: true, viewer: false },
  "incidents.edit_own":       { super_admin: true, company_admin: true, manager: true, safety_officer: true, employee: true, viewer: false },
  "incidents.edit_all":       { super_admin: true, company_admin: true, manager: false, safety_officer: false, employee: false, viewer: false },
  "incidents.delete":         { super_admin: true, company_admin: true, manager: false, safety_officer: false, employee: false, viewer: false },
  "incidents.assign":         { super_admin: true, company_admin: true, manager: true, safety_officer: false, employee: false, viewer: false },
  "incidents.investigate":    { super_admin: true, company_admin: true, manager: true, safety_officer: true, employee: false, viewer: false },
  "checklists.view":          { super_admin: true, company_admin: true, manager: true, safety_officer: true, employee: true, viewer: true },
  "checklists.complete":      { super_admin: true, company_admin: true, manager: true, safety_officer: true, employee: true, viewer: false },
  "checklists.create_templates": { super_admin: true, company_admin: true, manager: true, safety_officer: true, employee: false, viewer: false },
  "checklists.manage":        { super_admin: true, company_admin: true, manager: false, safety_officer: false, employee: false, viewer: false },
  "risk_assessments.view":    { super_admin: true, company_admin: true, manager: true, safety_officer: true, employee: true, viewer: true },
  "risk_assessments.create":  { super_admin: true, company_admin: true, manager: true, safety_officer: true, employee: true, viewer: false },
  "risk_assessments.edit":    { super_admin: true, company_admin: true, manager: true, safety_officer: true, employee: false, viewer: false },
  "reports.view_own":         { super_admin: true, company_admin: true, manager: true, safety_officer: true, employee: true, viewer: true },
  "reports.view_team":        { super_admin: true, company_admin: true, manager: true, safety_officer: false, employee: false, viewer: false },
  "reports.view_all":         { super_admin: true, company_admin: true, manager: false, safety_officer: false, employee: false, viewer: true },
  "reports.export":           { super_admin: true, company_admin: true, manager: true, safety_officer: true, employee: false, viewer: false },
  "users.view":               { super_admin: true, company_admin: true, manager: true, safety_officer: false, employee: false, viewer: false },
  "users.create":             { super_admin: true, company_admin: true, manager: false, safety_officer: false, employee: false, viewer: false },
  "users.edit":               { super_admin: true, company_admin: true, manager: false, safety_officer: false, employee: false, viewer: false },
  "users.delete":             { super_admin: true, company_admin: true, manager: false, safety_officer: false, employee: false, viewer: false },
  "users.manage_roles":       { super_admin: true, company_admin: true, manager: false, safety_officer: false, employee: false, viewer: false },
  "teams.view":               { super_admin: true, company_admin: true, manager: true, safety_officer: true, employee: false, viewer: false },
  "teams.manage_members":     { super_admin: true, company_admin: true, manager: true, safety_officer: false, employee: false, viewer: false },
  "work_orders.view":         { super_admin: true, company_admin: true, manager: true, safety_officer: true, employee: true, viewer: true },
  "work_orders.create":       { super_admin: true, company_admin: true, manager: true, safety_officer: false, employee: false, viewer: false },
  "work_orders.assign":       { super_admin: true, company_admin: true, manager: true, safety_officer: false, employee: false, viewer: false },
  "work_orders.complete":     { super_admin: true, company_admin: true, manager: true, safety_officer: true, employee: true, viewer: false },
  "corrective_actions.view":  { super_admin: true, company_admin: true, manager: true, safety_officer: true, employee: true, viewer: true },
  "corrective_actions.create": { super_admin: true, company_admin: true, manager: true, safety_officer: true, employee: false, viewer: false },
  "corrective_actions.edit":  { super_admin: true, company_admin: true, manager: true, safety_officer: true, employee: false, viewer: false },
};

export function AccessControlSection({ t }: AccessControlSectionProps) {
  const [matrix, setMatrix] = React.useState(DEFAULT_MATRIX);
  const [savedMatrix, setSavedMatrix] = React.useState(DEFAULT_MATRIX);
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});
  const [isEditing, setIsEditing] = React.useState(false);
  const [showSaveModal, setShowSaveModal] = React.useState(false);

  const hasChanges = JSON.stringify(matrix) !== JSON.stringify(savedMatrix);

  const togglePermission = (permId: string, roleId: RoleId) => {
    if (!isEditing) return;
    setMatrix((prev) => ({
      ...prev,
      [permId]: { ...prev[permId], [roleId]: !prev[permId]?.[roleId] },
    }));
  };

  const toggleSection = (category: string) => {
    setCollapsed((prev) => ({ ...prev, [category]: !prev[category] }));
  };

  const handleSave = () => {
    setSavedMatrix(matrix);
    setIsEditing(false);
    setShowSaveModal(false);
    // In production this would persist to company settings via store
  };

  const handleCancel = () => {
    setMatrix(savedMatrix);
    setIsEditing(false);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">Role-Based Access Control</h2>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button variant="ghost" size="sm" onClick={handleCancel}>
                Cancel
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { setMatrix(DEFAULT_MATRIX); }}>
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </Button>
              <Button size="sm" className="gap-1.5" disabled={!hasChanges} onClick={() => setShowSaveModal(true)}>
                <Save className="h-3.5 w-3.5" />
                Save changes
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setIsEditing(true)}>
              <Pencil className="h-3.5 w-3.5" />
              Edit permissions
            </Button>
          )}
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-lg bg-muted/50 p-3">
        <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
        <p className="text-xs text-muted-foreground">
          {isEditing
            ? "You are editing permissions. Click the toggles to change access, then save when done."
            : "Changes to the access matrix define the default permissions for each role. Click \"Edit permissions\" to modify."}
        </p>
      </div>

      {/* Permission matrix */}
      {PERMISSION_GROUPS.map((group) => {
        const GroupIcon = group.icon;
        const isCollapsed = collapsed[group.category] ?? false;
        const grantedCount = group.permissions.reduce((acc, perm) => {
          const granted = ROLES.filter((r) => matrix[perm.id]?.[r.id]).length;
          return acc + granted;
        }, 0);
        const totalCells = group.permissions.length * ROLES.length;
        return (
        <Card key={group.category}>
          <button
            type="button"
            onClick={() => toggleSection(group.category)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors rounded-t-lg"
          >
            <div className="flex items-center gap-2">
              <GroupIcon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <span className="text-sm font-semibold">{group.category}</span>
              <span className="text-[10px] text-muted-foreground">{group.permissions.length} permissions · {grantedCount}/{totalCells} granted</span>
            </div>
            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", isCollapsed && "-rotate-90")} />
          </button>
          {!isCollapsed && (
          <CardContent className="p-0 border-t">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="py-2.5 px-4 text-left font-medium text-muted-foreground w-[220px]">Permission</th>
                    {ROLES.map((role) => {
                      const RoleIcon = role.icon;
                      return (
                      <th key={role.id} className="py-2.5 px-2 text-center w-[90px]">
                        <div className="flex flex-col items-center gap-0.5">
                          <RoleIcon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                          <span className="text-[10px] font-medium text-muted-foreground">{role.shortLabel}</span>
                        </div>
                      </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {group.permissions.map((perm, idx) => (
                    <tr key={perm.id} className={cn("border-b last:border-0", idx % 2 === 0 ? "bg-background" : "bg-muted/10")}>
                      <td className="py-2 px-4 text-sm">{perm.label}</td>
                      {ROLES.map((role) => {
                        const isGranted = matrix[perm.id]?.[role.id] ?? false;
                        return (
                          <td key={role.id} className="py-2 px-2 text-center">
                            {isEditing ? (
                              <button
                                type="button"
                                onClick={() => togglePermission(perm.id, role.id)}
                                className={cn(
                                  "inline-flex h-6 w-6 items-center justify-center rounded-md transition-colors hover:ring-2 hover:ring-ring cursor-pointer",
                                  isGranted
                                    ? "bg-primary/10 text-primary"
                                    : "bg-muted text-muted-foreground/30",
                                )}
                                aria-label={`${perm.label} for ${role.label}: ${isGranted ? "granted" : "denied"}`}
                              >
                                {isGranted ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                              </button>
                            ) : (
                              <span className={cn(
                                "inline-flex h-6 w-6 items-center justify-center rounded-md",
                                isGranted ? "text-primary" : "text-muted-foreground/20",
                              )}>
                                {isGranted ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
          )}
        </Card>
        );
      })}

      {/* Save confirmation modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setShowSaveModal(false)}>
          <div className="bg-background rounded-xl border shadow-2xl max-w-md w-full mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold">Save permission changes?</h3>
                <p className="text-sm text-muted-foreground">This will update access rights for all users in the affected roles.</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Changes take effect immediately. Users currently logged in may need to refresh to see updated permissions.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowSaveModal(false)}>Cancel</Button>
              <Button size="sm" onClick={handleSave}>Confirm & Save</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
