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
  Clock,
  User,
  MapPin,
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

// JSA Pre-work Checklist Categories
const CHECKLIST_CATEGORIES = [
  {
    id: "environmental",
    title: "Environmental Conditions",
    items: [
      { id: "weather", label: "Weather conditions safe for work", details: "No extreme weather, lightning, high winds" },
      { id: "lighting", label: "Adequate lighting available", details: "Natural or artificial lighting sufficient" },
      { id: "ventilation", label: "Proper ventilation in work area", details: "For confined or enclosed spaces" },
      { id: "temp", label: "Temperature within safe range", details: "No extreme heat/cold hazards" },
    ],
  },
  {
    id: "equipment",
    title: "Equipment & Tools",
    items: [
      { id: "tools_checked", label: "Tools inspected and in good condition", details: "No damage, guards in place" },
      { id: "ppe_available", label: "Required PPE available and functional", details: "All team members have proper PPE" },
      { id: "equipment_locked", label: "Equipment properly locked out/tagged out", details: "If applicable to the task" },
      { id: "fire_ext", label: "Fire extinguisher accessible", details: "Within 50 feet of work area" },
    ],
  },
  {
    id: "site_conditions",
    title: "Site Conditions",
    items: [
      { id: "housekeeping", label: "Work area clean and organized", details: "No trip hazards, debris cleared" },
      { id: "barricades", label: "Barricades/warning signs in place", details: "If required for the task" },
      { id: "egress", label: "Emergency exits clear and accessible", details: "Path to exits unobstructed" },
      { id: "utilities", label: "Underground/overhead utilities identified", details: "If excavation or overhead work" },
    ],
  },
  {
    id: "personnel",
    title: "Personnel Readiness",
    items: [
      { id: "trained", label: "All workers trained for task", details: "Certifications current" },
      { id: "fit_for_duty", label: "Workers fit for duty", details: "No impairment, rested, alert" },
      { id: "communication", label: "Communication methods established", details: "Radios, signals, buddy system" },
      { id: "emergency", label: "Emergency procedures reviewed", details: "All workers know emergency actions" },
    ],
  },
];

interface ChecklistItem {
  id: string;
  status: "pass" | "fail" | "na" | null;
  notes: string;
}

interface JSAFormData {
  // Header Info
  date: string;
  time: string;
  jobDescription: string;
  location: string;
  crewLeader: string;
  crewMembers: string;
  
  // Checklist
  checklistItems: { [key: string]: ChecklistItem };
  
  // Hazards & Controls
  identifiedHazards: string;
  controlMeasures: string;
  stopsWorkConditions: string;
  
  // Sign-off
  acknowledgment: boolean;
}

const initializeChecklist = (): { [key: string]: ChecklistItem } => {
  const items: { [key: string]: ChecklistItem } = {};
  CHECKLIST_CATEGORIES.forEach((cat) => {
    cat.items.forEach((item) => {
      items[item.id] = { id: item.id, status: null, notes: "" };
    });
  });
  return items;
};

const initialFormData: JSAFormData = {
  date: new Date().toISOString().split("T")[0],
  time: new Date().toTimeString().split(" ")[0].slice(0, 5),
  jobDescription: "",
  location: "",
  crewLeader: "",
  crewMembers: "",
  checklistItems: initializeChecklist(),
  identifiedHazards: "",
  controlMeasures: "",
  stopsWorkConditions: "",
  acknowledgment: false,
};

