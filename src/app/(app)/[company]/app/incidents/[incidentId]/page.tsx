"use client";

import * as React from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
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
  Image as ImageIcon,
  Zap,
  Camera,
  Send,
  ClipboardList,
  LayoutGrid,
  Upload,
  X,
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
import { ImageViewer } from "@/components/ui/image-viewer";

type TabKey = "overview" | "tasks" | "comments";

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: "overview", label: "Overview", icon: LayoutGrid },
  { key: "tasks", label: "Tasks", icon: ClipboardList },
  { key: "comments", label: "Comments", icon: MessageCircle },
];

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
  closed: { label: "Closed", variant: "resolved" },
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
  const searchParams = useSearchParams();
  const rawIncidentId = params.incidentId;
  const incidentId = typeof rawIncidentId === "string" ? rawIncidentId : Array.isArray(rawIncidentId) ? rawIncidentId[0] : "";
  const rawCompany = params.company;
  const company = typeof rawCompany === "string" ? rawCompany : Array.isArray(rawCompany) ? rawCompany[0] : "";
  const { user } = useAuth();
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
  const canUpdateStatus = isAssigned && incident?.status !== "resolved" && incident?.status !== "archived";

  // Tab state — default from ?tab= query param
  const initialTab = (searchParams.get("tab") as TabKey) || "overview";
  const [activeTab, setActiveTab] = React.useState<TabKey>(
    ["overview", "tasks", "comments"].includes(initialTab) ? initialTab : "overview"
  );

  // Core UI state
  const [viewerImage, setViewerImage] = React.useState<{ src: string; index: number; source: "file" | "media" } | null>(null);

  // Comment state
  const [commentText, setCommentText] = React.useState("");
  const [isSubmittingComment, setIsSubmittingComment] = React.useState(false);
  const [commentTaggedUsers, setCommentTaggedUsers] = React.useState<string[]>([]);
  const [showTagPicker, setShowTagPicker] = React.useState(false);
  const [tagSearch, setTagSearch] = React.useState("");
  const [commentAttachments, setCommentAttachments] = React.useState<Array<{ id: string; name: string; url: string; type: string }>>([]);

  // Photos state
  const [photos, setPhotos] = React.useState<StoredFile[]>([]);
  React.useEffect(() => {
    if (incident) {
      setPhotos(getFilesForEntity("incident", incident.id));
    }
  }, [incident]);

  // Close tag picker on outside tap
  const tagPickerRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!showTagPicker) return;
    const handler = (e: MouseEvent) => {
      if (tagPickerRef.current && !tagPickerRef.current.contains(e.target as Node)) {
        setShowTagPicker(false);
        setTagSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showTagPicker]);

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
      mentionedUserIds: commentTaggedUsers.length > 0 ? commentTaggedUsers : undefined,
      attachments: commentAttachments.length > 0 ? commentAttachments : undefined,
    };
    const existingComments = incident.comments || [];
    updateIncident(incident.id, {
      comments: [...existingComments, newComment],
      updated_at: new Date().toISOString(),
    });
    setCommentText("");
    setCommentTaggedUsers([]);
    setCommentAttachments([]);
    setIsSubmittingComment(false);
    toast("Comment added");
  };

  const handleCommentFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files).slice(0, 3)) {
      if (file.size > 10 * 1024 * 1024) { toast("File too large (max 10MB)", "error"); continue; }
      const reader = new FileReader();
      reader.onload = () => {
        setCommentAttachments(prev => [...prev, {
          id: crypto.randomUUID(),
          name: file.name,
          url: reader.result as string,
          type: file.type,
        }]);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = "";
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

  // Derived counts
  const photoCount = (photos.length || 0) + (incident?.media_urls?.filter((url) => !photos.some((p) => p.dataUrl === url)).length || 0);
  const taskCount = incident?.actions?.length || 0;
  const commentCount = incident?.comments?.length || 0;

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

  const locationParts = [
    incident.building,
    incident.floor ? `Floor ${incident.floor}` : null,
    incident.zone,
    incident.room ? `Room ${incident.room}` : null,
  ].filter(Boolean);

  return (
    <div className="flex flex-col min-h-full bg-background">
      {/* ── Sticky Header ── */}
      <header className="sticky top-0 z-30 border-b bg-background">
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
          {incident.status !== "new" && (
            <Badge variant={statusConfig.variant as BadgeProps["variant"]}>{statusConfig.label}</Badge>
          )}
        </div>
      </header>

      {/* ── Sticky Tab Bar ── */}
      <nav className="sticky top-[57px] z-20 bg-background px-4 pt-3 pb-2">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            const count = tab.key === "tasks" ? taskCount : tab.key === "comments" ? commentCount : 0;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all active:scale-95 ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
                {count > 0 && (
                  <span className={`rounded-full px-1.5 text-[10px] font-medium leading-4 min-w-[18px] text-center ${
                    isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-background text-muted-foreground"
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* ── Tab Content ── */}
      <div className="flex-1 px-4 py-4 space-y-4">

        {/* ════════════ OVERVIEW TAB ════════════ */}
        {activeTab === "overview" && (
          <>
            {/* Flags — only if active hazard */}
            {incident.active_hazard && (
              <div className="flex flex-wrap gap-2">
                <div className="flex items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-0.5">
                  <Zap className="h-3 w-3 text-red-500" />
                  <span className="text-xs font-medium text-red-600 dark:text-red-400">Active Hazard</span>
                </div>
              </div>
            )}

            {/* Key Details */}
            <Card>
              <CardContent className="p-4 space-y-3.5">
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Date & Time</p>
                    <p className="text-sm font-medium">
                      {formatDate(incident.incident_date)}
                      {incident.incident_time ? ` at ${incident.incident_time}` : ""}
                    </p>
                  </div>
                </div>
                <div className="border-t" />

                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Location</p>
                    <p className="text-sm font-medium">{location?.name || "Not specified"}</p>
                    {locationParts.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-0.5">{locationParts.join(" · ")}</p>
                    )}
                  </div>
                </div>
                <div className="border-t" />

                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 grid grid-cols-3 gap-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Type</p>
                      <p className="text-sm font-medium">{capitalize(incident.type.replace(/_/g, " "))}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Severity</p>
                      <p className="text-sm font-medium">{severityConfig.label}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Priority</p>
                      <p className="text-sm font-medium">{priorityConfig.label}</p>
                    </div>
                  </div>
                </div>
                <div className="border-t" />

                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Reported By</p>
                    <p className="text-sm font-medium">{reporter?.full_name || "Unknown"}</p>
                  </div>
                </div>

                {incident.lost_time && (
                  <>
                    <div className="border-t" />
                    <div className="flex items-center gap-3">
                      <Clock className="h-4 w-4 text-amber-500 shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">Lost Time</p>
                        <p className="text-sm font-medium">
                          {incident.lost_time_amount ? `${incident.lost_time_amount} day${incident.lost_time_amount !== 1 ? "s" : ""}` : "Yes"}
                        </p>
                      </div>
                    </div>
                  </>
                )}

                {/* Injury locations — text only, no diagram on mobile */}
                {incident.type === "injury" && incident.injury_locations && incident.injury_locations.length > 0 && (
                  <>
                    <div className="border-t" />
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">Injury Areas</p>
                        <div className="space-y-1 mt-0.5">
                          {incident.injury_locations.map((loc) => (
                            <p key={loc.id} className="text-sm font-medium">
                              {loc.body_part}{loc.description ? ` — ${loc.description}` : ""}
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                )}
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
                  {incident.description || "No description provided."}
                </p>
              </CardContent>
            </Card>

            {/* Photos — horizontal scroll (inline, like dashboard) */}
            {photoCount > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    Photos
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">{photoCount}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
                    {photos.map((file, idx) => (
                      <button
                        key={file.id}
                        type="button"
                        onClick={() => file.type?.startsWith("image/") && setViewerImage({ src: file.dataUrl, index: idx, source: "file" })}
                        className="h-20 w-20 rounded-lg overflow-hidden bg-muted shrink-0"
                      >
                        {file.type?.startsWith("image/") ? (
                          <img src={file.dataUrl} alt={file.name} className="h-full w-full object-cover" loading="lazy" />
                        ) : (
                          <div className="flex h-full w-full flex-col items-center justify-center p-1">
                            <FileText className="h-5 w-5 text-muted-foreground" />
                            <p className="text-[8px] text-muted-foreground mt-0.5 truncate w-full text-center">{file.name}</p>
                          </div>
                        )}
                      </button>
                    ))}
                    {incident.media_urls?.filter((url) => !photos.some((p) => p.dataUrl === url)).map((url, idx) => (
                      <button
                        key={`media-${idx}`}
                        type="button"
                        onClick={() => url.startsWith("data:image") && setViewerImage({ src: url, index: idx, source: "media" })}
                        className="h-20 w-20 rounded-lg overflow-hidden bg-muted shrink-0"
                      >
                        {url.startsWith("data:image") ? (
                          <img src={url} alt={`Photo ${idx + 1}`} className="h-full w-full object-cover" loading="lazy" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <ImageIcon className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                      </button>
                    ))}
                    {/* Add photo inline button */}
                    {incident.status !== "resolved" && incident.status !== "archived" && (
                      <label className="h-20 w-20 rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center cursor-pointer shrink-0 hover:bg-muted/50 transition-colors">
                        <CameraInput className="hidden" cameraOnly={fieldAppSettings.cameraOnly} multiple onChange={handleAddPhoto} />
                        <Camera className="h-5 w-5 text-muted-foreground/50" />
                        <span className="text-[8px] text-muted-foreground/50 mt-0.5">Add</span>
                      </label>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Add photo button if no photos yet */}
            {photoCount === 0 && incident.status !== "resolved" && incident.status !== "archived" && (
              <label className="block cursor-pointer">
                <CameraInput className="hidden" cameraOnly={fieldAppSettings.cameraOnly} multiple onChange={handleAddPhoto} />
                <span className="flex items-center justify-center gap-2 rounded-xl border border-dashed bg-card px-4 py-3 text-sm text-muted-foreground hover:bg-muted transition-colors w-full">
                  <Camera className="h-4 w-4" />
                  Add photo
                </span>
              </label>
            )}

            {/* Compact Status Timeline */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Status
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                      <CheckCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Reported</p>
                      <p className="text-xs text-muted-foreground">{formatDate(incident.created_at)}</p>
                    </div>
                  </div>

                  {incident.status !== "new" && (
                    <div className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                        incident.status === "in_progress" ? "bg-amber-100 dark:bg-amber-500/20" :
                        incident.status === "in_review" ? "bg-purple-100 dark:bg-purple-500/20" : "bg-green-100 dark:bg-green-500/20"
                      }`}>
                        <CheckCircle className={`h-4 w-4 ${
                          incident.status === "in_progress" ? "text-amber-600 dark:text-amber-400" :
                          incident.status === "in_review" ? "text-purple-600 dark:text-purple-400" : "text-green-600 dark:text-green-400"
                        }`} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {incident.status === "in_progress" ? "Under Investigation" :
                           incident.status === "in_review" ? "Under Review" : "Resolved"}
                        </p>
                        <p className="text-xs text-muted-foreground">{formatDate(incident.updated_at)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Status actions */}
            {canUpdateStatus && (
              <div className="flex gap-2">
                {incident.status === "new" && (
                  <Button className="flex-1" onClick={() => handleStatusUpdate("in_progress")}>
                    Mark In Progress
                  </Button>
                )}
                {incident.status === "in_progress" && (
                  <Button className="flex-1" onClick={() => handleStatusUpdate("in_review")}>
                    Submit for Review
                  </Button>
                )}
              </div>
            )}
          </>
        )}

        {/* ════════════ TASKS TAB ════════════ */}
        {activeTab === "tasks" && (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ClipboardList className="h-4 w-4" />
                  Corrective Actions
                  {taskCount > 0 && (
                    <span className="bg-muted text-muted-foreground rounded-full px-1.5 text-[10px] font-medium leading-4">
                      {taskCount}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {incident.actions && incident.actions.length > 0 ? (
                  incident.actions.map((action) => {
                    const assignee = action.assignee ? users.find((u) => u.id === action.assignee) : null;
                    return (
                      <div key={action.id} className="flex items-start gap-3 p-3 rounded-xl border bg-card">
                        <div className={`mt-0.5 h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          action.status === "completed"
                            ? "bg-green-500 border-green-500"
                            : action.status === "in_progress"
                              ? "border-amber-500"
                              : "border-muted-foreground"
                        }`}>
                          {action.status === "completed" && <CheckCircle className="h-3.5 w-3.5 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${action.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
                            {action.title}
                          </p>
                          {action.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{action.description}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-2 mt-1.5">
                            <Badge variant={
                              action.status === "completed" ? "resolved" as BadgeProps["variant"] :
                              action.status === "in_progress" ? "in_progress" as BadgeProps["variant"] :
                              "outline"
                            } className="text-[10px] px-1.5 py-0">
                              {action.status === "completed" ? "Done" : action.status === "in_progress" ? "In Progress" : "Pending"}
                            </Badge>
                            {action.priority && (
                              <Badge variant={(PRIORITY_CONFIG[action.priority]?.variant || "outline") as BadgeProps["variant"]} className="text-[10px] px-1.5 py-0">
                                {capitalize(action.priority)}
                              </Badge>
                            )}
                            <span className="text-[10px] text-muted-foreground">
                              Due: {action.dueDate ? formatDate(action.dueDate) : "Not set"}
                            </span>
                          </div>
                          {assignee && (
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <div className="h-4 w-4 rounded-full bg-muted flex items-center justify-center text-[8px] font-medium shrink-0">
                                {assignee.full_name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                              </div>
                              <span className="text-[10px] text-muted-foreground">{assignee.full_name}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <ClipboardList className="h-10 w-10 text-muted-foreground/40 mb-2" />
                    <p className="text-sm text-muted-foreground">No corrective actions</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Actions will appear here when assigned</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* ════════════ COMMENTS TAB ════════════ */}
        {activeTab === "comments" && (
          <div className="flex flex-col -mx-4 -my-4">
            {/* Comment thread — scrollable, padded for fixed compose bar */}
            <div className="flex-1 px-4 pt-4 pb-40 space-y-0">
              {incident.comments && incident.comments.length > 0 ? (
                incident.comments.map((comment, idx) => {
                  const author = users.find((u) => u.id === comment.userId);
                  const initials = (comment.avatar || author?.full_name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2) || "?").toUpperCase();
                  const isOwn = comment.userId === user?.id;
                  return (
                    <div key={comment.id}>
                      <div className="flex gap-3 py-3">
                        <div className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold shrink-0 ${
                          isOwn ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        }`}>
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2">
                            <span className="text-sm font-semibold">{author?.full_name || comment.user}</span>
                            <span className="text-[10px] text-muted-foreground">{formatDate(comment.date)}</span>
                          </div>
                          <p className="text-sm mt-1 whitespace-pre-wrap">{comment.text}</p>

                          {comment.mentionedUserIds && comment.mentionedUserIds.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {comment.mentionedUserIds.map((uid) => {
                                const u = users.find((x) => x.id === uid);
                                return u ? (
                                  <span key={uid} className="text-xs text-primary font-medium">@{u.full_name}</span>
                                ) : null;
                              })}
                            </div>
                          )}

                          {comment.attachments && comment.attachments.length > 0 && (
                            <div className="flex gap-2 mt-2 flex-wrap">
                              {comment.attachments.map((att) =>
                                att.type.startsWith("image/") ? (
                                  <img key={att.id} src={att.url} alt={att.name} className="h-16 w-16 rounded-lg border object-cover" loading="lazy" />
                                ) : (
                                  <a key={att.id} href={att.url} download={att.name} className="flex items-center gap-1 rounded-lg border px-2 py-1 text-xs hover:bg-muted transition-colors">
                                    <FileText className="h-3 w-3" />
                                    {att.name}
                                  </a>
                                )
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      {idx < (incident.comments?.length || 0) - 1 && <div className="border-t ml-12" />}
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <MessageCircle className="h-10 w-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">No comments yet</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Start the conversation below</p>
                </div>
              )}
            </div>

            {/* Fixed compose bar at bottom */}
            <div className="fixed bottom-0 left-0 right-0 z-30 border-t bg-background px-4 pt-3 pb-6 safe-area-pb">
              {/* Tagged users pills */}
              {commentTaggedUsers.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {commentTaggedUsers.map((uid) => {
                    const u = users.find((x) => x.id === uid);
                    return u ? (
                      <span key={uid} className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs font-medium">
                        @{u.full_name}
                        <button type="button" onClick={() => setCommentTaggedUsers((prev) => prev.filter((id) => id !== uid))} className="hover:text-primary/70">
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </span>
                    ) : null;
                  })}
                </div>
              )}

              {/* Attached files preview */}
              {commentAttachments.length > 0 && (
                <div className="flex gap-2 flex-wrap mb-2">
                  {commentAttachments.map((att) => (
                    <div key={att.id} className="flex items-center gap-1 rounded-lg border px-2 py-1 text-xs bg-muted/50">
                      {att.name}
                      <button type="button" onClick={() => setCommentAttachments(prev => prev.filter(a => a.id !== att.id))} className="text-muted-foreground hover:text-foreground">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-end gap-2">
                <div className="flex-1 relative">
                  <Textarea
                    placeholder="Write a comment..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    rows={3}
                    className="text-sm min-h-[72px] max-h-[120px] pr-20 resize-none"
                  />
                  <div className="absolute right-2 bottom-2 flex items-center gap-1">
                    <div className="relative" ref={tagPickerRef}>
                      <button
                        type="button"
                        onClick={() => { setShowTagPicker(!showTagPicker); setTagSearch(""); }}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        aria-label="Tag someone"
                      >
                        <User className="h-4 w-4" />
                      </button>
                      {showTagPicker && (
                        <div className="absolute bottom-full mb-1 right-0 z-40 w-64 rounded-lg border bg-popover shadow-lg max-h-52 overflow-y-auto">
                          <div className="p-2 sticky top-0 bg-popover border-b">
                            <input
                              type="text"
                              placeholder="Search users..."
                              value={tagSearch}
                              onChange={(e) => setTagSearch(e.target.value)}
                              className="w-full rounded-md border px-2 py-1.5 text-xs bg-background"
                              autoFocus
                            />
                          </div>
                          {users
                            .filter((u) => {
                              const viewableRoles = ["super_admin", "company_admin", "manager", "safety_officer", "employee"];
                              if (!viewableRoles.includes(u.role)) return false;
                              if (commentTaggedUsers.includes(u.id)) return false;
                              if (tagSearch && !u.full_name.toLowerCase().includes(tagSearch.toLowerCase())) return false;
                              return true;
                            })
                            .slice(0, 8)
                            .map((u) => (
                              <button
                                key={u.id}
                                type="button"
                                onClick={() => {
                                  setCommentTaggedUsers((prev) => [...prev, u.id]);
                                  setShowTagPicker(false);
                                  setTagSearch("");
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-muted transition-colors"
                              >
                                <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-[9px] font-semibold shrink-0">
                                  {u.full_name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <span className="truncate block">{u.full_name}</span>
                                  <span className="text-muted-foreground capitalize text-[10px]">{u.role.replace(/_/g, " ")}</span>
                                </div>
                              </button>
                            ))}
                          {users.filter((u) => {
                            const viewableRoles = ["super_admin", "company_admin", "manager", "safety_officer", "employee"];
                            if (!viewableRoles.includes(u.role)) return false;
                            if (commentTaggedUsers.includes(u.id)) return false;
                            if (tagSearch && !u.full_name.toLowerCase().includes(tagSearch.toLowerCase())) return false;
                            return true;
                          }).length === 0 && (
                            <p className="px-3 py-2 text-xs text-muted-foreground">No users found</p>
                          )}
                        </div>
                      )}
                    </div>

                    <label className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer" aria-label="Attach file">
                      <Upload className="h-4 w-4" />
                      <input type="file" multiple accept="image/*,.pdf,.doc,.docx" className="hidden" onChange={handleCommentFileUpload} />
                    </label>
                  </div>
                </div>

                <Button
                  size="icon"
                  className="h-10 w-10 shrink-0 rounded-full"
                  disabled={!commentText.trim() || isSubmittingComment}
                  onClick={handleAddComment}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Image Viewer Modal ── */}
      {viewerImage && (
        <ImageViewer
          src={viewerImage.src}
          alt="Incident photo"
          onClose={() => setViewerImage(null)}
          onSave={(annotated) => {
            if (!incident) return;
            if (viewerImage.source === "media" && incident.media_urls) {
              const updated = [...incident.media_urls];
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
