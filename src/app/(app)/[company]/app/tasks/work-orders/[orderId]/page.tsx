"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { Wrench, Calendar, User as UserIcon, AlertTriangle, Clock, FileText, Package, CheckCircle, MapPin, ScanLine } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useWorkOrdersStore } from "@/stores/work-orders-store";
import { useUsersStore } from "@/stores/users-store";
import { useAssetsStore } from "@/stores/assets-store";
import { usePartsStore } from "@/stores/parts-store";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/components/ui/toast";
import { useTranslation } from "@/i18n";
import { LoadingPage } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";
import { TaskDetailHeader, PRIORITY_CONFIG } from "@/components/tasks/task-detail-header";
import { TaskInfoCard } from "@/components/tasks/task-info-card";
import { TaskStatusActions } from "@/components/tasks/task-status-actions";
import { TaskDetailTabs } from "@/components/tasks/task-detail-tabs";
import { TaskComments, loadComments } from "@/components/tasks/task-comments";
import { TaskDocuments } from "@/components/tasks/task-documents";
import { WorkOrderWorkLog } from "@/components/tasks/work-order-work-log";
import { StatusPipeline } from "@/components/work-orders/status-pipeline";
import { getFilesForEntity } from "@/lib/file-storage";
import { isAssignedToUserOrTeam } from "@/lib/assignment-utils";
import { useLocationsStore } from "@/stores/locations-store";
import { useWorkOrderStatusLogStore } from "@/stores/work-order-status-log-store";
import { ArrowLeft } from "lucide-react";
import type { WorkOrderStatus } from "@/types";

