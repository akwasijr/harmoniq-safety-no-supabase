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

  const progress = Math.round((completedCount / steps.length) * 100);

  return (
    <div className="rounded-lg border bg-card p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-lg">
            {t("onboarding.title") || "Getting Started"}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {t("onboarding.description") ||
              "Complete these steps to set up your workspace"}
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="text-muted-foreground hover:text-foreground p-1"
          aria-label={t("common.dismiss") || "Dismiss"}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-muted-foreground">
            {completedCount}/{steps.length}{" "}
            {t("onboarding.completed") || "completed"}
          </span>
          <span className="font-medium">{progress}%</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-2">
        {steps.map((step) => {
          const complete = step.isComplete();
          return (
            <Link
              key={step.id}
              href={step.href}
              className={`flex items-center gap-3 rounded-md p-3 transition-colors ${
                complete ? "bg-muted/50" : "hover:bg-muted/50"
              }`}
            >
              {complete ? (
                <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-medium ${
                    complete ? "line-through text-muted-foreground" : ""
                  }`}
                >
                  {t(step.titleKey) || step.id}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {t(step.descriptionKey) || ""}
                </p>
              </div>
              {!complete && (
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
