"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const CONSENT_COOKIE = "harmoniq_consent";

function getAnalyticsConsent(): boolean {
  if (typeof document === "undefined") return false;
  const match = document.cookie.match(new RegExp(`${CONSENT_COOKIE}=([^;]+)`));
  if (!match) return false;
  try {
    const consent = JSON.parse(decodeURIComponent(match[1]));
    return consent.analytics === true;
  } catch {
    return false;
  }
}

/**
 * Lightweight analytics tracker.
 * Collects anonymous page views (no PII stored, IPs are hashed server-side).
 * Respects Do Not Track browser setting AND cookie consent preferences.
 */
export function AnalyticsTracker() {
  const pathname = usePathname();
  const [consented, setConsented] = useState(false);

  // Listen for consent changes
  useEffect(() => {
    setConsented(getAnalyticsConsent());
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setConsented(detail?.analytics === true);
    };
    window.addEventListener("harmoniq:consent", handler);
    return () => window.removeEventListener("harmoniq:consent", handler);
  }, []);

  useEffect(() => {
    // Respect Do Not Track
    if (typeof navigator !== "undefined" && navigator.doNotTrack === "1") return;
    // Respect cookie consent
    if (!consented) return;

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
  }, [pathname, consented]);

  return null;
}
