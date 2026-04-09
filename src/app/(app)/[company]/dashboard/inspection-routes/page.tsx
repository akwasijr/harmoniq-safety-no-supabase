"use client";

import * as React from "react";
import { useTranslation } from "@/i18n";
import { useCompanyParam } from "@/hooks/use-company-param";
import { useCompanyData } from "@/hooks/use-company-data";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { KPICard } from "@/components/ui/kpi-card";
import { LoadingPage } from "@/components/ui/loading";
import { NoDataEmptyState } from "@/components/ui/empty-state";
import {
  Plus,
  X,
  ClipboardCheck,
  ChevronDown,
  ChevronUp,
  Trash2,
  Eye,
  Ear,
  Ruler,
  Wrench,
  Shield,
  CheckCircle,
} from "lucide-react";
import type {
  InspectionRoute,
  InspectionCheckpoint,
  InspectionCheckType,
  InspectionRouteStatus,
} from "@/types";
import { RoleGuard } from "@/components/auth/role-guard";

const CHECK_TYPE_ICONS: Record<InspectionCheckType, React.ComponentType<{ className?: string }>> = {
  visual: Eye,
  auditory: Ear,
  measurement: Ruler,
  functional: Wrench,
  safety: Shield,
};

const CHECK_TYPE_KEYS: InspectionCheckType[] = ["visual", "auditory", "measurement", "functional", "safety"];

