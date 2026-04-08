"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, MapPin, Package, ScanLine, Calendar, User as UserIcon,
  AlertTriangle, CheckCircle, Navigation, Clock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useWorkOrdersStore } from "@/stores/work-orders-store";
import { useUsersStore } from "@/stores/users-store";
import { useAssetsStore } from "@/stores/assets-store";
import { useLocationsStore } from "@/stores/locations-store";
import { usePartsStore } from "@/stores/parts-store";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/components/ui/toast";
import { useTranslation } from "@/i18n";
import { LoadingPage } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";
import { useWorkOrderStatusLogStore } from "@/stores/work-order-status-log-store";
import { WorkOrderWorkLog } from "@/components/tasks/work-order-work-log";
import { TaskComments } from "@/components/tasks/task-comments";
import { TaskDocuments } from "@/components/tasks/task-documents";
import { capitalize, cn } from "@/lib/utils";
import { hasValidCoordinates } from "@/lib/map-utils";
import type { WorkOrderStatus } from "@/types";

type TabId = "overview" | "location" | "instructions" | "work-log" | "complete";

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "location", label: "Location" },
  { id: "instructions", label: "Work" },
  { id: "work-log", label: "Log" },
  { id: "complete", label: "Complete" },
];

export default function WorkOrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const company = typeof params.company === "string" ? params.company : "";
  const orderId = typeof params.orderId === "string" ? params.orderId : "";

  const { user } = useAuth();
  const { formatDate, formatNumber } = useTranslation();
  const { toast } = useToast();

  const { items: orders, update: updateOrder, isLoading } = useWorkOrdersStore();
  const { items: users } = useUsersStore();
  const { items: assets } = useAssetsStore();
  const { items: parts } = usePartsStore();
  const { items: locations } = useLocationsStore();
  const { add: addStatusLog } = useWorkOrderStatusLogStore();

  const [activeTab, setActiveTab] = React.useState<TabId>("overview");
  const [completionNotes, setCompletionNotes] = React.useState("");
  const overviewMapRef = React.useRef<HTMLDivElement>(null);
  const locationMapRef = React.useRef<HTMLDivElement>(null);
  const mapInstanceRef = React.useRef<unknown>(null);

  const order = orders.find((o) => o.id === orderId && o.company_id === user?.company_id);
  const assignee = order?.assigned_to ? users.find((u) => u.id === order.assigned_to) : null;
  const asset = order?.asset_id ? assets.find((a) => a.id === order.asset_id) : null;
  const location = asset?.location_id ? locations.find((l) => l.id === asset.location_id) : null;
  const hasGps = location && hasValidCoordinates(location.gps_lat, location.gps_lng);

  const isInProgress = order?.status === "in_progress";
  const isCompleted = order?.status === "completed";
  const isOverdue = order?.due_date && !["completed", "cancelled"].includes(order?.status || "") && new Date(order.due_date) < new Date();

  // Map
  React.useEffect(() => {
    const mapNode = activeTab === "overview" ? overviewMapRef.current : activeTab === "location" ? locationMapRef.current : null;
    if (!hasGps || !mapNode || mapInstanceRef.current) return;
    const L = require("leaflet");
    require("leaflet/dist/leaflet.css");
    const zoom = activeTab === "overview" ? 15 : 16;
    const map = L.map(mapNode, { zoomControl: false, attributionControl: false })
      .setView([location!.gps_lat!, location!.gps_lng!], zoom);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);
    L.circleMarker([location!.gps_lat!, location!.gps_lng!], {
      radius: 8, fillColor: "#2563eb", fillOpacity: 1, color: "#fff", weight: 2,
    }).addTo(map);
    mapInstanceRef.current = map;
    return () => { map.remove(); mapInstanceRef.current = null; };
  }, [hasGps, location, activeTab]);

  const handleStatusChange = React.useCallback(
    (targetStatus: WorkOrderStatus) => {
      if (!order) return;
      addStatusLog({
        id: crypto.randomUUID(), work_order_id: orderId, from_status: order.status,
        to_status: targetStatus, comment: completionNotes,
        changed_by: user?.id || "", changed_at: new Date().toISOString(),
      });
      const updates: Record<string, unknown> = { status: targetStatus, updated_at: new Date().toISOString() };
      if (targetStatus === "completed") updates.completed_at = new Date().toISOString();
      updateOrder(orderId, updates as never);
      toast("Status updated", "success");
    },
    [orderId, order, user, completionNotes, updateOrder, addStatusLog, toast],
  );

  const openInMaps = () => {
    if (!location?.gps_lat || !location?.gps_lng) return;
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${location.gps_lat},${location.gps_lng}`, "_blank");
  };

  if (isLoading && orders.length === 0) return <LoadingPage />;
  if (!order) {
    return <EmptyState icon={Package} title="Work order not found" description="This work order may have been deleted."
      action={<Button variant="outline" onClick={() => router.back()}>Go back</Button>} />;
  }

  const typeLabel = capitalize((order.type || "service_request").replace(/_/g, " "));
  const priorityLabel = capitalize(order.priority);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Fixed header */}
      <div className="shrink-0 border-b bg-background px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="shrink-0 p-1 -ml-1 rounded-md hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{order.title}</p>
            <p className="text-xs text-muted-foreground">{typeLabel} · {priorityLabel}</p>
          </div>
          <Badge variant={isCompleted ? "completed" : isInProgress ? "info" : "secondary"}>
            {capitalize(order.status.replace(/_/g, " "))}
          </Badge>
        </div>
      </div>

      {/* Tab bar */}
      <div className="shrink-0 border-b bg-background overflow-x-auto">
        <div className="flex min-w-max px-2">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-3 py-3 text-sm font-medium relative whitespace-nowrap transition-colors",
                  isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
                {isActive && <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-foreground" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">

        {/* Overview tab */}
        {activeTab === "overview" && (
          <div className="px-4 py-4 space-y-4">
            {isOverdue && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-900 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
                <p className="text-xs font-medium">Overdue — due {formatDate(order.due_date!)}</p>
              </div>
            )}

            <Card>
              <CardContent className="pt-4 space-y-3">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Summary</p>
                  <p className="text-sm leading-6">{order.description || "No description provided."}</p>
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span>{typeLabel}</span>
                  <span>{priorityLabel} priority</span>
                  {order.due_date && (
                    <span className={cn(isOverdue && "text-red-700 dark:text-red-300 font-medium")}>
                      Due {formatDate(order.due_date)}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>

            {(location || hasGps) && (
              <Card>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-muted-foreground">Location</p>
                      <p className="text-sm font-medium mt-1">{location?.name || "Mapped location"}</p>
                      {location?.address && <p className="text-xs text-muted-foreground mt-1">{location.address}</p>}
                    </div>
                    {hasGps && (
                      <Button size="sm" variant="outline" className="gap-1.5 shrink-0" onClick={openInMaps}>
                        <Navigation className="h-3.5 w-3.5" /> Navigate
                      </Button>
                    )}
                  </div>
                  {hasGps && <div ref={overviewMapRef} className="h-36 w-full overflow-hidden rounded-lg border" />}
                </CardContent>
              </Card>
            )}

            {asset && (
              <Card>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <Package className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-muted-foreground">Asset identification</p>
                      <p className="text-sm font-medium mt-1">{asset.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {[asset.asset_tag, asset.serial_number && `SN: ${asset.serial_number}`].filter(Boolean).join(" · ") || "No asset identifier"}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1 gap-1.5" onClick={() => router.push(`/${company}/app/scan`)}>
                      <ScanLine className="h-3.5 w-3.5" /> Scan asset
                    </Button>
                    <Button size="sm" className="flex-1" onClick={() => setActiveTab("instructions")}>
                      Open work details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {assignee && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <UserIcon className="h-3.5 w-3.5" />
                Assigned to {assignee.full_name || `${assignee.first_name} ${assignee.last_name}`}
              </div>
            )}

            {!isInProgress && !isCompleted && (
              <Button className="w-full" size="lg" onClick={() => handleStatusChange("in_progress")}>
                Start work
              </Button>
            )}
          </div>
        )}

        {/* Location tab */}
        {activeTab === "location" && (
          <div>
            {hasGps ? (
              <>
                <div ref={locationMapRef} className="h-56 w-full" />
                <button onClick={openInMaps} className="flex items-center gap-3 px-4 py-3 w-full text-left hover:bg-muted/50 transition-colors border-b">
                  <Navigation className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{location!.name}</p>
                    {location!.address && <p className="text-xs text-muted-foreground">{location!.address}</p>}
                  </div>
                  <span className="text-xs font-medium text-primary">Navigate</span>
                </button>
              </>
            ) : location ? (
              <div className="px-4 py-4 space-y-3">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{location.name}</p>
                    {location.address && <p className="text-sm text-muted-foreground mt-0.5">{location.address}</p>}
                  </div>
                </div>
              </div>
            ) : (
              <div className="px-4 py-8 text-center">
                <MapPin className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No location information available</p>
              </div>
            )}

            {asset && (
              <div className="px-4 py-4 border-t space-y-3">
                <p className="text-xs font-medium text-muted-foreground">Asset at this location</p>
                <div className="flex items-center gap-3">
                  <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{asset.name}</p>
                    <p className="text-xs text-muted-foreground">{[asset.asset_tag, asset.serial_number && `SN: ${asset.serial_number}`].filter(Boolean).join(" · ")}</p>
                  </div>
                  <Button size="sm" variant="outline" className="gap-1.5 shrink-0" onClick={() => router.push(`/${company}/app/scan`)}>
                    <ScanLine className="h-3.5 w-3.5" /> Scan
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Instructions / Work tab */}
        {activeTab === "instructions" && (
          <div className="px-4 py-4 space-y-4">
            <Card>
              <CardContent className="pt-4 space-y-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Work instructions</p>
                  <p className="text-sm whitespace-pre-wrap mt-2">{order.description || "No instructions provided."}</p>
                </div>
                {asset && (
                  <div className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                    {asset.name}
                    {location ? ` · ${location.name}` : ""}
                  </div>
                )}
              </CardContent>
            </Card>

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Reference files</p>
              <TaskDocuments entityType="work-order" entityId={orderId} formatDate={formatDate} />
            </div>
          </div>
        )}

        {/* Work log tab */}
        {activeTab === "work-log" && (
          <div className="px-4 py-4 space-y-4">
            <WorkOrderWorkLog workOrder={order} parts={parts} onUpdate={updateOrder as never} formatNumber={formatNumber} />
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Activity</p>
              <TaskComments entityType="work-order" entityId={orderId} formatDate={formatDate} />
            </div>
          </div>
        )}

        {/* Complete tab */}
        {activeTab === "complete" && (
          <div className="px-4 py-4 space-y-4">
            {isCompleted ? (
              <div className="text-center py-6">
                <CheckCircle className="h-10 w-10 text-[#059669] mx-auto mb-3" />
                <p className="text-lg font-semibold">Work order completed</p>
                {order.completed_at && <p className="text-sm text-muted-foreground mt-1">{formatDate(order.completed_at)}</p>}
              </div>
            ) : (
              <>
                <div>
                  <p className="text-sm font-medium mb-2">Completion notes</p>
                  <Textarea
                    placeholder="Describe what was done, any issues found..."
                    value={completionNotes}
                    onChange={(e) => setCompletionNotes(e.target.value)}
                    rows={4}
                  />
                </div>

                {!isInProgress && (
                  <Button className="w-full" size="lg" onClick={() => handleStatusChange("in_progress")}>
                    Start work
                  </Button>
                )}
                {isInProgress && (
                  <Button className="w-full" size="lg" onClick={() => { handleStatusChange("completed"); }}>
                    <CheckCircle className="h-4 w-4 mr-2" /> Mark as complete
                  </Button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
