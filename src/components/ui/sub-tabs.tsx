"use client";

import * as React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SubTab {
  id: string;
  label: string;
  icon?: LucideIcon;
  count?: number;
}

interface SubTabsControlledProps {
  tabs: SubTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
  size?: "sm" | "md";
}

interface SubTabsUncontrolledProps {
  tabs: SubTab[];
  defaultTab?: string;
  className?: string;
  size?: "sm" | "md";
  children: (activeTab: string) => React.ReactNode;
}

type SubTabsProps = SubTabsControlledProps | SubTabsUncontrolledProps;

function isControlled(props: SubTabsProps): props is SubTabsControlledProps {
  return "activeTab" in props && typeof props.activeTab === "string";
}

/**
 * Pill/segmented tab variant for nested (2nd-level) tab contexts.
 * Use DetailTabs for top-level page tabs and SubTabs for sub-sections.
 */
export function SubTabs(props: SubTabsProps) {
  const { tabs, className, size = "md" } = props;

  const [internalTab, setInternalTab] = React.useState(
    isControlled(props) ? props.activeTab : (props.defaultTab ?? tabs[0]?.id ?? "")
  );

  const activeTab = isControlled(props) ? props.activeTab : internalTab;
  const onTabChange = isControlled(props) ? props.onTabChange : setInternalTab;

  return (
    <div className={cn("space-y-4", className)}>
      <div
        className="inline-flex items-center gap-1 rounded-lg bg-muted p-1"
        role="tablist"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md font-medium transition-all",
                size === "sm"
                  ? "px-2.5 py-1 text-xs"
                  : "px-3 py-1.5 text-sm",
                isActive
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {Icon && <Icon className={cn("shrink-0", size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5")} aria-hidden="true" />}
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className={cn(
                  "rounded-full font-medium",
                  size === "sm" ? "ml-0.5 px-1.5 py-0.5 text-[10px]" : "ml-1 px-2 py-0.5 text-xs",
                  isActive ? "bg-primary/10 text-primary" : "bg-muted-foreground/10"
                )}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {!isControlled(props) && typeof props.children === "function"
        ? props.children(activeTab)
        : null}
    </div>
  );
}
