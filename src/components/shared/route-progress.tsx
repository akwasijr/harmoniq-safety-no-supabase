"use client";

import { useEffect, useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import NProgress from "nprogress";

NProgress.configure({ showSpinner: false, speed: 300 });

export function RouteProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Complete the progress bar when the route changes
  useEffect(() => {
    NProgress.done();
  }, [pathname, searchParams]);

  // Intercept internal link clicks to start the progress bar
  const handleClick = useCallback((event: MouseEvent) => {
    const anchor = (event.target as HTMLElement).closest("a");
    if (!anchor) return;

    const href = anchor.getAttribute("href");
    if (!href) return;

    // Skip external links, anchors, mailto, tel, download, and new-tab links
    if (
      anchor.target === "_blank" ||
      anchor.hasAttribute("download") ||
      href.startsWith("#") ||
      href.startsWith("mailto:") ||
      href.startsWith("tel:") ||
      /^https?:\/\//.test(href)
    ) {
      return;
    }

    // Skip if modifier keys are held (open-in-new-tab intent)
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }

    // Don't start if we're already on this path
    const url = new URL(href, window.location.origin);
    if (
      url.pathname === pathname &&
      url.search === window.location.search
    ) {
      return;
    }

    NProgress.start();
  }, [pathname]);

  useEffect(() => {
    document.addEventListener("click", handleClick, { capture: true });
    return () => {
      document.removeEventListener("click", handleClick, { capture: true });
      NProgress.done();
    };
  }, [handleClick]);

  return null;
}
