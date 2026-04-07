"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Plus, Home, Eye, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCompanyParam } from "@/hooks/use-company-param";
import { useTranslation } from "@/i18n";

function AnimatedCheckmark() {
  return (
    <div className="relative mx-auto h-24 w-24">
      <style>{`
        @keyframes drawCircle {
          to { stroke-dashoffset: 0; }
        }
        @keyframes drawCheck {
          to { stroke-dashoffset: 0; }
        }
      `}</style>
      <svg className="h-24 w-24" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle
          cx="48" cy="48" r="44"
          className="stroke-green-500 dark:stroke-green-400"
          strokeWidth="3"
          strokeDasharray="276.5"
          strokeDashoffset="276.5"
          strokeLinecap="round"
          style={{
            animation: 'drawCircle 0.6s ease-out 0.1s forwards',
          }}
        />
        <path
          d="M28 50 L42 64 L68 34"
          className="stroke-green-500 dark:stroke-green-400"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          strokeDasharray="60"
          strokeDashoffset="60"
          style={{
            animation: 'drawCheck 0.4s ease-out 0.6s forwards',
          }}
        />
      </svg>
    </div>
  );
}

function ReportSuccessPageContent() {
  const company = useCompanyParam();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const referenceNumber = searchParams.get("ref") || "N/A";
  const incidentId = searchParams.get("id");
  const assessmentId = searchParams.get("id");
  const reportType = searchParams.get("type") || "incident";

  const typeLabels: Record<string, { title: string; description: string; action: string }> = {
    incident: {
      title: t("report.success.reportSubmitted"),
      description: t("report.success.reportSubmittedDesc"),
      action: t("report.success.reportAnother"),
    },
    checklist: {
      title: t("report.success.checklistCompleted"),
      description: t("report.success.checklistCompletedDesc"),
      action: t("report.success.startAnotherChecklist"),
    },
    inspection: {
      title: t("report.success.inspectionSubmitted"),
      description: t("report.success.inspectionSubmittedDesc"),
      action: t("report.success.startAnotherInspection"),
    },
    assessment: {
      title: t("report.success.assessmentSubmitted"),
      description: t("report.success.assessmentSubmittedDesc"),
      action: t("report.success.startAnotherAssessment"),
    },
  };

  const labels = typeLabels[reportType] || typeLabels.incident;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm text-center">
        {/* Success icon */}
        <div className="mb-8" aria-hidden="true">
          <AnimatedCheckmark />
        </div>

        {/* Success message */}
        <h1 className="mb-2 text-2xl font-bold">{labels.title}</h1>
        <p className="mb-6 text-muted-foreground">
          {labels.description}
        </p>

        {/* Reference number */}
        {(reportType === "incident" && incidentId) || (reportType === "assessment" && assessmentId) ? (
          <Link
            href={
              reportType === "assessment"
                ? `/${company}/app/risk-assessment/view/${assessmentId}`
                : `/${company}/app/incidents/${incidentId}`
            }
            className="block mb-8 rounded-xl border bg-card shadow-sm p-4 transition-colors hover:bg-primary/10 active:bg-primary/15"
          >
            <p className="text-sm text-muted-foreground">{t("report.success.referenceNumber")}</p>
            <p className="text-2xl font-bold text-primary">{referenceNumber}</p>
            <p className="mt-2 text-xs text-primary/70">Tap to view details →</p>
          </Link>
        ) : (
          <div className="mb-8 rounded-xl border bg-card shadow-sm p-4">
            <p className="text-sm text-muted-foreground">{t("report.success.referenceNumber")}</p>
            <p className="text-2xl font-bold text-primary">{referenceNumber}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              {t("report.success.saveForRecords")}
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div className="space-y-3">
          {incidentId && reportType === "incident" && (
            <Link href={`/${company}/app/incidents/${incidentId}`} className="block">
              <Button className="h-12 w-full gap-2">
                <Eye className="h-5 w-5" aria-hidden="true" />
                {t("incidents.viewReport") || "View Report"}
              </Button>
            </Link>
          )}
          {reportType === "assessment" && assessmentId && (
            <Link href={`/${company}/app/risk-assessment/view/${assessmentId}`} className="block">
              <Button className="h-12 w-full gap-2">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                View Assessment
              </Button>
            </Link>
          )}
          <Link href={`/${company}/app/report`} className="block">
            <Button variant={incidentId || assessmentId ? "outline" : "default"} className="h-12 w-full gap-2">
              <Plus className="h-5 w-5" aria-hidden="true" />
              {t("incidents.reportAnother") || labels.action}
            </Button>
          </Link>
          <Link href={`/${company}/app`} className="block">
            <Button variant="outline" className="h-12 w-full gap-2">
              <Home className="h-5 w-5" aria-hidden="true" />
              {t("report.success.backHome")}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ReportSuccessPage() {
  return (
    <React.Suspense fallback={<div className="flex min-h-[400px] items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}>
      <ReportSuccessPageContent />
    </React.Suspense>
  );
}
