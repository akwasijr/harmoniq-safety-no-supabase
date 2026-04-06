"use client";

import * as React from "react";
import Link from "next/link";
import {
  CheckCircle,
  ChevronRight,
  ClipboardCheck,
  Clock,
  FileCheck,
  HardHat,
  Play,
  Scale,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useCompanyParam } from "@/hooks/use-company-param";
import { useLocationsStore } from "@/stores/locations-store";
import { useRiskEvaluationsStore } from "@/stores/risk-evaluations-store";
import { useUsersStore } from "@/stores/users-store";
import { useTranslation, LOCALE_DEFAULT_COUNTRY } from "@/i18n";
import {
  resolveRiskAssessmentCatalogCountry,
  type RiskAssessmentCatalogCountry,
} from "@/lib/country-config";
import { LoadingPage } from "@/components/ui/loading";
import { cn } from "@/lib/utils";

const riskAssessmentForms = {
  US: [
    { id: "jha", name: "JHA", fullName: "Job Hazard Analysis", icon: FileCheck },
    { id: "jsa", name: "JSA", fullName: "Job Safety Analysis", icon: ShieldAlert },
  ],
  NL: [
    { id: "rie", name: "RI&E", fullName: "RI&E Assessment", icon: FileCheck },
    { id: "arbowet", name: "Arbowet", fullName: "Arbowet Compliance Check", icon: ShieldAlert },
  ],
  SE: [
    { id: "sam", name: "SAM", fullName: "SAM Assessment", icon: FileCheck },
    { id: "osa", name: "OSA", fullName: "Psykosocial Riskbedomning", icon: ShieldAlert },
  ],
} satisfies Record<
  RiskAssessmentCatalogCountry,
  Array<{ id: string; name: string; fullName: string; icon: typeof FileCheck }>
>;

const assessmentLabelMap: Record<string, string> = {
  JHA: "Job Hazard Analysis",
  JSA: "Job Safety Analysis",
  RIE: "RI&E Assessment",
  ARBOWET: "Arbowet Compliance Check",
  SAM: "SAM Assessment",
  OSA: "OSA Assessment",
};

