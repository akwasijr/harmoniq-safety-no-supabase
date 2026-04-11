"use client";
import * as React from "react";
import { LoadingPage } from "@/components/ui/loading";

const ComplianceDashboard = React.lazy(() => import("./_components/compliance-dashboard"));

export default function CompliancePage() {
  return (
    <React.Suspense fallback={<LoadingPage />}>
      <ComplianceDashboard />
    </React.Suspense>
  );
}
