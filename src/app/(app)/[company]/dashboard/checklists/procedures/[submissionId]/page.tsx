"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  ClipboardCheck,
  Eye,
  Layers,
  Play,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingPage } from "@/components/ui/loading";
import { RoleGuard } from "@/components/auth/role-guard";
import { useCompanyData } from "@/hooks/use-company-data";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "@/i18n";
import { getBuiltInProcedureTemplates } from "@/data/procedure-templates";
import { getTemplateById } from "@/data/industry-templates";
import { getRiskAssessmentTemplateById } from "@/data/risk-assessment-templates";
import { activateIndustryTemplate } from "@/lib/template-activation";
import {
  buildProcedureStepFillHref,
  resolveProcedureStepTemplateId,
} from "@/lib/procedure-flow";
import { cn } from "@/lib/utils";
import type { Country } from "@/types";

export default function ProcedureSubmissionOverviewPage() {
  const router = useRouter();
  const params = useParams();
  const company = params.company as string;
  const submissionId = params.submissionId as string;
  const { t, formatDate } = useTranslation();
  const { currentCompany } = useAuth();
  const {
    checklistTemplates,
    checklistSubmissions,
    procedureTemplates,
    procedureSubmissions,
    users,
    stores,
    companyId,
  } = useCompanyData();

  // Force a re-render after mount so the store state has time to settle
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    if (tick === 0) {
      const timer = setTimeout(() => setTick(1), 50);
      return () => clearTimeout(timer);
    }
  }, [tick]);

  const companyCountry = (currentCompany?.country as Country | undefined) || "US";
  const allBuiltInProcedures = React.useMemo(
    () => getBuiltInProcedureTemplates(),
    [],
  );

  const allProcedures = React.useMemo(
    () => [
      ...procedureTemplates,
      ...allBuiltInProcedures.filter(
        (builtInProcedure) => !procedureTemplates.some((procedure) => procedure.id === builtInProcedure.id),
      ),
    ],
    [procedureTemplates, allBuiltInProcedures],
  );

  const submission = procedureSubmissions.find((item) => item.id === submissionId)
    || stores.procedureSubmissions.items.find((item) => item.id === submissionId);
  const procedure = submission
    ? allProcedures.find((item) => item.id === submission.procedure_template_id)
     : null;

  const submittedBy = submission
    ? users.find((user) => user.id === submission.submitter_id)?.full_name || "Unknown"
    : "Unknown";

  const stepViewModels = React.useMemo(() => {
    if (!submission || !procedure) return [];

    return procedure.steps.map((step, index) => {
      const stepSubmission = submission.step_submissions.find((item) => item.step_id === step.id);
      const resolvedStepTemplateId = resolveProcedureStepTemplateId(step.template_id);
      const companyTemplate = checklistTemplates.find((template) => template.source_template_id === resolvedStepTemplateId)
        || checklistTemplates.find((template) => template.id === resolvedStepTemplateId);
      const sourceTemplate = companyTemplate
        || (() => {
          const builtInTemplate = getTemplateById(resolvedStepTemplateId) || getRiskAssessmentTemplateById(resolvedStepTemplateId);
          if (!builtInTemplate) return null;
          return activateIndustryTemplate(
            builtInTemplate,
            companyId || currentCompany?.id || "__built_in__",
            companyCountry,
            t,
          );
        })();
      const linkedSubmission = stepSubmission?.submission_id
        ? checklistSubmissions.find((item) => item.id === stepSubmission.submission_id)
        : null;
      const fillHref = buildProcedureStepFillHref({
        company,
        step,
        procedureSubmissionId: submission.id,
      });

      // Build a short preview of responses for completed steps
      const responsePreview: Array<{ question: string; value: string; isPass: boolean; isFail: boolean }> = [];
      if (linkedSubmission && sourceTemplate) {
        const maxPreview = 4;
        for (let i = 0; i < Math.min(linkedSubmission.responses.length, maxPreview); i++) {
          const resp = linkedSubmission.responses[i];
          const item = sourceTemplate.items.find((it) => it.id === resp.item_id) || sourceTemplate.items[i];
          const val = resp.value;
          const label = val === true ? "Yes" : val === false ? "No" : val === "na" || val === "n/a" ? "N/A" : val === null ? "—" : String(val);
          responsePreview.push({
            question: item?.question || `Item ${i + 1}`,
            value: label,
            isPass: val === true || val === "yes" || val === "pass",
            isFail: val === false || val === "no" || val === "fail",
          });
        }
      }
      const totalResponses = linkedSubmission?.responses.length || 0;
      const passResponses = linkedSubmission?.responses.filter((r) => r.value === true || r.value === "yes" || r.value === "pass").length || 0;

      return {
        id: step.id,
        order: index + 1,
        name: sourceTemplate?.name || step.template_name,
        description: sourceTemplate?.description || null,
        itemCount: sourceTemplate?.items.length || 0,
        type: step.type,
        status: stepSubmission?.status || "pending",
        completedAt: stepSubmission?.completed_at || null,
        completedSubmissionId: linkedSubmission?.id || null,
        fillHref,
        responsePreview,
        totalResponses,
        passResponses,
      };
    });
  }, [
    submission,
    procedure,
    checklistTemplates,
    checklistSubmissions,
    company,
    companyCountry,
    companyId,
    currentCompany?.id,
    t,
  ]);

  const completedSteps = stepViewModels.filter((step) => step.status === "completed" || step.status === "skipped").length;
  const currentStep = stepViewModels.find((step) => step.status === "in_progress")
    || stepViewModels.find((step) => step.status === "pending")
    || null;

  if ((stores.procedureSubmissions.isLoading || tick === 0) && !submission) {
    return <LoadingPage />;
  }

  if (!submission || !procedure) {
    return (
      <EmptyState
        icon={Layers}
        title="Procedure not found"
        description="This procedure submission may have been removed or is unavailable."
        action={
          <Button variant="outline" onClick={() => router.push(`/${company}/dashboard/checklists?tab=procedures`)}>
            Back to procedures
          </Button>
        }
      />
    );
  }

  return (
    <RoleGuard requiredPermission="checklists.view">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2"
              onClick={() => router.push(`/${company}/dashboard/checklists?tab=procedures`)}
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Procedures
            </Button>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold">{procedure.name}</h1>
                <Badge variant={submission.status === "completed" ? "success" : submission.status === "cancelled" ? "cancelled" : "in_progress"}>
                  {submission.status.replace(/_/g, " ")}
                </Badge>
              </div>
              {procedure.description && (
                <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{procedure.description}</p>
              )}
            </div>
          </div>

          <Card className="w-full md:max-w-sm">
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Completed</span>
                <span className="font-medium">{completedSteps}/{stepViewModels.length} steps</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${stepViewModels.length ? Math.round((completedSteps / stepViewModels.length) * 100) : 0}%` }}
                />
              </div>
              <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                <p>Started {formatDate(new Date(submission.started_at))}</p>
                <p>Submitted by {submittedBy}</p>
                <p>{procedure.steps.filter((step) => step.type === "risk_assessment").length} risk assessment step(s)</p>
                <p>{procedure.steps.filter((step) => step.type === "checklist").length} checklist step(s)</p>
              </div>
              {currentStep && submission.status !== "completed" && currentStep.fillHref && (
                <Button className="w-full gap-2" onClick={() => router.push(currentStep.fillHref!)}>
                  <Play className="h-4 w-4" aria-hidden="true" />
                  {currentStep.status === "completed" ? "Review procedure" : `Open step ${currentStep.order}`}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">What to expect</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stepViewModels.map((step) => {
              const isCompleted = step.status === "completed" || step.status === "skipped";
              const isCurrent = step.status === "in_progress";
              const isUpcoming = !isCompleted && !isCurrent;
              const StepIcon = step.type === "risk_assessment" ? ShieldAlert : ClipboardCheck;

              return (
                <div
                  key={step.id}
                  className={cn(
                    "rounded-xl border p-4",
                    isCompleted && "border-green-500/30 bg-green-500/5",
                    isCurrent && "border-primary/40 bg-primary/5",
                  )}
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="flex min-w-0 gap-3">
                      <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                        {isCompleted ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" aria-hidden="true" />
                        ) : (
                          <Circle className={cn("h-5 w-5", isCurrent ? "text-primary" : "text-muted-foreground")} aria-hidden="true" />
                        )}
                      </div>
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">Step {step.order}</Badge>
                          <Badge variant={step.type === "risk_assessment" ? "warning" : "secondary"} className="gap-1">
                            <StepIcon className="h-3 w-3" aria-hidden="true" />
                            {step.type === "risk_assessment" ? "Risk assessment" : "Checklist"}
                          </Badge>
                          <Badge variant={isCompleted ? "success" : isCurrent ? "in_progress" : "outline"}>
                            {isCompleted ? "Completed" : isCurrent ? "Current step" : "Up next"}
                          </Badge>
                        </div>
                        <div>
                          <h2 className="font-medium">{step.name}</h2>
                          {step.description && (
                            <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span>{step.itemCount} item(s)</span>
                          {step.completedAt && (
                            <span>Completed {formatDate(new Date(step.completedAt))}</span>
                          )}
                          {isCompleted && step.totalResponses > 0 && (
                            <span className="text-green-600">{step.passResponses}/{step.totalResponses} passed</span>
                          )}
                          {isUpcoming && <span>Available once the current step is complete.</span>}
                        </div>
                        {/* Response preview for completed steps */}
                        {isCompleted && step.responsePreview.length > 0 && (
                          <div className="mt-2 space-y-1 rounded-lg border bg-muted/30 p-2.5">
                            {step.responsePreview.map((r, rIdx) => (
                              <div key={rIdx} className="flex items-center justify-between gap-2 text-xs">
                                <span className="truncate text-muted-foreground">{r.question}</span>
                                <span className={cn(
                                  "shrink-0 rounded px-1.5 py-0.5 font-medium",
                                  r.isPass && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                                  r.isFail && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                                  !r.isPass && !r.isFail && "bg-muted text-muted-foreground",
                                )}>{r.value}</span>
                              </div>
                            ))}
                            {step.totalResponses > step.responsePreview.length && (
                              <p className="text-xs text-muted-foreground pt-1">+ {step.totalResponses - step.responsePreview.length} more item(s)</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 md:justify-end">
                      {step.completedSubmissionId && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={() => router.push(`/${company}/dashboard/checklists/${step.completedSubmissionId}`)}
                        >
                          <Eye className="h-4 w-4" aria-hidden="true" />
                          Open completed step
                        </Button>
                      )}
                      {step.fillHref && (isCurrent || (isUpcoming && step.order === 1 && submission.status === "in_progress")) && (
                        <Button size="sm" className="gap-2" onClick={() => router.push(step.fillHref!)}>
                          <Play className="h-4 w-4" aria-hidden="true" />
                          {isCurrent ? "Continue step" : "Start step"}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {submission.status === "completed" && (
          <Card>
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="font-medium">Procedure completed</p>
                <p className="text-sm text-muted-foreground">
                  All steps are ticked off. You can reopen any completed step above for review.
                </p>
              </div>
              <Badge variant="success" className="w-fit gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                Completed
              </Badge>
            </CardContent>
          </Card>
        )}

        {submission.status !== "completed" && currentStep && (
          <Card>
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="font-medium">Current step</p>
                <p className="text-sm text-muted-foreground">
                  {currentStep.name} is ready. Completed steps stay ticked here so the user can always see what is left.
                </p>
              </div>
              {currentStep.fillHref && (
                <Button className="gap-2" onClick={() => router.push(currentStep.fillHref!)}>
                  <Play className="h-4 w-4" aria-hidden="true" />
                  Open current step
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </RoleGuard>
  );
}
