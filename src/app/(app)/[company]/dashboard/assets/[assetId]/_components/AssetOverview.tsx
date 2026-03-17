"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/i18n";
import { capitalize } from "@/lib/utils";
import { getSeverityVariant } from "@/lib/status-utils";
import type { Asset, AssetCategory, AssetStatus } from "@/types";

const ASSET_CATEGORIES: AssetCategory[] = [
  "machinery", "vehicle", "safety_equipment", "tool", "electrical", "hvac",
  "plumbing", "fire_safety", "lifting_equipment", "pressure_vessel", "ppe", "other",
];

const ASSET_STATUSES: AssetStatus[] = ["active", "maintenance", "inactive", "retired"];

const formatCategoryLabel = (value: string) =>
  value.split("_").map((word) => capitalize(word)).join(" ");

interface AssetOverviewProps {
  asset: Asset;
  isEditing: boolean;
  editedAsset: {
    name: string;
    category: string;
    status: string;
    asset_type: string;
    department: string;
    manufacturer: string;
    model: string;
    purchase_date: string;
    warranty_expiry: string;
    location_id: string;
  };
  setEditedAsset: React.Dispatch<React.SetStateAction<AssetOverviewProps["editedAsset"]>>;
  assetLocation: { id: string; name: string; type: string } | null | undefined;
  assetsAtSameLocation: number;
  assetIncidents: Array<{
    id: string;
    title: string;
    severity: string;
    status: string;
    incident_date: string;
    reference_number: string;
  }>;
  showAllIncidents: boolean;
  setShowAllIncidents: (v: boolean) => void;
  departmentOptions: string[];
  locations: Array<{ id: string; name: string; type: string }>;
  company: string;
}

