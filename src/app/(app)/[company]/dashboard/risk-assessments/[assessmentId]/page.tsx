"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useRouter, useParams } from "next/navigation";
import { LoadingPage } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";
import {
  ArrowLeft,
  ShieldAlert,
  FileCheck,
  AlertTriangle,
  CheckCircle,
  User,
  MapPin,
  Calendar,
  Lock,
  Download,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DetailTabs, Tab } from "@/components/ui/detail-tabs";
import { useTranslation } from "@/i18n";
import { useCompanyData } from "@/hooks/use-company-data";
import { useCompanyStore } from "@/stores/company-store";
import { useToast } from "@/components/ui/toast";
import { RoleGuard } from "@/components/auth/role-guard";
import { useAuth } from "@/hooks/use-auth";

// Dynamic import for PDF export (client-side only)
const PdfExportButton = dynamic(
  () => import("@/components/pdf/pdf-export-button").then(mod => mod.PdfExportButton),
  { ssr: false, loading: () => <Button variant="outline" disabled><Download className="h-4 w-4 mr-2" />Loading...</Button> }
);

const mockRiskTemplates: Record<string, {
  id: string;
  name: string;
  type: string;
  description: string;
  locked: boolean;
  sections: { name: string; description: string; fields: { label: string; type: string; required: boolean }[] }[];
}> = {};

// Risk score calculation helper
function calculateRiskScore(likelihood: number, severity: number): { score: number; level: string; color: string } {
  const score = likelihood * severity;
  if (score >= 16) return { score, level: "critical", color: "red" };
  if (score >= 10) return { score, level: "high", color: "orange" };
  if (score >= 5) return { score, level: "medium", color: "yellow" };
  return { score, level: "low", color: "green" };
}

// Compute overall risk from an array of hazards
function computeOverallRisk(hazards: { severity: number; probability: number; riskScore: number }[]): { score: number; level: string; color: string; maxSeverity: number; maxLikelihood: number } {
  if (hazards.length === 0) return { score: 0, level: "low", color: "green", maxSeverity: 0, maxLikelihood: 0 };
  const maxScore = Math.max(...hazards.map(h => h.riskScore));
  const maxSeverity = Math.max(...hazards.map(h => h.severity));
  const maxLikelihood = Math.max(...hazards.map(h => h.probability));
  const { level, color } = calculateRiskScore(maxLikelihood, maxSeverity);
  return { score: maxScore, level, color, maxSeverity, maxLikelihood };
}

// Risk level color mapping for Tailwind classes
function getRiskColorClasses(color: string): { bg: string; text: string; border: string; badgeVariant: "destructive" | "warning" | "success" | "outline" } {
  switch (color) {
    case "red": return { bg: "bg-destructive/10", text: "text-destructive", border: "border-destructive/50", badgeVariant: "destructive" };
    case "orange": return { bg: "bg-orange-500/10", text: "text-orange-600 dark:text-orange-400", border: "border-orange-500/50", badgeVariant: "destructive" };
    case "yellow": return { bg: "bg-warning/10", text: "text-warning", border: "border-warning/50", badgeVariant: "warning" };
    default: return { bg: "bg-success/10", text: "text-success", border: "border-success/50", badgeVariant: "success" };
  }
}

// Helper to get readable form type name
function getFormTypeName(formType: string): string {
  const names: Record<string, string> = {
    jha: "Job Hazard Analysis (JHA)",
    jsa: "Job Safety Analysis (JSA)",
    rie: "RI&E Assessment",
    arbowet: "Arbowet Compliance Audit",
    sam: "SAM Assessment",
    osa: "OSA Assessment",
  };
  return names[formType.toLowerCase()] || formType;
}

