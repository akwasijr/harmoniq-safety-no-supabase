"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useCompanyParam } from "@/hooks/use-company-param";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  FileCheck,
  Building2,
  BookOpen,
  Scale,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useRiskEvaluationsStore } from "@/stores/risk-evaluations-store";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/components/ui/toast";
import type { RiskEvaluation } from "@/types";
import { useTranslation } from "@/i18n";

// Arbowet Articles for Compliance Check
const ARBOWET_ARTICLES = [
  {
    id: "artikel_3",
    title: "Artikel 3 - Arbobeleid",
    description: "General working conditions policy",
    items: [
      { id: "a3_policy", label: "Written safety policy in place", required: true },
      { id: "a3_objectives", label: "Clear health & safety objectives defined", required: true },
      { id: "a3_organization", label: "Safety responsibilities assigned", required: true },
      { id: "a3_budget", label: "Budget allocated for safety measures", required: false },
      { id: "a3_communication", label: "Policy communicated to all employees", required: true },
    ],
  },
  {
    id: "artikel_5",
    title: "Artikel 5 - RI&E",
    description: "Risk inventory and evaluation requirements",
    items: [
      { id: "a5_rie_current", label: "Current RI&E document available", required: true },
      { id: "a5_rie_complete", label: "RI&E covers all work activities", required: true },
      { id: "a5_plan", label: "Plan van Aanpak (Action Plan) in place", required: true },
      { id: "a5_review", label: "RI&E reviewed by certified expert (if >25 employees)", required: false },
      { id: "a5_update", label: "RI&E updated after significant changes", required: true },
    ],
  },
  {
    id: "artikel_8",
    title: "Artikel 8 - Voorlichting & Onderricht",
    description: "Information, instruction and supervision",
    items: [
      { id: "a8_induction", label: "New employee safety induction program", required: true },
      { id: "a8_training", label: "Job-specific safety training provided", required: true },
      { id: "a8_refresher", label: "Regular refresher training conducted", required: true },
      { id: "a8_documentation", label: "Training records maintained", required: true },
      { id: "a8_language", label: "Training provided in understandable language", required: true },
      { id: "a8_supervision", label: "Adequate supervision for high-risk tasks", required: true },
    ],
  },
  {
    id: "artikel_13",
    title: "Artikel 13 - Arbeidsongevallen & BHV",
    description: "Accidents, first aid and emergency response",
    items: [
      { id: "a13_first_aid", label: "First aid provisions in place", required: true },
      { id: "a13_bhv", label: "Trained BHV (emergency response) team", required: true },
      { id: "a13_aed", label: "AED available and staff trained", required: false },
      { id: "a13_emergency_plan", label: "Emergency evacuation plan documented", required: true },
      { id: "a13_drills", label: "Regular emergency drills conducted", required: true },
      { id: "a13_reporting", label: "Accident reporting procedure in place", required: true },
      { id: "a13_investigation", label: "Accident investigation conducted for serious incidents", required: true },
    ],
  },
  {
    id: "artikel_14",
    title: "Artikel 14 - Arbodienstverlening",
    description: "Occupational health services",
    items: [
      { id: "a14_contract", label: "Contract with certified arbodienst OR maatwerkregeling", required: true },
      { id: "a14_pmo", label: "Periodic medical examinations (PMO) offered", required: true },
      { id: "a14_absence", label: "Sickness absence guidance available", required: true },
      { id: "a14_workplace_exam", label: "Workplace assessments conducted", required: false },
      { id: "a14_prevention", label: "Preventiemedewerker (prevention officer) appointed", required: true },
    ],
  },
];

interface ComplianceItem {
  id: string;
  status: "compliant" | "non_compliant" | "partial" | "na" | null;
  evidence: string;
  actionNeeded: string;
}

interface ArbowetFormData {
  // Header
  companyName: string;
  auditor: string;
  auditDate: string;
  
  // Compliance Items
  items: { [key: string]: ComplianceItem };
  
  // Summary
  overallAssessment: string;
  priorityActions: string;
  nextAuditDate: string;
}

