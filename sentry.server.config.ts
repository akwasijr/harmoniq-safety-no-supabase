import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Only enable in production
  enabled: process.env.NODE_ENV === "production",

  // Sample 10% of transactions for performance monitoring
  tracesSampleRate: 0.1,

  // Sample 100% of errors
  sampleRate: 1.0,

  // Don't send PII
  sendDefaultPii: false,

  // Tag with environment
  environment: process.env.NODE_ENV,
});
