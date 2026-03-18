"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface Tab {
  id: string;
  label: string;
  count?: number;
}

interface TaskDetailTabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (id: string) => void;
}

export function TaskDetailTabs({ tabs, activeTab, onTabChange }: TaskDetailTabsProps) {
  return (
    <div className="px-4 pt-3">
      <div className="flex gap-1 bg-muted rounded-lg p-1" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 text-xs font-medium rounded-md transition-all",
              activeTab === tab.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground",
            )}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="rounded-full bg-primary/10 text-primary px-1.5 py-0.5 text-[10px] font-semibold">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
