"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useCompanyParam } from "@/hooks/use-company-param";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  FileCheck,
  Plus,
  Trash2,
  Info,
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

// PPE Options (OSHA standard)
const PPE_OPTIONS = [
  { id: "hard_hat", label: "Hard Hat", icon: "🪖" },
  { id: "safety_glasses", label: "Safety Glasses", icon: "🥽" },
  { id: "face_shield", label: "Face Shield", icon: "😷" },
  { id: "hearing_protection", label: "Hearing Protection", icon: "🎧" },
  { id: "gloves", label: "Gloves", icon: "🧤" },
  { id: "steel_toe_boots", label: "Steel-toe Boots", icon: "👢" },
  { id: "high_vis_vest", label: "High-vis Vest", icon: "🦺" },
  { id: "respirator", label: "Respirator", icon: "😮‍💨" },
  { id: "fall_protection", label: "Fall Protection", icon: "🪢" },
  { id: "chemical_suit", label: "Chemical Suit", icon: "🧪" },
];

// Hazard types (OSHA Focus Four + additional)
const HAZARD_TYPES = [
  { id: "struck_by", label: "Struck-by", description: "Moving objects, falling materials" },
  { id: "fall", label: "Fall Hazards", description: "Heights, slips, trips" },
  { id: "caught_in", label: "Caught-in/Between", description: "Moving machinery, pinch points" },
  { id: "electrical", label: "Electrical", description: "Exposed wiring, high voltage" },
  { id: "chemical", label: "Chemical", description: "Fumes, spills, exposure" },
  { id: "ergonomic", label: "Ergonomic", description: "Lifting, repetitive motion" },
  { id: "environmental", label: "Environmental", description: "Heat, cold, weather" },
  { id: "biological", label: "Biological", description: "Pathogens, allergens" },
  { id: "other", label: "Other", description: "Other hazards not listed" },
];

interface JobStep {
  id: string;
  stepNumber: number;
  description: string;
  hazards: string[];
  hazardDescription: string;
  severity: number;
  probability: number;
  existingControls: string;
  recommendedControls: string;
}

interface JHAFormData {
  // Section 1: Administrative Information
  jobTitle: string;
  location: string;
  department: string;
  jobDescription: string;
  date: string;
  supervisor: string;
  
  // Section 2: Job Steps & Hazards
  jobSteps: JobStep[];
  
  // Section 3: PPE Requirements
  ppeRequired: string[];
  otherPPE: string;
  
  // Section 4: Training & Precautions
  trainingRequired: string;
  specialPrecautions: string;
  
  // Section 5: Notes
  additionalNotes: string;
}

const initialFormData: JHAFormData = {
  jobTitle: "",
  location: "",
  department: "",
  jobDescription: "",
  date: new Date().toISOString().split("T")[0],
  supervisor: "",
  jobSteps: [
    {
      id: "step_1",
      stepNumber: 1,
      description: "",
      hazards: [],
      hazardDescription: "",
      severity: 0,
      probability: 0,
      existingControls: "",
      recommendedControls: "",
    },
  ],
  ppeRequired: [],
  otherPPE: "",
  trainingRequired: "",
  specialPrecautions: "",
  additionalNotes: "",
};

function getRiskLevel(score: number): { level: string; color: string; bgColor: string } {
  if (score === 0) return { level: "Not assessed", color: "text-muted-foreground", bgColor: "bg-muted" };
  if (score <= 5) return { level: "Low", color: "text-green-700", bgColor: "bg-green-100" };
  if (score <= 11) return { level: "Medium", color: "text-yellow-700", bgColor: "bg-yellow-100" };
  return { level: "High", color: "text-red-700", bgColor: "bg-red-100" };
}