export function AssetOverview({
  asset,
  isEditing,
  editedAsset,
  setEditedAsset,
  assetLocation,
  assetsAtSameLocation,
  assetIncidents,
  showAllIncidents,
  setShowAllIncidents,
  departmentOptions,
  locations,
  company,
}: AssetOverviewProps) {
  const { t, formatDate } = useTranslation();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("assets.sections.assetInformation")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <Label className="text-muted-foreground">{t("assets.labels.name")}</Label>
              {isEditing ? (
                <Input
                  value={editedAsset.name}
                  onChange={(e) => setEditedAsset((prev) => ({ ...prev, name: e.target.value }))}
                  className="mt-1"
                />
              ) : (
                <p className="font-medium">{asset.name}</p>
              )}
            </div>
            <div>
              <Label className="text-muted-foreground">{t("assets.labels.serialNumber")}</Label>
              <p className="font-medium font-mono">{asset.serial_number}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">{t("assets.labels.category")}</Label>
              {isEditing ? (
                <select
                  className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={editedAsset.category}
                  onChange={(e) => {
                    const nextCategory = ASSET_CATEGORIES.find((category) => category === e.target.value);
                    if (!nextCategory) return;
                    setEditedAsset((prev) => ({ ...prev, category: nextCategory }));
                  }}
                >
                  {ASSET_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {formatCategoryLabel(category)}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="font-medium">{formatCategoryLabel(asset.category)}</p>
              )}
            </div>
            <div>
              <Label className="text-muted-foreground">{t("assets.labels.assetType")}</Label>
              {isEditing ? (
                <select
                  className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={editedAsset.asset_type}
                  onChange={(e) => setEditedAsset((prev) => ({ ...prev, asset_type: e.target.value as typeof editedAsset.asset_type }))}
                >
                  <option value="static">Static</option>
                  <option value="movable">Movable</option>
                </select>
              ) : (
                <p className="font-medium capitalize">{asset.asset_type || "—"}</p>
              )}
            </div>
            <div>
              <Label className="text-muted-foreground">{t("assets.labels.department")}</Label>
              {isEditing ? (
                <>
                  <Input
                    value={editedAsset.department}
                    list="asset-department-options"
                    onChange={(e) => setEditedAsset((prev) => ({ ...prev, department: e.target.value }))}
                    className="mt-1"
                  />
                  <datalist id="asset-department-options">
                    {departmentOptions.map((dept) => (
                      <option key={dept} value={dept} />
                    ))}
                  </datalist>
                </>
              ) : (
                <p className="font-medium">{asset.department || "—"}</p>
              )}
            </div>
            <div>
              <Label className="text-muted-foreground">{t("assets.labels.status")}</Label>
              {isEditing ? (
                <select
                  className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={editedAsset.status}
                  onChange={(e) => {
                    const nextStatus = ASSET_STATUSES.find((status) => status === e.target.value);
                    if (!nextStatus) return;
                    setEditedAsset((prev) => ({ ...prev, status: nextStatus }));
                  }}
                >
                  {ASSET_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {capitalize(status)}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="font-medium capitalize">{asset.status}</p>
              )}
            </div>
            <div>
              <Label className="text-muted-foreground">{t("assets.labels.manufacturer")}</Label>
              {isEditing ? (
                <Input
                  value={editedAsset.manufacturer}
                  onChange={(e) => setEditedAsset((prev) => ({ ...prev, manufacturer: e.target.value }))}
                  className="mt-1"
                />
              ) : (
                <p className="font-medium">{asset.manufacturer || "—"}</p>
              )}
            </div>
            <div>
              <Label className="text-muted-foreground">{t("assets.labels.model")}</Label>
              {isEditing ? (
                <Input
                  value={editedAsset.model}
                  onChange={(e) => setEditedAsset((prev) => ({ ...prev, model: e.target.value }))}
                  className="mt-1"
                />
              ) : (
                <p className="font-medium">{asset.model || "—"}</p>
              )}
            </div>
            <div>
              <Label className="text-muted-foreground">{t("assets.labels.purchaseDate")}</Label>
              {isEditing ? (
                <Input
                  type="date"
                  value={editedAsset.purchase_date}
                  onChange={(e) => setEditedAsset((prev) => ({ ...prev, purchase_date: e.target.value }))}
                  className="mt-1"
                />
              ) : (
                <p className="font-medium">
                  {asset.purchase_date ? formatDate(asset.purchase_date) : "—"}
                </p>
              )}
            </div>
            <div>
              <Label className="text-muted-foreground">{t("assets.labels.warrantyExpiry")}</Label>
              {isEditing ? (
                <Input
                  type="date"
                  value={editedAsset.warranty_expiry}
                  onChange={(e) => setEditedAsset((prev) => ({ ...prev, warranty_expiry: e.target.value }))}
                  className="mt-1"
                />
              ) : (
                <p className="font-medium">
                  {asset.warranty_expiry ? formatDate(asset.warranty_expiry) : "—"}
                </p>
              )}
            </div>
            <div>
              <Label className="text-muted-foreground">{t("assets.labels.location")}</Label>
              {isEditing ? (
                <select
                  value={editedAsset.location_id}
                  onChange={(e) => setEditedAsset((prev) => ({ ...prev, location_id: e.target.value }))}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">{t("common.none")}, {t("assets.labels.notAssigned")}</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} ({loc.type})
                    </option>
                  ))}
                </select>
              ) : assetLocation ? (
                <div className="flex items-center gap-2 mt-0.5">
                  <Link
                    href={`/${company}/dashboard/locations?selected=${assetLocation.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {assetLocation.name}
                  </Link>
                  <span className="text-xs text-muted-foreground capitalize">{assetLocation.type}</span>
                  {assetsAtSameLocation > 0 && (
                    <span className="text-xs text-muted-foreground">+{assetsAtSameLocation} other asset{assetsAtSameLocation > 1 ? "s" : ""}</span>
                  )}
                </div>
              ) : (
                <p className="font-medium text-muted-foreground">{t("assets.labels.notAssigned")}</p>
              )}
            </div>
            <div>
              <Label className="text-muted-foreground">{t("assets.labels.qrCode")}</Label>
              <p className="font-medium font-mono">{asset.qr_code || "—"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Related Incidents */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("assets.sections.relatedIncidents")}</CardTitle>
        </CardHeader>
        <CardContent>
          {assetIncidents.length === 0 ? (
            <p className="text-center py-4 text-muted-foreground">No incidents linked to this asset</p>
          ) : (
            <div className="space-y-2">
              {(showAllIncidents ? assetIncidents : assetIncidents.slice(0, 5)).map((incident) => (
                <Link
                  key={incident.id}
                  href={`/${company}/dashboard/incidents/${incident.id}`}
                  className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <AlertTriangle className={`h-4 w-4 ${
                      incident.severity === "critical" ? "text-destructive" :
                      incident.severity === "high" ? "text-destructive" :
                      incident.severity === "medium" ? "text-warning" :
                      "text-muted-foreground"
                    }`} />
                    <div>
                      <p className="font-medium">{incident.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(incident.incident_date)} • {incident.reference_number}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getSeverityVariant(incident.severity)} className="capitalize">
                      {incident.severity}
                    </Badge>
                    <Badge variant="secondary" className="capitalize">{incident.status}</Badge>
                  </div>
                </Link>
              ))}
              {assetIncidents.length > 5 && (
                <Button
                  variant="ghost"
                  className="w-full mt-2"
                  onClick={() => setShowAllIncidents(!showAllIncidents)}
                >
                  {showAllIncidents
                    ? (t("assets.showLess") || "Show less")
                    : (t("assets.showAllIncidents", { count: String(assetIncidents.length) }) || `Show all ${assetIncidents.length} incidents`)}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
