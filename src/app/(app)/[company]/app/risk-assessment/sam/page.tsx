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

// SAM Risk Categories per AFS 2023:1
const SAM_CATEGORIES = [
  {
    id: "physical",
    title: "Fysiska arbetsmiljörisker",
    icon: "💪",
    items: [
      { id: "phy_noise", label: "Buller (Noise)", description: "Noise levels above 80 dB" },
      { id: "phy_vibration", label: "Vibrationer (Vibration)", description: "Hand-arm or whole-body" },
      { id: "phy_lighting", label: "Belysning (Lighting)", description: "Inadequate or glare" },
      { id: "phy_climate", label: "Klimat (Climate)", description: "Temperature, ventilation, humidity" },
      { id: "phy_ergonomic", label: "Ergonomi (Ergonomics)", description: "Workstation, lifting, posture" },
      { id: "phy_chemical", label: "Kemiska risker (Chemical)", description: "Hazardous substances exposure" },
    ],
  },
  {
    id: "accident",
    title: "Olycksrisker (Accident Risks)",
    icon: "⚠️",
    items: [
      { id: "acc_fall", label: "Fallrisk (Fall hazard)", description: "Heights, slippery surfaces" },
      { id: "acc_machinery", label: "Maskiner (Machinery)", description: "Moving parts, entanglement" },
      { id: "acc_vehicles", label: "Fordon (Vehicles)", description: "Internal transport" },
      { id: "acc_electrical", label: "El (Electrical)", description: "Shock, arc flash" },
      { id: "acc_fire", label: "Brand (Fire)", description: "Fire and explosion risk" },
      { id: "acc_struck", label: "Träffas av föremål (Struck-by)", description: "Falling or flying objects" },
    ],
  },
  {
    id: "organizational",
    title: "Organisatoriska faktorer",
    icon: "📊",
    items: [
      { id: "org_workload", label: "Arbetsbelastning (Workload)", description: "Work demands vs resources" },
      { id: "org_workhours", label: "Arbetstider (Working hours)", description: "Shift work, overtime" },
      { id: "org_control", label: "Inflytande (Control)", description: "Ability to influence work" },
      { id: "org_change", label: "Förändring (Change)", description: "Organizational changes, restructuring" },
    ],
  },
  {
    id: "social",
    title: "Sociala faktorer",
    icon: "👥",
    items: [
      { id: "soc_harassment", label: "Kränkande särbehandling (Harassment)", description: "Bullying, discrimination" },
      { id: "soc_violence", label: "Hot och våld (Threats/Violence)", description: "From colleagues or external" },
      { id: "soc_solo", label: "Ensamarbete (Solo work)", description: "Working alone risks" },
      { id: "soc_support", label: "Socialt stöd (Social support)", description: "Lack of colleague/manager support" },
    ],
  },
];

interface RiskItem {
  id: string;
  categoryId: string;
  itemId: string;
  present: boolean;
  severity: number; // 1-4: Minimal, Moderate, Significant, Severe
  probability: number; // 1-4: Unlikely, Possible, Probable, Certain
  currentMeasures: string;
  additionalMeasures: string;
  responsible: string;
  deadline: string;
}

interface SAMFormData {
  // Section 1: Organization Info
  organizationName: string;
  department: string;
  workplace: string;
  assessmentDate: string;
  assessor: string;
  participants: string;
  
  // Section 2: Risk Identification
  risks: RiskItem[];
  
  // Section 3: Measures
  generalMeasures: string;
  followUpDate: string;
  
  // Section 4: Signatures
  signedBy: string;
}

const initialFormData: SAMFormData = {
  organizationName: "",
  department: "",
  workplace: "",
  assessmentDate: new Date().toISOString().split("T")[0],
  assessor: "",
  participants: "",
  risks: [],
  generalMeasures: "",
  followUpDate: "",
  signedBy: "",
};

