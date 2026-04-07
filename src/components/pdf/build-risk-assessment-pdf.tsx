import * as React from "react";
import { JHAPdfDocument } from "./jha-template";
import { JSAPdfDocument } from "./jsa-template";
import { RIEPdfDocument } from "./rie-template";
import { ArbowetPdfDocument } from "./arbowet-template";
import { SAMPdfDocument } from "./sam-template";
import { OSAPdfDocument } from "./osa-template";

type CountryCode = "US" | "NL" | "SE";
type FormType = "JHA" | "JSA" | "RIE" | "ARBOWET" | "SAM" | "OSA";

export interface RiskAssessmentData {
  id: string;
  templateId: string;
  templateType: FormType;
  country?: CountryCode;
  companyName: string;
  companyLogo?: string;
  location: string;
  department?: string;
  date: string;
  time?: string;
  submittedBy: string;
  reviewedBy?: string;
  hazards?: Array<{
    step: string;
    hazard: string;
    severity: number;
    probability: number;
    riskScore: number;
    controls: string;
  }>;
  ppeRequired?: string[];
  jobDescription?: string;
  crewLeader?: string;
  crewMembers?: string[];
  checklistCategories?: Array<{
    id: string;
    title: string;
    items: Array<{
      id: string;
      label: string;
      status: "pass" | "fail" | "na" | null;
      notes?: string;
    }>;
  }>;
  identifiedHazards?: string;
  controlMeasures?: string;
  stopWorkConditions?: string;
  risks?: Array<{
    category: string;
    identified: boolean;
    description?: string;
    severity: number;
    probability: number;
    exposure: string;
    riskScore: number;
    priority: "high" | "medium" | "low";
    currentMeasures: string;
    additionalMeasures: string;
    responsible: string;
    deadline: string;
  }>;
  actionPlan?: Array<{
    action: string;
    priority: "high" | "medium" | "low";
    responsible: string;
    deadline: string;
    status: string;
  }>;
  articles?: Array<{
    id: string;
    title: string;
    description: string;
    items: Array<{
      id: string;
      label: string;
      status: "compliant" | "partial" | "non_compliant" | "na";
      evidence?: string;
      actionNeeded?: string;
    }>;
  }>;
  complianceScore?: number;
  overallAssessment?: string;
  priorityActions?: string;
  nextAuditDate?: string;
  organizationalFactors?: Array<{
    factor: string;
    rating: number;
    notes?: string;
  }>;
  socialFactors?: Array<{
    factor: string;
    value: boolean | number;
    notes?: string;
  }>;
  sections?: Array<{
    id: string;
    title: string;
    icon: string;
    questions: Array<{
      id: string;
      label: string;
      rating: number;
      concern: boolean;
      notes?: string;
    }>;
    average: number;
  }>;
  overallConcerns?: string;
  suggestions?: string;
  concernCount?: number;
  lowRatingCount?: number;
  additionalNotes?: string;
}

