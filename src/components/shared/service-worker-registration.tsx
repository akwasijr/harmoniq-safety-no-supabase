"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let registration: ServiceWorkerRegistration | null = null;

    const updateFoundHandler = () => {
      const newWorker = registration?.installing;
      if (newWorker) {
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            // New content is available
          }
        });
      }
    };

    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          registration = reg;
          // Check for updates periodically
          intervalId = setInterval(() => {
            reg.update();
          }, 60 * 60 * 1000); // Check every hour

          // Handle updates
          reg.addEventListener("updatefound", updateFoundHandler);
        })
        .catch((error) => {
          console.error("[App] Service Worker registration failed:", error);
        });
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (registration) registration.removeEventListener("updatefound", updateFoundHandler);
    };
  }, []);

  return null;
}
