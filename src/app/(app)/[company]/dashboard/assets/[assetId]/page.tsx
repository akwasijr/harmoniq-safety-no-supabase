"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Trash2,
  Wrench,
  Calendar,
  FileText,
  CheckCircle,
  AlertTriangle,
  Edit,
  Clock,
  Info,
  Image,
  File,
  Award,
  BarChart3,
  Upload,
  Eye,
  Plus,
  Settings,
  X,
  Power,
  TrendingDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DetailTabs, Tab } from "@/components/ui/detail-tabs";
import { mockMaintenanceSchedules, mockDowntimeLogs, DEFAULT_USER_ID } from "@/mocks/data";
import { useAssetsStore } from "@/stores/assets-store";
import { useUsersStore } from "@/stores/users-store";
import { useTeamsStore } from "@/stores/teams-store";
import { useAssetInspectionsStore } from "@/stores/inspections-store";
import { useIncidentsStore } from "@/stores/incidents-store";
import { useLocationsStore } from "@/stores/locations-store";
import { useMeterReadingsStore } from "@/stores/meter-readings-store";
import { useWorkOrdersStore } from "@/stores/work-orders-store";
import { useToast } from "@/components/ui/toast";
import { useTranslation } from "@/i18n";
import { capitalize } from "@/lib/utils";
import { loadFromStorage, saveToStorage } from "@/lib/local-storage";
import Link from "next/link";
import type { MaintenanceSchedule, AssetCategory, AssetStatus, MeterUnit } from "@/types";

const ASSET_CATEGORIES: AssetCategory[] = [
  "machinery",
  "vehicle",
  "safety_equipment",
  "tool",
  "electrical",
  "hvac",
  "plumbing",
  "fire_safety",
  "lifting_equipment",
  "pressure_vessel",
  "ppe",
  "other",
];

const ASSET_STATUSES: AssetStatus[] = ["active", "maintenance", "inactive", "retired"];

const formatCategoryLabel = (value: string) =>
  value.split("_").map((word) => capitalize(word)).join(" ");

