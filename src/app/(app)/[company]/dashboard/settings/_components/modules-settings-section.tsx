"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { FileKey, GraduationCap, Leaf, ClipboardList } from "lucide-react";

const TOGGLEABLE_MODULES = [
  { id: "permits", label: "Permits to Work", description: "Manage hot work, confined space, and other work permits", icon: FileKey },
  { id: "training", label: "Training & Competency", description: "Track worker certifications, training assignments, and expiry dates", icon: GraduationCap },
  { id: "environment", label: "Environment", description: "Waste logs, spill records, and environmental monitoring", icon: Leaf },
  { id: "compliance", label: "Compliance", description: "Regulatory obligations, evidence tracking, and compliance documents", icon: ClipboardList },
];

interface ModulesSettingsSectionProps {
  hiddenModules: string[];
  onChange: (modules: string[]) => void;
}

export function ModulesSettingsSection({ hiddenModules, onChange }: ModulesSettingsSectionProps) {
  const toggle = (moduleId: string) => {
    if (hiddenModules.includes(moduleId)) {
      onChange(hiddenModules.filter((m) => m !== moduleId));
    } else {
      onChange([...hiddenModules, moduleId]);
    }
  };

  const allDisabled = TOGGLEABLE_MODULES.every((m) => hiddenModules.includes(m.id));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active Modules</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Enable or disable optional modules for your organization. Disabled modules are hidden from the sidebar for all users.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {TOGGLEABLE_MODULES.map((mod) => {
          const isActive = !hiddenModules.includes(mod.id);
          return (
            <div key={mod.id} className={cn("flex items-center gap-4 rounded-lg border p-4 transition-colors", isActive ? "bg-card" : "bg-muted/50 opacity-60")}>
              <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", isActive ? "bg-primary/10" : "bg-muted")}>
                <mod.icon className={cn("h-5 w-5", isActive ? "text-primary" : "text-muted-foreground")} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{mod.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{mod.description}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isActive}
                onClick={() => toggle(mod.id)}
                className={cn("relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent transition-colors", isActive ? "bg-primary" : "bg-input")}
              >
                <span className={cn("pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm transition-transform", isActive ? "translate-x-5" : "translate-x-0.5")} />
              </button>
            </div>
          );
        })}
        {allDisabled && (
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">All management modules are disabled. The Management section will be hidden from the sidebar.</p>
        )}
      </CardContent>
    </Card>
  );
}