export default function WorkOrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const rawCompany = params.company;
  const company = typeof rawCompany === "string" ? rawCompany : Array.isArray(rawCompany) ? rawCompany[0] : "";
  const rawOrderId = params.orderId;
  const orderId = typeof rawOrderId === "string" ? rawOrderId : Array.isArray(rawOrderId) ? rawOrderId[0] : "";

  const { user } = useAuth();
  const { t, formatDate, formatNumber } = useTranslation();
  const { toast } = useToast();

  const { items: orders, update: updateOrder, isLoading } = useWorkOrdersStore();
  const { items: users } = useUsersStore();
  const { items: assets } = useAssetsStore();
  const { items: parts } = usePartsStore();
  const { items: locations } = useLocationsStore();
  const { add: addStatusLog } = useWorkOrderStatusLogStore();

  const [activeTab, setActiveTab] = React.useState("details");
  const [assetVerified, setAssetVerified] = React.useState(false);

  const matchedOrder = orders.find((o) => o.id === orderId);
  const order =
    matchedOrder &&
    user?.company_id &&
    matchedOrder.company_id === user.company_id
      ? matchedOrder
      : undefined;
  const assignee = order?.assigned_to ? users.find((u) => u.id === order.assigned_to) : null;
  const requester = order?.requested_by ? users.find((u) => u.id === order.requested_by) : null;
  const asset = order?.asset_id ? assets.find((a) => a.id === order.asset_id) : null;
  const location = asset?.location_id ? locations.find((l) => l.id === asset.location_id) : null;

  const isOverdue = React.useMemo(() => {
    if (!order?.due_date) return false;
    if (["completed", "cancelled"].includes(order.status)) return false;
    return new Date(order.due_date) < new Date();
  }, [order]);

  const commentCount = React.useMemo(() => loadComments("work-order", orderId).length, [orderId]);
  const docCount = React.useMemo(() => getFilesForEntity("work-order", orderId).length, [orderId]);

  const handleStatusChange = React.useCallback(
    (targetStatus: string) => {
      if (!order) return;
      // Log the status change
      addStatusLog({
        id: crypto.randomUUID(),
        work_order_id: orderId,
        from_status: order.status,
        to_status: targetStatus as WorkOrderStatus,
        comment: "",
        changed_by: user?.id || "",
        changed_at: new Date().toISOString(),
      });

      const updates: Partial<typeof order & Record<string, unknown>> = {
        status: targetStatus as WorkOrderStatus,
        updated_at: new Date().toISOString(),
      };
      if (targetStatus === "completed") updates.completed_at = new Date().toISOString();
      updateOrder(orderId, updates as never);
      toast("Status updated", "success");
    },
    [orderId, order, user, updateOrder, addStatusLog, toast],
  );

  if (isLoading && orders.length === 0) return <LoadingPage />;

  if (!order) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Work Order Not Found"
        description="This work order may have been deleted or you don't have access."
        action={<Button variant="outline" onClick={() => router.back()}><ArrowLeft className="h-4 w-4 mr-2" />Go Back</Button>}
      />
    );
  }

  const showAssetBanner = !assetVerified && order.asset_id && !["in_progress", "completed", "cancelled"].includes(order.status);

  const priorityConf = PRIORITY_CONFIG[order.priority];

  const typeLabel = order.type?.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const tabs = [
    { id: "details", label: "Details" },
    { id: "worklog", label: "Work Log" },
    { id: "activity", label: "Activity", count: commentCount },
    { id: "files", label: "Files", count: docCount },
  ];

  return (
    <div className="flex flex-col min-h-full bg-background">
      <TaskDetailHeader title="Work Order" subtitle={`#${orderId.slice(0, 10)}`} status={order.status} overdue={isOverdue}>
        {typeLabel && (
          <div className="mt-2">
            <Badge variant="outline">{typeLabel}</Badge>
          </div>
        )}
      </TaskDetailHeader>

      {isOverdue && (
        <div className="mx-4 mt-3 flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 px-3 py-2">
          <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
          <p className="text-xs font-medium text-red-700 dark:text-red-300">
            Overdue — was due {formatDate(new Date(order.due_date!), { month: "short", day: "numeric" })}
          </p>
        </div>
      )}

      <div className="px-4 mt-3 overflow-x-auto">
        <StatusPipeline currentStatus={order.status} />
      </div>

      <TaskDetailTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="flex-1 px-4 py-4 space-y-4">
        {activeTab === "details" && (
          <>
            <div>
              <div className="flex items-start gap-3 mb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shrink-0">
                  <Wrench className="h-5 w-5 text-primary" aria-hidden="true" />
                </div>
                <h2 className="text-lg font-semibold leading-tight pt-1">{order.title}</h2>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {priorityConf && <Badge className={priorityConf.color}>{priorityConf.label}</Badge>}
              </div>
            </div>

            <TaskInfoCard rows={[
              { icon: UserIcon, label: "Requested by", value: requester?.full_name || "Unknown" },
              { icon: UserIcon, label: "Assigned to", value: assignee?.full_name || "Unassigned" },
              ...(asset ? [{ icon: Package, label: "Asset", value: asset.name, valueClassName: "text-primary" }] : []),
              ...(location ? [{ icon: MapPin, label: "Location", value: location.name }] : []),
              ...(order.due_date ? [{ icon: Calendar, label: "Due date", value: formatDate(new Date(order.due_date), { weekday: "short", month: "short", day: "numeric", year: "numeric" }), valueClassName: isOverdue ? "text-red-600 dark:text-red-400" : undefined }] : []),
              { icon: Clock, label: "Created", value: formatDate(order.created_at) },
              ...(order.completed_at ? [{ icon: CheckCircle, label: "Completed", value: formatDate(order.completed_at) }] : []),
            ]} />

            {showAssetBanner && (
              <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
                <div className="flex items-start gap-3">
                  <Package className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Verify you&apos;re at the right asset</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{asset?.name}{asset?.asset_tag ? ` · ${asset.asset_tag}` : ""}{asset?.serial_number ? ` · SN: ${asset.serial_number}` : ""}</p>
                    {location && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><MapPin className="h-3 w-3" />{location.name}</p>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1 gap-1.5" onClick={() => router.push(`/${company}/app/scan`)}>
                    <ScanLine className="h-3.5 w-3.5" /> Scan QR
                  </Button>
                  <Button size="sm" className="flex-1" onClick={() => setAssetVerified(true)}>
                    Confirm asset
                  </Button>
                </div>
              </div>
            )}

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4" />Instructions</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{order.description || "No instructions provided."}</p>
              </CardContent>
            </Card>

            <TaskStatusActions kind="work-order" currentStatus={order.status} onStatusChange={handleStatusChange} />
          </>
        )}

        {activeTab === "worklog" && (
          <WorkOrderWorkLog workOrder={order} parts={parts} onUpdate={updateOrder as never} formatNumber={formatNumber} />
        )}
        {activeTab === "activity" && <TaskComments entityType="work-order" entityId={orderId} formatDate={formatDate} />}
        {activeTab === "files" && <TaskDocuments entityType="work-order" entityId={orderId} formatDate={formatDate} />}
      </div>
    </div>
  );
}
