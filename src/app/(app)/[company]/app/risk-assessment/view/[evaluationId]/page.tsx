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
      {/* Header */}
      <div className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()} aria-label="Go back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-base truncate">
              {assessmentLabels[evaluation.form_type] || evaluation.form_type}
            </h1>
            <p className="text-xs text-muted-foreground">{evaluation.form_type} Assessment</p>
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

                const label = key
                  .replace(/([A-Z])/g, " $1")
                  .replace(/_/g, " ")
                  .replace(/^\w/, (c) => c.toUpperCase())
                  .trim();

                if (Array.isArray(value)) {
                  return (
                    <div key={key} className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">{label}</p>
                      <div className="rounded-lg bg-muted/30 p-3 space-y-2">
                        {value.map((item, i) => (
                          <div
                            key={i}
                            className="text-sm border-b border-muted last:border-0 pb-2 last:pb-0"
                          >
                            {typeof item === "object" && item !== null ? (
                              <div className="space-y-1">
                                {Object.entries(item as Record<string, unknown>).map(([k, v]) => (
                                  <div key={k} className="flex gap-2">
                                    <span className="text-xs text-muted-foreground capitalize min-w-[80px]">
                                      {k.replace(/_/g, " ")}:
                                    </span>
                                    <span className="text-xs">{String(v)}</span>
                                  </div>
                                ))}
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
                  return (
                    <div key={key} className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">{label}</p>
                      <div className="rounded-lg bg-muted/30 p-3 space-y-1">
                        {Object.entries(value as Record<string, unknown>).map(([k, v]) => (
                          <div key={k} className="flex gap-2 text-sm">
                            <span className="text-xs text-muted-foreground capitalize min-w-[80px]">
                              {k.replace(/_/g, " ")}:
                            </span>
                            <span className="text-xs">{String(v)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }

                if (typeof value === "boolean") {
                  return (
                    <div key={key} className="flex items-center justify-between">
                      <p className="text-xs font-medium text-muted-foreground">{label}</p>
                      <Badge variant={value ? "success" : "secondary"}>
                        {value ? "Yes" : "No"}
                      </Badge>
                    </div>
                  );
                }

                return (
                  <div key={key} className="space-y-0.5">
                    <p className="text-xs font-medium text-muted-foreground">{label}</p>
                    <p className="text-sm">{String(value)}</p>
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
