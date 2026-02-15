"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCompanyParam } from "@/hooks/use-company-param";
import {
  ArrowLeft,
  Wrench,
  AlertTriangle,
  ClipboardCheck,
  CheckCircle,
  Clock,
  MapPin,
  Package,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAssetsStore } from "@/stores/assets-store";
import { useTranslation } from "@/i18n";
import { useAssetInspectionsStore } from "@/stores/inspections-store";
import { useLocationsStore } from "@/stores/locations-store";

function AssetQuickViewPageContent() {
  const router = useRouter();
  const company = useCompanyParam();
  const searchParams = useSearchParams();
  const assetId = searchParams.get("id") || "";
  const { items: assets, isLoading } = useAssetsStore();
  const { items: inspections } = useAssetInspectionsStore();
  const { items: locations } = useLocationsStore();

  const { t, formatDate } = useTranslation();
  const asset = assets.find((a) => a.id === assetId);
  const assetInspections = inspections.filter((i) => i.asset_id === assetId);
  const lastInspection = [...assetInspections].sort((a, b) => new Date(b.inspected_at).getTime() - new Date(a.inspected_at).getTime())[0];
  const location = asset?.location_id ? locations.find((l) => l.id === asset.location_id) : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="pt-6 text-center">
            <Package className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
            <h2 className="font-semibold text-lg">{t("assets.assetNotFound")}</h2>
            <p className="text-sm text-muted-foreground mt-1">{t("assets.assetNotFoundDesc")}</p>
            <Button className="mt-4 w-full" onClick={() => router.back()}>{t("assets.goBack")}</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const conditionColors: Record<string, string> = {
    excellent: "text-success",
    good: "text-success",
    fair: "text-warning",
    poor: "text-destructive",
    critical: "text-destructive",
  };
  const conditionColor = conditionColors[asset.condition] || "text-muted-foreground";

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background border-b px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="font-semibold">{t("assets.assetDetails")}</h1>
      </div>

      <div className="p-4 space-y-4 max-w-lg mx-auto">
        {/* Asset Summary Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 shrink-0">
                <Package className="h-7 w-7 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-lg">{asset.name}</h2>
                <p className="text-sm text-muted-foreground font-mono">{asset.asset_tag}</p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className="text-xs capitalize">
                    {asset.status}
                  </span>
                  <span className={`text-xs capitalize ${conditionColor}`}>
                    {asset.condition}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <Wrench className="h-4 w-4 text-muted-foreground" />
                <span>{asset.manufacturer || t("assets.unknown")} {asset.model || ""}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">{t("assets.labels.assetType")}:</span>
                <span className="capitalize">{asset.asset_type || "—"}</span>
              </div>
              {location && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{location.name}</span>
                </div>
              )}
              {asset.department && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{t("assets.labels.department")}:</span>
                  <span>{asset.department}</span>
                </div>
              )}
              {asset.serial_number && (
                <div className="flex items-center gap-2 col-span-2">
                  <span className="text-muted-foreground">S/N:</span>
                  <span className="font-mono">{asset.serial_number}</span>
                </div>
              )}
              {asset.warranty_expiry && (
                <div className="flex items-center gap-2 col-span-2">
                  <span className="text-muted-foreground">{t("assets.labels.warrantyExpiry")}:</span>
                  <span>{formatDate(asset.warranty_expiry)}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Last Inspection */}
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">{t("assets.lastInspection")}</h3>
            {lastInspection ? (
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full ${lastInspection.result === "pass" ? "bg-success/10" : "bg-destructive/10"}`}>
                  {lastInspection.result === "pass" ? (
                    <CheckCircle className="h-5 w-5 text-success" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                  )}
                </div>
                <div>
                  <p className="font-medium capitalize">{lastInspection.result}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(new Date(lastInspection.inspected_at))}
                    {lastInspection.notes && ` — ${lastInspection.notes}`}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 text-muted-foreground">
                <Clock className="h-5 w-5" />
                <p className="text-sm">{t("assets.noInspectionsRecorded")}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">{t("assets.quickActions")}</h3>
          <div className="grid grid-cols-2 gap-3">
            <Link href={`/${company}/app/inspection?asset=${asset.id}`}>
              <Button variant="outline" className="w-full h-20 flex-col gap-1">
                <ClipboardCheck className="h-6 w-6" />
                <span className="text-xs">{t("assets.startInspection")}</span>
              </Button>
            </Link>
            <Link href={`/${company}/app/maintenance?asset=${asset.id}`}>
              <Button variant="outline" className="w-full h-20 flex-col gap-1">
                <Send className="h-6 w-6" />
                <span className="text-xs">{t("assets.requestRepair")}</span>
              </Button>
            </Link>
            <Link href={`/${company}/app/report?asset=${asset.id}`}>
              <Button variant="outline" className="w-full h-20 flex-col gap-1">
                <AlertTriangle className="h-6 w-6" />
                <span className="text-xs">{t("assets.reportIncident")}</span>
              </Button>
            </Link>
            <Link href={`/${company}/dashboard/assets/${asset.id}`}>
              <Button variant="outline" className="w-full h-20 flex-col gap-1">
                <Package className="h-6 w-6" />
                <span className="text-xs">{t("assets.fullDetails")}</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Safety Instructions */}
        {asset.safety_instructions && (
          <Card className="border-warning/50 bg-warning/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium">{t("assets.safetyInstructions")}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{asset.safety_instructions}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function AssetQuickViewPage() {
  return (
    <React.Suspense fallback={<div className="flex min-h-[400px] items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}>
      <AssetQuickViewPageContent />
    </React.Suspense>
  );
}