export function buildRiskAssessmentPdf(data: RiskAssessmentData) {
  let document: React.ReactElement | null = null;
  let filename = `risk-assessment-${data.id}.pdf`;

  switch (data.templateType) {
    case "JHA":
      document = (
        <JHAPdfDocument
          data={{
            jobTitle: data.hazards?.[0]?.step || "Risk Assessment",
            department: data.department || "General",
            location: data.location,
            analysisDate: data.date,
            analystName: data.submittedBy,
            reviewedBy: data.reviewedBy,
            hazards: data.hazards || [],
            ppeRequired: data.ppeRequired || [],
            additionalNotes: data.additionalNotes,
            companyName: data.companyName,
          }}
        />
      );
      filename = `jha-${data.id}-${data.date}.pdf`;
      break;

    case "JSA": {
      const passCount = data.checklistCategories?.flatMap((category) => category.items).filter((item) => item.status === "pass").length || 0;
      const failCount = data.checklistCategories?.flatMap((category) => category.items).filter((item) => item.status === "fail").length || 0;
      const naCount = data.checklistCategories?.flatMap((category) => category.items).filter((item) => item.status === "na").length || 0;

      document = (
        <JSAPdfDocument
          data={{
            companyName: data.companyName,
            date: data.date,
            time: data.time || "",
            jobDescription: data.jobDescription || "",
            location: data.location,
            crewLeader: data.crewLeader || data.submittedBy,
            crewMembers: data.crewMembers || [],
            categories: data.checklistCategories || [],
            identifiedHazards: data.identifiedHazards || "",
            controlMeasures: data.controlMeasures || "",
            stopWorkConditions: data.stopWorkConditions || "",
            passCount,
            failCount,
            naCount,
          }}
        />
      );
      filename = `jsa-${data.id}-${data.date}.pdf`;
      break;
    }

    case "RIE":
      document = (
        <RIEPdfDocument
          data={{
            companyName: data.companyName,
            department: data.department || "General",
            location: data.location,
            assessmentDate: data.date,
            assessorName: data.submittedBy,
            risks: data.risks || [],
            actionPlan: data.actionPlan || [],
            approvedBy: data.reviewedBy,
          }}
        />
      );
      filename = `rie-${data.id}-${data.date}.pdf`;
      break;

    case "ARBOWET": {
      const compliantCount = data.articles?.flatMap((article) => article.items).filter((item) => item.status === "compliant").length || 0;
      const partialCount = data.articles?.flatMap((article) => article.items).filter((item) => item.status === "partial").length || 0;
      const nonCompliantCount = data.articles?.flatMap((article) => article.items).filter((item) => item.status === "non_compliant").length || 0;
      const naCount = data.articles?.flatMap((article) => article.items).filter((item) => item.status === "na").length || 0;

      document = (
        <ArbowetPdfDocument
          data={{
            companyName: data.companyName,
            auditor: data.submittedBy,
            auditDate: data.date,
            articles: data.articles || [],
            complianceScore: data.complianceScore || 0,
            compliantCount,
            partialCount,
            nonCompliantCount,
            naCount,
            overallAssessment: data.overallAssessment || "",
            priorityActions: data.priorityActions || "",
            nextAuditDate: data.nextAuditDate,
          }}
        />
      );
      filename = `arbowet-audit-${data.id}-${data.date}.pdf`;
      break;
    }

    case "SAM":
      document = (
        <SAMPdfDocument
          data={{
            companyName: data.companyName,
            workplace: data.location,
            department: data.department || "General",
            assessmentDate: data.date,
            assessorName: data.submittedBy,
            organizationalFactors: data.organizationalFactors || [],
            socialFactors: data.socialFactors || [],
            risks: (data.risks || []).map((risk) => ({
              description: risk.description || risk.category,
              severity: risk.severity,
              probability: risk.probability,
              riskScore: risk.riskScore,
              level: risk.priority as "low" | "medium" | "high",
            })),
            actions: (data.actionPlan || []).map((action) => ({
              action: action.action,
              responsible: action.responsible,
              deadline: action.deadline,
              followUp: action.status,
            })),
            approvedBy: data.reviewedBy,
          }}
        />
      );
      filename = `sam-${data.id}-${data.date}.pdf`;
      break;

    case "OSA":
      document = (
        <OSAPdfDocument
          data={{
            companyName: data.companyName,
            department: data.department || "General",
            assessmentDate: data.date,
            respondent: data.submittedBy,
            role: "",
            sections: data.sections || [],
            overallConcerns: data.overallConcerns || "",
            suggestions: data.suggestions || "",
            concernCount: data.concernCount || 0,
            lowRatingCount: data.lowRatingCount || 0,
          }}
        />
      );
      filename = `osa-${data.id}-${data.date}.pdf`;
      break;

    default:
      if (data.country === "US") {
        document = (
          <JHAPdfDocument
            data={{
              jobTitle: "Risk Assessment",
              department: data.department || "General",
              location: data.location,
              analysisDate: data.date,
              analystName: data.submittedBy,
              reviewedBy: data.reviewedBy,
              hazards: data.hazards || [],
              ppeRequired: data.ppeRequired || [],
              additionalNotes: data.additionalNotes,
              companyName: data.companyName,
            }}
          />
        );
      } else if (data.country === "NL") {
        document = (
          <RIEPdfDocument
            data={{
              companyName: data.companyName,
              department: data.department || "General",
              location: data.location,
              assessmentDate: data.date,
              assessorName: data.submittedBy,
              risks: data.risks || [],
              actionPlan: data.actionPlan || [],
              approvedBy: data.reviewedBy,
            }}
          />
        );
      } else {
        document = (
          <SAMPdfDocument
            data={{
              companyName: data.companyName,
              workplace: data.location,
              department: data.department || "General",
              assessmentDate: data.date,
              assessorName: data.submittedBy,
              organizationalFactors: data.organizationalFactors || [],
              socialFactors: data.socialFactors || [],
              risks: [],
              actions: [],
              approvedBy: data.reviewedBy,
            }}
          />
        );
      }
  }

  return { document, filename };
}