function getRiskLevel(score: number): { level: string; color: string; bgColor: string; priority: number } {
  if (score <= 4) return { level: "Låg (Low)", color: "text-green-700", bgColor: "bg-green-100", priority: 3 };
  if (score <= 8) return { level: "Medel (Medium)", color: "text-yellow-700", bgColor: "bg-yellow-100", priority: 2 };
  if (score <= 12) return { level: "Hög (High)", color: "text-orange-700", bgColor: "bg-orange-100", priority: 1 };
  return { level: "Mycket hög (Very High)", color: "text-red-700", bgColor: "bg-red-100", priority: 0 };
}

export default function SAMFormPage() {
  const router = useRouter();
  const company = useCompanyParam();
  const [currentSection, setCurrentSection] = React.useState(0);
  const [formData, setFormData] = React.useState<SAMFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { add: addEvaluation } = useRiskEvaluationsStore();
  const { user } = useAuth();
  const { toast } = useToast();
  const [expandedCategory, setExpandedCategory] = React.useState<string | null>("physical");

  const { t } = useTranslation();

  const sections = [
    { id: "org", title: "Organisation", icon: Building2 },
    { id: "risks", title: "Riskbedömning", icon: AlertTriangle },
    { id: "measures", title: "Åtgärder", icon: Shield },
    { id: "review", title: "Granska", icon: CheckCircle },
  ];

  const currentSectionData = sections[currentSection];
  const isLastSection = currentSection === sections.length - 1;

  // Toggle risk item
  const toggleRiskItem = (categoryId: string, itemId: string) => {
    const existing = formData.risks.find(
      (r) => r.categoryId === categoryId && r.itemId === itemId
    );

    if (existing) {
      setFormData({
        ...formData,
        risks: formData.risks.filter((r) => r.id !== existing.id),
      });
    } else {
      const newRisk: RiskItem = {
        id: `${categoryId}_${itemId}_${Date.now()}`,
        categoryId,
        itemId,
        present: true,
        severity: 0,
        probability: 0,
        currentMeasures: "",
        additionalMeasures: "",
        responsible: "",
        deadline: "",
      };
      setFormData({ ...formData, risks: [...formData.risks, newRisk] });
    }
  };

  // Update risk
  const updateRisk = (riskId: string, field: keyof RiskItem, value: RiskItem[keyof RiskItem]) => {
    setFormData({
      ...formData,
      risks: formData.risks.map((r) => (r.id === riskId ? { ...r, [field]: value } : r)),
    });
  };

  // Count by level
  const highRisks = formData.risks.filter((r) => {
    const score = r.severity * r.probability;
    return score > 8;
  }).length;
  const mediumRisks = formData.risks.filter((r) => {
    const score = r.severity * r.probability;
    return score >= 5 && score <= 8;
  }).length;
  const lowRisks = formData.risks.filter((r) => {
    const score = r.severity * r.probability;
    return score > 0 && score < 5;
  }).length;

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
    const refNumber = `SAM-${now.getFullYear()}-${String(Math.floor(Math.random() * 999) + 1).padStart(3, "0")}`;
    const evaluation: RiskEvaluation = {
      id: crypto.randomUUID(),
      company_id: user.company_id || "",
      submitter_id: user.id,
      country: "SE",
      form_type: "SAM",
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
            <h1 className="font-semibold text-sm">{t("riskAssessment.samTitle")}</h1>
            <p className="text-xs text-muted-foreground">
              {currentSectionData.title} • Steg {currentSection + 1} av {sections.length}
            </p>
          </div>
          <span className="text-xs text-muted-foreground">SE</span>
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
        {/* Section 1: Organization Info */}
        {currentSection === 0 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Organisationsuppgifter</h2>
                <p className="text-sm text-muted-foreground">Organization and workplace information</p>
              </div>
            </div>

            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="py-4">
                <p className="text-sm text-blue-800">
                  <strong>AFS 2023:1 (SE):</strong> Systematic Work Environment Management (SAM) is 
                  required for all Swedish employers under the Work Environment Act (Arbetsmiljölagen).
                </p>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-base">Organisation *</Label>
                <Input
                  value={formData.organizationName}
                  onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                  placeholder="Organization name"
                  className="h-12"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-base">Avdelning (Department)</Label>
                  <Input
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    placeholder="Department"
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-base">Arbetsplats *</Label>
                  <Input
                    value={formData.workplace}
                    onChange={(e) => setFormData({ ...formData, workplace: e.target.value })}
                    placeholder="Workplace/location"
                    className="h-12"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-base">Datum *</Label>
                  <Input
                    type="date"
                    value={formData.assessmentDate}
                    onChange={(e) => setFormData({ ...formData, assessmentDate: e.target.value })}
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-base">Utförd av *</Label>
                  <Input
                    value={formData.assessor}
                    onChange={(e) => setFormData({ ...formData, assessor: e.target.value })}
                    placeholder="Assessor name"
                    className="h-12"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-base">Deltagare (Participants)</Label>
                <Textarea
                  value={formData.participants}
                  onChange={(e) => setFormData({ ...formData, participants: e.target.value })}
                  placeholder="List participants including employee representatives (skyddsombud)..."
                  className="min-h-[80px]"
                />
              </div>
            </div>
          </div>
        )}

        {/* Section 2: Risk Assessment */}
        {currentSection === 1 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warning/10">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Riskbedömning</h2>
                  <p className="text-sm text-muted-foreground">
                    {formData.risks.length} risker identifierade
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
                    <p className="text-xs text-red-700">Hög</p>
                  </CardContent>
                </Card>
                <Card className="bg-yellow-50 border-yellow-200">
                  <CardContent className="py-3 text-center">
                    <p className="text-2xl font-bold text-yellow-600">{mediumRisks}</p>
                    <p className="text-xs text-yellow-700">Medel</p>
                  </CardContent>
                </Card>
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="py-3 text-center">
                    <p className="text-2xl font-bold text-green-600">{lowRisks}</p>
                    <p className="text-xs text-green-700">Låg</p>
                  </CardContent>
                </Card>
              </div>
            )}

            <div className="space-y-4">
              {SAM_CATEGORIES.map((category) => {
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
                              {categoryRisks.length} risk{categoryRisks.length !== 1 ? "er" : ""} valda
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
                                  <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                      <Label className="text-xs">Allvarlighet (1-4)</Label>
                                      <div className="flex gap-1">
                                        {[1, 2, 3, 4].map((s) => (
                                          <button
                                            key={s}
                                            onClick={() => updateRisk(risk.id, "severity", s)}
                                            className={cn(
                                              "flex-1 py-1.5 rounded text-xs font-medium",
                                              risk.severity === s
                                                ? s <= 1 ? "bg-green-500 text-white"
                                                : s <= 2 ? "bg-yellow-500 text-white"
                                                : s <= 3 ? "bg-orange-500 text-white"
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
                                      <Label className="text-xs">Sannolikhet (1-4)</Label>
                                      <div className="flex gap-1">
                                        {[1, 2, 3, 4].map((p) => (
                                          <button
                                            key={p}
                                            onClick={() => updateRisk(risk.id, "probability", p)}
                                            className={cn(
                                              "flex-1 py-1.5 rounded text-xs font-medium",
                                              risk.probability === p
                                                ? p <= 1 ? "bg-green-500 text-white"
                                                : p <= 2 ? "bg-yellow-500 text-white"
                                                : p <= 3 ? "bg-orange-500 text-white"
                                                : "bg-red-500 text-white"
                                                : "bg-background border"
                                            )}
                                          >
                                            {p}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  </div>

                                  {risk.severity > 0 && risk.probability > 0 && (
                                    <div className={cn(
                                      "p-2 rounded text-center",
                                      getRiskLevel(risk.severity * risk.probability).bgColor
                                    )}>
                                      <p className={cn(
                                        "text-sm font-semibold",
                                        getRiskLevel(risk.severity * risk.probability).color
                                      )}>
                                        Risknivå: {getRiskLevel(risk.severity * risk.probability).level}
                                      </p>
                                    </div>
                                  )}

                                  <div className="space-y-1">
                                    <Label className="text-xs">Nuvarande åtgärder</Label>
                                    <Input
                                      value={risk.currentMeasures}
                                      onChange={(e) => updateRisk(risk.id, "currentMeasures", e.target.value)}
                                      placeholder="Current control measures..."
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

        {/* Section 3: Measures */}
        {currentSection === 2 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
                <Shield className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Åtgärder</h2>
                <p className="text-sm text-muted-foreground">Action plan for identified risks</p>
              </div>
            </div>

            {formData.risks.filter((r) => r.severity * r.probability > 4).length === 0 ? (
              <Card className="bg-green-50 border-green-200">
                <CardContent className="py-8 text-center">
                  <CheckCircle className="h-10 w-10 text-green-600 mx-auto mb-2" />
                  <p className="text-sm text-green-800">Inga höga eller medelrisker identifierade</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {formData.risks
                  .filter((r) => r.severity * r.probability > 4)
                  .sort((a, b) => (b.severity * b.probability) - (a.severity * a.probability))
                  .map((risk) => {
                    const category = SAM_CATEGORIES.find((c) => c.id === risk.categoryId);
                    const item = category?.items.find((i) => i.id === risk.itemId);
                    const riskInfo = getRiskLevel(risk.severity * risk.probability);

                    return (
                      <Card key={risk.id} className={cn(
                        "border-2",
                        riskInfo.priority <= 1 ? "border-red-300" : "border-yellow-300"
                      )}>
                        <CardHeader className="py-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-sm">{item?.label}</p>
                              <p className="text-xs text-muted-foreground">{category?.title}</p>
                            </div>
                            <Badge className={cn(riskInfo.bgColor, riskInfo.color)}>
                              {riskInfo.level}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Ytterligare åtgärder (Additional Measures) *</Label>
                            <Textarea
                              value={risk.additionalMeasures}
                              onChange={(e) => updateRisk(risk.id, "additionalMeasures", e.target.value)}
                              placeholder="What additional measures are needed?"
                              className="min-h-[60px] text-sm"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs">Ansvarig (Responsible)</Label>
                              <Input
                                value={risk.responsible}
                                onChange={(e) => updateRisk(risk.id, "responsible", e.target.value)}
                                placeholder="Who?"
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

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-base">Generella åtgärder (General Measures)</Label>
                <Textarea
                  value={formData.generalMeasures}
                  onChange={(e) => setFormData({ ...formData, generalMeasures: e.target.value })}
                  placeholder="General improvements and preventive measures..."
                  className="min-h-[100px]"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-base">Uppföljningsdatum (Follow-up Date)</Label>
                <Input
                  type="date"
                  value={formData.followUpDate}
                  onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })}
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
                <p className="text-sm text-muted-foreground">Review before submitting</p>
              </div>
            </div>

            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-base">Sammanfattning</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Organisation:</span>
                  <span className="font-medium">{formData.organizationName || "Ej angivet"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Arbetsplats:</span>
                  <span>{formData.workplace || "Ej angivet"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Datum:</span>
                  <span>{formData.assessmentDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Utförd av:</span>
                  <span>{formData.assessor || "Ej angivet"}</span>
                </div>
              </CardContent>
            </Card>

            <Card className={cn(
              "border-2",
              highRisks > 0 ? "border-red-300" : mediumRisks > 0 ? "border-yellow-300" : "border-green-300"
            )}>
              <CardHeader className="py-3">
                <CardTitle className="text-base">Risksammanfattning</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-red-600">Hög risk:</span>
                  <span className="font-bold text-red-600">{highRisks}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-yellow-600">Medel risk:</span>
                  <span className="font-bold text-yellow-600">{mediumRisks}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-600">Låg risk:</span>
                  <span className="font-bold text-green-600">{lowRisks}</span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className="text-muted-foreground">Totalt:</span>
                  <span className="font-bold">{formData.risks.length}</span>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <Label className="text-base">Signerad av *</Label>
              <Input
                value={formData.signedBy}
                onChange={(e) => setFormData({ ...formData, signedBy: e.target.value })}
                placeholder="Your name (electronic signature)"
                className="h-12"
              />
            </div>

            <Card className="bg-muted/50">
              <CardContent className="py-4">
                <p className="text-xs text-muted-foreground">
                  Genom att skicka in bekräftar du att riskbedömningen är korrekt och fullständig. 
                  Dokumentet kommer att arkiveras och åtgärder följas upp.
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
            disabled={isSubmitting || (isLastSection && !formData.signedBy)}
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
