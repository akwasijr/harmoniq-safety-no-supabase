"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  ArrowUp, ArrowDown, Eye, EyeOff, Pencil, LayoutDashboard,
  AlertTriangle, ClipboardCheck, LibraryBig, FileKey, BarChart3,
  FileText, GraduationCap, Leaf, ClipboardList, Package, MapPin,
  Users, Settings,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useCompanyStore } from "@/stores/company-store";
import {
  getSidebarPreferences,
  saveSidebarPreferences,
  type SidebarPreferences,
} from "@/lib/sidebar-preferences";
import { useToast } from "@/components/ui/toast";

// Mirror the sidebar structure exactly
interface PreviewItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  moduleId?: string;
}

interface PreviewGroup {
  label: string;
  groupId: string;
  items: PreviewItem[];
}

const SIDEBAR_GROUPS: PreviewGroup[] = [
  {
    label: "Operations", groupId: "operations",
    items: [
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { title: "Incidents", href: "/dashboard/incidents", icon: AlertTriangle },
      { title: "Assessments & Checklists", href: "/dashboard/checklists", icon: ClipboardCheck },
      { title: "Template Library", href: "/dashboard/checklists/my-templates", icon: LibraryBig },
      { title: "Permits to Work", href: "/dashboard/permits", icon: FileKey, moduleId: "permits" },
    ],
  },
  {
    label: "Reporting", groupId: "reporting",
    items: [
      { title: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
      { title: "Documents", href: "/dashboard/content", icon: FileText },
    ],
  },
  {
    label: "Management", groupId: "management",
    items: [
      { title: "Training & Competency", href: "/dashboard/training", icon: GraduationCap, moduleId: "training" },
      { title: "Environment", href: "/dashboard/environment", icon: Leaf, moduleId: "environment" },
      { title: "Compliance", href: "/dashboard/compliance", icon: ClipboardList, moduleId: "compliance" },
    ],
  },
  {
    label: "Admin", groupId: "admin",
    items: [
      { title: "Asset Management", href: "/dashboard/assets", icon: Package },
      { title: "Locations", href: "/dashboard/locations", icon: MapPin },
      { title: "Users & Teams", href: "/dashboard/users", icon: Users },
      { title: "Settings", href: "/dashboard/settings", icon: Settings },
    ],
  },
];

export function SidebarEditorSection() {
  const { user, currentCompany } = useAuth();
  const { update: updateCompany } = useCompanyStore();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = React.useState(false);
  const [prefs, setPrefs] = React.useState<SidebarPreferences>({
    hiddenModules: [],
    groupOrder: SIDEBAR_GROUPS.map((g) => g.groupId),
    itemOrder: {},
  });

  const companyHidden = currentCompany?.hidden_modules || [];

  React.useEffect(() => {
    if (user?.id) setPrefs(getSidebarPreferences(user.id));
  }, [user?.id]);

  const save = (update: Partial<SidebarPreferences>) => {
    if (!user?.id) return;
    const next = { ...prefs, ...update };
    setPrefs(next);
    saveSidebarPreferences(user.id, next);
  };

  const allHidden = [...companyHidden, ...prefs.hiddenModules];

  const isModuleHidden = (moduleId: string) => allHidden.includes(moduleId);
  const isCompanyDisabled = (moduleId: string) => companyHidden.includes(moduleId);

  const toggleModule = (moduleId: string) => {
    // If company-level disabled, admin needs to toggle company setting
    if (isCompanyDisabled(moduleId)) {
      const updated = companyHidden.filter((m) => m !== moduleId);
      if (currentCompany) updateCompany(currentCompany.id, { hidden_modules: updated });
      toast("Module enabled for all users");
      return;
    }
    // Otherwise toggle user-level
    if (prefs.hiddenModules.includes(moduleId)) {
      save({ hiddenModules: prefs.hiddenModules.filter((m) => m !== moduleId) });
    } else {
      save({ hiddenModules: [...prefs.hiddenModules, moduleId] });
    }
    toast("Sidebar updated");
  };

  const toggleCompanyModule = (moduleId: string) => {
    if (!currentCompany) return;
    const updated = companyHidden.includes(moduleId)
      ? companyHidden.filter((m) => m !== moduleId)
      : [...companyHidden, moduleId];
    updateCompany(currentCompany.id, { hidden_modules: updated });
    toast(companyHidden.includes(moduleId) ? "Module enabled for all users" : "Module disabled for all users");
  };

  const moveGroup = (idx: number, dir: -1 | 1) => {
    const order = [...prefs.groupOrder];
    const target = idx + dir;
    if (target < 0 || target >= order.length) return;
    [order[idx], order[target]] = [order[target], order[idx]];
    save({ groupOrder: order });
  };

  const moveItem = (groupId: string, items: PreviewItem[], idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= items.length) return;
    const ordered = items.map((i) => i.href);
    [ordered[idx], ordered[target]] = [ordered[target], ordered[idx]];
    save({ itemOrder: { ...prefs.itemOrder, [groupId]: ordered } });
  };

  // Apply ordering for groups and items within groups
  const orderedGroups = React.useMemo(() => {
    const sorted = SIDEBAR_GROUPS.map((g) => {
      const itemOrder = prefs.itemOrder?.[g.groupId];
      if (!itemOrder?.length) return g;
      const orderedItems = [...g.items].sort((a, b) => {
        const ai = itemOrder.indexOf(a.href);
        const bi = itemOrder.indexOf(b.href);
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      });
      return { ...g, items: orderedItems };
    });
    if (prefs.groupOrder.length) {
      sorted.sort((a, b) => {
        const ai = prefs.groupOrder.indexOf(a.groupId);
        const bi = prefs.groupOrder.indexOf(b.groupId);
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      });
    }
    return sorted;
  }, [prefs.groupOrder]);

  const { isCompanyAdmin, isSuperAdmin } = useAuth();
  const canEditCompany = isCompanyAdmin || isSuperAdmin;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Sidebar Layout</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {isEditing ? "Drag groups to reorder, toggle modules on/off." : "Preview of your current sidebar. Click Edit to customize."}
              </p>
            </div>
            <Button size="sm" variant={isEditing ? "default" : "outline"} className="gap-2" onClick={() => setIsEditing(!isEditing)}>
              <Pencil className="h-3.5 w-3.5" />{isEditing ? "Done" : "Edit"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Visual sidebar preview */}
          <div className="mx-auto max-w-sm rounded-xl border bg-card overflow-hidden">
            {/* Sidebar header */}
            <div className="px-4 py-3 border-b bg-muted/30">
              <p className="text-sm font-semibold">{currentCompany?.name || "Company"}</p>
              <p className="text-xs text-muted-foreground">{user?.full_name || "User"}</p>
            </div>

            {/* Nav groups */}
            <div className="p-2 space-y-1">
              {orderedGroups.map((group, groupIdx) => {
                const visibleItems = group.items.filter((item) => !item.moduleId || !isModuleHidden(item.moduleId));
                const hasHiddenItems = group.items.some((item) => item.moduleId && isModuleHidden(item.moduleId));
                if (!isEditing && visibleItems.length === 0) return null;

                return (
                  <div key={group.groupId} className="py-1">
                    {/* Group header */}
                    <div className="flex items-center gap-2 px-2 py-1">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex-1">{group.label}</span>
                      {isEditing && (
                        <div className="flex items-center gap-0.5">
                          <button type="button" onClick={() => moveGroup(groupIdx, -1)} disabled={groupIdx === 0} className="p-0.5 rounded hover:bg-muted disabled:opacity-20"><ArrowUp className="h-3 w-3" /></button>
                          <button type="button" onClick={() => moveGroup(groupIdx, 1)} disabled={groupIdx === orderedGroups.length - 1} className="p-0.5 rounded hover:bg-muted disabled:opacity-20"><ArrowDown className="h-3 w-3" /></button>
                        </div>
                      )}
                      {!isEditing && hasHiddenItems && <Badge variant="secondary" className="text-[8px] px-1 py-0">hidden items</Badge>}
                    </div>

                    {/* Items */}
                    {(isEditing ? group.items : visibleItems).map((item, itemIdx) => {
                      const hidden = item.moduleId ? isModuleHidden(item.moduleId) : false;
                      const companyLevel = item.moduleId ? isCompanyDisabled(item.moduleId) : false;
                      const itemList = isEditing ? group.items : visibleItems;

                      return (
                        <div
                          key={item.href}
                          className={cn(
                            "flex items-center gap-2.5 rounded-md px-3 py-1.5 text-xs transition-colors",
                            hidden ? "opacity-40" : "hover:bg-muted/50",
                          )}
                        >
                          <item.icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span className={cn("flex-1 truncate", hidden && "line-through")}>{item.title}</span>
                          {isEditing && (
                            <div className="flex items-center gap-1 shrink-0">
                              {/* Item reorder */}
                              <button type="button" onClick={() => moveItem(group.groupId, itemList, itemIdx, -1)} disabled={itemIdx === 0} className="p-0.5 rounded hover:bg-muted disabled:opacity-20"><ArrowUp className="h-2.5 w-2.5" /></button>
                              <button type="button" onClick={() => moveItem(group.groupId, itemList, itemIdx, 1)} disabled={itemIdx === itemList.length - 1} className="p-0.5 rounded hover:bg-muted disabled:opacity-20"><ArrowDown className="h-2.5 w-2.5" /></button>
                              {/* Module toggle */}
                              {item.moduleId && (
                                <>
                                  {companyLevel && canEditCompany && (
                                    <Badge variant="outline" className="text-[8px] px-1 py-0 cursor-pointer hover:bg-muted ml-1" onClick={() => toggleCompanyModule(item.moduleId!)}>
                                      All users
                                    </Badge>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => item.moduleId && toggleModule(item.moduleId)}
                                    className={cn("p-1 rounded transition-colors", hidden ? "text-muted-foreground hover:text-foreground" : "text-foreground hover:text-muted-foreground")}
                                    title={hidden ? "Show" : "Hide"}
                                  >
                                    {hidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {isEditing && (
        <div className="flex justify-between">
          <p className="text-xs text-muted-foreground">
            <Eye className="h-3 w-3 inline mr-1" />Visible &nbsp;
            <EyeOff className="h-3 w-3 inline mr-1" />Hidden &nbsp;
            {canEditCompany && <><Badge variant="outline" className="text-[8px] px-1 py-0 inline">All users</Badge> = company-wide</>}
          </p>
          <Button variant="outline" size="sm" onClick={() => {
            save({ hiddenModules: [], groupOrder: SIDEBAR_GROUPS.map((g) => g.groupId), itemOrder: {} });
            toast("Reset to defaults");
          }}>Reset to Defaults</Button>
        </div>
      )}
    </div>
  );
}
