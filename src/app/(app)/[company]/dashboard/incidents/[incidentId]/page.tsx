"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { getUserDisplayName, getPriorityVariant } from "@/lib/status-utils";
import {
  AlertCircle,
  ArrowLeft,
  Info,
  Clock,
  MessageSquare,
  FileText,
  Settings,
  Trash2,
  Plus,
  User,
  MapPin,
  Calendar,
  CheckCircle,
  AlertTriangle,
  Flag,
  Timer,
  Shield,
  Package,
  Image as ImageIcon,
  X,
  Ticket,
  ExternalLink,
  Upload,
  Lock,
  Download,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileCheck,
  Camera,
  Pencil,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingPage } from "@/components/ui/loading";
import { DetailTabs, Tab } from "@/components/ui/detail-tabs";
import { useCompanyData } from "@/hooks/use-company-data";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/i18n";
import { useAuth } from "@/hooks/use-auth";
import { useCompanyStore } from "@/stores/company-store";
import { storeFile } from "@/lib/file-storage";
import type { IncidentInvestigation, IncidentAction, IncidentComment, IncidentTimelineEvent, RCAAttachment, IncidentDocument, Priority, Incident, User as UserType } from "@/types";
import { RoleGuard } from "@/components/auth/role-guard";
import { BodyMap } from "@/components/incidents/body-map";
import { ImageViewer } from "@/components/ui/image-viewer";

const tabs: Tab[] = [
  { id: "details", label: "Details", icon: Info },
  { id: "timeline", label: "Timeline", icon: Clock },
  { id: "tasks", label: "Tasks", icon: CheckCircle },
  { id: "comments", label: "Comments", icon: MessageSquare },
  { id: "documents", label: "Documents", icon: FileText },
];

// Collapsible card wrapper for detail sections
function CollapsibleCard({ title, icon: Icon, defaultOpen = true, children }: {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <Card>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-3 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
          <span className="text-sm font-semibold">{title}</span>
        </div>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", !open && "-rotate-90")} />
      </button>
      {open && <CardContent className="pt-0">{children}</CardContent>}
    </Card>
  );
}

// Root cause categories based on industry standards
const rootCauseCategories = [
  { value: "human_error", label: "Human Error / Behavior" },
  { value: "equipment", label: "Equipment / Tool Failure" },
  { value: "process", label: "Process / Procedure Gap" },
  { value: "training", label: "Training Deficiency" },
  { value: "environment", label: "Environmental Conditions" },
  { value: "communication", label: "Communication Failure" },
  { value: "management", label: "Management System" },
  { value: "design", label: "Design / Engineering" },
  { value: "other", label: "Other" },
];

const contributingFactors = [
  { id: "fatigue", label: "Fatigue / Stress" },
  { id: "rushing", label: "Rushing / Time Pressure" },
  { id: "lack_awareness", label: "Lack of Hazard Awareness" },
  { id: "improper_ppe", label: "Improper PPE Use" },
  { id: "poor_housekeeping", label: "Poor Housekeeping" },
  { id: "inadequate_training", label: "Inadequate Training" },
  { id: "equipment_defect", label: "Equipment Defect" },
  { id: "poor_lighting", label: "Poor Lighting" },
  { id: "weather", label: "Weather Conditions" },
  { id: "supervision", label: "Inadequate Supervision" },
];

// Types imported from @/types: IncidentInvestigation, IncidentAction, IncidentComment, IncidentTimelineEvent

