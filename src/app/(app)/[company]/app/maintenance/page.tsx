"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  X,
  Wrench,
  Zap,
  Droplets,
  Wind,
  Hammer,
  Shield,
  Monitor,
  Car,
  HelpCircle,
  Sparkles,
  Lightbulb,
  Wifi,
  WashingMachine,
  TreePine,
  DoorOpen,
  Armchair,
  Camera,
  Upload,
  Search,
  QrCode,
  Package,
  MapPin,
  Send,
  CircleAlert,
  TriangleAlert,
  OctagonAlert,
  Skull,
  CheckCircle,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useCompanyParam } from "@/hooks/use-company-param";
import { useAssetsStore } from "@/stores/assets-store";
import { useLocationsStore } from "@/stores/locations-store";
import { useIncidentsStore } from "@/stores/incidents-store";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/components/ui/toast";
import { useTranslation } from "@/i18n";
import { cn } from "@/lib/utils";
import type { Incident, IncidentType, Priority, Severity, Asset } from "@/types";
import { LocationPicker, type LocationPickerValue } from "@/components/ui/location-picker";
import {
  storeFile,
  deleteFile,
  FileValidationError,
  MAX_INCIDENT_PHOTOS as MAX_PHOTOS,
} from "@/lib/file-storage";
import { compressImage } from "@/lib/image-compression";

const TOTAL_STEPS = 5;

type CategoryId =
  | "electrical"
  | "plumbing"
  | "hvac"
  | "mechanical"
  | "structural"
  | "safety_equipment"
  | "it"
  | "network"
  | "vehicle"
  | "appliance"
  | "lighting"
  | "cleaning"
  | "grounds"
  | "door_access"
  | "furniture"
  | "other";

const categories: Array<{
  value: CategoryId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}> = [
  { value: "electrical", label: "Electrical", icon: Zap, color: "text-yellow-500" },
  { value: "plumbing", label: "Plumbing", icon: Droplets, color: "text-blue-500" },
  { value: "hvac", label: "HVAC", icon: Wind, color: "text-cyan-500" },
  { value: "mechanical", label: "Mechanical", icon: Wrench, color: "text-orange-500" },
  { value: "structural", label: "Structural", icon: Hammer, color: "text-amber-600" },
  { value: "safety_equipment", label: "Safety gear", icon: Shield, color: "text-red-500" },
  { value: "it", label: "IT", icon: Monitor, color: "text-indigo-500" },
  { value: "network", label: "Network / Wi-Fi", icon: Wifi, color: "text-sky-500" },
  { value: "vehicle", label: "Vehicle", icon: Car, color: "text-slate-600" },
  { value: "appliance", label: "Appliance", icon: WashingMachine, color: "text-teal-500" },
  { value: "lighting", label: "Lighting", icon: Lightbulb, color: "text-amber-500" },
  { value: "cleaning", label: "Cleaning", icon: Sparkles, color: "text-pink-500" },
  { value: "grounds", label: "Grounds / Landscaping", icon: TreePine, color: "text-green-600" },
  { value: "door_access", label: "Doors & Access", icon: DoorOpen, color: "text-stone-600" },
  { value: "furniture", label: "Furniture", icon: Armchair, color: "text-violet-500" },
  { value: "other", label: "Other", icon: HelpCircle, color: "text-gray-500" },
];

const priorityLevels: Array<{
  value: Priority;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}> = [
  { value: "low", label: "Low", description: "Can wait a week or more", icon: CircleAlert, color: "text-green-500" },
  { value: "medium", label: "Medium", description: "Fix within a few days", icon: TriangleAlert, color: "text-yellow-500" },
  { value: "high", label: "High", description: "Needs attention today", icon: OctagonAlert, color: "text-orange-500" },
  { value: "critical", label: "Critical", description: "Urgent — safety risk or outage", icon: Skull, color: "text-red-500" },
];

