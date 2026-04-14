"use client";

import * as React from "react";
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
import { useTranslation } from "@/i18n";
import { useCompanyData } from "@/hooks/use-company-data";
import { useToast } from "@/components/ui/toast";
import { RoleGuard } from "@/components/auth/role-guard";
import { useAuth } from "@/hooks/use-auth";

const baseRiskTemplates: Record<string, {
  id: string;
  name: string;
  type: string;
  description: string;
  locked: boolean;
  sections: { name: string; description: string; fields: { label: string; type: string; required: boolean }[] }[];
}> = {
  jha: {
    id: "jha",
    name: "Job Hazard Analysis (JHA)",
    type: "jha",
    description: "Break work into steps, identify hazards, and capture controls before work starts.",
    locked: true,
    sections: [
      {
        name: "Task breakdown",
        description: "List each work step and identify the main hazards.",
        fields: [
          { label: "Work step", type: "text", required: true },
          { label: "Hazards", type: "text", required: true },
          { label: "Controls", type: "text", required: true },
        ],
      },
    ],
  },
  jsa: {
    id: "jsa",
    name: "Job Safety Analysis (JSA)",
    type: "jsa",
    description: "Review job steps, controls, and residual risk before execution.",
    locked: true,
    sections: [
      {
        name: "Safety analysis",
        description: "Capture hazards, likelihood, severity, and controls for each step.",
        fields: [
          { label: "Job step", type: "text", required: true },
          { label: "Risk rating", type: "number", required: true },
          { label: "Control measures", type: "text", required: true },
        ],
      },
    ],
  },
  rie: {
    id: "rie",
    name: "RI&E Assessment",
    type: "rie",
    description: "Document hazards, controls, and compliance measures for the work area.",
    locked: true,
    sections: [
      {
        name: "Hazards and controls",
        description: "Summarize hazards, control measures, and affected people.",
        fields: [
          { label: "Hazard", type: "text", required: true },
          { label: "Controls", type: "text", required: true },
          { label: "Affected workers", type: "text", required: false },
        ],
      },
    ],
  },
  arbowet: {
    id: "arbowet",
    name: "Arbowet Compliance Audit",
    type: "arbowet",
    description: "Review compliance controls, hazards, and mitigation measures.",
    locked: true,
    sections: [
      {
        name: "Compliance review",
        description: "Capture obligations, gaps, and corrective controls.",
        fields: [
          { label: "Requirement", type: "text", required: true },
          { label: "Current control", type: "text", required: true },
          { label: "Action needed", type: "text", required: false },
        ],
      },
    ],
  },
  sam: {
    id: "sam",
    name: "SAM Assessment",
    type: "sam",
    description: "Assess worksite hazards, controls, and supporting PPE.",
    locked: true,
    sections: [
      {
        name: "Assessment",
        description: "Record hazards, controls, and PPE requirements.",
        fields: [
          { label: "Hazard", type: "text", required: true },
          { label: "Control", type: "text", required: true },
          { label: "PPE", type: "text", required: false },
        ],
      },
    ],
  },
  osa: {
    id: "osa",
    name: "OSA Assessment",
    type: "osa",
    description: "Capture operating risks, controls, and safe work precautions.",
    locked: true,
    sections: [
      {
        name: "Operating risk review",
        description: "Summarize the operating hazards and key controls.",
        fields: [
          { label: "Risk", type: "text", required: true },
          { label: "Control", type: "text", required: true },
          { label: "Residual risk", type: "number", required: false },
        ],
      },
    ],
  },
};

