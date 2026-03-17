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
  Clock,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DetailTabs, Tab } from "@/components/ui/detail-tabs";
import { getCurrentCompany } from "@/mocks/data";
import { useTranslation } from "@/i18n";
import { useRiskEvaluationsStore } from "@/stores/risk-evaluations-store";
import { useUsersStore } from "@/stores/users-store";
import { useLocationsStore } from "@/stores/locations-store";
import { useToast } from "@/components/ui/toast";
import { RoleGuard } from "@/components/auth/role-guard";

// Dynamic import for PDF export (client-side only)
const PdfExportButton = dynamic(
  () => import("@/components/pdf/pdf-export-button").then(mod => mod.PdfExportButton),
  { ssr: false, loading: () => <Button variant="outline" disabled><Download className="h-4 w-4 mr-2" />Loading...</Button> }
);

// Get current company for PDF export
const currentCompany = getCurrentCompany();

// Mock data for templates
const mockRiskTemplates: Record<string, {
  id: string;
  name: string;
  type: string;
  description: string;
  locked: boolean;
  sections: { name: string; description: string; fields: { label: string; type: string; required: boolean }[] }[];
}> = {
  "jha": {
    id: "jha",
    name: "Job Hazard Analysis (JHA)",
    
    type: "JHA",
    description: "OSHA-compliant step-by-step task analysis with hazard identification and control hierarchy",
    locked: true,
    sections: [
      {
        name: "Job Information",
        description: "Basic information about the job being analyzed",
        fields: [
          { label: "Job/Task Title", type: "text", required: true },
          { label: "Department", type: "select", required: true },
          { label: "Location", type: "location", required: true },
          { label: "Date of Analysis", type: "date", required: true },
          { label: "Analyst Name", type: "text", required: true },
        ],
      },
      {
        name: "Task Breakdown",
        description: "Break down the job into individual steps",
        fields: [
          { label: "Step Number", type: "number", required: true },
          { label: "Step Description", type: "textarea", required: true },
          { label: "Potential Hazards", type: "multi-select", required: true },
          { label: "Hazard Description", type: "textarea", required: false },
        ],
      },
      {
        name: "Risk Assessment",
        description: "Evaluate severity and probability",
        fields: [
          { label: "Severity (1-5)", type: "rating", required: true },
          { label: "Probability (1-5)", type: "rating", required: true },
          { label: "Risk Score", type: "calculated", required: true },
          { label: "Risk Level", type: "calculated", required: true },
        ],
      },
      {
        name: "Control Measures",
        description: "Define controls using the hierarchy",
        fields: [
          { label: "Elimination Controls", type: "textarea", required: false },
          { label: "Substitution Controls", type: "textarea", required: false },
          { label: "Engineering Controls", type: "textarea", required: false },
          { label: "Administrative Controls", type: "textarea", required: false },
          { label: "PPE Required", type: "multi-select", required: true },
        ],
      },
      {
        name: "Approval",
        description: "Supervisor review and approval",
        fields: [
          { label: "Reviewed By", type: "text", required: true },
          { label: "Supervisor Signature", type: "signature", required: true },
          { label: "Approval Date", type: "date", required: true },
        ],
      },
    ],
  },
  "rie": {
    id: "rie",
    name: "RI&E Assessment",
    
    type: "RIE",
    description: "Risico-Inventarisatie en -Evaluatie (Risk Inventory & Evaluation) per Arbowet",
    locked: true,
    sections: [
      {
        name: "Bedrijfsgegevens (Company Information)",
        description: "Basic company and assessment information",
        fields: [
          { label: "Bedrijfsnaam", type: "text", required: true },
          { label: "Afdeling", type: "text", required: true },
          { label: "Locatie", type: "location", required: true },
          { label: "Datum beoordeling", type: "date", required: true },
          { label: "Beoordelaar", type: "text", required: true },
        ],
      },
      {
        name: "Risico-identificatie (Risk Identification)",
        description: "Identify workplace risks by category",
        fields: [
          { label: "Fysieke risico's", type: "checklist", required: true },
          { label: "Chemische risico's", type: "checklist", required: true },
          { label: "Biologische risico's", type: "checklist", required: true },
          { label: "Ergonomische risico's", type: "checklist", required: true },
          { label: "Psychosociale risico's", type: "checklist", required: true },
        ],
      },
      {
        name: "Risico-evaluatie (Risk Evaluation)",
        description: "Evaluate each identified risk",
        fields: [
          { label: "Ernst (Severity 1-5)", type: "rating", required: true },
          { label: "Waarschijnlijkheid (Probability 1-5)", type: "rating", required: true },
          { label: "Blootstelling (Exposure)", type: "select", required: true },
          { label: "Risicoscore", type: "calculated", required: true },
          { label: "Prioriteit", type: "calculated", required: true },
        ],
      },
      {
        name: "Beheersmaatregelen (Control Measures)",
        description: "Define actions to control risks",
        fields: [
          { label: "Huidige maatregelen", type: "textarea", required: true },
          { label: "Aanvullende maatregelen", type: "textarea", required: true },
          { label: "Verantwoordelijke", type: "text", required: true },
          { label: "Deadline", type: "date", required: true },
        ],
      },
      {
        name: "Plan van Aanpak (Action Plan)",
        description: "Document the action plan",
        fields: [
          { label: "Actie", type: "textarea", required: true },
          { label: "Prioriteit", type: "select", required: true },
          { label: "Status", type: "select", required: true },
          { label: "Evaluatiedatum", type: "date", required: true },
        ],
      },
      {
        name: "Ondertekening (Signature)",
        description: "Management approval",
        fields: [
          { label: "Goedgekeurd door", type: "text", required: true },
          { label: "Handtekening", type: "signature", required: true },
          { label: "Datum", type: "date", required: true },
        ],
      },
    ],
  },
  "sam": {
    id: "sam",
    name: "SAM Assessment",
    
    type: "SAM",
    description: "Systematiskt Arbetsmiljöarbete (Systematic Work Environment Management)",
    locked: true,
    sections: [
      {
        name: "Grundinformation (Basic Information)",
        description: "Company and assessment details",
        fields: [
          { label: "Företagsnamn", type: "text", required: true },
          { label: "Avdelning", type: "text", required: true },
          { label: "Plats", type: "location", required: true },
          { label: "Datum", type: "date", required: true },
          { label: "Ansvarig", type: "text", required: true },
        ],
      },
      {
        name: "Fysisk Arbetsmiljö (Physical Environment)",
        description: "Physical work environment risks",
        fields: [
          { label: "Buller (Noise)", type: "rating", required: true },
          { label: "Belysning (Lighting)", type: "rating", required: true },
          { label: "Temperatur", type: "rating", required: true },
          { label: "Ergonomi", type: "rating", required: true },
          { label: "Maskiner och utrustning", type: "checklist", required: true },
        ],
      },
      {
        name: "Psykosocial Arbetsmiljö (Psychosocial Environment)",
        description: "Psychosocial work environment assessment",
        fields: [
          { label: "Arbetsbelastning (Workload)", type: "rating", required: true },
          { label: "Kontroll över arbetet", type: "rating", required: true },
          { label: "Socialt stöd", type: "rating", required: true },
          { label: "Arbetstider", type: "rating", required: true },
          { label: "Kränkande särbehandling", type: "yes_no", required: true },
        ],
      },
      {
        name: "Riskbedömning (Risk Assessment)",
        description: "Evaluate identified risks",
        fields: [
          { label: "Allvarlighetsgrad (Severity 1-5)", type: "rating", required: true },
          { label: "Sannolikhet (Probability 1-5)", type: "rating", required: true },
          { label: "Riskpoäng", type: "calculated", required: true },
          { label: "Risknivå", type: "calculated", required: true },
        ],
      },
      {
        name: "Åtgärder (Actions)",
        description: "Control measures and actions",
        fields: [
          { label: "Befintliga åtgärder", type: "textarea", required: true },
          { label: "Nya åtgärder", type: "textarea", required: true },
          { label: "Ansvarig person", type: "text", required: true },
          { label: "Deadline", type: "date", required: true },
        ],
      },
      {
        name: "Uppföljning (Follow-up)",
        description: "Review and follow-up plan",
        fields: [
          { label: "Uppföljningsdatum", type: "date", required: true },
          { label: "Utvärdering av åtgärder", type: "textarea", required: false },
          { label: "Nästa granskning", type: "date", required: true },
        ],
      },
      {
        name: "Godkännande (Approval)",
        description: "Management sign-off",
        fields: [
          { label: "Godkänd av", type: "text", required: true },
          { label: "Signatur", type: "signature", required: true },
          { label: "Datum", type: "date", required: true },
        ],
      },
    ],
  },
  "jsa": {
    id: "jsa",
    name: "Job Safety Analysis (JSA)",
    
    type: "JSA",
    description: "Task-based safety analysis for specific job roles and activities",
    locked: true,
    sections: [
      {
        name: "Job Information",
        description: "Details about the job and analysis",
        fields: [
          { label: "Job/Task Title", type: "text", required: true },
          { label: "Department", type: "select", required: true },
          { label: "Location", type: "location", required: true },
          { label: "Analysis Date", type: "date", required: true },
          { label: "Prepared By", type: "text", required: true },
        ],
      },
      {
        name: "Sequence of Basic Job Steps",
        description: "List each step in the sequence performed",
        fields: [
          { label: "Step Number", type: "number", required: true },
          { label: "Basic Job Step", type: "textarea", required: true },
        ],
      },
      {
        name: "Potential Hazards",
        description: "Identify hazards for each step",
        fields: [
          { label: "Hazard Type", type: "multi-select", required: true },
          { label: "Hazard Description", type: "textarea", required: true },
          { label: "Severity (1-5)", type: "rating", required: true },
          { label: "Probability (1-5)", type: "rating", required: true },
        ],
      },
      {
        name: "Recommended Actions",
        description: "Actions to eliminate or reduce hazards",
        fields: [
          { label: "Recommended Action", type: "textarea", required: true },
          { label: "Responsible Person", type: "text", required: true },
          { label: "Completion Date", type: "date", required: true },
          { label: "PPE Required", type: "multi-select", required: true },
        ],
      },
    ],
  },
  "arbowet": {
    id: "arbowet",
    name: "Arbowet Compliance Audit",
    
    type: "ARBOWET",
    description: "Dutch Working Conditions Act compliance check (Articles 3, 5, 8, 13, 14)",
    locked: true,
    sections: [
      {
        name: "Algemene Gegevens (General Information)",
        description: "Company and assessment details",
        fields: [
          { label: "Bedrijfsnaam", type: "text", required: true },
          { label: "Vestigingsadres", type: "text", required: true },
          { label: "Datum controle", type: "date", required: true },
          { label: "Controleur", type: "text", required: true },
        ],
      },
      {
        name: "Arbowet Artikelen",
        description: "Compliance with specific Arbowet articles",
        fields: [
          { label: "Art. 3 - Arbobeleid", type: "checklist", required: true },
          { label: "Art. 5 - RI&E aanwezig", type: "yes_no", required: true },
          { label: "Art. 8 - Voorlichting gegeven", type: "yes_no", required: true },
          { label: "Art. 13 - BHV geregeld", type: "yes_no", required: true },
          { label: "Art. 14 - Arbodienst ingeschakeld", type: "yes_no", required: true },
        ],
      },
      {
        name: "Bevindingen (Findings)",
        description: "Document compliance gaps",
        fields: [
          { label: "Geconstateerde tekortkomingen", type: "textarea", required: true },
          { label: "Ernst van afwijking", type: "rating", required: true },
          { label: "Vereiste actie", type: "textarea", required: true },
          { label: "Deadline", type: "date", required: true },
        ],
      },
      {
        name: "Conclusie (Conclusion)",
        description: "Overall compliance assessment",
        fields: [
          { label: "Algemene beoordeling", type: "select", required: true },
          { label: "Opmerkingen", type: "textarea", required: false },
          { label: "Handtekening controleur", type: "signature", required: true },
        ],
      },
    ],
  },
  "osa": {
    id: "osa",
    name: "OSA - Psykosocial Riskbedömning",
    
    type: "OSA",
    description: "Organisatorisk och Social Arbetsmiljö per AFS 2015:4",
    locked: true,
    sections: [
      {
        name: "Grundinformation",
        description: "Basic assessment information",
        fields: [
          { label: "Företag", type: "text", required: true },
          { label: "Arbetsplats", type: "text", required: true },
          { label: "Datum", type: "date", required: true },
          { label: "Utförare", type: "text", required: true },
        ],
      },
      {
        name: "Organisatorisk Arbetsmiljö",
        description: "Organizational work environment (AFS 2015:4)",
        fields: [
          { label: "Arbetsbelastning", type: "rating", required: true },
          { label: "Arbetstid", type: "rating", required: true },
          { label: "Krav och resurser balans", type: "rating", required: true },
          { label: "Möjlighet till återhämtning", type: "rating", required: true },
        ],
      },
      {
        name: "Social Arbetsmiljö",
        description: "Social work environment factors",
        fields: [
          { label: "Socialt stöd från kollegor", type: "rating", required: true },
          { label: "Socialt stöd från chef", type: "rating", required: true },
          { label: "Förekomst av kränkande särbehandling", type: "yes_no", required: true },
          { label: "Konflikter på arbetsplatsen", type: "yes_no", required: true },
        ],
      },
      {
        name: "Riskbedömning",
        description: "Risk evaluation",
        fields: [
          { label: "Identifierade risker", type: "textarea", required: true },
          { label: "Allvarlighetsgrad (1-5)", type: "rating", required: true },
          { label: "Sannolikhet (1-5)", type: "rating", required: true },
          { label: "Risknivå", type: "calculated", required: true },
        ],
      },
      {
        name: "Åtgärdsplan",
        description: "Action plan",
        fields: [
          { label: "Planerade åtgärder", type: "textarea", required: true },
          { label: "Ansvarig", type: "text", required: true },
          { label: "Deadline", type: "date", required: true },
          { label: "Uppföljning", type: "date", required: true },
        ],
      },
    ],
  },
};

