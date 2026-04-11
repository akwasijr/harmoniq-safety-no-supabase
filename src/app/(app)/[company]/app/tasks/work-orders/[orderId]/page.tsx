"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  ClipboardCheck,
  Download,
  FileText,
  MapPin,
  Navigation,
  Package,
  ScanLine,
  Wrench,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingPage } from "@/components/ui/loading";
import { useTranslation } from "@/i18n";
import { useAuth } from "@/hooks/use-auth";
import { useWorkOrdersStore } from "@/stores/work-orders-store";
import { useAssetsStore } from "@/stores/assets-store";
import { useLocationsStore } from "@/stores/locations-store";
import { useChecklistTemplatesStore } from "@/stores/checklists-store";
import { useUsersStore } from "@/stores/users-store";
import { useToast } from "@/components/ui/toast";
import { hasValidCoordinates } from "@/lib/map-utils";
import { capitalize, cn } from "@/lib/utils";
import { downloadFile, getFilesForEntity } from "@/lib/file-storage";
import { getProcedureTemplateIdForType } from "@/data/work-order-procedure-templates";

type QuickAction = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  disabled?: boolean;
};

const SUMMARY_PREVIEW_LENGTH = 180;

export default function WorkOrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const company = typeof params.company === "string" ? params.company : "";
  const orderId = typeof params.orderId === "string" ? params.orderId : "";

  const { user } = useAuth();
  const { formatDate } = useTranslation();
  const { toast } = useToast();
  const { items: workOrders, update: updateOrder, isLoading } = useWorkOrdersStore();
  const { items: assets } = useAssetsStore();
  const { items: locations } = useLocationsStore();
  const { items: checklistTemplates } = useChecklistTemplatesStore();
  const { items: users } = useUsersStore();
  const mapRef = React.useRef<HTMLDivElement>(null);
  const mapInstanceRef = React.useRef<unknown>(null);
  const [isSummaryExpanded, setIsSummaryExpanded] = React.useState(false);
  const [showDecline, setShowDecline] = React.useState(false);
  const [declineReason, setDeclineReason] = React.useState("");
  const [declineDetails, setDeclineDetails] = React.useState("");

  const order = workOrders.find((item) => item.id === orderId && item.company_id === user?.company_id);
  const asset = order?.asset_id ? assets.find((item) => item.id === order.asset_id) : null;
  const directLocation = order?.location_id ? locations.find((item) => item.id === order.location_id) : null;
  const assetLocation = asset?.location_id ? locations.find((item) => item.id === asset.location_id) : null;
  const location = directLocation ?? assetLocation;
  const templateId = order?.checklist_template_id || (order ? getProcedureTemplateIdForType(order.type) : null);
  const template = templateId
    ? checklistTemplates.find((item) => item.id === templateId)
    : null;
  const documents = React.useMemo(() => getFilesForEntity("work-order", orderId), [orderId]);
  const hasGps = Boolean(location && hasValidCoordinates(location.gps_lat, location.gps_lng));
  const isOverdue = Boolean(
    order?.due_date &&
      !["completed", "cancelled"].includes(order.status) &&
      new Date(order.due_date) < new Date(),
  );
  const workOrderReference = order ? `WO-${order.id.slice(-6).toUpperCase()}` : "";
  const locationHierarchy = React.useMemo(() => {
    if (!location) return [];

    const chain: (typeof locations)[number][] = [];
    const seen = new Set<string>();
    let current: (typeof locations)[number] | null = location;

    while (current && !seen.has(current.id)) {
      chain.unshift(current);
      seen.add(current.id);
      const parentId: string | null = current.parent_id;
      current = parentId ? (locations.find((item) => item.id === parentId) ?? null) : null;
    }

    return chain;
  }, [location, locations]);

  const statusBadgeVariant =
    order?.status === "completed"
      ? "completed"
      : order?.status === "cancelled"
        ? "destructive"
        : order?.status === "in_progress"
          ? "info"
          : "secondary";

  const typeLabel = capitalize((order?.type || "service_request").replace(/_/g, " "));
  const priorityLabel = capitalize(order?.priority || "medium");
  const assignedUser = order?.assigned_to ? users.find((u) => u.id === order.assigned_to) : null;
  const assignedName = assignedUser ? `${assignedUser.first_name} ${assignedUser.last_name}` : "Unassigned";
  const summaryText = order?.description?.trim() || "No work summary was provided for this work order.";
  const isSummaryLong = summaryText.length > SUMMARY_PREVIEW_LENGTH;
  const visibleSummary =
    isSummaryExpanded || !isSummaryLong
      ? summaryText
      : `${summaryText.slice(0, SUMMARY_PREVIEW_LENGTH).trimEnd()}...`;

  React.useEffect(() => {
    if (!hasGps || !mapRef.current || mapInstanceRef.current || !location) return;
    const L = require("leaflet");
    require("leaflet/dist/leaflet.css");
    const map = L.map(mapRef.current, { zoomControl: false, attributionControl: false }).setView(
      [location.gps_lat!, location.gps_lng!],
      15,
    );
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);
    L.circleMarker([location.gps_lat!, location.gps_lng!], {
      radius: 8,
      fillColor: "hsl(var(--primary))",
      fillOpacity: 1,
      color: "hsl(var(--background))",
      weight: 2,
    }).addTo(map);
    mapInstanceRef.current = map;
    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [hasGps, location]);

  if (isLoading && workOrders.length === 0) {
    return <LoadingPage />;
  }

  if (!order) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Work order not found"
        description="This work order may have been removed or is no longer available."
        action={
          <Button variant="outline" onClick={() => router.back()}>
            Go back
          </Button>
        }
      />
    );
  }

  const beginProcedure = () => {
    if (!template) {
      toast("No procedure template is attached to this work order.", "error");
      return;
    }
    if (order.status !== "in_progress" && order.status !== "completed") {
      updateOrder(order.id, {
        status: "in_progress",
        updated_at: new Date().toISOString(),
      });
    }
    router.push(`/${company}/app/tasks/work-orders/${order.id}/procedure`);
  };

  const openInMaps = () => {
    if (!location?.gps_lat || !location?.gps_lng) return;
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${location.gps_lat},${location.gps_lng}`,
      "_blank",
    );
  };

  const handleDecline = () => {
    if (!declineReason.trim()) {
      toast("Please select a reason", "error");
      return;
    }
    const fullReason = declineDetails.trim()
      ? `${declineReason}: ${declineDetails.trim()}`
      : declineReason;
    updateOrder(order.id, {
      status: "cancelled",
      declined_reason: fullReason,
      declined_at: new Date().toISOString(),
      declined_by: user?.id || null,
      updated_at: new Date().toISOString(),
    });
    toast("Work order declined");
    setShowDecline(false);
    setDeclineReason("");
    setDeclineDetails("");
    router.back();
  };

  const quickActions: QuickAction[] = [
    {
      id: "locate",
      label: hasGps ? "Navigate to asset" : "View location",
      icon: hasGps ? Navigation : MapPin,
      onClick: () => {
        if (hasGps) {
          openInMaps();
          return;
        }

        if (location) {
          router.push(`/${company}/app/location/${location.id}`);
        }
      },
      disabled: !location,
    },
    {
      id: "confirm-asset",
      label: asset ? "Scan asset QR" : "Browse assets",
      icon: ScanLine,
      onClick: () => {
        if (asset) {
          router.push(`/${company}/app/scan`);
          return;
        }

        router.push(`/${company}/app/assets`);
      },
    },
    {
      id: "procedure",
      label:
        order.status === "completed"
          ? "Review procedure"
          : order.status === "in_progress"
            ? "Resume procedure"
            : "Begin procedure",
      icon: ClipboardCheck,
      onClick: beginProcedure,
      disabled: !template,
    },
    {
      id: "asset-record",
      label: asset ? "Open asset record" : "Work order files",
      icon: asset ? Package : FileText,
      onClick: () => {
        if (asset) {
          router.push(`/${company}/app/asset?id=${asset.id}`);
          return;
        }

        if (documents[0]) {
          downloadFile(documents[0]);
        }
      },
      disabled: !asset && documents.length === 0,
    },
  ];

  const isTerminal = order.status === "completed" || order.status === "cancelled";
  const requiresChecklist = Boolean(order.checklist_template_id && !order.checklist_submission_id);

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-[60px] z-10 border-b bg-background">
        <div className="mx-auto flex h-14 max-w-lg items-center gap-3 px-4">
          <Button variant="ghost" size="icon" onClick={() => router.push(`/${company}/app/assets?tab=work`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-semibold">{order.title}</h1>
            <p className="text-xs text-muted-foreground">{workOrderReference} · {typeLabel}</p>
          </div>
          <Badge variant={statusBadgeVariant}>{capitalize(order.status.replace(/_/g, " "))}</Badge>
        </div>
      </div>

      <div className="mx-auto max-w-lg space-y-4 p-4 pb-8">

        {/* Work order details */}
        <Card>
          <CardContent className="pt-5 space-y-4">
            <p className="text-sm leading-6 text-foreground">{visibleSummary}</p>
            {isSummaryLong && (
              <button
                type="button"
                className="text-sm font-medium text-primary"
                onClick={() => setIsSummaryExpanded((current) => !current)}
              >
                {isSummaryExpanded ? "View less" : "View more"}
              </button>
            )}

            <div className="border-t pt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Type</p>
                <p className="mt-0.5 font-medium">{typeLabel}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Priority</p>
                <p className="mt-0.5 font-medium">{priorityLabel}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Asset</p>
                <p className="mt-0.5 font-medium truncate">{asset?.name || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Location</p>
                <p className="mt-0.5 font-medium truncate">{location?.name || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Assigned to</p>
                <p className="mt-0.5 font-medium truncate">{assignedName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Created</p>
                <p className="mt-0.5 font-medium">{formatDate(order.created_at)}</p>
              </div>
              {order.due_date && (
                <div className="col-span-2 flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="text-sm">
                    Due {formatDate(order.due_date)}
                  </span>
                  {isOverdue && (
                    <Badge variant="overdue" className="rounded-full px-2 py-0.5 text-[11px]">Overdue</Badge>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Procedure checklist card */}
        {template && (
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <ClipboardCheck className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{template.name}</p>
                  <p className="text-xs text-muted-foreground">{template.items.length} steps</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Asset & Location */}
        {(asset || location) && (
          <Card>
            <CardContent className="pt-5 space-y-4">
              {asset && (
                <div className="flex items-start gap-3">
                  <Package className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{asset.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {[asset.asset_tag, asset.serial_number, capitalize((asset.category || "").replace(/_/g, " "))].filter(Boolean).join(" · ") || "No identifier"}
                    </p>
                  </div>
                </div>
              )}

              {asset && location && <div className="border-t" />}

              {location && (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{location.name}</p>
                        <p className="text-xs capitalize text-muted-foreground">{location.type.replace(/_/g, " ")}</p>
                      </div>
                    </div>
                    {hasGps && (
                      <Button size="sm" variant="outline" className="shrink-0 gap-1.5 h-7 text-xs" onClick={openInMaps}>
                        <Navigation className="h-3 w-3" />
                        Navigate
                      </Button>
                    )}
                  </div>

                  {hasGps && (
                    <button type="button" onClick={openInMaps} className="block w-full">
                      <div ref={mapRef} className="h-36 w-full overflow-hidden rounded-xl border" />
                    </button>
                  )}

                  {locationHierarchy.length > 1 && (
                    <div className="space-y-2">
                      {locationHierarchy.map((item, index) => (
                        <div key={item.id} className="flex items-start gap-3">
                          <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                            {index + 1}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium">{item.name}</p>
                            <p className="text-xs capitalize text-muted-foreground">{item.type.replace(/_/g, " ")}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {location.address && (
                    <p className="border-t pt-3 text-xs text-muted-foreground">{location.address}</p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Supporting files */}
        {documents.length > 0 && (
          <Card>
            <CardContent className="pt-5">
              <h3 className="text-xs font-medium text-muted-foreground">Files</h3>
              <div className="mt-3 space-y-2">
                {documents.map((doc) => (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => downloadFile(doc)}
                    className="flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors hover:bg-muted/30"
                  >
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{doc.name}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(doc.uploadedAt)}</p>
                    </div>
                    <Download className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Decline reason if already declined */}
        {order.declined_reason && (
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-start gap-3">
                <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <div>
                  <p className="text-xs font-medium text-destructive">Declined</p>
                  <p className="mt-1 text-sm text-muted-foreground">{order.declined_reason}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions — at the bottom */}
        {!isTerminal && (
          <div className="space-y-3 pt-2">
            {requiresChecklist && (
              <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>Complete the required procedure checklist before closing this work order</span>
              </div>
            )}

            {/* Primary: begin / resume procedure */}
            {template && (
              <Button className="w-full gap-2 h-12 text-base" onClick={beginProcedure}>
                <ClipboardCheck className="h-5 w-5" />
                {order.status === "in_progress" ? "Continue procedure" : "Begin procedure"}
              </Button>
            )}

            {/* Secondary row: navigate + scan + decline */}
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                className="h-11 flex-col gap-1 rounded-xl text-center px-1"
                onClick={() => {
                  if (hasGps) { openInMaps(); return; }
                  if (location) router.push(`/${company}/app/location/${location.id}`);
                }}
                disabled={!location}
              >
                <MapPin className="h-4 w-4" />
                <span className="text-[10px] leading-3">Location</span>
              </Button>
              <Button
                variant="outline"
                className="h-11 flex-col gap-1 rounded-xl text-center px-1"
                onClick={() => router.push(`/${company}/app/scan`)}
              >
                <ScanLine className="h-4 w-4" />
                <span className="text-[10px] leading-3">Scan QR</span>
              </Button>
              <Button
                variant="outline"
                className="h-11 flex-col gap-1 rounded-xl text-center px-1 text-destructive hover:text-destructive"
                onClick={() => setShowDecline(true)}
              >
                <XCircle className="h-4 w-4" />
                <span className="text-[10px] leading-3">Decline</span>
              </Button>
            </div>
          </div>
        )}

        {/* Completed state */}
        {order.status === "completed" && template && (
          <Button variant="outline" className="w-full gap-2" onClick={beginProcedure}>
            <ClipboardCheck className="h-5 w-5" />
            Review completed procedure
          </Button>
        )}

        {/* Decline modal */}
        {showDecline && (
          <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-4 sm:items-center">
            <Card className="w-full max-w-md">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-3">
                  <XCircle className="h-5 w-5 text-destructive" />
                  <h3 className="font-semibold">Decline work order</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  This will be visible to the team on the dashboard.
                </p>
                <div>
                  <label htmlFor="decline-reason" className="text-xs font-medium text-muted-foreground">Reason</label>
                  <select
                    id="decline-reason"
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={declineReason}
                    onChange={(e) => setDeclineReason(e.target.value)}
                  >
                    <option value="">Select a reason</option>
                    <option value="Asset not found">Asset not found</option>
                    <option value="Not accessible">Not accessible</option>
                    <option value="No longer needed">No longer needed</option>
                    <option value="Incorrect details">Incorrect details</option>
                    <option value="Parts unavailable">Parts unavailable</option>
                    <option value="Safety concern">Safety concern</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="decline-details" className="text-xs font-medium text-muted-foreground">Additional details (optional)</label>
                  <Textarea
                    id="decline-details"
                    placeholder="Add more context if needed"
                    value={declineDetails}
                    onChange={(e) => setDeclineDetails(e.target.value)}
                    rows={3}
                    className="mt-1"
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => { setShowDecline(false); setDeclineReason(""); setDeclineDetails(""); }}>
                    Cancel
                  </Button>
                  <Button variant="destructive" className="flex-1" onClick={handleDecline} disabled={!declineReason.trim()}>
                    Decline
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
