import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

function getSupabaseConnectSources() {
  const sources = ["'self'"];
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) return sources.join(" ");

  try {
    const parsed = new URL(supabaseUrl);
    sources.push(parsed.origin);
    sources.push(`${parsed.protocol === "https:" ? "wss:" : "ws:"}//${parsed.host}`);
  } catch (error) {
    console.error("[next.config] Invalid NEXT_PUBLIC_SUPABASE_URL:", error);
  }

  return sources.join(" ");
}

function getSentryConnectSource() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return "";
  try {
    return new URL(dsn).origin;
  } catch {
    return "";
  }
}

const connectSrc = [getSupabaseConnectSources(), getSentryConnectSource()].filter(Boolean).join(" ");

const nextConfig: NextConfig = {
  output: "standalone",
  // Security headers — applied to all routes
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self)",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https:",
              "media-src 'self' blob:",
              `connect-src ${connectSrc}`,
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "object-src 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // Suppress source map upload warnings when SENTRY_AUTH_TOKEN is not set
  silent: !process.env.SENTRY_AUTH_TOKEN,

  // Don't widen the scope of the build process
  disableLogger: true,

  // Upload source maps for better stack traces (requires SENTRY_AUTH_TOKEN)
  widenClientFileUpload: true,

  // Delete source maps after upload so they aren't served to users
  sourcemaps: {
    filesToDeleteAfterUpload: [".next/static/**/*.map"],
  },

  // Automatically instrument API routes and server components
  autoInstrumentServerFunctions: true,
});
