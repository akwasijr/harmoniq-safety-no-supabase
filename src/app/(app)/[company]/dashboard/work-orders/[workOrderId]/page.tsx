"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { WORK_ORDER_STATUS_COLORS, getUserFirstLastName } from "@/lib/status-utils";
import { LoadingPage } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";
import {
  ArrowLeft,
  Edit,
  Save,
  AlertTriangle,
  ChevronDown,
  MapPin,
  Info,
  Link2,
  Clock3,
  User,
  Calendar,
  ClipboardCheck,
  Package,
  Paperclip,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useCompanyData } from "@/hooks/use-company-data";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/components/ui/toast";
import { useTranslation } from "@/i18n";
import { capitalize, cn } from "@/lib/utils";
import type { Priority, WorkOrder, WorkOrderStatus, WorkOrderStatusLogEntry } from "@/types";
import { WORK_ORDER_STATUS_TRANSITIONS, WORK_ORDER_TYPES } from "@/types";
import { RoleGuard } from "@/components/auth/role-guard";
import { formatStatusLabel } from "@/components/tasks/task-detail-header";
import { StatusPipeline } from "@/components/work-orders/status-pipeline";
import { StatusChangeModal } from "@/components/work-orders/status-change-modal";
import { useWorkOrderStatusLogStore } from "@/stores/work-order-status-log-store";
import { DetailTabs, Tab } from "@/components/ui/detail-tabs";
import { getProcedureTemplateIdForType } from "@/data/work-order-procedure-templates";
import { storeFile, getFilesForEntity, downloadFile } from "@/lib/file-storage";

