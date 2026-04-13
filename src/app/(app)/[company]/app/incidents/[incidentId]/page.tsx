"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  User,
  AlertTriangle,
  Clock,
  CheckCircle,
  FileText,
  MessageCircle,
  Building2,
  Image as ImageIcon,
  ShieldAlert,
  Flag,
  Hash,
  Zap,
  Download,
  Camera,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useIncidentsStore } from "@/stores/incidents-store";
import { useLocationsStore } from "@/stores/locations-store";
import { useUsersStore } from "@/stores/users-store";
import { useAuth } from "@/hooks/use-auth";
import { useFieldAppSettings } from "@/components/providers/field-app-settings-provider";
import { CameraInput } from "@/components/ui/camera-input";
import { useTranslation } from "@/i18n";
import { useToast } from "@/components/ui/toast";
import { capitalize } from "@/lib/utils";
import { LoadingPage } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";
import { storeFile, getFilesForEntity, type StoredFile } from "@/lib/file-storage";
import { BodyMap } from "@/components/incidents/body-map";
import { ImageViewer } from "@/components/ui/image-viewer";

const PRIORITY_CONFIG: Record<string, { label: string; variant: string }> = {
  low: { label: "Low", variant: "low" },
  medium: { label: "Medium", variant: "medium" },
  high: { label: "High", variant: "high" },
  critical: { label: "Critical", variant: "critical" },
};

const STATUS_CONFIG: Record<string, { label: string; variant: string }> = {
  new: { label: "New", variant: "info" },
  in_progress: { label: "In Progress", variant: "in_progress" },
  in_review: { label: "In Review", variant: "in_review" },
  resolved: { label: "Resolved", variant: "resolved" },
  archived: { label: "Archived", variant: "archived" },
};

const SEVERITY_CONFIG: Record<string, { label: string; variant: string }> = {
  low: { label: "Low", variant: "low" },
  medium: { label: "Medium", variant: "medium" },
  high: { label: "High", variant: "high" },
  critical: { label: "Critical", variant: "critical" },
};