function RequestMaintenancePageContent() {
  const router = useRouter();
  const company = useCompanyParam();
  const searchParams = useSearchParams();
  const preselectedAssetId = searchParams.get("asset") || "";
  const preselectedLocationId = searchParams.get("location") || "";
  const { user, currentCompany } = useAuth();
  const { toast } = useToast();
  const { items: assets } = useAssetsStore();
  const { items: locations } = useLocationsStore();
  const { add: addIncident, items: incidents } = useIncidentsStore({ skipLoad: true });
  const { t } = useTranslation();

  const [currentStep, setCurrentStep] = React.useState(1);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [assetQuery, setAssetQuery] = React.useState("");
  const [stepErrors, setStepErrors] = React.useState<Record<string, string>>({});
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [draftId] = React.useState(() => `draft_${Date.now()}`);

  const [formData, setFormData] = React.useState<{
    category: CategoryId | "";
    assetId: string;
    useManualAsset: boolean;
    manualAssetDescription: string;
    skipAsset: boolean;
    title: string;
    description: string;
    priority: Priority;
    photos: string[];
    photoFileIds: string[];
  }>({
    category: "",
    assetId: preselectedAssetId,
    useManualAsset: false,
    manualAssetDescription: "",
    skipAsset: false,
    title: "",
    description: "",
    priority: "medium",
    photos: [],
    photoFileIds: [],
  });

  const [locationValue, setLocationValue] = React.useState<LocationPickerValue>({
    locationId: preselectedLocationId,
    manualText: "",
    gpsLat: null,
    gpsLng: null,
  });

  const selectedAsset: Asset | null = React.useMemo(() => {
    if (!formData.assetId) return null;
    return assets.find((a) => a.id === formData.assetId) || null;
  }, [assets, formData.assetId]);

  const assetLocation = selectedAsset?.location_id
    ? locations.find((l) => l.id === selectedAsset.location_id)
    : null;

  const assetMatches = React.useMemo(() => {
    const q = assetQuery.trim().toLowerCase();
    const pool = assets.filter((a) => a.status !== "retired");
    if (!q) return pool.slice(0, 6);
    return pool
      .filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.asset_tag.toLowerCase().includes(q) ||
          (a.serial_number || "").toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [assets, assetQuery]);

  const validateStep = (step: number): boolean => {
    const next: Record<string, string> = {};
    switch (step) {
      case 1:
        if (!formData.category) next.category = "Select a category";
        break;
      case 2:
        if (formData.skipAsset) break;
        if (!formData.useManualAsset && !formData.assetId) {
          next.asset = "Select an asset, describe it, or skip this step";
        }
        if (formData.useManualAsset && formData.manualAssetDescription.trim().length < 3) {
          next.asset = "Describe the asset (3+ characters)";
        }
        break;
      case 3:
        if (formData.title.trim().length < 3) {
          next.title = "Enter a brief title";
        }
        if (formData.description.trim().length < 10) {
          next.description = "Give at least 10 characters of detail";
        }
        break;
    }
    setStepErrors(next);
    return Object.keys(next).length === 0;
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1: return !!formData.category;
      case 2:
        if (formData.skipAsset) return true;
        if (formData.useManualAsset) return formData.manualAssetDescription.trim().length >= 3;
        return !!formData.assetId;
      case 3:
        return formData.title.trim().length >= 3 && formData.description.trim().length >= 10;
      case 4: return !!formData.priority;
      case 5: return true;
      default: return false;
    }
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) return;
    if (currentStep < TOTAL_STEPS) setCurrentStep((s) => s + 1);
  };
  const handleBack = () => {
    if (currentStep > 1) setCurrentStep((s) => s - 1);
    else router.back();
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const remaining = MAX_PHOTOS - formData.photos.length;
    const list = Array.from(files).slice(0, remaining);
    for (const file of list) {
      try {
        const stored = await storeFile(file, "work_order", draftId, user?.id || "unknown");
        const compressed = await compressImage(stored.dataUrl);
        setFormData((prev) => ({
          ...prev,
          photos: [...prev.photos, compressed],
          photoFileIds: [...prev.photoFileIds, stored.id],
        }));
      } catch (err) {
        if (err instanceof FileValidationError) toast(err.message, "error");
        else toast(`Failed to upload ${file.name}`, "error");
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removePhoto = (index: number) => {
    const id = formData.photoFileIds[index];
    if (id) deleteFile(id);
    setFormData((prev) => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
      photoFileIds: prev.photoFileIds.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    if (!user) {
      toast("Unable to submit without a user session.", "error");
      return;
    }
    setIsSubmitting(true);
    try {
      const categoryDef = categories.find((c) => c.value === formData.category);
      const categoryLabel = categoryDef ? categoryDef.label : "General";
      const manualLocationText =
        locationValue.manualText ||
        locationValue.gpsAddress ||
        (locationValue.locationId ? locations.find((l) => l.id === locationValue.locationId)?.name : "");

      const descriptionWithContext = [
        `[Fix request · ${categoryLabel}]`,
        formData.description.trim(),
        formData.skipAsset
          ? `\n\n(Not tied to a specific asset)`
          : formData.useManualAsset && formData.manualAssetDescription.trim()
          ? `\n\nAsset: ${formData.manualAssetDescription.trim()}`
          : "",
        !formData.skipAsset && formData.useManualAsset && manualLocationText
          ? `Location: ${manualLocationText}`
          : "",
      ]
        .filter(Boolean)
        .join("\n")
        .trim();

      // Priority -> Severity mapping for the Incident model
      const severity: Severity =
        formData.priority === "critical"
          ? "critical"
          : formData.priority === "high"
          ? "high"
          : formData.priority === "medium"
          ? "medium"
          : "low";

      const now = new Date();
      const companyId = user.company_id || currentCompany?.id || "";
      const fixCount = incidents.filter(
        (i) => i.company_id === companyId && i.type === "maintenance_request",
      ).length;
      const refNumber = `FIX-${now.getFullYear()}-${String(fixCount + 1).padStart(4, "0")}`;

      const assetId = formData.skipAsset || formData.useManualAsset ? null : formData.assetId || null;
      const locationId = formData.skipAsset
        ? null
        : (formData.useManualAsset ? locationValue.locationId : selectedAsset?.location_id) || null;
      const locationDescription = formData.skipAsset
        ? null
        : formData.useManualAsset
        ? manualLocationText || null
        : null;

      const incident: Incident = {
        id: crypto.randomUUID(),
        company_id: companyId,
        reference_number: refNumber,
        reporter_id: user.id,
        type: "maintenance_request" as IncidentType,
        type_other: categoryLabel,
        severity,
        priority: formData.priority,
        title: formData.title.trim(),
        description: descriptionWithContext,
        incident_date: now.toISOString().slice(0, 10),
        incident_time: now.toTimeString().slice(0, 5),
        lost_time: false,
        lost_time_amount: null,
        lost_time_restricted_days: null,
        lost_time_return_date: null,
        lost_time_updated_at: null,
        lost_time_updated_by: null,
        active_hazard: formData.priority === "critical",
        location_id: locationId,
        building: null,
        floor: null,
        zone: null,
        room: null,
        gps_lat: formData.skipAsset ? null : formData.useManualAsset ? locationValue.gpsLat : null,
        gps_lng: formData.skipAsset ? null : formData.useManualAsset ? locationValue.gpsLng : null,
        location_description: locationDescription,
        asset_id: assetId,
        media_urls: formData.photos,
        injury_locations: [],
        status: "new",
        flagged: false,
        resolved_at: null,
        resolved_by: null,
        resolution_notes: null,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      };

      addIncident(incident);
      toast("Fix request submitted");
      router.push(`/${company}/app/incidents/${incident.id}`);
    } catch (err) {
      console.error("[Maintenance] Submission failed:", err);
      toast("Failed to submit request. Please try again.", "error");
      setIsSubmitting(false);
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 1: return "What kind of fix is needed?";
      case 2: return "Which asset or area?";
      case 3: return "Describe the problem";
      case 4: return "How urgent is it?";
      case 5: return "Review & submit";
      default: return "";
    }
  };

  const selectedCategory = categories.find((c) => c.value === formData.category);
  const selectedPriority = priorityLevels.find((p) => p.value === formData.priority);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b bg-background">
        <div className="flex h-14 items-center gap-4 px-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            aria-label={currentStep === 1 ? "Cancel" : "Go back"}
          >
            {currentStep === 1 ? <X className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold truncate">{"Request Maintenance"}</h1>
            <p className="text-xs text-muted-foreground">
              {t("report.stepOf", { current: String(currentStep), total: String(TOTAL_STEPS) }) ||
                `Step ${currentStep} of ${TOTAL_STEPS}`}
            </p>
          </div>
        </div>
        <div
          className="h-1 bg-muted"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round((currentStep / TOTAL_STEPS) * 100)}
        >
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${(currentStep / TOTAL_STEPS) * 100}%` }}
          />
        </div>
      </header>

      {/* Step content */}
      <div className="flex-1 p-4 pb-40">
        <div className="mb-6">
          <h2 className="text-xl font-semibold">{getStepTitle()}</h2>
        </div>

        {/* Step 1: Category */}
        {currentStep === 1 && (
          <div className="grid grid-cols-2 gap-3">
            {categories.map((c) => {
              const Icon = c.icon;
              const active = formData.category === c.value;
              return (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => {
                    setFormData((p) => ({ ...p, category: c.value }));
                    setStepErrors({});
                  }}
                  className={cn(
                    "flex items-center gap-3 rounded-xl p-3.5 transition-all touch-manipulation",
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted/50 hover:bg-muted text-foreground",
                  )}
                >
                  <Icon className={cn("h-5 w-5 shrink-0", active ? "text-primary-foreground" : c.color)} aria-hidden="true" />
                  <span className="text-sm font-medium text-left">{c.label}</span>
                </button>
              );
            })}
            {stepErrors.category && (
              <p className="col-span-2 text-sm text-red-500 mt-1">{stepErrors.category}</p>
            )}
          </div>
        )}

        {/* Step 2: Asset */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Locate the asset or area that needs fixing. Not every fix is tied to an asset — you can skip this step.
            </p>

            {formData.skipAsset ? (
              <div className="rounded-xl border-2 border-primary bg-primary/5 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 shrink-0">
                    <HelpCircle className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">Not tied to a specific asset</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      You can still describe the problem in the next step.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData((p) => ({ ...p, skipAsset: false }))}
                    className="text-xs text-primary font-medium shrink-0 underline-offset-2 hover:underline"
                  >
                    Undo
                  </button>
                </div>
              </div>
            ) : (
              <>
                {!formData.useManualAsset && (
                  <>
                    {/* Selected asset card */}
                    {selectedAsset ? (
                      <div className="rounded-xl border-2 border-primary bg-primary/5 p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 shrink-0">
                            <Package className="h-6 w-6 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold truncate">{selectedAsset.name}</p>
                            <p className="text-xs font-mono text-muted-foreground">{selectedAsset.asset_tag}</p>
                            {assetLocation && (
                              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                                <MapPin className="h-3 w-3" />
                                {assetLocation.name}
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => setFormData((p) => ({ ...p, assetId: "" }))}
                            className="text-xs text-primary font-medium shrink-0 underline-offset-2 hover:underline"
                          >
                            Change
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Search */}
                        <div className="relative">
                          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            value={assetQuery}
                            onChange={(e) => setAssetQuery(e.target.value)}
                            placeholder={"Search by name, tag, or serial"}
                            className="h-12 pl-10 text-base"
                          />
                        </div>

                        {/* Scan QR quick action */}
                        <Link
                          href={`/${company}/app/scan`}
                          className="flex items-center gap-3 rounded-xl border p-3 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 shrink-0">
                            <QrCode className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">Scan asset QR code</p>
                            <p className="text-xs text-muted-foreground">
                              Point your camera at the asset tag
                            </p>
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        </Link>

                        {/* Matches list */}
                        {assetMatches.length > 0 ? (
                          <div className="rounded-xl border divide-y">
                            <p className="px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                              {assetQuery ? "Matches" : "Recent assets"}
                            </p>
                            {assetMatches.map((a) => {
                              const loc = a.location_id ? locations.find((l) => l.id === a.location_id) : null;
                              return (
                                <button
                                  key={a.id}
                                  type="button"
                                  onClick={() => {
                                    setFormData((p) => ({ ...p, assetId: a.id }));
                                    setStepErrors({});
                                    setAssetQuery("");
                                  }}
                                  className="flex w-full items-center gap-3 px-3 py-3 text-left active:bg-muted/50 transition-colors"
                                >
                                  <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{a.name}</p>
                                    <p className="text-xs text-muted-foreground font-mono truncate">
                                      {a.asset_tag}
                                      {loc ? ` • ${loc.name}` : ""}
                                    </p>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        ) : assetQuery ? (
                          <div className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
                            No assets match “{assetQuery}”.
                          </div>
                        ) : null}
                      </>
                    )}

                    {/* Toggle to manual */}
                    <button
                      type="button"
                      onClick={() =>
                        setFormData((p) => ({ ...p, useManualAsset: true, assetId: "" }))
                      }
                      className="flex w-full items-center gap-3 rounded-xl border border-dashed p-3 text-left hover:bg-muted/50 transition-colors"
                    >
                      <Pencil className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Can&apos;t find it? Describe the asset</p>
                        <p className="text-xs text-muted-foreground">
                          Add a short description and pick a location
                        </p>
                      </div>
                    </button>
                  </>
                )}

                {formData.useManualAsset && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="manual-asset">
                        Describe the asset or area
                        <span className="text-destructive"> *</span>
                      </Label>
                      <Textarea
                        id="manual-asset"
                        rows={3}
                        placeholder="e.g. Loading dock roller door, north entrance"
                        value={formData.manualAssetDescription}
                        onChange={(e) =>
                          setFormData((p) => ({ ...p, manualAssetDescription: e.target.value }))
                        }
                        className="text-base"
                      />
                    </div>

                    <LocationPicker
                      locations={locations.map((l) => ({
                        id: l.id,
                        name: l.name,
                        address: l.address,
                        parent_id: l.parent_id,
                        type: l.type,
                      }))}
                      value={locationValue}
                      onChange={setLocationValue}
                      label="Where is it?"
                      scanUrl={`/${company}/app/scan`}
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setFormData((p) => ({
                          ...p,
                          useManualAsset: false,
                          manualAssetDescription: "",
                        }))
                      }
                      className="text-sm text-primary font-medium underline-offset-2 hover:underline"
                    >
                      Pick from asset list instead
                    </button>
                  </div>
                )}

                {/* Skip option — always visible when not skipped yet */}
                <button
                  type="button"
                  onClick={() =>
                    setFormData((p) => ({
                      ...p,
                      skipAsset: true,
                      assetId: "",
                      useManualAsset: false,
                      manualAssetDescription: "",
                    }))
                  }
                  className="flex w-full items-center gap-3 rounded-xl border border-dashed p-3 text-left hover:bg-muted/50 transition-colors"
                >
                  <HelpCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Skip — not tied to an asset</p>
                    <p className="text-xs text-muted-foreground">
                      For general issues like a spill, hazard, or area concern
                    </p>
                  </div>
                </button>
              </>
            )}

            {stepErrors.asset && <p className="text-sm text-red-500">{stepErrors.asset}</p>}
          </div>
        )}

        {/* Step 3: Describe */}
        {currentStep === 3 && (
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="wo-title">
                {"Short title"}
                <span className="text-destructive"> *</span>
              </Label>
              <Input
                id="wo-title"
                autoFocus
                placeholder={"e.g. Conveyor belt slipping"}
                value={formData.title}
                onChange={(e) => {
                  setFormData((p) => ({ ...p, title: e.target.value }));
                  if (stepErrors.title) setStepErrors((prev) => ({ ...prev, title: "" }));
                }}
                className={cn("h-12 text-base", stepErrors.title && "border-red-500")}
                maxLength={120}
              />
              {stepErrors.title && <p className="text-sm text-red-500">{stepErrors.title}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="wo-desc">
                {"What's wrong?"}
                <span className="text-destructive"> *</span>
              </Label>
              <Textarea
                id="wo-desc"
                rows={6}
                placeholder={
                  "When did it start? What have you noticed? Is it still working?"
                }
                value={formData.description}
                onChange={(e) => {
                  setFormData((p) => ({ ...p, description: e.target.value }));
                  if (stepErrors.description) setStepErrors((prev) => ({ ...prev, description: "" }));
                }}
                className={cn("text-base", stepErrors.description && "border-red-500")}
              />
              <p className="text-xs text-muted-foreground">
                {formData.description.length < 10
                  ? t("report.descriptionMinChars", { count: String(formData.description.length) }) ||
                    `${formData.description.length}/10`
                  : `${formData.description.length} characters`}
              </p>
              {stepErrors.description && <p className="text-sm text-red-500">{stepErrors.description}</p>}
            </div>

            {/* Photos */}
            <div className="space-y-2">
              <Label>{"Add photos (optional)"}</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp"
                multiple
                capture="environment"
                onChange={handlePhotoUpload}
                className="hidden"
              />
              {formData.photos.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {formData.photos.map((photo, i) => (
                    <div key={i} className="relative aspect-square overflow-hidden rounded-lg border">
                      <img src={photo} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" loading="lazy" />
                      <button
                        type="button"
                        onClick={() => removePhoto(i)}
                        aria-label={`Remove photo ${i + 1}`}
                        className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {formData.photos.length < MAX_PHOTOS && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex h-24 flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 text-primary transition-colors hover:bg-primary/10"
                  >
                    <Camera className="h-6 w-6" />
                    <span className="text-xs font-medium">{"Take photo"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.removeAttribute("capture");
                        fileInputRef.current.click();
                      }
                    }}
                    className="flex h-24 flex-col items-center justify-center gap-1.5 rounded-xl border text-muted-foreground transition-colors hover:bg-muted/50"
                  >
                    <Upload className="h-6 w-6" />
                    <span className="text-xs font-medium">{"Upload"}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Priority */}
        {currentStep === 4 && (
          <div className="space-y-3">
            {priorityLevels.map((p) => {
              const Icon = p.icon;
              const active = formData.priority === p.value;
              return (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, priority: p.value }))}
                  className={cn(
                    "flex w-full items-center gap-4 rounded-xl p-4 text-left transition-all",
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted/50 hover:bg-muted",
                  )}
                >
                  <Icon
                    className={cn("h-6 w-6 shrink-0", active ? "text-primary-foreground" : p.color)}
                    aria-hidden="true"
                  />
                  <div className="flex-1">
                    <p className={cn("font-semibold", active ? "text-primary-foreground" : "text-foreground")}>
                      {p.label}
                    </p>
                    <p
                      className={cn(
                        "text-sm",
                        active ? "text-primary-foreground/80" : "text-muted-foreground",
                      )}
                    >
                      {p.description}
                    </p>
                  </div>
                  {active && <CheckCircle className="h-5 w-5 text-primary-foreground shrink-0" />}
                </button>
              );
            })}
          </div>
        )}

        {/* Step 5: Review */}
        {currentStep === 5 && (
          <div className="space-y-3">
            <ReviewRow
              label={"Category"}
              onEdit={() => setCurrentStep(1)}
              icon={selectedCategory?.icon}
              iconColor={selectedCategory?.color}
            >
              {selectedCategory ? selectedCategory.label : "—"}
            </ReviewRow>

            <ReviewRow
              label={"Asset"}
              onEdit={() => setCurrentStep(2)}
              icon={Package}
            >
              {formData.skipAsset ? (
                <p className="text-sm text-muted-foreground italic">Not tied to a specific asset</p>
              ) : formData.useManualAsset ? (
                <>
                  <p className="text-sm">{formData.manualAssetDescription}</p>
                  {(locationValue.manualText ||
                    locationValue.gpsAddress ||
                    locationValue.locationId) && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {locationValue.manualText ||
                        locationValue.gpsAddress ||
                        locations.find((l) => l.id === locationValue.locationId)?.name}
                    </p>
                  )}
                </>
              ) : selectedAsset ? (
                <>
                  <p className="text-sm font-medium">{selectedAsset.name}</p>
                  <p className="text-xs font-mono text-muted-foreground">
                    {selectedAsset.asset_tag}
                    {assetLocation ? ` • ${assetLocation.name}` : ""}
                  </p>
                </>
              ) : (
                "—"
              )}
            </ReviewRow>

            <ReviewRow
              label={"What needs fixing"}
              onEdit={() => setCurrentStep(3)}
            >
              <p className="text-sm font-medium">{formData.title}</p>
              <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">{formData.description}</p>
              {formData.photos.length > 0 && (
                <div className="mt-2 flex gap-1.5">
                  {formData.photos.map((photo, i) => (
                    <img
                      key={i}
                      src={photo}
                      alt={`Photo ${i + 1}`}
                      className="h-14 w-14 rounded-md object-cover border"
                    />
                  ))}
                </div>
              )}
            </ReviewRow>

            <ReviewRow
              label={"Priority"}
              onEdit={() => setCurrentStep(4)}
              icon={selectedPriority?.icon}
              iconColor={selectedPriority?.color}
            >
              {selectedPriority ? selectedPriority.label : "—"}
            </ReviewRow>
          </div>
        )}
      </div>

      {/* Footer nav */}
      <div className="fixed bottom-0 left-0 right-0 border-t bg-background p-4 pb-6 z-20 safe-area-inset-bottom">
        {currentStep < TOTAL_STEPS ? (
          <Button
            onClick={handleNext}
            disabled={!canProceed()}
            className="h-14 w-full gap-2 text-base"
          >
            {t("report.continue") || "Continue"}
            <ArrowRight className="h-5 w-5" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            loading={isSubmitting}
            disabled={isSubmitting}
            className="h-14 w-full gap-2 text-base"
          >
            <Send className="h-5 w-5" />
            {"Submit Request"}
          </Button>
        )}
      </div>
    </div>
  );
}

function ReviewRow({
  label,
  children,
  onEdit,
  icon: Icon,
  iconColor,
}: {
  label: string;
  children: React.ReactNode;
  onEdit: () => void;
  icon?: React.ComponentType<{ className?: string }>;
  iconColor?: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/50 shrink-0">
            <Icon className={cn("h-4.5 w-4.5", iconColor || "text-muted-foreground")} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <div className="mt-1 text-foreground">{children}</div>
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="text-xs font-medium text-primary hover:underline shrink-0 flex items-center gap-1"
          aria-label={`Edit ${label}`}
        >
          <Pencil className="h-3 w-3" />
          Edit
        </button>
      </div>
    </div>
  );
}

export default function RequestMaintenancePage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      }
    >
      <RequestMaintenancePageContent />
    </React.Suspense>
  );
}