const STATUS_FLOW: Record<string, string[]> = {
  waiting_approval: ["waiting_material", "approved", "cancelled"],
  waiting_material: ["approved", "cancelled"],
  approved: ["scheduled", "in_progress", "cancelled"],
  scheduled: ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

const STATUS_COLORS = WORK_ORDER_STATUS_COLORS;

type SectionId = "summary" | "related" | "work-log";

const NAV_ITEMS: Tab[] = [
  { id: "summary", label: "Summary", icon: Info },
  { id: "related", label: "Related records", icon: Link2 },
  { id: "work-log", label: "Work log", icon: Clock3 },
];



export default function WorkOrderDetailPage() {
  const router = useRouter();
  const routeParams = useParams();
  const searchParams = useSearchParams();
  const company = routeParams.company as string;
  const workOrderId = routeParams.workOrderId as string;
  const highlight = searchParams.get("highlight");

  const { t, formatDate, formatNumber } = useTranslation();
  const { user, hasPermission } = useAuth();
  const { toast } = useToast();
  const { correctiveActions, inspections, workOrders: orders, assets, locations, users, teams, parts, checklistTemplates, checklistSubmissions, stores } = useCompanyData();
  const { update, isLoading } = stores.workOrders;

  const canEdit = hasPermission("work_orders.edit");
  const canAssign = hasPermission("work_orders.assign");
  const canComplete = hasPermission("work_orders.complete");
  const { items: statusLogItems, add: addStatusLog } = useWorkOrderStatusLogStore();

  const order = orders.find((o) => o.id === workOrderId);

  const [isEditing, setIsEditing] = React.useState(false);
  const [showStatusModal, setShowStatusModal] = React.useState(false);
  const [activeSection, setActiveSection] = React.useState<SectionId>("summary");
  const [showActionMenu, setShowActionMenu] = React.useState(false);
  const [pendingActionStatus, setPendingActionStatus] = React.useState<WorkOrderStatus | null>(null);
  const [attachmentRefresh, setAttachmentRefresh] = React.useState(0);
  const [editForm, setEditForm] = React.useState({
    title: "",
    description: "",
    asset_id: "__none__",
    location_id: "__none__",
    type: "service_request",
    checklist_template_id: "__none__",
    priority: "medium" as Priority,
    assigned_to: "__none__",
    assigned_to_team_id: "__none__",
    due_date: "",
    estimated_hours: "",
  });

  const highlightRef = React.useRef<HTMLDivElement>(null);
  const actionMenuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (order) {
      setEditForm({
        title: order.title,
        description: order.description,
        asset_id: order.asset_id || "__none__",
        location_id: order.location_id || "__none__",
        type: order.type,
        checklist_template_id: order.checklist_template_id || "__none__",
        priority: order.priority,
        assigned_to: order.assigned_to || "__none__",
        assigned_to_team_id: order.assigned_to_team_id || "__none__",
        due_date: order.due_date ? order.due_date.split("T")[0] : "",
        estimated_hours: order.estimated_hours != null ? String(order.estimated_hours) : "",
      });
    }
  }, [order?.id]);

  React.useEffect(() => {
    if (highlight && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlight]);

  React.useEffect(() => {
    if (!showActionMenu) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!actionMenuRef.current?.contains(event.target as Node)) {
        setShowActionMenu(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [showActionMenu]);

  const getAssetName = (id: string | null) => {
    if (!id) return null;
    return assets.find((a) => a.id === id);
  };

  const getUserName = (id: string | null) => getUserFirstLastName(id, users, t("common.none"));
  const getTeamName = (id: string | null | undefined) => teams.find((team) => team.id === id)?.name ?? t("common.none");

  const orderStatusLog = React.useMemo(
    () => statusLogItems.filter((e) => e.work_order_id === workOrderId),
    [statusLogItems, workOrderId],
  );

  const handleStatusChangeConfirm = (targetStatus: WorkOrderStatus, comment: string) => {
    if (!order) return;
    const logEntry: WorkOrderStatusLogEntry = {
      id: crypto.randomUUID(),
      work_order_id: order.id,
      from_status: order.status,
      to_status: targetStatus,
      comment,
      changed_by: user?.id || "",
      changed_at: new Date().toISOString(),
    };
    addStatusLog(logEntry);

    const updates: Partial<WorkOrder> = {
      status: targetStatus,
      updated_at: new Date().toISOString(),
    };
    if (targetStatus === "completed") {
      updates.completed_at = new Date().toISOString();
    }
    update(order.id, updates);
    setPendingActionStatus(null);
    setShowStatusModal(false);
    toast(`Status changed to ${capitalize(targetStatus.replace(/_/g, " "))}`);
  };

  const handleSave = () => {
    if (!order) return;
    update(order.id, {
      title: editForm.title.trim(),
      description: editForm.description.trim(),
      asset_id: editForm.asset_id === "__none__" ? null : editForm.asset_id,
      location_id: editForm.location_id === "__none__" ? null : editForm.location_id,
      type: editForm.type as WorkOrder["type"],
      checklist_template_id: getProcedureTemplateIdForType(editForm.type as WorkOrder["type"]),
      priority: editForm.priority,
      assigned_to: editForm.assigned_to === "__none__" ? null : editForm.assigned_to,
      assigned_to_team_id: editForm.assigned_to_team_id === "__none__" ? null : editForm.assigned_to_team_id,
      due_date: editForm.due_date || null,
      estimated_hours: editForm.estimated_hours ? parseFloat(editForm.estimated_hours) : null,
      updated_at: new Date().toISOString(),
    });
    setIsEditing(false);
    toast(t("common.save"));
  };

  if (!isLoading && !order) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Work order not found"
        description="This work order may have been removed."
        action={
          <Button variant="outline" size="sm" onClick={() => router.push(`/${company}/dashboard/work-orders`)}>
            Back to work orders
          </Button>
        }
      />
    );
  }
  if (!order) return <LoadingPage />;

  const assetIdForView = isEditing ? (editForm.asset_id === "__none__" ? null : editForm.asset_id) : order.asset_id;
  const locationIdForView = isEditing ? (editForm.location_id === "__none__" ? null : editForm.location_id) : (order.location_id ?? null);
  const templateIdForView = isEditing
    ? (editForm.checklist_template_id === "__none__" ? null : editForm.checklist_template_id)
    : (order.checklist_template_id || getProcedureTemplateIdForType(order.type));
  const asset = getAssetName(assetIdForView);
  const selectedLocation = locationIdForView ? locations.find((location) => location.id === locationIdForView) ?? null : null;
  const assetLocation = asset?.location_id ? locations.find((location) => location.id === asset.location_id) ?? null : null;
  const workOrderLocation = selectedLocation ?? assetLocation;
  const locationHierarchy = React.useMemo(() => {
    if (!workOrderLocation) return [];

    const chain: (typeof locations)[number][] = [];
    const seen = new Set<string>();
    let current: (typeof locations)[number] | null = workOrderLocation;

    while (current && !seen.has(current.id)) {
      chain.unshift(current);
      seen.add(current.id);
      const parentId: string | null = current.parent_id;
      current = parentId ? (locations.find((item) => item.id === parentId) ?? null) : null;
    }

    return chain;
  }, [workOrderLocation, locations]);
  const linkedCorrectiveAction = order.corrective_action_id
    ? correctiveActions.find((action) => action.id === order.corrective_action_id) || null
    : null;
  const linkedInspection = linkedCorrectiveAction?.inspection_id
    ? inspections.find((inspection) => inspection.id === linkedCorrectiveAction.inspection_id) || null
    : null;
  const linkedProcedureTemplate = templateIdForView
    ? checklistTemplates.find((template) => template.id === templateIdForView) || null
    : null;
  const linkedProcedureSubmission = order.checklist_submission_id
    ? checklistSubmissions.find((submission) => submission.id === order.checklist_submission_id) || null
    : null;
  const linkedProcedureFailCount = linkedProcedureSubmission?.responses.filter((response) => response.value === false).length ?? 0;
  const requiresChecklist = Boolean(order.checklist_template_id && !order.checklist_submission_id);
  const nextStatuses = (STATUS_FLOW[order.status] || []) as WorkOrderStatus[];
  const totalCost = (order.parts_cost || 0) + (order.labor_cost || 0);
  const woNumber = `WO-${order.id.substring(0, 8).toUpperCase()}`;
  const woFiles = React.useMemo(() => getFilesForEntity("work-order", order.id), [order.id, attachmentRefresh]);

  const getActionLabel = (status: WorkOrderStatus) => {
    switch (status) {
      case "waiting_material":
        return "Request material";
      case "approved":
        return t("workOrders.buttons.approve");
      case "scheduled":
        return "Schedule";
      case "in_progress":
        return t("workOrders.buttons.start");
      case "completed":
        return t("workOrders.buttons.complete");
      case "cancelled":
        return t("workOrders.buttons.cancel");
      default:
        return formatStatusLabel(status);
    }
  };

  const headerMeta = [
    woNumber,
    order.due_date ? `Due ${formatDate(order.due_date)}` : `Created ${formatDate(order.created_at)}`,
    asset?.name || workOrderLocation?.name || "No asset or location linked",
  ].filter(Boolean);

  return (
    <RoleGuard requiredPermission="work_orders.view">
    <div className="space-y-6" ref={highlight ? highlightRef : undefined}>
      {/* Record navigation */}
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" className="mt-1 shrink-0" onClick={() => router.push(`/${company}/dashboard/work-orders`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            {isEditing ? (
              <Input
                className="text-xl font-semibold flex-1"
                value={editForm.title}
                onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
              />
            ) : (
              <h1 className="text-2xl font-semibold truncate">{order.title}</h1>
            )}
          </div>
        </div>

        <div className="flex gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={async () => {
              const { WorkOrderPDF, downloadPDF } = await import("@/lib/pdf-export");
              const a = asset;
              const loc = workOrderLocation;
              const tmpl = linkedProcedureTemplate;
              const doc = <WorkOrderPDF
                companyName={company}
                workOrder={{
                  reference: woNumber,
                  title: order.title,
                  description: order.description,
                  type: order.type,
                  priority: order.priority,
                  status: order.status,
                  asset: a?.name,
                  location: loc?.name,
                  assigned_to: getUserName(order.assigned_to),
                  assigned_team: getTeamName(order.assigned_to_team_id) || undefined,
                  due_date: order.due_date,
                  estimated_hours: order.estimated_hours,
                  actual_hours: order.actual_hours,
                  parts_cost: order.parts_cost,
                  labor_cost: order.labor_cost,
                  declined_reason: order.declined_reason,
                  completed_at: order.completed_at,
                  created_at: order.created_at,
                  procedure_name: tmpl?.name,
                  procedure_steps: tmpl?.items.length,
                }}
              />;
              await downloadPDF(doc, `${woNumber}.pdf`);
            }}
          >
            <ArrowLeft className="h-3.5 w-3.5 rotate-[225deg]" />
            PDF
          </Button>
          {canEdit && (
            <>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => setIsEditing(!isEditing)}>
                <Edit className="h-4 w-4" />
                {isEditing ? t("common.cancel") : t("common.edit")}
              </Button>
              {isEditing && (
                <Button size="sm" className="gap-2" onClick={handleSave} disabled={!editForm.title.trim() || !editForm.description.trim()}>
                  <Save className="h-4 w-4" />
                  {t("common.save")}
                </Button>
              )}
            </>
          )}
          {(canEdit || canComplete) && (
            <div className="relative" ref={actionMenuRef}>
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                aria-haspopup="menu"
                aria-expanded={showActionMenu}
                onClick={() => setShowActionMenu((current) => !current)}
              >
                Action items
                <ChevronDown className="h-4 w-4" />
              </Button>

              {showActionMenu && (
                <div
                  role="menu"
                  className="absolute right-0 z-20 mt-2 min-w-[190px] rounded-md border bg-background p-1 shadow-md"
                >
                  {nextStatuses.length > 0 ? (
                    nextStatuses.map((status) => {
                      const blocked = status === "completed" && requiresChecklist;
                      return (
                        <button
                          key={status}
                          type="button"
                          role="menuitem"
                          className={cn(
                            "flex w-full items-center rounded-sm px-3 py-2 text-left text-sm",
                            blocked ? "cursor-not-allowed text-muted-foreground" : "hover:bg-muted",
                          )}
                          disabled={blocked}
                          onClick={() => {
                            if (blocked) return;
                            setPendingActionStatus(status);
                            setShowStatusModal(true);
                            setShowActionMenu(false);
                          }}
                        >
                          {getActionLabel(status)}
                          {blocked && <span className="ml-auto text-xs text-amber-500">Checklist required</span>}
                        </button>
                      );
                    })
                  ) : (
                    <div className="px-3 py-2 text-sm text-muted-foreground">No action items available</div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <StatusPipeline currentStatus={order.status} />

      {requiresChecklist && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-600 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>Complete the required procedure checklist before closing this work order</span>
        </div>
      )}

      {/* Status change modal */}
        <StatusChangeModal
          isOpen={showStatusModal}
          currentStatus={order.status}
          availableStatuses={pendingActionStatus ? [pendingActionStatus] : WORK_ORDER_STATUS_TRANSITIONS[order.status] || []}
          statusLog={orderStatusLog}
          users={users}
          onSubmit={handleStatusChangeConfirm}
          onCancel={() => {
            setPendingActionStatus(null);
            setShowStatusModal(false);
          }}
        />

      <DetailTabs tabs={NAV_ITEMS} activeTab={activeSection} onTabChange={(tabId) => setActiveSection(tabId as SectionId)} />

      <div className="min-w-0">
          {/* Summary */}
          {activeSection === "summary" && (
            <section>
              <div className="grid gap-6 lg:grid-cols-3">
                <div className="space-y-6 lg:col-span-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Work summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                    <div>
                      {isEditing ? (
                        <div className="space-y-3">
                          <Input
                            value={editForm.title}
                            onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
                          />
                          <Textarea
                            value={editForm.description}
                            onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                            rows={5}
                          />
                        </div>
                      ) : (
                        <>
                          <p className="mt-1 text-sm font-medium">{order.title}</p>
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                            {order.description || "No description provided"}
                          </p>
                          </>
                      )}
                    </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Work order details</CardTitle>
                    </CardHeader>
                    <CardContent>
                    <div className="grid gap-4 text-sm sm:grid-cols-2">
                        <div>
                          <p className="text-xs text-muted-foreground">Reference</p>
                          <p className="mt-0.5 text-sm font-medium font-mono">{woNumber}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Type</p>
                          {isEditing ? (
                            <Select
                              value={editForm.type}
                              onValueChange={(value) =>
                                setEditForm((p) => ({
                                  ...p,
                                  type: value,
                                  checklist_template_id: getProcedureTemplateIdForType(value as WorkOrder["type"]),
                                }))
                              }
                            >
                              <SelectTrigger className="mt-1 h-9">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {WORK_ORDER_TYPES.map((woType) => (
                                  <SelectItem key={woType} value={woType}>
                                    {formatStatusLabel(woType)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <p className="mt-0.5 text-sm font-medium">{capitalize((order.type || "service_request").replace(/_/g, " "))}</p>
                          )}
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">{t("workOrders.labels.priority")}</p>
                          {isEditing ? (
                            <Select value={editForm.priority} onValueChange={(value) => setEditForm((p) => ({ ...p, priority: value as Priority }))}>
                              <SelectTrigger className="mt-1 h-9">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {(["low", "medium", "high", "critical"] as Priority[]).map((priority) => (
                                  <SelectItem key={priority} value={priority}>
                                    {capitalize(priority)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <p className="mt-0.5 text-sm font-medium">{capitalize(order.priority)}</p>
                          )}
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Procedure checklist</p>
                          {linkedProcedureTemplate ? (
                            <div className="mt-0.5 flex items-start gap-3">
                              <ClipboardCheck className="mt-0.5 h-4 w-4 text-muted-foreground" />
                              <div>
                                <Link
                                  href={`/${company}/dashboard/checklists/${linkedProcedureTemplate.id}`}
                                  className="block text-sm font-medium text-primary hover:underline"
                                >
                                  {linkedProcedureTemplate.name}
                                </Link>
                                {linkedProcedureTemplate.description && (
                                  <p className="text-sm text-muted-foreground">{linkedProcedureTemplate.description}</p>
                                )}
                                <p className="text-xs text-muted-foreground">{linkedProcedureTemplate.items.length} steps</p>
                              </div>
                            </div>
                          ) : (
                            <p className="mt-0.5 text-sm font-medium">—</p>
                          )}
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">{t("workOrders.labels.dueDate")}</p>
                          {isEditing ? (
                            <Input
                              type="date"
                              className="mt-1 h-9"
                              value={editForm.due_date}
                              onChange={(e) => setEditForm((p) => ({ ...p, due_date: e.target.value }))}
                            />
                          ) : (
                            <div className="mt-0.5 flex items-start gap-3">
                              <Calendar className="mt-0.5 h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-sm font-medium">{order.due_date ? formatDate(order.due_date) : "—"}</p>
                                <p className="text-sm text-muted-foreground">Created {formatDate(order.created_at)}</p>
                              </div>
                            </div>
                          )}
                        </div>
                    </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Asset & location</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-xs text-muted-foreground">{t("workOrders.labels.asset")}</p>
                        {isEditing ? (
                          <Select
                            value={editForm.asset_id}
                            onValueChange={(value) =>
                              setEditForm((p) => {
                                const nextAsset = value === "__none__" ? null : assets.find((item) => item.id === value) ?? null;
                                return {
                                  ...p,
                                  asset_id: value,
                                  location_id: nextAsset?.location_id || p.location_id,
                                };
                              })
                            }
                          >
                            <SelectTrigger className="mt-1 h-9">
                              <SelectValue placeholder="No asset" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">No asset</SelectItem>
                              {assets.filter((item) => item.status !== "retired").map((item) => (
                                <SelectItem key={item.id} value={item.id}>
                                  {item.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : asset ? (
                          <div className="mt-0.5 flex items-start gap-3">
                            <Package className="mt-0.5 h-4 w-4 text-muted-foreground" />
                            <div>
                              <Link
                                href={`/${company}/dashboard/assets/${asset.id}`}
                                className="block text-sm font-medium text-primary hover:underline"
                              >
                                {asset.name}
                              </Link>
                              <p className="text-sm text-muted-foreground">
                                {asset.asset_tag || asset.serial_number || "No asset identifier"}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <p className="mt-0.5 text-sm font-medium">—</p>
                        )}
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground">Location</p>
                        {isEditing ? (
                          <Select value={editForm.location_id} onValueChange={(value) => setEditForm((p) => ({ ...p, location_id: value }))}>
                            <SelectTrigger className="mt-1 h-9">
                              <SelectValue placeholder="No location" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">No location</SelectItem>
                              {locations.map((location) => (
                                <SelectItem key={location.id} value={location.id}>
                                  {location.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : locationHierarchy.length > 0 ? (
                          <div className="mt-2 space-y-3">
                            {locationHierarchy.map((item, index) => (
                              <div key={item.id} className="flex items-start gap-3">
                                <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                                <div className="min-w-0">
                                  <p className="text-sm font-medium">{item.name}</p>
                                  <p className="text-sm capitalize text-muted-foreground">
                                    Step {index + 1} · {item.type.replace(/_/g, " ")}
                                  </p>
                                </div>
                              </div>
                            ))}
                            {workOrderLocation?.address && (
                              <div className="border-t pt-3">
                                <p className="text-sm text-muted-foreground">{workOrderLocation.address}</p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="mt-0.5 text-sm text-muted-foreground">No location linked.</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Assignment & progress</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-start gap-3">
                        <User className="mt-0.5 h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">{t("workOrders.detail.assignedTo")}</p>
                          <p className="text-sm font-medium">{getUserName(isEditing ? (editForm.assigned_to === "__none__" ? null : editForm.assigned_to) : order.assigned_to)}</p>
                          <p className="text-sm text-muted-foreground">
                            Team: {getTeamName(isEditing ? (editForm.assigned_to_team_id === "__none__" ? null : editForm.assigned_to_team_id) : order.assigned_to_team_id)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Clock3 className="mt-0.5 h-4 w-4 text-muted-foreground" />
                        <div className="flex gap-6">
                          <div>
                            <p className="text-xs text-muted-foreground">Estimated hours</p>
                            <p className="text-sm font-medium">
                              {order.estimated_hours != null ? `${order.estimated_hours}h` : "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Actual hours</p>
                            <p className="text-sm font-medium">
                              {order.actual_hours != null ? `${order.actual_hours}h` : "—"}
                            </p>
                          </div>
                        </div>
                      </div>
                      {totalCost > 0 && (
                        <div className="border-t pt-4 text-sm">
                          <p className="text-sm font-medium">Cost summary</p>
                          {order.parts_cost != null && order.parts_cost > 0 && (
                            <div className="mt-2 flex justify-between">
                              <span className="text-muted-foreground">Parts</span>
                              <span className="font-medium">${formatNumber(order.parts_cost)}</span>
                            </div>
                          )}
                          {order.labor_cost != null && order.labor_cost > 0 && (
                            <div className="mt-2 flex justify-between">
                              <span className="text-muted-foreground">Labor</span>
                              <span className="font-medium">${formatNumber(order.labor_cost)}</span>
                            </div>
                          )}
                          <div className="mt-2 flex justify-between border-t pt-2 font-medium">
                            <span>Total</span>
                            <span>${formatNumber(totalCost)}</span>
                          </div>
                        </div>
                      )}
                      {order.declined_reason && (
                        <div className="border-t pt-4">
                          <div className="flex items-start gap-3">
                            <AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" />
                            <div>
                              <p className="text-xs text-destructive font-medium">Declined by field worker</p>
                              <p className="mt-1 text-sm text-muted-foreground">{order.declined_reason}</p>
                              {order.declined_at && (
                                <p className="mt-1 text-xs text-muted-foreground">{formatDate(order.declined_at)}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </section>
          )}

          {/* Related records */}
          {activeSection === "related" && (
            <section>
              <h2 className="text-lg font-semibold mb-4">Related records</h2>
              <div className="space-y-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Asset</p>
                  {asset ? (
                    <Link
                      href={`/${company}/dashboard/assets/${asset.id}`}
                      className="block font-medium text-primary hover:underline mt-0.5"
                    >
                      {asset.name}
                    </Link>
                  ) : (
                    <p className="text-muted-foreground mt-0.5">—</p>
                  )}
                </div>

                <div>
                  <p className="text-muted-foreground">Corrective action</p>
                  {linkedCorrectiveAction ? (
                    <Link
                      href={`/${company}/dashboard/corrective-actions/${linkedCorrectiveAction.id}`}
                      className="block font-medium text-primary hover:underline mt-0.5 line-clamp-2"
                    >
                      {linkedCorrectiveAction.description}
                    </Link>
                  ) : (
                    <p className="text-muted-foreground mt-0.5">—</p>
                  )}
                </div>

                <div>
                  <p className="text-muted-foreground">Source inspection</p>
                  {linkedInspection ? (
                    <Link
                      href={`/${company}/dashboard/inspections/${linkedInspection.id}`}
                      className="block font-medium text-primary hover:underline mt-0.5"
                    >
                      Inspection {linkedInspection.id.substring(0, 8)}
                    </Link>
                  ) : (
                    <p className="text-muted-foreground mt-0.5">—</p>
                  )}
                </div>

                <div>
                  <p className="text-muted-foreground">Procedure checklist</p>
                  {linkedProcedureTemplate ? (
                    <Link
                      href={`/${company}/dashboard/checklists/${linkedProcedureTemplate.id}`}
                      className="block font-medium text-primary hover:underline mt-0.5"
                    >
                      {linkedProcedureTemplate.name}
                    </Link>
                  ) : (
                    <p className="text-muted-foreground mt-0.5">—</p>
                  )}
                </div>

                <div>
                  <p className="text-muted-foreground">Procedure result</p>
                  {linkedProcedureSubmission ? (
                    <div className="mt-0.5 space-y-1">
                      <p className="font-medium">
                        Submitted {linkedProcedureSubmission.submitted_at ? formatDate(linkedProcedureSubmission.submitted_at) : "—"}
                      </p>
                      <p className="text-muted-foreground">
                        {linkedProcedureSubmission.responses.length} steps · {linkedProcedureFailCount} failed
                      </p>
                      {linkedProcedureSubmission.general_comments && (
                        <p className="line-clamp-3 text-muted-foreground">{linkedProcedureSubmission.general_comments}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground mt-0.5">Not submitted yet</p>
                  )}
                </div>

                {order.parts_used && order.parts_used.length > 0 && (
                  <div>
                    <p className="text-muted-foreground mb-2">Parts used</p>
                    <div className="space-y-2">
                      {order.parts_used.map((pu) => {
                        const part = parts.find((p) => p.id === pu.part_id);
                        return (
                          <div key={pu.part_id} className="flex items-center justify-between text-sm rounded-lg border p-3">
                            <div>
                              <span className="font-medium">{part?.name || "Unknown part"}</span>
                              {part?.part_number && (
                                <span className="text-muted-foreground ml-2">({part.part_number})</span>
                              )}
                            </div>
                            <div className="text-muted-foreground">
                              Qty: {pu.quantity} {part?.unit_cost != null && `· $${(part.unit_cost * pu.quantity).toFixed(2)}`}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Work log */}
          {activeSection === "work-log" && (
            <section>
              <h2 className="text-lg font-semibold mb-4">Work log</h2>
              <Card>
                <CardContent className="pt-5">
                  <div className="space-y-4 text-sm">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="text-xs text-muted-foreground">Estimated hours</label>
                        <Input
                          type="number"
                          min="0"
                          step="0.5"
                          className="mt-1 h-9"
                          value={order.estimated_hours ?? ""}
                          onChange={(e) => {
                            const val = e.target.value ? parseFloat(e.target.value) : null;
                            update(order.id, { estimated_hours: val, updated_at: new Date().toISOString() });
                          }}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Actual hours</label>
                        <Input
                          type="number"
                          min="0"
                          step="0.5"
                          className="mt-1 h-9"
                          value={order.actual_hours ?? ""}
                          onChange={(e) => {
                            const val = e.target.value ? parseFloat(e.target.value) : null;
                            update(order.id, { actual_hours: val, updated_at: new Date().toISOString() });
                          }}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Parts cost</label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          className="mt-1 h-9"
                          value={order.parts_cost ?? ""}
                          onChange={(e) => {
                            const val = e.target.value ? parseFloat(e.target.value) : null;
                            update(order.id, { parts_cost: val, updated_at: new Date().toISOString() });
                          }}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Labor cost</label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          className="mt-1 h-9"
                          value={order.labor_cost ?? ""}
                          onChange={(e) => {
                            const val = e.target.value ? parseFloat(e.target.value) : null;
                            update(order.id, { labor_cost: val, updated_at: new Date().toISOString() });
                          }}
                        />
                      </div>
                    </div>
                    {totalCost > 0 && (
                      <div className="flex justify-between py-2 border-t font-medium">
                        <span>Total cost</span>
                        <span>${formatNumber(totalCost)}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Attachments */}
              <Card className="mt-4">
                <CardContent className="pt-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium">Attachments</h3>
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*,.pdf,.csv"
                        multiple
                        onChange={async (e) => {
                          const files = e.target.files;
                          if (!files) return;
                          for (const file of Array.from(files)) {
                            try {
                              await storeFile(file, "work-order", order.id, user?.id || "");
                              toast("File uploaded");
                            } catch (err) {
                              toast(err instanceof Error ? err.message : "Upload failed", "error");
                            }
                          }
                          setAttachmentRefresh((c) => c + 1);
                          e.target.value = "";
                        }}
                      />
                      <span className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors">
                        <Paperclip className="h-3.5 w-3.5" />
                        Add file
                      </span>
                    </label>
                  </div>
                  {woFiles.length > 0 ? (
                    <div className="space-y-2">
                      {woFiles.map((file) => (
                        <div key={file.id} className="flex items-center gap-3 rounded-lg border px-3 py-2 text-sm">
                          <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">{file.name}</p>
                            <p className="text-xs text-muted-foreground">{formatDate(file.uploadedAt)}</p>
                          </div>
                          <Button variant="ghost" size="icon-sm" onClick={() => downloadFile(file)}>
                            <ArrowLeft className="h-3.5 w-3.5 rotate-[225deg]" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No files attached yet</p>
                  )}
                </CardContent>
              </Card>
            </section>
          )}

      </div>
    </div>
    </RoleGuard>
  );
}
