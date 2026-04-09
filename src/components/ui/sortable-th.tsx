"use client";

import * as React from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type SortDirection = "asc" | "desc" | null;

interface SortableThProps {
  children: React.ReactNode;
  sortKey: string;
  currentSort: string | null;
  currentDirection: SortDirection;
  onSort: (key: string, direction: SortDirection) => void;
  className?: string;
}

export function SortableTh({ children, sortKey, currentSort, currentDirection, onSort, className }: SortableThProps) {
  const isActive = currentSort === sortKey;

  const handleClick = () => {
    if (!isActive) {
      onSort(sortKey, "asc");
    } else if (currentDirection === "asc") {
      onSort(sortKey, "desc");
    } else {
      onSort(sortKey, null);
    }
  };

  return (
    <th
      className={cn("pb-3 font-medium cursor-pointer select-none hover:text-foreground transition-colors", className)}
      onClick={handleClick}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {isActive && currentDirection === "asc" && <ChevronUp className="h-3 w-3" />}
        {isActive && currentDirection === "desc" && <ChevronDown className="h-3 w-3" />}
        {!isActive && <ChevronsUpDown className="h-3 w-3 opacity-30" />}
      </span>
    </th>
  );
}

/** Generic sort helper */
export function sortData<T>(
  data: T[],
  sortKey: string | null,
  direction: SortDirection,
  getValue?: (item: T, key: string) => string | number | null,
): T[] {
  if (!sortKey || !direction) return data;

  return [...data].sort((a, b) => {
    const aVal = getValue ? getValue(a, sortKey) : (a as Record<string, unknown>)[sortKey];
    const bVal = getValue ? getValue(b, sortKey) : (b as Record<string, unknown>)[sortKey];

    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return direction === "asc" ? 1 : -1;
    if (bVal == null) return direction === "asc" ? -1 : 1;

    if (typeof aVal === "string" && typeof bVal === "string") {
      return direction === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }

    const numA = Number(aVal);
    const numB = Number(bVal);
    return direction === "asc" ? numA - numB : numB - numA;
  });
}