export default function EmployeeIncidentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const rawIncidentId = params.incidentId;
  const incidentId = typeof rawIncidentId === "string" ? rawIncidentId : Array.isArray(rawIncidentId) ? rawIncidentId[0] : "";
  const rawCompany = params.company;
  const company = typeof rawCompany === "string" ? rawCompany : Array.isArray(rawCompany) ? rawCompany[0] : "";
  const { user, currentCompany } = useAuth();
  const { settings: fieldAppSettings } = useFieldAppSettings();
  const { t, formatDate } = useTranslation();

  const { items: incidents, isLoading, update: updateIncident } = useIncidentsStore();
  const { items: locations } = useLocationsStore();
  const { items: users } = useUsersStore();
  const { toast } = useToast();

  const matchedIncident = incidents.find((i) => i.id === incidentId);
  const incident = matchedIncident && user?.company_id && matchedIncident.company_id !== user.company_id ? undefined : matchedIncident;
  const location = incident?.location_id ? locations.find((l) => l.id === incident.location_id) : null;
  const reporter = incident?.reporter_id ? users.find((u) => u.id === incident.reporter_id) : null;
  const isAssigned = incident?.assigned_to === user?.id;
  const isReporter = incident?.reporter_id === user?.id;
  const canUpdateStatus = isAssigned && incident?.status !== "resolved" && incident?.status !== "archived";

  const [isExporting, setIsExporting] = React.useState(false);
  const [commentText, setCommentText] = React.useState("");
  const [isSubmittingComment, setIsSubmittingComment] = React.useState(false);
  const [viewerImage, setViewerImage] = React.useState<{ src: string; index: number; source: "file" | "media" } | null>(null);

  // Load attached photos
  const [photos, setPhotos] = React.useState<StoredFile[]>([]);
  React.useEffect(() => {
    if (incident) {
      setPhotos(getFilesForEntity("incident", incident.id));
    }
  }, [incident]);

  const handleAddComment = () => {
    if (!incident || !commentText.trim() || !user) return;
    setIsSubmittingComment(true);
    const newComment = {
      id: `comment_${Date.now()}`,
      user: user.full_name || `${user.first_name} ${user.last_name}`,
      userId: user.id,
      text: commentText.trim(),
      date: new Date().toISOString(),
      avatar: `${user.first_name?.[0] || ""}${user.last_name?.[0] || ""}`,
    };
    const existingComments = incident.comments || [];
    updateIncident(incident.id, {
      comments: [...existingComments, newComment],
      updated_at: new Date().toISOString(),
    });
    setCommentText("");
    setIsSubmittingComment(false);
    toast("Comment added");
  };

  const handleStatusUpdate = (newStatus: "in_progress" | "in_review") => {
    if (!incident) return;
    updateIncident(incident.id, {
      status: newStatus,
      updated_at: new Date().toISOString(),
    });
    toast(`Status updated to ${newStatus.replace(/_/g, " ")}`);
  };

  const handleAddPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!incident || !user || !e.target.files?.length) return;
    for (const file of Array.from(e.target.files)) {
      try {
        await storeFile(file, "incident", incident.id, user.id);
      } catch (err) {
        toast(err instanceof Error ? err.message : "Upload failed", "error");
      }
    }
    setPhotos(getFilesForEntity("incident", incident.id));
    toast("Photo added");
    e.target.value = "";
  };


  const handleExportPDF = async () => {
    if (!incident) return;
    setIsExporting(true);
    try {
      const { IncidentReportPDF, downloadPDF } = await import("@/lib/pdf-export");
      const doc = <IncidentReportPDF
        companyName={currentCompany?.name || company}
        incident={{
          title: incident.title,
          type: incident.type,
          severity: incident.severity,
          priority: incident.priority,
          status: incident.status,
          incident_date: incident.incident_date,
          incident_time: incident.incident_time,
          location: location?.name,
          location_description: incident.location_description,
          building: incident.building,
          floor: incident.floor,
          zone: incident.zone,
          room: incident.room,
          description: incident.description,
          reference_number: incident.reference_number || `#${incident.id.slice(0, 8)}`,
          reporter_name: reporter?.full_name || "Unknown",
          corrective_actions: incident.actions?.map((a) => ({
            title: a.title,
            status: a.status,
            dueDate: a.dueDate,
          })),
          media_urls: incident.media_urls,
          active_hazard: incident.active_hazard,
          lost_time: incident.lost_time,
          lost_time_amount: incident.lost_time_amount,
          created_at: incident.created_at,
        }}
      />;
      await downloadPDF(doc, `incident-${incident.reference_number || incident.id.slice(0, 8)}.pdf`);
    } catch {
      // silently fail
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading && incidents.length === 0) {
    return <LoadingPage />;
  }

  if (!incident) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Incident Not Found"
        description="This incident may have been deleted or you don't have access."
        action={
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        }
      />
    );
  }

  const statusConfig = STATUS_CONFIG[incident.status] || STATUS_CONFIG.new;
  const severityConfig = SEVERITY_CONFIG[incident.severity] || SEVERITY_CONFIG.low;
  const priorityConfig = PRIORITY_CONFIG[incident.priority] || PRIORITY_CONFIG.medium;

  // Build location detail string
  const locationParts = [
    incident.building,
    incident.floor ? `Floor ${incident.floor}` : null,
    incident.zone,
    incident.room ? `Room ${incident.room}` : null,
  ].filter(Boolean);

  return (
    <div className="flex flex-col min-h-full bg-background">
      {/* Header */}
      <div className="border-b bg-background">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold truncate">{incident.title}</h1>
            <p className="text-xs text-muted-foreground">
              {incident.reference_number || `#${incident.id.slice(0, 8)}`}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleExportPDF}
            disabled={isExporting}
            className="shrink-0"
            aria-label="Export PDF"
          >
            <Download className="h-4 w-4" />
          </Button>
          {incident.status !== "new" && (
            <Badge variant={statusConfig.variant as BadgeProps["variant"]}>{statusConfig.label}</Badge>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-4 space-y-4">
        {/* Classification badges */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{capitalize(incident.type.replace(/_/g, " "))}</Badge>
          <Badge variant={severityConfig.variant as BadgeProps["variant"]}>{severityConfig.label}</Badge>
          <Badge variant={priorityConfig.variant as BadgeProps["variant"]}>{priorityConfig.label}</Badge>
        </div>
        {/* Flags */}
        {(incident.active_hazard || incident.lost_time) && (
          <div className="flex flex-wrap gap-2">
            {incident.active_hazard && (
              <div className="flex items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-0.5">
                <Zap className="h-3 w-3 text-red-500" />
                <span className="text-xs font-medium text-red-600 dark:text-red-400">Active Hazard</span>
              </div>
            )}
            {incident.lost_time && (
              <div className="flex items-center gap-1.5 rounded-full bg-amber-200 px-2.5 py-0.5">
                <Clock className="h-3 w-3 !text-black" />
                <span className="text-xs font-semibold !text-black">
                  Lost Time{incident.lost_time_amount ? ` (${incident.lost_time_amount}h)` : ""}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Key Details */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Date & Time</p>
                <p className="text-sm font-medium">
                  {formatDate(incident.incident_date)}
                  {incident.incident_time ? ` at ${incident.incident_time}` : ""}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Location</p>
                <p className="text-sm font-medium">{location?.name || "Not specified"}</p>
                {incident.location_description && (
                  <p className="text-xs text-muted-foreground mt-0.5">{incident.location_description}</p>
                )}
              </div>
            </div>

            {/* Building / Floor / Zone / Room */}
            {locationParts.length > 0 && (
              <div className="flex items-center gap-3">
                <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Specific Location</p>
                  <p className="text-sm font-medium">{locationParts.join(" · ")}</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Reported By</p>
                <p className="text-sm font-medium">{reporter?.full_name || "Unknown"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Description */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Description
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {incident.description || t("incidents.noDescription") || "No description provided."}
            </p>
          </CardContent>
        </Card>

        {/* Body map — injury incidents only */}
        {incident.type === "injury" && incident.injury_locations && incident.injury_locations.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Injury location</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <BodyMap markers={incident.injury_locations} readOnly />
            </CardContent>
          </Card>
        )}

        {/* Photos / Attachments */}
        {(photos.length > 0 || (incident.media_urls && incident.media_urls.length > 0)) && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Photos & Attachments ({photos.length + (incident.media_urls?.length || 0)})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {photos.map((file, idx) => (
                  <button
                    key={file.id}
                    type="button"
                    onClick={() => file.type?.startsWith("image/") && setViewerImage({ src: file.dataUrl, index: idx, source: "file" })}
                    className="relative aspect-square rounded-lg overflow-hidden bg-muted"
                  >
                    {file.type?.startsWith("image/") ? (
                      <img src={file.dataUrl} alt={file.name} className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center p-2">
                        <FileText className="h-6 w-6 text-muted-foreground" />
                        <p className="text-[10px] text-muted-foreground mt-1 truncate w-full text-center">{file.name}</p>
                      </div>
                    )}
                  </button>
                ))}
                {incident.media_urls?.filter((url) => !photos.some((p) => p.dataUrl === url)).map((url, idx) => (
                  <button
                    key={`media-${idx}`}
                    type="button"
                    onClick={() => url.startsWith("data:image") && setViewerImage({ src: url, index: idx, source: "media" })}
                    className="relative aspect-square rounded-lg overflow-hidden bg-muted"
                  >
                    {url.startsWith("data:image") ? (
                      <img src={url} alt={`Photo ${idx + 1}`} className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <ImageIcon className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Timeline/Progress */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Status Timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <CheckCircle className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Reported</p>
                  <p className="text-xs text-muted-foreground">{formatDate(incident.created_at)}</p>
                </div>
              </div>

              {incident.status !== "new" && (
                <div className="flex items-center gap-3">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                    incident.status === "in_progress" ? "bg-amber-100" : 
                    incident.status === "in_review" ? "bg-purple-100" : "bg-green-100"
                  }`}>
                    <CheckCircle className={`h-4 w-4 ${
                      incident.status === "in_progress" ? "text-amber-600" : 
                      incident.status === "in_review" ? "text-purple-600" : "text-green-600"
                    }`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {incident.status === "in_progress" ? "Under Investigation" : 
                       incident.status === "in_review" ? "Under Review" : "Investigation Complete"}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDate(incident.updated_at)}</p>
                  </div>
                </div>
              )}

              {(incident.status === "resolved" || incident.status === "archived") && (
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Resolved</p>
                    <p className="text-xs text-muted-foreground">{formatDate(incident.updated_at)}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Comments */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Updates {incident.comments && incident.comments.length > 0 ? `(${incident.comments.length})` : ""}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {incident.comments && incident.comments.length > 0 ? (
              incident.comments.map((comment) => {
                const author = users.find((u) => u.id === comment.userId);
                return (
                  <div key={comment.id} className="border-l-2 border-muted pl-3 py-1">
                    <p className="text-sm">{comment.text}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {author?.full_name || comment.user} • {formatDate(comment.date)}
                    </p>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-muted-foreground py-2">No updates yet</p>
            )}

            {/* Add comment */}
            <div className="flex gap-2 pt-2 border-t">
              <Textarea
                placeholder="Add a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                rows={2}
                className="flex-1 text-sm"
              />
              <Button
                size="icon"
                className="shrink-0 self-end"
                disabled={!commentText.trim() || isSubmittingComment}
                onClick={handleAddComment}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Actions if available */}
        {incident.actions && incident.actions.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Corrective Actions ({incident.actions.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              {incident.actions.map((action) => (
                <div key={action.id} className="flex items-start gap-2 p-2 rounded bg-muted/50">
                  <div className={`mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                    action.status === "completed" ? "bg-green-500 border-green-500" : "border-muted-foreground"
                  }`}>
                    {action.status === "completed" && <CheckCircle className="h-3 w-3 text-white" />}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm ${action.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
                      {action.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Due: {action.dueDate ? formatDate(action.dueDate) : "Not set"}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
        {/* Actions */}
        {incident.status !== "resolved" && incident.status !== "archived" && (
          <div className="flex gap-2">
            <label className="flex-1 cursor-pointer">
              <CameraInput className="hidden" cameraOnly={fieldAppSettings.cameraOnly} multiple onChange={handleAddPhoto} />
              <span className="flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted transition-colors w-full">
                <Camera className="h-4 w-4" />
                Add photo
              </span>
            </label>
            {canUpdateStatus && incident.status === "new" && (
              <Button variant="outline" className="flex-1" onClick={() => handleStatusUpdate("in_progress")}>
                In progress
              </Button>
            )}
            {canUpdateStatus && incident.status === "in_progress" && (
              <Button variant="outline" className="flex-1" onClick={() => handleStatusUpdate("in_review")}>
                Submit for review
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Image viewer */}
      {viewerImage && (
        <ImageViewer
          src={viewerImage.src}
          alt="Incident photo"
          onClose={() => setViewerImage(null)}
          onSave={(annotated) => {
            if (!incident) return;
            if (viewerImage.source === "media" && incident.media_urls) {
              const updated = [...incident.media_urls];
              // Find the actual index in the full media_urls array
              const filtered = incident.media_urls.filter((url) => !photos.some((p) => p.dataUrl === url));
              const originalUrl = filtered[viewerImage.index];
              const fullIdx = incident.media_urls.indexOf(originalUrl);
              if (fullIdx >= 0) updated[fullIdx] = annotated;
              updateIncident(incident.id, { media_urls: updated, updated_at: new Date().toISOString() });
            }
            setViewerImage(null);
          }}
        />
      )}
    </div>
  );
}
