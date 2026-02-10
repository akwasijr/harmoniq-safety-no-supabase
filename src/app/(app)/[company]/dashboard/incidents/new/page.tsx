"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCompanyParam } from "@/hooks/use-company-param";
import { AlertTriangle, Camera, X, Loader2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useLocationsStore } from "@/stores/locations-store";
import { useIncidentsStore } from "@/stores/incidents-store";
import { useAssetsStore } from "@/stores/assets-store";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/hooks/use-auth";
import type { Incident, IncidentType, Severity, Priority } from "@/types";
import { useTranslation } from "@/i18n";
import { DEFAULT_COMPANY_ID, DEFAULT_USER_ID } from "@/mocks/data";

const INCIDENT_TYPES: { value: IncidentType; label: string }[] = [
  { value: "injury", label: "Injury" },
  { value: "near_miss", label: "Near Miss" },
  { value: "property_damage", label: "Property Damage" },
  { value: "environmental", label: "Environmental" },
  { value: "security", label: "Security" },
  { value: "fire", label: "Fire" },
  { value: "equipment_failure", label: "Equipment Failure" },
  { value: "spill", label: "Spill" },
  { value: "hazard", label: "Hazard" },
  { value: "other", label: "Other" },
];

const SEVERITY_LEVELS: { value: Severity; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

const PRIORITY_LEVELS: { value: Priority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

export default function NewIncidentPage() {
  const router = useRouter();
  const company = useCompanyParam();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { t, formatDate } = useTranslation();
  const { items: locations } = useLocationsStore();
  const { add: addIncident } = useIncidentsStore();
  const { items: allAssets } = useAssetsStore();
  const { toast } = useToast();
  
  // Form state matching IncidentFormData interface
  const [formData, setFormData] = React.useState({
    type: "near_miss" as IncidentType,
    type_other: "",
    severity: "medium" as Severity,
    priority: "medium" as Priority,
    title: "",
    description: "",
    incident_date: new Date().toISOString().split("T")[0],
    incident_time: new Date().toTimeString().slice(0, 5),
    lost_time: false,
    lost_time_amount: 0,
    active_hazard: false,
    location_id: "",
    building: "",
    floor: "",
    zone: "",
    room: "",
    location_description: "",
    asset_id: "",
  });
  const [photos, setPhotos] = React.useState<string[]>([]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    Array.from(files).slice(0, 5 - photos.length).forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotos((prev) => [...prev, reader.result as string].slice(0, 5));
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const now = new Date();
    const incident: Incident = {
      id: `inc_${Date.now()}`,
      company_id: company || user?.company_id || DEFAULT_COMPANY_ID,
      reference_number: `INC-${now.getTime().toString().slice(-6)}`,
      reporter_id: user?.id || DEFAULT_USER_ID,
      type: formData.type,
      type_other: formData.type === "other" ? formData.type_other || null : null,
      severity: formData.severity,
      priority: formData.priority,
      title: formData.title,
      description: formData.description,
      incident_date: formData.incident_date,
      incident_time: formData.incident_time,
      lost_time: formData.lost_time,
      lost_time_amount: formData.lost_time ? formData.lost_time_amount : null,
      active_hazard: formData.active_hazard,
      location_id: formData.location_id || null,
      building: formData.building || null,
      floor: formData.floor || null,
      zone: formData.zone || null,
      room: formData.room || null,
      gps_lat: null,
      gps_lng: null,
      location_description: formData.location_description || null,
      asset_id: formData.asset_id || null,
      media_urls: photos,
      status: "new",
      flagged: false,
      resolved_at: null,
      resolved_by: null,
      resolution_notes: null,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };
    addIncident(incident);
    setIsSubmitting(false);
    toast("Incident reported successfully");
    router.push(`/${company}/dashboard/incidents`);
  };

  const isValid = formData.title.trim() && formData.description.trim();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="heading-2">{t("incidents.reportIncident")}</h1>
          <p className="text-sm text-muted-foreground">
            Complete form to report a safety incident
          </p>
        </div>
        <Link href={`/${company}/dashboard/incidents`}>
          <Button variant="outline">{t("common.back")}</Button>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column - Basic Details */}
        <Card>
          <CardHeader>
            <CardTitle>{t("incidents.newIncident")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">{t("incidents.labels.title")} *</Label>
              <Input 
                id="title" 
                placeholder="Brief description of the incident"
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("incidents.labels.type")} *</Label>
                <Select 
                  value={formData.type} 
                  onValueChange={(v) => setFormData((prev) => ({ ...prev, type: v as IncidentType }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {INCIDENT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.type === "other" && (
                <div className="space-y-2">
                  <Label htmlFor="type_other">Specify type</Label>
                  <Input
                    id="type_other"
                    placeholder="Describe type"
                    value={formData.type_other}
                    onChange={(e) => setFormData((prev) => ({ ...prev, type_other: e.target.value }))}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>{t("incidents.labels.severity")} *</Label>
                <Select 
                  value={formData.severity} 
                  onValueChange={(v) => setFormData((prev) => ({ ...prev, severity: v as Severity }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SEVERITY_LEVELS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t("incidents.labels.priority")} *</Label>
                <Select 
                  value={formData.priority} 
                  onValueChange={(v) => setFormData((prev) => ({ ...prev, priority: v as Priority }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIORITY_LEVELS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="incident_date">{t("incidents.labels.date")} *</Label>
                <Input
                  id="incident_date"
                  type="date"
                  value={formData.incident_date}
                  onChange={(e) => setFormData((prev) => ({ ...prev, incident_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="incident_time">{t("incidents.labels.time")} *</Label>
                <Input
                  id="incident_time"
                  type="time"
                  value={formData.incident_time}
                  onChange={(e) => setFormData((prev) => ({ ...prev, incident_time: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{t("incidents.labels.description")} *</Label>
              <Textarea
                id="description"
                placeholder="Describe what happened, who was involved, and any immediate actions taken…"
                rows={5}
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label htmlFor="lost_time" className="cursor-pointer">{t("incidents.labels.lostTime")}?</Label>
                <p className="text-xs text-muted-foreground">Did this result in time away from work?</p>
              </div>
              <Switch
                id="lost_time"
                checked={formData.lost_time}
                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, lost_time: checked }))}
              />
            </div>

            {formData.lost_time && (
              <div className="space-y-2">
                <Label htmlFor="lost_time_amount">{t("incidents.labels.hoursLost")}</Label>
                <Input
                  id="lost_time_amount"
                  type="number"
                  min="0"
                  value={formData.lost_time_amount}
                  onChange={(e) => setFormData((prev) => ({ ...prev, lost_time_amount: Number(e.target.value) }))}
                />
              </div>
            )}

            <div className="flex items-center justify-between rounded-lg border p-3 border-destructive/50 bg-destructive/5">
              <div>
                <Label htmlFor="active_hazard" className="cursor-pointer text-destructive">{t("incidents.labels.activeHazard")}?</Label>
                <p className="text-xs text-muted-foreground">Is there still an active danger at the location?</p>
              </div>
              <Switch
                id="active_hazard"
                checked={formData.active_hazard}
                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, active_hazard: checked }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Right Column - Location & Photos */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("incidents.labels.location")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t("incidents.labels.location")}</Label>
                <Select 
                  value={formData.location_id} 
                  onValueChange={(v) => setFormData((prev) => ({ ...prev, location_id: v }))}
                >
                  <SelectTrigger><SelectValue placeholder="Select a location" /></SelectTrigger>
                  <SelectContent>
                    {locations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="building">Building</Label>
                  <Input
                    id="building"
                    placeholder="Building A"
                    value={formData.building}
                    onChange={(e) => setFormData((prev) => ({ ...prev, building: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="floor">Floor</Label>
                  <Input
                    id="floor"
                    placeholder="2nd Floor"
                    value={formData.floor}
                    onChange={(e) => setFormData((prev) => ({ ...prev, floor: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zone">Zone</Label>
                  <Input
                    id="zone"
                    placeholder="Loading dock"
                    value={formData.zone}
                    onChange={(e) => setFormData((prev) => ({ ...prev, zone: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="room">Room</Label>
                  <Input
                    id="room"
                    placeholder="Room 203"
                    value={formData.room}
                    onChange={(e) => setFormData((prev) => ({ ...prev, room: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location_description">Location description</Label>
                <Textarea
                  id="location_description"
                  placeholder="Additional details about the exact location…"
                  rows={2}
                  value={formData.location_description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, location_description: e.target.value }))}
                />
              </div>
            </CardContent>
          </Card>

          {/* Related Asset */}
          <Card>
            <CardHeader>
              <CardTitle>{t("incidents.labels.relatedAsset")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Label>Asset involved (optional)</Label>
              <Select 
                value={formData.asset_id} 
                onValueChange={(v) => setFormData((prev) => ({ ...prev, asset_id: v }))}
              >
                <SelectTrigger><SelectValue placeholder="Select an asset" /></SelectTrigger>
                <SelectContent>
                  {allAssets.filter(a => a.status !== "retired").map((asset) => (
                    <SelectItem key={asset.id} value={asset.id}>
                      {asset.name} ({asset.asset_tag})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formData.asset_id && (
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => setFormData((prev) => ({ ...prev, asset_id: "" }))}>
                  Clear selection
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("incidents.labels.photos")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">Add up to 5 photos of the incident scene</p>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handlePhotoUpload}
              />
              
              {photos.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {photos.map((photo, index) => (
                    <div key={photo} className="relative aspect-square rounded-lg overflow-hidden border">
                      <img src={photo} alt={`Photo ${index + 1}`} className="h-full w-full object-cover" />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6"
                        onClick={() => removePhoto(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              
              {photos.length < 5 && (
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className="h-4 w-4" />
                  Add photo ({photos.length}/5)
                </Button>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Link href={`/${company}/dashboard/incidents`}>
              <Button variant="outline" className="w-full sm:w-auto">{t("common.cancel")}</Button>
            </Link>
            <Button 
              className="gap-2" 
              disabled={!isValid || isSubmitting}
              onClick={handleSubmit}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              {isSubmitting ? t("common.loading") : t("incidents.buttons.submitIncident")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
