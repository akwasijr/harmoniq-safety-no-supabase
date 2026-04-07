"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * /admin now redirects to the unified login page.
 * Super admins can select "Platform" from the app chooser.
 */
export default function AdminLoginPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/login?mode=platform");
  }, [router]);
  return null;
}
