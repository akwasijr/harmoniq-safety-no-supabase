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

  // Prefer locally-saved country setting (survives when DB write fails)
  const effectiveCountry = React.useMemo(() => {
    if (currentCompany?.id) {
      try {
        const raw = localStorage.getItem(`harmoniq_settings_${currentCompany.id}`);
        if (raw) {
          const saved = JSON.parse(raw);
          if (saved.selectedCountry) return saved.selectedCountry;
        }
      } catch { /* ignore */ }
    }
    return currentCompany?.country;
  }, [currentCompany?.id, currentCompany?.country]);

  const localeCountry = LOCALE_DEFAULT_COUNTRY[locale];
  const companyCountry = resolveRiskAssessmentCatalogCountry(
    effectiveCountry,
    localeCountry,
  );

  const myAssessments = React.useMemo(() => {
    if (!user) return [];
    return riskEvaluations.filter(
      (evaluation) =>
        evaluation.submitter_id === user.id &&
        // Accept matching company_id or empty/null company_id (backwards compat)
        (!evaluation.company_id || !user.company_id || evaluation.company_id === user.company_id),
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

  // Sub-tab state: "assigned" shows action items, "history" shows submissions
  const [subTab, setSubTab] = React.useState<"assigned" | "history">("assigned");
  const [historyLimit, setHistoryLimit] = React.useState(10);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [sortOrder, setSortOrder] = React.useState<"newest" | "oldest">("newest");

  // Combined history = awaiting review + reviewed, sorted
  const historyItems = React.useMemo(() => {
    const all = [
      ...awaitingReviewAssessments.map((item) => ({ ...item, historyStatus: "submitted" as const })),
      ...reviewedAssessments.map((item) => ({ ...item, historyStatus: "reviewed" as const })),
    ];
    // Filter by search
    const filtered = searchQuery.trim()
      ? all.filter(
          (item) =>
            item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.location.toLowerCase().includes(searchQuery.toLowerCase()),
        )
      : all;
    // Sort
    filtered.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });
    return filtered;
  }, [awaitingReviewAssessments, reviewedAssessments, searchQuery, sortOrder]);

  const visibleHistory = historyItems.slice(0, historyLimit);

  return (
    <div className="flex min-h-full flex-col pb-20">
      <div className="sticky top-[60px] z-10 border-b bg-background px-4 pt-4 pb-3">
        <h1 className="text-lg font-bold">{t("checklists.tabs.assessments") || "Risk Assessments"}</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("riskAssessment.workerHubHint") || "Resume drafts, start new assessments, and review submission history."}
        </p>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Stats bar */}
        <section aria-label="Assessment overview" className="grid grid-cols-3 gap-2">
          <div className="rounded-xl border bg-card p-3">
            <p className="text-[11px] text-muted-foreground">Drafts</p>
            <p className="mt-1 text-lg font-semibold">{inProgressAssessments.length}</p>
          </div>
          <div className="rounded-xl border bg-card p-3">
            <p className="text-[11px] text-muted-foreground">Awaiting</p>
            <p className="mt-1 text-lg font-semibold">{awaitingReviewAssessments.length}</p>
          </div>
          <div className="rounded-xl border bg-card p-3">
            <p className="text-[11px] text-muted-foreground">Reviewed</p>
            <p className="mt-1 text-lg font-semibold">{reviewedAssessments.length}</p>
          </div>
        </section>

        {/* Sub-tab pills */}
        <div className="flex gap-1 bg-muted/50 rounded-lg p-1">
          <button
            onClick={() => setSubTab("assigned")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-medium rounded-md transition-all active:opacity-80",
              subTab === "assigned"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground",
            )}
          >
            <FileCheck className="h-3.5 w-3.5 shrink-0" />
            <span>Assessments</span>
          </button>
          <button
            onClick={() => setSubTab("history")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-medium rounded-md transition-all active:opacity-80",
              subTab === "history"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground",
            )}
          >
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span>History</span>
          </button>
        </div>

        {/* ── ASSESSMENTS (action items) sub-tab ── */}
        {subTab === "assigned" && (
          <div className="space-y-4">
            {/* Drafts */}
            {inProgressAssessments.length > 0 && (
              <section aria-labelledby="draft-assessment-heading" className="space-y-2">
                <h2 id="draft-assessment-heading" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  In progress
                </h2>
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
              </section>
            )}

            {/* Start new assessment */}
            <section aria-labelledby="new-assessment-heading" className="space-y-2">
              <h2 id="new-assessment-heading" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {t("checklists.newAssessment") || "Start a new assessment"}
              </h2>
              <div className="grid grid-cols-2 gap-2.5">
                {riskAssessmentForms[companyCountry].map((form) => {
                  const Icon = form.icon;
                  return (
                    <Link
                      key={form.id}
                      href={`/${company}/app/risk-assessment/${form.id}`}
                      className="flex flex-col items-center gap-2.5 rounded-xl border bg-card p-4 transition-colors hover:bg-muted/30 active:bg-muted/50"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-sm">{form.name}</p>
                        <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">{form.fullName}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>

            {inProgressAssessments.length === 0 && (
              <div className="py-6 text-center">
                <FileCheck className="h-8 w-8 text-muted-foreground/20 mx-auto" aria-hidden="true" />
                <p className="text-sm text-muted-foreground mt-2">No drafts in progress</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Start a new assessment above</p>
              </div>
            )}
          </div>
        )}

        {/* ── HISTORY sub-tab ── */}
        {subTab === "history" && (
          <div className="space-y-3">
            {/* Search + sort controls */}
            <div className="flex gap-2">
              <input
                type="search"
                placeholder="Search submissions..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setHistoryLimit(10); }}
                className="flex-1 h-9 rounded-lg border bg-background px-3 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as "newest" | "oldest")}
                className="h-9 rounded-lg border bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
              </select>
            </div>

            {visibleHistory.length > 0 ? (
              <div className="space-y-2">
                {visibleHistory.map((item) => {
                  const conf = assessmentTypeConf[item.formType] || {
                    icon: ShieldCheck,
                    color: "text-muted-foreground",
                    bg: "bg-muted",
                  };
                  const TypeIcon = conf.icon;
                  const isReviewed = item.historyStatus === "reviewed";

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
                        <p className="truncate text-sm font-medium leading-tight">{item.name}</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {item.location} · {formatDate(new Date(item.date))}
                        </p>
                        {"reviewerName" in item && isReviewed && (
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            Reviewer: {(item as typeof reviewedAssessments[number]).reviewerName}
                          </p>
                        )}
                      </div>
                      <Badge
                        variant={isReviewed ? "success" : "warning"}
                        className="text-[10px] shrink-0"
                      >
                        {isReviewed ? "Reviewed" : "Awaiting"}
                      </Badge>
                    </Link>
                  );
                })}

                {/* Load more */}
                {historyLimit < historyItems.length && (
                  <button
                    onClick={() => setHistoryLimit((prev) => prev + 10)}
                    className="w-full py-2.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    Load more ({historyItems.length - historyLimit} remaining)
                  </button>
                )}
              </div>
            ) : (
              <div className="py-8 text-center">
                <Clock className="h-8 w-8 text-muted-foreground/20 mx-auto" aria-hidden="true" />
                <p className="text-sm text-muted-foreground mt-2">
                  {searchQuery ? "No matching submissions" : "No submissions yet"}
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  {searchQuery ? "Try a different search term" : "Submitted assessments will appear here"}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
