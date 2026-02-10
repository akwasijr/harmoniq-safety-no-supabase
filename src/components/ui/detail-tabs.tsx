"use client";

import * as React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Tab {
  id: string;
  label: string;
  icon?: LucideIcon;
  variant?: "default" | "danger";
  count?: number;
}

// Alias for pages that use TabItem naming
export type TabItem = Tab;

// Controlled variant: caller manages activeTab state
interface DetailTabsControlledProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
  children?: React.ReactNode;
}

// Uncontrolled variant: component manages its own state, renders via children function
interface DetailTabsUncontrolledProps {
  tabs: Tab[];
  defaultTab?: string;
  className?: string;
  children: (activeTab: string) => React.ReactNode;
}

type DetailTabsProps = DetailTabsControlledProps | DetailTabsUncontrolledProps;

function isControlled(props: DetailTabsProps): props is DetailTabsControlledProps {
  return "activeTab" in props && typeof props.activeTab === "string";
}

export function DetailTabs(props: DetailTabsProps) {
  const { tabs, className } = props;

  const [internalTab, setInternalTab] = React.useState(
    isControlled(props) ? props.activeTab : (props.defaultTab ?? tabs[0]?.id ?? "")
  );

  const activeTab = isControlled(props) ? props.activeTab : internalTab;
  const onTabChange = isControlled(props) ? props.onTabChange : setInternalTab;

  return (
    <div className={cn("space-y-6", className)}>
      <div className="border-b overflow-x-auto">
        <nav className="flex gap-1 min-w-max" aria-label="Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const isDanger = tab.variant === "danger";

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "flex items-center gap-2 py-3 px-3 sm:px-4 text-sm font-medium transition-colors relative whitespace-nowrap",
                  isActive
                    ? isDanger
                      ? "text-destructive"
                      : "text-primary"
                    : isDanger
                      ? "text-muted-foreground hover:text-destructive"
                      : "text-muted-foreground hover:text-foreground"
                )}
                aria-current={isActive ? "page" : undefined}
              >
                {Icon && <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />}
                <span className="truncate">{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                    {tab.count}
                  </span>
                )}
                {isActive && (
                  <span
                    className={cn(
                      "absolute bottom-0 left-0 right-0 h-0.5",
                      isDanger ? "bg-destructive" : "bg-primary"
                    )}
                  />
                )}
              </button>
            );
          })}
        </nav>
      </div>
      {!isControlled(props) && typeof props.children === "function"
        ? props.children(activeTab)
        : null}
    </div>
  );
}

// Pre-built tab configurations for common detail pages
export const commonTabs = {
  asset: [
    { id: "info", label: "Information", icon: "Info" },
    { id: "stats", label: "Statistics", icon: "BarChart3" },
    { id: "inspections", label: "Inspections", icon: "ClipboardCheck" },
    { id: "documents", label: "Documents & Media", icon: "FileText" },
    { id: "settings", label: "Settings", icon: "Settings", variant: "danger" as const },
  ],
  location: [
    { id: "info", label: "Information", icon: "Info" },
    { id: "hierarchy", label: "Hierarchy", icon: "Building" },
    { id: "stats", label: "Statistics", icon: "BarChart3" },
    { id: "documents", label: "Documents & Media", icon: "FileText" },
    { id: "settings", label: "Settings", icon: "Settings", variant: "danger" as const },
  ],
  incident: [
    { id: "details", label: "Details", icon: "Info" },
    { id: "timeline", label: "Timeline", icon: "Clock" },
    { id: "actions", label: "Actions", icon: "CheckCircle" },
    { id: "comments", label: "Comments", icon: "MessageSquare" },
    { id: "documents", label: "Documents", icon: "FileText" },
    { id: "settings", label: "Settings", icon: "Settings", variant: "danger" as const },
  ],
  ticket: [
    { id: "details", label: "Details", icon: "Info" },
    { id: "tasks", label: "Tasks", icon: "ListChecks" },
    { id: "comments", label: "Comments", icon: "MessageSquare" },
    { id: "documents", label: "Documents", icon: "FileText" },
    { id: "settings", label: "Settings", icon: "Settings", variant: "danger" as const },
  ],
  content: [
    { id: "details", label: "Details", icon: "Info" },
    { id: "preview", label: "Preview", icon: "Eye" },
    { id: "media", label: "Media", icon: "Image" },
    { id: "analytics", label: "Analytics", icon: "BarChart3" },
    { id: "settings", label: "Settings", icon: "Settings", variant: "danger" as const },
  ],
  checklist: [
    { id: "details", label: "Details", icon: "Info" },
    { id: "items", label: "Checklist Items", icon: "ListChecks" },
    { id: "submissions", label: "Submissions", icon: "FileText" },
    { id: "analytics", label: "Analytics", icon: "BarChart3" },
    { id: "settings", label: "Settings", icon: "Settings", variant: "danger" as const },
  ],
  user: [
    { id: "info", label: "Information", icon: "Info" },
    { id: "activity", label: "Activity", icon: "Activity" },
    { id: "permissions", label: "Permissions", icon: "Shield" },
    { id: "settings", label: "Settings", icon: "Settings", variant: "danger" as const },
  ],
};
