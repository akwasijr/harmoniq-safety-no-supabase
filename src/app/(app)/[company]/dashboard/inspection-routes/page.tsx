"use client";

import * as React from "react";
import { useCompanyParam } from "@/hooks/use-company-param";
import { useInspectionRoutesStore } from "@/stores/inspection-routes-store";
import { useAssetsStore } from "@/stores/assets-store";
import { useInspectionRoundsStore } from "@/stores/inspection-rounds-store";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { KPICard } from "@/components/ui/kpi-card";
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

const CHECK_TYPES: { value: InspectionCheckType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "visual", label: "Visual", icon: Eye },
  { value: "auditory", label: "Auditory", icon: Ear },
  { value: "measurement", label: "Measurement", icon: Ruler },
  { value: "functional", label: "Functional", icon: Wrench },
  { value: "safety", label: "Safety", icon: Shield },
];

export default function InspectionRoutesPage() {
  const company = useCompanyParam();
  const { items: routes, add: addRoute, update: updateRoute, remove: removeRoute } = useInspectionRoutesStore();
  const { items: assets } = useAssetsStore();
  const { items: rounds } = useInspectionRoundsStore();
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
      toast("Name and at least one checkpoint are required");
      return;
    }

    const now = new Date().toISOString();
    const route: InspectionRoute = {
      id: `route_${Date.now()}`,
      company_id: "",
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
    toast("Inspection route created");
    setShowCreateModal(false);
    setFormName("");
    setFormDescription("");
    setFormRecurrence("daily");
    setFormCheckpoints([]);
  };

  const toggleRouteStatus = (route: InspectionRoute) => {
    const next: InspectionRouteStatus = route.status === "active" ? "inactive" : "active";
    updateRoute(route.id, { status: next, updated_at: new Date().toISOString() });
    toast(`Route ${next === "active" ? "activated" : "deactivated"}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">Inspection Routes</h1>
        <Button size="sm" className="gap-2" onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4" />
          Create Route
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-3">
        <KPICard title="Active Routes" value={activeRoutes.length} icon={ClipboardCheck} />
        <KPICard title="Total Routes" value={routes.length} icon={ClipboardCheck} />
        <KPICard title="Completed Rounds" value={completedRounds.length} icon={CheckCircle} />
      </div>

      {/* Routes list */}
      <div className="space-y-3">
        {routes.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <ClipboardCheck className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
              <p className="font-medium text-muted-foreground">No inspection routes yet</p>
              <p className="text-sm text-muted-foreground mt-1">Create a route to start scheduled inspections.</p>
            </CardContent>
          </Card>
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
                          {route.checkpoints.length} checkpoints • {route.recurrence} • {routeRounds.length} completed
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={route.status === "active" ? "success" : "secondary"} className="capitalize">
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
                      <p className="text-sm font-medium">Checkpoints</p>
                      <div className="space-y-1.5">
                        {route.checkpoints
                          .sort((a, b) => a.order - b.order)
                          .map((cp, i) => {
                            const asset = assets.find((a) => a.id === cp.asset_id);
                            const TypeIcon = CHECK_TYPES.find((t) => t.value === cp.check_type)?.icon || Eye;
                            return (
                              <div key={cp.id} className="flex items-center gap-3 rounded-lg border p-2.5 text-sm">
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
                                  {i + 1}
                                </span>
                                <TypeIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium truncate">{cp.label}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {asset?.name || "Unknown asset"}
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
                        {route.status === "active" ? "Deactivate" : "Activate"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive"
                        onClick={() => {
                          removeRoute(route.id);
                          toast("Route deleted");
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        Delete
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
              <h2 className="text-xl font-semibold">Create Inspection Route</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowCreateModal(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <Label>Route Name *</Label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g., Morning Safety Walk"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Describe the inspection route..."
                  className="mt-1"
                  rows={2}
                />
              </div>
              <div>
                <Label>Recurrence</Label>
                <select
                  value={formRecurrence}
                  onChange={(e) => setFormRecurrence(e.target.value as typeof formRecurrence)}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="once">One-time</option>
                </select>
              </div>

              {/* Checkpoints */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Checkpoints ({formCheckpoints.length})</Label>
                  <Button variant="outline" size="sm" onClick={addCheckpoint} className="gap-1">
                    <Plus className="h-3.5 w-3.5" />
                    Add Checkpoint
                  </Button>
                </div>
                <div className="space-y-3">
                  {formCheckpoints.map((cp, i) => (
                    <div key={cp.id} className="rounded-lg border p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">Checkpoint {i + 1}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeCheckpoint(i)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <Label className="text-xs">Asset *</Label>
                          <select
                            value={cp.asset_id}
                            onChange={(e) => updateCheckpoint(i, { asset_id: e.target.value })}
                            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          >
                            <option value="">Select asset...</option>
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
                          <Label className="text-xs">Check Type</Label>
                          <select
                            value={cp.check_type}
                            onChange={(e) => updateCheckpoint(i, { check_type: e.target.value as InspectionCheckType })}
                            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          >
                            {CHECK_TYPES.map((t) => (
                              <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">What to check *</Label>
                        <Input
                          value={cp.label}
                          onChange={(e) => updateCheckpoint(i, { label: e.target.value })}
                          placeholder="e.g., Check belt tension"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Instructions</Label>
                        <Input
                          value={cp.instructions || ""}
                          onChange={(e) => updateCheckpoint(i, { instructions: e.target.value || null })}
                          placeholder="Detailed instructions..."
                          className="mt-1"
                        />
                      </div>
                      {(cp.check_type === "measurement") && (
                        <div className="grid gap-3 sm:grid-cols-3">
                          <div>
                            <Label className="text-xs">Min</Label>
                            <Input
                              type="number"
                              value={cp.acceptable_min ?? ""}
                              onChange={(e) => updateCheckpoint(i, { acceptable_min: e.target.value ? parseFloat(e.target.value) : null })}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Max</Label>
                            <Input
                              type="number"
                              value={cp.acceptable_max ?? ""}
                              onChange={(e) => updateCheckpoint(i, { acceptable_max: e.target.value ? parseFloat(e.target.value) : null })}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Unit</Label>
                            <Input
                              value={cp.unit || ""}
                              onChange={(e) => updateCheckpoint(i, { unit: e.target.value || null })}
                              placeholder="e.g., °C, psi"
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
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleCreate}
                disabled={!formName.trim() || formCheckpoints.length === 0}
              >
                Create Route
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
