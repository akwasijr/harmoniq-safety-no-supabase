"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingPage } from "@/components/ui/loading";
import { useChecklistTemplatesStore, useChecklistSubmissionsStore } from "@/stores/checklists-store";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "@/i18n";
import { cn } from "@/lib/utils";
import { getTemplateById } from "@/data/industry-templates";
import { getRiskAssessmentTemplateById } from "@/data/risk-assessment-templates";
import { activateIndustryTemplate } from "@/lib/template-activation";
import type { Country } from "@/types";

function MobileSubmissionContent() {
  const router = useRouter();
  const params = useParams();
  const company = params.company as string;
  const submissionId = params.submissionId as string;
  const { user, currentCompany } = useAuth();
  const { t, formatDate } = useTranslation();
  const { items: templates } = useChecklistTemplatesStore();
  const { items: submissions } = useChecklistSubmissionsStore();

  const companyCountry = (currentCompany?.country as Country | undefined) || "US";

  const submission = submissions.find((s) => s.id === submissionId);

  const template = React.useMemo(() => {
    if (!submission) return null;
    const direct = templates.find((tpl) => tpl.id === submission.template_id)
      || templates.find((tpl) => tpl.source_template_id === submission.template_id);
    if (direct) return direct;
    const builtIn = getTemplateById(submission.template_id) || getRiskAssessmentTemplateById(submission.template_id);
    if (!builtIn) return null;
    return activateIndustryTemplate(builtIn, submission.company_id || "__built_in__", companyCountry, t);
  }, [submission, templates, companyCountry, t]);

  if (!submission) {
    return (
      <EmptyState
        icon={Clock}
        title="Submission not found"
        description="This checklist submission could not be found."
        action={<Button variant="outline" size="sm" onClick={() => router.back()}>Go back</Button>}
      />
    );
  }

  const responses = submission.responses || [];
  const booleanResponses = responses.filter((r) => typeof r.value === "boolean");
  const passCount = booleanResponses.filter((r) => r.value === true).length;
  const failCount = booleanResponses.filter((r) => r.value === false).length;
  const applicable = booleanResponses.length;
  const pct = applicable > 0 ? Math.round((passCount / applicable) * 100) : 100;

  const responseItems = responses.map((resp, idx) => {
    const item = template?.items.find((i) => i.id === resp.item_id) || template?.items[idx];
    const val = resp.value;
    const label = val === true ? "Yes" : val === false ? "No" : val === "na" || val === "n/a" ? "N/A" : val === null ? "—" : String(val);
    return {
      question: item?.question || `Item ${idx + 1}`,
      value: label,
      isPass: val === true,
      isFail: val === false,
      comment: resp.comment,
    };
  });

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <header className="sticky top-[60px] z-30 border-b bg-background">
        <div className="flex h-14 items-center gap-3 px-4">
          <Button variant="ghost" size="icon" className="shrink-0" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold truncate">{template?.name || "Checklist"}</h1>
            <p className="text-[10px] text-muted-foreground">
              {formatDate(new Date(submission.submitted_at || submission.created_at))}
            </p>
          </div>
          <Badge variant={submission.status === "approved" ? "success" : submission.status === "rejected" ? "destructive" : "outline"} className="text-[10px] shrink-0">
            {submission.status}
          </Badge>
        </div>
      </header>

      <div className="flex-1 p-4 space-y-4 pb-24">
        {/* Score summary */}
        <div className="flex items-center gap-3 p-4 rounded-xl border">
          <div className="text-center">
            <p className={cn("text-3xl font-bold", pct >= 80 ? "text-green-600" : pct >= 50 ? "text-amber-600" : "text-red-600")}>
              {pct}%
            </p>
            <p className="text-[10px] text-muted-foreground">Score</p>
          </div>
          <div className="flex-1 grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-lg font-semibold text-green-600">{passCount}</p>
              <p className="text-[10px] text-muted-foreground">Passed</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-red-600">{failCount}</p>
              <p className="text-[10px] text-muted-foreground">Failed</p>
            </div>
            <div>
              <p className="text-lg font-semibold">{responses.length}</p>
              <p className="text-[10px] text-muted-foreground">Total</p>
            </div>
          </div>
        </div>

        {/* General comments */}
        {submission.general_comments && (
          <div className="rounded-xl border p-3">
            <p className="text-xs text-muted-foreground mb-1">Notes</p>
            <p className="text-sm">{submission.general_comments}</p>
          </div>
        )}

        {/* Responses */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">All responses</p>
          {responseItems.map((r, idx) => (
            <div
              key={idx}
              className={cn(
                "flex items-start gap-3 rounded-xl border p-3",
                r.isFail && "border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/20",
              )}
            >
              <div className="mt-0.5 shrink-0">
                {r.isPass ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : r.isFail ? (
                  <XCircle className="h-4 w-4 text-red-600" />
                ) : (
                  <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm">{r.question}</p>
                {r.comment && (
                  <p className="text-xs text-muted-foreground mt-1">Note: {r.comment}</p>
                )}
              </div>
              <Badge
                variant={r.isPass ? "success" : r.isFail ? "destructive" : "outline"}
                className="text-[10px] shrink-0"
              >
                {r.value}
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function MobileSubmissionPage() {
  return (
    <React.Suspense fallback={<LoadingPage />}>
      <MobileSubmissionContent />
    </React.Suspense>
  );
}
