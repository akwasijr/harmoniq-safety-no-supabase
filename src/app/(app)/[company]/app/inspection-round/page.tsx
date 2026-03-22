"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCompanyParam } from "@/hooks/use-company-param";
import { useAuth } from "@/hooks/use-auth";
import { useInspectionRoutesStore } from "@/stores/inspection-routes-store";
import { useInspectionRoundsStore } from "@/stores/inspection-rounds-store";
import { useAssetsStore } from "@/stores/assets-store";
import { useCorrectiveActionsStore } from "@/stores/corrective-actions-store";
import { useWorkOrdersStore } from "@/stores/work-orders-store";
import { createCorrectiveActionFromInspection, createWorkOrderFromInspection } from "@/lib/work-order-generator";
import { useToast } from "@/components/ui/toast";
import { useSync } from "@/hooks/use-sync";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "@/i18n";
import { cn } from "@/lib/utils";
import { LoadingPage } from "@/components/ui/loading";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Camera,
  MapPin,
  Eye,
  Ear,
  Ruler,
  Wrench,
  Shield,
  X,
} from "lucide-react";
import type {
  InspectionCheckpoint,
  InspectionCheckpointResult,
  CheckpointResult,
} from "@/types";
import { useGps } from "@/hooks/use-gps";
import { GpsCaptureButton } from "@/components/shared/gps-capture-button";
import { storeFile, FileValidationError } from "@/lib/file-storage";

const CHECK_TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  visual: Eye,
  auditory: Ear,
  measurement: Ruler,
  functional: Wrench,
  safety: Shield,
};

