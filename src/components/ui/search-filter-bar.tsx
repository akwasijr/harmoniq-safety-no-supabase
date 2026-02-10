"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { FilterPanel, FilterField } from "@/components/ui/filter-panel";

interface SearchFilterBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filters: FilterField[];
  dateRange?: string;
  onDateRangeChange?: (value: string, customStart?: string, customEnd?: string) => void;
  showDateRange?: boolean;
  children?: React.ReactNode;
}

export function SearchFilterBar({
  searchQuery,
  onSearchChange,
  searchPlaceholder = "Search...",
  filters,
  dateRange = "last_30_days",
  onDateRangeChange,
  showDateRange = true,
  children,
}: SearchFilterBarProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          placeholder={searchPlaceholder}
          className="pl-10"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <FilterPanel
        filters={filters}
        dateRange={dateRange}
        onDateRangeChange={onDateRangeChange}
        showDateRange={showDateRange}
      >
        {children}
      </FilterPanel>
    </div>
  );
}
