import { cn } from "@/lib/utils";
import { AlertCircle, Loader2, RefreshCw, WifiOff } from "lucide-react";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizes = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
};

export function LoadingSpinner({ size = "md", className }: LoadingSpinnerProps) {
  return (
    <Loader2
      className={cn("animate-spin text-muted-foreground", sizes[size], className)}
      aria-hidden="true"
    />
  );
}

interface LoadingPageProps {
  message?: string;
}

export function LoadingPage({ message = "Loading..." }: LoadingPageProps) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
      <div className="flex items-center gap-1.5">
        <div className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

// Skeleton primitives
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      aria-hidden="true"
    />
  );
}

// Home page skeleton
export function HomeSkeleton() {
  return (
    <div className="space-y-4 p-4">
      {/* Hero/greeting area */}
      <div className="relative rounded-xl overflow-hidden">
        <Skeleton className="h-40 w-full rounded-xl" />
        <div className="absolute bottom-4 left-4 space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-7 w-48" />
        </div>
      </div>
      {/* Quick action grid */}
      <div className="grid grid-cols-3 gap-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-2 p-3">
            <Skeleton className="h-12 w-12 rounded-lg" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
      {/* Tip of the day */}
      <Skeleton className="h-16 w-full rounded-lg" />
      {/* News section */}
      <Skeleton className="h-5 w-32" />
      <div className="space-y-3">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="flex gap-3 rounded-lg border p-3">
            <Skeleton className="h-16 w-16 rounded-lg shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Tasks/Checklists skeleton
export function TasksSkeleton() {
  return (
    <div className="space-y-4 p-4">
      {/* Tab bar */}
      <div className="flex gap-2">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-full" />
        ))}
      </div>
      {/* Action button */}
      <Skeleton className="h-14 w-full rounded-xl" />
      {/* List items */}
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg border p-4">
            <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Assets skeleton
export function AssetsSkeleton() {
  return (
    <div className="space-y-4 p-4">
      {/* Tab bar */}
      <div className="flex gap-2">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-full" />
        ))}
      </div>
      {/* Search bar */}
      <Skeleton className="h-10 w-full rounded-lg" />
      {/* Asset cards */}
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg border p-4">
            <Skeleton className="h-12 w-12 rounded-lg shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="h-3 w-1/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// News skeleton
export function NewsSkeleton() {
  return (
    <div className="space-y-4 p-4">
      {/* Tab bar */}
      <div className="flex gap-2">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-full" />
        ))}
      </div>
      {/* News cards */}
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-lg border overflow-hidden">
            <Skeleton className="h-32 w-full" />
            <div className="p-3 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Profile skeleton
export function ProfileSkeleton() {
  return (
    <div className="space-y-4 p-4">
      {/* Avatar + name */}
      <div className="flex flex-col items-center gap-3 py-6">
        <Skeleton className="h-20 w-20 rounded-full" />
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-3 w-24" />
      </div>
      {/* Settings items */}
      <div className="space-y-2">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg border p-4">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-4 w-32" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Error state component
interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  variant?: "generic" | "network" | "not-found" | "permission";
}

export function ErrorState({ 
  title, 
  message, 
  onRetry, 
  variant = "generic" 
}: ErrorStateProps) {
  const configs = {
    generic: {
      icon: AlertCircle,
      defaultTitle: "Something went wrong",
      defaultMessage: "An unexpected error occurred. Please try again.",
      iconColor: "text-red-500",
      iconBg: "bg-red-50 dark:bg-red-950/30",
    },
    network: {
      icon: WifiOff,
      defaultTitle: "Connection issue",
      defaultMessage: "Please check your internet connection and try again.",
      iconColor: "text-amber-500",
      iconBg: "bg-amber-50 dark:bg-amber-950/30",
    },
    "not-found": {
      icon: AlertCircle,
      defaultTitle: "Not found",
      defaultMessage: "The item you're looking for doesn't exist or has been removed.",
      iconColor: "text-muted-foreground",
      iconBg: "bg-muted",
    },
    permission: {
      icon: AlertCircle,
      defaultTitle: "Access denied",
      defaultMessage: "You don't have permission to view this content.",
      iconColor: "text-amber-500",
      iconBg: "bg-amber-50 dark:bg-amber-950/30",
    },
  };

  const config = configs[variant];
  const Icon = config.icon;

  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center gap-4 px-6 text-center">
      <div className={cn("flex h-14 w-14 items-center justify-center rounded-full", config.iconBg)}>
        <Icon className={cn("h-7 w-7", config.iconColor)} aria-hidden="true" />
      </div>
      <div className="space-y-1.5">
        <h3 className="text-base font-semibold">{title || config.defaultTitle}</h3>
        <p className="text-sm text-muted-foreground max-w-xs">{message || config.defaultMessage}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 inline-flex items-center gap-2 rounded-lg border bg-card px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted/50 active:bg-muted"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Try again
        </button>
      )}
    </div>
  );
}