export default function JHAFormPage() {
  const router = useRouter();
  const company = useCompanyParam();
  const [currentSection, setCurrentSection] = React.useState(0);
  const [formData, setFormData] = React.useState<JHAFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { add: addEvaluation } = useRiskEvaluationsStore();
  const { user } = useAuth();
  const { toast } = useToast();
  const [expandedStep, setExpandedStep] = React.useState<string | null>("step_1");

  const { t } = useTranslation();

  const sections = [
    { id: "admin", title: "Job Information", icon: FileCheck },
    { id: "hazards", title: "Hazard Analysis", icon: AlertTriangle },
    { id: "ppe", title: "PPE Requirements", icon: Shield },
    { id: "training", title: "Training & Precautions", icon: Info },
    { id: "review", title: "Review & Submit", icon: CheckCircle },
  ];

  const currentSectionData = sections[currentSection];
  const isLastSection = currentSection === sections.length - 1;

  // Add new job step
  const addJobStep = () => {
    const newStep: JobStep = {
      id: `step_${formData.jobSteps.length + 1}`,
      stepNumber: formData.jobSteps.length + 1,
      description: "",
      hazards: [],
      hazardDescription: "",
      severity: 0,
      probability: 0,
      existingControls: "",
      recommendedControls: "",
    };
    setFormData({ ...formData, jobSteps: [...formData.jobSteps, newStep] });
    setExpandedStep(newStep.id);
  };

  // Remove job step
  const removeJobStep = (stepId: string) => {
    if (formData.jobSteps.length <= 1) return;
    const newSteps = formData.jobSteps
      .filter((s) => s.id !== stepId)
      .map((s, i) => ({ ...s, stepNumber: i + 1 }));
    setFormData({ ...formData, jobSteps: newSteps });
  };

  // Update job step
  const updateJobStep = (stepId: string, field: keyof JobStep, value: JobStep[keyof JobStep]) => {
    const newSteps = formData.jobSteps.map((s) =>
      s.id === stepId ? { ...s, [field]: value } : s
    );
    setFormData({ ...formData, jobSteps: newSteps });
  };

  // Toggle hazard in step
  const toggleHazard = (stepId: string, hazardId: string) => {
    const step = formData.jobSteps.find((s) => s.id === stepId);
    if (!step) return;
    const newHazards = step.hazards.includes(hazardId)
      ? step.hazards.filter((h) => h !== hazardId)
      : [...step.hazards, hazardId];
    updateJobStep(stepId, "hazards", newHazards);
  };

  // Toggle PPE
  const togglePPE = (ppeId: string) => {
    const newPPE = formData.ppeRequired.includes(ppeId)
      ? formData.ppeRequired.filter((p) => p !== ppeId)
      : [...formData.ppeRequired, ppeId];
    setFormData({ ...formData, ppeRequired: newPPE });
  };

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
    const refNumber = `JHA-${now.getFullYear()}-${String(Math.floor(Math.random() * 999) + 1).padStart(3, "0")}`;
    const evaluation: RiskEvaluation = {
      id: crypto.randomUUID(),
      company_id: user.company_id || "",
      submitter_id: user.id,
      country: "US",
      form_type: "JHA",
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

  // Calculate total risk score for summary
  const maxRiskScore = Math.max(...formData.jobSteps.map((s) => s.severity * s.probability), 0);
  const overallRisk = getRiskLevel(maxRiskScore);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b bg-background">
        <div className="flex h-14 items-center gap-4 px-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-semibold text-sm">{t("riskAssessment.jhaTitle")}</h1>
            <p className="text-xs text-muted-foreground">
              {currentSectionData.title} • {t("riskAssessment.section", { current: String(currentSection + 1), total: String(sections.length) })}
            </p>
          </div>
          <span className="text-xs text-muted-foreground">OSHA</span>
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-muted" role="progressbar" aria-label="Completion progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(((currentSection + 1) / sections.length) * 100)}>
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${((currentSection + 1) / sections.length) * 100}%` }}
          />
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 p-4 pb-32">
        {/* Section 1: Administrative Information */}
        {currentSection === 0 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <FileCheck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Job Information</h2>
                <p className="text-sm text-muted-foreground">Basic details about the task being analyzed</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-base">Job/Task Title *</Label>
                <Input
                  value={formData.jobTitle}
                  onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                  placeholder="e.g., Forklift Loading Operations"
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-base">Work Location *</Label>
                <Input
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g., Warehouse A, Loading Bay 3"
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-base">Department *</Label>
                <Input
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder="e.g., Logistics, Manufacturing"
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-base">Job Description</Label>
                <Textarea
                  value={formData.jobDescription}
                  onChange={(e) => setFormData({ ...formData, jobDescription: e.target.value })}
                  placeholder="Brief description of the task, tools/equipment used, and work environment"
                  className="min-h-[100px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-base">Analysis Date *</Label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-base">Supervisor *</Label>
                  <Input
                    value={formData.supervisor}
                    onChange={(e) => setFormData({ ...formData, supervisor: e.target.value })}
                    placeholder="Supervisor name"
                    className="h-12"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section 2: Hazard Analysis (Job Steps) */}
        {currentSection === 1 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warning/10">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Hazard Analysis</h2>
                  <p className="text-sm text-muted-foreground">Break down the job into steps and identify hazards</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {formData.jobSteps.map((step) => {
                const riskScore = step.severity * step.probability;
                const risk = getRiskLevel(riskScore);
                const isExpanded = expandedStep === step.id;

                return (
                  <Card key={step.id} className="overflow-hidden">
                    <CardHeader 
                      className="cursor-pointer py-3"
                      onClick={() => setExpandedStep(isExpanded ? null : step.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white text-sm font-bold">
                            {step.stepNumber}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-sm">
                              {step.description || `Step ${step.stepNumber}`}
                            </p>
                            {step.hazards.length > 0 && (
                              <p className="text-xs text-muted-foreground">
                                {step.hazards.length} hazard{step.hazards.length > 1 ? "s" : ""} identified
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {riskScore > 0 && (
                            <Badge className={cn("text-xs", risk.bgColor, risk.color)}>
                              {riskScore} - {risk.level}
                            </Badge>
                          )}
                          {formData.jobSteps.length > 1 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeJobStep(step.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>

                    {isExpanded && (
                      <CardContent className="space-y-4 pt-0">
                        <div className="space-y-2">
                          <Label>Step Description *</Label>
                          <Textarea
                            value={step.description}
                            onChange={(e) => updateJobStep(step.id, "description", e.target.value)}
                            placeholder="Describe the action (start with a verb, e.g., 'Load pallets onto forklift')"
                            className="min-h-[80px]"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Potential Hazards *</Label>
                          <p className="text-xs text-muted-foreground">Select all hazards that apply to this step</p>
                          <div className="grid grid-cols-2 gap-2">
                            {HAZARD_TYPES.map((hazard) => (
                              <button
                                key={hazard.id}
                                onClick={() => toggleHazard(step.id, hazard.id)}
                                className={cn(
                                  "p-3 rounded-lg border text-left transition-all",
                                  step.hazards.includes(hazard.id)
                                    ? "border-warning bg-warning/10"
                                    : "border-border hover:border-warning/50"
                                )}
                              >
                                <p className="font-medium text-sm">{hazard.label}</p>
                                <p className="text-xs text-muted-foreground">{hazard.description}</p>
                              </button>
                            ))}
                          </div>
                        </div>

                        {step.hazards.length > 0 && (
                          <>
                            <div className="space-y-2">
                              <Label>Hazard Details</Label>
                              <Textarea
                                value={step.hazardDescription}
                                onChange={(e) => updateJobStep(step.id, "hazardDescription", e.target.value)}
                                placeholder="Describe the specific hazards in more detail"
                                className="min-h-[60px]"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Severity (1-5) *</Label>
                                <div className="flex gap-1">
                                  {[1, 2, 3, 4, 5].map((s) => (
                                    <button
                                      key={s}
                                      onClick={() => updateJobStep(step.id, "severity", s)}
                                      className={cn(
                                        "flex-1 py-2 rounded-lg border font-medium transition-all",
                                        step.severity === s
                                          ? s <= 2 ? "bg-green-500 text-white border-green-500"
                                          : s <= 3 ? "bg-yellow-500 text-white border-yellow-500"
                                          : "bg-red-500 text-white border-red-500"
                                          : "border-border hover:border-primary/50"
                                      )}
                                    >
                                      {s}
                                    </button>
                                  ))}
                                </div>
                                <p className="text-xs text-muted-foreground">1=Minor, 5=Catastrophic</p>
                              </div>
                              <div className="space-y-2">
                                <Label>Probability (1-5) *</Label>
                                <div className="flex gap-1">
                                  {[1, 2, 3, 4, 5].map((p) => (
                                    <button
                                      key={p}
                                      onClick={() => updateJobStep(step.id, "probability", p)}
                                      className={cn(
                                        "flex-1 py-2 rounded-lg border font-medium transition-all",
                                        step.probability === p
                                          ? p <= 2 ? "bg-green-500 text-white border-green-500"
                                          : p <= 3 ? "bg-yellow-500 text-white border-yellow-500"
                                          : "bg-red-500 text-white border-red-500"
                                          : "border-border hover:border-primary/50"
                                      )}
                                    >
                                      {p}
                                    </button>
                                  ))}
                                </div>
                                <p className="text-xs text-muted-foreground">1=Rare, 5=Almost certain</p>
                              </div>
                            </div>

                            {riskScore > 0 && (
                              <div className={cn("p-3 rounded-lg", risk.bgColor)}>
                                <p className={cn("font-semibold", risk.color)}>
                                  Risk Score: {riskScore} ({risk.level})
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {riskScore <= 5 ? "Monitor and address when practical" :
                                   riskScore <= 11 ? "Plan corrective action" :
                                   "Immediate action required"}
                                </p>
                              </div>
                            )}

                            <div className="space-y-2">
                              <Label>Existing Controls</Label>
                              <Textarea
                                value={step.existingControls}
                                onChange={(e) => updateJobStep(step.id, "existingControls", e.target.value)}
                                placeholder="What controls are already in place?"
                                className="min-h-[60px]"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label>Recommended Controls *</Label>
                              <Textarea
                                value={step.recommendedControls}
                                onChange={(e) => updateJobStep(step.id, "recommendedControls", e.target.value)}
                                placeholder="Following hierarchy: Elimination > Substitution > Engineering > Administrative > PPE"
                                className="min-h-[80px]"
                              />
                            </div>
                          </>
                        )}
                      </CardContent>
                    )}
                  </Card>
                );
              })}

              <Button
                variant="outline"
                className="w-full h-12 gap-2"
                onClick={addJobStep}
              >
                <Plus className="h-4 w-4" />
                Add Another Step
              </Button>
            </div>
          </div>
        )}

        {/* Section 3: PPE Requirements */}
        {currentSection === 2 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                <Shield className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">PPE Requirements</h2>
                <p className="text-sm text-muted-foreground">Select all required personal protective equipment</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {PPE_OPTIONS.map((ppe) => (
                <button
                  key={ppe.id}
                  onClick={() => togglePPE(ppe.id)}
                  className={cn(
                    "p-4 rounded-xl border-2 text-left transition-all flex items-center gap-3",
                    formData.ppeRequired.includes(ppe.id)
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <span className="text-2xl">{ppe.icon}</span>
                  <span className="font-medium text-sm">{ppe.label}</span>
                  {formData.ppeRequired.includes(ppe.id) && (
                    <CheckCircle className="h-5 w-5 text-primary ml-auto" />
                  )}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <Label>Other PPE (if not listed above)</Label>
              <Input
                value={formData.otherPPE}
                onChange={(e) => setFormData({ ...formData, otherPPE: e.target.value })}
                placeholder="e.g., Welding mask, Arc flash suit"
                className="h-12"
              />
            </div>

            {formData.ppeRequired.length > 0 && (
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="py-4">
                  <p className="text-sm font-medium text-blue-800">
                    {formData.ppeRequired.length} PPE item{formData.ppeRequired.length > 1 ? "s" : ""} required:
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    {formData.ppeRequired.map(id => 
                      PPE_OPTIONS.find(p => p.id === id)?.label
                    ).join(", ")}
                    {formData.otherPPE && `, ${formData.otherPPE}`}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Section 4: Training & Precautions */}
        {currentSection === 3 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
                <Info className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Training & Precautions</h2>
                <p className="text-sm text-muted-foreground">Additional requirements and special instructions</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-base">Required Training</Label>
                <Textarea
                  value={formData.trainingRequired}
                  onChange={(e) => setFormData({ ...formData, trainingRequired: e.target.value })}
                  placeholder="List any required training or certifications (e.g., Forklift certification, HAZWOPER, Lock-out/Tag-out)"
                  className="min-h-[100px]"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-base">Special Precautions</Label>
                <Textarea
                  value={formData.specialPrecautions}
                  onChange={(e) => setFormData({ ...formData, specialPrecautions: e.target.value })}
                  placeholder="Any special precautions, restrictions, or site-specific requirements"
                  className="min-h-[100px]"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-base">Additional Notes</Label>
                <Textarea
                  value={formData.additionalNotes}
                  onChange={(e) => setFormData({ ...formData, additionalNotes: e.target.value })}
                  placeholder="Any other important information or recommendations"
                  className="min-h-[100px]"
                />
              </div>
            </div>
          </div>
        )}

        {/* Section 5: Review & Submit */}
        {currentSection === 4 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">{t("riskAssessment.reviewAndSubmit")}</h2>
                <p className="text-sm text-muted-foreground">Review your JHA before submitting</p>
              </div>
            </div>

            {/* Summary Cards */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-base">Job Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Task:</span>
                  <span className="font-medium">{formData.jobTitle || "Not specified"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Location:</span>
                  <span>{formData.location || "Not specified"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Department:</span>
                  <span>{formData.department || "Not specified"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date:</span>
                  <span>{formData.date}</span>
                </div>
              </CardContent>
            </Card>

            <Card className={cn("border-2", 
              maxRiskScore <= 5 ? "border-green-300" : 
              maxRiskScore <= 11 ? "border-yellow-300" : "border-red-300"
            )}>
              <CardHeader className="py-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>Risk Summary</span>
                  <span className={cn("text-xs font-medium", overallRisk.color)}>
                    {overallRisk.level} ({maxRiskScore})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Job Steps:</span>
                  <span className="font-medium">{formData.jobSteps.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Hazards Identified:</span>
                  <span className="font-medium">
                    {formData.jobSteps.reduce((acc, s) => acc + s.hazards.length, 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Highest Risk Score:</span>
                  <span className="font-medium">{maxRiskScore || "N/A"}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-base">PPE Requirements</CardTitle>
              </CardHeader>
              <CardContent>
                {formData.ppeRequired.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {formData.ppeRequired.map((id) => {
                      const ppe = PPE_OPTIONS.find((p) => p.id === id);
                      return (
                        <span key={id} className="text-xs text-muted-foreground">
                          {ppe?.icon} {ppe?.label}
                        </span>
                      );
                    })}
                    {formData.otherPPE && (
                      <span className="text-xs text-muted-foreground">{formData.otherPPE}</span>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No PPE specified</p>
                )}
              </CardContent>
            </Card>

            <Card className="bg-muted/50">
              <CardContent className="py-4">
                <p className="text-sm text-muted-foreground">
                  By submitting this JHA, you confirm that the analysis is accurate and complete. 
                  This will be sent to your supervisor for review and approval.
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
