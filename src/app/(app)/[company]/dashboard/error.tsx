"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ui/error-state";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  const isNetworkError =
    error.message?.includes("fetch") ||
    error.message?.includes("network") ||
    (typeof navigator !== "undefined" && !navigator.onLine);

  return (
    <ErrorState
      variant={isNetworkError ? "network" : "generic"}
      onRetry={reset}
      onGoBack={() => window.history.back()}
      errorDetails={error.message}
    />
  );
}
