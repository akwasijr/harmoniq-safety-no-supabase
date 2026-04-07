"use client";

import { cn } from "@/lib/utils";

import type { SettingsTabConfig, SettingsTabType } from "./settings-types";

interface SettingsTabsProps {
  tabs: SettingsTabConfig[];
  activeTab: SettingsTabType;
  onTabChange: (tab: SettingsTabType) => void;
}

export function SettingsTabs({
  tabs,
  activeTab,
  onTabChange,
}: SettingsTabsProps) {
  return (
    <div className="border-b">
      <div className="flex gap-4 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.value}
              onClick={() => onTabChange(tab.value)}
              className={cn(
                "relative flex items-center gap-2 whitespace-nowrap px-1 py-3 text-sm font-medium transition-colors",
                activeTab === tab.value
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span>{tab.label}</span>
              {activeTab === tab.value && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
