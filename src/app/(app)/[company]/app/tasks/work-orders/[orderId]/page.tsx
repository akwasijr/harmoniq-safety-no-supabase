"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, MapPin, Package, ScanLine, Calendar, User as UserIcon,
  AlertTriangle, CheckCircle, Navigation, Clock, ChevronDown, ChevronUp,
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
import { capitalize } from "@/lib/utils";
import { hasValidCoordinates } from "@/lib/map-utils";
import type { WorkOrderStatus } from "@/types";

export default function WorkOrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const company = typeof params.company === "string" ? params.company : "";
  const orderId = typeof params.orderId === "string" ? params.orderId : "";

  const { user } = useAuth();
  const { t, formatDate, formatNumber } = useTranslation();
  const { toast } = useToast();

  const { items: orders, update: updateOrder, isLoading } = useWorkOrdersStore();
  const { items: users } = useUsersStore();
  const { items: assets } = useAssetsStore();
  const { items: parts } = usePartsStore();
  const { items: locations } = useLocationsStore();
  const { add: addStatusLog } = useWorkOrderStatusLogStore();

  const [completionNotes, setCompletionNotes] = React.useState("");
  const [showWorkDetails, setShowWorkDetails] = React.useState(false);
  const mapRef = React.useRef<HTMLDivElement>(null);

  const order = orders.find((o) => o.id === orderId && o.company_id === user?.company_id);
  const assignee = order?.assigned_to ? users.find((u) => u.id === order.assigned_to) : null;
  const asset = order?.asset_id ? assets.find((a) => a.id === order.asset_id) : null;
  const location = asset?.location_id ? locations.find((l) => l.id === asset.location_id) : null;
  const hasGps = location && hasValidCoordinates(location.gps_lat, location.gps_lng);

  const isInProgress = order?.status === "in_progress";
  const isCompleted = order?.status === "completed";
  const isOverdue = order?.due_date && !["completed", "cancelled"].includes(order?.status || "") && new Date(order.due_date) < new Date();

  // Initialize map
  React.useEffect(() => {
    if (!hasGps || !mapRef.current || !location) return;
    const L = require("leaflet");
    require("leaflet/dist/leaflet.css");

    const map = L.map(mapRef.current, { zoomControl: false, attributionControl: false })
      .setView([location.gps_lat!, location.gps_lng!], 16);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);
    L.circleMarker([location.gps_lat!, location.gps_lng!], {
      radius: 8, fillColor: "#2563eb", fillOpacity: 1, color: "#fff", weight: 2,
    }).addTo(map);

    return () => { map.remove(); };
  }, [hasGps, location]);

  const handleStatusChange = React.useCallback(
    (targetStatus: WorkOrderStatus) => {
      if (!order) return;
      addStatusLog({
        id: crypto.randomUUID(),
        work_order_id: orderId,
        from_status: order.status,
        to_status: targetStatus,
        comment: completionNotes,
        changed_by: user?.id || "",
        changed_at: new Date().toISOString(),
      });
      const updates: Record<string, unknown> = {
        status: targetStatus,
        updated_at: new Date().toISOString(),
      };
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
    return (
      <EmptyState
        icon={Package}
        title="Work order not found"
        description="This work order may have been deleted."
        action={<Button variant="outline" onClick={() => router.back()}>Go back</Button>}
      />
    );
  }

  const typeLabel = capitalize((order.type || "service_request").replace(/_/g, " "));

  return (
    <div className="flex flex-col min-h-full bg-background pb-safe">
      {/* App header */}
      <div className="sticky top-0 z-10 border-b bg-background px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="shrink-0 p-1 -ml-1 rounded-md hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{order.title}</p>
          </div>
          <Badge variant={isCompleted ? "completed" : isInProgress ? "info" : "secondary"}>
            {capitalize(order.status.replace(/_/g, " "))}
          </Badge>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Summary */}
        <div className="px-4 pt-4 pb-3 space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{typeLabel}</span>
            <span>·</span>
            <span>{capitalize(order.priority)} priority</span>
            {order.due_date && (
              <>
                <span>·</span>
                <span className={isOverdue ? "text-red-600 dark:text-red-400 font-medium" : ""}>
                  Due {formatDate(order.due_date)}
                </span>
              </>
            )}
          </div>
          <p className="text-sm">{order.description || "No description provided."}</p>
          {assignee && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <UserIcon className="h-3 w-3" /> Assigned to {assignee.full_name || `${assignee.first_name} ${assignee.last_name}`}
            </p>
          )}
        </div>

        {/* Location section */}
        <div className="border-t">
          {hasGps ? (
            <>
              <div ref={mapRef} className="h-40 w-full" />
              <button
                onClick={openInMaps}
                className="flex items-center gap-2 px-4 py-3 w-full text-left hover:bg-muted/50 transition-colors border-b"
              >
                <Navigation className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{location!.name}</p>
                  {location!.address && <p className="text-xs text-muted-foreground">{location!.address}</p>}
                </div>
                <span className="text-xs text-muted-foreground">Navigate</span>
              </button>
            </>
          ) : location ? (
            <div className="flex items-center gap-3 px-4 py-3 border-b">
              <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{location.name}</p>
                {location.address && <p className="text-xs text-muted-foreground">{location.address}</p>}
              </div>
            </div>
          ) : null}
        </div>

        {/* Asset identification */}
        {asset && (
          <div className="border-b">
            <div className="flex items-center gap-3 px-4 py-3">
              <Package className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{asset.name}</p>
                <p className="text-xs text-muted-foreground">
                  {[asset.asset_tag, asset.serial_number && `SN: ${asset.serial_number}`].filter(Boolean).join(" · ") || "No identifier"}
                </p>
              </div>
              <Button size="sm" variant="outline" className="gap-1.5 shrink-0" onClick={() => router.push(`/${company}/app/scan`)}>
                <ScanLine className="h-3.5 w-3.5" /> Scan
              </Button>
            </div>
          </div>
        )}

        {/* Main action */}
        <div className="px-4 py-4">
          {!isInProgress && !isCompleted && (
            <Button className="w-full" size="lg" onClick={() => handleStatusChange("in_progress")}>
              Start work
            </Button>
          )}

          {isInProgress && !showWorkDetails && (
            <div className="space-y-3">
              <Button
                className="w-full"
                variant="outline"
                onClick={() => setShowWorkDetails(true)}
              >
                <ChevronDown className="h-4 w-4 mr-2" /> Log work details
              </Button>
              <Button className="w-full" size="lg" onClick={() => handleStatusChange("completed")}>
                <CheckCircle className="h-4 w-4 mr-2" /> Mark as complete
              </Button>
            </div>
          )}

          {isInProgress && showWorkDetails && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Work details</p>
                <button onClick={() => setShowWorkDetails(false)} className="text-xs text-muted-foreground hover:text-foreground">
                  <ChevronUp className="h-4 w-4 inline" /> Hide
                </button>
              </div>

              <WorkOrderWorkLog workOrder={order} parts={parts} onUpdate={updateOrder as never} formatNumber={formatNumber} />

              <div>
                <p className="text-sm text-muted-foreground mb-2">Completion notes</p>
                <Textarea
                  placeholder="Describe what was done..."
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <Button className="w-full" size="lg" onClick={() => { handleStatusChange("completed"); router.back(); }}>
                <CheckCircle className="h-4 w-4 mr-2" /> Mark as complete
              </Button>
            </div>
          )}

          {isCompleted && (
            <div className="text-center py-4">
              <CheckCircle className="h-8 w-8 text-[#059669] mx-auto mb-2" />
              <p className="font-medium">Work order completed</p>
              {order.completed_at && <p className="text-sm text-muted-foreground mt-1">{formatDate(order.completed_at)}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