const initializeItems = (): { [key: string]: ComplianceItem } => {
  const items: { [key: string]: ComplianceItem } = {};
  ARBOWET_ARTICLES.forEach((article) => {
    article.items.forEach((item) => {
      items[item.id] = {
        id: item.id,
        status: null,
        evidence: "",
        actionNeeded: "",
      };
    });
  });
  return items;
};

const initialFormData: ArbowetFormData = {
  companyName: "",
  auditor: "",
  auditDate: new Date().toISOString().split("T")[0],
  items: initializeItems(),
  overallAssessment: "",
  priorityActions: "",
  nextAuditDate: "",
};

export default function ArbowetFormPage() {
  const router = useRouter();
  const company = useCompanyParam();
  const [currentSection, setCurrentSection] = React.useState(0);
  const [formData, setFormData] = React.useState<ArbowetFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { add: addEvaluation } = useRiskEvaluationsStore();
  const { user } = useAuth();
  const { toast } = useToast();
  const [expandedArticle, setExpandedArticle] = React.useState<string | null>("artikel_3");

  const { t } = useTranslation();

  const sections = [
    { id: "info", title: "Audit Details", icon: Building2 },
    { id: "compliance", title: "Compliance Check", icon: Scale },
    { id: "summary", title: "Summary & Actions", icon: FileCheck },
    { id: "review", title: "Review & Submit", icon: CheckCircle },
  ];

  const currentSectionData = sections[currentSection];
  const isLastSection = currentSection === sections.length - 1;

  // Update item
  const updateItem = (itemId: string, field: keyof ComplianceItem, value: ComplianceItem[keyof ComplianceItem]) => {
    setFormData({
      ...formData,
      items: {
        ...formData.items,
        [itemId]: { ...formData.items[itemId], [field]: value },
      },
    });
  };

  // Count compliance
  const compliantCount = Object.values(formData.items).filter((i) => i.status === "compliant").length;
  const nonCompliantCount = Object.values(formData.items).filter((i) => i.status === "non_compliant").length;
  const partialCount = Object.values(formData.items).filter((i) => i.status === "partial").length;
  const totalItems = Object.keys(formData.items).length;
  const assessedItems = Object.values(formData.items).filter((i) => i.status !== null).length;

  // Calculate compliance percentage (excluding N/A)
  const applicableItems = Object.values(formData.items).filter(
    (i) => i.status !== null && i.status !== "na"
  ).length;
  const complianceScore = applicableItems > 0
    ? Math.round(((compliantCount + partialCount * 0.5) / applicableItems) * 100)
    : 0;

  const handleNext = () => {
    if (isLastSection) {
      handleSubmit();
    } else {
      setCurrentSection(currentSection + 1);
    }
  };

  const handleBack = () => {
    if (currentSection > 0) {
      setCurrentSection(currentSection - 1);
    } else {
      router.back();
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    if (!user) {
      toast("Unable to submit without a user session.");
      setIsSubmitting(false);
      return;
    }
    const now = new Date();
    const refNumber = `ARBO-${now.getFullYear()}-${String(Math.floor(Math.random() * 999) + 1).padStart(3, "0")}`;
    const evaluation: RiskEvaluation = {
      id: crypto.randomUUID(),
      company_id: user.company_id || "",
      submitter_id: user.id,
      country: "NL",
      form_type: "ARBOWET",
      location_id: null,
      responses: formData as unknown as Record<string, unknown>,
      status: "submitted",
      reviewed_by: null,
      reviewed_at: null,
      submitted_at: now.toISOString(),
      created_at: now.toISOString(),
    };
    addEvaluation(evaluation);
    toast("Assessment submitted");
    router.push(`/${company}/app/report/success?ref=${refNumber}&type=assessment`);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b bg-background">
        <div className="flex h-14 items-center gap-4 px-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-semibold text-sm">{t("riskAssessment.arbowetTitle")}</h1>
            <p className="text-xs text-muted-foreground">
              {currentSectionData.title} • {t("riskAssessment.section", { current: String(currentSection + 1), total: String(sections.length) })}
            </p>
          </div>
          <span className="text-xs text-muted-foreground">NL</span>
        </div>
        <div className="h-1 bg-muted" role="progressbar" aria-label="Completion progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(((currentSection + 1) / sections.length) * 100)}>
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${((currentSection + 1) / sections.length) * 100}%` }}
          />
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 p-4 pb-32">
        {/* Section 1: Audit Details */}
        {currentSection === 0 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">{t("riskAssessment.auditDetails")}</h2>
                <p className="text-sm text-muted-foreground">{t("riskAssessment.basicAuditInfo")}</p>
              </div>
            </div>

            <Card className="bg-orange-50 border-orange-200">
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <BookOpen className="h-5 w-5 text-orange-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-orange-800">Arbowet Compliance Check</p>
                    <p className="text-xs text-orange-700 mt-1">
                      This audit checks compliance with key articles of the Arbeidsomstandighedenwet (Arbowet): 
                      Articles 3, 5, 8, 13, and 14.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-base">Bedrijfsnaam (Company Name) *</Label>
                <Input
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  placeholder="Enter company name"
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-base">Auditor Name *</Label>
                <Input
                  value={formData.auditor}
                  onChange={(e) => setFormData({ ...formData, auditor: e.target.value })}
                  placeholder="Name of person conducting audit"
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-base">Audit Date *</Label>
                <Input
                  type="date"
                  value={formData.auditDate}
                  onChange={(e) => setFormData({ ...formData, auditDate: e.target.value })}
                  className="h-12"
                />
              </div>
            </div>

            {/* Articles Overview */}
            <div className="space-y-2">
              <Label className="text-base">{t("riskAssessment.articlesCovered")}</Label>
              <div className="space-y-2">
                {ARBOWET_ARTICLES.map((article) => (
                  <div key={article.id} className="p-3 rounded-lg bg-muted/50">
                    <p className="font-medium text-sm">{article.title}</p>
                    <p className="text-xs text-muted-foreground">{article.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Section 2: Compliance Check */}
        {currentSection === 1 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                  <Scale className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">{t("riskAssessment.complianceCheck")}</h2>
                  <p className="text-sm text-muted-foreground">
                    {t("riskAssessment.itemsAssessed", { assessed: String(assessedItems), total: String(totalItems) })}
                  </p>
                </div>
              </div>
            </div>

            {/* Progress Summary */}
            <div className="grid grid-cols-4 gap-2">
              <Card className="bg-green-50 border-green-200">
                <CardContent className="py-2 text-center">
                  <p className="text-lg font-bold text-green-600">{compliantCount}</p>
                  <p className="text-xs text-green-700">✓</p>
                </CardContent>
              </Card>
              <Card className="bg-yellow-50 border-yellow-200">
                <CardContent className="py-2 text-center">
                  <p className="text-lg font-bold text-yellow-600">{partialCount}</p>
                  <p className="text-xs text-yellow-700">~</p>
                </CardContent>
              </Card>
              <Card className="bg-red-50 border-red-200">
                <CardContent className="py-2 text-center">
                  <p className="text-lg font-bold text-red-600">{nonCompliantCount}</p>
                  <p className="text-xs text-red-700">✗</p>
                </CardContent>
              </Card>
              <Card className="bg-gray-50 border-gray-200">
                <CardContent className="py-2 text-center">
                  <p className="text-lg font-bold text-gray-600">
                    {Object.values(formData.items).filter((i) => i.status === "na").length}
                  </p>
                  <p className="text-xs text-gray-500">N/A</p>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              {ARBOWET_ARTICLES.map((article) => {
                const isExpanded = expandedArticle === article.id;
                const articleItems = article.items.map((item) => formData.items[item.id]);
                const articleCompliant = articleItems.filter((i) => i.status === "compliant").length;
                const articleTotal = article.items.length;

                return (
                  <Card key={article.id} className="overflow-hidden">
                    <CardHeader
                      className="cursor-pointer py-3"
                      onClick={() => setExpandedArticle(isExpanded ? null : article.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{article.title}</p>
                          <p className="text-xs text-muted-foreground">{article.description}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {articleCompliant}/{articleTotal}
                          </Badge>
                          <ArrowRight className={cn(
                            "h-4 w-4 transition-transform",
                            isExpanded && "rotate-90"
                          )} />
                        </div>
                      </div>
                    </CardHeader>

                    {isExpanded && (
                      <CardContent className="space-y-4 pt-0">
                        {article.items.map((item) => {
                          const itemData = formData.items[item.id];
                          return (
                            <div key={item.id} className="space-y-3 p-3 bg-muted/30 rounded-lg">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                  <p className="text-sm font-medium">
                                    {item.label}
                                    {item.required && <span className="text-red-500 ml-1">*</span>}
                                  </p>
                                </div>
                              </div>

                              <div className="grid grid-cols-4 gap-1">
                                {([
                                  { value: "compliant", label: "✓", color: "green" },
                                  { value: "partial", label: "~", color: "yellow" },
                                  { value: "non_compliant", label: "✗", color: "red" },
                                  { value: "na", label: "N/A", color: "gray" },
                                ] as const).map((status) => (
                                  <button
                                    key={status.value}
                                    onClick={() => updateItem(item.id, "status", status.value)}
                                    className={cn(
                                      "py-2 rounded-lg text-sm font-medium transition-all",
                                      itemData.status === status.value
                                        ? status.color === "green"
                                          ? "bg-green-500 text-white"
                                          : status.color === "yellow"
                                          ? "bg-yellow-500 text-white"
                                          : status.color === "red"
                                          ? "bg-red-500 text-white"
                                          : "bg-gray-500 text-white"
                                        : "bg-background border hover:bg-muted"
                                    )}
                                  >
                                    {status.label}
                                  </button>
                                ))}
                              </div>

                              {itemData.status === "compliant" && (
                                <Input
                                  value={itemData.evidence}
                                  onChange={(e) => updateItem(item.id, "evidence", e.target.value)}
                                  placeholder="Evidence/documentation reference..."
                                  className="h-9 text-sm"
                                />
                              )}

                              {(itemData.status === "non_compliant" || itemData.status === "partial") && (
                                <Textarea
                                  value={itemData.actionNeeded}
                                  onChange={(e) => updateItem(item.id, "actionNeeded", e.target.value)}
                                  placeholder="Action needed to achieve compliance..."
                                  className="min-h-[60px] text-sm border-red-200"
                                />
                              )}
                            </div>
                          );
                        })}
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Section 3: Summary */}
        {currentSection === 2 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
                <FileCheck className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">{t("riskAssessment.summaryAndActions")}</h2>
                <p className="text-sm text-muted-foreground">{t("riskAssessment.overallAssessment")}</p>
              </div>
            </div>

            {/* Compliance Score */}
            <Card className={cn(
              "border-2",
              complianceScore >= 80 ? "border-green-300" :
              complianceScore >= 50 ? "border-yellow-300" : "border-red-300"
            )}>
              <CardContent className="py-6 text-center">
                <p className="text-5xl font-bold">
                  <span className={
                    complianceScore >= 80 ? "text-green-600" :
                    complianceScore >= 50 ? "text-yellow-600" : "text-red-600"
                  }>
                    {complianceScore}%
                  </span>
                </p>
                <p className="text-sm text-muted-foreground mt-2">{t("riskAssessment.overallComplianceScore")}</p>
              </CardContent>
            </Card>

            {/* Non-Compliant Items */}
            {nonCompliantCount > 0 && (
              <Card className="border-red-200">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm text-red-600">
                    ⚠️ {t("riskAssessment.nonCompliantItems", { count: String(nonCompliantCount) })}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {ARBOWET_ARTICLES.flatMap((article) =>
                    article.items
                      .filter((item) => formData.items[item.id].status === "non_compliant")
                      .map((item) => (
                        <div key={item.id} className="p-2 bg-red-50 rounded text-sm">
                          <p className="font-medium">{item.label}</p>
                          {formData.items[item.id].actionNeeded && (
                            <p className="text-xs text-red-700 mt-1">
                              → {formData.items[item.id].actionNeeded}
                            </p>
                          )}
                        </div>
                      ))
                  )}
                </CardContent>
              </Card>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-base">{t("riskAssessment.overallAssessmentLabel")}</Label>
                <Textarea
                  value={formData.overallAssessment}
                  onChange={(e) => setFormData({ ...formData, overallAssessment: e.target.value })}
                  placeholder="Summarize the overall compliance status and main findings..."
                  className="min-h-[100px]"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-base">{t("riskAssessment.priorityActions")}</Label>
                <Textarea
                  value={formData.priorityActions}
                  onChange={(e) => setFormData({ ...formData, priorityActions: e.target.value })}
                  placeholder="List the top priority actions to address non-compliance..."
                  className="min-h-[100px]"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-base">{t("riskAssessment.nextAuditDate")}</Label>
                <Input
                  type="date"
                  value={formData.nextAuditDate}
                  onChange={(e) => setFormData({ ...formData, nextAuditDate: e.target.value })}
                  className="h-12"
                />
              </div>
            </div>
          </div>
        )}

        {/* Section 4: Review */}
        {currentSection === 3 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">{t("riskAssessment.reviewAndSubmit")}</h2>
                <p className="text-sm text-muted-foreground">{t("riskAssessment.confirmSubmitAudit")}</p>
              </div>
            </div>

            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-base">{t("riskAssessment.auditSummary")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Company:</span>
                  <span className="font-medium">{formData.companyName || t("riskAssessment.notSpecified")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Auditor:</span>
                  <span>{formData.auditor || t("riskAssessment.notSpecified")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date:</span>
                  <span>{formData.auditDate}</span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className="text-muted-foreground">{t("riskAssessment.complianceScore")}</span>
                  <span className={cn(
                    "font-bold",
                    complianceScore >= 80 ? "text-green-600" :
                    complianceScore >= 50 ? "text-yellow-600" : "text-red-600"
                  )}>
                    {complianceScore}%
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className={cn(
              "border-2",
              nonCompliantCount === 0 ? "border-green-300" :
              nonCompliantCount <= 3 ? "border-yellow-300" : "border-red-300"
            )}>
              <CardHeader className="py-3">
                <CardTitle className="text-base">{t("riskAssessment.complianceBreakdown")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-green-600">✓ Compliant:</span>
                  <span className="font-medium">{compliantCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-yellow-600">~ Partial:</span>
                  <span className="font-medium">{partialCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-red-600">✗ Non-Compliant:</span>
                  <span className="font-medium">{nonCompliantCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">N/A:</span>
                  <span className="font-medium">
                    {Object.values(formData.items).filter((i) => i.status === "na").length}
                  </span>
                </div>
              </CardContent>
            </Card>

            {nonCompliantCount > 0 && (
              <Card className="bg-warning/10 border-warning">
                <CardContent className="py-4">
                  <p className="text-sm font-medium text-warning">
                    ⚠️ {nonCompliantCount} non-compliant item{nonCompliantCount > 1 ? "s" : ""} found
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    These must be addressed to achieve full Arbowet compliance. 
                    Follow-up actions will be tracked in your dashboard.
                  </p>
                </CardContent>
              </Card>
            )}

            <Card className="bg-muted/50">
              <CardContent className="py-4">
                <p className="text-xs text-muted-foreground">
                  By submitting this audit, you confirm that the assessment is accurate and complete. 
                  This report will be stored for compliance records and shared with management.
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="fixed bottom-16 left-0 right-0 border-t bg-background p-4 z-20">
        <div className="flex gap-3">
          {currentSection > 0 && (
            <Button
              variant="outline"
              className="h-14"
              onClick={handleBack}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <Button
            onClick={handleNext}
            disabled={isSubmitting}
            className="flex-1 h-14 gap-2 text-base"
          >
            {isSubmitting ? (
              t("riskAssessment.submitting")
            ) : isLastSection ? (
              <>
                <CheckCircle className="h-5 w-5" />
                {t("riskAssessment.submitAudit")}
              </>
            ) : (
              <>
                {t("riskAssessment.continue")}
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
