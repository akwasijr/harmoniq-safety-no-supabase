"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Lightweight analytics tracker for marketing pages.
 * Only sends pageviews if user has accepted analytics cookies.
 * Respects Do Not Track browser setting.
 */
export function AnalyticsTracker() {
  const pathname = usePathname();

  useEffect(() => {
    // Check Do Not Track
    if (navigator.doNotTrack === "1") return;

    // Check consent cookie
    const consentMatch = document.cookie.match(/harmoniq_consent=([^;]+)/);
    if (!consentMatch) return;
    try {
      const consent = JSON.parse(decodeURIComponent(consentMatch[1]));
      if (!consent.analytics) return;
    } catch {
      return;
    }

    // Send pageview
    fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: pathname,
        referrer: document.referrer || "direct",
      }),
    }).catch(() => {
      // Silently fail — analytics should never break the page
    });
  }, [pathname]);

  return null;
}
