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
  Brain,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useRiskEvaluationsStore } from "@/stores/risk-evaluations-store";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/components/ui/toast";
import type { RiskEvaluation } from "@/types";
import { useTranslation } from "@/i18n";

// OSA Categories per AFS 2015:4
const OSA_SECTIONS = [
  {
    id: "workload",
    title: "Arbetsbelastning (Workload)",
    icon: "📊",
    description: "Assessment of work demands and resources",
    questions: [
      { id: "wl_demands", label: "Work demands are reasonable", description: "Amount of work matches available time and resources" },
      { id: "wl_pace", label: "Work pace is manageable", description: "Ability to take breaks, no constant time pressure" },
      { id: "wl_priority", label: "Clear priorities are set", description: "Know which tasks are most important" },
      { id: "wl_resources", label: "Adequate resources provided", description: "Tools, training, and support available" },
      { id: "wl_recovery", label: "Recovery time available", description: "Time to rest between intensive periods" },
    ],
  },
  {
    id: "workhours",
    title: "Arbetstid (Working Hours)",
    icon: "🕐",
    description: "Assessment of working time arrangements",
    questions: [
      { id: "wh_schedule", label: "Work schedule is predictable", description: "Know schedule in advance, minimal last-minute changes" },
      { id: "wh_overtime", label: "Overtime is reasonable", description: "Not excessive overtime, compensatory rest available" },
      { id: "wh_shifts", label: "Shift rotation is healthy", description: "If applicable: clockwise rotation, adequate rest between shifts" },
      { id: "wh_oncall", label: "On-call arrangements are fair", description: "If applicable: clear rules, compensation, rest periods" },
      { id: "wh_flexibility", label: "Work-life balance supported", description: "Flexibility for personal needs when possible" },
    ],
  },
  {
    id: "harassment",
    title: "Kränkande särbehandling (Harassment)",
    icon: "🚫",
    description: "Assessment of bullying, harassment, and discrimination",
    questions: [
      { id: "hr_policy", label: "Clear policy against harassment", description: "Written policy known to all employees" },
      { id: "hr_reporting", label: "Safe reporting channels exist", description: "Can report without fear of retaliation" },
      { id: "hr_action", label: "Reports are acted upon", description: "Management takes complaints seriously" },
      { id: "hr_respect", label: "Respectful workplace culture", description: "Colleagues treat each other with respect" },
      { id: "hr_discrimination", label: "No discrimination observed", description: "Equal treatment regardless of background" },
    ],
  },
  {
    id: "social",
    title: "Socialt stöd (Social Support)",
    icon: "👥",
    description: "Assessment of support from colleagues and management",
    questions: [
      { id: "so_colleagues", label: "Support from colleagues", description: "Help available when needed" },
      { id: "so_manager", label: "Support from manager", description: "Regular contact, available for questions" },
      { id: "so_feedback", label: "Regular feedback provided", description: "Know how you're performing" },
      { id: "so_recognition", label: "Good work is recognized", description: "Contributions are acknowledged" },
      { id: "so_development", label: "Development opportunities exist", description: "Training, career development available" },
    ],
  },
  {
    id: "control",
    title: "Inflytande (Control/Autonomy)",
    icon: "🎯",
    description: "Assessment of control over own work",
    questions: [
      { id: "co_methods", label: "Control over work methods", description: "Can decide how to perform tasks" },
      { id: "co_schedule", label: "Input on scheduling", description: "Some influence over when work is done" },
      { id: "co_decisions", label: "Involved in decisions", description: "Consulted on matters affecting your work" },
      { id: "co_creativity", label: "Room for initiative", description: "Can suggest improvements" },
      { id: "co_meaning", label: "Work feels meaningful", description: "Understand purpose and contribution" },
    ],
  },
];

interface QuestionResponse {
  id: string;
  rating: number; // 1-5 scale
  concern: boolean;
  notes: string;
}

interface OSAFormData {
  // Section 1: Organization Info
  organizationName: string;
  department: string;
  assessmentDate: string;
  respondent: string;
  role: string;
  
  // Responses
  responses: { [key: string]: QuestionResponse };
  
  // Overall
  overallConcerns: string;
  suggestions: string;
  priorityAreas: string[];
}

const initializeResponses = (): { [key: string]: QuestionResponse } => {
  const responses: { [key: string]: QuestionResponse } = {};
  OSA_SECTIONS.forEach((section) => {
    section.questions.forEach((q) => {
      responses[q.id] = {
        id: q.id,
        rating: 0,
        concern: false,
        notes: "",
      };
    });
  });
  return responses;
};

