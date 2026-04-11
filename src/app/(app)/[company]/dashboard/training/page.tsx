"use client";
import * as React from "react";
import { LoadingPage } from "@/components/ui/loading";

const TrainingDashboard = React.lazy(() => import("./_components/training-dashboard"));

export default function TrainingPage() {
  return (
    <React.Suspense fallback={<LoadingPage />}>
      <TrainingDashboard />
    </React.Suspense>
  );
}
