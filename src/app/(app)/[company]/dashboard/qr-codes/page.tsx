"use client";

import * as React from "react";
import { useCompanyParam } from "@/hooks/use-company-param";
import {
  QrCode,
  Plus,
  Download,
  Printer,
  MapPin,
  Search,
  Copy,
  Eye,
  X,
  Wrench,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KPICard } from "@/components/ui/kpi-card";
import { useLocationsStore } from "@/stores/locations-store";
import { useAssetsStore } from "@/stores/assets-store";
import { loadFromStorage, saveToStorage } from "@/lib/local-storage";
import { useToast } from "@/components/ui/toast";
import { useTranslation } from "@/i18n";
import QRCode from "qrcode";

type QRCodeItem = {
  id: string;
  name: string;
  location: string;
  scans: number;
  created_at: string;
  description?: string | null;
  asset_id?: string | null;
  asset_name?: string | null;
};

const STORAGE_KEY = "harmoniq_qr_codes";

const initialQRCodes: QRCodeItem[] = [
  { id: "qr-1", name: "Main Entrance", location: "Building A", scans: 156, created_at: "2024-01-15" },
  { id: "qr-2", name: "Warehouse Floor", location: "Warehouse A", scans: 89, created_at: "2024-01-18" },
  { id: "qr-3", name: "Production Line 1", location: "Production", scans: 234, created_at: "2024-01-20" },
  { id: "qr-4", name: "Cafeteria Exit", location: "Cafeteria", scans: 45, created_at: "2024-01-22" },
  { id: "qr-5", name: "Parking Lot B", location: "Parking", scans: 67, created_at: "2024-01-25" },
];

