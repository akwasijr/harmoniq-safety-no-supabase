"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useCompanyParam } from "@/hooks/use-company-param";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  Building2,
  Users,
  Shield,
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
import { DEFAULT_COMPANY_ID } from "@/mocks/data";

// Risk Categories per Arbowet Article 5
const RISK_CATEGORIES = [
  {
    id: "physical",
    title: "Fysieke Belasting (Physical Hazards)",
    icon: "💪",
    items: [
      { id: "ph_noise", label: "Lawaai (Noise)", description: ">80 dB exposure" },
      { id: "ph_vibration", label: "Trillingen (Vibration)", description: "Hand-arm or whole-body" },
      { id: "ph_radiation", label: "Straling (Radiation)", description: "UV, ionizing, non-ionizing" },
      { id: "ph_temp", label: "Temperatuur (Temperature)", description: "Heat or cold stress" },
      { id: "ph_lifting", label: "Tillen (Lifting)", description: "Heavy loads, repetition" },
      { id: "ph_posture", label: "Houding (Posture)", description: "Static or awkward positions" },
    ],
  },
  {
    id: "psychosocial",
    title: "Psychosociale Arbeidsbelasting (PSA)",
    icon: "🧠",
    items: [
      { id: "psa_workload", label: "Werkdruk (Workload)", description: "High demands, time pressure" },
      { id: "psa_harassment", label: "Intimidatie (Harassment)", description: "Bullying, discrimination" },
      { id: "psa_violence", label: "Geweld (Violence)", description: "From colleagues or third parties" },
      { id: "psa_stress", label: "Stress", description: "Work-related mental strain" },
      { id: "psa_autonomy", label: "Autonomie (Autonomy)", description: "Lack of control over work" },
    ],
  },
  {
    id: "biological",
    title: "Biologische Agentia (Biological Agents)",
    icon: "🦠",
    items: [
      { id: "bio_infection", label: "Infectierisico (Infection)", description: "Pathogens exposure" },
      { id: "bio_allergen", label: "Allergenen (Allergens)", description: "Dust, mold, animal materials" },
      { id: "bio_bloodborne", label: "Bloedpathogenen (Blood-borne)", description: "Needle sticks, bodily fluids" },
    ],
  },
  {
    id: "chemical",
    title: "Gevaarlijke Stoffen (Hazardous Substances)",
    icon: "⚗️",
    items: [
      { id: "chem_toxic", label: "Toxische stoffen (Toxic)", description: "Poisons, carcinogens" },
      { id: "chem_irritant", label: "Irriterende stoffen (Irritants)", description: "Skin, eyes, respiratory" },
      { id: "chem_flammable", label: "Brandbaar (Flammable)", description: "Fire or explosion risk" },
      { id: "chem_asbestos", label: "Asbest (Asbestos)", description: "Asbestos-containing materials" },
    ],
  },
  {
    id: "safety",
    title: "Arbeidsveiligheid (Work Safety)",
    icon: "🔧",
    items: [
      { id: "saf_machines", label: "Machines (Machinery)", description: "Moving parts, guards" },
      { id: "saf_electrical", label: "Elektriciteit (Electrical)", description: "Shock, arc flash" },
      { id: "saf_fall", label: "Valgevaar (Fall hazard)", description: "Heights, floor openings" },
      { id: "saf_traffic", label: "Verkeer (Traffic)", description: "Internal transport" },
      { id: "saf_fire", label: "Brand (Fire)", description: "Fire and explosion" },
    ],
  },
];

interface RiskItem {
  id: string;
  categoryId: string;
  itemId: string;
  present: boolean;
  severity: number; // 1-3: Low, Medium, High
  probability: number; // 1-3: Low, Medium, High
  exposure: number; // 1-3: Rare, Regular, Continuous
  currentControls: string;
  actionRequired: string;
  priority: "low" | "medium" | "high" | null;
  responsible: string;
  deadline: string;
}

