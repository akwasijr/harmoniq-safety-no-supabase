"use client";

/**
 * /admin now redirects to the unified login page in platform mode.
 * Using window.location for a full page reload to ensure searchParams are available.
 */
export default function AdminLoginPage() {
  if (typeof window !== "undefined") {
    window.location.replace("/login?mode=platform");
  }
  return null;
}
