"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCompanyParam } from "@/hooks/use-company-param";

/**
 * Redirect /risk-assessment to /checklists
 * The /risk-assessment route only has form-specific pages (jha, jsa, rie, etc.)
 */
export default function RiskAssessmentIndexPage() {
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