export default function JSAFormPage() {
  const router = useRouter();
  const company = useCompanyParam();
  const [currentSection, setCurrentSection] = React.useState(0);
  const [formData, setFormData] = React.useState<JSAFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { add: addEvaluation } = useRiskEvaluationsStore();
  const { user } = useAuth();
  const { toast } = useToast();

  const { t } = useTranslation();

  const sections = [
    { id: "header", title: "Job Details", icon: FileCheck },
    { id: "checklist", title: "Pre-Work Checklist", icon: AlertTriangle },
    { id: "hazards", title: "Hazards & Controls", icon: AlertTriangle },
    { id: "review", title: "Review & Sign-off", icon: CheckCircle },
  ];

  const currentSectionData = sections[currentSection];
  const isLastSection = currentSection === sections.length - 1;

  // Update checklist item
  const updateChecklistItem = (itemId: string, field: keyof ChecklistItem, value: ChecklistItem[keyof ChecklistItem]) => {
    setFormData({
      ...formData,
      checklistItems: {
        ...formData.checklistItems,
        [itemId]: { ...formData.checklistItems[itemId], [field]: value },
      },
    });
  };

  // Count completed items
  const completedCount = Object.values(formData.checklistItems).filter(
    (item) => item.status !== null
  ).length;
  const totalItems = Object.keys(formData.checklistItems).length;

  // Count fails
  const failCount = Object.values(formData.checklistItems).filter(
    (item) => item.status === "fail"
  ).length;

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
    const refNumber = `JSA-${now.getFullYear()}-${String(Math.floor(Math.random() * 999) + 1).padStart(3, "0")}`;
    const evaluation: RiskEvaluation = {
      id: `eval_${Date.now()}`,
      company_id: user.company_id || "",
      submitter_id: user.id,
      country: "US",
      form_type: "JSA",
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
            <h1 className="font-semibold text-sm">{t("riskAssessment.jsaTitle")}</h1>
            <p className="text-xs text-muted-foreground">
              {currentSectionData.title} • {t("riskAssessment.section", { current: String(currentSection + 1), total: String(sections.length) })}
            </p>
          </div>
          <span className="text-xs text-muted-foreground">Daily</span>
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
        {/* Section 1: Job Details */}
        {currentSection === 0 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <FileCheck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">{t("riskAssessment.jobDetails")}</h2>
                <p className="text-sm text-muted-foreground">{t("riskAssessment.dailyPreWork")}</p>
              </div>
            </div>

            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="py-4">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> JSA is a simplified daily safety analysis. 
                  Complete this at the start of each shift before beginning work.
                </p>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-base flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Date *
                  </Label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-base">Time *</Label>
                  <Input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="h-12"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-base">Job/Task Description *</Label>
                <Textarea
                  value={formData.jobDescription}
                  onChange={(e) => setFormData({ ...formData, jobDescription: e.target.value })}
                  placeholder="Describe today's work activities"
                  className="min-h-[80px]"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-base flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Work Location *
                </Label>
                <Input
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g., Building A, Floor 2"
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-base flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Crew Leader *
                </Label>
                <Input
                  value={formData.crewLeader}
                  onChange={(e) => setFormData({ ...formData, crewLeader: e.target.value })}
                  placeholder="Name of crew leader"
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-base">Crew Members</Label>
                <Textarea
                  value={formData.crewMembers}
                  onChange={(e) => setFormData({ ...formData, crewMembers: e.target.value })}
                  placeholder="List all crew members present (one per line)"
                  className="min-h-[80px]"
                />
              </div>
            </div>
          </div>
        )}

        {/* Section 2: Pre-Work Checklist */}
        {currentSection === 1 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warning/10">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">{t("riskAssessment.preWorkChecklist")}</h2>
                  <p className="text-sm text-muted-foreground">
                    {t("riskAssessment.itemsChecked", { completed: String(completedCount), total: String(totalItems) })}
                  </p>
                </div>
              </div>
              {failCount > 0 && (
                <Badge variant="destructive">{failCount} issue{failCount > 1 ? "s" : ""}</Badge>
              )}
            </div>

            <div className="space-y-6">
              {CHECKLIST_CATEGORIES.map((category) => (
                <Card key={category.id}>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">{category.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {category.items.map((item) => {
                      const checklistItem = formData.checklistItems[item.id];
                      return (
                        <div key={item.id} className="space-y-2">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <p className="text-sm font-medium">{item.label}</p>
                              <p className="text-xs text-muted-foreground">{item.details}</p>
                            </div>
                            <div className="flex gap-1">
                              {(["pass", "fail", "na"] as const).map((status) => (
                                <button
                                  key={status}
                                  onClick={() => updateChecklistItem(item.id, "status", status)}
                                  className={cn(
                                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                                    checklistItem.status === status
                                      ? status === "pass"
                                        ? "bg-green-500 text-white"
                                        : status === "fail"
                                        ? "bg-red-500 text-white"
                                        : "bg-gray-500 text-white"
                                      : "bg-muted hover:bg-muted/80"
                                  )}
                                >
                                  {status === "pass" ? "✓" : status === "fail" ? "✗" : "N/A"}
                                </button>
                              ))}
                            </div>
                          </div>
                          {checklistItem.status === "fail" && (
                            <Input
                              value={checklistItem.notes}
                              onChange={(e) => updateChecklistItem(item.id, "notes", e.target.value)}
                              placeholder="Describe the issue and corrective action..."
                              className="h-10 text-sm border-red-200 bg-red-50"
                            />
                          )}
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Section 3: Hazards & Controls */}
        {currentSection === 2 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">{t("riskAssessment.hazardsAndControls")}</h2>
                <p className="text-sm text-muted-foreground">{t("riskAssessment.identifyHazards")}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-base">Identified Hazards *</Label>
                <p className="text-xs text-muted-foreground">
                  List any hazards specific to today&apos;s task not covered in the checklist
                </p>
                <Textarea
                  value={formData.identifiedHazards}
                  onChange={(e) => setFormData({ ...formData, identifiedHazards: e.target.value })}
                  placeholder="e.g., Working near active forklift traffic, overhead crane operations in area..."
                  className="min-h-[100px]"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-base">Control Measures *</Label>
                <p className="text-xs text-muted-foreground">
                  How will you control or mitigate the identified hazards?
                </p>
                <Textarea
                  value={formData.controlMeasures}
                  onChange={(e) => setFormData({ ...formData, controlMeasures: e.target.value })}
                  placeholder="e.g., Spotter assigned for forklift traffic, stay outside crane swing radius..."
                  className="min-h-[100px]"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-base text-red-600">Stop Work Conditions</Label>
                <p className="text-xs text-muted-foreground">
                  Under what conditions should work be stopped immediately?
                </p>
                <Textarea
                  value={formData.stopsWorkConditions}
                  onChange={(e) => setFormData({ ...formData, stopsWorkConditions: e.target.value })}
                  placeholder="e.g., If weather worsens, if unexpected utilities found, if equipment malfunctions..."
                  className="min-h-[80px] border-red-200"
                />
              </div>

              {failCount > 0 && (
                <Card className="bg-red-50 border-red-200">
                  <CardContent className="py-4">
                    <p className="text-sm font-medium text-red-800">
                      ⚠️ {failCount} checklist item{failCount > 1 ? "s" : ""} failed
                    </p>
                    <p className="text-xs text-red-700 mt-1">
                      Review failed items and ensure corrective actions are in place before proceeding.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* Section 4: Review & Sign-off */}
        {currentSection === 3 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">{t("riskAssessment.reviewAndSignoff")}</h2>
                <p className="text-sm text-muted-foreground">{t("riskAssessment.confirmAndSubmit")}</p>
              </div>
            </div>

            {/* Summary */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-base">{t("riskAssessment.jsaSummary")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date/Time:</span>
                  <span className="font-medium">{formData.date} {formData.time}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Location:</span>
                  <span>{formData.location || "Not specified"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Crew Leader:</span>
                  <span>{formData.crewLeader || "Not specified"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Task:</span>
                  <span className="text-right max-w-[200px] truncate">{formData.jobDescription || "Not specified"}</span>
                </div>
              </CardContent>
            </Card>

            <Card className={cn(
              "border-2",
              failCount > 0 ? "border-yellow-300" : "border-green-300"
            )}>
              <CardHeader className="py-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>{t("riskAssessment.checklistResults")}</span>
                  <span className={cn("text-xs font-medium", failCount > 0 ? "text-yellow-600" : "text-green-600")}>
                    {completedCount}/{totalItems} complete
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-green-600">✓ Pass:</span>
                  <span className="font-medium">
                    {Object.values(formData.checklistItems).filter((i) => i.status === "pass").length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-red-600">✗ Fail:</span>
                  <span className="font-medium">{failCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">N/A:</span>
                  <span className="font-medium">
                    {Object.values(formData.checklistItems).filter((i) => i.status === "na").length}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Acknowledgment */}
            <button
              onClick={() => setFormData({ ...formData, acknowledgment: !formData.acknowledgment })}
              className={cn(
                "w-full p-4 rounded-xl border-2 text-left transition-all flex items-start gap-3",
                formData.acknowledgment
                  ? "border-primary bg-primary/5"
                  : "border-border"
              )}
            >
              <div className={cn(
                "mt-0.5 h-5 w-5 rounded border flex items-center justify-center",
                formData.acknowledgment
                  ? "bg-primary border-primary text-white"
                  : "border-muted-foreground"
              )}>
                {formData.acknowledgment && <CheckCircle className="h-3 w-3" />}
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">{t("riskAssessment.crewAcknowledgment")}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("riskAssessment.crewAcknowledgmentDesc")}
                </p>
              </div>
            </button>

            <Card className="bg-muted/50">
              <CardContent className="py-4">
                <p className="text-xs text-muted-foreground">
                  {t("riskAssessment.jsaComplianceNote")}
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
            disabled={isSubmitting || (isLastSection && !formData.acknowledgment)}
            className="flex-1 h-14 gap-2 text-base"
          >
            {isSubmitting ? (
              t("riskAssessment.submitting")
            ) : isLastSection ? (
              <>
                <CheckCircle className="h-5 w-5" />
                {t("riskAssessment.submitJSA")}
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