function InspectionRoundContent() {
  const router = useRouter();
  const company = useCompanyParam();
  const searchParams = useSearchParams();
  const routeId = searchParams.get("route");
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { addToQueue, isOnline } = useSync();

  const { items: routes, isLoading: isRoutesLoading } = useInspectionRoutesStore();
  const { add: addRound } = useInspectionRoundsStore({ skipLoad: true });
  const { items: assets, isLoading: isAssetsLoading } = useAssetsStore();
  const { add: addCorrectiveAction } = useCorrectiveActionsStore();
  const { add: addWorkOrder } = useWorkOrdersStore();

  const route = routes.find((r) => r.id === routeId);
  const visibleRoute =
    route &&
    user?.company_id &&
    route.company_id === user.company_id &&
    route.status === "active" &&
    (
      (!route.assigned_to_user_id && !route.assigned_to_team_id) ||
      route.assigned_to_user_id === user.id ||
      (route.assigned_to_team_id
        ? user.team_ids?.includes(route.assigned_to_team_id)
        : false)
    )
      ? route
      : undefined;
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [results, setResults] = React.useState<Map<string, InspectionCheckpointResult>>(new Map());
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [roundStartedAt] = React.useState(new Date().toISOString());
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const gps = useGps();

  // Auto-capture GPS on page load (field worker is at the location)
  React.useEffect(() => {
    gps.captureLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isRoutesLoading || isAssetsLoading) {
    return <LoadingPage />;
  }

  if (!visibleRoute || visibleRoute.checkpoints.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
            <h2 className="font-semibold text-lg">{t("inspectionRounds.routeNotFound")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("inspectionRounds.routeNotFoundDesc")}
            </p>
            <Button className="mt-4 w-full" onClick={() => router.back()}>
              {t("common.goBack")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const checkpoints = visibleRoute.checkpoints.sort((a, b) => a.order - b.order);
  const checkpoint = checkpoints[currentIndex];
  const asset = assets.find(
    (a) => a.id === checkpoint.asset_id && a.company_id === user?.company_id,
  );
  const totalCheckpoints = checkpoints.length;
  const completedCount = results.size;
  const progress = Math.round((completedCount / totalCheckpoints) * 100);

  const currentResult = results.get(checkpoint.id);
  const CheckIcon = CHECK_TYPE_ICONS[checkpoint.check_type] || Eye;
  const resultLabels: Record<CheckpointResult, string> = {
    pass: t("inspectionRounds.pass"),
    fail: t("inspectionRounds.fail"),
    needs_attention: t("inspectionRounds.needsAttention"),
  };

  const setCheckpointResult = (update: Partial<InspectionCheckpointResult>) => {
    const existing = results.get(checkpoint.id);
    const base: InspectionCheckpointResult = existing || {
      checkpoint_id: checkpoint.id,
      asset_id: checkpoint.asset_id,
      result: "pass",
      measured_value: null,
      out_of_range: false,
      photo_url: null,
      notes: null,
    };
    const next = { ...base, ...update };

    // Auto-detect out of range
    if (checkpoint.acceptable_min !== null || checkpoint.acceptable_max !== null) {
      const val = next.measured_value;
      if (val !== null) {
        const outOfRange =
          (checkpoint.acceptable_min !== null && val < checkpoint.acceptable_min) ||
          (checkpoint.acceptable_max !== null && val > checkpoint.acceptable_max);
        next.out_of_range = outOfRange;
        if (outOfRange && next.result === "pass") {
          next.result = "fail";
        }
      }
    }

    setResults((prev) => {
      const map = new Map(prev);
      map.set(checkpoint.id, next);
      return map;
    });
  };

  const handleResultToggle = (result: CheckpointResult) => {
    setCheckpointResult({ result });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const stored = await storeFile(
        file,
        "inspection_round",
        visibleRoute.id,
        user?.id || "unknown",
      );
      setCheckpointResult({ photo_url: stored.dataUrl });
    } catch (err) {
      if (err instanceof FileValidationError) {
        toast(err.message);
      } else if (err instanceof Error && err.message === "QUOTA_EXCEEDED") {
        toast("Storage is full. Delete some files and try again.");
      } else {
        toast("Failed to upload photo");
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleNext = () => {
    if (currentIndex < totalCheckpoints - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleSubmit = () => {
    setIsSubmitting(true);
    const now = new Date().toISOString();
    const alertsCreated: string[] = [];

    // Check for out-of-range values and create alerts
    results.forEach((r) => {
      if (r.out_of_range || r.result === "fail") {
        alertsCreated.push(`alert_${r.checkpoint_id}_${Date.now()}`);
      }
    });

    const roundData = {
      id: crypto.randomUUID(),
      route_id: visibleRoute.id,
      company_id: user?.company_id || "",
      inspector_id: user?.id || "",
      status: "completed" as const,
      started_at: roundStartedAt,
      completed_at: now,
      checkpoint_results: Array.from(results.values()),
      alerts_created: alertsCreated,
      gps_lat: gps.coords?.lat ?? null,
      gps_lng: gps.coords?.lng ?? null,
      created_at: now,
      updated_at: now,
    };

    addRound(roundData);

    // Auto-generate work orders for failed / needs_attention checkpoints
    const failedResults = Array.from(results.values()).filter(
      (r) => r.result === "fail" || r.result === "needs_attention",
    );
    for (const r of failedResults) {
      const cpAsset = assets.find((a) => a.id === r.asset_id);
      if (!cpAsset) continue;
      const correctiveAction = createCorrectiveActionFromInspection({
        inspection: {
          id: roundData.id,
          asset_id: r.asset_id,
          result: r.result,
          notes: "Auto-generated from inspection round",
        },
        asset: { id: cpAsset.id, name: cpAsset.name, company_id: cpAsset.company_id, criticality: cpAsset.criticality },
      });
      addCorrectiveAction(correctiveAction);
      const wo = createWorkOrderFromInspection({
        inspection: {
          id: roundData.id,
          asset_id: r.asset_id,
          result: r.result,
          notes: "Auto-generated from inspection round",
        },
        asset: { id: cpAsset.id, name: cpAsset.name, company_id: cpAsset.company_id, criticality: cpAsset.criticality },
        inspectorId: user?.id || "",
        correctiveActionId: correctiveAction.id,
      });
      addWorkOrder(wo);
    }

    // Queue for sync (especially important when offline)
    addToQueue("inspection_round", roundData as unknown as Record<string, unknown>);

    toast(
      isOnline
        ? t("inspectionRounds.completed")
        : t("inspectionRounds.offline.queuedForSync")
    );
    router.push(`/${company}/app/assets`);
  };

  const resultColors: Record<CheckpointResult, string> = {
    pass: "border-success bg-success text-white",
    fail: "border-destructive bg-destructive text-white",
    needs_attention: "border-warning bg-warning text-white",
  };

  const resultOutline: Record<CheckpointResult, string> = {
    pass: "border-success text-success",
    fail: "border-destructive text-destructive",
    needs_attention: "border-warning text-warning",
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-14 z-30 border-b bg-background">
        <div className="flex h-14 items-center gap-4 px-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-semibold text-sm">{visibleRoute.name}</h1>
            <p className="text-xs text-muted-foreground">
              {t("inspectionRounds.checkpointOf", {
                current: String(currentIndex + 1),
                total: String(totalCheckpoints),
              })}{" "}
              • {completedCount} {t("inspectionRounds.done")}
            </p>
          </div>
        </div>
        <div className="h-1 bg-muted">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      {/* Checkpoint content */}
      <div className="flex-1 p-4 pb-32 max-w-lg mx-auto w-full">
        {/* Asset info */}
        <Card className="mb-4">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <CheckIcon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{asset?.name || "Unknown asset"}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {t(`inspectionRounds.checkType.${checkpoint.check_type}`)}
                  {asset?.location_id && (
                    <span className="ml-1">
                      <MapPin className="inline h-3 w-3" />
                    </span>
                  )}
                </p>
              </div>
              {currentResult && (
                <span className={cn(
                  "px-2 py-1 rounded-full text-xs font-medium capitalize",
                  currentResult.result === "pass" ? "bg-success/10 text-success" :
                  currentResult.result === "fail" ? "bg-destructive/10 text-destructive" :
                  "bg-warning/10 text-warning"
                )}>
                  {resultLabels[currentResult.result]}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Checkpoint label & instructions */}
        <div className="mb-6">
          <h2 className="text-lg font-bold mb-1">{checkpoint.label}</h2>
          {checkpoint.instructions && (
            <p className="text-sm text-muted-foreground">{checkpoint.instructions}</p>
          )}
          {(checkpoint.acceptable_min !== null || checkpoint.acceptable_max !== null) && (
            <div className="mt-2 inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs text-muted-foreground">
              <Ruler className="h-3 w-3" />
              {t("inspectionRounds.acceptableRange")}:{" "}
              {checkpoint.acceptable_min !== null ? checkpoint.acceptable_min : "N/A"}
              {" – "}
              {checkpoint.acceptable_max !== null ? checkpoint.acceptable_max : "N/A"}
              {checkpoint.unit ? ` ${checkpoint.unit}` : ""}
            </div>
          )}
        </div>

        {/* Result toggle */}
        <div className="mb-6">
          <p className="mb-2 text-sm font-medium">{t("inspectionRounds.result")}</p>
          <div className="grid grid-cols-3 gap-2">
            {(["pass", "fail", "needs_attention"] as CheckpointResult[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => handleResultToggle(r)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl border-2 p-3 transition-all text-sm font-medium",
                  currentResult?.result === r ? resultColors[r] : resultOutline[r] + " bg-background"
                )}
              >
                {r === "pass" && <CheckCircle className="h-5 w-5" />}
                {r === "fail" && <XCircle className="h-5 w-5" />}
                {r === "needs_attention" && <AlertTriangle className="h-5 w-5" />}
                <span className="text-xs">{resultLabels[r]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Measurement input */}
        {(checkpoint.acceptable_min !== null || checkpoint.acceptable_max !== null) && (
          <div className="mb-6">
            <p className="mb-2 text-sm font-medium">
              {t("inspectionRounds.measuredValue")} {checkpoint.unit ? `(${checkpoint.unit})` : ""}
            </p>
            <Input
              type="number"
              placeholder="Enter measurement value"
              aria-label="Measured value"
              value={currentResult?.measured_value ?? ""}
              onChange={(e) => {
                const val = e.target.value === "" ? null : parseFloat(e.target.value);
                setCheckpointResult({ measured_value: val });
              }}
              className={cn(
                "h-12 text-lg",
                currentResult?.out_of_range && "border-destructive text-destructive"
              )}
            />
            {currentResult?.out_of_range && (
              <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {t("inspectionRounds.outOfRange")}
              </p>
            )}
          </div>
        )}

        {/* Photo */}
        <div className="mb-6">
          <p className="mb-2 text-sm font-medium">{t("inspectionRounds.photo")}</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoUpload}
            className="hidden"
          />
          {currentResult?.photo_url ? (
            <div className="relative w-full aspect-video rounded-xl overflow-hidden border">
              <img src={currentResult.photo_url} alt="Checkpoint photo" className="h-full w-full object-cover" loading="lazy" />
              <button
                type="button"
                onClick={() => setCheckpointResult({ photo_url: null })}
                className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full gap-2 h-12"
              onClick={() => fileInputRef.current?.click()}
            >
              <Camera className="h-4 w-4" />
              {t("inspectionRounds.takePhoto")}
            </Button>
          )}
        </div>

        {/* Notes */}
        <div className="mb-6">
          <p className="mb-2 text-sm font-medium">{t("inspectionRounds.notes")}</p>
          <Textarea
            placeholder={t("inspectionRounds.addNotes")}
            value={currentResult?.notes || ""}
            onChange={(e) => setCheckpointResult({ notes: e.target.value || null })}
            rows={3}
          />
        </div>

        {/* GPS Capture */}
        <div className="mb-6">
          <p className="mb-2 text-sm font-medium">{t("common.location") || "Location"}</p>
          <GpsCaptureButton
            coords={gps.coords}
            loading={gps.loading}
            error={gps.error}
            onCapture={gps.captureLocation}
          />
        </div>

        {/* Checkpoint dots */}
        <div className="flex items-center justify-center gap-1.5 mb-4">
          {checkpoints.map((cp, i) => {
            const cpResult = results.get(cp.id);
            const isIncomplete = !cpResult;
            return (
              <button
                key={cp.id}
                type="button"
                onClick={() => setCurrentIndex(i)}
                aria-label={`Checkpoint ${i + 1}${isIncomplete ? " (incomplete)" : ""}`}
                className={cn(
                  "h-2.5 w-2.5 rounded-full transition-all",
                  i === currentIndex ? "w-6 bg-primary" :
                  cpResult?.result === "pass" ? "bg-success" :
                  cpResult?.result === "fail" ? "bg-destructive" :
                  cpResult?.result === "needs_attention" ? "bg-warning" :
                  "bg-muted-foreground/30 ring-1 ring-muted-foreground/20"
                )}
              />
            );
          })}
        </div>
      </div>

      {/* Footer navigation */}
      <div className="fixed bottom-16 left-0 right-0 border-t bg-background p-4 z-20">
        <div className="flex flex-col gap-2 max-w-lg mx-auto">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="h-12"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            {currentIndex < totalCheckpoints - 1 ? (
              <Button onClick={handleNext} className="flex-1 h-12 gap-2">
                {t("inspectionRounds.nextCheckpoint")}
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || completedCount < totalCheckpoints}
                className="flex-1 h-12 gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                {completedCount < totalCheckpoints
                  ? t("inspectionRounds.remaining", {
                      count: String(totalCheckpoints - completedCount),
                    })
                  : t("inspectionRounds.submitInspection")
                }
              </Button>
            )}
          </div>
          {completedCount < totalCheckpoints && currentIndex === totalCheckpoints - 1 && (
            <p className="text-xs text-center text-muted-foreground">
              Complete all checkpoints to submit ({totalCheckpoints - completedCount} remaining)
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function InspectionRoundPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      }
    >
      <InspectionRoundContent />
    </React.Suspense>
  );
}
