"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Navigation,
  MapPin,
  Package,
  ScanLine,
  ClipboardCheck,
  FileText,
  Download,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingPage } from "@/components/ui/loading";
import { useTranslation } from "@/i18n";
import { useAuth } from "@/hooks/use-auth";
import { useWorkOrdersStore } from "@/stores/work-orders-store";
import { useAssetsStore } from "@/stores/assets-store";
import { useLocationsStore } from "@/stores/locations-store";
import { useChecklistTemplatesStore } from "@/stores/checklists-store";
import { useToast } from "@/components/ui/toast";
import { hasValidCoordinates } from "@/lib/map-utils";
import { capitalize, cn } from "@/lib/utils";
import { getFilesForEntity, downloadFile } from "@/lib/file-storage";

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
  const mapRef = React.useRef<HTMLDivElement>(null);
  const mapInstanceRef = React.useRef<unknown>(null);

  const order = workOrders.find((item) => item.id === orderId && item.company_id === user?.company_id);
  const asset = order?.asset_id ? assets.find((item) => item.id === order.asset_id) : null;
  const location = asset?.location_id ? locations.find((item) => item.id === asset.location_id) : null;
  const template = order?.checklist_template_id
    ? checklistTemplates.find((item) => item.id === order.checklist_template_id)
    : null;
  const documents = React.useMemo(() => getFilesForEntity("work-order", orderId), [orderId]);
  const hasGps = Boolean(location && hasValidCoordinates(location.gps_lat, location.gps_lng));
  const isOverdue = Boolean(
    order?.due_date && !["completed", "cancelled"].includes(order.status) && new Date(order.due_date) < new Date(),
  );

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
      fillColor: "#2563eb",
      fillOpacity: 1,
      color: "#ffffff",
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
        action={<Button variant="outline" onClick={() => router.back()}>Go back</Button>}
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
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${location.gps_lat},${location.gps_lng}`, "_blank");
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-30 border-b bg-background">
        <div className="flex h-14 items-center gap-4 px-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-semibold">{order.title}</h1>
            <p className="text-xs text-muted-foreground">
              {capitalize((order.type || "service_request").replace(/_/g, " "))} · {capitalize(order.priority)}
            </p>
          </div>
          <Badge variant={order.status === "completed" ? "completed" : order.status === "in_progress" ? "info" : "secondary"}>
            {capitalize(order.status.replace(/_/g, " "))}
          </Badge>
        </div>
      </header>

      <div className="flex-1 space-y-4 px-4 py-4 pb-8">
        {isOverdue && order.due_date && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-900 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
            <AlertTriangle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
            <p className="text-xs font-medium">Overdue — due {formatDate(order.due_date)}</p>
          </div>
        )}

        <Card>
          <CardContent className="pt-4 space-y-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Summary</p>
              <p className="mt-2 text-sm leading-6">{order.description || "No description provided."}</p>
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              {order.due_date && <span className={cn(isOverdue && "font-medium text-red-700 dark:text-red-300")}>Due {formatDate(order.due_date)}</span>}
              {template && <span>Procedure: {template.name}</span>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">Location</p>
                <p className="mt-1 text-sm font-medium">{location?.name || "No location available"}</p>
                {location?.address && <p className="mt-1 text-xs text-muted-foreground">{location.address}</p>}
              </div>
              {hasGps && (
                <Button size="sm" variant="outline" className="gap-1.5 shrink-0" onClick={openInMaps}>
                  <Navigation className="h-3.5 w-3.5" /> Navigate
                </Button>
              )}
            </div>
            {hasGps ? (
              <div ref={mapRef} className="h-36 w-full overflow-hidden rounded-lg border" />
            ) : location ? (
              <div className="rounded-lg border bg-muted/30 px-3 py-3 text-sm text-muted-foreground">
                {location.name}
                {location.address ? ` · ${location.address}` : ""}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-start gap-3">
              <Package className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-muted-foreground">Asset confirmation</p>
                <p className="mt-1 text-sm font-medium">{asset?.name || "No asset linked"}</p>
                {asset && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {[asset.asset_tag, asset.serial_number && `SN: ${asset.serial_number}`].filter(Boolean).join(" · ") || "No asset identifier"}
                  </p>
                )}
              </div>
            </div>
            {asset && (
              <Button size="sm" variant="outline" className="w-full gap-1.5" onClick={() => router.push(`/${company}/app/scan`)}>
                <ScanLine className="h-3.5 w-3.5" /> Scan asset QR code
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-start gap-3">
              <ClipboardCheck className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-muted-foreground">Procedure</p>
                <p className="mt-1 text-sm font-medium">{template?.name || "No procedure selected"}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {template?.description || "Attach a checklist template to this work order from the dashboard before sending it out."}
                </p>
              </div>
            </div>
            <Button className="w-full" size="lg" onClick={beginProcedure} disabled={!template}>
              {order.status === "completed" ? "Review procedure" : "Begin procedure"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs font-medium text-muted-foreground">Supporting files</p>
            </div>
            {documents.length > 0 ? (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => downloadFile(doc)}
                    className="flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left hover:bg-muted/30"
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
            ) : (
              <EmptyState compact icon={FileText} title="No supporting files" description="Any documents or images attached to this work order will appear here." />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
