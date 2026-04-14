"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  ClipboardCheck,
  Eye,
  Play,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingPage } from "@/components/ui/loading";
import { useChecklistTemplatesStore, useChecklistSubmissionsStore } from "@/stores/checklists-store";
import { useProcedureTemplatesStore } from "@/stores/procedure-templates-store";
import { useProcedureSubmissionsStore } from "@/stores/procedure-submissions-store";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "@/i18n";
import { cn } from "@/lib/utils";
import { getBuiltInProcedureTemplates } from "@/data/procedure-templates";
import { getTemplateById } from "@/data/industry-templates";
import { getRiskAssessmentTemplateById } from "@/data/risk-assessment-templates";
import { activateIndustryTemplate } from "@/lib/template-activation";
import { resolveProcedureStepTemplateId } from "@/lib/procedure-flow";
import type { Country } from "@/types";

function MobileProcedureContent() {
  const router = useRouter();
  const params = useParams();
  const company = params.company as string;
  const submissionId = params.submissionId as string;
  const { user, currentCompany } = useAuth();
  const { t, formatDate } = useTranslation();
  const { items: checklistTemplates } = useChecklistTemplatesStore();
  const { items: checklistSubmissions } = useChecklistSubmissionsStore();
  const { items: procedureTemplates } = useProcedureTemplatesStore();
  const { items: procedureSubmissions } = useProcedureSubmissionsStore();

  const companyCountry = (currentCompany?.country as Country | undefined) || "US";

  const allBuiltInProcedures = React.useMemo(() => getBuiltInProcedureTemplates(), []);

  const submission = procedureSubmissions.find((s) => s.id === submissionId);
  const procedure = submission
    ? procedureTemplates.find((p) => p.id === submission.procedure_template_id)
      || allBuiltInProcedures.find((p) => p.id === submission.procedure_template_id)
    : null;

  const stepViewModels = React.useMemo(() => {
    if (!submission || !procedure) return [];
    return procedure.steps.map((step, index) => {
      const stepSub = submission.step_submissions.find((ss) => ss.step_id === step.id);
      const resolvedId = resolveProcedureStepTemplateId(step.template_id);
      const tpl = checklistTemplates.find((t) => t.source_template_id === resolvedId)
        || checklistTemplates.find((t) => t.id === resolvedId)
        || (() => {
          const builtIn = getTemplateById(resolvedId) || getRiskAssessmentTemplateById(resolvedId);
          if (!builtIn) return null;
          return activateIndustryTemplate(builtIn, currentCompany?.id || "__built_in__", companyCountry, t);
        })();
      const linkedSub = stepSub?.submission_id
        ? checklistSubmissions.find((s) => s.id === stepSub.submission_id)
        : null;
      // Build fill href for mobile — use the resolved built-in template ID
      const fillHref = `/${company}/app/checklists/${resolvedId}`;
      return {
        id: step.id,
        order: index + 1,
        name: tpl?.name || step.template_name,
        type: step.type,
        status: stepSub?.status || "pending",
        completedAt: stepSub?.completed_at || null,
        completedSubmissionId: linkedSub?.id || null,
        fillHref,
      };
    });
  }, [submission, procedure, checklistTemplates, checklistSubmissions, company, companyCountry, currentCompany?.id, t]);

  const completedSteps = stepViewModels.filter((s) => s.status === "completed" || s.status === "skipped").length;
  const currentStep = stepViewModels.find((s) => s.status === "in_progress")
    || stepViewModels.find((s) => s.status === "pending")
    || null;

  if (!submission || !procedure) {
    return (
      <EmptyState
        icon={ClipboardCheck}
        title="Procedure not found"
        description="This procedure submission could not be found."
        action={<Button variant="outline" size="sm" onClick={() => router.back()}>Go back</Button>}
      />
    );
  }

  const progressPct = stepViewModels.length ? Math.round((completedSteps / stepViewModels.length) * 100) : 0;

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b bg-background">
        <div className="flex h-14 items-center gap-3 px-4">
          <Button variant="ghost" size="icon" className="shrink-0" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold truncate">{procedure.name}</h1>
            <p className="text-[10px] text-muted-foreground">
              {completedSteps}/{stepViewModels.length} steps · {formatDate(new Date(submission.started_at))}
            </p>
          </div>
          <Badge
            variant={submission.status === "completed" ? "success" : submission.status === "cancelled" ? "secondary" : "warning"}
            className="text-[10px] shrink-0 capitalize"
          >
            {submission.status.replace(/_/g, " ")}
          </Badge>
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-muted">
          <div className="h-full bg-primary transition-all" style={{ width: `${progressPct}%` }} />
        </div>
      </header>

      <div className="flex-1 p-4 space-y-3 pb-24">
        {/* Current step action */}
        {currentStep && submission.status !== "completed" && (
          <Link
            href={currentStep.fillHref}
            className="flex items-center gap-3 rounded-xl border-2 border-primary/30 bg-primary/5 p-4 active:bg-primary/10"
          >
            <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
              <Play className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">
                {currentStep.status === "in_progress" ? "Continue" : "Start"} Step {currentStep.order}
              </p>
              <p className="text-xs text-muted-foreground truncate">{currentStep.name}</p>
            </div>
          </Link>
        )}

        {/* All steps */}
        {stepViewModels.map((step) => {
          const isCompleted = step.status === "completed" || step.status === "skipped";
          const isCurrent = step.status === "in_progress";
          const StepIcon = step.type === "risk_assessment" ? ShieldAlert : ClipboardCheck;

          return (
            <div
              key={step.id}
              className={cn(
                "rounded-xl border p-3",
                isCompleted && "border-green-500/30 bg-green-500/5",
                isCurrent && "border-primary/40 bg-primary/5",
              )}
            >
              <div className="flex items-center gap-3">
                <div className="shrink-0">
                  {isCompleted ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <Circle className={cn("h-5 w-5", isCurrent ? "text-primary" : "text-muted-foreground/40")} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-medium text-muted-foreground">Step {step.order}</span>
                    <Badge
                      variant={step.type === "risk_assessment" ? "warning" : "secondary"}
                      className="text-[9px] gap-0.5 px-1.5"
                    >
                      <StepIcon className="h-2.5 w-2.5" />
                      {step.type === "risk_assessment" ? "RA" : "CL"}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium truncate">{step.name}</p>
                  {step.completedAt && (
                    <p className="text-[10px] text-muted-foreground">{formatDate(new Date(step.completedAt))}</p>
                  )}
                </div>
                {step.completedSubmissionId && (
                  <Link
                    href={`/${company}/app/checklists/submission/${step.completedSubmissionId}`}
                    className="shrink-0"
                  >
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  </Link>
                )}
              </div>
            </div>
          );
        })}

        {/* Completed message */}
        {submission.status === "completed" && (
          <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-4 text-center">
            <CheckCircle2 className="h-6 w-6 text-green-600 mx-auto mb-2" />
            <p className="text-sm font-medium">Procedure completed</p>
            <p className="text-xs text-muted-foreground mt-1">All steps have been finished.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MobileProcedurePage() {
  return (
    <React.Suspense fallback={<LoadingPage />}>
      <MobileProcedureContent />
    </React.Suspense>
  );
}
