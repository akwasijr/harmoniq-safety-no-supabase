"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ui/error-state";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  // Detect network error (guard navigator for SSR safety)
  const isNetworkError =
    error.message?.includes("fetch") ||
    error.message?.includes("network") ||
    error.message?.includes("Failed to fetch") ||
    (typeof navigator !== "undefined" && !navigator.onLine);

  return (
    <ErrorState
      variant={isNetworkError ? "network" : "generic"}
      onRetry={reset}
      onGoBack={() => (window.location.href = "/")}
      errorDetails={error.message}
    />
  );
}
