"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ShieldAlert,
  FileCheck,
  ClipboardList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useCompanyParam } from "@/hooks/use-company-param";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "@/i18n";
import { LoadingPage } from "@/components/ui/loading";
import { RoleGuard } from "@/components/auth/role-guard";
import {
  COUNTRY_CONFIGS,
  resolveRiskAssessmentCatalogCountry,
} from "@/lib/country-config";
import type { Country } from "@/types";

interface RiskFormOption {
  id: string;
  name: string;
  description: string;
  icon: typeof ShieldAlert;
}

const RISK_FORMS: Record<string, RiskFormOption[]> = {
  US: [
    {
      id: "jha",
      name: "Job Hazard Analysis (JHA)",
      description: "Identify hazards for specific job tasks and determine controls to mitigate risk.",
      icon: ShieldAlert,
    },
    {
      id: "jsa",
      name: "Job Safety Analysis (JSA)",
      description: "Break down job steps and analyze safety risks for each task sequence.",
      icon: ClipboardList,
    },
  ],
  NL: [
    {
      id: "rie",
      name: "RI&E Assessment",
      description: "Risico-Inventarisatie en -Evaluatie: Identify and evaluate workplace risks per Arbowet.",
      icon: ShieldAlert,
    },
    {
      id: "arbowet",
      name: "Arbowet Compliance Audit",
      description: "Audit compliance with Dutch occupational health and safety regulations.",
      icon: FileCheck,
    },
  ],
  SE: [
    {
      id: "sam",
      name: "SAM Assessment",
      description: "Systematiskt Arbetsmiljöarbete: Systematic work environment management assessment.",
      icon: ShieldAlert,
    },
    {
      id: "osa",
      name: "OSA Assessment",
      description: "Organisatorisk och Social Arbetsmiljö: Organizational and social work environment assessment.",
      icon: ClipboardList,
    },
  ],
};

function RiskAssessmentNewContent() {
  const router = useRouter();
  const company = useCompanyParam();
  const { currentCompany } = useAuth();
  const { t } = useTranslation();

  const companyCountry = (currentCompany?.country as Country) || "US";
  const catalogCountry = resolveRiskAssessmentCatalogCountry(companyCountry);
  const countryConfig = COUNTRY_CONFIGS[companyCountry] || COUNTRY_CONFIGS.US;
  const forms = RISK_FORMS[catalogCountry] || RISK_FORMS.US;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          className="mb-4 gap-2"
          onClick={() => router.push(`/${company}/dashboard/checklists?tab=risk-assessment`)}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t("checklists.tabs.assessments") || "Risk Assessments"}
        </Button>
        <h1 className="text-xl font-semibold">
          {t("riskAssessment.startNew") || "Start New Risk Assessment"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("riskAssessment.selectType") || "Select a risk assessment type for your region."}
        </p>
      </div>

      {/* Country info */}
      <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2">
        <span className="text-lg">{countryConfig.flag}</span>
        <span className="text-sm">
          {countryConfig.name} — {countryConfig.regulations}
        </span>
      </div>

      {/* Form type cards */}
      <div className="space-y-3">
        {forms.map((form) => {
          const Icon = form.icon;
          return (
            <Card
              key={form.id}
              className="cursor-pointer transition-colors hover:bg-muted/50"
              onClick={() => {
                router.push(`/${company}/dashboard/risk-assessments/form/${form.id}`);
              }}
            >
              <CardContent className="flex items-start gap-4 p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{form.name}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{form.description}</p>
                </div>
                <Badge variant="outline" className="shrink-0 text-xs">
                  {catalogCountry}
                </Badge>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="text-xs text-center text-muted-foreground">
        {t("riskAssessment.basedOnRegulations") || "Assessment types are based on your country's regulatory requirements."}
      </p>
    </div>
  );
}

export default function RiskAssessmentNewPage() {
  return (
    <RoleGuard requiredPermission="checklists.view">
      <React.Suspense fallback={<LoadingPage />}>
        <RiskAssessmentNewContent />
      </React.Suspense>
    </RoleGuard>
  );
}