interface RIEFormData {
  // Section 1: Company Information (Bedrijfsgegevens)
  companyName: string;
  kvkNumber: string;
  address: string;
  sector: string;
  employeeCount: string;
  assessmentDate: string;
  assessor: string;
  
  // Section 2: Workplace Description
  workplaceDescription: string;
  activities: string;
  workingHours: string;
  specialGroups: string; // Young workers, pregnant, temporary
  
  // Section 3: Risk Inventory
  risks: RiskItem[];
  
  // Section 4: Plan van Aanpak (Action Plan)
  generalMeasures: string;
  
  // Section 5: Notes
  additionalNotes: string;
  externalReviewRequired: boolean;
}

const initialFormData: RIEFormData = {
  companyName: "",
  kvkNumber: "",
  address: "",
  sector: "",
  employeeCount: "",
  assessmentDate: new Date().toISOString().split("T")[0],
  assessor: "",
  workplaceDescription: "",
  activities: "",
  workingHours: "",
  specialGroups: "",
  risks: [],
  generalMeasures: "",
  additionalNotes: "",
  externalReviewRequired: false,
};

function calculateRiskScore(severity: number, probability: number, exposure: number): number {
  return severity * probability * exposure;
}

function getRiskPriority(score: number): { priority: "low" | "medium" | "high"; color: string; bgColor: string } {
  if (score <= 3) return { priority: "low", color: "text-green-700", bgColor: "bg-green-100" };
  if (score <= 9) return { priority: "medium", color: "text-yellow-700", bgColor: "bg-yellow-100" };
  return { priority: "high", color: "text-red-700", bgColor: "bg-red-100" };
}

