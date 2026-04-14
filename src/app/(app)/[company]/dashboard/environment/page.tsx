"use client";
import * as React from "react";
import { useTranslation } from "@/i18n";
import { LoadingPage } from "@/components/ui/loading";

const EnvironmentDashboard = React.lazy(() => import("./_components/environment-dashboard"));

export default function EnvironmentPage() {
  return (
    <React.Suspense fallback={<LoadingPage />}>
      <EnvironmentDashboard />
    </React.Suspense>
  );
}