export default function AssetDetailPage() {
  const router = useRouter();
  const routeParams = useParams();
  const company = routeParams.company as string;
  const assetId = routeParams.assetId as string;
  const [isEditing, setIsEditing] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<string>("info");
  const [maintenanceSubTab, setMaintenanceSubTab] = React.useState<"schedules" | "history">("schedules");
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const { toast } = useToast();
  const { t, formatDate } = useTranslation();
  const { items: assets, update: updateAsset, remove: removeAsset } = useAssetsStore();
  const { items: users } = useUsersStore();
  const { items: teams } = useTeamsStore();
  const { items: inspections } = useAssetInspectionsStore();
  const { items: incidents } = useIncidentsStore();
  const { items: locations } = useLocationsStore();
  const { items: workOrders } = useWorkOrdersStore();
  const asset = assets.find((a) => a.id === assetId);

  // Computed data from stores
  const assetInspections = inspections.filter((i) => i.asset_id === assetId);
  const assetIncidents = incidents.filter((i) => i.asset_id === assetId);
  const assetLocation = asset?.location_id ? locations.find((l) => l.id === asset.location_id) : null;
  const assetsAtSameLocation = asset?.location_id
    ? assets.filter((a) => a.location_id === asset.location_id && a.id !== assetId).length
    : 0;

  // Stats computed values
  const totalInspections = assetInspections.length;
  const passRate = totalInspections > 0
    ? Math.round((assetInspections.filter((i) => i.result === "pass").length / totalInspections) * 100)
    : 0;
  const lastInspectedDays = (() => {
    if (!mounted || assetInspections.length === 0) return null;
    const sorted = [...assetInspections].sort((a, b) => new Date(b.inspected_at).getTime() - new Date(a.inspected_at).getTime());
    const diff = Date.now() - new Date(sorted[0].inspected_at).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  })();

  // Meter readings
  const { items: allMeterReadings, add: addMeterReading } = useMeterReadingsStore();
  const assetMeterReadings = allMeterReadings.filter((r) => r.asset_id === assetId);
  const [showAddReading, setShowAddReading] = React.useState(false);
  const [readingForm, setReadingForm] = React.useState({ meter_type: "", unit: "hours" as MeterUnit, value: "", notes: "" });

  // Timeline filter state
  const [timelineFilter, setTimelineFilter] = React.useState<string>("all");
  const [docsSubTab, setDocsSubTab] = React.useState<"certifications" | "documents" | "images">("certifications");

  // Document upload
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const imageInputRef = React.useRef<HTMLInputElement>(null);

  const [storedDocuments, setStoredDocuments] = React.useState(() =>
    loadFromStorage<Array<{ id: string; name: string; type: string; size: string; uploaded: string; dataUrl?: string }>>(
      `harmoniq_asset_docs_${assetId}`,
      [
        { id: "d1", name: "User Manual.pdf", type: "document", size: "2.4 MB", uploaded: "2024-01-15" },
        { id: "d2", name: "Safety Certificate.pdf", type: "certificate", size: "156 KB", uploaded: "2024-01-10" },
        { id: "d3", name: "Calibration Report.pdf", type: "document", size: "89 KB", uploaded: "2024-01-05" },
      ]
    )
  );

  const [storedImages, setStoredImages] = React.useState(() =>
    loadFromStorage<Array<{ id: string; name: string; uploaded: string; dataUrl?: string }>>(
      `harmoniq_asset_images_${assetId}`,
      [
        { id: "img1", name: "Asset Photo 1.jpg", uploaded: "2024-01-15" },
        { id: "img2", name: "Serial Number.jpg", uploaded: "2024-01-15" },
        { id: "img3", name: "Installation.jpg", uploaded: "2024-01-10" },
      ]
    )
  );

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, kind: "document" | "image") => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const sizeKb = file.size / 1024;
      const sizeStr = sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${Math.round(sizeKb)} KB`;
      const now = new Date().toISOString().split("T")[0];
      if (kind === "document") {
        const doc = { id: `d-${Date.now()}`, name: file.name, type: "document", size: sizeStr, uploaded: now, dataUrl };
        const next = [...storedDocuments, doc];
        setStoredDocuments(next);
        saveToStorage(`harmoniq_asset_docs_${assetId}`, next);
      } else {
        const img = { id: `img-${Date.now()}`, name: file.name, uploaded: now, dataUrl };
        const next = [...storedImages, img];
        setStoredImages(next);
        saveToStorage(`harmoniq_asset_images_${assetId}`, next);
      }
      toast(`${file.name} uploaded`);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const [editedAsset, setEditedAsset] = React.useState({
    name: asset?.name || "",
    category: asset?.category || "machinery",
    status: asset?.status || "active",
    manufacturer: asset?.manufacturer || "",
    model: asset?.model || "",
    purchase_date: asset?.purchase_date || "",
  });

  React.useEffect(() => {
    if (!asset) return;
    setEditedAsset({
      name: asset.name,
      category: asset.category,
      status: asset.status,
      manufacturer: asset.manufacturer || "",
      model: asset.model || "",
      purchase_date: asset.purchase_date || "",
    });
  }, [asset?.id]);

  // Mock inspection history
  const inspectionHistory = [
    { id: "i1", date: "2024-01-28", result: "pass", inspector: "John Doe", notes: "All checks passed" },
    { id: "i2", date: "2024-01-21", result: "pass", inspector: "Jane Smith", notes: "Minor wear noted" },
    { id: "i3", date: "2024-01-14", result: "fail", inspector: "John Doe", notes: "Safety guard damaged" },
    { id: "i4", date: "2024-01-07", result: "pass", inspector: "Mike Johnson", notes: "Routine inspection" },
  ];

  // Mock documents & images
  const documents = [
    { id: "d1", name: "User Manual.pdf", type: "document", size: "2.4 MB", uploaded: "2024-01-15" },
    { id: "d2", name: "Safety Certificate.pdf", type: "certificate", size: "156 KB", uploaded: "2024-01-10" },
    { id: "d3", name: "Calibration Report.pdf", type: "document", size: "89 KB", uploaded: "2024-01-05" },
  ];

  const images = [
    { id: "img1", name: "Asset Photo 1.jpg", uploaded: "2024-01-15" },
    { id: "img2", name: "Serial Number.jpg", uploaded: "2024-01-15" },
    { id: "img3", name: "Installation.jpg", uploaded: "2024-01-10" },
  ];

  const certifications = [
    { id: "c1", name: "Safety Certificate", status: "valid", expiry: "2025-06-15" },
    { id: "c2", name: "Calibration", status: "expiring", expiry: "2024-02-28" },
    { id: "c3", name: "ISO Compliance", status: "valid", expiry: "2025-12-31" },
  ];

  // Get maintenance schedules for this asset
  const [schedules, setSchedules] = React.useState<MaintenanceSchedule[]>(() => 
    mockMaintenanceSchedules.filter(s => s.asset_id === assetId)
  );
  const [showAddSchedule, setShowAddSchedule] = React.useState(false);
  const [showCompleteModal, setShowCompleteModal] = React.useState<string | null>(null);
  
  // Update schedules when assetId changes
  React.useEffect(() => {
    setSchedules(mockMaintenanceSchedules.filter(s => s.asset_id === assetId));
  }, [assetId]);

  // Get completed work orders for this asset as maintenance history
  const maintenanceLogs = React.useMemo(() => {
    return workOrders
      .filter(wo => wo.asset_id === assetId && wo.status === "completed")
      .map(wo => {
        const technician = users.find(u => u.id === wo.assigned_to);
        return {
          id: wo.id,
          asset_id: wo.asset_id || "",
          completed_date: wo.completed_at || wo.updated_at,
          type: "work_order" as const,
          description: wo.title,
          notes: wo.description,
          technician_id: wo.assigned_to || "",
          technician_name: technician?.full_name || "Unassigned",
          hours_spent: wo.actual_hours || 0,
          parts_used: [], // Could extend WorkOrder type for parts
        };
      })
      .sort((a, b) => new Date(b.completed_date).getTime() - new Date(a.completed_date).getTime());
  }, [workOrders, assetId, users]);

  // Get downtime logs for this asset
  const downtimeLogs = mockDowntimeLogs.filter(l => l.asset_id === assetId);
  const [showLogDowntime, setShowLogDowntime] = React.useState(false);
  
  // Calculate downtime stats
  const totalDowntimeHours = downtimeLogs
    .filter(l => l.duration_hours !== null)
    .reduce((sum, l) => sum + (l.duration_hours || 0), 0);
  const activeDowntime = downtimeLogs.find(l => l.end_date === null);
  const downtimeCount = downtimeLogs.length;

  // Helper to get assignee name
  const getAssigneeName = (schedule: MaintenanceSchedule) => {
    if (schedule.assigned_to_user_id) {
      const user = users.find(u => u.id === schedule.assigned_to_user_id);
      return user ? `${user.first_name} ${user.last_name}` : "Unknown";
    }
    if (schedule.assigned_to_team_id) {
      const team = teams.find(t => t.id === schedule.assigned_to_team_id);
      return team ? team.name : "Unknown Team";
    }
    return "Unassigned";
  };

  // Helper to check if schedule is overdue
  const isOverdue = (nextDue: string) => new Date(nextDue) < new Date();
  const isDueSoon = (nextDue: string, daysBefore: number) => {
    const dueDate = new Date(nextDue);
    const warningDate = new Date();
    warningDate.setDate(warningDate.getDate() + daysBefore);
    return dueDate <= warningDate && dueDate >= new Date();
  };

  const maintenanceCompliance = schedules.length > 0
    ? Math.round((schedules.filter((s) => !s.is_active || !isOverdue(s.next_due_date)).length / schedules.length) * 100)
    : 100;

  // Health Score (0–100) — computed from inspections, maintenance, age, condition
  const healthScore = React.useMemo(() => {
    if (!asset) return 0;
    let score = 100;
    if (totalInspections > 0) {
      const failRate = 1 - passRate / 100;
      score -= failRate * 30;
    }
    const overdueSchedules = schedules.filter(s => s.is_active && isOverdue(s.next_due_date)).length;
    const activeSchedules = schedules.filter(s => s.is_active).length;
    if (activeSchedules > 0) {
      score -= (overdueSchedules / activeSchedules) * 25;
    }
    const conditionPenalty: Record<string, number> = { excellent: 0, good: 5, fair: 15, poor: 30, critical: 50 };
    score -= conditionPenalty[asset.condition] || 0;
    if (totalDowntimeHours > 100) score -= 15;
    else if (totalDowntimeHours > 40) score -= 10;
    else if (totalDowntimeHours > 10) score -= 5;
    if (asset.purchase_date) {
      const ageYears = (Date.now() - new Date(asset.purchase_date).getTime()) / (365.25 * 86400000);
      const expectedLife = asset.expected_life_years || 10;
      if (ageYears > expectedLife) score -= 20;
      else if (ageYears > expectedLife * 0.8) score -= 10;
    }
    return Math.max(0, Math.min(100, Math.round(score)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asset, totalInspections, passRate, schedules, totalDowntimeHours]);

  // Handle marking schedule as complete
  const handleCompleteSchedule = (scheduleId: string, notes: string) => {
    setSchedules(prev => prev.map(s => {
      if (s.id === scheduleId) {
        const today = new Date();
        const nextDue = new Date();
        // Calculate next due date based on frequency
        switch (s.frequency_unit) {
          case "days":
            nextDue.setDate(today.getDate() + s.frequency_value);
            break;
          case "weeks":
            nextDue.setDate(today.getDate() + (s.frequency_value * 7));
            break;
          case "months":
            nextDue.setMonth(today.getMonth() + s.frequency_value);
            break;
          case "years":
            nextDue.setFullYear(today.getFullYear() + s.frequency_value);
            break;
        }
        return {
          ...s,
          last_completed_date: today.toISOString().split('T')[0],
          next_due_date: nextDue.toISOString().split('T')[0],
          updated_at: today.toISOString(),
        };
      }
      return s;
    }));
    setShowCompleteModal(null);
  };

  const tabs: Tab[] = [
    { id: "info", label: t("assets.detailTabs.overview"), icon: Info },
    { id: "timeline", label: t("assets.detailTabs.timeline"), icon: Clock },
    { id: "maintenance", label: t("assets.detailTabs.maintenance"), icon: Settings },
    { id: "readings", label: t("assets.detailTabs.readings"), icon: BarChart3 },
    { id: "downtime", label: t("assets.detailTabs.downtime"), icon: Power },
    { id: "inspections", label: t("assets.detailTabs.inspections"), icon: Wrench },
    { id: "documents", label: t("assets.detailTabs.documentsMedia"), icon: FileText },
    { id: "settings", label: t("assets.detailTabs.settings"), icon: Trash2, variant: "danger" },
  ];

  if (!asset) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Asset not found</p>
      </div>
    );
  }


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">{asset.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-muted-foreground capitalize">{asset.status}</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground font-mono text-sm">{asset.serial_number}</span>
          </div>
        </div>
        <div className="flex gap-2">
          {activeTab === "info" && (
            <>
              <Button variant="outline" onClick={() => setIsEditing(!isEditing)} className="gap-2">
                <Edit className="h-4 w-4" />
                {isEditing ? "Cancel" : "Edit"}
              </Button>
              {isEditing && (
                <Button
                  className="gap-2"
                  onClick={() => {
                    if (!asset) return;
                    updateAsset(asset.id, {
                      name: editedAsset.name,
                      category: editedAsset.category as typeof asset.category,
                      status: editedAsset.status as typeof asset.status,
                      manufacturer: editedAsset.manufacturer || null,
                      model: editedAsset.model || null,
                      purchase_date: editedAsset.purchase_date || null,
                      updated_at: new Date().toISOString(),
                    });
                    toast("Asset updated");
                    setIsEditing(false);
                  }}
                >
                  <Save className="h-4 w-4" />
                  Save
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <DetailTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Tab Content */}
      <div className="space-y-6">
        {/* Information Tab */}
        {activeTab === "info" && (
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
                  <Label className="text-muted-foreground">{t("assets.labels.location")}</Label>
                  {assetLocation ? (
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
                    <p className="font-medium text-muted-foreground">Not assigned</p>
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
                  {assetIncidents.map((incident) => (
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
                        <Badge variant={
                          incident.severity === "critical" ? "destructive" :
                          incident.severity === "high" ? "destructive" :
                          incident.severity === "medium" ? "warning" :
                          "secondary"
                        } className="capitalize">
                          {incident.severity}
                        </Badge>
                        <Badge variant="secondary" className="capitalize">{incident.status}</Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

            {/* Statistics */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-6">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-border">
                    <span className="text-3xl font-bold">{healthScore}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-lg">{t("assets.sections.healthScore")}</p>
                    <p className="text-sm text-muted-foreground">
                      {healthScore >= 80 ? "Good condition — continue regular maintenance" : healthScore >= 50 ? "Fair condition — attention needed" : "Poor condition — immediate action required"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Inspections</p>
                    <p className="text-3xl font-semibold">{totalInspections}</p>
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
                    <p className="text-3xl font-semibold">{assetIncidents.length}</p>
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
                  </div>
                  <Clock className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            </div>
          </div>
        )}
        {activeTab === "timeline" && (() => {
          type TimelineEvent = {
            date: string;
            type: string;
            icon: typeof CheckCircle;
            color: string;
            title: string;
            description: string;
          };
          const events: TimelineEvent[] = [];

          // Inspections
          assetInspections.forEach((insp) => {
            events.push({
              date: insp.inspected_at,
              type: "inspections",
              icon: insp.result === "pass" ? CheckCircle : AlertTriangle,
              color: insp.result === "pass" ? "text-success" : "text-destructive",
              title: insp.result === "pass" ? "Inspection Passed" : "Inspection Failed",
              description: insp.notes || "No notes",
            });
          });

          // Maintenance logs (from completed work orders)
          maintenanceLogs.forEach((log) => {
            events.push({
              date: log.completed_date,
              type: "maintenance",
              icon: Wrench,
              color: "text-blue-500",
              title: "Maintenance Completed",
              description: log.description || log.notes || "Maintenance work",
            });
          });

          // Downtime logs
          downtimeLogs.forEach((log) => {
            if (log.end_date === null) {
              events.push({
                date: log.start_date,
                type: "downtime",
                icon: Power,
                color: "text-destructive",
                title: "Downtime Started",
                description: log.reason,
              });
            } else {
              events.push({
                date: log.end_date,
                type: "downtime",
                icon: Power,
                color: "text-success",
                title: `Downtime Resolved - ${log.duration_hours?.toFixed(1) || "?"}h`,
                description: log.reason,
              });
            }
          });

          // Incidents
          assetIncidents.forEach((inc) => {
            events.push({
              date: inc.incident_date,
              type: "incidents",
              icon: AlertTriangle,
              color: "text-warning",
              title: inc.title,
              description: `${capitalize(inc.severity)} severity • ${inc.reference_number}`,
            });
          });

          const filtered = timelineFilter === "all" ? events : events.filter((e) => e.type === timelineFilter);
          const sorted = [...filtered].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

          // Group by day
          const grouped: Record<string, TimelineEvent[]> = {};
          sorted.forEach((ev) => {
            const day = new Date(ev.date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
            if (!grouped[day]) grouped[day] = [];
            grouped[day].push(ev);
          });

          const filters = [
            { id: "all", label: "All" },
            { id: "inspections", label: "Inspections" },
            { id: "maintenance", label: "Maintenance" },
            { id: "downtime", label: "Downtime" },
            { id: "incidents", label: "Incidents" },
          ];

          return (
            <div className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                {filters.map((f) => (
                  <Button
                    key={f.id}
                    size="sm"
                    variant={timelineFilter === f.id ? "default" : "outline"}
                    onClick={() => setTimelineFilter(f.id)}
                  >
                    {f.label}
                  </Button>
                ))}
              </div>

              {sorted.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-8 text-muted-foreground">
                      <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No activity recorded</p>
                      <p className="text-sm">Events will appear here as they occur</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="pt-6">
                    {Object.entries(grouped).map(([day, dayEvents]) => (
                      <div key={day} className="mb-6 last:mb-0">
                        <p className="text-sm font-medium text-muted-foreground mb-3">{day}</p>
                        <div className="relative ml-3 border-l-2 border-border pl-6 space-y-4">
                          {dayEvents.map((ev, idx) => {
                            const Icon = ev.icon;
                            return (
                              <div key={idx} className="relative">
                                <div className={`absolute -left-[31px] flex h-5 w-5 items-center justify-center rounded-full bg-background border-2 border-current ${ev.color}`}>
                                  <Icon className="h-3 w-3" />
                                </div>
                                <div>
                                  <p className="font-medium text-sm">{ev.title}</p>
                                  <p className="text-xs text-muted-foreground">{ev.description}</p>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {new Date(ev.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          );
        })()}

        {/* Maintenance Tab */}
        {activeTab === "maintenance" && (
          <div className="space-y-4">
            {/* Sub-tab toggles */}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={maintenanceSubTab === "schedules" ? "default" : "outline"}
                onClick={() => setMaintenanceSubTab("schedules")}
              >
                {t("assets.schedules")}
              </Button>
              <Button
                size="sm"
                variant={maintenanceSubTab === "history" ? "default" : "outline"}
                onClick={() => setMaintenanceSubTab("history")}
              >
                {t("assets.history")}
              </Button>
            </div>

            {/* Maintenance Schedules */}
            {maintenanceSubTab === "schedules" && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">{t("assets.sections.preventiveMaintenanceSchedules")}</CardTitle>
                <Button size="sm" className="gap-1" onClick={() => setShowAddSchedule(true)}>
                  <Plus className="h-4 w-4" />
                  {t("assets.buttons.addSchedule")}
                </Button>
              </CardHeader>
              <CardContent>
                {schedules.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Settings className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>{t("assets.empty.noMaintenanceSchedules")}</p>
                    <p className="text-sm">Add a schedule to track preventive maintenance</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {schedules.map((schedule) => {
                      const overdue = isOverdue(schedule.next_due_date);
                      const dueSoon = isDueSoon(schedule.next_due_date, schedule.notify_days_before);
                      return (
                        <div
                          key={schedule.id}
                          className="flex items-center justify-between p-4 rounded-lg border"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{schedule.name}</h4>
                              <span className="text-sm text-muted-foreground capitalize">{schedule.priority}</span>
                              {overdue && <span className="text-sm text-destructive">{t("assets.overdue")}</span>}
                              {dueSoon && !overdue && <span className="text-sm text-warning">{t("assets.dueSoon")}</span>}
                            </div>
                            {schedule.description && (
                              <p className="text-sm text-muted-foreground mt-1">{schedule.description}</p>
                            )}
                            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" />
                                Every {schedule.frequency_value} {schedule.frequency_unit}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" />
                                Next: {formatDate(schedule.next_due_date)}
                              </span>
                              <span>Assigned: {getAssigneeName(schedule)}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="gap-1"
                              onClick={() => setShowCompleteModal(schedule.id)}
                            >
                              <CheckCircle className="h-4 w-4" />
                              {t("assets.buttons.complete")}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
            )}

            {/* Recent Maintenance History */}
            {maintenanceSubTab === "history" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("assets.sections.recentMaintenanceHistory")}</CardTitle>
              </CardHeader>
              <CardContent>
                {maintenanceLogs.length === 0 ? (
                  <p className="text-center py-4 text-muted-foreground">No maintenance history yet</p>
                ) : (
                  <div className="space-y-3">
                    {maintenanceLogs.slice(0, 5).map((log) => {
                      return (
                        <div key={log.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                          <div>
                            <p className="font-medium">{log.description}</p>
                            <p className="text-sm text-muted-foreground">
                              Completed by {log.technician_name} on {formatDate(log.completed_date)}
                              {log.hours_spent ? ` • ${log.hours_spent}h labor` : ""}
                            </p>
                            {log.notes && <p className="text-sm mt-1">{log.notes}</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
            )}
          </div>
        )}

        {/* Complete Maintenance Modal */}
        {showCompleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <Card className="w-full max-w-md mx-4">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Complete Maintenance</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setShowCompleteModal(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Mark "{schedules.find(s => s.id === showCompleteModal)?.name}" as complete?
                </p>
                <div>
                  <Label>Notes (optional)</Label>
                  <Input id="complete-notes" placeholder="Add any notes about the work done..." className="mt-1" />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setShowCompleteModal(null)}>Cancel</Button>
                  <Button onClick={() => {
                    const notes = (document.getElementById('complete-notes') as HTMLInputElement)?.value || '';
                    handleCompleteSchedule(showCompleteModal, notes);
                  }}>
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Mark Complete
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Meter Readings Tab */}
        {activeTab === "readings" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-medium">Meter Readings</h3>
              <Button size="sm" className="gap-1" onClick={() => setShowAddReading(true)}>
                <Plus className="h-4 w-4" />
                {t("assets.buttons.recordReading")}
              </Button>
            </div>

            {assetMeterReadings.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>{t("assets.empty.noReadings")}</p>
                  <p className="text-sm">Track hours, miles, cycles, and other metrics for condition-based maintenance</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    {[...assetMeterReadings].sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()).map((reading) => {
                      const recorder = users.find(u => u.id === reading.recorded_by);
                      return (
                        <div key={reading.id} className="flex items-center justify-between p-3 rounded-lg border">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{reading.meter_type}</p>
                              <span className="text-sm text-muted-foreground">{reading.value} {reading.unit}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDate(reading.recorded_at)} • By {recorder ? `${recorder.first_name} ${recorder.last_name}` : "Unknown"}
                            </p>
                            {reading.notes && <p className="text-xs text-muted-foreground">{reading.notes}</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Add Reading Modal */}
            {showAddReading && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                <Card className="w-full max-w-md">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Record Meter Reading</CardTitle>
                    <Button variant="ghost" size="icon" onClick={() => setShowAddReading(false)}><X className="h-4 w-4" /></Button>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Meter Type *</Label>
                      <Input className="mt-1" placeholder="e.g. Engine Hours, Odometer" value={readingForm.meter_type} onChange={(e) => setReadingForm(p => ({ ...p, meter_type: e.target.value }))} />
                    </div>
                    <div className="grid gap-4 grid-cols-2">
                      <div>
                        <Label>Value *</Label>
                        <Input type="number" min="0" step="0.1" className="mt-1" value={readingForm.value} onChange={(e) => setReadingForm(p => ({ ...p, value: e.target.value }))} />
                      </div>
                      <div>
                        <Label>Unit</Label>
                        <select className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={readingForm.unit} onChange={(e) => setReadingForm(p => ({ ...p, unit: e.target.value as MeterUnit }))}>
                          {(["hours", "miles", "km", "cycles", "psi", "rpm", "gallons", "liters"] as MeterUnit[]).map(u => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <Label>Notes (optional)</Label>
                      <Input className="mt-1" placeholder="Any notes" value={readingForm.notes} onChange={(e) => setReadingForm(p => ({ ...p, notes: e.target.value }))} />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" onClick={() => setShowAddReading(false)}>Cancel</Button>
                      <Button disabled={!readingForm.meter_type.trim() || !readingForm.value} onClick={() => {
                        addMeterReading({
                          id: `mr_${Date.now()}`,
                          asset_id: assetId,
                          meter_type: readingForm.meter_type.trim(),
                          unit: readingForm.unit,
                          value: parseFloat(readingForm.value),
                          recorded_by: DEFAULT_USER_ID,
                          recorded_at: new Date().toISOString(),
                          notes: readingForm.notes.trim() || null,
                          created_at: new Date().toISOString(),
                        });
                        toast("Meter reading recorded");
                        setShowAddReading(false);
                        setReadingForm({ meter_type: "", unit: "hours", value: "", notes: "" });
                      }}>
                        <Plus className="h-4 w-4 mr-1" /> Record
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}

        {/* Downtime Tab */}
        {activeTab === "downtime" && (
          <div className="space-y-4">
            {/* Downtime Summary */}
            <div className="grid gap-4 sm:grid-cols-3">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Downtime Events</p>
                      <p className="text-3xl font-semibold">{downtimeCount}</p>
                    </div>
                    <TrendingDown className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Hours Down</p>
                      <p className="text-3xl font-semibold">{totalDowntimeHours.toFixed(1)}h</p>
                    </div>
                    <Clock className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
              <Card className={activeDowntime ? "border-destructive/50 bg-destructive/5" : ""}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Current Status</p>
                      <p className={`text-xl font-semibold ${activeDowntime ? "text-destructive" : "text-success"}`}>
                        {activeDowntime ? "Currently Down" : "Operational"}
                      </p>
                    </div>
                    <Power className={`h-8 w-8 ${activeDowntime ? "text-destructive" : "text-success"}`} />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Active Downtime Alert */}
            {activeDowntime && (
              <Card className="border-destructive/50 bg-destructive/5">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-destructive">Asset Currently Down</h4>
                      <p className="text-sm mt-1">{activeDowntime.reason}</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Started: {formatDate(activeDowntime.start_date)}
                      </p>
                    </div>
                    <Button size="sm" variant="outline">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Resolve
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Downtime History */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">{t("assets.sections.downtimeHistory")}</CardTitle>
                <Button size="sm" className="gap-1" onClick={() => setShowLogDowntime(true)}>
                  <Plus className="h-4 w-4" />
                  {t("assets.buttons.logDowntime")}
                </Button>
              </CardHeader>
              <CardContent>
                {downtimeLogs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <TrendingDown className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>{t("assets.empty.noDowntime")}</p>
                    <p className="text-sm">This is great! Keep it up.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {downtimeLogs.map((log) => {
                      const reporter = users.find(u => u.id === log.reported_by_user_id);
                      const resolver = log.resolved_by_user_id ? users.find(u => u.id === log.resolved_by_user_id) : null;
                      const isOngoing = log.end_date === null;
                      
                      return (
                        <div
                          key={log.id}
                          className="p-4 rounded-lg border"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-medium">{log.reason}</h4>
                                <span className="text-sm text-muted-foreground capitalize">{log.category}</span>
                                <span className="text-sm text-muted-foreground">• {log.production_impact} impact</span>
                                {isOngoing && <span className="text-sm text-destructive">Ongoing</span>}
                              </div>
                              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3.5 w-3.5" />
                                  {formatDate(log.start_date)}
                                </span>
                                {log.duration_hours !== null && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3.5 w-3.5" />
                                    {log.duration_hours.toFixed(1)} hours
                                  </span>
                                )}
                                <span>Reported by: {reporter ? `${reporter.first_name} ${reporter.last_name}` : "Unknown"}</span>
                              </div>
                              {log.notes && (
                                <p className="text-sm mt-2 text-muted-foreground">{log.notes}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Inspections Tab */}
        {activeTab === "inspections" && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Inspection History</CardTitle>
              <Button size="sm" className="gap-1">
                <Wrench className="h-4 w-4" />
                New Inspection
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {inspectionHistory.map((inspection) => (
                  <div
                    key={inspection.id}
                    className="flex items-start gap-3 rounded-lg border p-3"
                  >
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      inspection.result === "pass" ? "bg-success/10" : "bg-destructive/10"
                    }`}>
                      {inspection.result === "pass" ? (
                        <CheckCircle className="h-4 w-4 text-success" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">
                          {inspection.result === "pass" ? "Passed" : "Failed"}
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground">{inspection.notes}</p>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(inspection.date)}
                        </span>
                        <span>By {inspection.inspector}</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Documents & Media Tab */}
        {activeTab === "documents" && (
          <div className="space-y-6">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
              onChange={(e) => handleFileUpload(e, "document")}
            />
            <input
              ref={imageInputRef}
              type="file"
              className="hidden"
              accept="image/*"
              onChange={(e) => handleFileUpload(e, "image")}
            />
            {/* Upload Button */}
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                {(["certifications", "documents", "images"] as const).map((tab) => (
                  <Button
                    key={tab}
                    size="sm"
                    variant={docsSubTab === tab ? "default" : "outline"}
                    onClick={() => setDocsSubTab(tab)}
                  >
                    {tab === "certifications" ? t("assets.sections.certifications") : tab === "documents" ? t("assets.sections.documents") : t("assets.sections.images")}
                  </Button>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="gap-2" onClick={() => imageInputRef.current?.click()}>
                  <Image className="h-4 w-4" />
                  {t("assets.buttons.uploadImage")}
                </Button>
                <Button className="gap-2" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4" />
                  {t("assets.buttons.uploadFile")}
                </Button>
              </div>
            </div>

            {/* Certifications Sub-tab */}
            {docsSubTab === "certifications" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  {t("assets.sections.certifications")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {certifications.length === 0 ? (
                  <p className="text-center py-4 text-muted-foreground">{t("assets.empty.noCertifications")}</p>
                ) : (
                <div className="space-y-2">
                  {certifications.map((cert) => (
                    <div key={cert.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div className="flex items-center gap-3">
                        <Award className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{cert.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Expires: {formatDate(cert.expiry)} • {cert.status}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                )}
              </CardContent>
            </Card>
            )}

            {/* Documents Sub-tab */}
            {docsSubTab === "documents" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <File className="h-4 w-4" />
                  {t("assets.sections.documents")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {storedDocuments.length === 0 ? (
                  <p className="text-center py-4 text-muted-foreground">{t("assets.empty.noDocuments")}</p>
                ) : (
                <div className="space-y-2">
                  {storedDocuments.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{doc.name}</p>
                          <p className="text-xs text-muted-foreground">{doc.size} • {doc.uploaded}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                )}
              </CardContent>
            </Card>
            )}

            {/* Images Sub-tab */}
            {docsSubTab === "images" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Image className="h-4 w-4" />
                  {t("assets.sections.images")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {storedImages.map((img) => (
                    <div key={img.id} className="group relative aspect-square rounded-lg border bg-muted overflow-hidden cursor-pointer">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Image className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-background/80 backdrop-blur p-2">
                        <p className="text-xs font-medium truncate">{img.name}</p>
                      </div>
                    </div>
                  ))}
                  <button
                    className="aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                    onClick={() => imageInputRef.current?.click()}
                  >
                    <Upload className="h-6 w-6" />
                    <span className="text-xs">Upload</span>
                  </button>
                </div>
              </CardContent>
            </Card>
            )}
          </div>
        )}

        {/* Settings Tab (Danger Zone) */}
        {activeTab === "settings" && (
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-base text-destructive">{t("assets.sections.dangerZone")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-medium">Mark as Retired</p>
                  <p className="text-sm text-muted-foreground">
                    Retire this asset. It will no longer appear in active lists.
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (!asset) return;
                    updateAsset(asset.id, {
                      status: "retired",
                      decommission_date: new Date().toISOString(),
                      updated_at: new Date().toISOString(),
                    });
                    toast("Asset marked as retired");
                    router.push(`/${company}/dashboard/assets`);
                  }}
                >
                  {t("assets.buttons.retireAsset")}
                </Button>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-destructive/50 p-4 bg-destructive/5">
                <div>
                  <p className="font-medium text-destructive">{t("assets.buttons.deleteAsset")}</p>
                  <p className="text-sm text-muted-foreground">
                    Permanently delete this asset and all its data. This action cannot be undone.
                  </p>
                </div>
                <Button
                  variant="destructive"
                  className="gap-2"
                  onClick={() => {
                    if (!asset) return;
                    removeAsset(asset.id);
                    toast("Asset deleted", "info");
                    router.push(`/${company}/dashboard/assets`);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