export default function IncidentDetailPage() {
  const router = useRouter();
  const routeParams = useParams();
  const dashSearchParams = useSearchParams();
  const company = routeParams.company as string;
  const incidentId = routeParams.incidentId as string;
  const urlTab = dashSearchParams.get("tab");
  const [activeTab, setActiveTab] = React.useState(
    urlTab && ["details", "timeline", "tasks", "comments", "documents"].includes(urlTab) ? urlTab : "details"
  );
  const [newComment, setNewComment] = React.useState("");
  const [showAddActionModal, setShowAddActionModal] = React.useState(false);
  const [newAction, setNewAction] = React.useState<{
    title: string;
    description: string;
    priority: "low" | "medium" | "high" | "urgent";
    dueDate: string;
    assignee: string;
    actionType: "corrective" | "preventive";
  }>({
    title: "",
    description: "",
    priority: "medium",
    dueDate: "",
    assignee: "",
    actionType: "corrective",
  });

  // Investigation state - read from store, write back on changes
  const [showStartInvestigationModal, setShowStartInvestigationModal] = React.useState(false);
  const [showAddWitnessModal, setShowAddWitnessModal] = React.useState(false);
  const [showRCAModal, setShowRCAModal] = React.useState(false);
  const [newWitness, setNewWitness] = React.useState({ name: "", statement: "" });
  const [showLessonsInput, setShowLessonsInput] = React.useState(false);
  const [lessonsInputValue, setLessonsInputValue] = React.useState("");

  const { toast } = useToast();
  const { t, formatDate } = useTranslation();
  const { user: authUser, hasPermission } = useAuth();
  const canEdit = hasPermission("incidents.edit_own") || hasPermission("incidents.edit_all");
  const canDelete = hasPermission("incidents.delete");
  const canAssign = hasPermission("incidents.assign");
  const { items: companiesList } = useCompanyStore();
  const currentCompany = companiesList.find((c) => c.slug === company);
  const { incidents, tickets, correctiveActions, users, teams, locations, stores } = useCompanyData();
  const { isLoading, update: updateIncident, remove: removeIncident } = stores.incidents;
  const { add: addTicket, update: updateTicket } = stores.tickets;
  const { add: addCorrectiveAction, update: updateCorrectiveAction } = stores.correctiveActions;

  const incident = incidents.find((i) => i.id === incidentId);
  const isLocked = incident?.status === "resolved" || incident?.status === "archived" || incident?.status === "closed";
  const location = incident?.location_id ? locations.find((l) => l.id === incident.location_id) : null;
  
  // Read investigation and actions from store (persisted)
  const investigation = incident?.investigation ?? null;
  const actions = incident?.actions ?? [];
  const comments = incident?.comments ?? [];
  const documents = incident?.documents ?? [];

  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [viewerImage, setViewerImage] = React.useState<{ src: string; index: number } | null>(null);
  const [showLightbox, setShowLightbox] = React.useState(false);
  const [lightboxIndex, setLightboxIndex] = React.useState(0);
  const [showCloseModal, setShowCloseModal] = React.useState(false);
  const [closeReason, setCloseReason] = React.useState("");
  const [investigationEditing, setInvestigationEditing] = React.useState(false);
  const [invDraft, setInvDraft] = React.useState({ rootCause: "", factors: "", findings: "" });
  const [commentTaggedUsers, setCommentTaggedUsers] = React.useState<string[]>([]);
  const [showTagPicker, setShowTagPicker] = React.useState(false);
  const [tagSearch, setTagSearch] = React.useState("");
  const [commentAttachments, setCommentAttachments] = React.useState<Array<{ id: string; name: string; url: string; type: string }>>([]);

  // Documents state
  const documentsInputRef = React.useRef<HTMLInputElement>(null);

  // Assignment dropdown state
  const [showAssignDropdown, setShowAssignDropdown] = React.useState(false);

  // Use refs for frequently-changing derived values to stabilize callbacks
  const incidentRef = React.useRef(incident);
  const actionsRef = React.useRef(actions);
  const commentsRef = React.useRef(comments);
  React.useEffect(() => {
    incidentRef.current = incident;
    actionsRef.current = actions;
    commentsRef.current = comments;
  }, [incident, actions, comments]);

  // Helper to update investigation in store
  const setInvestigation = (newInvestigation: IncidentInvestigation | null) => {
    if (!incidentRef.current) return;
    updateIncident(incidentId, { investigation: newInvestigation, updated_at: new Date().toISOString() });
  };

  // Helper to update actions in store
  const setActions = (newActions: IncidentAction[] | ((prev: IncidentAction[]) => IncidentAction[])) => {
    if (!incidentRef.current) return;
    const currentActions = actionsRef.current;
    const resolvedActions = typeof newActions === 'function' ? newActions(currentActions) : newActions;
    updateIncident(incidentId, { actions: resolvedActions, updated_at: new Date().toISOString() });
  };

  const assignIncidentToUser = (userId: string) => {
    const selectedUser = users.find((user) => user.id === userId);
    if (!selectedUser) return;
    updateIncident(incidentId, {
      assigned_to: userId,
      assigned_to_team_id: null,
      updated_at: new Date().toISOString(),
    });
    setShowAssignDropdown(false);
    toast(`Assigned to ${selectedUser.full_name}`, "success");
  };

  const assignIncidentToTeam = (teamId: string) => {
    const selectedTeam = teams.find((team) => team.id === teamId);
    if (!selectedTeam) return;
    updateIncident(incidentId, {
      assigned_to: null,
      assigned_to_team_id: teamId,
      updated_at: new Date().toISOString(),
    });
    setShowAssignDropdown(false);
    toast(`Assigned to ${selectedTeam.name}`, "success");
  };

  // Helper to add comment to store
  const addComment = (comment: IncidentComment) => {
    if (!incidentRef.current) return;
    const currentComments = commentsRef.current;
    const newComments = [...currentComments, comment];
    updateIncident(incidentId, { comments: newComments, updated_at: new Date().toISOString() });
  };

  const handleCommentFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const handleStartInvestigation = (investigatorId: string) => {
    const newInvestigation: IncidentInvestigation = {
      investigator: investigatorId,
      startDate: new Date().toISOString(),
      status: "in_progress",
      rootCauseCategory: "",
      rootCauseOther: "",
      rootCauseDescription: "",
      contributingFactors: [],
      lessonsLearned: "",
      witnesses: [],
      notes: "",
      attachments: [],
    };
    setInvestigation(newInvestigation);
    setShowStartInvestigationModal(false);
    toast("Investigation started - you can now document findings and root cause analysis.", "success");
  };

  const handleAddWitness = () => {
    if (!investigation || !newWitness.name || !newWitness.statement) return;
    setInvestigation({
      ...investigation,
      witnesses: [...investigation.witnesses, { ...newWitness, date: new Date().toISOString() }],
    });
    setNewWitness({ name: "", statement: "" });
    setShowAddWitnessModal(false);
    toast("Witness statement recorded.", "success");
  };

  const handleUpdateRCA = (updates: Partial<IncidentInvestigation>) => {
    if (!investigation) return;
    setInvestigation({ ...investigation, ...updates });
    setShowRCAModal(false);
    toast("Root cause analysis saved.", "success");
  };

  const isAnonymous = incident?.reporter_id === "__anonymous__";
  const reporter = isAnonymous ? null : users.find((u) => u.id === incident?.reporter_id);
  const reporterName = isAnonymous ? "Anonymous" : (reporter?.full_name || "Unknown");
  const relatedTickets = React.useMemo(() => tickets.filter((t) => t.incident_ids?.includes(incidentId)), [tickets, incidentId]);
  const correctiveIncidentActions = React.useMemo(() => actions.filter((action) => action.actionType === "corrective"), [actions]);
  const openCorrectiveActionCount = React.useMemo(() => correctiveIncidentActions.filter((action) => action.status !== "completed").length, [correctiveIncidentActions]);
  const openTicketCount = React.useMemo(() => relatedTickets.filter((t) => t.status !== "resolved" && t.status !== "closed").length, [relatedTickets]);
  const canResolveIncident = openCorrectiveActionCount === 0 && openTicketCount === 0;
  const [statusValue, setStatusValue] = React.useState("new");
  const [investigatorIdValue, setInvestigatorIdValue] = React.useState("");

  React.useEffect(() => {
    if (!incident) return;
    setStatusValue(incident.status);
    setInvestigatorIdValue(incident.resolved_by || "");
  }, [incident?.id, incident?.status, incident?.resolved_by]);

  const completedActions = React.useMemo(() => actions.filter((a) => a.status === "completed").length, [actions]);
  const allActionsComplete = actions.length > 0 && completedActions === actions.length;
  const totalActions = actions.length;

  if (isLoading && incidents.length === 0) {
    return <LoadingPage />;
  }

  if (!incident) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Incident not found"
        description="This incident ID was not found in the data."
        action={
          <Link href={`/${company}/dashboard/incidents`}>
            <Button>Back to incidents</Button>
          </Link>
        }
      />
    );
  }

  const handleAddAction = () => {
    if (!newAction.title || !newAction.assignee || !newAction.dueDate) return;
    
    const taskId = `task-${crypto.randomUUID().slice(0, 8)}`;
    const correctiveActionId = newAction.actionType === "corrective"
      ? `ca-${crypto.randomUUID().slice(0, 8)}`
      : null;
    
    // Create task in the tickets/tasks store so it appears on the main Tasks page
    addTicket({
      id: taskId,
      company_id: incident.company_id,
      title: newAction.title,
      description: newAction.description || `${newAction.actionType === "corrective" ? "Corrective" : "Preventive"} action from incident ${incident.reference_number}`,
      priority: (newAction.priority === "urgent" ? "critical" : newAction.priority) as Priority,
      status: "new",
      due_date: newAction.dueDate || null,
      assigned_to: newAction.assignee || null,
      assigned_groups: [],
      incident_ids: [incidentId],
      created_by: authUser?.id || "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Also keep in the embedded actions array for backward compat
    const action: IncidentAction = {
      id: taskId,
      title: newAction.title,
      description: newAction.description,
      priority: newAction.priority,
      dueDate: newAction.dueDate,
      status: "pending",
      ticketId: taskId,
      correctiveActionId,
      ticketStatus: "open",
      assignee: newAction.assignee,
      createdAt: new Date().toISOString(),
      actionType: newAction.actionType,
    };
    setActions([...actions, action]);

    // Sync corrective actions to the corrective actions store
    if (newAction.actionType === "corrective" && correctiveActionId) {
      addCorrectiveAction({
        id: correctiveActionId,
        company_id: incident.company_id,
        description: newAction.description || newAction.title,
        severity: newAction.priority === "urgent" ? "critical" : newAction.priority === "high" ? "high" : newAction.priority === "low" ? "low" : "medium",
        assigned_to: newAction.assignee || null,
        asset_id: "",
        inspection_id: null,
        due_date: newAction.dueDate || new Date().toISOString(),
        status: "open",
        resolution_notes: null,
        completed_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    setShowAddActionModal(false);
    setNewAction({ title: "", description: "", priority: "medium", dueDate: "", assignee: "", actionType: "corrective" });
    toast(`Task created and linked to incident.`, "success");
  };

  const handleTicketStatusChange = (actionId: string, newStatus: "open" | "in_progress" | "resolved", notes?: string) => {
    setActions((prev) => prev.map((a) => {
      if (a.id === actionId) {
        const now = new Date().toISOString();
        // Also update the ticket in the tickets store
        if (a.ticketId) {
          const ticketStatus = newStatus === "open" ? "new" : newStatus;
          updateTicket(a.ticketId, { status: ticketStatus as "new" | "in_progress" | "resolved", updated_at: now });
        }
        if (a.correctiveActionId) {
          updateCorrectiveAction(a.correctiveActionId, {
            status: newStatus === "resolved" ? "completed" : newStatus === "in_progress" ? "in_progress" : "open",
            completed_at: newStatus === "resolved" ? now : null,
            updated_at: now,
          });
        }
        return {
          ...a,
          ticketStatus: newStatus,
          status: newStatus === "resolved" ? "completed" : newStatus === "in_progress" ? "in_progress" : "pending",
          resolutionNotes: notes || a.resolutionNotes,
        };
      }
      return a;
    }));
    toast(`Action status changed to ${newStatus.replace('_', ' ')}.`, "info");
  };

  // Build timeline from incident data + actions
  const timelineEvents: IncidentTimelineEvent[] = [
    { id: 1, type: "created" as const, description: "Incident reported", user: reporterName, date: incident.incident_date },
    ...(incident.status !== 'new' ? [{ id: 2, type: "status" as const, description: "Status changed to In Progress", user: "Safety Manager", date: new Date(new Date(incident.incident_date).getTime() + 86400000).toISOString() }] : []),
    ...(investigation ? [{ id: 3, type: "investigation" as const, description: "Investigation started", user: users.find(u => u.id === investigation.investigator)?.full_name || "Investigator", date: investigation.startDate }] : []),
    ...actions.map((a, idx) => ({
      id: 10 + idx,
      type: "action" as const,
      description: `Action created: ${a.title}`,
      user: "Safety Manager",
      date: a.createdAt,
    })),
    ...comments.map((c, idx) => ({
      id: 100 + idx,
      type: "comment" as const,
      description: c.text.substring(0, 50) + (c.text.length > 50 ? '...' : ''),
      user: c.user,
      date: c.date,
    })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const getAssigneeName = (userId: string) => getUserDisplayName(userId, users);

  const getPriorityColor = getPriorityVariant;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
      case "resolved":
        return <CheckCircle className="h-5 w-5 text-success" />;
      case "in_progress":
        return <Clock className="h-5 w-5 text-warning" />;
      default:
        return <AlertCircle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  return (
    <RoleGuard requiredPermission="incidents.view_own">
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push(`/${company}/dashboard/incidents`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold">{incident.title}</h1>
              <span className="text-sm text-muted-foreground capitalize">{incident.severity}</span>
              <span className="text-sm text-muted-foreground capitalize">{incident.status.replace("_", " ")}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {incident.reference_number} • {formatDate(new Date(incident.incident_date))} • {incident.building || incident.location_description || location?.name || "Unknown location"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={async () => {
            const { IncidentReportPDF, downloadPDF } = await import("@/lib/pdf-export");
            const loc = location;
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
                location: loc?.name,
                location_description: incident.location_description,
                building: incident.building,
                floor: incident.floor,
                zone: incident.zone,
                room: incident.room,
                description: incident.description,
                reference_number: incident.reference_number,
                reporter_name: reporterName,
                corrective_actions: actions.map((a) => ({
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
            await downloadPDF(doc, `${incident.reference_number || incident.id}.pdf`);
            toast("PDF exported", "success");
          }}>{t("incidents.buttons.export")}</Button>
          <Button onClick={() => {
            updateIncident(incidentId, { updated_at: new Date().toISOString() });
            toast("Incident saved", "success");
          }}>{t("common.save")}</Button>
        </div>
      </div>

      {/* Locked banner */}
      {isLocked && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-900/20">
          <Lock className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <p className="text-sm font-medium text-amber-800 dark:text-amber-300">{t("incidents.locked")}</p>
        </div>
      )}

      {/* Tabs */}
      <DetailTabs tabs={isLocked ? tabs.filter((tab) => tab.id !== "settings") : tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Tab Content */}
      {activeTab === "details" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <CollapsibleCard title={t("incidents.labels.description")}>
                <p className="text-muted-foreground">{incident.description}</p>
            </CollapsibleCard>

            {/* Photo Gallery — always show with add option */}
            <CollapsibleCard title="Photos & Media" icon={Camera}>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {(incident.media_urls || []).filter(url => url && url.length > 0).map((url, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => { setLightboxIndex(idx); setShowLightbox(true); }}
                      className="shrink-0 rounded-lg overflow-hidden border hover:ring-2 hover:ring-primary transition-all"
                    >
                      <img src={url} alt={`Photo ${idx + 1}`} className="h-24 w-24 object-cover" />
                    </button>
                  ))}
                  {!isLocked && (
                    <label className="shrink-0 h-24 w-24 rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors">
                      <Camera className="h-5 w-5 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground mt-1">Add</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          const files = e.target.files;
                          if (!files) return;
                          Array.from(files).slice(0, 5).forEach((file) => {
                            if (file.size > 10 * 1024 * 1024) return;
                            const reader = new FileReader();
                            reader.onload = () => {
                              const existing = incident.media_urls || [];
                              updateIncident(incidentId, { media_urls: [...existing, reader.result as string], updated_at: new Date().toISOString() });
                            };
                            reader.readAsDataURL(file);
                          });
                          e.target.value = "";
                        }}
                      />
                    </label>
                  )}
                </div>
                {(!incident.media_urls || incident.media_urls.length === 0) && (
                  <p className="text-xs text-muted-foreground text-center py-2">No photos attached</p>
                )}
            </CollapsibleCard>

            {/* Investigation — triggered, only shows fields when started */}
            {(!incident.investigation_status || incident.investigation_status === "not_started") ? (
              !isLocked && canEdit && (
                <div className="flex items-center justify-between rounded-lg border border-dashed p-4">
                  <div>
                    <p className="text-sm font-medium">Investigation</p>
                    <p className="text-xs text-muted-foreground">Start an investigation to document root cause and contributing factors</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => {
                      updateIncident(incidentId, {
                        investigation_status: "in_progress",
                        investigator_id: authUser?.id || null,
                        updated_at: new Date().toISOString(),
                      });
                      toast("Investigation started");
                    }}
                  >
                    Start Investigation
                  </Button>
                </div>
              )
            ) : (
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">Investigation</CardTitle>
                      <Badge variant={incident.investigation_status === "completed" ? "success" : "warning"}>
                        {incident.investigation_status === "completed" ? "Completed" : "In Progress"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {canEdit && !isLocked && !investigationEditing && (
                        <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => {
                          setInvDraft({
                            rootCause: incident.root_cause || "",
                            factors: (incident.contributing_factors || []).join("\n"),
                            findings: incident.resolution_notes || "",
                          });
                          setInvestigationEditing(true);
                        }}>
                          <Pencil className="h-3 w-3" /> Edit
                        </Button>
                      )}
                      {canEdit && incident.investigation_status !== "completed" && !investigationEditing && (
                        <Button variant="outline" size="sm" className="text-xs" onClick={() => {
                          updateIncident(incidentId, { investigation_status: "completed", updated_at: new Date().toISOString() });
                          toast("Investigation marked complete");
                        }}>
                          Mark Complete
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Investigator */}
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground shrink-0">Investigator</Label>
                    <select
                      value={incident.investigator_id || authUser?.id || ""}
                      onChange={(e) => updateIncident(incidentId, { investigator_id: e.target.value, updated_at: new Date().toISOString() })}
                      disabled={isLocked}
                      className="rounded-md border border-input bg-background px-2 py-1 text-xs flex-1"
                    >
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>{u.full_name}</option>
                      ))}
                    </select>
                  </div>

                  {investigationEditing ? (
                    <>
                      <div className="space-y-1.5">
                        <Label className="text-sm">Root Cause</Label>
                        <Textarea value={invDraft.rootCause} onChange={(e) => setInvDraft({ ...invDraft, rootCause: e.target.value })} placeholder="What was the underlying cause?" rows={3} className="border-2 border-border" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm">Contributing Factors</Label>
                        <Textarea value={invDraft.factors} onChange={(e) => setInvDraft({ ...invDraft, factors: e.target.value })} placeholder="One per line..." rows={3} className="border-2 border-border" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm">Findings Summary</Label>
                        <Textarea value={invDraft.findings} onChange={(e) => setInvDraft({ ...invDraft, findings: e.target.value })} placeholder="Summarize findings and recommendations..." rows={3} className="border-2 border-border" />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setInvestigationEditing(false)}>Cancel</Button>
                        <Button size="sm" onClick={() => {
                          updateIncident(incidentId, {
                            root_cause: invDraft.rootCause,
                            contributing_factors: invDraft.factors.split("\n").filter(f => f.trim()),
                            resolution_notes: invDraft.findings,
                            updated_at: new Date().toISOString(),
                          });
                          setInvestigationEditing(false);
                          toast("Investigation saved");
                        }}>Save</Button>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Root Cause</p>
                        <p className="text-sm rounded-md border bg-muted/30 p-2.5">{incident.root_cause || "Not documented yet"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Contributing Factors</p>
                        <p className="text-sm rounded-md border bg-muted/30 p-2.5">{(incident.contributing_factors || []).join(", ") || "None identified yet"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Findings Summary</p>
                        <p className="text-sm rounded-md border bg-muted/30 p-2.5">{incident.resolution_notes || "Not documented yet"}</p>
                      </div>
                    </div>
                  )}

                  {/* Evidence attachments */}
                  <div className="space-y-1.5">
                    <Label className="text-sm">Evidence</Label>
                    {incident.documents && incident.documents.filter(d => d.category === "investigation").length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {incident.documents.filter(d => d.category === "investigation").map((doc) => (
                          <a key={doc.id} href={doc.url} download={doc.name} className="flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs hover:bg-muted transition-colors">
                            {doc.type?.startsWith("image/") ? (
                              <img src={doc.url} alt={doc.name} className="h-8 w-8 rounded object-cover" />
                            ) : (
                              <FileText className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span className="truncate max-w-[120px]">{doc.name}</span>
                          </a>
                        ))}
                      </div>
                    )}
                    {canEdit && !isLocked && (
                      <label className="inline-flex items-center gap-1.5 rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground cursor-pointer hover:bg-muted/50 transition-colors">
                        <Plus className="h-3.5 w-3.5" />
                        Add evidence
                        <input type="file" accept="image/*,.pdf" multiple className="hidden" onChange={(e) => {
                          const files = e.target.files;
                          if (!files) return;
                          Array.from(files).slice(0, 5).forEach((file) => {
                            if (file.size > 10 * 1024 * 1024) return;
                            const reader = new FileReader();
                            reader.onload = () => {
                              const doc = { id: crypto.randomUUID(), name: file.name, url: reader.result as string, type: file.type, category: "investigation" as const, uploaded_by: authUser?.id || "", uploaded_at: new Date().toISOString() };
                              updateIncident(incidentId, { documents: [...(incident.documents || []), doc], updated_at: new Date().toISOString() });
                            };
                            reader.readAsDataURL(file);
                          });
                          e.target.value = "";
                        }} />
                      </label>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Body map — injury incidents only */}
            {incident.type === "injury" && (
              <CollapsibleCard title="Injury location">
                  {(incident.injury_locations && incident.injury_locations.length > 0) ? (
                    <BodyMap
                      markers={incident.injury_locations}
                      onAddMarker={(marker) => {
                        if (isLocked) return;
                        const existing = incident.injury_locations || [];
                        updateIncident(incidentId, {
                          injury_locations: [...existing, marker],
                          updated_at: new Date().toISOString(),
                        });
                      }}
                      onRemoveMarker={(id) => {
                        if (isLocked) return;
                        const existing = incident.injury_locations || [];
                        updateIncident(incidentId, {
                          injury_locations: existing.filter((m) => m.id !== id),
                          updated_at: new Date().toISOString(),
                        });
                      }}
                      readOnly={isLocked}
                    />
                  ) : (
                    <BodyMap
                      markers={[]}
                      onAddMarker={(marker) => {
                        if (isLocked) return;
                        updateIncident(incidentId, {
                          injury_locations: [marker],
                          updated_at: new Date().toISOString(),
                        });
                      }}
                      readOnly={isLocked}
                    />
                  )}
              </CollapsibleCard>
            )}

            <CollapsibleCard title="Incident Details">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">{t("incidents.labels.type")}</p>
                      <p className="font-medium capitalize">{incident.type.replace("_", " ")}</p>
                      {incident.type === "other" && incident.type_other && (
                        <p className="text-sm text-muted-foreground">{incident.type_other}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">{t("incidents.labels.severity")} / {t("incidents.labels.priority")}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium capitalize">{incident.severity}</span>
                        <span className="text-sm text-muted-foreground capitalize">{incident.priority}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">{t("incidents.labels.date")} & {t("incidents.labels.time")}</p>
                      <p className="font-medium">
                        {formatDate(new Date(incident.incident_date))} at {incident.incident_time || "Unknown time"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Reported By</p>
                      <p className="font-medium">{reporterName}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Timer className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">{t("incidents.labels.lostTime")}</p>
                      {incident.lost_time ? (
                        <div className="space-y-2 mt-1">
                          <div className="flex items-center gap-4">
                            <div>
                              <p className="text-xs text-muted-foreground">Days away</p>
                              <input
                                type="number"
                                min="0"
                                max="365"
                                value={incident.lost_time_amount ?? ""}
                                onChange={(e) => {
                                  const val = e.target.value ? parseInt(e.target.value, 10) : null;
                                  updateIncident(incident.id, {
                                    lost_time_amount: val,
                                    lost_time_updated_at: new Date().toISOString(),
                                    lost_time_updated_by: authUser?.id || null,
                                  });
                                }}
                                className="w-20 rounded border border-input bg-background px-2 py-1 text-sm"
                              />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Restricted days</p>
                              <input
                                type="number"
                                min="0"
                                max="365"
                                value={incident.lost_time_restricted_days ?? ""}
                                onChange={(e) => {
                                  const val = e.target.value ? parseInt(e.target.value, 10) : null;
                                  updateIncident(incident.id, {
                                    lost_time_restricted_days: val,
                                    lost_time_updated_at: new Date().toISOString(),
                                    lost_time_updated_by: authUser?.id || null,
                                  });
                                }}
                                className="w-20 rounded border border-input bg-background px-2 py-1 text-sm"
                              />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Return date</p>
                              <input
                                type="date"
                                value={incident.lost_time_return_date ?? ""}
                                onChange={(e) => {
                                  updateIncident(incident.id, {
                                    lost_time_return_date: e.target.value || null,
                                    lost_time_updated_at: new Date().toISOString(),
                                    lost_time_updated_by: authUser?.id || null,
                                  });
                                }}
                                className="rounded border border-input bg-background px-2 py-1 text-sm"
                              />
                            </div>
                          </div>
                          {incident.lost_time_updated_at && (
                            <p className="text-[10px] text-muted-foreground">
                              Last updated {formatDate(incident.lost_time_updated_at)}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="font-medium text-success">No</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Flag className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">{t("incidents.labels.activeHazard")}</p>
                      <p className="font-medium">
                        {incident.active_hazard ? (
                          <span className="text-destructive inline-flex items-center gap-1">
                            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                            Yes - Hazard still present
                          </span>
                        ) : (
                          <span className="text-success">No</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
            </CollapsibleCard>

            {/* Location Details */}
            <CollapsibleCard title={t("incidents.labels.location")} icon={MapPin}>
                <div className="space-y-4">
                  {/* Resolved location from location_id */}
                  {location && (
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium">{location.name}</p>
                        <p className="text-sm capitalize text-muted-foreground">{location.type.replace(/_/g, " ")}</p>
                        {location.address && <p className="text-sm text-muted-foreground mt-1">{location.address}</p>}
                      </div>
                    </div>
                  )}

                  {/* Manual location fields — only show if they have data */}
                  {(incident.building || incident.floor || incident.zone || incident.room) && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {incident.building && (
                        <div className="text-sm"><span className="text-muted-foreground">Building:</span> {incident.building}</div>
                      )}
                      {incident.floor && (
                        <div className="text-sm"><span className="text-muted-foreground">Floor:</span> {incident.floor}</div>
                      )}
                      {incident.zone && (
                        <div className="text-sm"><span className="text-muted-foreground">Zone:</span> {incident.zone}</div>
                      )}
                      {incident.room && (
                        <div className="text-sm"><span className="text-muted-foreground">Room:</span> {incident.room}</div>
                      )}
                    </div>
                  )}

                  {/* Location description from field app */}
                  {incident.location_description && !location && (
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium">{incident.location_description}</p>
                      </div>
                    </div>
                  )}

                  {/* GPS coordinates */}
                  {incident.gps_lat && incident.gps_lng && (
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">GPS</p>
                        <p className="font-medium font-mono text-sm">{incident.gps_lat.toFixed(6)}, {incident.gps_lng.toFixed(6)}</p>
                      </div>
                    </div>
                  )}

                  {/* No location at all */}
                  {!location && !incident.building && !incident.location_description && !incident.gps_lat && (
                    <p className="text-sm text-muted-foreground">No location data captured</p>
                  )}
                </div>
            </CollapsibleCard>

            {/* Related Asset */}
            {incident.asset_id && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    {t("incidents.labels.relatedAsset")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Link href={`/${company}/dashboard/assets/${incident.asset_id}`}>
                    <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                      <div>
                        <p className="font-medium">Asset #{incident.asset_id}</p>
                        <p className="text-xs text-muted-foreground">Click to view asset details</p>
                      </div>
                      <span className="text-sm text-muted-foreground">View</span>
                    </div>
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status Control */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <select
                  value={incident.status}
                  onChange={(e) => {
                    const value = e.target.value as typeof incident.status;
                    if (value === "closed") {
                      setShowCloseModal(true);
                      return;
                    }
                    updateIncident(incidentId, {
                      status: value,
                      resolved_at: value === "resolved" ? new Date().toISOString() : incident.resolved_at,
                      resolved_by: value === "resolved" ? (authUser?.id || incident.resolved_by) : incident.resolved_by,
                      updated_at: new Date().toISOString(),
                    });
                    toast(`Status changed to ${value.replace("_", " ")}`);
                  }}
                  disabled={isLocked || !canEdit}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="new">New</option>
                  <option value="in_progress">In Progress</option>
                  <option value="in_review">In Review</option>
                  <option value="stalled">Stalled</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">Priority</p>
                    <p className="font-medium capitalize">{incident.priority}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Reporter</p>
                    <p className="font-medium">{reporterName}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Created</p>
                    <p className="font-medium">{formatDate(new Date(incident.created_at))}</p>
                  </div>
                  {incident.resolved_at && (
                    <div>
                      <p className="text-muted-foreground">Resolved</p>
                      <p className="font-medium">{formatDate(new Date(incident.resolved_at))}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Assigned To</CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const assignedUser = incident.assigned_to ? users.find((user) => user.id === incident.assigned_to) : null;
                  const assignedTeam = incident.assigned_to_team_id ? teams.find((team) => team.id === incident.assigned_to_team_id) : null;
                  if (assignedUser) {
                    const initials = assignedUser.full_name
                      .split(" ")
                      .map(n => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2);
                    return (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-medium">
                            {initials}
                          </div>
                          <div>
                            <p className="font-medium">{assignedUser.full_name}</p>
                            <p className="text-sm text-muted-foreground capitalize">{assignedUser.role.replace("_", " ")}</p>
                          </div>
                        </div>
                        {!isLocked && canAssign && (
                          <div className="relative">
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full gap-1"
                              onClick={() => setShowAssignDropdown(!showAssignDropdown)}
                            >
                              Reassign <ChevronDown className="h-3 w-3" />
                            </Button>
                            {showAssignDropdown && (
                              <div className="absolute z-10 mt-1 w-full rounded-md border bg-background shadow-lg max-h-48 overflow-y-auto">
                                {users.map((u) => (
                                  <button
                                    key={u.id}
                                    type="button"
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
                                    onClick={() => {
                                      assignIncidentToUser(u.id);
                                    }}
                                  >
                                    {u.full_name} <span className="text-muted-foreground capitalize">({u.role.replace("_", " ")})</span>
                                  </button>
                                ))}
                                {teams.length > 0 && (
                                  <>
                                    <div className="border-t px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                      Teams
                                    </div>
                                    {teams.map((team) => (
                                      <button
                                        key={team.id}
                                        type="button"
                                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
                                        onClick={() => assignIncidentToTeam(team.id)}
                                      >
                                        {team.name}
                                      </button>
                                    ))}
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  }
                  if (assignedTeam) {
                    return (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-medium">
                            <User className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-medium">{assignedTeam.name}</p>
                            <p className="text-sm text-muted-foreground">Team assignment</p>
                          </div>
                        </div>
                        {!isLocked && canAssign && (
                          <div className="relative">
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full gap-1"
                              onClick={() => setShowAssignDropdown(!showAssignDropdown)}
                            >
                              Reassign <ChevronDown className="h-3 w-3" />
                            </Button>
                            {showAssignDropdown && (
                              <div className="absolute z-10 mt-1 w-full rounded-md border bg-background shadow-lg max-h-48 overflow-y-auto">
                                {users.map((u) => (
                                  <button
                                    key={u.id}
                                    type="button"
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
                                    onClick={() => assignIncidentToUser(u.id)}
                                  >
                                    {u.full_name} <span className="text-muted-foreground capitalize">({u.role.replace("_", " ")})</span>
                                  </button>
                                ))}
                                {teams.length > 0 && (
                                  <>
                                    <div className="border-t px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                      Teams
                                    </div>
                                    {teams.map((team) => (
                                      <button
                                        key={team.id}
                                        type="button"
                                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
                                        onClick={() => assignIncidentToTeam(team.id)}
                                      >
                                        {team.name}
                                      </button>
                                    ))}
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  }
                  return (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">Unassigned</p>
                      {!isLocked && canAssign && (
                        <div className="relative">
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full gap-1"
                            onClick={() => setShowAssignDropdown(!showAssignDropdown)}
                          >
                            <Plus className="h-3 w-3" /> Assign
                          </Button>
                          {showAssignDropdown && (
                            <div className="absolute z-10 mt-1 w-full rounded-md border bg-background shadow-lg max-h-48 overflow-y-auto">
                              {users.map((u) => (
                                <button
                                  key={u.id}
                                  type="button"
                                  className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
                                  onClick={() => {
                                    assignIncidentToUser(u.id);
                                  }}
                                >
                                  {u.full_name} <span className="text-muted-foreground capitalize">({u.role.replace("_", " ")})</span>
                                </button>
                              ))}
                              {teams.length > 0 && (
                                <>
                                  <div className="border-t px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                    Teams
                                  </div>
                                  {teams.map((team) => (
                                    <button
                                      key={team.id}
                                      type="button"
                                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
                                      onClick={() => assignIncidentToTeam(team.id)}
                                    >
                                      {team.name}
                                    </button>
                                  ))}
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>

            {/* Linked Tasks */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Linked Tasks</CardTitle>
                  {!isLocked && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => {
                        const taskId = crypto.randomUUID();
                        addTicket({
                          id: taskId,
                          company_id: incident.company_id,
                          title: `Follow-up: ${incident.title}`,
                          description: "",
                          priority: incident.priority,
                          status: "new",
                          due_date: null,
                          assigned_to: authUser?.id || incident.assigned_to || null,
                          assigned_groups: [],
                          incident_ids: [incidentId],
                          created_by: authUser?.id || "",
                          created_at: new Date().toISOString(),
                          updated_at: new Date().toISOString(),
                        });
                        toast("Task created and linked");
                      }}
                    >
                      <Plus className="h-3 w-3" /> Create Task
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {relatedTickets.length > 0 && (
                  <div className="mb-3 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{relatedTickets.filter(t => t.status === "resolved" || t.status === "closed").length}/{relatedTickets.length}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5">
                      <div
                        className="bg-primary h-1.5 rounded-full transition-all"
                        style={{ width: `${relatedTickets.length > 0 ? Math.round((relatedTickets.filter(t => t.status === "resolved" || t.status === "closed").length / relatedTickets.length) * 100) : 0}%` }}
                      />
                    </div>
                  </div>
                )}
                {relatedTickets.length > 0 ? (
                  <div className="space-y-2">
                    {relatedTickets.map((ticket) => (
                      <Link
                        key={ticket.id}
                        href={`/${company}/dashboard/tickets/${ticket.id}`}
                        className="flex items-center gap-3 rounded-lg border px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{ticket.title}</p>
                          <p className="text-xs text-muted-foreground">{ticket.assigned_to ? getUserDisplayName(ticket.assigned_to, users) : "Unassigned"}</p>
                        </div>
                        <Badge variant={ticket.status === "resolved" || ticket.status === "closed" ? "completed" : ticket.status === "in_progress" ? "in_progress" : "secondary"} className="text-[10px]">
                          {ticket.status.replace(/_/g, " ")}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No tasks linked yet</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === "timeline" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Incident Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative space-y-0">
              {(() => {
                const events: Array<{ id: string; date: string; label: string; detail: string; type: string }> = [];
                
                // Core lifecycle events
                events.push({ id: "created", date: incident.created_at, label: "Incident reported", detail: `Reported by ${reporterName}`, type: "create" });
                
                if (incident.assigned_to) {
                  const assignee = users.find(u => u.id === incident.assigned_to);
                  events.push({ id: "assigned", date: incident.updated_at, label: "Assigned", detail: `Assigned to ${assignee?.full_name || "someone"}`, type: "assign" });
                }
                
                // Investigation events
                if (incident.investigation_status === "in_progress" || incident.investigation_status === "completed") {
                  const investigator = incident.investigator_id ? users.find(u => u.id === incident.investigator_id)?.full_name : "Investigator";
                  events.push({ id: "inv_start", date: incident.updated_at, label: "Investigation started", detail: `${investigator || "Someone"} began investigating`, type: "investigation" });
                }
                if (incident.investigation_status === "completed") {
                  events.push({ id: "inv_done", date: incident.updated_at, label: "Investigation completed", detail: incident.root_cause ? `Root cause: ${incident.root_cause.slice(0, 80)}${incident.root_cause.length > 80 ? "..." : ""}` : "Findings documented", type: "investigation" });
                }
                
                // Task events
                relatedTickets.forEach((ticket) => {
                  events.push({ id: `task_${ticket.id}`, date: ticket.created_at, label: "Task created", detail: ticket.title, type: "task" });
                  if (ticket.status === "resolved" || ticket.status === "closed") {
                    events.push({ id: `task_done_${ticket.id}`, date: ticket.updated_at, label: "Task completed", detail: ticket.title, type: "task_done" });
                  }
                });
                
                // Comments
                (incident.comments || []).forEach((c) => {
                  events.push({ id: c.id, date: c.date, label: `${c.user} commented`, detail: c.text.slice(0, 100) + (c.text.length > 100 ? "..." : ""), type: "comment" });
                });
                
                // Resolution
                if (incident.resolved_at) {
                  events.push({ id: "resolved", date: incident.resolved_at, label: "Resolved", detail: "Incident marked as resolved", type: "resolve" });
                }
                if (incident.status === "closed") {
                  events.push({ id: "closed", date: incident.updated_at, label: "Closed", detail: incident.closure_reason || "Incident closed", type: "close" });
                }
                
                return events
                  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                  .map((event, idx, arr) => (
                    <div key={event.id} className="flex gap-4 pb-6">
                      <div className="flex flex-col items-center">
                        <div className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold",
                          (event.type === "resolve" || event.type === "close" || event.type === "task_done")
                            ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-muted text-muted-foreground",
                        )}>
                          <Clock className="h-3.5 w-3.5" />
                        </div>
                        {idx < arr.length - 1 && <div className="w-px flex-1 bg-border mt-2" />}
                      </div>
                      <div className="flex-1 pt-1">
                        <p className="text-sm font-medium">{event.label}</p>
                        <p className="text-xs text-muted-foreground">{event.detail}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{formatDate(new Date(event.date))}</p>
                      </div>
                    </div>
                  ));
              })()}
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "investigation" && (
        <div className="space-y-6">
          {/* Not Started State */}
          {!investigation && (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium text-lg mb-2">Investigation Not Started</h3>
                  <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                    This incident has not been investigated yet. Start an investigation to identify root causes and prevent future occurrences.
                  </p>
                  <Button onClick={() => setShowStartInvestigationModal(true)} className="gap-2">
                    <Plus className="h-4 w-4" /> Start Investigation
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Investigation In Progress or Completed */}
          {investigation && (
            <>
              {/* Investigation Status */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">Investigation Status</CardTitle>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground capitalize">{investigation.status.replace("_", " ")}</span>
                    {investigation.status === "in_progress" && (
                      <Button size="sm" variant="outline" onClick={() => setInvestigation({ ...investigation, status: "completed" })}>
                        Mark Complete
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label className="text-muted-foreground">Lead Investigator</Label>
                      <p className="font-medium">{getAssigneeName(investigation.investigator)}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Investigation Started</Label>
                      <p className="font-medium">{formatDate(new Date(investigation.startDate))}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Root Cause Analysis */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">Root Cause Analysis</CardTitle>
                  <Button size="sm" variant="outline" onClick={() => setShowRCAModal(true)}>
                    {investigation.rootCauseCategory ? "Edit" : "Add RCA"}
                  </Button>
                </CardHeader>
                <CardContent className="space-y-6">
                  {!investigation.rootCauseCategory && !investigation.rootCauseDescription && investigation.contributingFactors.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No root cause analysis completed yet. Click &quot;Add RCA&quot; to begin.
                    </p>
                  ) : (
                    <>
                      {/* Root Cause Category */}
                      {investigation.rootCauseCategory && (
                        <div>
                          <Label className="text-muted-foreground">Root Cause Category</Label>
                          <p className="mt-1 text-sm font-medium">
                            {investigation.rootCauseCategory === "other"
                              ? investigation.rootCauseOther || "Other"
                              : rootCauseCategories.find(c => c.value === investigation.rootCauseCategory)?.label || investigation.rootCauseCategory}
                          </p>
                        </div>
                      )}

                      {/* Root Cause Description */}
                      {investigation.rootCauseDescription && (
                        <div>
                          <Label className="text-muted-foreground">Root Cause Description</Label>
                          <p className="mt-1 text-sm">{investigation.rootCauseDescription}</p>
                        </div>
                      )}

                      {/* Contributing Factors */}
                      {investigation.contributingFactors.length > 0 && (
                        <div>
                          <Label className="text-muted-foreground">Contributing Factors</Label>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {investigation.contributingFactors.map((factorId) => {
                              const factor = contributingFactors.find(f => f.id === factorId);
                              return (
                                <span key={factorId} className="rounded-md bg-muted px-2.5 py-1 text-xs font-medium">
                                  {factor?.label || factorId}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Notes / Comments, open field */}
                      <div>
                        <Label className="text-muted-foreground">Notes & Comments</Label>
                        <Textarea
                          placeholder={t("incidents.placeholders.addNotes")}
                          value={investigation.notes}
                          onChange={(e) => setInvestigation({ ...investigation, notes: e.target.value })}
                          rows={4}
                          className="mt-2"
                        />
                      </div>

                      {/* Attachments, images & PDFs */}
                      <div>
                        <Label className="text-muted-foreground">Attachments</Label>
                        <div className="mt-2 space-y-3">
                          {/* Existing attachments */}
                          {investigation.attachments.length > 0 && (
                            <div className="grid gap-2 sm:grid-cols-2">
                              {investigation.attachments.map((file) => (
                                <div key={file.id} className="flex items-center gap-2 rounded-lg border p-2">
                                  {file.type.startsWith("image/") ? (
                                    <ImageIcon className="h-4 w-4 text-blue-500 shrink-0" />
                                  ) : (
                                    <FileText className="h-4 w-4 text-red-500 shrink-0" />
                                  )}
                                  <span className="text-sm truncate flex-1">{file.name}</span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 shrink-0"
                                    onClick={() =>
                                      setInvestigation({
                                        ...investigation,
                                        attachments: investigation.attachments.filter((a) => a.id !== file.id),
                                      })
                                    }
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Upload button */}
                          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed p-3 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground">
                            <Upload className="h-4 w-4" />
                            <span>Upload image or PDF</span>
                            <input
                              type="file"
                              className="hidden"
                              accept="image/*,.pdf"
                              multiple
                              onChange={async (e) => {
                                const files = Array.from(e.target.files || []);
                                for (const f of files) {
                                  try {
                                    const stored = await storeFile(f, "incident-investigation", incidentId, authUser?.id || "");
                                    const newAttachment: RCAAttachment = {
                                      id: stored.id,
                                      name: stored.name,
                                      type: stored.type,
                                      url: stored.dataUrl,
                                      addedAt: new Date().toISOString(),
                                    };
                                    setInvestigation({
                                      ...(incidentRef.current?.investigation ?? investigation!),
                                      attachments: [...(incidentRef.current?.investigation?.attachments ?? investigation!.attachments), newAttachment],
                                    });
                                  } catch {
                                    toast(`Failed to upload ${f.name}`, "error");
                                  }
                                }
                                e.target.value = "";
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Witness Statements */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">Witness Statements</CardTitle>
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => setShowAddWitnessModal(true)}>
                    <Plus className="h-3 w-3" /> Add Witness
                  </Button>
                </CardHeader>
                <CardContent>
                  {investigation.witnesses.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No witness statements recorded yet</p>
                  ) : (
                    <div className="space-y-4">
                      {investigation.witnesses.map((witness, idx) => (
                        <div key={`witness-${witness.name}-${idx}`} className="p-4 rounded-lg border">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{witness.name}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">{formatDate(new Date(witness.date))}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">&ldquo;{witness.statement}&rdquo;</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Lessons Learned */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">Lessons Learned</CardTitle>
                  {!investigation.lessonsLearned && !showLessonsInput && (
                    <Button size="sm" variant="outline" onClick={() => setShowLessonsInput(true)}>
                      Add Lessons
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  {showLessonsInput && !investigation.lessonsLearned ? (
                    <div className="space-y-3">
                      <Textarea
                        placeholder={t("incidents.placeholders.lessonsLearned")}
                        value={lessonsInputValue}
                        onChange={(e) => setLessonsInputValue(e.target.value)}
                        rows={3}
                      />
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="outline" onClick={() => { setShowLessonsInput(false); setLessonsInputValue(""); }}>
                          Cancel
                        </Button>
                        <Button size="sm" onClick={() => {
                          if (lessonsInputValue.trim()) {
                            setInvestigation({ ...investigation, lessonsLearned: lessonsInputValue.trim() });
                          }
                          setShowLessonsInput(false);
                          setLessonsInputValue("");
                        }}>
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : investigation.lessonsLearned ? (
                    <p className="text-sm">{investigation.lessonsLearned}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No lessons learned documented yet</p>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {/* Start Investigation Modal */}
          {showStartInvestigationModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="fixed inset-0 bg-black/50" onClick={() => setShowStartInvestigationModal(false)} />
              <div className="relative bg-background rounded-lg shadow-lg w-full max-w-md p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Start Investigation</h2>
                  <Button variant="ghost" size="icon" onClick={() => setShowStartInvestigationModal(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="investigator-select">Assign Lead Investigator *</Label>
                    <select
                      id="investigator-select"
                      title="Select investigator"
                      aria-label="Select investigator"
                      className="w-full border rounded-md px-3 py-2 text-sm bg-background mt-1"
                      defaultValue=""
                    >
                      <option value="">Select investigator...</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>{u.full_name}</option>
                      ))}
                    </select>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    The lead investigator will be responsible for conducting the root cause analysis, interviewing witnesses, and documenting findings.
                  </p>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setShowStartInvestigationModal(false)}>Cancel</Button>
                  <Button onClick={() => {
                    const select = document.getElementById("investigator-select") as HTMLSelectElement;
                    if (select.value) handleStartInvestigation(select.value);
                  }}>
                    Start Investigation
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Add Witness Modal */}
          {showAddWitnessModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="fixed inset-0 bg-black/50" onClick={() => setShowAddWitnessModal(false)} />
              <div className="relative bg-background rounded-lg shadow-lg w-full max-w-md p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Add Witness Statement</h2>
                  <Button variant="ghost" size="icon" onClick={() => setShowAddWitnessModal(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label>Witness Name *</Label>
                    <Input 
                      placeholder={t("incidents.placeholders.witnessName")}
                      value={newWitness.name}
                      onChange={(e) => setNewWitness({ ...newWitness, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Statement *</Label>
                    <Textarea 
                      placeholder={t("incidents.placeholders.witnessStatement")}
                      value={newWitness.statement}
                      onChange={(e) => setNewWitness({ ...newWitness, statement: e.target.value })}
                      rows={4}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setShowAddWitnessModal(false)}>Cancel</Button>
                  <Button onClick={handleAddWitness} disabled={!newWitness.name || !newWitness.statement}>
                    Add Witness
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* RCA Modal */}
          {showRCAModal && investigation && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="fixed inset-0 bg-black/50" onClick={() => setShowRCAModal(false)} />
              <div className="relative bg-background rounded-lg shadow-lg w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Root Cause Analysis</h2>
                  <Button variant="ghost" size="icon" onClick={() => setShowRCAModal(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-6">
                  <div>
                    <Label htmlFor="root-cause-select">Root Cause Category *</Label>
                    <select
                      id="root-cause-select"
                      title="Select root cause category"
                      aria-label="Select root cause category"
                      className="w-full border rounded-md px-3 py-2 text-sm bg-background mt-1"
                      value={investigation.rootCauseCategory}
                      onChange={(e) => setInvestigation({ ...investigation, rootCauseCategory: e.target.value, rootCauseOther: e.target.value !== "other" ? "" : investigation.rootCauseOther })}
                    >
                      <option value="">Select category...</option>
                      {rootCauseCategories.map((cat) => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                    {investigation.rootCauseCategory === "other" && (
                      <Input
                        placeholder={t("incidents.placeholders.pleaseSpecify")}
                        value={investigation.rootCauseOther}
                        onChange={(e) => setInvestigation({ ...investigation, rootCauseOther: e.target.value })}
                        className="mt-2"
                      />
                    )}
                  </div>
                  <div>
                    <Label>Root Cause Description</Label>
                    <Textarea 
                      placeholder={t("incidents.placeholders.rootCauseDetail")}
                      value={investigation.rootCauseDescription}
                      onChange={(e) => setInvestigation({ ...investigation, rootCauseDescription: e.target.value })}
                      rows={3}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Contributing Factors</Label>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {contributingFactors.map((factor) => (
                        <label key={factor.id} className="flex items-center gap-2 text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            checked={investigation.contributingFactors.includes(factor.id)}
                            onChange={(e) => {
                              const newFactors = e.target.checked
                                ? [...investigation.contributingFactors, factor.id]
                                : investigation.contributingFactors.filter(f => f !== factor.id);
                              setInvestigation({ ...investigation, contributingFactors: newFactors });
                            }}
                            className="rounded"
                          />
                          {factor.label}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label>Lessons Learned</Label>
                    <Textarea 
                      placeholder={t("incidents.placeholders.shareLessons")}
                      value={investigation.lessonsLearned}
                      onChange={(e) => setInvestigation({ ...investigation, lessonsLearned: e.target.value })}
                      rows={3}
                      className="mt-1"
                    />
                  </div>

                  {/* Notes */}
                  <div>
                    <Label>Notes & Comments</Label>
                    <Textarea
                      placeholder={t("incidents.placeholders.additionalNotes")}
                      value={investigation.notes}
                      onChange={(e) => setInvestigation({ ...investigation, notes: e.target.value })}
                      rows={3}
                      className="mt-1"
                    />
                  </div>

                  {/* Attachments */}
                  <div>
                    <Label>Attachments</Label>
                    {investigation.attachments.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {investigation.attachments.map((file) => (
                          <div key={file.id} className="flex items-center gap-2 rounded border p-2 text-sm">
                            {file.type.startsWith("image/") ? (
                              <ImageIcon className="h-4 w-4 text-blue-500 shrink-0" />
                            ) : (
                              <FileText className="h-4 w-4 text-red-500 shrink-0" />
                            )}
                            <span className="truncate flex-1">{file.name}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 shrink-0"
                              onClick={() =>
                                setInvestigation({
                                  ...investigation,
                                  attachments: investigation.attachments.filter((a) => a.id !== file.id),
                                })
                              }
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                    <label className="mt-2 flex cursor-pointer items-center gap-2 rounded-lg border border-dashed p-3 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground">
                      <Upload className="h-4 w-4" />
                      <span>Upload image or PDF</span>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*,.pdf"
                        multiple
                        onChange={async (e) => {
                          const files = Array.from(e.target.files || []);
                          for (const f of files) {
                            try {
                              const stored = await storeFile(f, "incident-investigation", incidentId, authUser?.id || "");
                              const newAttachment: RCAAttachment = {
                                id: stored.id,
                                name: stored.name,
                                type: stored.type,
                                url: stored.dataUrl,
                                addedAt: new Date().toISOString(),
                              };
                              setInvestigation({
                                ...(incidentRef.current?.investigation ?? investigation!),
                                attachments: [...(incidentRef.current?.investigation?.attachments ?? investigation!.attachments), newAttachment],
                              });
                            } catch {
                              toast(`Failed to upload ${f.name}`, "error");
                            }
                          }
                          e.target.value = "";
                        }}
                      />
                    </label>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-6 mt-4 border-t">
                  <Button variant="outline" onClick={() => setShowRCAModal(false)}>Cancel</Button>
                  <Button onClick={() => setShowRCAModal(false)}>
                    Save Analysis
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "tasks" && (
        <div className="space-y-6">
          {/* Summary */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Progress</p>
                  <p className="text-2xl font-semibold">{completedActions} / {totalActions} completed</p>
                </div>
                <div className="flex items-center gap-4">
                  {allActionsComplete && totalActions > 0 && (
                    <span className="text-sm text-muted-foreground">Ready to close incident</span>
                  )}
                  <Button size="sm" className="gap-1" onClick={() => setShowAddActionModal(true)}>
                    <Plus className="h-3 w-3" /> Add Action
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions List */}
          {actions.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="font-medium">No actions yet</p>
                  <p className="text-sm text-muted-foreground mb-4">Create actions to track what needs to be done to resolve this incident</p>
                  <Button onClick={() => setShowAddActionModal(true)} className="gap-1">
                    <Plus className="h-4 w-4" /> Create First Action
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {actions.map((action) => (
                <Card key={action.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      {getStatusIcon(action.status)}
                      <div className="flex-1 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium">{action.title}</p>
                              <Badge variant={action.actionType === "corrective" ? "destructive" : "secondary"} className="text-xs">
                                {action.actionType === "corrective" ? "Corrective" : "Preventive"}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{action.description}</p>
                          </div>
                          <Badge variant={getPriorityColor(action.priority)}>{action.priority}</Badge>
                        </div>
                        
                        <div className="flex flex-wrap gap-4 text-sm">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <User className="h-4 w-4" />
                            {action.assignee ? getAssigneeName(action.assignee) : "Unassigned"}
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            {t("tickets.labels.dueDate")}: {formatDate(new Date(action.dueDate))}
                          </div>
                        </div>

                        {/* Linked Ticket */}
                        <div className="border rounded-lg p-3 bg-muted/30">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Ticket className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">{action.ticketId}</span>
                              <Badge variant={
                                action.ticketStatus === "resolved" ? "success" : 
                                action.ticketStatus === "in_progress" ? "warning" : "secondary"
                              }>
                                {action.ticketStatus.replace("_", " ")}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              {action.ticketStatus !== "resolved" && (
                                <select
                                  title="Ticket status"
                                  aria-label="Ticket status"
                                  className="text-sm border rounded px-2 py-1 bg-background"
                                  value={action.ticketStatus}
                                  onChange={(e) => handleTicketStatusChange(action.id, e.target.value as "open" | "in_progress" | "resolved")}
                                >
                                  <option value="open">Open</option>
                                  <option value="in_progress">In Progress</option>
                                  <option value="resolved">Resolved</option>
                                </select>
                              )}
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="gap-1"
                                onClick={() => router.push(`/${company}/dashboard/tickets/${action.ticketId}`)}
                              >
                                <ExternalLink className="h-3 w-3" /> View Ticket
                              </Button>
                            </div>
                          </div>
                          {action.resolutionNotes && (
                            <div className="mt-2 pt-2 border-t">
                              <p className="text-xs text-muted-foreground">Resolution Notes:</p>
                              <p className="text-sm">{action.resolutionNotes}</p>
                            </div>
                          )}
                        </div>
                        {action.correctiveActionId && (
                          <div className="border rounded-lg p-3 bg-destructive/5">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <Shield className="h-4 w-4 text-destructive" />
                                <span className="text-sm font-medium">{action.correctiveActionId}</span>
                                <Badge variant={
                                  (correctiveActions.find((item) => item.id === action.correctiveActionId)?.status ?? "open") === "completed"
                                    ? "success"
                                    : (correctiveActions.find((item) => item.id === action.correctiveActionId)?.status ?? "open") === "in_progress"
                                      ? "warning"
                                      : "destructive"
                                }>
                                  {correctiveActions.find((item) => item.id === action.correctiveActionId)?.status?.replace(/_/g, " ") || "open"}
                                </Badge>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="gap-1"
                                onClick={() => router.push(`/${company}/dashboard/corrective-actions/${action.correctiveActionId}`)}
                              >
                                <ExternalLink className="h-3 w-3" /> View Corrective Action
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Add Action Modal */}
          {showAddActionModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="fixed inset-0 bg-black/50" onClick={() => setShowAddActionModal(false)} />
              <div className="relative bg-background rounded-lg shadow-lg w-full max-w-md p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Add Action</h2>
                  <Button variant="ghost" size="icon" onClick={() => setShowAddActionModal(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-4">
                  {/* Action Type */}
                  <div>
                    <Label>Action Type *</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => setNewAction({ ...newAction, actionType: "corrective" })}
                        className={cn(
                          "flex flex-col items-center gap-1 rounded-lg border-2 p-3 transition-all text-sm",
                          newAction.actionType === "corrective" ? "border-destructive bg-destructive/10" : "border-border hover:border-destructive/50"
                        )}
                      >
                        <span className="font-medium">Corrective</span>
                        <span className="text-xs text-muted-foreground">Fix the issue now</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewAction({ ...newAction, actionType: "preventive" })}
                        className={cn(
                          "flex flex-col items-center gap-1 rounded-lg border-2 p-3 transition-all text-sm",
                          newAction.actionType === "preventive" ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                        )}
                      >
                        <span className="font-medium">Preventive</span>
                        <span className="text-xs text-muted-foreground">Prevent recurrence</span>
                      </button>
                    </div>
                  </div>
                  <div>
                    <Label>Action Title *</Label>
                    <Input 
                      placeholder={t("incidents.placeholders.actionRequired")}
                      value={newAction.title}
                      onChange={(e) => setNewAction({ ...newAction, title: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea 
                      placeholder={t("incidents.placeholders.additionalDetails")}
                      value={newAction.description}
                      onChange={(e) => setNewAction({ ...newAction, description: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="action-priority">Priority</Label>
                      <select
                        id="action-priority"
                        title="Action priority"
                        aria-label="Action priority"
                        className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                        value={newAction.priority}
                        onChange={(e) => setNewAction({ ...newAction, priority: e.target.value as "low" | "medium" | "high" | "urgent" })}
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                    <div>
                      <Label>Due Date *</Label>
                      <Input 
                        type="date"
                        value={newAction.dueDate}
                        onChange={(e) => setNewAction({ ...newAction, dueDate: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="action-assignee">Assign To *</Label>
                    <select
                      id="action-assignee"
                      title="Select assignee"
                      aria-label="Select assignee"
                      className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                      value={newAction.assignee}
                      onChange={(e) => setNewAction({ ...newAction, assignee: e.target.value })}
                    >
                      <option value="">Select assignee...</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>{u.full_name}</option>
                      ))}
                    </select>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    A ticket will be automatically created and assigned to track this action.
                  </p>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setShowAddActionModal(false)}>Cancel</Button>
                  <Button 
                    onClick={handleAddAction}
                    disabled={!newAction.title || !newAction.assignee || !newAction.dueDate}
                  >
                    Create Action & Ticket
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "comments" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Comments & Discussion</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-medium">
                    {comment.avatar}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{comment.user}</span>
                      <span className="text-xs text-muted-foreground">{formatDate(new Date(comment.date))}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{comment.text}</p>
                    {comment.mentionedUserIds && comment.mentionedUserIds.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {comment.mentionedUserIds.map((uid) => {
                          const u = users.find((x) => x.id === uid);
                          return u ? <span key={uid} className="text-xs text-primary font-medium">@{u.full_name}</span> : null;
                        })}
                      </div>
                    )}
                    {comment.attachments && comment.attachments.length > 0 && (
                      <div className="flex gap-2 mt-2">
                        {comment.attachments.map(att => (
                          att.type.startsWith("image/") ? (
                            <img key={att.id} src={att.url} alt={att.name} className="h-16 w-16 rounded border object-cover" />
                          ) : (
                            <a key={att.id} href={att.url} download={att.name} className="flex items-center gap-1 rounded border px-2 py-1 text-xs hover:bg-muted">
                              <FileText className="h-3 w-3" /> {att.name}
                            </a>
                          )
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t pt-4">
              <div className="flex gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                  {authUser?.full_name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "?"}
                </div>
                <div className="flex-1 space-y-2">
                  <Textarea placeholder={t("incidents.placeholders.addComment")} value={newComment} onChange={(e) => setNewComment(e.target.value)} rows={3} className="border-2 border-border" />
                  {/* Tagged users */}
                  {commentTaggedUsers.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
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
                  <div className="flex items-center gap-2">
                    {/* Tag person */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowTagPicker(!showTagPicker)}
                        className="cursor-pointer text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 border rounded px-2 py-1"
                      >
                        <User className="h-3 w-3" /> Tag
                      </button>
                      {showTagPicker && (
                        <div className="absolute bottom-full mb-1 left-0 z-20 w-56 rounded-lg border bg-popover shadow-lg max-h-48 overflow-y-auto">
                          <div className="p-2">
                            <input
                              type="text"
                              placeholder="Search users..."
                              value={tagSearch}
                              onChange={(e) => setTagSearch(e.target.value)}
                              className="w-full rounded-md border px-2 py-1 text-xs mb-1"
                              autoFocus
                            />
                          </div>
                          {users
                            .filter((u) => {
                              // Only show users who can view incidents
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
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-muted transition-colors"
                              >
                                <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-[9px] font-medium shrink-0">
                                  {u.full_name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                                </div>
                                <span>{u.full_name}</span>
                                <span className="text-muted-foreground capitalize ml-auto">{u.role.replace("_", " ")}</span>
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                    {/* Attach file */}
                    <label className="cursor-pointer text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 border rounded px-2 py-1">
                      <Upload className="h-3 w-3" /> Attach
                      <input type="file" multiple accept="image/*,.pdf,.doc,.docx" className="hidden" onChange={handleCommentFileUpload} />
                    </label>
                    {commentAttachments.length > 0 && (
                      <span className="text-xs text-muted-foreground">{commentAttachments.length} file(s)</span>
                    )}
                  </div>
                  {commentAttachments.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {commentAttachments.map(att => (
                        <div key={att.id} className="flex items-center gap-1 rounded border px-2 py-1 text-xs">
                          {att.name}
                          <button type="button" onClick={() => setCommentAttachments(prev => prev.filter(a => a.id !== att.id))} className="text-muted-foreground hover:text-foreground">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <Button 
                    size="sm" 
                    disabled={!newComment.trim()}
                    onClick={() => {
                      if (!newComment.trim()) return;
                      const comment: IncidentComment = {
                        id: `comment-${Date.now()}`,
                        user: authUser?.full_name || "Unknown User",
                        userId: authUser?.id || "unknown",
                        text: newComment.trim(),
                        date: new Date().toISOString(),
                        avatar: authUser?.full_name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "?",
                        attachments: commentAttachments.length > 0 ? commentAttachments : undefined,
                        mentionedUserIds: commentTaggedUsers.length > 0 ? commentTaggedUsers : undefined,
                      };
                      addComment(comment);
                      setNewComment("");
                      setCommentAttachments([]);
                      setCommentTaggedUsers([]);
                      toast("Comment posted.", "success");
                    }}
                  >
                    Post Comment
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "documents" && (
        <div className="space-y-6">
          {/* Documents only — PDFs, compliance docs, etc. */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Documents
              </CardTitle>
              <Button size="sm" variant="outline" className="gap-1" onClick={() => documentsInputRef.current?.click()}>
                <Plus className="h-3 w-3" /> Upload
              </Button>
              <input
                ref={documentsInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
                multiple
                onChange={async (e) => {
                  const files = Array.from(e.target.files || []);
                  for (const f of files) {
                    try {
                      const stored = await storeFile(f, "incident-document", incidentId, authUser?.id || "");
                      const newDoc: IncidentDocument = {
                        id: stored.id,
                        name: stored.name,
                        type: stored.type,
                        url: stored.dataUrl,
                        size: stored.size,
                        uploadedAt: new Date().toISOString(),
                        uploadedBy: authUser?.full_name || "Unknown",
                      };
                      const currentDocs = incidentRef.current?.documents ?? [];
                      updateIncident(incidentId, {
                        documents: [...currentDocs, newDoc],
                        updated_at: new Date().toISOString(),
                      });
                      toast(`Uploaded ${stored.name}`, "success");
                    } catch {
                      toast(`Failed to upload ${f.name}`, "error");
                    }
                  }
                  e.target.value = "";
                }}
              />
            </CardHeader>
            <CardContent>
              {documents.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No documents uploaded yet</p>
                  <Button size="sm" variant="outline" className="mt-3 gap-1" onClick={() => documentsInputRef.current?.click()}>
                    <Upload className="h-3 w-3" /> Upload Document
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 group">
                      <FileText className="h-8 w-8 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{doc.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {((doc.size || 0) / 1024).toFixed(1)} KB • {doc.uploadedBy || doc.uploaded_by || "Unknown"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {doc.url && (
                          <a href={doc.url} download={doc.name} className="inline-flex">
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <Download className="h-3 w-3" />
                            </Button>
                          </a>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100"
                          onClick={() => {
                            const updatedDocs = documents.filter(d => d.id !== doc.id);
                            updateIncident(incidentId, { documents: updatedDocs, updated_at: new Date().toISOString() });
                            toast("Document removed", "info");
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Compliance tab */}
      {activeTab === "compliance" && (
        <ComplianceTab incident={incident} companyCountry={currentCompany?.country || "US"} reporter={reporter} />
      )}

      {activeTab === "settings" && !isLocked && canEdit && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Incident Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="incident-status">Status</Label>
                <select
                  id="incident-status"
                  title="Incident status"
                  aria-label="Incident status"
                  className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={statusValue}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (!incident) return;
                    if (value === "resolved" && !canResolveIncident) {
                      const reasons = [];
                      if (openCorrectiveActionCount > 0) reasons.push(`${openCorrectiveActionCount} open action(s)`);
                      if (openTicketCount > 0) reasons.push(`${openTicketCount} open ticket(s)`);
                      toast(`Cannot resolve: ${reasons.join(" and ")} remaining`, "error");
                      return;
                    }
                    setStatusValue(value);
                    updateIncident(incident.id, {
                      status: value as typeof incident.status,
                      resolved_at: value === "resolved" ? new Date().toISOString() : null,
                      resolved_by: value === "resolved" ? (investigatorIdValue || incident.resolved_by || authUser?.id || null) : incident.resolved_by,
                      updated_at: new Date().toISOString(),
                    });
                    toast("Incident status updated");
                  }}
                >
                  <option value="new">New</option>
                  <option value="in_progress">In Progress</option>
                  <option value="in_review">In Review</option>
                  <option value="resolved" disabled={!canResolveIncident}>Resolved{!canResolveIncident ? " (blocked)" : ""}</option>
                  <option value="closed">Closed</option>
                </select>
                {!canResolveIncident && (
                  <p className="mt-2 text-sm text-destructive">
                    Resolution blocked: {openCorrectiveActionCount > 0 ? `${openCorrectiveActionCount} open action(s)` : ""}{openCorrectiveActionCount > 0 && openTicketCount > 0 ? " and " : ""}{openTicketCount > 0 ? `${openTicketCount} open ticket(s)` : ""}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="assigned-investigator">Assigned Investigator</Label>
                <select
                  id="assigned-investigator"
                  title="Assigned investigator"
                  aria-label="Assigned investigator"
                  className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={investigatorIdValue}
                  onChange={(e) => {
                    const value = e.target.value;
                    setInvestigatorIdValue(value);
                    if (!incident) return;
                    updateIncident(incident.id, {
                      resolved_by: value || null,
                      updated_at: new Date().toISOString(),
                    });
                    toast("Assigned investigator updated");
                  }}
                >
                  <option value="">Select investigator...</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.full_name}</option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>

          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-base text-destructive">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Archive Incident</p>
                  <p className="text-sm text-muted-foreground">Move this incident to archive</p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (!incident) return;
                    updateIncident(incident.id, {
                      status: "archived",
                      updated_at: new Date().toISOString(),
                    });
                    toast("Incident archived");
                    router.push(`/${company}/dashboard/incidents`);
                  }}
                >
                  Archive
                </Button>
              </div>
              {canDelete && (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Delete Incident</p>
                  <p className="text-sm text-muted-foreground">Permanently delete this incident</p>
                </div>
                <Button
                  variant="destructive"
                  className="gap-2"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </Button>
              </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative bg-background rounded-lg shadow-lg w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Delete Incident</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowDeleteConfirm(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to permanently delete this incident? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (!incident) return;
                  removeIncident(incident.id);
                  toast("Incident deleted", "info");
                  router.push(`/${company}/dashboard/incidents`);
                }}
              >
                Delete Permanently
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Image viewer */}
      {viewerImage && (
        <ImageViewer
          src={viewerImage.src}
          alt="Incident photo"
          onClose={() => setViewerImage(null)}
          onSave={!isLocked ? (annotated) => {
            if (!incident?.media_urls) return;
            const updated = [...incident.media_urls];
            updated[viewerImage.index] = annotated;
            updateIncident(incidentId, { media_urls: updated, updated_at: new Date().toISOString() });
            setViewerImage(null);
          } : undefined}
        />
      )}

      {/* Lightbox */}
      {showLightbox && incident.media_urls && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={() => setShowLightbox(false)}>
          <button className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-2" onClick={(e) => { e.stopPropagation(); setLightboxIndex((i) => Math.max(0, i - 1)); }}>
            <ChevronLeft className="h-8 w-8" />
          </button>
          <img
            src={incident.media_urls.filter(url => url.startsWith("data:image"))[lightboxIndex]}
            alt="Photo"
            className="max-h-[85vh] max-w-[85vw] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          <button className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-2" onClick={(e) => { e.stopPropagation(); const photos = incident.media_urls!.filter(url => url.startsWith("data:image")); setLightboxIndex((i) => Math.min(photos.length - 1, i + 1)); }}>
            <ChevronRight className="h-8 w-8" />
          </button>
          <button className="absolute top-4 right-4 text-white/70 hover:text-white p-2" onClick={() => setShowLightbox(false)}>
            <X className="h-6 w-6" />
          </button>
          <p className="absolute bottom-4 text-white/50 text-sm">{lightboxIndex + 1} / {incident.media_urls.filter(url => url.startsWith("data:image")).length}</p>
        </div>
      )}

      {/* Close Incident Modal */}
      {showCloseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-background rounded-xl border shadow-2xl max-w-md w-full mx-4 p-6">
            <h3 className="font-semibold text-lg mb-2">Close Incident</h3>
            <p className="text-sm text-muted-foreground mb-4">Please provide a reason for closing this incident. This is required for compliance records.</p>
            <Textarea
              value={closeReason}
              onChange={(e) => setCloseReason(e.target.value)}
              placeholder="Enter closure reason..."
              rows={3}
              className="mb-4"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setShowCloseModal(false); setCloseReason(""); }}>Cancel</Button>
              <Button
                disabled={!closeReason.trim()}
                onClick={() => {
                  updateIncident(incidentId, {
                    status: "closed",
                    closure_reason: closeReason.trim(),
                    resolved_at: new Date().toISOString(),
                    resolved_by: authUser?.id || null,
                    updated_at: new Date().toISOString(),
                  });
                  setShowCloseModal(false);
                  setCloseReason("");
                  toast("Incident closed");
                }}
              >Close Incident</Button>
            </div>
          </div>
        </div>
      )}
    </RoleGuard>
  );
}

// ── Compliance Tab ──────────────────────────────────────────────────
const REGULATORY_FORMS: Record<string, { id: string; name: string; regulation: string }[]> = {
  US: [
    { id: "osha_300", name: "OSHA Form 300 — Log of Work-Related Injuries", regulation: "29 CFR 1904" },
    { id: "osha_301", name: "OSHA Form 301 — Injury and Illness Report", regulation: "29 CFR 1904.29" },
  ],
  GB: [
    { id: "riddor", name: "RIDDOR Report", regulation: "Reporting of Injuries, Diseases and Dangerous Occurrences Regulations 2013" },
  ],
  NL: [
    { id: "arbowet_melding", name: "Arbowet Incident Melding", regulation: "Arbeidsomstandighedenwet Art. 9" },
  ],
  SE: [
    { id: "afs_report", name: "AFS Incident Report", regulation: "Arbetsmiljöverket AFS 2001:1" },
  ],
  DE: [
    { id: "bg_unfall", name: "BG Unfallanzeige", regulation: "SGB VII §193" },
  ],
  FR: [
    { id: "dat", name: "Déclaration d'accident du travail", regulation: "Code de la sécurité sociale L441-2" },
  ],
  ES: [
    { id: "parte_accidente", name: "Parte de accidente de trabajo", regulation: "Orden TAS/2926/2002" },
  ],
};

function ComplianceTab({ incident, companyCountry, reporter }: {
  incident: Incident;
  companyCountry: string;
  reporter: UserType | null | undefined;
}) {
  const forms = REGULATORY_FORMS[companyCountry] || [];
  const isInjury = incident.type === "injury" || incident.lost_time;

  if (!isInjury || forms.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-muted-foreground">
          {forms.length === 0
            ? "No regulatory forms configured for this country."
            : "Compliance forms are available for injury incidents and lost-time cases."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {forms.map((form) => (
        <Card key={form.id}>
          <CardContent className="pt-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium">{form.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{form.regulation}</p>
              </div>
              <Badge variant="secondary" className="shrink-0 text-xs">Draft</Badge>
            </div>
            <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">Employee</p>
                <p className="font-medium">{reporter?.full_name || "Anonymous"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Date of injury</p>
                <p className="font-medium">{incident.incident_date}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Location</p>
                <p className="font-medium">{incident.building || incident.location_description || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Description</p>
                <p className="font-medium line-clamp-2">{incident.description}</p>
              </div>
              {incident.lost_time && (
                <div>
                  <p className="text-xs text-muted-foreground">Days away from work</p>
                  <p className="font-medium">{incident.lost_time_amount ?? "—"}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
