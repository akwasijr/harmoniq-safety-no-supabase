"use client";

import * as React from "react";
import { Search, Filter, RefreshCw, Inbox, Plus, WifiOff, FileX } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  /** Compact mode for inline use in cards */
  compact?: boolean;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "py-6" : "py-12",
        className
      )}
    >
      {Icon && (
        <div className={cn(
          "flex items-center justify-center rounded-full bg-muted",
          compact ? "h-12 w-12" : "h-16 w-16"
        )}>
          <Icon className={cn(
            "text-muted-foreground",
            compact ? "h-6 w-6" : "h-8 w-8"
          )} aria-hidden="true" />
        </div>
      )}
      <h3 className={cn("font-semibold", compact ? "mt-3 text-sm" : "mt-4 text-lg")}>{title}</h3>
      {description && (
        <p className={cn(
          "text-muted-foreground",
          compact ? "mt-1 max-w-xs text-xs" : "mt-2 max-w-sm text-sm"
        )}>
          {description}
        </p>
      )}
      {action && <div className={compact ? "mt-3" : "mt-6"}>{action}</div>}
    </div>
  );
}

// Pre-configured empty state for filtered results
export function NoResultsEmptyState({ 
  onClearFilters,
  hasFilters = true,
}: { 
  onClearFilters?: () => void;
  hasFilters?: boolean;
}) {
  return (
    <EmptyState
      icon={hasFilters ? Filter : Search}
      title="No results found"
      description={hasFilters 
        ? "Try adjusting your search or filter criteria to find what you're looking for."
        : "No items match your search. Try a different search term."
      }
      action={hasFilters && onClearFilters && (
        <Button variant="outline" size="sm" onClick={onClearFilters} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Clear filters
        </Button>
      )}
    />
  );
}

// Empty collection — "No X yet" pattern
export function NoDataEmptyState({
  entityName,
  onAdd,
  addLabel,
}: {
  entityName: string;
  onAdd?: () => void;
  addLabel?: string;
}) {
  return (
    <EmptyState
      icon={Inbox}
      title={`No ${entityName} yet`}
      description={`${entityName.charAt(0).toUpperCase() + entityName.slice(1)} will appear here once created.`}
      action={onAdd && (
        <Button size="sm" onClick={onAdd} className="gap-2">
          <Plus className="h-4 w-4" />
          {addLabel || `Add ${entityName}`}
        </Button>
      )}
    />
  );
}

// Offline empty state
export function OfflineEmptyState({ onRetry }: { onRetry?: () => void }) {
  return (
    <EmptyState
      icon={WifiOff}
      title="You're offline"
      description="This content isn't available offline. Connect to the internet and try again."
      action={onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Retry
        </Button>
      )}
    />
  );
}

// Data load failure — inline card variant
export function LoadFailedEmptyState({ onRetry }: { onRetry?: () => void }) {
  return (
    <EmptyState
      icon={FileX}
      title="Failed to load data"
      description="Something went wrong while fetching the data. Please try again."
      compact
      action={onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="gap-2">
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </Button>
      )}
    />
  );
}

