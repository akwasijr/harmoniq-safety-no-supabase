"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useParams, useSearchParams } from "next/navigation";
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
import { useWorkOrdersStore } from "@/stores/work-orders-store";
import { useCompanyData } from "@/hooks/use-company-data";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/components/ui/toast";
import { useTranslation } from "@/i18n";
import { capitalize } from "@/lib/utils";
import type { WorkOrder } from "@/types";

const STATUS_FLOW: Record<string, string[]> = {
  requested: ["approved", "cancelled"],
  approved: ["in_progress", "cancelled"],
  in_progress: ["completed"],
  completed: [],
  cancelled: [],
};

const STATUS_COLORS: Record<string, string> = {
  requested: "secondary",
  approved: "warning",
  in_progress: "warning",
  completed: "success",
  cancelled: "secondary",
};

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
  const { assets, users, parts } = useCompanyData();

  const canEdit = hasPermission("incidents.edit_all");

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

  const getUserName = (id: string | null) => {
    if (!id) return t("common.none");
    const u = users.find((usr) => usr.id === id);
    return u ? `${u.first_name} ${u.last_name}` : t("common.none");
  };

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

  if (isLoading) {
    return <LoadingPage />;
  }

  if (!order) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" className="gap-2" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
          {t("common.back")}
        </Button>
        <EmptyState
          icon={ClipboardList}
          title={t("workOrders.detail.notFound")}
          description="The requested work order could not be found."
        />
      </div>
    );
  }

  const asset = getAssetName(order.asset_id);
  const StatusIcon = STATUS_ICONS[order.status] || Clock;
  const nextStatuses = STATUS_FLOW[order.status] || [];
  const totalCost = (order.parts_cost || 0) + (order.labor_cost || 0);

  return (
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
      {nextStatuses.length > 0 && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-medium text-muted-foreground">{t("workOrders.detail.changeStatus")}:</span>
              {nextStatuses.map((next) => (
                <Button
                  key={next}
                  size="sm"
                  variant={next === "cancelled" ? "outline" : "default"}
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
              ))}
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
                <p className="font-medium flex items-center gap-2 mt-0.5">
                  <User className="h-4 w-4 text-muted-foreground" />
                  {getUserName(order.assigned_to)}
                </p>
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
                <p className="font-medium capitalize mt-0.5">{order.priority}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">{t("workOrders.labels.dueDate")}</Label>
                <p className="font-medium mt-0.5">{order.due_date ? formatDate(order.due_date) : "—"}</p>
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
  );
}