export default function InspectionRoutesPage() {
  const { t } = useTranslation();
  const company = useCompanyParam();
  const { inspectionRoutes: routes, assets, inspectionRounds: rounds, companyId, stores } = useCompanyData();
  const { isLoading, add: addRoute, update: updateRoute, remove: removeRoute } = stores.inspectionRoutes;
  const { toast } = useToast();

  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [expandedRouteId, setExpandedRouteId] = React.useState<string | null>(null);

  // Create form
  const [formName, setFormName] = React.useState("");
  const [formDescription, setFormDescription] = React.useState("");
  const [formRecurrence, setFormRecurrence] = React.useState<"daily" | "weekly" | "monthly" | "once">("daily");
  const [formCheckpoints, setFormCheckpoints] = React.useState<Omit<InspectionCheckpoint, "order">[]>([]);

  const activeRoutes = routes.filter((r) => r.status === "active");
  const completedRounds = rounds.filter((r) => r.status === "completed");

  const addCheckpoint = () => {
    setFormCheckpoints([
      ...formCheckpoints,
      {
        id: `cp_new_${Date.now()}_${formCheckpoints.length}`,
        asset_id: "",
        label: "",
        check_type: "visual",
        acceptable_min: null,
        acceptable_max: null,
        unit: null,
        instructions: null,
        required: true,
      },
    ]);
  };

  const updateCheckpoint = (index: number, update: Partial<InspectionCheckpoint>) => {
    setFormCheckpoints((prev) =>
      prev.map((cp, i) => (i === index ? { ...cp, ...update } : cp))
    );
  };

  const removeCheckpoint = (index: number) => {
    setFormCheckpoints((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreate = () => {
    if (!formName.trim() || formCheckpoints.length === 0) {
      toast(t("inspectionRoutes.validation.nameAndCheckpointRequired"));
      return;
    }

    const now = new Date().toISOString();
    const route: InspectionRoute = {
      id: `route_${Date.now()}`,
      company_id: companyId || "",
      name: formName.trim(),
      description: formDescription.trim() || null,
      status: "active",
      recurrence: formRecurrence,
      assigned_to_user_id: null,
      assigned_to_team_id: null,
      checkpoints: formCheckpoints.map((cp, i) => ({ ...cp, order: i + 1 })),
      created_by: "current_user",
      created_at: now,
      updated_at: now,
    };

    addRoute(route);
    toast(t("inspectionRoutes.toast.routeCreated"));
    setShowCreateModal(false);
    setFormName("");
    setFormDescription("");
    setFormRecurrence("daily");
    setFormCheckpoints([]);
  };

  const toggleRouteStatus = (route: InspectionRoute) => {
    const next: InspectionRouteStatus = route.status === "active" ? "inactive" : "active";
    updateRoute(route.id, { status: next, updated_at: new Date().toISOString() });
    toast(next === "active" ? t("inspectionRoutes.toast.routeActivated") : t("inspectionRoutes.toast.routeDeactivated"));
  };

  if (isLoading && routes.length === 0) {
    return <LoadingPage />;
  }

  return (
    <RoleGuard requiredPermission="checklists.view">
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">{t("inspectionRoutes.title")}</h1>
        <Button size="sm" className="gap-2" onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4" />
          {t("inspectionRoutes.createRoute")}
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-3">
        <KPICard title={t("inspectionRoutes.kpi.activeRoutes")} value={activeRoutes.length} icon={ClipboardCheck} />
        <KPICard title={t("inspectionRoutes.kpi.totalRoutes")} value={routes.length} icon={ClipboardCheck} />
        <KPICard title={t("inspectionRoutes.kpi.completedRounds")} value={completedRounds.length} icon={CheckCircle} />
      </div>

      {/* Routes list */}
      <div className="space-y-3">
        {routes.length === 0 ? (
          <NoDataEmptyState
            entityName="inspection routes"
            onAdd={() => setShowCreateModal(true)}
            addLabel={t("inspectionRoutes.createRoute")}
          />
        ) : (
          routes.map((route) => {
            const isExpanded = expandedRouteId === route.id;
            const routeRounds = rounds.filter((r) => r.route_id === route.id);
            return (
              <Card key={route.id}>
                <CardHeader
                  className="pb-3 cursor-pointer"
                  onClick={() => setExpandedRouteId(isExpanded ? null : route.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <ClipboardCheck className="h-5 w-5 text-primary" />
                      <div>
                        <CardTitle className="text-base">{route.name}</CardTitle>
                        <p className="text-xs text-muted-foreground">
                          {route.checkpoints.length} {t("inspectionRoutes.checkpoints")} • {t(`inspectionRoutes.recurrence.${route.recurrence}`)} • {routeRounds.length} {t("inspectionRoutes.completed")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={route.status === "active" ? "success" : "secondary"}>
                        {route.status}
                      </Badge>
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </div>
                </CardHeader>
                {isExpanded && (
                  <CardContent className="pt-0 space-y-4">
                    {route.description && (
                      <p className="text-sm text-muted-foreground">{route.description}</p>
                    )}

                    <div className="space-y-2">
                      <p className="text-sm font-medium">{t("inspectionRoutes.checkpoints")}</p>
                      <div className="space-y-1.5">
                        {route.checkpoints
                          .sort((a, b) => a.order - b.order)
                          .map((cp, i) => {
                            const asset = assets.find((a) => a.id === cp.asset_id);
                            const TypeIcon = CHECK_TYPE_ICONS[cp.check_type] || Eye;
                            return (
                              <div key={cp.id} className="flex items-center gap-3 rounded-lg border p-2.5 text-sm">
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
                                  {i + 1}
                                </span>
                                <TypeIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium truncate">{cp.label}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {asset?.name || t("inspectionRoutes.unknownAsset")}
                                    {cp.acceptable_min !== null || cp.acceptable_max !== null
                                      ? ` • Range: ${cp.acceptable_min ?? "—"}–${cp.acceptable_max ?? "—"} ${cp.unit || ""}`
                                      : ""}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleRouteStatus(route)}
                      >
                        {route.status === "active" ? t("inspectionRoutes.deactivate") : t("inspectionRoutes.activate")}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive"
                        onClick={() => {
                          if (!window.confirm("Are you sure you want to delete this route? This action cannot be undone.")) return;
                          removeRoute(route.id);
                          toast(t("inspectionRoutes.toast.routeDeleted"));
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        {t("common.delete")}
                      </Button>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowCreateModal(false)} />
          <div className="relative z-50 w-full max-w-2xl rounded-xl bg-background p-6 shadow-xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">{t("inspectionRoutes.createInspectionRoute")}</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowCreateModal(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <Label>{t("inspectionRoutes.labels.routeName")} *</Label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder={t("inspectionRoutes.placeholders.routeName")}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>{t("inspectionRoutes.labels.description")}</Label>
                <Textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder={t("inspectionRoutes.placeholders.description")}
                  className="mt-1"
                  rows={2}
                />
              </div>
              <div>
                <Label>{t("inspectionRoutes.labels.recurrence")}</Label>
                <select
                  value={formRecurrence}
                  onChange={(e) => setFormRecurrence(e.target.value as typeof formRecurrence)}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="daily">{t("inspectionRoutes.recurrence.daily")}</option>
                  <option value="weekly">{t("inspectionRoutes.recurrence.weekly")}</option>
                  <option value="monthly">{t("inspectionRoutes.recurrence.monthly")}</option>
                  <option value="once">{t("inspectionRoutes.recurrence.once")}</option>
                </select>
              </div>

              {/* Checkpoints */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>{t("inspectionRoutes.checkpoints")} ({formCheckpoints.length})</Label>
                  <Button variant="outline" size="sm" onClick={addCheckpoint} className="gap-1">
                    <Plus className="h-3.5 w-3.5" />
                    {t("inspectionRoutes.addCheckpoint")}
                  </Button>
                </div>
                <div className="space-y-3">
                  {formCheckpoints.map((cp, i) => (
                    <div key={cp.id} className="rounded-lg border p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">{t("inspectionRoutes.checkpoint")} {i + 1}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeCheckpoint(i)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <Label className="text-xs">{t("inspectionRoutes.labels.asset")} *</Label>
                          <select
                            value={cp.asset_id}
                            onChange={(e) => updateCheckpoint(i, { asset_id: e.target.value })}
                            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          >
                            <option value="">{t("inspectionRoutes.placeholders.selectAsset")}</option>
                            {assets
                              .filter((a) => a.status !== "retired")
                              .map((a) => (
                                <option key={a.id} value={a.id}>
                                  {a.name} ({a.asset_tag})
                                </option>
                              ))}
                          </select>
                        </div>
                        <div>
                          <Label className="text-xs">{t("inspectionRoutes.labels.checkType")}</Label>
                          <select
                            value={cp.check_type}
                            onChange={(e) => updateCheckpoint(i, { check_type: e.target.value as InspectionCheckType })}
                            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          >
                            {CHECK_TYPE_KEYS.map((val) => (
                              <option key={val} value={val}>{t(`inspectionRoutes.checkTypes.${val}`)}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">{t("inspectionRoutes.labels.whatToCheck")} *</Label>
                        <Input
                          value={cp.label}
                          onChange={(e) => updateCheckpoint(i, { label: e.target.value })}
                          placeholder={t("inspectionRoutes.placeholders.whatToCheck")}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">{t("inspectionRoutes.labels.instructions")}</Label>
                        <Input
                          value={cp.instructions || ""}
                          onChange={(e) => updateCheckpoint(i, { instructions: e.target.value || null })}
                          placeholder={t("inspectionRoutes.placeholders.instructions")}
                          className="mt-1"
                        />
                      </div>
                      {(cp.check_type === "measurement") && (
                        <div className="grid gap-3 sm:grid-cols-3">
                          <div>
                            <Label className="text-xs">{t("inspectionRoutes.labels.min")}</Label>
                            <Input
                              type="number"
                              value={cp.acceptable_min ?? ""}
                              onChange={(e) => updateCheckpoint(i, { acceptable_min: e.target.value ? parseFloat(e.target.value) : null })}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">{t("inspectionRoutes.labels.max")}</Label>
                            <Input
                              type="number"
                              value={cp.acceptable_max ?? ""}
                              onChange={(e) => updateCheckpoint(i, { acceptable_max: e.target.value ? parseFloat(e.target.value) : null })}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">{t("inspectionRoutes.labels.unit")}</Label>
                            <Input
                              value={cp.unit || ""}
                              onChange={(e) => updateCheckpoint(i, { unit: e.target.value || null })}
                              placeholder={t("inspectionRoutes.placeholders.unit")}
                              className="mt-1"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6 pt-4 border-t">
              <Button variant="outline" className="flex-1" onClick={() => setShowCreateModal(false)}>
                {t("common.cancel")}
              </Button>
              <Button
                className="flex-1"
                onClick={handleCreate}
                disabled={!formName.trim() || formCheckpoints.length === 0}
              >
                {t("inspectionRoutes.createRoute")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
    </RoleGuard>
  );
}
