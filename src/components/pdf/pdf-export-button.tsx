"use client";

import * as React from "react";
import { pdf } from "@react-pdf/renderer";
import type { DocumentProps } from "@react-pdf/renderer";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { JHAPdfDocument } from "./jha-template";
import { JSAPdfDocument } from "./jsa-template";
import { RIEPdfDocument } from "./rie-template";
import { ArbowetPdfDocument } from "./arbowet-template";
import { SAMPdfDocument } from "./sam-template";
import { OSAPdfDocument } from "./osa-template";

type CountryCode = "US" | "NL" | "SE";
type FormType = "JHA" | "JSA" | "RIE" | "ARBOWET" | "SAM" | "OSA";

interface RiskAssessmentData {
  id: string;
  templateId: string;
  templateType: FormType;
  country?: CountryCode;
  companyName: string;
  companyLogo?: string; // Base64 encoded image or URL
  location: string;
  department?: string;
  date: string;
  time?: string;
  submittedBy: string;
  reviewedBy?: string;
  
  // JHA specific
  hazards?: Array<{
    step: string;
    hazard: string;
    severity: number;
    probability: number;
    riskScore: number;
    controls: string;
  }>;
  ppeRequired?: string[];
  
  // JSA specific
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
  
  // RI&E specific
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
  
  // Arbowet specific
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
  
  // SAM/OSA specific
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
  
  // OSA specific
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

interface PdfExportButtonProps {
  data: RiskAssessmentData;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
  className?: string;
}

export function PdfExportButton({ 
  data, 
  variant = "outline",
  size = "default",
  className 
}: PdfExportButtonProps) {
  const [isGenerating, setIsGenerating] = React.useState(false);

  const handleExport = async () => {
    setIsGenerating(true);
    
    try {
      let pdfDocument: React.ReactElement | null = null;
      let filename = `risk-assessment-${data.id}.pdf`;

      // Select the appropriate template based on templateType
      switch (data.templateType) {
        case "JHA":
          pdfDocument = (
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

        case "JSA":
          const passCount = data.checklistCategories?.flatMap(c => c.items).filter(i => i.status === "pass").length || 0;
          const failCount = data.checklistCategories?.flatMap(c => c.items).filter(i => i.status === "fail").length || 0;
          const naCount = data.checklistCategories?.flatMap(c => c.items).filter(i => i.status === "na").length || 0;
          
          pdfDocument = (
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

        case "RIE":
          pdfDocument = (
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

        case "ARBOWET":
          const compliantCount = data.articles?.flatMap(a => a.items).filter(i => i.status === "compliant").length || 0;
          const partialCount = data.articles?.flatMap(a => a.items).filter(i => i.status === "partial").length || 0;
          const nonCompliantCount = data.articles?.flatMap(a => a.items).filter(i => i.status === "non_compliant").length || 0;
          const arboNaCount = data.articles?.flatMap(a => a.items).filter(i => i.status === "na").length || 0;
          
          pdfDocument = (
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
                naCount: arboNaCount,
                overallAssessment: data.overallAssessment || "",
                priorityActions: data.priorityActions || "",
                nextAuditDate: data.nextAuditDate,
              }}
            />
          );
          filename = `arbowet-audit-${data.id}-${data.date}.pdf`;
          break;

        case "SAM":
          pdfDocument = (
            <SAMPdfDocument
              data={{
                companyName: data.companyName,
                workplace: data.location,
                department: data.department || "General",
                assessmentDate: data.date,
                assessorName: data.submittedBy,
                organizationalFactors: data.organizationalFactors || [],
                socialFactors: data.socialFactors || [],
                risks: (data.risks || []).map(r => ({
                  description: r.description || r.category,
                  severity: r.severity,
                  probability: r.probability,
                  riskScore: r.riskScore,
                  level: r.priority as "low" | "medium" | "high",
                })),
                actions: (data.actionPlan || []).map(a => ({
                  action: a.action,
                  responsible: a.responsible,
                  deadline: a.deadline,
                  followUp: a.status,
                })),
                approvedBy: data.reviewedBy,
              }}
            />
          );
          filename = `sam-${data.id}-${data.date}.pdf`;
          break;

        case "OSA":
          pdfDocument = (
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
          // Fallback based on country
          if (data.country === "US") {
            pdfDocument = (
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
            pdfDocument = (
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
            pdfDocument = (
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

      if (pdfDocument) {
        // Cast to the expected type for pdf function
        const blob = await pdf(pdfDocument as React.ReactElement<DocumentProps>).toBlob();
        const url = URL.createObjectURL(blob);
        
        // Create download link
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Cleanup
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Error generating PDF:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleExport}
      disabled={isGenerating}
    >
      {isGenerating ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <Download className="h-4 w-4 mr-2" />
          Export PDF
        </>
      )}
    </Button>
  );
}
