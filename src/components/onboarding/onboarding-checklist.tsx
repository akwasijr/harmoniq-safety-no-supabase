"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { CheckCircle, Circle, ChevronRight, X } from "lucide-react";
import { useTranslation } from "@/i18n";
import { useAuth } from "@/hooks/use-auth";
import { useUsersStore } from "@/stores/users-store";
import { useLocationsStore } from "@/stores/locations-store";
import { useAssetsStore } from "@/stores/assets-store";
import { useChecklistTemplatesStore } from "@/stores/checklists-store";
import { useCompanyParam } from "@/hooks/use-company-param";

interface OnboardingStep {
  id: string;
  titleKey: string;
  descriptionKey: string;
  href: string;
  isComplete: () => boolean;
}

export function OnboardingChecklist() {
  const { t } = useTranslation();
  const { user, hasPermission } = useAuth();
  const company = useCompanyParam();
  const { items: users } = useUsersStore();
  const { items: locations } = useLocationsStore();
  const { items: assets } = useAssetsStore();
  const { items: templates } = useChecklistTemplatesStore();

  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const key = `harmoniq_onboarding_dismissed_${user?.company_id}`;
    if (typeof window !== "undefined" && localStorage.getItem(key)) {
      setDismissed(true);
    }
  }, [user?.company_id]);

  if (!hasPermission("settings.edit") || dismissed) return null;

  const steps: OnboardingStep[] = [
    {
      id: "add-location",
      titleKey: "onboarding.addLocation",
      descriptionKey: "onboarding.addLocationDesc",
      href: `/${company}/dashboard/locations`,
      isComplete: () =>
        locations.filter((l) => l.company_id === user?.company_id).length > 0,
    },
    {
      id: "invite-team",
      titleKey: "onboarding.inviteTeam",
      descriptionKey: "onboarding.inviteTeamDesc",
      href: `/${company}/dashboard/users`,
      isComplete: () =>
        users.filter((u) => u.company_id === user?.company_id).length > 1,
    },
    {
      id: "add-asset",
      titleKey: "onboarding.addAsset",
      descriptionKey: "onboarding.addAssetDesc",
      href: `/${company}/dashboard/assets`,
      isComplete: () =>
        assets.filter((a) => a.company_id === user?.company_id).length > 0,
    },
    {
      id: "create-checklist",
      titleKey: "onboarding.createChecklist",
      descriptionKey: "onboarding.createChecklistDesc",
      href: `/${company}/dashboard/checklists`,
      isComplete: () =>
        templates.filter((tmpl) => tmpl.company_id === user?.company_id)
          .length > 0,
    },
    {
      id: "customize-settings",
      titleKey: "onboarding.customizeSettings",
      descriptionKey: "onboarding.customizeSettingsDesc",
      href: `/${company}/dashboard/settings`,
      isComplete: () => false,
    },
  ];

  const completedCount = steps.filter((s) => s.isComplete()).length;
  const allComplete = completedCount === steps.length;

  if (allComplete) return null;

  const handleDismiss = () => {
    const key = `harmoniq_onboarding_dismissed_${user?.company_id}`;
    localStorage.setItem(key, "true");
    setDismissed(true);
  };

  const [expanded, setExpanded] = useState(false);

  const progress = Math.round((completedCount / steps.length) * 100);

  return (
    <div className="rounded-lg border bg-card px-4 py-3">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-3 flex-1 min-w-0 text-left"
        >
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-primary">{completedCount}/{steps.length}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium truncate">
                {t("onboarding.title") || "Getting Started"}
              </p>
              <div className="h-1.5 w-20 rounded-full bg-muted overflow-hidden shrink-0">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground">{progress}%</span>
            </div>
          </div>
          <ChevronRight className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${expanded ? "rotate-90" : ""}`} />
        </button>
        <button
          onClick={handleDismiss}
          className="text-muted-foreground hover:text-foreground p-1 ml-2"
          aria-label={t("common.dismiss") || "Dismiss"}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t space-y-1">
          {steps.map((step) => {
            const complete = step.isComplete();
            return (
              <Link
                key={step.id}
                href={step.href}
                className={`flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors text-sm ${
                  complete ? "text-muted-foreground" : "hover:bg-muted/50"
                }`}
              >
                {complete ? (
                  <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
                <span className={complete ? "line-through" : ""}>{t(step.titleKey) || step.id}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
