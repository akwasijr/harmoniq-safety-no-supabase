"use client";

import * as React from "react";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCompanyParam } from "@/hooks/use-company-param";

/**
 * /inspection route handler:
 * - If ?asset=<id> is present, redirect to /inspection/[assetId] to start an inspection
 * - Otherwise, redirect to /checklists (inspection tab)
 */
function InspectionIndexPageContent() {
  const router = useRouter();
  const company = useCompanyParam();
  const searchParams = useSearchParams();
  const assetParam = searchParams.get("asset");

  useEffect(() => {
    if (assetParam) {
      // Route directly to the asset inspection flow
      router.replace(`/${company}/app/inspection/${assetParam}`);
    } else {
      router.replace(`/${company}/app/checklists?tab=inspection`);
    }
  }, [company, router, assetParam]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
}

export default function InspectionIndexPage() {
  return (
    <React.Suspense fallback={<div className="flex min-h-[400px] items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}>
      <InspectionIndexPageContent />
    </React.Suspense>
  );
}
