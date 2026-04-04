/**
 * Lightweight structured logger.
 * - Production: JSON output for log aggregation
 * - Development: human-readable console output
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  requestId?: string;
  userId?: string;
  companyId?: string;
  method?: string;
  path?: string;
  status?: number;
  durationMs?: number;
  [key: string]: unknown;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const MIN_LEVEL = process.env.NODE_ENV === "production" ? "info" : "debug";

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[MIN_LEVEL as LogLevel];
}

function formatLog(level: LogLevel, message: string, context?: LogContext) {
  if (process.env.NODE_ENV === "production") {
    // Structured JSON for log aggregation (Sevalla, Datadog, etc.)
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...context,
    };
    return JSON.stringify(entry);
  }

  // Human-readable for development
  const prefix = `[${level.toUpperCase()}]`;
  const contextStr = context
    ? ` ${Object.entries(context)
        .map(([k, v]) => `${k}=${v}`)
        .join(" ")}`
    : "";
  return `${prefix} ${message}${contextStr}`;
}

function log(level: LogLevel, message: string, context?: LogContext) {
  if (!shouldLog(level)) return;

  const formatted = formatLog(level, message, context);

  switch (level) {
    case "debug":
      console.debug(formatted);
      break;
    case "info":
      console.info(formatted);
      break;
    case "warn":
      console.warn(formatted);
      break;
    case "error":
      console.error(formatted);
      break;
  }
}

export const logger = {
  debug: (message: string, context?: LogContext) => log("debug", message, context),
  info: (message: string, context?: LogContext) => log("info", message, context),
  warn: (message: string, context?: LogContext) => log("warn", message, context),
  error: (message: string, context?: LogContext) => log("error", message, context),
};

/**
 * Log an API request with timing.
 * Usage:
 *   const end = logRequest(request);
 *   // ... handle request ...
 *   end(200);
 */
export function logRequest(request: Request, context?: Partial<LogContext>) {
  const start = Date.now();
  const url = new URL(request.url);

  return (status: number) => {
    logger.info("api_request", {
      method: request.method,
      path: url.pathname,
      status,
      durationMs: Date.now() - start,
      ...context,
    });
  };
}
