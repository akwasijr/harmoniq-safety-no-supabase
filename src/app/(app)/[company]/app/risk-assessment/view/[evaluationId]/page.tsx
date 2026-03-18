"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useCompanyParam } from "@/hooks/use-company-param";
import { useRiskEvaluationsStore } from "@/stores/risk-evaluations-store";
import { useLocationsStore } from "@/stores/locations-store";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "@/i18n";
import { ArrowLeft, ShieldCheck, MapPin, Calendar, User, Clock, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingPage } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";

export default function RiskAssessmentViewPage() {
  const params = useParams();
  const router = useRouter();
  const company = useCompanyParam();
  const { user } = useAuth();
  const { formatDate } = useTranslation();
  const { items: evaluations, isLoading } = useRiskEvaluationsStore();
  const { items: locations } = useLocationsStore();

  const rawId = params.evaluationId;
  const id = typeof rawId === "string" ? rawId : Array.isArray(rawId) ? rawId[0] : "";

  const evaluation = evaluations.find((e) => e.id === id);

  if (!evaluation && !isLoading) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="Assessment not found"
        description="This risk assessment may have been removed."
        action={
          <Link href={`/${company}/app/checklists?tab=risk-assessment`}>
            <Button variant="outline">Back to Safety</Button>
          </Link>
        }
      />
    );
  }

  if (!evaluation) return <LoadingPage />;

  if (evaluation.company_id !== user?.company_id) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="Assessment not found"
        description="This risk assessment may have been removed."
        action={
          <Link href={`/${company}/app/checklists?tab=risk-assessment`}>
            <Button variant="outline">Back to Safety</Button>
          </Link>
        }
      />
    );
  }

  const location = locations.find((l) => l.id === evaluation.location_id);
  const responses = (evaluation.responses || {}) as Record<string, unknown>;

  const assessmentLabels: Record<string, string> = {
    RIE: "RI&E Assessment",
    JHA: "Job Hazard Analysis",
    JSA: "Job Safety Analysis",
    SAM: "SAM Assessment",
    OSA: "OSA Assessment",
    ARBOWET: "Arbowet Compliance",
    AFS: "AFS Risk Evaluation",
  };

  const statusVariant =
    evaluation.status === "reviewed" ? "success" : evaluation.status === "submitted" ? "warning" : "secondary";

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header — not sticky, app nav is already sticky */}
      <div className="border-b bg-background">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()} aria-label="Go back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-base truncate">
              {assessmentLabels[evaluation.form_type] || evaluation.form_type}
            </h1>
          </div>
          <Badge variant={statusVariant} className="capitalize">
            {evaluation.status}
          </Badge>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Overview Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Type:</span>
              <span className="font-medium">
                {assessmentLabels[evaluation.form_type] || evaluation.form_type}
              </span>
            </div>
            {evaluation.submitted_at && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Submitted:</span>
                <span className="font-medium">
                  {formatDate(new Date(evaluation.submitted_at), {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            )}
            {location && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Location:</span>
                <span className="font-medium">{location.name}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Status:</span>
              <Badge variant={statusVariant} className="capitalize">
                {evaluation.status}
              </Badge>
            </div>
            {evaluation.reviewed_by && (
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Reviewed by:</span>
                <span className="font-medium">{evaluation.reviewed_by}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Responses Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Assessment Responses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(responses).map(([key, value]) => {
                if (key === "id" || key === "submitter_id" || key === "company_id") return null;
                // Skip empty/null/undefined values
                if (value === null || value === undefined || value === "") return null;
                if (Array.isArray(value) && value.length === 0) return null;

                // Human-readable label from camelCase or snake_case keys
                const label = key
                  .replace(/([A-Z])/g, " $1")
                  .replace(/_/g, " ")
                  .replace(/\b\w/g, (c) => c.toUpperCase())
                  .trim();

                if (Array.isArray(value)) {
                  return (
                    <div key={key} className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
                      <div className="space-y-2">
                        {value.map((item, i) => (
                          <div
                            key={i}
                            className="rounded-lg border bg-muted/20 p-3"
                          >
                            {typeof item === "object" && item !== null ? (
                              <div className="space-y-1.5">
                                {Object.entries(item as Record<string, unknown>)
                                  .filter(([, v]) => v !== null && v !== undefined && v !== "")
                                  .map(([k, v]) => {
                                    const fieldLabel = k
                                      .replace(/([A-Z])/g, " $1")
                                      .replace(/_/g, " ")
                                      .replace(/\b\w/g, (c) => c.toUpperCase())
                                      .trim();
                                    return (
                                      <div key={k} className="flex justify-between gap-2">
                                        <span className="text-xs text-muted-foreground">{fieldLabel}</span>
                                        <span className="text-xs font-medium text-right">{String(v)}</span>
                                      </div>
                                    );
                                  })}
                              </div>
                            ) : (
                              <p className="text-sm">{String(item)}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }

                if (typeof value === "object" && value !== null) {
                  const entries = Object.entries(value as Record<string, unknown>)
                    .filter(([, v]) => v !== null && v !== undefined && v !== "");
                  if (entries.length === 0) return null;
                  return (
                    <div key={key} className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
                      <div className="rounded-lg border bg-muted/20 p-3 space-y-1.5">
                        {entries.map(([k, v]) => {
                          const fieldLabel = k
                            .replace(/([A-Z])/g, " $1")
                            .replace(/_/g, " ")
                            .replace(/\b\w/g, (c) => c.toUpperCase())
                            .trim();
                          return (
                            <div key={k} className="flex justify-between gap-2">
                              <span className="text-xs text-muted-foreground">{fieldLabel}</span>
                              <span className="text-xs font-medium text-right">{String(v)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                }

                if (typeof value === "boolean") {
                  return (
                    <div key={key} className="flex items-center justify-between py-1">
                      <p className="text-sm text-muted-foreground">{label}</p>
                      <Badge variant={value ? "success" : "secondary"}>
                        {value ? "Yes" : "No"}
                      </Badge>
                    </div>
                  );
                }

                return (
                  <div key={key} className="flex items-center justify-between py-1">
                    <p className="text-sm text-muted-foreground">{label}</p>
                    <p className="text-sm font-medium text-right max-w-[60%] truncate">{String(value)}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
