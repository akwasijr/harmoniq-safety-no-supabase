"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Package,
  MapPin,
  Wrench,
  Camera,
  Check,
  AlertTriangle,
  QrCode,
  X,
  Car,
  Hammer,
  Zap,
  Snowflake,
  Flame,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useCompanyParam } from "@/hooks/use-company-param";
import { useAssetsStore } from "@/stores/assets-store";
import { useLocationsStore } from "@/stores/locations-store";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "@/i18n";
import { useToast } from "@/components/ui/toast";
import type { AssetCategory, AssetCondition, AssetCriticality } from "@/types";

type Step = "info" | "details" | "location" | "review";

const STEPS: Step[] = ["info", "details", "location", "review"];

const CATEGORIES: { value: AssetCategory; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "machinery", label: "Machinery", icon: Wrench },
  { value: "vehicle", label: "Vehicle", icon: Car },
  { value: "safety_equipment", label: "Safety Equipment", icon: Shield },
  { value: "tool", label: "Tool", icon: Hammer },
  { value: "electrical", label: "Electrical", icon: Zap },
  { value: "hvac", label: "HVAC", icon: Snowflake },
  { value: "fire_safety", label: "Fire Safety", icon: Flame },
  { value: "lifting_equipment", label: "Lifting Equipment", icon: Package },
  { value: "ppe", label: "PPE", icon: Shield },
  { value: "other", label: "Other", icon: Package },
];

const CONDITIONS: { value: AssetCondition; label: string; color: string }[] = [
  { value: "excellent", label: "Excellent", color: "bg-success text-white" },
  { value: "good", label: "Good", color: "bg-success/80 text-white" },
  { value: "fair", label: "Fair", color: "bg-warning text-white" },
  { value: "poor", label: "Poor", color: "bg-destructive/80 text-white" },
];

const CRITICALITY: { value: AssetCriticality; label: string; color: string }[] = [
  { value: "low", label: "Low", color: "border-muted-foreground text-muted-foreground" },
  { value: "medium", label: "Medium", color: "border-warning text-warning" },
  { value: "high", label: "High", color: "border-orange-500 text-orange-500" },
  { value: "critical", label: "Critical", color: "border-destructive text-destructive" },
];

