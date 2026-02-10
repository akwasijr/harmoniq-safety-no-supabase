"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCompanyParam } from "@/hooks/use-company-param";

/**
 * Redirect /location to /checklists
 * The /location route only has /location/[locationId] pages
 */
export default function LocationIndexPage() {
  const router = useRouter();
  const company = useCompanyParam();

  useEffect(() => {
    router.replace(`/${company}/app/checklists`);
  }, [company, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
}