export default function QRCodesPage() {
  const { t, formatDate, formatNumber } = useTranslation();
  const company = useCompanyParam();
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const { items: locations } = useLocationsStore();
  const { items: allAssets , isLoading } = useAssetsStore();
  const { toast } = useToast();
  const [qrCodes, setQrCodes] = React.useState<QRCodeItem[]>(() =>
    loadFromStorage(STORAGE_KEY, initialQRCodes)
  );
  const [formData, setFormData] = React.useState({
    name: "",
    locationId: "",
    description: "",
    assetId: "",
  });

  React.useEffect(() => {
    saveToStorage(STORAGE_KEY, qrCodes);
  }, [qrCodes]);

  const filteredCodes = qrCodes.filter((code) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      code.name.toLowerCase().includes(query) ||
      code.location.toLowerCase().includes(query)
    );
  });

  const totalScans = qrCodes.reduce((acc, qr) => acc + qr.scans, 0);
  const linkedLocations = new Set(qrCodes.map((qr) => qr.location)).size;

  const handleCreateQrCode = () => {
    if (!formData.name.trim() || !formData.locationId) return;
    const locationName = locations.find((loc) => loc.id === formData.locationId)?.name || "Unassigned";
    const linkedAsset = formData.assetId ? allAssets.find(a => a.id === formData.assetId) : null;
    const newCode: QRCodeItem = {
      id: `qr_${Date.now()}`,
      name: formData.name.trim(),
      location: locationName,
      scans: 0,
      created_at: new Date().toISOString(),
      description: formData.description.trim() || null,
      asset_id: linkedAsset?.id || null,
      asset_name: linkedAsset?.name || null,
    };
    setQrCodes((prev) => [newCode, ...prev]);
    toast("QR code created");
    setShowCreateModal(false);
    setFormData({ name: "", locationId: "", description: "", assetId: "" });
  };

  // Generate the URL that the QR code will encode
  const getQRUrl = React.useCallback((code: QRCodeItem) => {
    const base = `${window.location.origin}/${company}/app/report?qr=${code.id}`;
    return code.asset_id ? `${base}&asset=${code.asset_id}` : base;
  }, [company]);

  // Generate QR code data URL for display
  const [qrDataUrls, setQrDataUrls] = React.useState<Record<string, string>>({});
  
  React.useEffect(() => {
    const generateQRCodes = async () => {
      const urls: Record<string, string> = {};
      for (const code of qrCodes) {
        try {
          urls[code.id] = await QRCode.toDataURL(getQRUrl(code), {
            width: 128,
            margin: 1,
            color: { dark: "#000000", light: "#FFFFFF" },
          });
        } catch {
          // Fallback to empty
        }
      }
      setQrDataUrls(urls);
    };
    generateQRCodes();
  }, [qrCodes, getQRUrl]);

  const handleDownload = async (code: QRCodeItem) => {
    try {
      const dataUrl = await QRCode.toDataURL(getQRUrl(code), {
        width: 512,
        margin: 2,
        color: { dark: "#000000", light: "#FFFFFF" },
      });
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `${code.name.replace(/\s+/g, "-").toLowerCase()}-qr.png`;
      link.click();
      toast("QR code PNG downloaded");
    } catch {
      toast("Failed to generate QR code");
    }
  };

  const handleCopyLink = (code: QRCodeItem) => {
    const url = getQRUrl(code);
    if (!navigator.clipboard?.writeText) {
      toast("Clipboard not available");
      return;
    }
    navigator.clipboard.writeText(url)
      .then(() => toast("QR link copied"))
      .catch(() => toast("Unable to copy link"));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold truncate">{t("qrCodes.title")}</h1>
        <Button size="sm" className="gap-2" onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4" />
          {t("qrCodes.createQrCode")}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <KPICard
          title={t("qrCodes.labels.totalQrCodes")}
          value={qrCodes.length}
          icon={QrCode}
        />
        <KPICard
          title={t("qrCodes.labels.totalScans")}
          value={totalScans}
          icon={Eye}
        />
        <KPICard
          title={t("qrCodes.labels.linkedLocations")}
          value={linkedLocations}
          icon={MapPin}
        />
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t("qrCodes.placeholders.searchQrCodes")}
          className="pl-10"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
        />
      </div>

      {/* QR Codes Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredCodes.length === 0 ? (
          <Card className="md:col-span-2 lg:col-span-3">
            <CardContent className="py-10 text-center text-muted-foreground">
              No QR codes match your search.
            </CardContent>
          </Card>
        ) : (
          filteredCodes.map((qr) => (
            <Card key={qr.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-16 w-16 items-center justify-center rounded-lg border bg-white overflow-hidden">
                      {qrDataUrls[qr.id] ? (
                        <img 
                          src={qrDataUrls[qr.id]} 
                          alt={`QR code for ${qr.name}`} 
                          className="h-14 w-14"
                        />
                      ) : (
                        <QrCode className="h-10 w-10 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-base">{qr.name}</CardTitle>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {qr.location}
                      </div>
                      {qr.asset_name && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Wrench className="h-3 w-3" />
                          {qr.asset_name}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{qr.scans} scans</span>
                  <span className="text-muted-foreground">
                    Created {formatDate(qr.created_at)}
                  </span>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1"
                    onClick={() => handleDownload(qr)}
                  >
                    <Download className="h-3 w-3" />
                    {t("qrCodes.buttons.download")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1"
                    onClick={() => {
                      window.print();
                      toast("Print dialog opened");
                    }}
                  >
                    <Printer className="h-3 w-3" />
                    {t("qrCodes.buttons.print")}
                  </Button>
                  <Button variant="ghost" size="icon" className="shrink-0" onClick={() => handleCopyLink(qr)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* How it works */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">How QR Codes Work</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                1
              </div>
              <div>
                <p className="font-medium">{t("qrCodes.steps.generate")}</p>
                <p className="text-sm text-muted-foreground">
                  Create a QR code linked to a specific location
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                2
              </div>
              <div>
                <p className="font-medium">{t("qrCodes.steps.place")}</p>
                <p className="text-sm text-muted-foreground">
                  Print and display the QR code at the location
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                3
              </div>
              <div>
                <p className="font-medium">{t("qrCodes.steps.scanAndReport")}</p>
                <p className="text-sm text-muted-foreground">
                  Employees scan to report incidents with pre-filled location
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create QR Code Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-background shadow-lg">
            <div className="flex items-center justify-between border-b p-4">
              <h2 className="text-lg font-semibold">{t("qrCodes.createQrCode")}</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowCreateModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-4 p-4">
              <div>
                <Label htmlFor="qr-name">{t("qrCodes.labels.name")}</Label>
                <Input
                  id="qr-name"
                  placeholder="e.g., Main Entrance"
                  className="mt-1"
                  value={formData.name}
                  onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="qr-location">{t("qrCodes.labels.linkToLocation")}</Label>
                <select
                  id="qr-location"
                  title="Select location"
                  aria-label="Select location"
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.locationId}
                  onChange={(event) => setFormData((prev) => ({ ...prev, locationId: event.target.value }))}
                >
                  <option value="">Select a location...</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="qr-desc">{t("qrCodes.labels.description")}</Label>
                <Input
                  id="qr-desc"
                  placeholder="Short description for this QR code"
                  className="mt-1"
                  value={formData.description}
                  onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="qr-asset">{t("qrCodes.labels.linkToAsset")}</Label>
                <select
                  id="qr-asset"
                  title="Select asset"
                  aria-label="Select asset"
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.assetId}
                  onChange={(event) => setFormData((prev) => ({ ...prev, assetId: event.target.value }))}
                >
                  <option value="">No asset linked</option>
                  {allAssets.filter(a => a.status !== "retired").map((asset) => (
                    <option key={asset.id} value={asset.id}>{asset.name} ({asset.asset_tag})</option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground mt-1">Scanning will open this asset&apos;s inspection</p>
              </div>
              <div className="flex justify-center py-4">
                <div className="flex h-32 w-32 items-center justify-center rounded-lg border-2 border-dashed bg-muted">
                  <QrCode className="h-16 w-16 text-muted-foreground" />
                </div>
              </div>
              <p className="text-center text-sm text-muted-foreground">
                QR code preview will appear after creating
              </p>
            </div>
            <div className="flex justify-end gap-2 border-t p-4">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>{t("qrCodes.buttons.cancel")}</Button>
              <Button
                className="gap-2"
                onClick={handleCreateQrCode}
                disabled={!formData.name.trim() || !formData.locationId}
              >
                <Plus className="h-4 w-4" /> {t("qrCodes.createQrCode")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
