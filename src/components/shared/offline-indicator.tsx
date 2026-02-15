"use client";

import * as React from "react";
import { useSync } from "@/hooks/use-sync";
import { Cloud, CloudOff, Check, Loader } from "lucide-react";
import { cn } from "@/lib/utils";

export function OfflineIndicator() {
  const { isOnline, pendingCount, isSyncing } = useSync();

  if (isOnline && pendingCount === 0 && !isSyncing) {
    return null; // Hidden when everything is fine
  }

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 px-4 py-1.5 text-xs font-medium transition-all",
        !isOnline
          ? "bg-destructive text-destructive-foreground"
          : isSyncing
          ? "bg-primary text-primary-foreground"
          : pendingCount > 0
          ? "bg-warning text-warning-foreground"
          : "bg-success text-success-foreground"
      )}
    >
      {!isOnline ? (
        <>
          <CloudOff className="h-3.5 w-3.5" />
          <span>You are offline</span>
        </>
      ) : isSyncing ? (
        <>
          <Loader className="h-3.5 w-3.5 animate-spin" />
          <span>Syncing...</span>
        </>
      ) : pendingCount > 0 ? (
        <>
          <Cloud className="h-3.5 w-3.5" />
          <span>{pendingCount} item{pendingCount !== 1 ? "s" : ""} pending sync</span>
        </>
      ) : (
        <>
          <Check className="h-3.5 w-3.5" />
          <span>All synced</span>
        </>
      )}
    </div>
  );
}
