"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Lightweight analytics tracker.
 * Collects anonymous page views (no PII stored — IPs are hashed server-side).
 * Respects Do Not Track browser setting.
 */
export function AnalyticsTracker() {
  const pathname = usePathname();

  useEffect(() => {
    // Respect Do Not Track
    if (typeof navigator !== "undefined" && navigator.doNotTrack === "1") return;

    // Small delay to avoid blocking page render
    const timer = setTimeout(() => {
      fetch("/api/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: pathname,
          referrer: document.referrer || "direct",
          screen_width: window.innerWidth,
        }),
      }).catch(() => {});
    }, 500);

    return () => clearTimeout(timer);
  }, [pathname]);

  return null;
}
