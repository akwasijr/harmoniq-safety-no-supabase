"use client";
import * as React from "react";
import { useTranslation } from "@/i18n";
import { LoadingPage } from "@/components/ui/loading";

const PermitsDashboard = React.lazy(() => import("./_components/permits-dashboard"));

export default function PermitsPage() {
  return (
    <React.Suspense fallback={<LoadingPage />}>
      <PermitsDashboard />
    </React.Suspense>
  );
}
