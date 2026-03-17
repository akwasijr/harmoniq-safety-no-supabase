"use client";

import * as React from "react";
import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n";
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
  const { t } = useTranslation();
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
          {t("common.filters")}
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
                    {t("common.clearAll")}
                  </Button>
                )}
                <Button size="sm" onClick={handleApply} className="h-8">
                  {t("common.apply")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Keys for each filter group — values reference filterOptions.{group}.{value} in i18n
const FILTER_OPTION_KEYS = {
  severity: ["low", "medium", "high", "critical"],
  incidentType: ["injury", "near_miss", "hazard", "equipment_failure", "environmental", "fire", "property_damage"],
  incidentStatus: ["new", "in_progress", "in_review", "resolved"],
  ticketStatus: ["open", "in_progress", "resolved", "closed"],
  ticketPriority: ["low", "medium", "high", "urgent"],
  userRole: ["admin", "manager", "supervisor", "employee"],
  userStatus: ["active", "inactive", "pending"],
  assetStatus: ["active", "maintenance", "retired"],
  assetCondition: ["excellent", "good", "fair", "poor"],
  contentType: ["news", "announcement", "alert", "policy", "training"],
  contentStatus: ["draft", "published", "archived"],
  checklistStatus: ["active", "draft", "archived"],
  department: ["operations", "warehouse", "production", "office", "maintenance"],
} as const;

type FilterGroupKey = keyof typeof FILTER_OPTION_KEYS;

function buildFilterOptions(
  t: (key: string) => string,
): Record<FilterGroupKey, FilterOption[]> {
  const result = {} as Record<FilterGroupKey, FilterOption[]>;
  for (const [group, keys] of Object.entries(FILTER_OPTION_KEYS)) {
    result[group as FilterGroupKey] = keys.map((key) => ({
      value: key,
      label: t(`filterOptions.${group}.${key}`),
    }));
  }
  return result;
}

/**
 * Hook that returns translated filter options.
 * Must be called inside a component (uses useTranslation).
 */
export function useFilterOptions() {
  const { t } = useTranslation();
  return React.useMemo(() => buildFilterOptions(t), [t]);
}

/**
 * @deprecated Use `useFilterOptions()` hook instead for translated labels.
 * Kept temporarily so existing non-hook call sites still compile.
 */
export const commonFilterOptions = FILTER_OPTION_KEYS as unknown as Record<
  FilterGroupKey,
  FilterOption[]
>;
