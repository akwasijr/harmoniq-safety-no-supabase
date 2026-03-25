"use client";

import * as React from "react";
import {
  WifiOff,
  ShieldX,
  Clock,
  ServerCrash,
  AlertTriangle,
  RefreshCw,
  ArrowLeft,
  LogIn,
  Wrench,
  FileQuestion,
  Ban,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n";

// ---------- Error variant definitions ----------

export type ErrorVariant =
  | "network"         // No internet / fetch failed
  | "access-denied"   // 403, user doesn't have permission
  | "not-found"       // 404, resource doesn't exist
  | "session-expired" // 401, token expired, need re-login
  | "timeout"         // Request timed out
  | "server-error"    // 500, server-side failure
  | "maintenance"     // Planned downtime
  | "rate-limit"      // 429, too many requests
  | "generic";        // Catch-all

interface ErrorVariantConfig {
  icon: React.ComponentType<{ className?: string }>;
  titleKey: string;
  descriptionKey: string;
  iconColor: string;
  iconBgColor: string;
  primaryActionKey?: string;
  secondaryActionKey?: string;
}

const ERROR_CONFIGS: Record<ErrorVariant, ErrorVariantConfig> = {
  network: {
    icon: WifiOff,
    titleKey: "errors.network",
    descriptionKey: "errors.networkDesc",
    iconColor: "text-orange-500",
    iconBgColor: "bg-orange-100 dark:bg-orange-500/10",
    primaryActionKey: "errors.tryAgain",
  },
  "access-denied": {
    icon: ShieldX,
    titleKey: "errors.permission",
    descriptionKey: "errors.permissionDesc",
    iconColor: "text-destructive",
    iconBgColor: "bg-destructive/10",
    primaryActionKey: "errors.goBack",
  },
  "not-found": {
    icon: FileQuestion,
    titleKey: "errors.notFound",
    descriptionKey: "errors.notFoundDesc",
    iconColor: "text-muted-foreground",
    iconBgColor: "bg-muted",
    primaryActionKey: "errors.goBack",
  },
  "session-expired": {
    icon: Clock,
    titleKey: "errors.sessionExpired",
    descriptionKey: "errors.sessionExpiredDesc",
    iconColor: "text-amber-500",
    iconBgColor: "bg-amber-100 dark:bg-amber-500/10",
    primaryActionKey: "errors.signIn",
  },
  timeout: {
    icon: Clock,
    titleKey: "errors.timeout",
    descriptionKey: "errors.timeoutDesc",
    iconColor: "text-orange-500",
    iconBgColor: "bg-orange-100 dark:bg-orange-500/10",
    primaryActionKey: "errors.tryAgain",
  },
  "server-error": {
    icon: ServerCrash,
    titleKey: "errors.server",
    descriptionKey: "errors.serverDesc",
    iconColor: "text-destructive",
    iconBgColor: "bg-destructive/10",
    primaryActionKey: "errors.tryAgain",
    secondaryActionKey: "errors.goBack",
  },
  maintenance: {
    icon: Wrench,
    titleKey: "errors.maintenance",
    descriptionKey: "errors.maintenanceDesc",
    iconColor: "text-blue-500",
    iconBgColor: "bg-blue-100 dark:bg-blue-500/10",
    primaryActionKey: "errors.refresh",
  },
  "rate-limit": {
    icon: Ban,
    titleKey: "errors.rateLimit",
    descriptionKey: "errors.rateLimitDesc",
    iconColor: "text-amber-500",
    iconBgColor: "bg-amber-100 dark:bg-amber-500/10",
    primaryActionKey: "errors.tryAgain",
  },
  generic: {
    icon: AlertTriangle,
    titleKey: "errors.generic",
    descriptionKey: "errors.genericDesc",
    iconColor: "text-destructive",
    iconBgColor: "bg-destructive/10",
    primaryActionKey: "errors.tryAgain",
    secondaryActionKey: "errors.goBack",
  },
};

// ---------- Props ----------

interface ErrorStateProps {
  variant?: ErrorVariant;
  title?: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  onRetry?: () => void;
  onGoBack?: () => void;
  onSignIn?: () => void;
  retryLabel?: string;
  /** Show compact inline variant instead of full-page */
  inline?: boolean;
  className?: string;
  /** HTTP status code, used to auto-detect variant */
  statusCode?: number;
  /** Show error details in dev mode */
  errorDetails?: string;
}

// Auto-detect variant from HTTP status code
function variantFromStatus(code: number): ErrorVariant {
  if (code === 401) return "session-expired";
  if (code === 403) return "access-denied";
  if (code === 404) return "not-found";
  if (code === 408) return "timeout";
  if (code === 429) return "rate-limit";
  if (code === 503) return "maintenance";
  if (code >= 500) return "server-error";
  return "generic";
}

// ---------- Component ----------

export function ErrorState({
  variant: explicitVariant,
  title,
  description,
  icon: CustomIcon,
  onRetry,
  onGoBack,
  onSignIn,
  retryLabel,
  inline = false,
  className,
  statusCode,
  errorDetails,
}: ErrorStateProps) {
  const { t } = useTranslation();
  const variant = explicitVariant ?? (statusCode ? variantFromStatus(statusCode) : "generic");
  const config = ERROR_CONFIGS[variant];
  const Icon = CustomIcon || config.icon;
  const displayTitle = title || t(config.titleKey);
  const displayDesc = description || t(config.descriptionKey);

  // For session-expired, primary action is "Sign in"
  const handlePrimary = () => {
    if (variant === "session-expired") {
      onSignIn?.() ?? (window.location.href = "/login");
    } else if (variant === "access-denied" || variant === "not-found") {
      onGoBack?.() ?? window.history.back();
    } else {
      onRetry?.() ?? window.location.reload();
    }
  };

  const handleSecondary = () => {
    onGoBack?.() ?? window.history.back();
  };

  const primaryLabel = retryLabel || (config.primaryActionKey ? t(config.primaryActionKey) : t("errors.tryAgain"));
  const PrimaryIcon =
    variant === "session-expired" ? LogIn :
    variant === "access-denied" || variant === "not-found" ? ArrowLeft :
    RefreshCw;

  // Inline variant, smaller, embeddable in cards
  if (inline) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-8 text-center", className)}>
        <div className={cn("flex h-12 w-12 items-center justify-center rounded-full", config.iconBgColor)}>
          <Icon className={cn("h-6 w-6", config.iconColor)} aria-hidden="true" />
        </div>
        <h3 className="mt-3 text-sm font-semibold">{displayTitle}</h3>
        <p className="mt-1 max-w-xs text-xs text-muted-foreground">{displayDesc}</p>
        {(onRetry || config.primaryActionKey) && (
          <Button
            variant="outline"
            size="sm"
            className="mt-4 gap-1.5"
            onClick={handlePrimary}
          >
            <PrimaryIcon className="h-3.5 w-3.5" aria-hidden="true" />
            {primaryLabel}
          </Button>
        )}
      </div>
    );
  }

  // Full-page variant
  return (
    <div
      className={cn(
        "flex min-h-[60vh] flex-col items-center justify-center px-4 py-12 text-center",
        className
      )}
    >
      <div className={cn("flex h-16 w-16 items-center justify-center rounded-full", config.iconBgColor)}>
        <Icon className={cn("h-8 w-8", config.iconColor)} aria-hidden="true" />
      </div>
      <h2 className="mt-5 text-xl font-semibold">{displayTitle}</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground leading-relaxed">
        {displayDesc}
      </p>

      {/* Error details, dev/debug only */}
      {errorDetails && process.env.NODE_ENV === "development" && (
        <details className="mt-4 max-w-md text-left">
          <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
            Error details
          </summary>
          <pre className="mt-2 rounded bg-muted p-3 text-xs overflow-auto max-h-32">
            {errorDetails}
          </pre>
        </details>
      )}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button onClick={handlePrimary} className="gap-2">
          <PrimaryIcon className="h-4 w-4" aria-hidden="true" />
          {primaryLabel}
        </Button>
        {config.secondaryActionKey && (
          <Button variant="outline" onClick={handleSecondary} className="gap-2">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t(config.secondaryActionKey)}
          </Button>
        )}
      </div>
    </div>
  );
}

// ---------- Convenience exports ----------

export function NetworkError(props: Omit<ErrorStateProps, "variant">) {
  return <ErrorState variant="network" {...props} />;
}

export function AccessDenied(props: Omit<ErrorStateProps, "variant">) {
  return <ErrorState variant="access-denied" {...props} />;
}

export function SessionExpired(props: Omit<ErrorStateProps, "variant">) {
  return <ErrorState variant="session-expired" {...props} />;
}

export function ServerError(props: Omit<ErrorStateProps, "variant">) {
  return <ErrorState variant="server-error" {...props} />;
}

export function MaintenancePage(props: Omit<ErrorStateProps, "variant">) {
  return <ErrorState variant="maintenance" {...props} />;
}
