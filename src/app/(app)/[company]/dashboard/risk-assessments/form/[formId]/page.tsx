"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  FileCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useCompanyData } from "@/hooks/use-company-data";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/components/ui/toast";
import type { Country, RiskEvaluation } from "@/types";
import { useTranslation } from "@/i18n";
import { LoadingPage } from "@/components/ui/loading";
import { RoleGuard } from "@/components/auth/role-guard";
import { LocationPicker, type LocationPickerValue } from "@/components/ui/location-picker";

const formConfigs: Record<string, { title: string; description: string; sections: Array<{ title: string; questions: Array<{ id: string; question: string; type: "yesno" | "rating" | "text" | "select"; options?: string[] }> }> }> = {
  jha: {
    title: "Job Hazard Analysis (JHA)",
    description: "OSHA-compliant step-by-step hazard identification",
    sections: [
      {
        title: "Job Information",
        questions: [
          { id: "job_title", question: "Job/Task Title", type: "text" },
          { id: "location", question: "Work Location", type: "text" },
          { id: "date", question: "Analysis Date", type: "text" },
          { id: "analyst", question: "Analyst Name", type: "text" },
        ],
      },
      {
        title: "Hazard Identification",
        questions: [
          { id: "hazard_1", question: "Are there any struck-by hazards?", type: "yesno" },
          { id: "hazard_2", question: "Are there any fall hazards?", type: "yesno" },
          { id: "hazard_3", question: "Are there any caught-in/between hazards?", type: "yesno" },
          { id: "hazard_4", question: "Are there any electrical hazards?", type: "yesno" },
          { id: "hazard_5", question: "Are there any chemical hazards?", type: "yesno" },
        ],
      },
      {
        title: "Controls",
        questions: [
          { id: "ppe_required", question: "What PPE is required?", type: "text" },
          { id: "controls", question: "Describe control measures in place", type: "text" },
          { id: "additional_notes", question: "Additional notes or recommendations", type: "text" },
        ],
      },
    ],
  },
  jsa: {
    title: "Job Safety Analysis (JSA)",
    description: "Task-based safety analysis for specific jobs",
    sections: [
      {
        title: "Task Details",
        questions: [
          { id: "task_name", question: "Task Name", type: "text" },
          { id: "department", question: "Department", type: "text" },
          { id: "supervisor", question: "Supervisor", type: "text" },
        ],
      },
      {
        title: "Risk Assessment",
        questions: [
          { id: "severity", question: "Potential Severity", type: "rating" },
          { id: "likelihood", question: "Likelihood of Occurrence", type: "rating" },
          { id: "hazard_desc", question: "Describe the hazards", type: "text" },
        ],
      },
    ],
  },
  rie: {
    title: "RI&E Assessment",
    description: "Risico-Inventarisatie en -Evaluatie (Arbowet compliant)",
    sections: [
      {
        title: "Algemene Informatie",
        questions: [
          { id: "workplace", question: "Werkplek / Afdeling", type: "text" },
          { id: "assessor", question: "Beoordelaar", type: "text" },
          { id: "date", question: "Datum", type: "text" },
        ],
      },
      {
        title: "Risico Identificatie",
        questions: [
          { id: "physical", question: "Zijn er fysieke risico's aanwezig?", type: "yesno" },
          { id: "chemical", question: "Zijn er chemische risico's aanwezig?", type: "yesno" },
          { id: "ergonomic", question: "Zijn er ergonomische risico's?", type: "yesno" },
          { id: "psychosocial", question: "Zijn er psychosociale risico's?", type: "yesno" },
        ],
      },
      {
        title: "Maatregelen",
        questions: [
          { id: "measures", question: "Welke maatregelen zijn nodig?", type: "text" },
          { id: "priority", question: "Prioriteit", type: "rating" },
        ],
      },
    ],
  },
  sam: {
    title: "SAM Assessment",
    description: "Systematiskt Arbetsmiljöarbete (AFS 2023:1)",
    sections: [
      {
        title: "Arbetsplats Information",
        questions: [
          { id: "workplace", question: "Arbetsplats", type: "text" },
          { id: "department", question: "Avdelning", type: "text" },
          { id: "date", question: "Datum", type: "text" },
        ],
      },
      {
        title: "Riskbedömning",
        questions: [
          { id: "physical_risks", question: "Finns det fysiska risker?", type: "yesno" },
          { id: "organizational_risks", question: "Finns det organisatoriska risker?", type: "yesno" },
          { id: "social_risks", question: "Finns det sociala risker?", type: "yesno" },
        ],
      },
      {
        title: "Åtgärder",
        questions: [
          { id: "actions", question: "Vilka åtgärder behövs?", type: "text" },
          { id: "responsible", question: "Ansvarig person", type: "text" },
          { id: "deadline", question: "Tidsfrist", type: "text" },
        ],
      },
    ],
  },
  arbowet: {
    title: "Arbowet Compliance Check",
    description: "Dutch Working Conditions Act compliance verification",
    sections: [
      {
        title: "Algemene Gegevens",
        questions: [
          { id: "company", question: "Bedrijfsnaam", type: "text" },
          { id: "location", question: "Vestigingsadres", type: "text" },
          { id: "date", question: "Datum controle", type: "text" },
          { id: "inspector", question: "Controleur", type: "text" },
        ],
      },
      {
        title: "Arbowet Artikelen",
        questions: [
          { id: "art3", question: "Art. 3 - Arbobeleid aanwezig?", type: "yesno" },
          { id: "art5", question: "Art. 5 - RI&E uitgevoerd?", type: "yesno" },
          { id: "art8", question: "Art. 8 - Voorlichting gegeven?", type: "yesno" },
          { id: "art13", question: "Art. 13 - BHV geregeld?", type: "yesno" },
          { id: "art14", question: "Art. 14 - Arbodienst ingeschakeld?", type: "yesno" },
        ],
      },
      {
        title: "Bevindingen",
        questions: [
          { id: "findings", question: "Geconstateerde tekortkomingen", type: "text" },
          { id: "severity", question: "Ernst van afwijking", type: "rating" },
          { id: "action", question: "Vereiste actie", type: "text" },
        ],
      },
    ],
  },
  osa: {
    title: "OSA Assessment",
    description: "Organisatorisk och Social Arbetsmiljö assessment",
    sections: [
      {
        title: "Assessment Details",
        questions: [
          { id: "workplace", question: "Workplace", type: "text" },
          { id: "date", question: "Date", type: "text" },
          { id: "assessor", question: "Assessor", type: "text" },
        ],
      },
      {
        title: "Organizational Factors",
        questions: [
          { id: "workload", question: "Is the workload manageable?", type: "yesno" },
          { id: "work_hours", question: "Are working hours reasonable?", type: "yesno" },
          { id: "resources", question: "Are adequate resources available?", type: "yesno" },
        ],
      },
      {
        title: "Social Factors",
        questions: [
          { id: "support", question: "Is social support available?", type: "yesno" },
          { id: "harassment", question: "Any harassment concerns?", type: "yesno" },
          { id: "actions", question: "Recommended actions", type: "text" },
        ],
      },
    ],
  },
};

