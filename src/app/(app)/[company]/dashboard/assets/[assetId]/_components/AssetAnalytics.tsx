"use client";

import * as React from "react";
import {
  Wrench,
  CheckCircle,
  AlertTriangle,
  Clock,
  Info,
  BarChart3,
  Power,
  Settings,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "@/i18n";

interface AssetAnalyticsProps {
  healthScore: number;
  healthScoreFactors: {
    inspection: number;
    maintenance: number;
    condition: number;
    downtime: number;
    age: number;
  };
  showScoreBreakdown: boolean;
  setShowScoreBreakdown: (v: boolean) => void;
  totalInspections: number;
  passRate: number;
  assetIncidentsCount: number;
  totalDowntimeHours: number;
  maintenanceCompliance: number;
  lastInspectedDays: number | null;
}

export function AssetAnalytics({
  healthScore,
  healthScoreFactors,
  showScoreBreakdown,
  setShowScoreBreakdown,
  totalInspections,
  passRate,
  assetIncidentsCount,
  totalDowntimeHours,
  maintenanceCompliance,
  lastInspectedDays,
}: AssetAnalyticsProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-6">
            <div className={`flex h-20 w-20 items-center justify-center rounded-full border-4 ${
              healthScore >= 90 ? "border-green-500" : healthScore >= 80 ? "border-blue-500" : healthScore >= 50 ? "border-amber-500" : "border-red-500"
            }`}>
              <span className="text-3xl font-bold">{healthScore}</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <p className="font-semibold text-lg">{t("assets.sections.healthScore")}</p>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  healthScore >= 90
                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                    : healthScore >= 80
                    ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                    : healthScore >= 50
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                    : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                }`}>
                  {healthScore >= 90
                    ? (t("assets.healthScore.excellent") || "Excellent")
                    : healthScore >= 80
                    ? (t("assets.healthScore.good") || "Good")
                    : healthScore >= 50
                    ? (t("assets.healthScore.fair") || "Fair")
                    : (t("assets.healthScore.poor") || "Poor")}
                </span>
                <button
                  type="button"
                  onClick={() => setShowScoreBreakdown(!showScoreBreakdown)}
                  className="inline-flex items-center justify-center rounded-full p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  aria-label="Toggle score breakdown"
                >
                  <Info className="h-4 w-4" />
                </button>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {healthScore >= 90 ? "Excellent condition. Continue regular maintenance" : healthScore >= 80 ? "Good condition. Continue regular maintenance" : healthScore >= 50 ? "Fair condition. Attention needed" : "Poor condition. Immediate action required"}
              </p>
            </div>
          </div>

          {showScoreBreakdown && (
            <div className="mt-4 rounded-lg border bg-muted/30 p-4">
              <p className="text-sm font-medium mb-3">{t("assets.healthScore.howCalculated") || "How this score is calculated"}</p>
              <div className="space-y-3">
                {[
                  { label: t("assets.healthScore.inspections") || "Inspection Pass Rate", value: healthScoreFactors.inspection },
                  { label: t("assets.healthScore.maintenance") || "Maintenance Compliance", value: healthScoreFactors.maintenance },
                  { label: t("assets.healthScore.condition") || "Condition Rating", value: healthScoreFactors.condition },
                  { label: t("assets.healthScore.downtime") || "Downtime Impact", value: healthScoreFactors.downtime },
                  { label: t("assets.healthScore.age") || "Asset Age Factor", value: healthScoreFactors.age },
                ].map((factor) => (
                  <div key={factor.label} className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground w-44 shrink-0">{factor.label}</span>
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          factor.value >= 80 ? "bg-green-500" : factor.value >= 50 ? "bg-amber-500" : "bg-red-500"
                        }`}
                        style={{ width: `${factor.value}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium tabular-nums w-12 text-right">{factor.value}/100</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Inspections</p>
                <p className="text-3xl font-semibold">{totalInspections}</p>
                <p className="text-xs text-muted-foreground mt-1">{t("assets.kpi.totalInspectionsDesc") || "Number of inspections performed on this asset"}</p>
              </div>
              <Wrench className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pass Rate</p>
                <p className="text-3xl font-semibold">{totalInspections > 0 ? `${passRate}%` : "—"}</p>
                <p className="text-xs text-muted-foreground mt-1">{t("assets.kpi.passRateDesc") || "Percentage of inspections that passed all checks"}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Incidents</p>
                <p className="text-3xl font-semibold">{assetIncidentsCount}</p>
                <p className="text-xs text-muted-foreground mt-1">{t("assets.kpi.totalIncidentsDesc") || "Safety incidents involving this asset"}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Downtime Hours</p>
                <p className="text-3xl font-semibold">{totalDowntimeHours.toFixed(1)}h</p>
                <p className="text-xs text-muted-foreground mt-1">{t("assets.kpi.downtimeHoursDesc") || "Total hours this asset was out of service"}</p>
              </div>
              <Power className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Maintenance Compliance</p>
                <p className="text-3xl font-semibold">{maintenanceCompliance}%</p>
                <p className="text-xs text-muted-foreground mt-1">{t("assets.kpi.maintenanceComplianceDesc") || "Percentage of on-time maintenance completions"}</p>
              </div>
              <Settings className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Last Inspected</p>
                <p className="text-3xl font-semibold">{lastInspectedDays !== null ? `${lastInspectedDays}d` : "Never"}</p>
                <p className="text-xs text-muted-foreground mt-1">{t("assets.kpi.lastInspectedDesc") || "Days since the last inspection was performed"}</p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