const initialFormData: OSAFormData = {
  organizationName: "",
  department: "",
  assessmentDate: new Date().toISOString().split("T")[0],
  respondent: "",
  role: "",
  responses: initializeResponses(),
  overallConcerns: "",
  suggestions: "",
  priorityAreas: [],
};

function getRatingLabel(rating: number): { label: string; color: string } {
  switch (rating) {
    case 1: return { label: "Stämmer inte alls", color: "text-red-600" };
    case 2: return { label: "Stämmer dåligt", color: "text-orange-600" };
    case 3: return { label: "Stämmer delvis", color: "text-yellow-600" };
    case 4: return { label: "Stämmer ganska bra", color: "text-green-500" };
    case 5: return { label: "Stämmer helt", color: "text-green-600" };
    default: return { label: "Ej bedömt", color: "text-muted-foreground" };
  }
}

export default function OSAFormPage() {
  const router = useRouter();
  const company = useCompanyParam();
  const [currentSection, setCurrentSection] = React.useState(0);
  const [formData, setFormData] = React.useState<OSAFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { add: addEvaluation } = useRiskEvaluationsStore();
  const { user } = useAuth();
  const { toast } = useToast();

  const { t } = useTranslation();

  const sections = [
    { id: "intro", title: "Introduction", icon: Building2 },
    ...OSA_SECTIONS.map((s) => ({ id: s.id, title: s.title, icon: s.id === "workload" ? Clock : s.id === "harassment" ? AlertTriangle : Users })),
    { id: "summary", title: "Summary", icon: Brain },
    { id: "review", title: "Review", icon: CheckCircle },
  ];

  const currentSectionIndex = currentSection;
  const currentSectionData = sections[currentSectionIndex];
  const isLastSection = currentSectionIndex === sections.length - 1;

  // Update response
  const updateResponse = (questionId: string, field: keyof QuestionResponse, value: QuestionResponse[keyof QuestionResponse]) => {
    setFormData({
      ...formData,
      responses: {
        ...formData.responses,
        [questionId]: { ...formData.responses[questionId], [field]: value },
      },
    });
  };

  // Calculate section average
  const getSectionAverage = (sectionId: string) => {
    const section = OSA_SECTIONS.find((s) => s.id === sectionId);
    if (!section) return 0;
    const ratings = section.questions
      .map((q) => formData.responses[q.id]?.rating || 0)
      .filter((r) => r > 0);
    if (ratings.length === 0) return 0;
    return ratings.reduce((a, b) => a + b, 0) / ratings.length;
  };

  // Count concerns
  const concernCount = Object.values(formData.responses).filter((r) => r.concern).length;
  const lowRatingCount = Object.values(formData.responses).filter((r) => r.rating > 0 && r.rating <= 2).length;

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
    const refNumber = `OSA-${now.getFullYear()}-${String(Math.floor(Math.random() * 999) + 1).padStart(3, "0")}`;
    const evaluation: RiskEvaluation = {
      id: `eval_${Date.now()}`,
      company_id: user.company_id || "",
      submitter_id: user.id,
      country: "SE",
      form_type: "OSA",
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

  // Get OSA section for assessment sections
  const getOSASection = (sectionIndex: number) => {
    // intro is index 0, OSA sections are 1-5, summary is 6, review is 7
    if (sectionIndex >= 1 && sectionIndex <= 5) {
      return OSA_SECTIONS[sectionIndex - 1];
    }
    return null;
  };

  const currentOSASection = getOSASection(currentSectionIndex);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b bg-background">
        <div className="flex h-14 items-center gap-4 px-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-semibold text-sm">{t("riskAssessment.osaTitle")}</h1>
            <p className="text-xs text-muted-foreground">
              {currentSectionData.title} • Steg {currentSectionIndex + 1} av {sections.length}
            </p>
          </div>
          <span className="text-xs text-muted-foreground">SE</span>
        </div>
        <div className="h-1 bg-muted" role="progressbar" aria-label="Completion progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(((currentSectionIndex + 1) / sections.length) * 100)}>
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${((currentSectionIndex + 1) / sections.length) * 100}%` }}
          />
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 p-4 pb-32">
        {/* Introduction Section */}
        {currentSectionIndex === 0 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Psykosocial riskbedömning</h2>
                <p className="text-sm text-muted-foreground">Organizational and Social Work Environment</p>
              </div>
            </div>

            <Card className="bg-purple-50 border-purple-200">
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <Brain className="h-5 w-5 text-purple-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-purple-800">AFS 2015:4 - OSA</p>
                    <p className="text-xs text-purple-700 mt-1">
                      This assessment covers organizational and social work environment factors 
                      including workload, working hours, harassment, and psychosocial risks.
                    </p>
                  </div>
                </div>
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

              <div className="space-y-2">
                <Label className="text-base">Avdelning (Department) *</Label>
                <Input
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder="Your department"
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-base">Datum *</Label>
                <Input
                  type="date"
                  value={formData.assessmentDate}
                  onChange={(e) => setFormData({ ...formData, assessmentDate: e.target.value })}
                  className="h-12"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-base">Ditt namn</Label>
                  <Input
                    value={formData.respondent}
                    onChange={(e) => setFormData({ ...formData, respondent: e.target.value })}
                    placeholder="Your name"
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-base">Roll</Label>
                  <Input
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    placeholder="Your role"
                    className="h-12"
                  />
                </div>
              </div>
            </div>

            {/* Assessment Areas Overview */}
            <div className="space-y-2">
              <Label className="text-base">Bedömningsområden</Label>
              <div className="space-y-2">
                {OSA_SECTIONS.map((section) => (
                  <div key={section.id} className="p-3 rounded-lg bg-muted/50 flex items-start gap-3">
                    <span className="text-xl">{section.icon}</span>
                    <div>
                      <p className="font-medium text-sm">{section.title}</p>
                      <p className="text-xs text-muted-foreground">{section.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="py-4">
                <p className="text-sm text-blue-800">
                  <strong>Instruktion:</strong> Svara på en skala 1-5 hur väl varje påstående 
                  stämmer med din upplevelse. Markera om du ser något som en särskild risk.
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* OSA Assessment Sections */}
        {currentOSASection && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
                <span className="text-xl">{currentOSASection.icon}</span>
              </div>
              <div>
                <h2 className="text-lg font-semibold">{currentOSASection.title}</h2>
                <p className="text-sm text-muted-foreground">{currentOSASection.description}</p>
              </div>
            </div>

            <div className="space-y-6">
              {currentOSASection.questions.map((question, qIndex) => {
                const response = formData.responses[question.id];
                return (
                  <Card key={question.id} className={cn(
                    "transition-all",
                    response.concern && "border-warning"
                  )}>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm font-medium">
                        {qIndex + 1}. {question.label}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">{question.description}</p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Rating Scale */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Stämmer inte alls</span>
                          <span>Stämmer helt</span>
                        </div>
                        <div className="flex gap-2">
                          {[1, 2, 3, 4, 5].map((rating) => (
                            <button
                              key={rating}
                              onClick={() => updateResponse(question.id, "rating", rating)}
                              className={cn(
                                "flex-1 py-3 rounded-lg font-bold text-lg transition-all",
                                response.rating === rating
                                  ? rating <= 2
                                    ? "bg-red-500 text-white"
                                    : rating === 3
                                    ? "bg-yellow-500 text-white"
                                    : "bg-green-500 text-white"
                                  : "bg-muted hover:bg-muted/80"
                              )}
                            >
                              {rating}
                            </button>
                          ))}
                        </div>
                        {response.rating > 0 && (
                          <p className={cn("text-center text-sm", getRatingLabel(response.rating).color)}>
                            {getRatingLabel(response.rating).label}
                          </p>
                        )}
                      </div>

                      {/* Concern Flag */}
                      <button
                        onClick={() => updateResponse(question.id, "concern", !response.concern)}
                        className={cn(
                          "w-full p-3 rounded-lg border flex items-center gap-3 transition-all",
                          response.concern
                            ? "border-warning bg-warning/10"
                            : "border-border hover:border-warning/50"
                        )}
                      >
                        <div className={cn(
                          "h-5 w-5 rounded-full border-2 flex items-center justify-center",
                          response.concern
                            ? "border-warning bg-warning"
                            : "border-muted-foreground"
                        )}>
                          {response.concern && <AlertTriangle className="h-3 w-3 text-white" />}
                        </div>
                        <span className="text-sm">Markera som riskområde</span>
                      </button>

                      {/* Notes (show if concern or low rating) */}
                      {(response.concern || (response.rating > 0 && response.rating <= 2)) && (
                        <div className="space-y-1">
                          <Label className="text-xs">Kommentar (valfritt)</Label>
                          <Textarea
                            value={response.notes}
                            onChange={(e) => updateResponse(question.id, "notes", e.target.value)}
                            placeholder="Beskriv situationen eller ge förslag..."
                            className="min-h-[60px] text-sm"
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Section Average */}
            <Card className="bg-muted/50">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Snittbetyg för detta område:</span>
                  <span className={cn(
                    "font-bold text-lg",
                    getSectionAverage(currentOSASection.id) >= 4 ? "text-green-600" :
                    getSectionAverage(currentOSASection.id) >= 3 ? "text-yellow-600" :
                    getSectionAverage(currentOSASection.id) > 0 ? "text-red-600" : "text-muted-foreground"
                  )}>
                    {getSectionAverage(currentOSASection.id).toFixed(1)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Summary Section */}
        {currentSectionIndex === 6 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                <Brain className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Sammanfattning</h2>
                <p className="text-sm text-muted-foreground">Overall assessment and concerns</p>
              </div>
            </div>

            {/* Section Scores Overview */}
            <div className="space-y-3">
              {OSA_SECTIONS.map((section) => {
                const avg = getSectionAverage(section.id);
                const sectionConcerns = section.questions.filter((q) => formData.responses[q.id]?.concern).length;
                return (
                  <Card key={section.id} className={cn(
                    "transition-all",
                    sectionConcerns > 0 && "border-warning"
                  )}>
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{section.icon}</span>
                          <div>
                            <p className="font-medium text-sm">{section.title}</p>
                            {sectionConcerns > 0 && (
                              <p className="text-xs text-warning">{sectionConcerns} riskområde{sectionConcerns > 1 ? "n" : ""}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={cn(
                            "text-xl font-bold",
                            avg >= 4 ? "text-green-600" :
                            avg >= 3 ? "text-yellow-600" :
                            avg > 0 ? "text-red-600" : "text-muted-foreground"
                          )}>
                            {avg.toFixed(1)}
                          </p>
                          <p className="text-xs text-muted-foreground">/5</p>
                        </div>
                      </div>
                      {/* Visual bar */}
                      <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full transition-all",
                            avg >= 4 ? "bg-green-500" :
                            avg >= 3 ? "bg-yellow-500" :
                            avg > 0 ? "bg-red-500" : "bg-muted"
                          )}
                          style={{ width: `${(avg / 5) * 100}%` }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-base">Övergripande bekymmer</Label>
                <Textarea
                  value={formData.overallConcerns}
                  onChange={(e) => setFormData({ ...formData, overallConcerns: e.target.value })}
                  placeholder="Beskriv eventuella övergripande bekymmer om arbetsmiljön..."
                  className="min-h-[100px]"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-base">Förbättringsförslag</Label>
                <Textarea
                  value={formData.suggestions}
                  onChange={(e) => setFormData({ ...formData, suggestions: e.target.value })}
                  placeholder="Har du förslag på förbättringar?"
                  className="min-h-[100px]"
                />
              </div>
            </div>

            {concernCount > 0 && (
              <Card className="bg-warning/10 border-warning">
                <CardContent className="py-4">
                  <p className="text-sm font-medium text-warning">
                    ⚠️ {concernCount} riskområde{concernCount > 1 ? "n" : ""} markerade
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Dessa områden bör prioriteras för uppföljning och åtgärder.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Review Section */}
        {currentSectionIndex === 7 && (
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
                <CardTitle className="text-base">Bedömningssammanfattning</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Organisation:</span>
                  <span className="font-medium">{formData.organizationName || "Ej angivet"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Avdelning:</span>
                  <span>{formData.department || "Ej angivet"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Datum:</span>
                  <span>{formData.assessmentDate}</span>
                </div>
              </CardContent>
            </Card>

            <Card className={cn(
              "border-2",
              concernCount > 2 || lowRatingCount > 5 ? "border-red-300" :
              concernCount > 0 || lowRatingCount > 0 ? "border-yellow-300" : "border-green-300"
            )}>
              <CardHeader className="py-3">
                <CardTitle className="text-base">Risksammanfattning</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-warning">Markerade riskområden:</span>
                  <span className="font-bold">{concernCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-red-600">Låga betyg (1-2):</span>
                  <span className="font-bold">{lowRatingCount}</span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className="text-muted-foreground">Besvarade frågor:</span>
                  <span className="font-bold">
                    {Object.values(formData.responses).filter((r) => r.rating > 0).length}/
                    {Object.keys(formData.responses).length}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Section Averages */}
            <div className="grid grid-cols-5 gap-2">
              {OSA_SECTIONS.map((section) => {
                const avg = getSectionAverage(section.id);
                return (
                  <div key={section.id} className="text-center">
                    <span className="text-lg">{section.icon}</span>
                    <p className={cn(
                      "text-lg font-bold",
                      avg >= 4 ? "text-green-600" :
                      avg >= 3 ? "text-yellow-600" :
                      avg > 0 ? "text-red-600" : "text-muted-foreground"
                    )}>
                      {avg.toFixed(1)}
                    </p>
                  </div>
                );
              })}
            </div>

            <Card className="bg-muted/50">
              <CardContent className="py-4">
                <p className="text-xs text-muted-foreground">
                  Genom att skicka in godkänner du att denna bedömning sparas och används 
                  för att förbättra arbetsmiljön. Svaren behandlas konfidentiellt.
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
