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

const connectSrc = getSupabaseConnectSources();

// Allow Sentry ingest domain in connect-src
const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
let sentryConnect = "";
if (sentryDsn) {
  try {
    const parsed = new URL(sentryDsn);
    sentryConnect = ` https://${parsed.host}`;
  } catch {
    // ignore invalid DSN
  }
}

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
              "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https:",
              "media-src 'self' blob:",
              `connect-src ${connectSrc}${sentryConnect}`,
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
  // Suppress Sentry CLI logs during build
  silent: true,

  // Upload source maps for readable stack traces
  widenClientFileUpload: true,

  // Configure source maps (hide from users in production)
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },

  // Disable telemetry
  telemetry: false,
});
