"use client";

import { ErrorState } from "@/components/ui/error-state";

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <ErrorState errorDetails={error.message} onRetry={reset} />
    </div>
  );
}