function buildRiskTemplate(formType: string, responses?: Record<string, unknown>) {
  const normalizedType = formType.toLowerCase();
  const baseTemplate = baseRiskTemplates[normalizedType];

  if (baseTemplate) return baseTemplate;

  const jobSteps = responses?.job_steps as Array<{ step?: string; hazards?: string[]; controls?: string[] }> | undefined;
  const hasJobSteps = Array.isArray(jobSteps) && jobSteps.length > 0;

  return {
    id: normalizedType,
    name: getFormTypeName(formType),
    type: normalizedType,
    description: "Review the submitted hazards, controls, and supporting details for this assessment.",
    locked: false,
    sections: [
      {
        name: "Assessment overview",
        description: hasJobSteps
          ? "Submitted job steps and controls are available in the hazards and controls tabs."
          : "Submitted risk details are available in the assessment tabs.",
        fields: [
          { label: "Hazards", type: "text", required: true },
          { label: "Controls", type: "text", required: true },
          { label: "PPE", type: "text", required: false },
        ],
      },
    ],
  };
}

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
  const { user, currentCompany } = useAuth();

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

  const submittedAt = storeEvaluation?.submitted_at || storeEvaluation?.created_at || "";

  // Parse ALL flat responses (key-value pairs from the dashboard form)
  const flatResponses = React.useMemo(() => {
    if (!storeEvaluation?.responses) return [];
    const responses = storeEvaluation.responses as Record<string, unknown>;
    // Human-readable label mapping for known form field IDs
    const labelMap: Record<string, string> = {
      job_title: "Job/Task Title", location: "Work Location", date: "Date",
      analyst: "Analyst", task_name: "Task Name", department: "Department",
      supervisor: "Supervisor", workplace: "Workplace", assessor: "Assessor",
      company: "Company", inspector: "Inspector",
      hazard_1: "Struck-by hazards", hazard_2: "Fall hazards",
      hazard_3: "Caught-in/between hazards", hazard_4: "Electrical hazards",
      hazard_5: "Chemical hazards",
      ppe_required: "PPE Required", controls: "Control measures",
      additional_notes: "Additional notes", severity: "Severity",
      likelihood: "Likelihood", hazard_desc: "Hazard description",
      physical: "Physical risks", chemical: "Chemical risks",
      ergonomic: "Ergonomic risks", psychosocial: "Psychosocial risks",
      measures: "Required measures", priority: "Priority",
      physical_risks: "Physical risks", organizational_risks: "Organizational risks",
      social_risks: "Social risks", actions: "Planned actions",
      responsible: "Responsible person", deadline: "Deadline",
      art3: "Art. 3 – Arbobeleid", art5: "Art. 5 – RI&E",
      art8: "Art. 8 – Voorlichting", art13: "Art. 13 – BHV",
      art14: "Art. 14 – Arbodienst",
      findings: "Findings", action: "Required action",
      workload: "Workload manageable", work_hours: "Working hours reasonable",
      resources: "Adequate resources", support: "Social support available",
      harassment: "Harassment concerns", balance: "Krav/resources balance",
      recovery: "Recovery opportunity",
    };
    return Object.entries(responses)
      .filter(([key]) => key !== "job_steps" && key !== "ppe_required")
      .map(([key, value]) => ({
        key,
        label: labelMap[key] || key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
        value: value === "yes" ? "Yes" : value === "no" ? "No" : value === "n/a" ? "N/A" : String(value ?? "—"),
        isYes: value === "yes",
        isNo: value === "no",
        isRating: typeof value === "string" && /^[1-5]$/.test(value),
      }));
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
    ? buildRiskTemplate(assessmentId)
    : (submission ? buildRiskTemplate(submission.templateId, submission.responses as Record<string, unknown>) : null);

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
            <Button
              variant="outline"
              className="gap-2"
              onClick={async () => {
                try {
                  const { RiskAssessmentResponsesPDF, downloadPDF } = await import("@/lib/pdf-export");
                  const doc = <RiskAssessmentResponsesPDF
                    companyName={currentCompany?.name || company}
                    templateName={template?.name || "Risk Assessment"}
                    formType={submission.type}
                    submittedBy={submission.submittedBy}
                    location={submission.location}
                    date={submission.date}
                    responses={flatResponses}
                    hazards={submission.hazards}
                  />;
                  const datePart = submission.date || new Date().toISOString().split("T")[0];
                  await downloadPDF(doc, `risk-assessment-${template?.type || "report"}-${datePart}.pdf`);
                } catch {
                  // silently fail
                }
              }}
            >
              <Download className="h-4 w-4" />
              Export PDF
            </Button>
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

      {/* Template View - Form Structure */}
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

      {/* All Responses — flat key-value pairs from the form */}
      {submission && flatResponses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">All Responses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {flatResponses.map((r) => (
                <div
                  key={r.key}
                  className={`flex items-start gap-4 p-3 rounded-lg border ${
                    r.isNo ? "border-destructive/50 bg-destructive/5" : "border-muted"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{r.label}</p>
                  </div>
                  <Badge
                    variant={
                      r.isYes ? "success"
                        : r.isNo ? "destructive"
                        : r.isRating ? "warning"
                        : "outline"
                    }
                  >
                    {r.value}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hazard details (structured job_steps data) */}
      {submission && submission.hazards.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("riskAssessment.tabs.hazards")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {submission.hazards.map((hazard, idx) => {
              const hazardRisk = calculateRiskScore(hazard.probability, hazard.severity);
              const hColors = getRiskColorClasses(hazardRisk.color);
              return (
                <div key={idx} className={`p-4 rounded-lg border ${hColors.border}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center justify-center w-7 h-7 rounded-full bg-muted text-xs font-medium">
                        {idx + 1}
                      </span>
                      <div>
                        <p className="font-medium">{hazard.step}</p>
                        <p className="text-sm text-muted-foreground">{hazard.hazard}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={hColors.badgeVariant}>{hazardRisk.score}</Badge>
                      <Badge variant="outline" className={hColors.text}>{t(`riskAssessment.${hazardRisk.level}`)}</Badge>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3 mb-3">
                    <div className="p-2.5 rounded-lg bg-muted/50 text-center">
                      <p className="text-xs text-muted-foreground">{t("riskAssessment.severity")}</p>
                      <p className="text-lg font-bold">{hazard.severity}</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-muted/50 text-center">
                      <p className="text-xs text-muted-foreground">{t("riskAssessment.likelihood")}</p>
                      <p className="text-lg font-bold">{hazard.probability}</p>
                    </div>
                    <div className={`p-2.5 rounded-lg text-center ${hColors.bg}`}>
                      <p className="text-xs text-muted-foreground">{t("riskAssessment.riskScoreLabel")}</p>
                      <p className={`text-lg font-bold ${hColors.text}`}>{hazardRisk.score}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t("riskAssessment.controlMeasures")}</p>
                    <p className="mt-1 text-sm">{hazard.controls}</p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Controls & PPE summary */}
      {submission && (submission.hazards.length > 0 || submission.ppeRequired.length > 0) && (
        <div className="grid gap-6 lg:grid-cols-2">
          {submission.hazards.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("riskAssessment.controlMeasuresSummary")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {submission.hazards.map((hazard, idx) => (
                  <div key={idx} className="p-3 rounded-lg border">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium text-sm">{hazard.step}</p>
                      <Badge variant={hazard.riskScore >= 12 ? "destructive" : hazard.riskScore >= 6 ? "warning" : "success"}>
                        {t("riskAssessment.riskLabel")}: {hazard.riskScore}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{hazard.controls}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          {submission.ppeRequired.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("riskAssessment.requiredPPE")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {submission.ppeRequired.map((ppe, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 rounded-lg border">
                    <CheckCircle className="h-4 w-4 text-success shrink-0" />
                    <span className="text-sm">{ppe}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
    </RoleGuard>
  );
}