const defaultConfig = {
  title: "Risk Assessment",
  description: "General risk assessment form",
  sections: [
    {
      title: "Assessment Details",
      questions: [
        { id: "location", question: "Location", type: "text" as const },
        { id: "description", question: "Description of risks", type: "text" as const },
        { id: "severity", question: "Risk severity", type: "rating" as const },
      ],
    },
  ],
};

function DashboardRiskAssessmentFormContent() {
  const router = useRouter();
  const routeParams = useParams();
  const company = routeParams.company as string;
  const formId = routeParams.formId as string;
  const [currentSection, setCurrentSection] = React.useState(0);
  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showErrors, setShowErrors] = React.useState(false);
  const [selectedLocationValue, setSelectedLocationValue] = React.useState<LocationPickerValue>({
    locationId: "",
    manualText: "",
    gpsLat: null,
    gpsLng: null,
  });
  const { stores, locations } = useCompanyData();
  const { user, currentCompany } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();

  const countryMap: Record<string, Country> = {
    jha: "US",
    jsa: "US",
    rie: "NL",
    arbowet: "NL",
    sam: "SE",
    osa: "SE",
    afs: "SE",
  };
  const country = countryMap[formId] || "US";
  const formType = formId.toUpperCase();

  // Pre-populate answers with known company/user data on mount
  const hasPreFilled = React.useRef(false);
  React.useEffect(() => {
    if (hasPreFilled.current) return;
    hasPreFilled.current = true;
    const prefill: Record<string, string> = {};
    const today = new Date().toISOString().split("T")[0];

    // Map known field IDs to available data
    if (user?.full_name) {
      prefill.analyst = user.full_name;
      prefill.assessor = user.full_name;
      prefill.inspector = user.full_name;
      prefill.supervisor = user.full_name;
    }
    if (user?.department) {
      prefill.department = user.department;
    }
    if (currentCompany?.name) {
      prefill.company = currentCompany.name;
    }
    if (currentCompany?.address) {
      prefill.location = currentCompany.address;
      prefill.workplace = currentCompany.address;
    }
    prefill.date = today;

    setAnswers((prev) => {
      const merged = { ...prefill };
      // Don't overwrite anything the user already typed
      for (const [k, v] of Object.entries(prev)) {
        if (v) merged[k] = v;
      }
      return merged;
    });
  }, [user, currentCompany]);

  const knownFormIds = Object.keys(formConfigs);
  if (!knownFormIds.includes(formId)) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Assessment not found"
        description="This risk assessment form does not exist."
        action={
          <Button variant="outline" size="sm" onClick={() => router.push(`/${company}/dashboard/checklists?tab=risk-assessment`)}>
            Back to Risk Assessments
          </Button>
        }
      />
    );
  }

  const config = formConfigs[formId];
  const currentSectionData = config.sections[currentSection];
  const isLastSection = currentSection === config.sections.length - 1;
  const progress = Math.round(((currentSection + 1) / config.sections.length) * 100);

  const handleAnswer = (questionId: string, value: string) => {
    setAnswers({ ...answers, [questionId]: value });
  };

  const canProceed = (): boolean => {
    return currentSectionData.questions.every(q => !!answers[q.id]?.trim());
  };

  const handleNext = () => {
    if (!canProceed()) {
      setShowErrors(true);
      toast("Please fill in all required fields", "error");
      return;
    }
    setShowErrors(false);
    if (isLastSection) {
      handleSubmit();
    } else {
      setCurrentSection(currentSection + 1);
    }
  };

  const handleSubmit = async () => {
    if (Object.keys(answers).length === 0) {
      toast("Please fill in all required fields", "error");
      return;
    }
    setIsSubmitting(true);
    if (!user) {
      toast("Unable to submit without a user session.");
      setIsSubmitting(false);
      return;
    }
    const resolvedCompanyId = user.company_id || currentCompany?.id;
    if (!resolvedCompanyId) {
      toast("Unable to submit — company not configured. Contact your admin.", "error");
      setIsSubmitting(false);
      return;
    }
    const now = new Date();
    const evaluation: RiskEvaluation = {
      id: crypto.randomUUID(),
      company_id: resolvedCompanyId,
      submitter_id: user.id,
      country,
      form_type: formType,
      location_id: selectedLocationValue.locationId || null,
      responses: answers,
      status: "submitted",
      reviewed_by: null,
      reviewed_at: null,
      submitted_at: now.toISOString(),
      created_at: now.toISOString(),
    };
    stores.riskEvaluations.add(evaluation);
    toast("Assessment submitted successfully");
    router.push(`/${company}/dashboard/checklists?tab=risk-assessment`);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Button
          variant="ghost"
          size="sm"
          className="mb-4 gap-2"
          onClick={() =>
            currentSection > 0
              ? setCurrentSection(currentSection - 1)
              : router.push(`/${company}/dashboard/risk-assessments/new`)
          }
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {currentSection > 0 ? "Previous section" : "Back"}
        </Button>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <FileCheck className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">{config.title}</h1>
            <p className="text-sm text-muted-foreground">{config.description}</p>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Section {currentSection + 1} of {config.sections.length}
          </span>
          <span className="font-medium">{progress}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Location selector */}
      {currentSection === 0 && (
        <div className="rounded-xl border bg-card p-6 space-y-4">
          <LocationPicker
            locations={locations.map((l) => ({ id: l.id, name: l.name, address: l.address }))}
            value={selectedLocationValue}
            onChange={(val) => {
              setSelectedLocationValue(val);
              const loc = locations.find((l) => l.id === val.locationId);
              if (loc) {
                setAnswers((prev) => ({
                  ...prev,
                  location: loc.address || loc.name,
                  workplace: loc.address || loc.name,
                }));
              } else if (val.manualText) {
                setAnswers((prev) => ({
                  ...prev,
                  location: val.manualText,
                  workplace: val.manualText,
                }));
              } else if (val.gpsLat && val.gpsLng) {
                const gpsText = `GPS: ${val.gpsLat.toFixed(6)}, ${val.gpsLng.toFixed(6)}`;
                setAnswers((prev) => ({
                  ...prev,
                  location: gpsText,
                  workplace: gpsText,
                }));
              }
            }}
            label="Location"
          />
        </div>
      )}

      {/* Section content */}
      <div className="rounded-xl border bg-card p-6">
        <h2 className="mb-6 text-lg font-semibold">{currentSectionData.title}</h2>
        <div className="space-y-6">
          {currentSectionData.questions.map((q) => (
            <div key={q.id} className="space-y-2">
              <Label className="text-sm font-medium">{q.question}</Label>

              {q.type === "text" && (
                <>
                  <Input
                    value={answers[q.id] || ""}
                    onChange={(e) => handleAnswer(q.id, e.target.value)}
                    placeholder="Enter your answer"
                  />
                  {showErrors && !answers[q.id]?.trim() && (
                    <p className="text-xs text-destructive">This field is required</p>
                  )}
                </>
              )}

              {q.type === "yesno" && (
                <>
                  <div className="flex gap-2">
                    {["Yes", "No", "N/A"].map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => handleAnswer(q.id, option.toLowerCase())}
                        className={cn(
                          "flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors",
                          answers[q.id] === option.toLowerCase()
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border hover:bg-muted/50"
                        )}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                  {showErrors && !answers[q.id]?.trim() && (
                    <p className="text-xs text-destructive">This field is required</p>
                  )}
                </>
              )}

              {q.type === "rating" && (
                <>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        type="button"
                        onClick={() => handleAnswer(q.id, String(rating))}
                        className={cn(
                          "flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors",
                          answers[q.id] === String(rating)
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border hover:bg-muted/50"
                        )}
                      >
                        {rating}
                      </button>
                    ))}
                  </div>
                  {showErrors && !answers[q.id]?.trim() && (
                    <p className="text-xs text-destructive">This field is required</p>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() =>
            currentSection > 0
              ? setCurrentSection(currentSection - 1)
              : router.push(`/${company}/dashboard/risk-assessments/new`)
          }
          disabled={isSubmitting}
        >
          <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
          {currentSection > 0 ? "Previous" : "Cancel"}
        </Button>
        <Button onClick={handleNext} disabled={isSubmitting} className="gap-2">
          {isSubmitting ? (
            "Submitting…"
          ) : isLastSection ? (
            <>
              <CheckCircle className="h-4 w-4" aria-hidden="true" />
              Submit Assessment
            </>
          ) : (
            <>
              Continue
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export default function DashboardRiskAssessmentFormPage() {
  return (
    <RoleGuard requiredPermission="checklists.view">
      <React.Suspense fallback={<LoadingPage />}>
        <DashboardRiskAssessmentFormContent />
      </React.Suspense>
    </RoleGuard>
  );
}
