"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocationsStore } from "@/stores/locations-store";
import { useIncidentsStore } from "@/stores/incidents-store";
import { useTicketsStore } from "@/stores/tickets-store";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/hooks/use-auth";
import { TIMEOUTS } from "@/lib/constants";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCompanyParam } from "@/hooks/use-company-param";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { Incident, IncidentType, Severity, Priority } from "@/types";
import { useTranslation } from "@/i18n";
import { storeFile, getFilesForEntity, deleteFile, FileValidationError, MAX_INCIDENT_PHOTOS, type StoredFile } from "@/lib/file-storage";
import { BodyMap, type InjuryMarker } from "@/components/incidents/body-map";
import { enqueueReport, isOnline as isOnlineFn } from "@/lib/offline-queue";
import { compressImage } from "@/lib/image-compression";
import { LocationPicker, type LocationPickerValue } from "@/components/ui/location-picker";

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

const STEP_ICONS: Record<number, React.ComponentType<{ className?: string }>> = {
  1: AlertTriangle,
  2: ShieldAlert,
  3: FileText,
  4: FileText,
  5: MapPin,
  6: Calendar,
  7: Camera,
};

function ReportIncidentPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locationParam = searchParams.get("location");
  const assetParam = searchParams.get("asset");
  const company = useCompanyParam();
  const [currentStep, setCurrentStep] = React.useState(1);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { items: locations } = useLocationsStore();
  const { add: addIncident, items: incidents } = useIncidentsStore({ skipLoad: true });
  const { add: addTicket } = useTicketsStore({ skipLoad: true });
  const { toast } = useToast();
  const { user, currentCompany } = useAuth();

  const { t } = useTranslation();

  const [stepErrors, setStepErrors] = React.useState<Record<string, string>>({});

  const validateStep = (step: number): boolean => {
    const next: Record<string, string> = {};
    switch (step) {
      case 1:
        if (!formData.type) next.type = t("validation.selectOption");
        break;
      case 2:
        if (!formData.severity) next.severity = t("validation.selectOption");
        break;
      case 3:
        if (!formData.title.trim()) {
          next.title = t("validation.required");
        } else if (formData.title.trim().length < 3) {
          next.title = t("validation.minLength", { min: "3" });
        }
        break;
      case 4:
        if (formData.description.trim().length > 0 && formData.description.trim().length < 10) {
          next.description = t("validation.minLength", { min: "10" });
        }
        break;
      case 6:
        if (!formData.date) next.date = t("validation.required");
        break;
    }
    setStepErrors(next);
    return Object.keys(next).length === 0;
  };

  const selectedLocation = locationParam
    ? locations.find((location) => location.id === locationParam)
    : null;
  
  const [reportLocationValue, setReportLocationValue] = React.useState<LocationPickerValue>({
    locationId: selectedLocation?.id || "",
    manualText: "",
    gpsLat: null,
    gpsLng: null,
  });

  const [formData, setFormData] = React.useState({
    type: "",
    severity: "",
    title: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
    time: new Date().toTimeString().slice(0, 5),
    photos: [] as string[],
    photoFileIds: [] as string[],
    lostTime: false,
    lostTimeDays: "",
    activeHazard: false,
    anonymous: false,
    reporterId: user?.id || "",
  });

  const [incidentDraftId] = React.useState(() => `draft_${Date.now()}`);
  const [injuryMarkers, setInjuryMarkers] = React.useState<InjuryMarker[]>([]);
  React.useEffect(() => {
    if (!selectedLocation) return;
    setReportLocationValue((prev) => ({
      ...prev,
      locationId: selectedLocation.id,
    }));
  }, [selectedLocation?.id]);

  React.useEffect(() => {
    if (!user?.id) return;
    setFormData((prev) => ({ ...prev, reporterId: user.id }));
  }, [user?.id]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    const remainingSlots = MAX_INCIDENT_PHOTOS - formData.photos.length;
    const filesToProcess = Array.from(files).slice(0, remainingSlots);
    
    for (const file of filesToProcess) {
      try {
        const stored = await storeFile(
          file,
          "incident",
          incidentDraftId,
          user?.id || "unknown",
        );
        const compressed = await compressImage(stored.dataUrl);
        setFormData((prev) => ({
          ...prev,
          photos: [...prev.photos, compressed],
          photoFileIds: [...prev.photoFileIds, stored.id],
        }));
      } catch (err) {
        if (err instanceof FileValidationError) {
          toast(err.message, "error");
        } else if (err instanceof Error && err.message === "QUOTA_EXCEEDED") {
          toast("Storage is full. Delete some files and try again.", "error");
        } else {
          toast(`Failed to upload ${file.name}`, "error");
        }
      }
    }
  };

  const removePhoto = (index: number) => {
    const fileId = formData.photoFileIds[index];
    if (fileId) deleteFile(fileId);
    setFormData((prev) => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
      photoFileIds: prev.photoFileIds.filter((_, i) => i !== index),
    }));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1: return !!formData.type;
      case 2: return !!formData.severity;
      case 3: return formData.title.length >= 3;
      case 4: return formData.description.length === 0 || formData.description.length >= 10;
      case 5: return true; // Location is optional
      case 6: return !!formData.date && !!formData.time;
      case 7: return true; // Photos are optional
      default: return false;
    }
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) return;
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
    const existingCount = incidents.filter((i) => i.company_id === user.company_id).length;
    const seqNum = existingCount + 1;
    const refNumber = `INC-${now.getFullYear()}-${String(seqNum).padStart(4, "0")}`;
    const incident: Incident = {
      id: crypto.randomUUID(),
      company_id: user.company_id || currentCompany?.id || "",
      reference_number: refNumber,
      reporter_id: formData.anonymous ? "__anonymous__" : user.id,
      type: formData.type as IncidentType,
      type_other: formData.type === "other" ? "Other" : null,
      severity: formData.severity as Severity,
      priority: (formData.severity === "critical" || formData.severity === "high" ? "high" : formData.severity === "medium" ? "medium" : "low") as Priority,
      title: formData.title,
      description: formData.description,
      incident_date: formData.date,
      incident_time: formData.time,
      lost_time: formData.lostTime,
      lost_time_amount: formData.lostTime && formData.lostTimeDays ? parseInt(formData.lostTimeDays, 10) : null,
      lost_time_restricted_days: null,
      lost_time_return_date: null,
      lost_time_updated_at: null,
      lost_time_updated_by: null,
      active_hazard: formData.activeHazard,
      location_id: reportLocationValue.locationId || null,
      building: null,
      floor: null,
      zone: null,
      room: null,
      gps_lat: reportLocationValue.gpsLat,
      gps_lng: reportLocationValue.gpsLng,
      location_description: reportLocationValue.manualText || (locations.find((l) => l.id === reportLocationValue.locationId)?.name) || null,
      asset_id: assetParam || null,
      media_urls: formData.photos,
      injury_locations: formData.type === "injury" ? injuryMarkers : [],
      status: "new",
      flagged: false,
      resolved_at: null,
      resolved_by: null,
      resolution_notes: null,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };
    try {
      if (isOnlineFn()) {
        addIncident(incident);
        // Auto-create investigation ticket for critical/high
        if (incident.severity === "critical" || incident.severity === "high") {
          addTicket({
            id: crypto.randomUUID(),
            company_id: incident.company_id,
            title: `Investigate: ${incident.title}`,
            description: `Auto-created for ${incident.severity} severity incident ${incident.reference_number}`,
            priority: incident.severity === "critical" ? "critical" : "high",
            status: "new",
            due_date: null,
            assigned_to: null,
            assigned_groups: [],
            incident_ids: [incident.id],
            created_by: user?.id || "",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
        toast("Incident submitted");
      } else {
        enqueueReport(incident, formData.photoFileIds);
        toast("Saved offline — will sync when connected");
      }
      router.push(`/${company}/app/report/success?ref=${refNumber}&id=${incident.id}`);
    } catch (err) {
      console.error("[Report] Submission failed:", err);
      enqueueReport(incident, formData.photoFileIds);
      toast("Saved offline — will sync when connected");
      router.push(`/${company}/app/report/success?ref=${refNumber}&id=${incident.id}`);
    }
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
        <div className="h-1 bg-muted" role="progressbar" aria-label={t("common.completionProgress")} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((currentStep / TOTAL_STEPS) * 100)}>
          <div 
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${(currentStep / TOTAL_STEPS) * 100}%` }}
          />
        </div>
      </header>

      {/* Step content */}
      <div className="flex-1 p-4 pb-40">
        {/* Step header */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold">{getStepTitle()}</h2>
        </div>

        {/* Step 1: Incident Type */}
        {currentStep === 1 && (
          <>
          <div className="grid grid-cols-2 gap-3">
            {incidentTypes.map((type) => {
              const Icon = type.icon;
              const isSelected = formData.type === type.value;
              return (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => { setFormData({ ...formData, type: type.value }); setStepErrors({}); }}
                  className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${
                    isSelected
                      ? "border-primary bg-primary text-white shadow-sm"
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
          {stepErrors.type && <p className="text-sm text-red-500 mt-3">{stepErrors.type}</p>}

          <button
            type="button"
            onClick={() => setFormData({ ...formData, anonymous: !formData.anonymous })}
            className="flex w-full items-center justify-between rounded-xl border px-4 py-3 mt-4 transition-colors hover:bg-muted/50"
          >
            <div className="flex items-center gap-3">
              <ShieldAlert className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Report anonymously</span>
            </div>
            <div className={`h-5 w-9 rounded-full transition-colors ${formData.anonymous ? "bg-primary" : "bg-muted"}`}>
              <div className={`h-5 w-5 rounded-full bg-white shadow transition-transform ${formData.anonymous ? "translate-x-4" : "translate-x-0"}`} />
            </div>
          </button>
          </>
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
                  onClick={() => { setFormData({ ...formData, severity: level.value }); setStepErrors({}); }}
                  className={`flex w-full items-center gap-4 rounded-xl border-2 p-4 text-left transition-all ${
                    isSelected
                      ? "border-primary bg-primary text-white shadow-sm"
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

            {/* Body map for injury type */}
            {formData.type === "injury" && formData.severity && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Mark injury location {injuryMarkers.length > 0 ? `(${injuryMarkers.length} marked)` : "(optional)"}
                </p>
                <BodyMap
                  markers={injuryMarkers}
                  onAddMarker={(marker) => setInjuryMarkers((prev) => [...prev, marker])}
                  onRemoveMarker={(id) => setInjuryMarkers((prev) => prev.filter((m) => m.id !== id))}
                />
              </div>
            )}
          </div>
        )}

        {/* Step 3: Title */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <Input
              autoFocus
              placeholder={t("report.titlePlaceholder")}
              value={formData.title}
              onChange={(e) => {
                setFormData({ ...formData, title: e.target.value });
                if (stepErrors.title) setStepErrors({});
              }}
              onBlur={() => validateStep(3)}
              className={`h-14 text-lg ${stepErrors.title ? "border-red-500" : ""}`}
              maxLength={200}
            />
            {stepErrors.title && <p className="text-sm text-red-500">{stepErrors.title}</p>}
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
              {formData.lostTime && (
                <div className="ml-0 mt-2">
                  <label htmlFor="lost-days" className="text-sm text-muted-foreground">Estimated days away from work</label>
                  <input
                    id="lost-days"
                    type="number"
                    min="1"
                    max="365"
                    value={formData.lostTimeDays}
                    onChange={(e) => setFormData({ ...formData, lostTimeDays: e.target.value })}
                    placeholder="e.g. 3"
                    className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Can be updated later by your manager</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 5: Location */}
        {currentStep === 5 && (
          <div className="space-y-4">
            <LocationPicker
              locations={locations.map((l) => ({ id: l.id, name: l.name, address: l.address }))}
              value={reportLocationValue}
              onChange={setReportLocationValue}
              label={t("report.locationDescription")}
            />
            <p className="text-center text-sm text-muted-foreground">
              {t("report.locationOptionalHint")}
            </p>
          </div>
        )}

        {/* Step 6: Date & Time */}
        {currentStep === 6 && (
          <div className="space-y-6">
            <div>
              <Label htmlFor="report-date" className="text-base">{t("report.dateOfIncident")} <span className="text-destructive">*</span></Label>
              <Input
                id="report-date"
                type="date"
                className={`mt-2 h-12 text-base ${stepErrors.date ? "border-red-500" : ""}`}
                value={formData.date}
                max={new Date().toISOString().split("T")[0]}
                onChange={(e) => {
                  setFormData({ ...formData, date: e.target.value });
                  if (stepErrors.date) setStepErrors({});
                }}
              />
              {stepErrors.date && <p className="text-sm text-red-500 mt-1">{stepErrors.date}</p>}
            </div>
            <div>
              <Label htmlFor="report-time" className="text-base">{t("report.approximateTime")} <span className="text-destructive">*</span></Label>
              <Input
                id="report-time"
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
              accept="image/png,image/jpeg,image/gif,image/webp"
              multiple
              capture="environment"
              onChange={handlePhotoUpload}
              className="hidden"
              aria-label={t("common.uploadPhotos")}
            />
            
            {/* Photo grid */}
            {formData.photos.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                {formData.photos.map((photo, index) => (
                  <div key={index} className="relative aspect-square rounded-xl overflow-hidden border">
                    <img src={photo} alt={`Incident evidence photo ${index + 1}`} className="h-full w-full object-cover" loading="lazy" />
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
            
            {formData.photos.length < MAX_INCIDENT_PHOTOS && (
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
      <div className="fixed bottom-0 left-0 right-0 border-t bg-background p-4 pb-6 z-20 safe-area-inset-bottom">
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
            disabled={isSubmitting}
            className="h-14 w-full gap-2 text-base"
          >
            <CheckCircle className="h-5 w-5" aria-hidden="true" />
            {t("report.submitReport")}
          </Button>
        )}
        {currentStep === 5 && (
          <Button
            variant="ghost"
            onClick={() => setCurrentStep(6)}
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
  return (
    <React.Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      }
    >
      <ReportIncidentPageContent />
    </React.Suspense>
  );
}