export default function RIEFormPage() {
  const router = useRouter();
  const company = useCompanyParam();
  const [currentSection, setCurrentSection] = React.useState(0);
  const [formData, setFormData] = React.useState<RIEFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { add: addEvaluation } = useRiskEvaluationsStore();
  const { user } = useAuth();
  const { toast } = useToast();
  const [expandedCategory, setExpandedCategory] = React.useState<string | null>("physical");

  const { t } = useTranslation();

  const sections = [
    { id: "company", title: "Bedrijfsgegevens", icon: Building2 },
    { id: "workplace", title: "Werkplek", icon: Users },
    { id: "risks", title: "Risico-inventarisatie", icon: AlertTriangle },
    { id: "plan", title: "Plan van Aanpak", icon: Shield },
    { id: "review", title: "Beoordeling", icon: CheckCircle },
  ];

  const currentSectionData = sections[currentSection];
  const isLastSection = currentSection === sections.length - 1;

  // Toggle risk item
  const toggleRiskItem = (categoryId: string, itemId: string) => {
    const existingRisk = formData.risks.find(
      (r) => r.categoryId === categoryId && r.itemId === itemId
    );

    if (existingRisk) {
      setFormData({
        ...formData,
        risks: formData.risks.filter((r) => r.id !== existingRisk.id),
      });
    } else {
      const newRisk: RiskItem = {
        id: `${categoryId}_${itemId}_${Date.now()}`,
        categoryId,
        itemId,
        present: true,
        severity: 0,
        probability: 0,
        exposure: 0,
        currentControls: "",
        actionRequired: "",
        priority: null,
        responsible: "",
        deadline: "",
      };
      setFormData({ ...formData, risks: [...formData.risks, newRisk] });
    }
  };

  // Update risk item
  const updateRisk = (riskId: string, field: keyof RiskItem, value: RiskItem[keyof RiskItem]) => {
    setFormData({
      ...formData,
      risks: formData.risks.map((r) => {
        if (r.id !== riskId) return r;
        const updated = { ...r, [field]: value };
        // Auto-calculate priority when S, P, E are set
        if (updated.severity > 0 && updated.probability > 0 && updated.exposure > 0) {
          const score = calculateRiskScore(updated.severity, updated.probability, updated.exposure);
          updated.priority = getRiskPriority(score).priority;
        }
        return updated;
      }),
    });
  };

  // Count risks by priority
  const highRisks = formData.risks.filter((r) => r.priority === "high").length;
  const mediumRisks = formData.risks.filter((r) => r.priority === "medium").length;
  const lowRisks = formData.risks.filter((r) => r.priority === "low").length;

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
    const refNumber = `RIE-${now.getFullYear()}-${String(Math.floor(Math.random() * 999) + 1).padStart(3, "0")}`;
    const evaluation: RiskEvaluation = {
      id: `eval_${Date.now()}`,
      company_id: user.company_id || DEFAULT_COMPANY_ID,
      submitter_id: user.id,
      country: "NL",
      form_type: "RIE",
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
            <h1 className="font-semibold text-sm">{t("riskAssessment.rieTitle")}</h1>
            <p className="text-xs text-muted-foreground">
              {currentSectionData.title} • Stap {currentSection + 1} van {sections.length}
            </p>
          </div>
          <span className="text-xs text-muted-foreground">Arbowet</span>
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
        {/* Section 1: Company Information */}
        {currentSection === 0 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Bedrijfsgegevens</h2>
                <p className="text-sm text-muted-foreground">Company information per Arbowet Article 5</p>
              </div>
            </div>

            <Card className="bg-orange-50 border-orange-200">
              <CardContent className="py-4">
                <p className="text-sm text-orange-800">
                  <strong>Arbowet Artikel 5 (NL):</strong> Every employer is required to conduct a 
                  risk inventory and evaluation (RI&E) and develop an action plan.
                </p>
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
                <Label className="text-base">KvK-nummer (Chamber of Commerce Number)</Label>
                <Input
                  value={formData.kvkNumber}
                  onChange={(e) => setFormData({ ...formData, kvkNumber: e.target.value })}
                  placeholder="e.g., 12345678"
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-base">Adres (Address) *</Label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Street, City, Postal Code"
                  className="h-12"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-base">Sector</Label>
                  <Input
                    value={formData.sector}
                    onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                    placeholder="e.g., Manufacturing"
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-base">Aantal medewerkers *</Label>
                  <Input
                    value={formData.employeeCount}
                    onChange={(e) => setFormData({ ...formData, employeeCount: e.target.value })}
                    placeholder="Number of employees"
                    className="h-12"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-base">Datum RI&E *</Label>
                  <Input
                    type="date"
                    value={formData.assessmentDate}
                    onChange={(e) => setFormData({ ...formData, assessmentDate: e.target.value })}
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-base">Uitgevoerd door *</Label>
                  <Input
                    value={formData.assessor}
                    onChange={(e) => setFormData({ ...formData, assessor: e.target.value })}
                    placeholder="Assessor name"
                    className="h-12"
                  />
                </div>
              </div>

              <button
                onClick={() => {
                  const count = parseInt(formData.employeeCount) || 0;
                  setFormData({ ...formData, externalReviewRequired: count > 25 });
                }}
                className={cn(
                  "w-full p-4 rounded-xl border-2 text-left transition-all",
                  formData.externalReviewRequired
                    ? "border-warning bg-warning/10"
                    : "border-border"
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Toetsing verplicht?</p>
                    <p className="text-xs text-muted-foreground">
                      Companies with &gt;25 employees must have RI&E reviewed by certified expert
                    </p>
                  </div>
                  <span className="text-xs font-medium">
                    {formData.externalReviewRequired ? "Yes" : "No"}
                  </span>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Section 2: Workplace Description */}
        {currentSection === 1 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Werkplekinformatie</h2>
                <p className="text-sm text-muted-foreground">Describe the work environment</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-base">Beschrijving werkplek (Workplace Description) *</Label>
                <Textarea
                  value={formData.workplaceDescription}
                  onChange={(e) => setFormData({ ...formData, workplaceDescription: e.target.value })}
                  placeholder="Describe the physical workplace: buildings, departments, outdoor areas..."
                  className="min-h-[100px]"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-base">Werkzaamheden (Activities) *</Label>
                <Textarea
                  value={formData.activities}
                  onChange={(e) => setFormData({ ...formData, activities: e.target.value })}
                  placeholder="List the main work activities performed..."
                  className="min-h-[100px]"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-base">Werktijden (Working Hours)</Label>
                <Input
                  value={formData.workingHours}
                  onChange={(e) => setFormData({ ...formData, workingHours: e.target.value })}
                  placeholder="e.g., Day shift 07:00-15:00, Night shift 23:00-07:00"
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-base">Bijzondere groepen (Special Groups)</Label>
                <Textarea
                  value={formData.specialGroups}
                  onChange={(e) => setFormData({ ...formData, specialGroups: e.target.value })}
                  placeholder="Young workers (<18), pregnant workers, temporary/flex workers, disabled workers..."
                  className="min-h-[80px]"
                />
              </div>
            </div>
          </div>
        )}

        {/* Section 3: Risk Inventory */}
        {currentSection === 2 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warning/10">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Risico-inventarisatie</h2>
                  <p className="text-sm text-muted-foreground">
                    {formData.risks.length} risico&apos;s geïdentificeerd
                  </p>
                </div>
              </div>
            </div>

            {/* Risk Summary */}
            {formData.risks.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                <Card className="bg-red-50 border-red-200">
                  <CardContent className="py-3 text-center">
                    <p className="text-2xl font-bold text-red-600">{highRisks}</p>
                    <p className="text-xs text-red-700">Hoog</p>
                  </CardContent>
                </Card>
                <Card className="bg-yellow-50 border-yellow-200">
                  <CardContent className="py-3 text-center">
                    <p className="text-2xl font-bold text-yellow-600">{mediumRisks}</p>
                    <p className="text-xs text-yellow-700">Midden</p>
                  </CardContent>
                </Card>
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="py-3 text-center">
                    <p className="text-2xl font-bold text-green-600">{lowRisks}</p>
                    <p className="text-xs text-green-700">Laag</p>
                  </CardContent>
                </Card>
              </div>
            )}

            <div className="space-y-4">
              {RISK_CATEGORIES.map((category) => {
                const isExpanded = expandedCategory === category.id;
                const categoryRisks = formData.risks.filter((r) => r.categoryId === category.id);

                return (
                  <Card key={category.id} className="overflow-hidden">
                    <CardHeader
                      className="cursor-pointer py-3"
                      onClick={() => setExpandedCategory(isExpanded ? null : category.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{category.icon}</span>
                          <div>
                            <p className="font-medium text-sm">{category.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {categoryRisks.length} risico&apos;s geselecteerd
                            </p>
                          </div>
                        </div>
                        <ArrowRight className={cn(
                          "h-4 w-4 transition-transform",
                          isExpanded && "rotate-90"
                        )} />
                      </div>
                    </CardHeader>

                    {isExpanded && (
                      <CardContent className="space-y-3 pt-0">
                        {category.items.map((item) => {
                          const risk = formData.risks.find(
                            (r) => r.categoryId === category.id && r.itemId === item.id
                          );
                          const isSelected = !!risk;

                          return (
                            <div key={item.id} className="space-y-3">
                              <button
                                onClick={() => toggleRiskItem(category.id, item.id)}
                                className={cn(
                                  "w-full p-3 rounded-lg border text-left transition-all flex items-center gap-3",
                                  isSelected
                                    ? "border-warning bg-warning/10"
                                    : "border-border hover:border-warning/50"
                                )}
                              >
                                <div className={cn(
                                  "h-5 w-5 rounded border flex items-center justify-center",
                                  isSelected
                                    ? "bg-warning border-warning text-white"
                                    : "border-muted-foreground"
                                )}>
                                  {isSelected && <CheckCircle className="h-3 w-3" />}
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium text-sm">{item.label}</p>
                                  <p className="text-xs text-muted-foreground">{item.description}</p>
                                </div>
                              </button>

                              {isSelected && risk && (
                                <div className="ml-8 space-y-3 p-3 bg-muted/50 rounded-lg">
                                  <div className="grid grid-cols-3 gap-2">
                                    <div className="space-y-1">
                                      <Label className="text-xs">Ernst (S)</Label>
                                      <div className="flex gap-1">
                                        {[1, 2, 3].map((s) => (
                                          <button
                                            key={s}
                                            onClick={() => updateRisk(risk.id, "severity", s)}
                                            className={cn(
                                              "flex-1 py-1.5 rounded text-xs font-medium",
                                              risk.severity === s
                                                ? s === 1 ? "bg-green-500 text-white"
                                                : s === 2 ? "bg-yellow-500 text-white"
                                                : "bg-red-500 text-white"
                                                : "bg-background border"
                                            )}
                                          >
                                            {s}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-xs">Kans (P)</Label>
                                      <div className="flex gap-1">
                                        {[1, 2, 3].map((p) => (
                                          <button
                                            key={p}
                                            onClick={() => updateRisk(risk.id, "probability", p)}
                                            className={cn(
                                              "flex-1 py-1.5 rounded text-xs font-medium",
                                              risk.probability === p
                                                ? p === 1 ? "bg-green-500 text-white"
                                                : p === 2 ? "bg-yellow-500 text-white"
                                                : "bg-red-500 text-white"
                                                : "bg-background border"
                                            )}
                                          >
                                            {p}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-xs">Blootstelling (E)</Label>
                                      <div className="flex gap-1">
                                        {[1, 2, 3].map((e) => (
                                          <button
                                            key={e}
                                            onClick={() => updateRisk(risk.id, "exposure", e)}
                                            className={cn(
                                              "flex-1 py-1.5 rounded text-xs font-medium",
                                              risk.exposure === e
                                                ? e === 1 ? "bg-green-500 text-white"
                                                : e === 2 ? "bg-yellow-500 text-white"
                                                : "bg-red-500 text-white"
                                                : "bg-background border"
                                            )}
                                          >
                                            {e}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  </div>

                                  {risk.priority && (
                                    <div className={cn(
                                      "p-2 rounded text-center",
                                      getRiskPriority(risk.severity * risk.probability * risk.exposure).bgColor
                                    )}>
                                      <p className={cn(
                                        "text-sm font-semibold",
                                        getRiskPriority(risk.severity * risk.probability * risk.exposure).color
                                      )}>
                                        Score: {risk.severity * risk.probability * risk.exposure} - 
                                        Prioriteit: {risk.priority === "high" ? "Hoog" : risk.priority === "medium" ? "Midden" : "Laag"}
                                      </p>
                                    </div>
                                  )}

                                  <div className="space-y-1">
                                    <Label className="text-xs">Huidige maatregelen</Label>
                                    <Input
                                      value={risk.currentControls}
                                      onChange={(e) => updateRisk(risk.id, "currentControls", e.target.value)}
                                      placeholder="Current control measures in place..."
                                      className="h-9 text-sm"
                                    />
                                  </div>
                                </div>
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

        {/* Section 4: Plan van Aanpak */}
        {currentSection === 3 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
                <Shield className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Plan van Aanpak</h2>
                <p className="text-sm text-muted-foreground">Action plan for identified risks</p>
              </div>
            </div>

            {formData.risks.filter((r) => r.priority === "high" || r.priority === "medium").length === 0 ? (
              <Card className="bg-green-50 border-green-200">
                <CardContent className="py-8 text-center">
                  <CheckCircle className="h-10 w-10 text-green-600 mx-auto mb-2" />
                  <p className="text-sm text-green-800">No high or medium priority risks identified</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {formData.risks
                  .filter((r) => r.priority === "high" || r.priority === "medium")
                  .sort((a, b) => {
                    if (a.priority === "high" && b.priority !== "high") return -1;
                    if (b.priority === "high" && a.priority !== "high") return 1;
                    return 0;
                  })
                  .map((risk) => {
                    const category = RISK_CATEGORIES.find((c) => c.id === risk.categoryId);
                    const item = category?.items.find((i) => i.id === risk.itemId);
                    const riskInfo = getRiskPriority(risk.severity * risk.probability * risk.exposure);

                    return (
                      <Card key={risk.id} className={cn(
                        "border-2",
                        risk.priority === "high" ? "border-red-300" : "border-yellow-300"
                      )}>
                        <CardHeader className="py-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-sm">{item?.label}</p>
                              <p className="text-xs text-muted-foreground">{category?.title}</p>
                            </div>
                            <Badge className={cn(riskInfo.bgColor, riskInfo.color)}>
                              {risk.priority === "high" ? "Hoog" : "Midden"}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Vereiste actie (Action Required) *</Label>
                            <Textarea
                              value={risk.actionRequired}
                              onChange={(e) => updateRisk(risk.id, "actionRequired", e.target.value)}
                              placeholder="What action needs to be taken?"
                              className="min-h-[60px] text-sm"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs">Verantwoordelijke</Label>
                              <Input
                                value={risk.responsible}
                                onChange={(e) => updateRisk(risk.id, "responsible", e.target.value)}
                                placeholder="Who is responsible?"
                                className="h-9 text-sm"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Deadline</Label>
                              <Input
                                type="date"
                                value={risk.deadline}
                                onChange={(e) => updateRisk(risk.id, "deadline", e.target.value)}
                                className="h-9 text-sm"
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-base">Algemene maatregelen (General Measures)</Label>
              <Textarea
                value={formData.generalMeasures}
                onChange={(e) => setFormData({ ...formData, generalMeasures: e.target.value })}
                placeholder="General safety measures applicable across the organization..."
                className="min-h-[100px]"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-base">Aanvullende opmerkingen</Label>
              <Textarea
                value={formData.additionalNotes}
                onChange={(e) => setFormData({ ...formData, additionalNotes: e.target.value })}
                placeholder="Any additional notes or observations..."
                className="min-h-[80px]"
              />
            </div>
          </div>
        )}

        {/* Section 5: Review */}
        {currentSection === 4 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">{t("riskAssessment.reviewAndSubmit")}</h2>
                <p className="text-sm text-muted-foreground">Review your RI&E before submitting</p>
              </div>
            </div>

            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-base">Bedrijfsgegevens</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bedrijf:</span>
                  <span className="font-medium">{formData.companyName || "Niet ingevuld"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">KvK-nummer:</span>
                  <span>{formData.kvkNumber || "N.v.t."}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Aantal medewerkers:</span>
                  <span>{formData.employeeCount || "Niet ingevuld"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Datum:</span>
                  <span>{formData.assessmentDate}</span>
                </div>
              </CardContent>
            </Card>

            <Card className={cn(
              "border-2",
              highRisks > 0 ? "border-red-300" : mediumRisks > 0 ? "border-yellow-300" : "border-green-300"
            )}>
              <CardHeader className="py-3">
                <CardTitle className="text-base">Risico Samenvatting</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-red-600">Hoge risico&apos;s:</span>
                  <span className="font-bold text-red-600">{highRisks}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-yellow-600">Midden risico&apos;s:</span>
                  <span className="font-bold text-yellow-600">{mediumRisks}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-600">Lage risico&apos;s:</span>
                  <span className="font-bold text-green-600">{lowRisks}</span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className="text-muted-foreground">Totaal:</span>
                  <span className="font-bold">{formData.risks.length}</span>
                </div>
              </CardContent>
            </Card>

            {formData.externalReviewRequired && (
              <Card className="bg-warning/10 border-warning">
                <CardContent className="py-4">
                  <p className="text-sm font-medium text-warning">
                    ⚠️ Toetsing verplicht
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    This RI&E must be reviewed by a certified arbo-professional (preventiemedewerker) 
                    before it is valid per Arbowet Article 5.
                  </p>
                </CardContent>
              </Card>
            )}

            <Card className="bg-muted/50">
              <CardContent className="py-4">
                <p className="text-xs text-muted-foreground">
                  By submitting this RI&E, you confirm that the risk inventory and evaluation 
                  is complete and accurate to the best of your knowledge. The Plan van Aanpak 
                  will be generated and tracked for follow-up.
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
                {t("riskAssessment.submitAssessment")}
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
