"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  FileCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useRiskEvaluationsStore } from "@/stores/risk-evaluations-store";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/components/ui/toast";
import type { Country, RiskEvaluation } from "@/types";
import { useTranslation } from "@/i18n";

// Form configurations by type
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
  afs: {
    title: "AFS Risk Evaluation",
    description: "Arbetsmiljöverket regulations compliance including psychosocial factors",
    sections: [
      {
        title: "Grundinformation",
        questions: [
          { id: "company", question: "Företag", type: "text" },
          { id: "workplace", question: "Arbetsplats", type: "text" },
          { id: "date", question: "Datum", type: "text" },
          { id: "assessor", question: "Utförare", type: "text" },
        ],
      },
      {
        title: "Organisatorisk Arbetsmiljö (AFS 2015:4)",
        questions: [
          { id: "workload", question: "Är arbetsbelastningen rimlig?", type: "yesno" },
          { id: "work_hours", question: "Är arbetstiderna hälsosamma?", type: "yesno" },
          { id: "balance", question: "Finns balans mellan krav och resurser?", type: "yesno" },
          { id: "recovery", question: "Finns möjlighet till återhämtning?", type: "yesno" },
        ],
      },
      {
        title: "Social Arbetsmiljö",
        questions: [
          { id: "colleague_support", question: "Socialt stöd från kollegor (1-5)", type: "rating" },
          { id: "manager_support", question: "Socialt stöd från chef (1-5)", type: "rating" },
          { id: "harassment", question: "Förekommer kränkande särbehandling?", type: "yesno" },
          { id: "conflicts", question: "Finns konflikter på arbetsplatsen?", type: "yesno" },
        ],
      },
      {
        title: "Åtgärdsplan",
        questions: [
          { id: "actions", question: "Planerade åtgärder", type: "text" },
          { id: "responsible", question: "Ansvarig", type: "text" },
          { id: "deadline", question: "Deadline", type: "text" },
        ],
      },
    ],
  },
};

// Default config for unknown forms
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

export default function RiskAssessmentFormPage() {
  const router = useRouter();
  const routeParams = useParams();
  const company = routeParams.company as string;
  const formId = routeParams.formId as string;
  const [currentSection, setCurrentSection] = React.useState(0);
  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { add: addEvaluation } = useRiskEvaluationsStore();
  const { user } = useAuth();
  const { toast } = useToast();

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

  const { t } = useTranslation();

  const config = formConfigs[formId] || defaultConfig;
  const currentSectionData = config.sections[currentSection];
  const isLastSection = currentSection === config.sections.length - 1;

  const handleAnswer = (questionId: string, value: string) => {
    setAnswers({ ...answers, [questionId]: value });
  };

  const handleNext = () => {
    if (isLastSection) {
      handleSubmit();
    } else {
      setCurrentSection(currentSection + 1);
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
    const refNumber = `RA-${now.getFullYear()}-${String(Math.floor(Math.random() * 999) + 1).padStart(3, "0")}`;
    const evaluation: RiskEvaluation = {
      id: crypto.randomUUID(),
      company_id: user.company_id || "",
      submitter_id: user.id,
      country,
      form_type: formType,
      location_id: null,
      responses: answers,
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
          <Button
            variant="ghost"
            size="icon"
            onClick={() => currentSection > 0 ? setCurrentSection(currentSection - 1) : router.back()}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-semibold text-sm">{config.title}</h1>
            <p className="text-xs text-muted-foreground">
              {t("riskAssessment.section", { current: String(currentSection + 1), total: String(config.sections.length) })}
            </p>
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-muted" role="progressbar" aria-label="Completion progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(((currentSection + 1) / config.sections.length) * 100)}>
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${((currentSection + 1) / config.sections.length) * 100}%` }}
          />
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 p-4">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <FileCheck className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-lg font-semibold">{currentSectionData.title}</h2>
          </div>
        </div>

        <div className="space-y-6">
          {currentSectionData.questions.map((q) => (
            <div key={q.id} className="space-y-2">
              <Label className="text-base">{q.question}</Label>
              
              {q.type === "text" && (
                <Input
                  value={answers[q.id] || ""}
                  onChange={(e) => handleAnswer(q.id, e.target.value)}
                  placeholder={t("riskAssessment.enterAnswer")}
                  className="h-12"
                />
              )}

              {q.type === "yesno" && (
                <div className="flex gap-3">
                  {["Yes", "No", "N/A"].map((option) => (
                    <button
                      key={option}
                      onClick={() => handleAnswer(q.id, option.toLowerCase())}
                      className={cn(
                        "flex-1 rounded-xl border-2 py-3 px-4 font-medium transition-all",
                        answers[q.id] === option.toLowerCase()
                          ? "border-primary bg-primary text-white"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}

              {q.type === "rating" && (
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      onClick={() => handleAnswer(q.id, String(rating))}
                      className={cn(
                        "flex-1 rounded-xl border-2 py-3 font-medium transition-all",
                        answers[q.id] === String(rating)
                          ? "border-primary bg-primary text-white"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      {rating}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="fixed bottom-16 left-0 right-0 border-t bg-background p-4 z-20">
        <Button
          onClick={handleNext}
          disabled={isSubmitting}
          className="h-14 w-full gap-2 text-base"
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
  );
}
