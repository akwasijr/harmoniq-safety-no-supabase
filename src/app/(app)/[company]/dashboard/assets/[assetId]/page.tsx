"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import { LoadingPage } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";
import {
  ArrowLeft,
  Save,
  Wrench,
  FileText,
  Edit,
  Clock,
  Info,
  BarChart3,
  Settings,
  Power,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DetailTabs, Tab } from "@/components/ui/detail-tabs";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "@/i18n";
import { loadFromStorage, saveToStorage } from "@/lib/local-storage";
import { RoleGuard } from "@/components/auth/role-guard";
import { useAssetData } from "./_components/useAssetData";
import { AssetOverview } from "./_components/AssetOverview";
import { AssetAnalytics } from "./_components/AssetAnalytics";
import { AssetTimeline } from "./_components/AssetTimeline";
import { MaintenanceTab } from "./_components/MaintenanceTab";
import { MeterReadingsTab } from "./_components/MeterReadingsTab";
import { DowntimeTab } from "./_components/DowntimeTab";
import { InspectionHistory } from "./_components/InspectionHistory";
import { AssetDocuments } from "./_components/AssetDocuments";
import { AssetSettings } from "./_components/AssetSettings";
import { PreviewModal } from "./_components/PreviewModal";

export default function AssetDetailPage() {
  const router = useRouter();
  const routeParams = useParams();
  const company = routeParams.company as string;
  const assetId = routeParams.assetId as string;
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useTranslation();

  const data = useAssetData(assetId);
  const { asset, isAssetsLoading, updateAsset, removeAsset, users, teams, locations, assetLocation } = data;

  // UI state
  const [isEditing, setIsEditing] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<string>("info");
  const [showAllIncidents, setShowAllIncidents] = React.useState(false);
  const [showScoreBreakdown, setShowScoreBreakdown] = React.useState(false);
  const [timelineFilter, setTimelineFilter] = React.useState<string>("all");
  const [showLogDowntime, setShowLogDowntime] = React.useState(false);

  // Document/image state
  const [previewDoc, setPreviewDoc] = React.useState<{url: string; name: string} | null>(null);
  const [previewImage, setPreviewImage] = React.useState<{url: string; name: string} | null>(null);
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

  const getFileType = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return 'pdf';
    if (['jpg','jpeg','png','gif','webp','svg'].includes(ext || '')) return 'image';
    if (['doc','docx'].includes(ext || '')) return 'word';
    if (['xls','xlsx'].includes(ext || '')) return 'excel';
    return 'other';
  };

  React.useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setPreviewDoc(null); setPreviewImage(null); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

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

  // Edited asset form state
  const [editedAsset, setEditedAsset] = React.useState<{
    name: string; category: string; status: string; asset_type: string;
    department: string; manufacturer: string; model: string;
    purchase_date: string; warranty_expiry: string; location_id: string;
  }>({
    name: asset?.name || "",
    category: asset?.category || "machinery",
    status: asset?.status || "active",
    asset_type: asset?.asset_type || "static",
    department: asset?.department || "",
    manufacturer: asset?.manufacturer || "",
    model: asset?.model || "",
    purchase_date: asset?.purchase_date || "",
    warranty_expiry: asset?.warranty_expiry || "",
    location_id: asset?.location_id || "",
  });

  React.useEffect(() => {
    if (!asset) return;
    setEditedAsset({
      name: asset.name, category: asset.category, status: asset.status,
      asset_type: asset.asset_type || "static", department: asset.department || "",
      manufacturer: asset.manufacturer || "", model: asset.model || "",
      purchase_date: asset.purchase_date || "", warranty_expiry: asset.warranty_expiry || "",
      location_id: asset.location_id || "",
    });
  }, [asset?.id]);

  const tabs: Tab[] = [
    { id: "info", label: t("assets.detailTabs.overview"), icon: Info },
    { id: "analytics", label: t("assets.tabs.analytics") || "Analytics", icon: BarChart3 },
    { id: "timeline", label: t("assets.detailTabs.timeline"), icon: Clock },
    { id: "maintenance", label: t("assets.detailTabs.maintenance"), icon: Settings },
    { id: "readings", label: t("assets.detailTabs.readings"), icon: BarChart3 },
    { id: "downtime", label: t("assets.detailTabs.downtime"), icon: Power },
    { id: "inspections", label: t("assets.detailTabs.inspections"), icon: Wrench },
    { id: "documents", label: t("assets.detailTabs.documentsMedia"), icon: FileText },
    { id: "settings", label: t("assets.detailTabs.settings"), icon: Trash2, variant: "danger" },
  ];

  if (!asset) {
    if (isAssetsLoading) return <LoadingPage />;
    return <EmptyState title="Asset not found" description="The requested asset could not be found." />;
  }

  return (
    <RoleGuard allowedRoles={["manager", "company_admin", "super_admin"]}>
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
                    updateAsset(asset.id, {
                      name: editedAsset.name,
                      category: editedAsset.category as typeof asset.category,
                      status: editedAsset.status as typeof asset.status,
                      asset_type: editedAsset.asset_type as typeof asset.asset_type,
                      department: editedAsset.department || null,
                      manufacturer: editedAsset.manufacturer || null,
                      model: editedAsset.model || null,
                      purchase_date: editedAsset.purchase_date || null,
                      warranty_expiry: editedAsset.warranty_expiry || null,
                      location_id: editedAsset.location_id || null,
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

      <DetailTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="space-y-6">
        {activeTab === "info" && (
          <AssetOverview
            asset={asset} isEditing={isEditing} editedAsset={editedAsset}
            setEditedAsset={setEditedAsset} assetLocation={assetLocation}
            assetsAtSameLocation={data.assetsAtSameLocation}
            assetIncidents={data.assetIncidents} showAllIncidents={showAllIncidents}
            setShowAllIncidents={setShowAllIncidents} departmentOptions={data.departmentOptions}
            locations={locations} company={company}
          />
        )}

        {activeTab === "analytics" && (
          <AssetAnalytics
            healthScore={data.healthScore} healthScoreFactors={data.healthScoreFactors}
            showScoreBreakdown={showScoreBreakdown} setShowScoreBreakdown={setShowScoreBreakdown}
            totalInspections={data.totalInspections} passRate={data.passRate}
            assetIncidentsCount={data.assetIncidents.length}
            totalDowntimeHours={data.totalDowntimeHours}
            maintenanceCompliance={data.maintenanceCompliance}
            lastInspectedDays={data.lastInspectedDays}
          />
        )}

        {activeTab === "timeline" && (
          <AssetTimeline
            assetInspections={data.assetInspections} maintenanceLogs={data.maintenanceLogs}
            downtimeLogs={data.downtimeLogs} assetIncidents={data.assetIncidents}
            timelineFilter={timelineFilter} setTimelineFilter={setTimelineFilter}
          />
        )}

        {activeTab === "maintenance" && (
          <MaintenanceTab
            assetId={assetId} companyId={asset.company_id}
            schedules={data.schedules} setSchedules={data.setSchedules}
            maintenanceLogs={data.maintenanceLogs} users={users} teams={teams}
          />
        )}

        {activeTab === "readings" && (
          <MeterReadingsTab
            assetId={assetId} assetMeterReadings={data.assetMeterReadings}
            addMeterReading={data.addMeterReading} users={users}
            currentUserId={user?.id || ""}
          />
        )}

        {activeTab === "downtime" && (
          <DowntimeTab
            downtimeLogs={data.downtimeLogs} totalDowntimeHours={data.totalDowntimeHours}
            downtimeCount={data.downtimeCount} activeDowntime={data.activeDowntime}
            users={users} onLogDowntime={() => setShowLogDowntime(true)}
          />
        )}

        {activeTab === "inspections" && (
          <InspectionHistory inspectionHistory={data.inspectionHistory} />
        )}

        {activeTab === "documents" && (
          <AssetDocuments
            certifications={data.certifications} storedDocuments={storedDocuments}
            storedImages={storedImages} fileInputRef={fileInputRef}
            imageInputRef={imageInputRef} handleFileUpload={handleFileUpload}
            setPreviewDoc={setPreviewDoc} setPreviewImage={setPreviewImage}
          />
        )}

        {activeTab === "settings" && (
          <AssetSettings
            asset={asset} company={company}
            onRetire={() => {
              updateAsset(asset.id, { status: "retired", updated_at: new Date().toISOString() });
              toast("Asset marked as retired");
              router.push(`/${company}/dashboard/assets`);
            }}
            onDelete={() => {
              removeAsset(asset.id);
              toast("Asset deleted", "info");
              router.push(`/${company}/dashboard/assets`);
            }}
          />
        )}
      </div>

      <PreviewModal
        previewDoc={previewDoc} previewImage={previewImage}
        onClose={() => { setPreviewDoc(null); setPreviewImage(null); }}
        getFileType={getFileType}
      />
    </div>
    </RoleGuard>
  );
}
