"use client";

import * as React from "react";
import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateRangeDropdown } from "@/components/ui/date-range-dropdown";
import { cn } from "@/lib/utils";

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterField {
  id: string;
  label: string;
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
}

interface FilterPanelProps {
  filters: FilterField[];
  dateRange?: string;
  onDateRangeChange?: (value: string, customStart?: string, customEnd?: string) => void;
  showDateRange?: boolean;
  onApply?: () => void;
  className?: string;
  children?: React.ReactNode;
}

export function FilterPanel({
  filters,
  dateRange = "last_30_days",
  onDateRangeChange,
  showDateRange = true,
  onApply,
  className,
  children,
}: FilterPanelProps) {
  const [showFilters, setShowFilters] = React.useState(false);

  const activeFiltersCount = filters.filter((f) => f.value !== "").length;

  const clearFilters = () => {
    filters.forEach((f) => f.onChange(""));
  };

  const handleApply = () => {
    setShowFilters(false);
    onApply?.();
  };

  return (
    <div className={cn("flex flex-col items-end", className)}>
      {/* Filter Controls */}
      <div className="flex gap-2 flex-shrink-0">
        {showDateRange && onDateRangeChange && (
          <DateRangeDropdown value={dateRange} onChange={onDateRangeChange} />
        )}
        <Button
          variant={showFilters || activeFiltersCount > 0 ? "default" : "outline"}
          size="sm"
          className="gap-2"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="h-4 w-4" />
          Filters
          {activeFiltersCount > 0 && (
            <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary-foreground text-xs font-medium text-primary">
              {activeFiltersCount}
            </span>
          )}
        </Button>
        {children}
      </div>

      {/* Filter Panel - Animated */}
      <div
        className={`grid transition-all duration-300 ease-in-out ${
          showFilters ? "grid-rows-[1fr] opacity-100 mt-4" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              {filters.map((filter) => (
                <select
                  key={filter.id}
                  title={filter.label}
                  aria-label={filter.label}
                  className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                    filter.value ? "border-primary bg-primary/5" : "border-input bg-background"
                  }`}
                  value={filter.value}
                  onChange={(e) => filter.onChange(e.target.value)}
                >
                  <option value="">{filter.label}</option>
                  {filter.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ))}
              <div className="flex items-center gap-2 ml-auto">
                {activeFiltersCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs">
                    Clear all
                  </Button>
                )}
                <Button size="sm" onClick={handleApply} className="h-8">
                  Apply
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Common filter options that can be reused across pages
export const commonFilterOptions = {
  severity: [
    { value: "low", label: "Low" },
    { value: "medium", label: "Medium" },
    { value: "high", label: "High" },
    { value: "critical", label: "Critical" },
  ],
  incidentType: [
    { value: "injury", label: "Injury" },
    { value: "near_miss", label: "Near Miss" },
    { value: "hazard", label: "Hazard" },
    { value: "equipment_failure", label: "Equipment Failure" },
    { value: "environmental", label: "Environmental" },
    { value: "fire", label: "Fire" },
    { value: "property_damage", label: "Property Damage" },
  ],
  incidentStatus: [
    { value: "new", label: "New" },
    { value: "in_progress", label: "In Progress" },
    { value: "in_review", label: "In Review" },
    { value: "resolved", label: "Resolved" },
  ],
  ticketStatus: [
    { value: "open", label: "Open" },
    { value: "in_progress", label: "In Progress" },
    { value: "resolved", label: "Resolved" },
    { value: "closed", label: "Closed" },
  ],
  ticketPriority: [
    { value: "low", label: "Low" },
    { value: "medium", label: "Medium" },
    { value: "high", label: "High" },
    { value: "urgent", label: "Urgent" },
  ],
  userRole: [
    { value: "admin", label: "Admin" },
    { value: "manager", label: "Manager" },
    { value: "supervisor", label: "Supervisor" },
    { value: "employee", label: "Employee" },
  ],
  userStatus: [
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
    { value: "pending", label: "Pending" },
  ],
  assetStatus: [
    { value: "active", label: "Active" },
    { value: "maintenance", label: "Maintenance" },
    { value: "retired", label: "Retired" },
  ],
  assetCondition: [
    { value: "excellent", label: "Excellent" },
    { value: "good", label: "Good" },
    { value: "fair", label: "Fair" },
    { value: "poor", label: "Poor" },
  ],
  contentType: [
    { value: "news", label: "News" },
    { value: "announcement", label: "Announcement" },
    { value: "alert", label: "Alert" },
    { value: "policy", label: "Policy" },
    { value: "training", label: "Training" },
  ],
  contentStatus: [
    { value: "draft", label: "Draft" },
    { value: "published", label: "Published" },
    { value: "archived", label: "Archived" },
  ],
  checklistStatus: [
    { value: "active", label: "Active" },
    { value: "draft", label: "Draft" },
    { value: "archived", label: "Archived" },
  ],
  department: [
    { value: "operations", label: "Operations" },
    { value: "warehouse", label: "Warehouse" },
    { value: "production", label: "Production" },
    { value: "office", label: "Office" },
    { value: "maintenance", label: "Maintenance" },
  ],
};
