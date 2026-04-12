"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowUp, ArrowDown, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  getSidebarPreferences,
  saveSidebarPreferences,
  type SidebarPreferences,
} from "@/lib/sidebar-preferences";
import { useToast } from "@/components/ui/toast";

const MODULE_LABELS: Record<string, string> = {
  permits: "Permits to Work",
  training: "Training & Competency",
  environment: "Environment",
  compliance: "Compliance",
};

const DEFAULT_GROUP_ORDER = ["operations", "reporting", "management", "admin"];
const GROUP_LABELS: Record<string, string> = {
  operations: "Operations",
  reporting: "Reporting",
  management: "Management",
  admin: "Admin",
};

export function SidebarPreferencesSection() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [prefs, setPrefs] = React.useState<SidebarPreferences>({
    hiddenModules: [],
    groupOrder: DEFAULT_GROUP_ORDER,
    itemOrder: {},
  });

  React.useEffect(() => {
    if (user?.id) setPrefs(getSidebarPreferences(user.id));
  }, [user?.id]);

  const save = (update: Partial<SidebarPreferences>) => {
    if (!user?.id) return;
    const next = { ...prefs, ...update };
    setPrefs(next);
    saveSidebarPreferences(user.id, next);
    toast("Sidebar preferences saved");
  };

  const toggleModule = (moduleId: string) => {
    const hidden = prefs.hiddenModules.includes(moduleId)
      ? prefs.hiddenModules.filter((m) => m !== moduleId)
      : [...prefs.hiddenModules, moduleId];
    save({ hiddenModules: hidden });
  };

  const moveGroup = (idx: number, dir: -1 | 1) => {
    const order = [...prefs.groupOrder];
    const target = idx + dir;
    if (target < 0 || target >= order.length) return;
    [order[idx], order[target]] = [order[target], order[idx]];
    save({ groupOrder: order });
  };

  return (
    <div className="space-y-6">
      {/* Group order */}
      <Card>
        <CardHeader>
          <CardTitle>Sidebar Group Order</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Reorder sidebar groups to match your workflow. This only affects your view.
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {prefs.groupOrder.map((groupId, idx) => (
            <div key={groupId} className="flex items-center gap-3 rounded-lg border p-3">
              <span className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold bg-muted text-muted-foreground">{idx + 1}</span>
              <span className="flex-1 text-sm font-medium">{GROUP_LABELS[groupId] || groupId}</span>
              <div className="flex gap-1 shrink-0">
                <button type="button" onClick={() => moveGroup(idx, -1)} disabled={idx === 0} className="p-1.5 rounded hover:bg-muted disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5" /></button>
                <button type="button" onClick={() => moveGroup(idx, 1)} disabled={idx === prefs.groupOrder.length - 1} className="p-1.5 rounded hover:bg-muted disabled:opacity-30"><ArrowDown className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Module visibility */}
      <Card>
        <CardHeader>
          <CardTitle>Hide Modules</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Hide modules you don&apos;t use. This only affects your sidebar — other users are unaffected.
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {Object.entries(MODULE_LABELS).map(([id, label]) => {
            const hidden = prefs.hiddenModules.includes(id);
            return (
              <div key={id} className={cn("flex items-center gap-3 rounded-lg border p-3 transition-colors", hidden && "opacity-50")}>
                {hidden ? <EyeOff className="h-4 w-4 text-muted-foreground shrink-0" /> : <Eye className="h-4 w-4 text-foreground shrink-0" />}
                <span className="flex-1 text-sm font-medium">{label}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={!hidden}
                  onClick={() => toggleModule(id)}
                  className={cn("relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent transition-colors", !hidden ? "bg-primary" : "bg-input")}
                >
                  <span className={cn("pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm transition-transform", !hidden ? "translate-x-5" : "translate-x-0.5")} />
                </button>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Reset */}
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => save({ hiddenModules: [], groupOrder: DEFAULT_GROUP_ORDER, itemOrder: {} })}>
          Reset to Defaults
        </Button>
      </div>
    </div>
  );
}