const submissionTabs: Tab[] = [
  { id: "hazards", label: "Hazards & Risks", icon: AlertTriangle },
  { id: "controls", label: "Controls", icon: ShieldAlert },
];

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
  const [reviewNotes, setReviewNotes] = React.useState("");
  const { toast } = useToast();

  // Connect to stores
  const { items: riskEvaluations, isLoading, update: updateRiskEvaluation } = useRiskEvaluationsStore();
  const { items: users } = useUsersStore();
  const { items: locations } = useLocationsStore();

  // Check if this is a template or submission view
  // Template IDs are: jha, jsa, rie, arbowet, sam, osa
  // Submission IDs start with "ra" (e.g., ra1, ra2) or could be from the store
  const templateIds = ["jha", "jsa", "rie", "arbowet", "sam", "osa"];
  const isTemplate = templateIds.includes(assessmentId);

  // Try to find the submission in the store
  const storeEvaluation = riskEvaluations.find(re => re.id === assessmentId);
  
  // Get the submission from the store (no mock fallback)
  const submission = !isTemplate ? (storeEvaluation ? {
    id: storeEvaluation.id,
    templateId: storeEvaluation.form_type.toLowerCase(),
    template: getFormTypeName(storeEvaluation.form_type),
    type: storeEvaluation.form_type.toUpperCase(),
    location: locations.find(l => l.id === storeEvaluation.location_id)?.name || "Unknown",
    department: "—",
    date: storeEvaluation.submitted_at.split("T")[0],
    time: storeEvaluation.submitted_at.split("T")[1]?.substring(0, 5) || "",
    status: storeEvaluation.status === "reviewed" ? "completed" : storeEvaluation.status === "submitted" ? "in_progress" : "draft",
    submittedBy: users.find(u => u.id === storeEvaluation.submitter_id)?.full_name || "Unknown",
    reviewedBy: storeEvaluation.reviewed_by ? users.find(u => u.id === storeEvaluation.reviewed_by)?.full_name || "Reviewer" : "Pending",
    riskLevel: "medium" as string,
    riskScore: 0,
    hazards: [] as { step: string; hazard: string; severity: number; probability: number; riskScore: number; controls: string }[],
    ppeRequired: [] as string[],
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

  if (isLoading) {
    return <LoadingPage />;
  }

  if (!template) {
    return <EmptyState title="Template not found" description="The requested risk assessment template could not be found." />;
  }

  if (!isTemplate && !submission) {
    return <EmptyState title="Submission not found" description="The requested risk assessment submission could not be found." />;
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
                  Standard
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
                    toast("Assessment returned for revision.", "info");
                  }
                }}
              >
                <XCircle className="h-4 w-4" /> Request Revision
              </Button>
              <Button 
                className="gap-2"
                onClick={() => {
                  if ("_storeData" in submission && submission._storeData) {
                    updateRiskEvaluation(submission._storeData.id, {
                      status: "reviewed",
                      reviewed_by: "current-user", // In production: get from auth
                      reviewed_at: new Date().toISOString(),
                    });
                    toast("Assessment approved successfully.", "success");
                  }
                }}
              >
                <CheckCircle className="h-4 w-4" /> Approve
              </Button>
            </>
          )}
          {/* Show reviewed badge for already reviewed assessments */}
          {submission && "_storeData" in submission && submission._storeData && submission._storeData.status === "reviewed" && (
            <Badge variant="success" className="gap-1 py-1.5 px-3">
              <CheckCircle className="h-3 w-3" /> Approved
            </Badge>
          )}
          {isTemplate && (
            <Button className="gap-2">
              <FileCheck className="h-4 w-4" /> Start Assessment
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
                  <p className="text-sm text-muted-foreground">{submission.hazards.length} hazards identified</p>
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
                        <Badge variant="outline" className="text-xs capitalize">{field.type.replace("_", " ")}</Badge>
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
                  <p className="text-sm text-muted-foreground">Control Measures</p>
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
              <CardTitle className="text-base">Control Measures Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {submission.hazards.map((hazard, idx) => (
                  <div key={idx} className="p-4 rounded-lg border">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium">{hazard.step}</p>
                      <Badge variant={hazard.riskScore >= 12 ? "destructive" : hazard.riskScore >= 6 ? "warning" : "success"}>
                        Risk: {hazard.riskScore}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{hazard.controls}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Required PPE</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {submission.ppeRequired.map((ppe, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 rounded-lg border">
                    <CheckCircle className="h-5 w-5 text-success" />
                    <span>{ppe}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
    </RoleGuard>
  );
}