export default function NewAssetPage() {
  const router = useRouter();
  const company = useCompanyParam();
  const { add: addAsset, items: existingAssets } = useAssetsStore();
  const { items: locations } = useLocationsStore();
  const { user } = useAuth();
  const { t } = useTranslation();
  const { toast } = useToast();

  const [step, setStep] = React.useState<Step>("info");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [photos, setPhotos] = React.useState<string[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Form state
  const [name, setName] = React.useState("");
  const [category, setCategory] = React.useState<AssetCategory | "">("");
  const [serialNumber, setSerialNumber] = React.useState("");
  const [manufacturer, setManufacturer] = React.useState("");
  const [model, setModel] = React.useState("");
  const [assetType, setAssetType] = React.useState<"static" | "movable">("static");
  const [department, setDepartment] = React.useState("");
  const [warrantyExpiry, setWarrantyExpiry] = React.useState("");
  const [condition, setCondition] = React.useState<AssetCondition>("good");
  const [criticality, setCriticality] = React.useState<AssetCriticality>("medium");
  const [locationId, setLocationId] = React.useState<string>("");
  const [safetyInstructions, setSafetyInstructions] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [showLocationPicker, setShowLocationPicker] = React.useState(false);

  const currentStepIndex = STEPS.indexOf(step);
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === STEPS.length - 1;

  const selectedLocation = locationId ? locations.find((l) => l.id === locationId) : null;

  // Generate a unique asset tag
  const generateAssetTag = (): string => {
    const prefix = category ? category.toUpperCase().slice(0, 4) : "ASST";
    const number = String(existingAssets.length + 1).padStart(3, "0");
    return `${prefix}-${number}`;
  };

  // Validation per step
  const canContinue = (): boolean => {
    switch (step) {
      case "info":
        return name.trim().length >= 2 && category !== "";
      case "details":
        return true; // Details are optional
      case "location":
        return true; // Location is optional
      case "review":
        return name.trim().length >= 2 && category !== "";
      default:
        return false;
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const remainingSlots = 3 - photos.length;
    const filesToProcess = Array.from(files).slice(0, remainingSlots);

    filesToProcess.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotos((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleNext = () => {
    if (isLastStep) {
      handleSubmit();
    } else {
      setStep(STEPS[currentStepIndex + 1]);
    }
  };

  const handleBack = () => {
    if (isFirstStep) {
      router.back();
    } else {
      setStep(STEPS[currentStepIndex - 1]);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    if (!user) {
      toast(t("scan.loginRequired"));
      setIsSubmitting(false);
      return;
    }

    const now = new Date().toISOString();
    const assetTag = generateAssetTag();
    const assetId = `asset_${Date.now()}`;

        addAsset({
          id: assetId,
          company_id: user.company_id,
          location_id: locationId || null,
          parent_asset_id: null,
          is_system: false,
          name: name.trim(),
          asset_tag: assetTag,
          serial_number: serialNumber.trim() || null,
          barcode: null,
          qr_code: `AST-${assetTag}`,
          category: category as AssetCategory,
          sub_category: null,
          asset_type: assetType,
          criticality,
          department: department.trim() || null,
          manufacturer: manufacturer.trim() || null,
          model: model.trim() || null,
          model_number: null,
          specifications: notes.trim() || null,
          manufactured_date: null,
          purchase_date: null,
          installation_date: now.split("T")[0],
          warranty_expiry: warrantyExpiry || null,
          expected_life_years: null,
          condition,
      condition_notes: null,
      last_condition_assessment: now.split("T")[0],
      purchase_cost: null,
      current_value: null,
      depreciation_rate: null,
      currency: "USD",
      maintenance_frequency_days: null,
      last_maintenance_date: null,
      next_maintenance_date: null,
      maintenance_notes: null,
      requires_certification: false,
      requires_calibration: false,
      calibration_frequency_days: null,
      last_calibration_date: null,
      next_calibration_date: null,
      safety_instructions: safetyInstructions.trim() || null,
      status: "active",
      decommission_date: null,
      disposal_method: null,
      created_at: now,
      updated_at: now,
    });

    toast(t("newAsset.created"));

    // Navigate to the new asset detail page
    router.push(`/${company}/app/asset?id=${assetId}`);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background border-b">
        <div className="flex h-14 items-center gap-4 px-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-semibold text-sm">{t("newAsset.title")}</h1>
            <p className="text-xs text-muted-foreground">
              {t("newAsset.stepOf", {
                current: String(currentStepIndex + 1),
                total: String(STEPS.length),
              })}
            </p>
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-muted">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${((currentStepIndex + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </header>

      {/* Step Content */}
      <div className="flex-1 p-4 pb-28 max-w-lg mx-auto w-full">
        {/* Step 1: Basic Info */}
        {step === "info" && (
          <div className="space-y-6">
            <div className="flex flex-col items-center py-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mb-3">
                <Package className="h-7 w-7 text-primary" />
              </div>
              <h2 className="text-lg font-semibold">{t("newAsset.basicInfo")}</h2>
              <p className="text-sm text-muted-foreground mt-1 text-center">
                {t("newAsset.basicInfoDesc")}
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="asset-name">
                  {t("newAsset.assetName")} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="asset-name"
                  placeholder={t("newAsset.assetNamePlaceholder")}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-12"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label>
                  {t("newAsset.category")} <span className="text-destructive">*</span>
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    return (
                    <button
                      key={cat.value}
                      onClick={() => setCategory(cat.value)}
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg border-2 p-3 text-left transition-all text-sm",
                        category === cat.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/30"
                      )}
                    >
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{cat.label}</span>
                    </button>
                  );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t("newAsset.assetType")}</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: "static", label: t("newAsset.assetTypeStatic") },
                    { value: "movable", label: t("newAsset.assetTypeMovable") },
                  ].map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setAssetType(type.value as "static" | "movable")}
                      className={cn(
                        "flex items-center justify-center rounded-lg border-2 p-3 text-sm font-medium transition-all",
                        assetType === type.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/30"
                      )}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Details */}
        {step === "details" && (
          <div className="space-y-6">
            <div className="flex flex-col items-center py-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mb-3">
                <Wrench className="h-7 w-7 text-primary" />
              </div>
              <h2 className="text-lg font-semibold">{t("newAsset.technicalDetails")}</h2>
              <p className="text-sm text-muted-foreground mt-1 text-center">
                {t("newAsset.technicalDetailsDesc")}
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="serial">{t("newAsset.serialNumber")}</Label>
                <Input
                  id="serial"
                  placeholder={t("newAsset.serialNumberPlaceholder")}
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  className="h-12"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="manufacturer">{t("newAsset.manufacturer")}</Label>
                  <Input
                    id="manufacturer"
                    placeholder={t("newAsset.manufacturerPlaceholder")}
                    value={manufacturer}
                    onChange={(e) => setManufacturer(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model">{t("newAsset.model")}</Label>
                  <Input
                    id="model"
                    placeholder={t("newAsset.modelPlaceholder")}
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">{t("newAsset.department")}</Label>
                <Input
                  id="department"
                  placeholder={t("newAsset.departmentPlaceholder")}
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="warranty">{t("newAsset.warrantyExpiry")}</Label>
                <Input
                  id="warranty"
                  type="date"
                  value={warrantyExpiry}
                  onChange={(e) => setWarrantyExpiry(e.target.value)}
                />
              </div>

              {/* Condition */}
              <div className="space-y-2">
                <Label>{t("newAsset.condition")}</Label>
                <div className="flex gap-2">
                  {CONDITIONS.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setCondition(c.value)}
                      className={cn(
                        "flex-1 rounded-lg py-2.5 text-sm font-medium transition-all border-2",
                        condition === c.value
                          ? c.color
                          : "border-border text-muted-foreground hover:border-primary/30"
                      )}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Criticality */}
              <div className="space-y-2">
                <Label>{t("newAsset.criticality")}</Label>
                <div className="flex gap-2">
                  {CRITICALITY.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setCriticality(c.value)}
                      className={cn(
                        "flex-1 rounded-lg py-2.5 text-sm font-medium transition-all border-2",
                        criticality === c.value
                          ? c.color + " border-current"
                          : "border-border text-muted-foreground hover:border-primary/30"
                      )}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Photo */}
              <div className="space-y-2">
                <Label>{t("newAsset.photos")}</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoUpload}
                  className="hidden"
                  aria-label="Upload photo"
                />
                {photos.length > 0 && (
                  <div className="flex gap-2 mb-2">
                    {photos.map((photo, index) => (
                      <div key={index} className="relative w-20 h-20 rounded-lg overflow-hidden border">
                        <img src={photo} alt={`Photo ${index + 1}`} className="h-full w-full object-cover" />
                        <button
                          type="button"
                          aria-label={`Remove photo ${index + 1}`}
                          onClick={() => removePhoto(index)}
                          className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/50 text-white"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {photos.length < 3 && (
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera className="h-4 w-4" />
                    {t("newAsset.addPhoto")}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Location */}
        {step === "location" && (
          <div className="space-y-6">
            <div className="flex flex-col items-center py-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mb-3">
                <MapPin className="h-7 w-7 text-primary" />
              </div>
              <h2 className="text-lg font-semibold">{t("newAsset.assignLocation")}</h2>
              <p className="text-sm text-muted-foreground mt-1 text-center">
                {t("newAsset.assignLocationDesc")}
              </p>
            </div>

            {/* Selected location */}
            {selectedLocation && (
              <Card className="border-primary/50">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <MapPin className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{selectedLocation.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{selectedLocation.type}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setLocationId("")}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Location picker */}
            <div className="space-y-2">
              {!selectedLocation && (
                <p className="text-sm text-muted-foreground">{t("newAsset.selectLocation")}</p>
              )}
              <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                {locations.map((loc) => (
                  <button
                    key={loc.id}
                    onClick={() => setLocationId(loc.id)}
                    className={cn(
                      "w-full flex items-center gap-3 rounded-lg border p-3 text-left transition-all",
                      locationId === loc.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/30 hover:bg-muted/50"
                    )}
                  >
                    <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{loc.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{loc.type}</p>
                    </div>
                    {locationId === loc.id && (
                      <Check className="h-4 w-4 text-primary shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Safety instructions */}
            <div className="space-y-2">
              <Label htmlFor="safety">{t("newAsset.safetyInstructions")}</Label>
              <Textarea
                id="safety"
                placeholder={t("newAsset.safetyInstructionsPlaceholder")}
                value={safetyInstructions}
                onChange={(e) => setSafetyInstructions(e.target.value)}
                rows={3}
              />
            </div>

            {/* Additional notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">{t("newAsset.additionalNotes")}</Label>
              <Textarea
                id="notes"
                placeholder={t("newAsset.additionalNotesPlaceholder")}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {step === "review" && (
          <div className="space-y-4">
            <div className="flex flex-col items-center py-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mb-3">
                <Check className="h-7 w-7 text-primary" />
              </div>
              <h2 className="text-lg font-semibold">{t("newAsset.reviewTitle")}</h2>
              <p className="text-sm text-muted-foreground mt-1 text-center">
                {t("newAsset.reviewDesc")}
              </p>
            </div>

            {/* Review card */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 shrink-0">
                    <Package className="h-7 w-7 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg">{name}</h3>
                    <p className="text-sm text-muted-foreground font-mono">{generateAssetTag()}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="text-sm capitalize">active</span>
                      <span className="text-sm capitalize">{condition}</span>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4 space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("newAsset.category")}</span>
                    <span className="font-medium capitalize">{category || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("newAsset.assetType")}</span>
                    <span className="font-medium capitalize">{assetType}</span>
                  </div>
                  {serialNumber && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("newAsset.serialNumber")}</span>
                      <span className="font-mono">{serialNumber}</span>
                    </div>
                  )}
                  {manufacturer && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("newAsset.manufacturer")}</span>
                      <span>{manufacturer} {model || ""}</span>
                    </div>
                  )}
                  {department && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("newAsset.department")}</span>
                      <span>{department}</span>
                    </div>
                  )}
                  {warrantyExpiry && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("newAsset.warrantyExpiry")}</span>
                      <span>{warrantyExpiry}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("newAsset.criticality")}</span>
                    <span className="text-sm capitalize">{criticality}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("newAsset.location")}</span>
                    <span>{selectedLocation?.name || t("newAsset.notAssigned")}</span>
                  </div>
                </div>

                {safetyInstructions && (
                  <div className="border-t pt-4">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">{t("newAsset.safetyInstructions")}</p>
                        <p className="text-sm text-muted-foreground mt-1">{safetyInstructions}</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* QR Code Preview */}
            <Card className="border-dashed">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <QrCode className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{t("newAsset.qrCodeGenerated")}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("newAsset.qrCodeDesc")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="fixed bottom-16 left-0 right-0 border-t bg-background p-4 z-20">
        <Button
          onClick={handleNext}
          disabled={!canContinue() || isSubmitting}
          className="h-14 w-full gap-2 text-base"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              {t("newAsset.registering")}
            </span>
          ) : isLastStep ? (
            <>
              <Check className="h-5 w-5" />
              {t("newAsset.registerAsset")}
            </>
          ) : (
            t("common.continue")
          )}
        </Button>
      </div>
    </div>
  );
}
