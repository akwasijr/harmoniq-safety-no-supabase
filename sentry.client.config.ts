import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Only enable in production
  enabled: process.env.NODE_ENV === "production",

  // Sample 10% of transactions for performance monitoring
  tracesSampleRate: 0.1,

  // Sample 100% of errors
  sampleRate: 1.0,

  // Capture unhandled promise rejections
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      // Capture 0% of sessions, 100% of error sessions
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Session replay: only capture on errors
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,

  // Don't send PII
  sendDefaultPii: false,

  // Filter noisy errors
  ignoreErrors: [
    "ResizeObserver loop",
    "Loading chunk",
    "Network request failed",
    "AbortError",
    "NotAllowedError",
    "Failed to fetch",
    "Load failed",
  ],

  // Tag with environment
  environment: process.env.NODE_ENV,

  // Scrub sensitive data
  beforeSend(event) {
    if (event.request?.cookies) {
      event.request.cookies = {};
    }
    return event;
  },
});