export default function RiskAssessmentDetailPage() {
  const router = useRouter();
  const routeParams = useParams();
  const company = routeParams.company as string;
  const assessmentId = routeParams.assessmentId as string;
  const { t, formatDate } = useTranslation();
  const [activeTab, setActiveTab] = React.useState("hazards");
  const { toast } = useToast();
  const { user } = useAuth();
  const { items: companies } = useCompanyStore();
  const currentCompany = React.useMemo(
    () => companies.find((item) => item.slug === company) ?? companies[0] ?? null,
    [companies, company]
  );

  const submissionTabs: Tab[] = [
    { id: "hazards", label: t("riskAssessment.tabs.hazards"), icon: AlertTriangle },
    { id: "controls", label: t("riskAssessment.tabs.controls"), icon: ShieldAlert },
  ];

  // Connect to stores
  const { riskEvaluations, users, locations, stores } = useCompanyData();
  const { isLoading, update: updateRiskEvaluation } = stores.riskEvaluations;

  // Check if this is a template or submission view
  // Template IDs are: jha, jsa, rie, arbowet, sam, osa
  // Submission IDs start with "ra" (e.g., ra1, ra2) or could be from the store
  const templateIds = ["jha", "jsa", "rie", "arbowet", "sam", "osa"];
  const isTemplate = templateIds.includes(assessmentId);

  // Try to find the submission in the store
  const storeEvaluation = riskEvaluations.find(re => re.id === assessmentId);
  
  // Helper to extract hazards from responses
  const parseHazards = React.useMemo(() => {
    if (!storeEvaluation?.responses) return [];
    const responses = storeEvaluation.responses as Record<string, unknown>;
    const jobSteps = responses.job_steps as Array<{ step: string; hazards: string[]; controls: string[]; severity?: number; probability?: number }> | undefined;
    if (!jobSteps || !Array.isArray(jobSteps)) return [];
    return jobSteps.map((js, idx) => ({
      step: js.step || `Step ${idx + 1}`,
      hazard: Array.isArray(js.hazards) ? js.hazards.join(", ") : String(js.hazards || ""),
      severity: js.severity ?? 3,
      probability: js.probability ?? 3,
      riskScore: (js.severity ?? 3) * (js.probability ?? 3),
      controls: Array.isArray(js.controls) ? js.controls.join("; ") : String(js.controls || ""),
    }));
  }, [storeEvaluation]);

  const parsePPE = React.useMemo(() => {
    if (!storeEvaluation?.responses) return [];
    const responses = storeEvaluation.responses as Record<string, unknown>;
    const ppe = responses.ppe_required as string[] | undefined;
    return Array.isArray(ppe) ? ppe : [];
  }, [storeEvaluation]);

  // Get the submission from the store
  const submission = !isTemplate ? (storeEvaluation ? {
    id: storeEvaluation.id,
    templateId: storeEvaluation.form_type.toLowerCase(),
    template: getFormTypeName(storeEvaluation.form_type),
    type: storeEvaluation.form_type.toUpperCase(),
    location: locations.find(l => l.id === storeEvaluation.location_id)?.name || "Unknown",
    department: "—",
    date: (storeEvaluation.submitted_at || "").split("T")[0],
    time: (storeEvaluation.submitted_at || "").split("T")[1]?.substring(0, 5) || "",
    status: storeEvaluation.status === "reviewed" ? "completed" : storeEvaluation.status === "submitted" ? "in_progress" : "draft",
    submittedBy: users.find(u => u.id === storeEvaluation.submitter_id)?.full_name || "Unknown",
    reviewedBy: storeEvaluation.reviewed_by ? users.find(u => u.id === storeEvaluation.reviewed_by)?.full_name || "Reviewer" : "Pending",
    riskLevel: "medium" as string,
    riskScore: 0,
    hazards: parseHazards,
    ppeRequired: parsePPE,
    comments: "",
    responses: storeEvaluation.responses,
    _storeData: storeEvaluation,
  } : null) : null;

  // Compute risk score from hazards when available
  const overallRisk = submission
    ? computeOverallRisk(submission.hazards)
    : { score: 0, level: "low", color: "green", maxSeverity: 0, maxLikelihood: 0 };
  const riskColors = getRiskColorClasses(overallRisk.color);
  // Use computed risk for display (prefer computed over hardcoded mock values)
  const displayRiskScore = submission ? (submission.hazards.length > 0 ? overallRisk.score : submission.riskScore) : 0;
  const displayRiskLevel = submission ? (submission.hazards.length > 0 ? overallRisk.level : submission.riskLevel) : "low";
  const displayRiskColor = submission ? (submission.hazards.length > 0 ? overallRisk.color : (
    submission.riskLevel === "high" || submission.riskLevel === "critical" ? "red" :
    submission.riskLevel === "medium" ? "yellow" : "green"
  )) : "green";
  const displayColors = getRiskColorClasses(displayRiskColor);
  
  // Get the template - either directly for template view, or via submission's templateId
  const template = isTemplate 
    ? mockRiskTemplates[assessmentId] 
    : (submission ? mockRiskTemplates[submission.templateId] : null);

  // Get all submissions for this template from the store (for template view)
  const templateSubmissions = isTemplate 
    ? riskEvaluations.filter(re => re.form_type.toLowerCase() === assessmentId)
    : [];

  if (isLoading && riskEvaluations.length === 0) {
    return <LoadingPage />;
  }

  if (!template) {
    return <EmptyState title={t("riskAssessment.notFound")} description={t("riskAssessment.notFoundDesc")} />;
  }

  if (!isTemplate && !submission) {
    return <EmptyState title={t("riskAssessment.submissionNotFound")} description={t("riskAssessment.submissionNotFoundDesc")} />;
  }

  return (
    <RoleGuard requiredPermission="checklists.view">
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push(`/${company}/dashboard/checklists?tab=risk-assessment`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold">{template.name}</h1>
              {template.locked && (
                <span className="text-sm text-muted-foreground inline-flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  {t("riskAssessment.standard")}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {template.description}
            </p>
            {submission && (
              <div className="flex items-center gap-4 mt-2">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {submission.location}
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <User className="h-3 w-3" /> {submission.submittedBy}
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> {formatDate(submission.date)}
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {submission && (
            <PdfExportButton
              data={{
                id: submission.id,
                templateId: submission.templateId,
                templateType: submission.type as "JHA" | "JSA" | "RIE" | "ARBOWET" | "SAM" | "OSA",
                companyName: currentCompany.name,
                location: submission.location,
                department: submission.department,
                date: submission.date,
                time: submission.time || undefined,
                submittedBy: submission.submittedBy,
                reviewedBy: typeof submission.reviewedBy === "string" ? submission.reviewedBy : undefined,
                hazards: submission.hazards,
                ppeRequired: submission.ppeRequired,
                additionalNotes: submission.comments,
              }}
            />
          )}
          {/* Approval buttons for submitted assessments from store */}
          {submission && "_storeData" in submission && submission._storeData && submission._storeData.status === "submitted" && (
            <>
              <Button 
                variant="outline" 
                className="gap-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => {
                  if ("_storeData" in submission && submission._storeData) {
                    updateRiskEvaluation(submission._storeData.id, {
                      status: "draft", // Send back for revision
                    });
                    toast(t("riskAssessment.returnedForRevision"), "info");
                  }
                }}
              >
                <XCircle className="h-4 w-4" /> {t("riskAssessment.requestRevision")}
              </Button>
              <Button 
                className="gap-2"
                onClick={() => {
                    if ("_storeData" in submission && submission._storeData) {
                      updateRiskEvaluation(submission._storeData.id, {
                        status: "reviewed",
                        reviewed_by: user?.id ?? submission._storeData.reviewed_by,
                        reviewed_at: new Date().toISOString(),
                      });
                      toast(t("riskAssessment.approvedSuccess"), "success");
                  }
                }}
              >
                <CheckCircle className="h-4 w-4" /> {t("riskAssessment.approve")}
              </Button>
            </>
          )}
          {/* Show reviewed badge for already reviewed assessments */}
          {submission && "_storeData" in submission && submission._storeData && submission._storeData.status === "reviewed" && (
            <Badge variant="success" className="gap-1 py-1.5 px-3">
              <CheckCircle className="h-3 w-3" /> {t("riskAssessment.approved")}
            </Badge>
          )}
          {isTemplate && (
            <Button className="gap-2">
              <FileCheck className="h-4 w-4" /> {t("riskAssessment.startAssessment")}
            </Button>
          )}
        </div>
      </div>

      {/* Risk Score Summary Card */}
      {submission && (
        <Card className={displayColors.border}>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-full ${displayColors.bg}`}>
                  <ShieldAlert className={`h-6 w-6 ${displayColors.text}`} />
                </div>
                <div>
                  <p className="font-medium">{t("riskAssessment.riskScoreLabel")}</p>
                  <p className="text-sm text-muted-foreground">{t("riskAssessment.hazardsIdentified", { count: String(submission.hazards.length) })}</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className={`text-2xl font-bold ${displayColors.text}`}>{displayRiskScore}</p>
                  <p className="text-xs text-muted-foreground">{t("riskAssessment.riskScoreLabel")}</p>
                </div>
                <div className="text-center">
                  <Badge variant={displayColors.badgeVariant} className="text-sm px-3 py-1">
                    {t(`riskAssessment.${displayRiskLevel}`)}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">{t("riskAssessment.riskLevelLabel")}</p>
                </div>
                <span className="text-sm text-muted-foreground">
                  {submission.status === "completed" ? t("checklists.labels.completed") : submission.status === "in_progress" ? t("checklists.labels.inProgress") : t("checklists.labels.pending")}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Risk Matrix Summary */}
      {submission && submission.hazards.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("riskAssessment.riskScoreLabel")}: {t("riskAssessment.riskMatrix")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
              {submission.hazards.map((hazard, idx) => {
                const hazardRisk = calculateRiskScore(hazard.probability, hazard.severity);
                const hColors = getRiskColorClasses(hazardRisk.color);
                return (
                  <div key={idx} className={`p-4 rounded-lg border ${hColors.border}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium truncate flex-1">{hazard.step}</span>
                      <Badge variant={hColors.badgeVariant} className="ml-2">{hazardRisk.score}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <div>
                        <span>{t("riskAssessment.likelihood")}</span>
                        <p className="font-medium text-foreground">{hazard.probability}/5</p>
                      </div>
                      <div>
                        <span>{t("riskAssessment.severity")}</span>
                        <p className="font-medium text-foreground">{hazard.severity}/5</p>
                      </div>
                    </div>
                    <p className={`text-xs font-medium mt-2 ${hColors.text}`}>{t(`riskAssessment.${hazardRisk.level}`)}</p>
                  </div>
                );
              })}
            </div>
            {/* Risk level legend */}
            <div className="flex items-center gap-4 pt-4 border-t text-xs">
              <span className="text-muted-foreground">{t("riskAssessment.riskLevelLabel")}:</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-success inline-block" /> {t("riskAssessment.low")} (1-4)</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-warning inline-block" /> {t("riskAssessment.medium")} (5-9)</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-orange-500 inline-block" /> {t("riskAssessment.high")} (10-15)</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-destructive inline-block" /> {t("riskAssessment.critical")} (16-25)</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs - Only for submissions */}
      {submission && (
        <DetailTabs 
          tabs={submissionTabs} 
          activeTab={activeTab} 
          onTabChange={setActiveTab} 
        />
      )}

      {/* Template View - Form Structure (no submissions list here, they're in main list) */}
      {isTemplate && (
        <div className="space-y-4">
          {template.sections.map((section, sectionIdx) => (
            <Card key={sectionIdx}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                    {sectionIdx + 1}
                  </span>
                  <div>
                    <CardTitle className="text-base">{section.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{section.description}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {section.fields.map((field, fieldIdx) => (
                    <div key={fieldIdx} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground">{fieldIdx + 1}.</span>
                        <span className="font-medium">{field.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{field.type.replace("_", " ")}</Badge>
                        {field.required && <Badge variant="secondary" className="text-xs">Required</Badge>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Submission View - Hazards */}
      {submission && activeTab === "hazards" && (
        <div className="space-y-4">
          {submission.hazards.map((hazard, idx) => {
            const hazardRisk = calculateRiskScore(hazard.probability, hazard.severity);
            const hColors = getRiskColorClasses(hazardRisk.color);
            return (
            <Card key={idx} className={hColors.border}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-medium">
                      {idx + 1}
                    </span>
                    <div>
                      <CardTitle className="text-base">{hazard.step}</CardTitle>
                      <p className="text-sm text-muted-foreground">{hazard.hazard}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={hColors.badgeVariant} className="text-lg px-4 py-1">
                      {hazardRisk.score}
                    </Badge>
                    <Badge variant="outline" className={hColors.text}>
                      {t(`riskAssessment.${hazardRisk.level}`)}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-3 mb-4">
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <p className="text-xs text-muted-foreground">{t("riskAssessment.severity")}</p>
                    <p className="text-xl font-bold">{hazard.severity}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <p className="text-xs text-muted-foreground">{t("riskAssessment.likelihood")}</p>
                    <p className="text-xl font-bold">{hazard.probability}</p>
                  </div>
                  <div className={`p-3 rounded-lg text-center ${hColors.bg}`}>
                    <p className="text-xs text-muted-foreground">{t("riskAssessment.riskScoreLabel")}</p>
                    <p className={`text-xl font-bold ${hColors.text}`}>{hazard.severity} × {hazard.probability} = {hazardRisk.score}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("riskAssessment.controlMeasures")}</p>
                  <p className="mt-1">{hazard.controls}</p>
                </div>
              </CardContent>
            </Card>
            );
          })}
        </div>
      )}

      {/* Submission View - Controls */}
      {submission && activeTab === "controls" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("riskAssessment.controlMeasuresSummary")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {submission.hazards.map((hazard, idx) => (
                  <div key={idx} className="p-4 rounded-lg border">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium">{hazard.step}</p>
                      <Badge variant={hazard.riskScore >= 12 ? "destructive" : hazard.riskScore >= 6 ? "warning" : "success"}>
                        {t("riskAssessment.riskLabel")}: {hazard.riskScore}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{hazard.controls}</p>
                  </div>
                ))}
                {submission.hazards.length === 0 && (
                  <p className="text-sm text-muted-foreground py-4 text-center">{t("riskAssessment.hazardsIdentified", { count: "0" })}</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("riskAssessment.requiredPPE")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {submission.ppeRequired.map((ppe, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 rounded-lg border">
                    <CheckCircle className="h-5 w-5 text-success" />
                    <span>{ppe}</span>
                  </div>
                ))}
                {submission.ppeRequired.length === 0 && (
                  <p className="text-sm text-muted-foreground py-4 text-center">{t("common.none")}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
    </RoleGuard>
  );
}
