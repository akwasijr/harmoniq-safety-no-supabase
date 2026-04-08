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
  ChevronLeft,
  ChevronRight,
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
import { useNotificationsStore } from "@/stores/notifications-store";
import { useTranslation } from "@/i18n";
import { capitalize } from "@/lib/utils";
import type { WorkOrder, WorkOrderStatus, WorkOrderStatusLogEntry } from "@/types";
import { WORK_ORDER_STATUS_TRANSITIONS } from "@/types";
import { RoleGuard } from "@/components/auth/role-guard";
import { StatusPipeline } from "@/components/work-orders/status-pipeline";
import { StatusChangeModal } from "@/components/work-orders/status-change-modal";
import { useWorkOrderStatusLogStore } from "@/stores/work-order-status-log-store";

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

const NAV_ITEMS: { id: SectionId; label: string }[] = [
  { id: "summary", label: "Summary" },
  { id: "related", label: "Related records" },
  { id: "work-log", label: "Work log" },
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
  const { correctiveActions, inspections, workOrders: orders, assets, users, parts, companyId, stores } = useCompanyData();
  const { update, isLoading } = stores.workOrders;

  const canEdit = hasPermission("work_orders.edit");
  const canAssign = hasPermission("work_orders.assign");
  const canComplete = hasPermission("work_orders.complete");
  const { add: addNotification } = useNotificationsStore();
  const { items: statusLogItems, add: addStatusLog } = useWorkOrderStatusLogStore();

  const order = orders.find((o) => o.id === workOrderId);

  const [isEditing, setIsEditing] = React.useState(false);
  const [showStatusModal, setShowStatusModal] = React.useState(false);
  const [activeSection, setActiveSection] = React.useState<SectionId>("summary");
  const [editForm, setEditForm] = React.useState({
    title: "",
    description: "",
    notes: "",
  });

  const highlightRef = React.useRef<HTMLDivElement>(null);

  const currentOrderIndex = orders.findIndex((o) => o.id === workOrderId);
  const totalOrders = orders.length;
  const prevOrderId = currentOrderIndex > 0 ? orders[currentOrderIndex - 1].id : null;
  const nextOrderId = currentOrderIndex < totalOrders - 1 ? orders[currentOrderIndex + 1].id : null;

  React.useEffect(() => {
    if (order) {
      setEditForm({
        title: order.title,
        description: order.description,
        notes: "",
      });
    }
  }, [order?.id]);

  React.useEffect(() => {
    if (highlight && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlight]);

  const getAssetName = (id: string | null) => {
    if (!id) return null;
    return assets.find((a) => a.id === id);
  };

  const getUserName = (id: string | null) => getUserFirstLastName(id, users, t("common.none"));

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
    setShowStatusModal(false);
    toast(`Status changed to ${capitalize(targetStatus.replace(/_/g, " "))}`);
  };

  const handleSave = () => {
    if (!order) return;
    update(order.id, {
      title: editForm.title.trim(),
      description: editForm.description.trim(),
      updated_at: new Date().toISOString(),
    });
    setIsEditing(false);
    toast(t("common.save"));
  };

  const handleAssignedToChange = (newUserId: string) => {
    if (!order) return;
    const value = newUserId === "__none__" ? null : newUserId;
    update(order.id, {
      assigned_to: value,
      updated_at: new Date().toISOString(),
    } as Partial<WorkOrder>);

    if (value) {
      const assignedUser = users.find((u) => u.id === value);
      const assigneeName = assignedUser
        ? `${assignedUser.first_name} ${assignedUser.last_name}`
        : "someone";
      addNotification({
        id: crypto.randomUUID(),
        company_id: companyId || "",
        user_id: value,
        title: "Work Order Assigned",
        message: `You have been assigned to work order "${order.title}"`,
        type: "work_order_assignment",
        source: "work_orders",
        source_id: order.id,
        read: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      toast(`Assigned to ${assigneeName}`);
    } else {
      toast("Assignment removed");
    }
  };

  const handlePriorityChange = (newPriority: string) => {
    if (!order) return;
    update(order.id, {
      priority: newPriority as WorkOrder["priority"],
      updated_at: new Date().toISOString(),
    });
    toast(`Priority changed to ${newPriority}`);
  };

  const handleDueDateChange = (newDate: string) => {
    if (!order) return;
    update(order.id, {
      due_date: newDate || null,
      updated_at: new Date().toISOString(),
    } as Partial<WorkOrder>);
    toast(newDate ? `Due date set to ${formatDate(newDate)}` : "Due date removed");
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

  const asset = getAssetName(order.asset_id);
  const linkedCorrectiveAction = order.corrective_action_id
    ? correctiveActions.find((action) => action.id === order.corrective_action_id) || null
    : null;
  const linkedInspection = linkedCorrectiveAction?.inspection_id
    ? inspections.find((inspection) => inspection.id === linkedCorrectiveAction.inspection_id) || null
    : null;
  const nextStatuses = STATUS_FLOW[order.status] || [];
  const totalCost = (order.parts_cost || 0) + (order.labor_cost || 0);
  const woNumber = `WO-${order.id.substring(0, 8).toUpperCase()}`;

  const priorityBadgeVariant = (
    order.priority === "critical" || order.priority === "high"
      ? "destructive"
      : order.priority === "medium"
        ? "secondary"
        : "outline"
  ) as "destructive" | "secondary" | "outline";

  return (
    <RoleGuard requiredPermission="work_orders.view">
    <div className="space-y-6" ref={highlight ? highlightRef : undefined}>
      {/* Record navigation */}
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" className="mt-1 shrink-0" onClick={() => router.back()}>
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
            <span className="text-sm font-mono text-muted-foreground shrink-0">{woNumber}</span>
          </div>

          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge variant={STATUS_COLORS[order.status] as "success" | "secondary" | "destructive" | "info" | "in_progress" | "completed" | "cancelled"}>
              {capitalize(order.status.replace(/_/g, " "))}
            </Badge>
            <Badge variant="outline">
              {capitalize((order.type || "service_request").replace(/_/g, " "))}
            </Badge>
            <Badge variant={priorityBadgeVariant}>
              {capitalize(order.priority)}
            </Badge>
          </div>
        </div>

        <div className="flex gap-2 shrink-0">
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
          {nextStatuses.length > 0 && (canEdit || canComplete) && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowStatusModal(true)}
            >
              Change status
            </Button>
          )}
        </div>
      </div>

      {/* Status pipeline */}
      <StatusPipeline currentStatus={order.status} />

      {/* Status change modal */}
      <StatusChangeModal
        isOpen={showStatusModal}
        currentStatus={order.status}
        availableStatuses={WORK_ORDER_STATUS_TRANSITIONS[order.status] || []}
        statusLog={orderStatusLog}
        users={users}
        onSubmit={handleStatusChangeConfirm}
        onCancel={() => setShowStatusModal(false)}
      />

      {/* Main content with sidebar tabs */}
      <div className="flex gap-6">
        {/* Left sidebar navigation */}
        <nav className="hidden lg:block w-44 shrink-0">
          <div className="sticky top-20 space-y-0.5">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`block w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                  activeSection === item.id
                    ? "font-medium text-foreground bg-muted"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </nav>

        {/* Mobile tab bar */}
        <div className="lg:hidden flex gap-1 -mt-2 mb-2 overflow-x-auto w-full">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`whitespace-nowrap px-3 py-1.5 text-sm rounded-md transition-colors ${
                activeSection === item.id
                  ? "font-medium text-foreground bg-muted"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Main content area — only one section visible at a time */}
        <div className="flex-1 min-w-0">
          {/* Summary */}
          {activeSection === "summary" && (
            <section>
              <h2 className="text-lg font-semibold mb-4">Summary</h2>

              {/* Description first — it's the most important info */}
              <Card className="mb-4">
                <CardContent className="pt-4">
                  {isEditing ? (
                    <Textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                      rows={4}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{order.description || "No description provided"}</p>
                  )}
                </CardContent>
              </Card>

              {/* Details grid */}
              <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Type</p>
                  <p className="font-medium mt-0.5">
                    {capitalize((order.type || "service_request").replace(/_/g, " "))}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t("workOrders.labels.priority")}</p>
                  {canEdit ? (
                    <Select value={order.priority} onValueChange={handlePriorityChange}>
                      <SelectTrigger className="mt-1 h-8 w-full max-w-[200px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="font-medium mt-0.5">{capitalize(order.priority)}</p>
                  )}
                </div>
                <div>
                  <p className="text-muted-foreground">{t("workOrders.detail.requestedBy")}</p>
                  <p className="font-medium mt-0.5">{getUserName(order.requested_by)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t("workOrders.detail.assignedTo")}</p>
                  {canAssign ? (
                    <Select value={order.assigned_to || "__none__"} onValueChange={handleAssignedToChange}>
                      <SelectTrigger className="mt-1 h-8 w-full max-w-[200px]">
                        <SelectValue placeholder="Unassigned" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Unassigned</SelectItem>
                        {users.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.first_name} {u.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="font-medium mt-0.5">{getUserName(order.assigned_to)}</p>
                  )}
                </div>
                <div>
                  <p className="text-muted-foreground">{t("workOrders.labels.dueDate")}</p>
                  {canEdit ? (
                    <Input
                      type="date"
                      className="mt-1 h-8 w-full max-w-[200px]"
                      value={order.due_date ? order.due_date.split("T")[0] : ""}
                      onChange={(e) => handleDueDateChange(e.target.value)}
                    />
                  ) : (
                    <p className="font-medium mt-0.5">{order.due_date ? formatDate(order.due_date) : "—"}</p>
                  )}
                </div>
                <div>
                  <p className="text-muted-foreground">{t("workOrders.labels.estimatedHours")}</p>
                  <p className="font-medium mt-0.5">
                    {order.estimated_hours != null ? `${order.estimated_hours}h` : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t("workOrders.detail.actualHours")}</p>
                  <p className="font-medium mt-0.5">
                    {order.actual_hours != null ? `${order.actual_hours}h` : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t("workOrders.detail.created")}</p>
                  <p className="font-medium mt-0.5">{formatDate(order.created_at)}</p>
                </div>
                {order.completed_at && (
                  <div>
                    <p className="text-muted-foreground">{t("workOrders.detail.completedAt")}</p>
                    <p className="font-medium mt-0.5">{formatDate(order.completed_at)}</p>
                  </div>
                )}
              </div>

              {/* Cost summary */}
              {totalCost > 0 && (
                <div className="mt-6 pt-4 border-t space-y-2 text-sm">
                  <p className="font-semibold">Cost summary</p>
                    {order.parts_cost != null && order.parts_cost > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Parts</span>
                        <span className="font-medium">${formatNumber(order.parts_cost)}</span>
                      </div>
                    )}
                    {order.labor_cost != null && order.labor_cost > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Labor</span>
                        <span className="font-medium">${formatNumber(order.labor_cost)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-semibold border-t pt-2">
                      <span>Total</span>
                      <span>${formatNumber(totalCost)}</span>
                    </div>
                  </div>
              )}
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
                  <div className="space-y-3 text-sm">
                    {order.estimated_hours != null && (
                      <div className="flex justify-between py-2 border-b">
                        <span className="text-muted-foreground">Estimated hours</span>
                        <span className="font-medium">{order.estimated_hours}h</span>
                      </div>
                    )}
                    {order.actual_hours != null && (
                      <div className="flex justify-between py-2 border-b">
                        <span className="text-muted-foreground">Actual hours</span>
                        <span className="font-medium">{order.actual_hours}h</span>
                      </div>
                    )}
                    {totalCost > 0 && (
                      <>
                        {order.parts_cost != null && order.parts_cost > 0 && (
                          <div className="flex justify-between py-2 border-b">
                            <span className="text-muted-foreground">Parts cost</span>
                            <span className="font-medium">${formatNumber(order.parts_cost)}</span>
                          </div>
                        )}
                        {order.labor_cost != null && order.labor_cost > 0 && (
                          <div className="flex justify-between py-2 border-b">
                            <span className="text-muted-foreground">Labor cost</span>
                            <span className="font-medium">${formatNumber(order.labor_cost)}</span>
                          </div>
                        )}
                        <div className="flex justify-between py-2 font-medium">
                          <span>Total cost</span>
                          <span>${formatNumber(totalCost)}</span>
                        </div>
                      </>
                    )}
                    {order.estimated_hours == null && order.actual_hours == null && totalCost === 0 && (
                      <p className="text-muted-foreground py-4 text-center">No work log entries yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </section>
          )}

        </div>
      </div>
    </div>
    </RoleGuard>
  );
}