export default function RiskAssessmentIndexPage() {
  const company = useCompanyParam();
  const { user, currentCompany } = useAuth();
  const { items: riskEvaluations, isLoading } = useRiskEvaluationsStore();
  const { items: locations } = useLocationsStore();
  const { items: users } = useUsersStore();
  const { t, locale, formatDate } = useTranslation();

  const localeCountry = LOCALE_DEFAULT_COUNTRY[locale];
  const companyCountry = resolveRiskAssessmentCatalogCountry(
    currentCompany?.country,
    localeCountry,
  );

  const myAssessments = React.useMemo(() => {
    if (!user) return [];
    return riskEvaluations.filter(
      (evaluation) =>
        evaluation.company_id === user.company_id &&
        evaluation.submitter_id === user.id,
    );
  }, [riskEvaluations, user]);

  const inProgressAssessments = React.useMemo(
    () =>
      myAssessments
        .filter((evaluation) => evaluation.status === "draft")
        .slice(0, 4)
        .map((evaluation) => {
          const location = locations.find((loc) => loc.id === evaluation.location_id);
          const responseCount = Object.keys(evaluation.responses || {}).length;
          const progress = Math.min(100, Math.max(10, responseCount * 10));
          return {
            id: evaluation.id,
            formId: evaluation.form_type.toLowerCase(),
            name: assessmentLabelMap[evaluation.form_type] || evaluation.form_type,
            location: location?.name || "Unassigned location",
            progress,
          };
        }),
    [locations, myAssessments],
  );

  const awaitingReviewAssessments = React.useMemo(
    () =>
      myAssessments
        .filter((evaluation) => evaluation.status === "submitted")
        .map((evaluation) => {
          const location = locations.find((loc) => loc.id === evaluation.location_id);
          return {
            id: evaluation.id,
            formType: evaluation.form_type,
            name: assessmentLabelMap[evaluation.form_type] || evaluation.form_type,
            location: location?.name || "Unassigned location",
            date: evaluation.submitted_at || evaluation.created_at,
            status: evaluation.status,
          };
        }),
    [locations, myAssessments],
  );

  const reviewedAssessments = React.useMemo(
    () =>
      myAssessments
        .filter((evaluation) => evaluation.status === "reviewed")
        .map((evaluation) => {
          const location = locations.find((loc) => loc.id === evaluation.location_id);
          const reviewerName = evaluation.reviewed_by
            ? users.find((candidate) => candidate.id === evaluation.reviewed_by)?.full_name || "Reviewer"
            : "Pending";
          return {
            id: evaluation.id,
            formType: evaluation.form_type,
            name: assessmentLabelMap[evaluation.form_type] || evaluation.form_type,
            location: location?.name || "Unassigned location",
            date: evaluation.reviewed_at || evaluation.submitted_at || evaluation.created_at,
            reviewerName,
          };
        }),
    [locations, myAssessments, users],
  );

  const assessmentTypeConf: Record<string, { icon: typeof ShieldCheck; color: string; bg: string }> = {
    RIE: { icon: ShieldCheck, color: "text-blue-500", bg: "bg-blue-500/10" },
    JHA: { icon: HardHat, color: "text-orange-500", bg: "bg-orange-500/10" },
    JSA: { icon: ClipboardCheck, color: "text-green-500", bg: "bg-green-500/10" },
    SAM: { icon: ShieldAlert, color: "text-purple-500", bg: "bg-purple-500/10" },
    OSA: { icon: ShieldCheck, color: "text-teal-500", bg: "bg-teal-500/10" },
    ARBOWET: { icon: Scale, color: "text-indigo-500", bg: "bg-indigo-500/10" },
  };

  if (!user || isLoading) {
    return <LoadingPage />;
  }

  return (
    <div className="flex min-h-full flex-col pb-20">
      <div className="sticky top-14 z-10 border-b bg-background px-4 pt-4 pb-3">
        <h1 className="text-lg font-bold">{t("checklists.tabs.assessments") || "Risk Assessments"}</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("riskAssessment.workerHubHint") || "Resume drafts, track assessments awaiting review, and keep reviewed proof close at hand."}
        </p>
      </div>

      <div className="space-y-4 px-4 pt-4">
        <section aria-label="Assessment overview" className="grid grid-cols-3 gap-2">
          <div className="rounded-xl border bg-card p-3">
            <p className="text-[11px] text-muted-foreground">Drafts</p>
            <p className="mt-1 text-lg font-semibold">{inProgressAssessments.length}</p>
          </div>
          <div className="rounded-xl border bg-card p-3">
            <p className="text-[11px] text-muted-foreground">Awaiting review</p>
            <p className="mt-1 text-lg font-semibold">{awaitingReviewAssessments.length}</p>
          </div>
          <div className="rounded-xl border bg-card p-3">
            <p className="text-[11px] text-muted-foreground">Reviewed</p>
            <p className="mt-1 text-lg font-semibold">{reviewedAssessments.length}</p>
          </div>
        </section>

        {inProgressAssessments.length > 0 ? (
          <section aria-labelledby="draft-assessment-heading" className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" aria-hidden="true" />
              <h2 id="draft-assessment-heading" className="text-sm font-semibold">
                {t("checklists.labels.inProgress") || "In progress"}
              </h2>
              <Badge variant="secondary" className="text-[10px]">
                {inProgressAssessments.length}
              </Badge>
            </div>

            <div className="space-y-2">
              {inProgressAssessments.map((item) => (
                <Link
                  key={item.id}
                  href={`/${company}/app/risk-assessment/${item.formId}?draft=${item.id}`}
                  className="flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors active:bg-muted/50 hover:bg-muted/30"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                    <Play className="h-4 w-4 text-blue-500" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-tight">{item.name}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <div
                        className="h-1.5 flex-1 overflow-hidden rounded-full bg-blue-500/20"
                        role="progressbar"
                        aria-valuenow={item.progress}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      >
                        <div className="h-full rounded-full bg-blue-500" style={{ width: `${item.progress}%` }} />
                      </div>
                      <span className="text-[10px] font-medium text-muted-foreground">{item.progress}%</span>
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">{item.location}</p>
                  </div>
                  <span className="text-[10px] font-medium text-primary">{t("checklists.buttons.resume") || "Resume"}</span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {awaitingReviewAssessments.length > 0 ? (
          <section aria-labelledby="awaiting-review-assessment-heading" className="space-y-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-500" aria-hidden="true" />
              <h2 id="awaiting-review-assessment-heading" className="text-sm font-semibold">
                Awaiting review
              </h2>
              <Badge variant="warning" className="text-[10px]">
                {awaitingReviewAssessments.length}
              </Badge>
            </div>

            <div className="space-y-2">
              {awaitingReviewAssessments.map((item) => {
                const conf = assessmentTypeConf[item.formType] || {
                  icon: ShieldCheck,
                  color: "text-muted-foreground",
                  bg: "bg-muted",
                };
                const TypeIcon = conf.icon;

                return (
                  <Link
                    key={item.id}
                    href={`/${company}/app/risk-assessment/view/${item.id}`}
                    className="flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors active:bg-muted/50 hover:bg-muted/30"
                  >
                    <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", conf.bg)}>
                      <TypeIcon className={cn("h-4 w-4", conf.color)} aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium leading-tight">{item.name}</p>
                        <Badge variant="warning" className="text-[10px]">
                          Submitted
                        </Badge>
                      </div>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {item.location} · Submitted {formatDate(new Date(item.date))}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  </Link>
                );
              })}
            </div>
          </section>
        ) : null}

        <section aria-labelledby="new-assessment-heading" className="space-y-3">
          <div className="flex items-center gap-2">
            <FileCheck className="h-4 w-4 text-primary" aria-hidden="true" />
            <h2 id="new-assessment-heading" className="text-sm font-semibold">
              {t("checklists.newAssessment") || "Start a new assessment"}
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {riskAssessmentForms[companyCountry].map((form) => {
              const Icon = form.icon;
              return (
                <Link
                  key={form.id}
                  href={`/${company}/app/risk-assessment/${form.id}`}
                  className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-4 transition-all hover:bg-primary/10 hover:border-primary/50 active:border-primary active:bg-primary/10"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-sm text-primary">{form.name}</p>
                    <p className="mt-0.5 line-clamp-1 text-[10px] text-muted-foreground">{form.fullName}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="completed-assessment-heading" className="space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-success" aria-hidden="true" />
            <h2 id="completed-assessment-heading" className="text-sm font-semibold">
              {t("checklists.labels.completed") || "Reviewed"}
            </h2>
            <Badge variant="secondary" className="text-[10px]">
              {reviewedAssessments.length}
            </Badge>
          </div>

          {reviewedAssessments.length === 0 ? (
            <div className="py-8 text-center">
              <CheckCircle className="mx-auto h-8 w-8 text-muted-foreground/20" aria-hidden="true" />
              <p className="mt-2 text-sm font-medium text-muted-foreground">
                {t("checklists.noCompletedAssessments") || "No reviewed assessments yet"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground/70">
                {t("riskAssessment.completedHint") || "Reviewed assessments will appear here with the reviewer and date for proof."}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {reviewedAssessments.map((item) => {
                const conf = assessmentTypeConf[item.formType] || {
                  icon: ShieldCheck,
                  color: "text-muted-foreground",
                  bg: "bg-muted",
                };
                const TypeIcon = conf.icon;

                return (
                  <Link
                    key={item.id}
                    href={`/${company}/app/risk-assessment/view/${item.id}`}
                    className="flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors active:bg-muted/50 hover:bg-muted/30"
                  >
                    <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", conf.bg)}>
                      <TypeIcon className={cn("h-4 w-4", conf.color)} aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium leading-tight">{item.name}</p>
                        <Badge variant="success" className="text-[10px]">
                          Reviewed
                        </Badge>
                      </div>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {item.location} · Reviewed {formatDate(new Date(item.date))}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        Reviewer: {item.reviewerName}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
