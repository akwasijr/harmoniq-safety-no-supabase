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
  ClipboardList,
  CheckCircle,
  Clock,
  AlertTriangle,
  Calendar,
  User,
  Package,
  DollarSign,
  X,
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
import { useWorkOrdersStore } from "@/stores/work-orders-store";
import { useCompanyData } from "@/hooks/use-company-data";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/components/ui/toast";
import { useNotificationsStore } from "@/stores/notifications-store";
import { useTranslation } from "@/i18n";
import { capitalize } from "@/lib/utils";
import type { WorkOrder } from "@/types";
import { RoleGuard } from "@/components/auth/role-guard";

const STATUS_FLOW: Record<string, string[]> = {
  requested: ["approved", "cancelled"],
  approved: ["in_progress", "cancelled"],
  in_progress: ["completed"],
  completed: [],
  cancelled: [],
};

const STATUS_COLORS = WORK_ORDER_STATUS_COLORS;

const STATUS_ICONS: Record<string, typeof Clock> = {
  requested: ClipboardList,
  approved: CheckCircle,
  in_progress: Clock,
  completed: CheckCircle,
  cancelled: X,
};

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
  const { items: orders, update, isLoading } = useWorkOrdersStore();
  const { assets, users, parts, companyId } = useCompanyData();

  const canEdit = hasPermission("work_orders.edit");
  const canAssign = hasPermission("work_orders.assign");
  const canComplete = hasPermission("work_orders.complete");
  const { add: addNotification } = useNotificationsStore();

  const order = orders.find((o) => o.id === workOrderId);

  const [isEditing, setIsEditing] = React.useState(false);
  const [editForm, setEditForm] = React.useState({
    title: "",
    description: "",
    notes: "",
  });

  const highlightRef = React.useRef<HTMLDivElement>(null);

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

  const handleStatusChange = (newStatus: string) => {
    if (!order) return;
    const updates: Partial<WorkOrder> = {
      status: newStatus as WorkOrder["status"],
      updated_at: new Date().toISOString(),
    };
    if (newStatus === "completed") {
      updates.completed_at = new Date().toISOString();
    }
    update(order.id, updates);
    toast(`${t("workOrders.detail.changeStatus")}: ${capitalize(newStatus.replace("_", " "))}`);
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
            Back to Work Orders
          </Button>
        }
      />
    );
  }
  if (!order) return <LoadingPage />;

  const asset = getAssetName(order.asset_id);
  const StatusIcon = STATUS_ICONS[order.status] || Clock;
  const nextStatuses = STATUS_FLOW[order.status] || [];
  const totalCost = (order.parts_cost || 0) + (order.labor_cost || 0);

  return (
    <RoleGuard requiredPermission="work_orders.view">
    <div className="space-y-6" ref={highlight ? highlightRef : undefined}>
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" className="mt-1 shrink-0" onClick={() => router.push(`/${company}/dashboard/work-orders`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <Input
              className="text-xl font-semibold"
              value={editForm.title}
              onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
            />
          ) : (
            <h1 className="text-2xl font-semibold truncate">{order.title}</h1>
          )}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge
              variant={STATUS_COLORS[order.status] as "success" | "warning" | "secondary" | "destructive"}
              className="capitalize gap-1"
            >
              <StatusIcon className="h-3 w-3" />
              {t(`workOrders.statuses.${order.status === "in_progress" ? "inProgress" : order.status}`)}
            </Badge>
            <Badge
              variant={
                order.priority === "critical" || order.priority === "high"
                  ? "destructive"
                  : order.priority === "medium"
                    ? "warning"
                    : "secondary"
              }
              className="capitalize"
            >
              {order.priority}
            </Badge>
            {order.due_date && (
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {t("workOrders.labels.dueDate")}: {formatDate(order.due_date)}
              </span>
            )}
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
        </div>
      </div>

      {/* Status change actions */}
      {nextStatuses.length > 0 && (canEdit || canComplete) && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-medium text-muted-foreground">{t("workOrders.detail.changeStatus")}:</span>
              {nextStatuses.map((next) => {
                if (next === "completed" && !canComplete) return null;
                if (next !== "completed" && next !== "cancelled" && !canEdit) return null;
                if (next === "cancelled" && !canEdit) return null;
                return (
                  <Button
                    key={next}
                    size="sm"
                    variant={next === "cancelled" ? "outline" : next === "completed" ? "success" : "default"}
                    className="gap-1"
                    onClick={() => handleStatusChange(next)}
                  >
                    {next === "approved" && t("workOrders.buttons.approve")}
                    {next === "in_progress" && t("workOrders.buttons.start")}
                    {next === "completed" && (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        {t("workOrders.buttons.complete")}
                      </>
                    )}
                    {next === "cancelled" && t("workOrders.buttons.cancel")}
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: description + notes */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("workOrders.labels.description")}</CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <Textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                  rows={4}
                />
              ) : (
                <p className="text-muted-foreground whitespace-pre-wrap">{order.description}</p>
              )}
            </CardContent>
          </Card>

          {/* Parts used */}
          {order.parts_used && order.parts_used.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  {t("workOrders.labels.partsUsed")}
                </CardTitle>
              </CardHeader>
              <CardContent>
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
                          Qty: {pu.quantity} {part?.unit_cost != null && `• $${(part.unit_cost * pu.quantity).toFixed(2)}`}
                        </div>
                      </div>
                    );
                  })}
                  {order.parts_cost != null && order.parts_cost > 0 && (
                    <div className="pt-2 border-t mt-2 text-sm font-medium flex justify-between">
                      <span>{t("workOrders.labels.totalCost")}:</span>
                      <span>${formatNumber(order.parts_cost)}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Cost summary */}
          {totalCost > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  {t("workOrders.labels.totalCost")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {order.parts_cost != null && order.parts_cost > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("workOrders.labels.partsUsed")}</span>
                      <span>${formatNumber(order.parts_cost)}</span>
                    </div>
                  )}
                  {order.labor_cost != null && order.labor_cost > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("workOrders.detail.laborCost")}</span>
                      <span>${formatNumber(order.labor_cost)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t font-medium">
                    <span>{t("workOrders.labels.totalCost")}</span>
                    <span>${formatNumber(totalCost)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("workOrders.detail.title")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-muted-foreground">{t("workOrders.detail.requestedBy")}</Label>
                <p className="font-medium flex items-center gap-2 mt-0.5">
                  <User className="h-4 w-4 text-muted-foreground" />
                  {getUserName(order.requested_by)}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">{t("workOrders.detail.assignedTo")}</Label>
                {canAssign ? (
                  <Select
                    value={order.assigned_to || "__none__"}
                    onValueChange={handleAssignedToChange}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder={t("common.none")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">{t("common.none")}</SelectItem>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.first_name} {u.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="font-medium flex items-center gap-2 mt-0.5">
                    <User className="h-4 w-4 text-muted-foreground" />
                    {getUserName(order.assigned_to)}
                  </p>
                )}
              </div>
              {asset && (
                <div>
                  <Label className="text-muted-foreground">{t("workOrders.detail.relatedAsset")}</Label>
                  <Link
                    href={`/${company}/dashboard/assets/${asset.id}`}
                    className="font-medium text-primary hover:underline flex items-center gap-2 mt-0.5"
                  >
                    <Package className="h-4 w-4 text-muted-foreground" />
                    {asset.name}
                  </Link>
                </div>
              )}
              <div>
                <Label className="text-muted-foreground">{t("workOrders.labels.priority")}</Label>
                {canEdit ? (
                  <Select
                    value={order.priority}
                    onValueChange={handlePriorityChange}
                  >
                    <SelectTrigger className="mt-1">
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
                  <p className="font-medium capitalize mt-0.5">{order.priority}</p>
                )}
              </div>
              <div>
                <Label className="text-muted-foreground">{t("workOrders.labels.dueDate")}</Label>
                {canEdit ? (
                  <Input
                    type="date"
                    className="mt-1"
                    value={order.due_date ? order.due_date.split("T")[0] : ""}
                    onChange={(e) => handleDueDateChange(e.target.value)}
                  />
                ) : (
                  <p className="font-medium mt-0.5">{order.due_date ? formatDate(order.due_date) : "—"}</p>
                )}
              </div>
              {order.estimated_hours != null && (
                <div>
                  <Label className="text-muted-foreground">{t("workOrders.labels.estimatedHours")}</Label>
                  <p className="font-medium mt-0.5">{order.estimated_hours}h</p>
                </div>
              )}
              {order.actual_hours != null && (
                <div>
                  <Label className="text-muted-foreground">{t("workOrders.detail.actualHours")}</Label>
                  <p className="font-medium mt-0.5">{order.actual_hours}h</p>
                </div>
              )}
              <div>
                <Label className="text-muted-foreground">{t("workOrders.detail.created")}</Label>
                <p className="font-medium mt-0.5">{formatDate(order.created_at)}</p>
              </div>
              {order.completed_at && (
                <div>
                  <Label className="text-muted-foreground">{t("workOrders.detail.completedAt")}</Label>
                  <p className="font-medium mt-0.5">{formatDate(order.completed_at)}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
    </RoleGuard>
  );
}
