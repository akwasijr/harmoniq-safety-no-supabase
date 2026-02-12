"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocationsStore } from "@/stores/locations-store";
import { useIncidentsStore } from "@/stores/incidents-store";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/hooks/use-auth";
import {
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  Camera,
  MapPin,
  Calendar,
  FileText,
  CheckCircle,
  X,
  Zap,
  ShieldAlert,
  Flame,
  Package,
  Leaf,
  Lock,
  HelpCircle,
  CircleAlert,
  TriangleAlert,
  OctagonAlert,
  Skull,
  Upload,
  Navigation,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCompanyParam } from "@/hooks/use-company-param";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { Incident, IncidentType, Severity, Priority } from "@/types";
import { useTranslation } from "@/i18n";
import { DEFAULT_COMPANY_ID } from "@/mocks/data";

const TOTAL_STEPS = 7;

const incidentTypes = [
  { value: "injury", label: "report.injury", icon: Zap, color: "text-red-500" },
  { value: "near_miss", label: "report.nearMiss", icon: ShieldAlert, color: "text-orange-500" },
  { value: "hazard", label: "report.hazard", icon: TriangleAlert, color: "text-yellow-500" },
  { value: "property_damage", label: "report.propertyDamage", icon: Package, color: "text-blue-500" },
  { value: "environmental", label: "report.environmental", icon: Leaf, color: "text-green-500" },
  { value: "fire", label: "report.fire", icon: Flame, color: "text-red-600" },
  { value: "security", label: "report.security", icon: Lock, color: "text-purple-500" },
  { value: "other", label: "report.other", icon: HelpCircle, color: "text-gray-500" },
];

const severityLevels = [
  { 
    value: "low", 
    label: "report.low", 
    description: "report.lowDesc",
    icon: CircleAlert,
    color: "text-green-500",
    bgColor: "bg-green-50 dark:bg-green-950",
    borderColor: "border-green-200 dark:border-green-800",
  },
  { 
    value: "medium", 
    label: "report.medium", 
    description: "report.mediumDesc",
    icon: TriangleAlert,
    color: "text-yellow-500",
    bgColor: "bg-yellow-50 dark:bg-yellow-950",
    borderColor: "border-yellow-200 dark:border-yellow-800",
  },
  { 
    value: "high", 
    label: "report.high", 
    description: "report.highDesc",
    icon: OctagonAlert,
    color: "text-orange-500",
    bgColor: "bg-orange-50 dark:bg-orange-950",
    borderColor: "border-orange-200 dark:border-orange-800",
  },
  { 
    value: "critical", 
    label: "report.critical", 
    description: "report.criticalDesc",
    icon: Skull,
    color: "text-red-500",
    bgColor: "bg-red-50 dark:bg-red-950",
    borderColor: "border-red-200 dark:border-red-800",
  },
];

function ReportIncidentPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locationParam = searchParams.get("location");
  const company = useCompanyParam();
  const [currentStep, setCurrentStep] = React.useState(1);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isGettingLocation, setIsGettingLocation] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { items: locations } = useLocationsStore();
  const { add: addIncident } = useIncidentsStore();
  const { toast } = useToast();
  const { user } = useAuth();

  const { t } = useTranslation();

  const selectedLocation = locationParam
    ? locations.find((location) => location.id === locationParam)
    : null;
  
  const [formData, setFormData] = React.useState({
    type: "",
    severity: "",
    title: "",
    description: "",
    location: selectedLocation?.name || "",
    locationId: selectedLocation?.id || "",
    date: new Date().toISOString().split("T")[0],
    time: new Date().toTimeString().slice(0, 5),
    photos: [] as string[],
    lostTime: false,
    activeHazard: false,
    reporterId: user?.id || "",
    gpsLat: null as number | null,
    gpsLng: null as number | null,
  });

  React.useEffect(() => {
    if (!selectedLocation) return;
    setFormData((prev) => ({
      ...prev,
      location: selectedLocation.name,
      locationId: selectedLocation.id,
    }));
  }, [selectedLocation?.id]);

  React.useEffect(() => {
    if (!user?.id) return;
    setFormData((prev) => ({ ...prev, reporterId: user.id }));
  }, [user?.id]);

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast("Geolocation is not supported by your browser");
      return;
    }
    
    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        // Store both display text and actual coordinates
        const locationText = `GPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        setFormData({ 
          ...formData, 
          location: locationText,
          gpsLat: latitude,
          gpsLng: longitude,
        });
        setIsGettingLocation(false);
      },
      () => {
        setIsGettingLocation(false);
        toast("Unable to get your location. Please enter it manually.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    const remainingSlots = 4 - formData.photos.length;
    const filesToProcess = Array.from(files).slice(0, remainingSlots);
    
    filesToProcess.forEach((file) => {
      if (file.size > 10 * 1024 * 1024) {
        toast(`File ${file.name} is too large. Max size is 10MB.`);
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({
          ...prev,
          photos: [...prev.photos, reader.result as string],
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
    }));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1: return !!formData.type;
      case 2: return !!formData.severity;
      case 3: return formData.title.length >= 5;
      case 4: return formData.description.length >= 10;
      case 5: return true; // Location is optional
      case 6: return !!formData.date && !!formData.time;
      case 7: return true; // Photos are optional
      default: return false;
    }
  };

  const handleNext = () => {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      router.back();
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    if (!user) {
      toast("Unable to submit without a user session.");
      setIsSubmitting(false);
      return;
    }
    const now = new Date();
    const refNumber = `INC-${now.getFullYear()}-${String(Math.floor(Math.random() * 999) + 1).padStart(3, "0")}`;
    const incident: Incident = {
      id: `inc_${Date.now()}`,
      company_id: user.company_id || DEFAULT_COMPANY_ID,
      reference_number: refNumber,
      reporter_id: user.id,
      type: formData.type as IncidentType,
      type_other: formData.type === "other" ? "Other" : null,
      severity: formData.severity as Severity,
      priority: formData.severity as Priority,
      title: formData.title,
      description: formData.description,
      incident_date: formData.date,
      incident_time: formData.time,
      lost_time: formData.lostTime,
      lost_time_amount: formData.lostTime ? 1 : null,
      active_hazard: formData.activeHazard,
      location_id: formData.locationId || null,
      building: null,
      floor: null,
      zone: null,
      room: null,
      gps_lat: formData.gpsLat,
      gps_lng: formData.gpsLng,
      location_description: formData.location || null,
      asset_id: null,
      media_urls: formData.photos,
      status: "new",
      flagged: false,
      resolved_at: null,
      resolved_by: null,
      resolution_notes: null,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };
    addIncident(incident);
    toast("Incident submitted");
    router.push(`/${company}/app/report/success?ref=${refNumber}`);
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 1: return t("report.whatType");
      case 2: return t("report.howSerious");
      case 3: return t("report.giveTitle");
      case 4: return t("report.whatHappened");
      case 5: return t("report.whereHappen");
      case 6: return t("report.whenHappen");
      case 7: return t("report.photos");
      default: return "";
    }
  };

  const getStepIcon = () => {
    switch (currentStep) {
      case 1: return AlertTriangle;
      case 2: return ShieldAlert;
      case 3: return FileText;
      case 4: return FileText;
      case 5: return MapPin;
      case 6: return Calendar;
      case 7: return Camera;
      default: return AlertTriangle;
    }
  };

  const StepIcon = getStepIcon();

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
          <div className="flex-1">
            <h1 className="font-semibold">{t("report.title")}</h1>
            <p className="text-xs text-muted-foreground">{t("report.stepOf", { current: String(currentStep), total: String(TOTAL_STEPS) })}</p>
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-muted" role="progressbar" aria-label="Completion progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((currentStep / TOTAL_STEPS) * 100)}>
          <div 
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${(currentStep / TOTAL_STEPS) * 100}%` }}
          />
        </div>
      </header>

      {/* Step content */}
      <div className="flex-1 p-4">
        {/* Step header with icon */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <StepIcon className="h-6 w-6 text-primary" aria-hidden="true" />
          </div>
          <h2 className="text-xl font-semibold">{getStepTitle()}</h2>
        </div>

        {/* Step 1: Incident Type */}
        {currentStep === 1 && (
          <div className="grid grid-cols-2 gap-3">
            {incidentTypes.map((type) => {
              const Icon = type.icon;
              const isSelected = formData.type === type.value;
              return (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, type: type.value })}
                  className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${
                    isSelected
                      ? "border-primary bg-primary text-white shadow-md"
                      : "border-border hover:border-primary/50 hover:bg-muted/50"
                  }`}
                >
                  <div className={`flex h-12 w-12 items-center justify-center rounded-full ${isSelected ? "bg-white/20" : "bg-muted"}`}>
                    <Icon className={`h-6 w-6 ${isSelected ? "text-white" : type.color}`} aria-hidden="true" />
                  </div>
                  <span className="text-sm font-medium">{t(type.label)}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Step 2: Severity */}
        {currentStep === 2 && (
          <div className="space-y-3">
            {severityLevels.map((level) => {
              const Icon = level.icon;
              const isSelected = formData.severity === level.value;
              return (
                <button
                  key={level.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, severity: level.value })}
                  className={`flex w-full items-center gap-4 rounded-xl border-2 p-4 text-left transition-all ${
                    isSelected
                      ? "border-primary bg-primary text-white shadow-md"
                      : `border-border hover:border-primary/50 hover:bg-muted/50`
                  }`}
                >
                  <div className={`flex h-14 w-14 items-center justify-center rounded-full ${isSelected ? "bg-white/20" : level.bgColor}`}>
                    <Icon className={`h-7 w-7 ${isSelected ? "text-white" : level.color}`} aria-hidden="true" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{t(level.label)}</p>
                    <p className={`text-sm ${isSelected ? "text-white/80" : "text-muted-foreground"}`}>{t(level.description)}</p>
                  </div>
                  {isSelected && (
                    <CheckCircle className="h-6 w-6 text-white" aria-hidden="true" />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Step 3: Title */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <Input
              placeholder={t("report.titlePlaceholder")}
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="h-14 text-lg"
            />
            <p className="text-sm text-muted-foreground">
              {formData.title.length < 5 
                ? t("report.titleMinChars", { count: String(formData.title.length) })
                : t("report.titleHint")
              }
            </p>
          </div>
        )}

        {/* Step 4: Description */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <Textarea
              placeholder="Describe what happened in detail. Include:&#10;• What occurred&#10;• Who was involved&#10;• Any injuries or damage&#10;• Witnesses present"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={8}
              className="text-base"
            />
            <p className="text-sm text-muted-foreground">
              {formData.description.length < 10 
                ? t("report.descriptionMinChars", { count: String(formData.description.length) })
                : t("report.characters", { count: String(formData.description.length) })
              }
            </p>
            
            {/* Additional questions */}
            <div className="pt-4 space-y-4 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium" id="hazard-label">{t("report.activeHazard")}</p>
                  <p className="text-sm text-muted-foreground" id="hazard-desc">{t("report.activeHazardDesc")}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={formData.activeHazard}
                  aria-labelledby="hazard-label"
                  aria-describedby="hazard-desc"
                  onClick={() => setFormData({ ...formData, activeHazard: !formData.activeHazard })}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setFormData({ ...formData, activeHazard: !formData.activeHazard }); }}}
                  className={`w-14 h-8 rounded-full transition-colors ${formData.activeHazard ? "bg-destructive" : "bg-muted"}`}
                >
                  <span className={`block w-6 h-6 rounded-full bg-white shadow transform transition-transform ${formData.activeHazard ? "translate-x-7" : "translate-x-1"}`} />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium" id="losttime-label">{t("report.lostTime")}</p>
                  <p className="text-sm text-muted-foreground" id="losttime-desc">{t("report.lostTimeDesc")}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={formData.lostTime}
                  aria-labelledby="losttime-label"
                  aria-describedby="losttime-desc"
                  onClick={() => setFormData({ ...formData, lostTime: !formData.lostTime })}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setFormData({ ...formData, lostTime: !formData.lostTime }); }}}
                  className={`w-14 h-8 rounded-full transition-colors ${formData.lostTime ? "bg-warning" : "bg-muted"}`}
                >
                  <span className={`block w-6 h-6 rounded-full bg-white shadow transform transition-transform ${formData.lostTime ? "translate-x-7" : "translate-x-1"}`} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Location */}
        {currentStep === 5 && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="location" className="text-base">{t("report.locationDescription")}</Label>
              <div className="relative mt-2">
                <MapPin className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="location"
                  placeholder={t("report.locationPlaceholder")}
                  className="h-12 pl-11 text-base"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-background px-2 text-muted-foreground">{t("report.or")}</span>
              </div>
            </div>
            <Button 
              type="button" 
              variant="outline" 
              className="h-14 w-full gap-3 text-base"
              onClick={handleGetCurrentLocation}
              disabled={isGettingLocation}
            >
              {isGettingLocation ? (
                <>
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  {t("report.gettingLocation")}
                </>
              ) : (
                <>
                  <Navigation className="h-5 w-5" />
                  {t("report.useCurrentLocation")}
                </>
              )}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              {t("report.locationOptionalHint")}
            </p>
          </div>
        )}

        {/* Step 6: Date & Time */}
        {currentStep === 6 && (
          <div className="space-y-6">
            <div>
              <Label htmlFor="date" className="text-base">{t("report.dateOfIncident")}</Label>
              <Input
                id="date"
                type="date"
                className="mt-2 h-12 text-base"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="time" className="text-base">{t("report.approximateTime")}</Label>
              <Input
                id="time"
                type="time"
                className="mt-2 h-12 text-base"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {t("report.timeEstimateHint")}
            </p>
          </div>
        )}

        {/* Step 7: Photos */}
        {currentStep === 7 && (
          <div className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              capture="environment"
              onChange={handlePhotoUpload}
              className="hidden"
              aria-label="Upload photos"
            />
            
            {/* Photo grid */}
            {formData.photos.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                {formData.photos.map((photo, index) => (
                  <div key={index} className="relative aspect-square rounded-xl overflow-hidden border">
                    <img src={photo} alt={`Photo ${index + 1}`} className="h-full w-full object-cover" />
                    <button
                      type="button"
                      aria-label={`Remove photo ${index + 1}`}
                      onClick={() => removePhoto(index)}
                      className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {formData.photos.length < 4 && (
              <>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-40 w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 transition-colors hover:border-primary hover:bg-primary/10"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/20">
                    <Camera className="h-7 w-7 text-primary" aria-hidden="true" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-primary">{t("report.takePhoto")}</p>
                    <p className="text-sm text-muted-foreground">{t("report.tapToUpload")}</p>
                  </div>
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.removeAttribute("capture");
                      fileInputRef.current.click();
                    }
                  }}
                  className="flex h-14 w-full items-center justify-center gap-3 rounded-xl border border-border transition-colors hover:bg-muted/50"
                >
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <span>{t("report.chooseFromGallery")}</span>
                </button>
              </>
            )}

            <p className="text-center text-sm text-muted-foreground">
              {formData.photos.length === 0 
                ? t("report.photosOptional")
                : t("report.photosCount", { count: String(formData.photos.length) })
              }
            </p>
          </div>
        )}
      </div>

      {/* Footer navigation */}
      <div className="fixed bottom-16 left-0 right-0 border-t bg-background p-4 z-20">
        {currentStep < TOTAL_STEPS ? (
          <Button
            onClick={handleNext}
            disabled={!canProceed()}
            className="h-14 w-full gap-2 text-base"
          >
            {t("report.continue")}
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            loading={isSubmitting}
            className="h-14 w-full gap-2 text-base"
          >
            <CheckCircle className="h-5 w-5" aria-hidden="true" />
            {t("report.submitReport")}
          </Button>
        )}
        {currentStep > 1 && currentStep < TOTAL_STEPS && (
          <Button
            variant="ghost"
            onClick={() => setCurrentStep(TOTAL_STEPS)}
            className="mt-2 w-full text-muted-foreground"
          >
            {t("report.skipOptionalSteps")}
          </Button>
        )}
      </div>
    </div>
  );
}

export default function ReportIncidentPage() {
  return <ReportIncidentPageContent />;
}
