"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, MapPin, Package, ScanLine, Camera, CheckCircle, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useWorkOrdersStore } from "@/stores/work-orders-store";
import { useUsersStore } from "@/stores/users-store";
import { useAssetsStore } from "@/stores/assets-store";
import { useLocationsStore } from "@/stores/locations-store";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/components/ui/toast";
import { useTranslation } from "@/i18n";
import { LoadingPage } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";
import { useWorkOrderStatusLogStore } from "@/stores/work-order-status-log-store";
import { capitalize } from "@/lib/utils";
import type { WorkOrderStatus } from "@/types";

type Step = "summary" | "location" | "asset" | "details" | "complete";

const STEPS: { id: Step; label: string }[] = [
  { id: "summary", label: "Summary" },
  { id: "location", label: "Location" },
  { id: "asset", label: "Asset" },
  { id: "details", label: "Details" },
  { id: "complete", label: "Complete" },
];

export default function WorkOrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const company = typeof params.company === "string" ? params.company : "";
  const orderId = typeof params.orderId === "string" ? params.orderId : "";

  const { user } = useAuth();
  const { t, formatDate } = useTranslation();
  const { toast } = useToast();

  const { items: orders, update: updateOrder, isLoading } = useWorkOrdersStore();
  const { items: users } = useUsersStore();
  const { items: assets } = useAssetsStore();
  const { items: locations } = useLocationsStore();
  const { add: addStatusLog } = useWorkOrderStatusLogStore();

  const [step, setStep] = React.useState<Step>("summary");
  const [completionNotes, setCompletionNotes] = React.useState("");

  const order = orders.find((o) => o.id === orderId && o.company_id === user?.company_id);
  const asset = order?.asset_id ? assets.find((a) => a.id === order.asset_id) : null;
  const location = asset?.location_id ? locations.find((l) => l.id === asset.location_id) : null;

  const currentStepIndex = STEPS.findIndex((s) => s.id === step);

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

  const isOverdue = order.due_date && !["completed", "cancelled"].includes(order.status) && new Date(order.due_date) < new Date();
  const typeLabel = capitalize((order.type || "service_request").replace(/_/g, " "));

  return (
    <div className="flex flex-col min-h-full bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b bg-background px-4 py-3 safe-top">
        <div className="flex items-center gap-3">
          <button onClick={() => step === "summary" ? router.back() : setStep(STEPS[currentStepIndex - 1].id)} className="shrink-0 p-1 -ml-1 rounded-md hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{order.title}</p>
            <p className="text-xs text-muted-foreground">{STEPS[currentStepIndex].label} · Step {currentStepIndex + 1} of {STEPS.length}</p>
          </div>
          <Badge variant={order.status === "completed" ? "completed" : order.status === "in_progress" ? "info" : "secondary"}>
            {capitalize(order.status.replace(/_/g, " "))}
          </Badge>
        </div>
      </div>

      {/* Step progress bar */}
      <div className="flex gap-1 px-4 pt-3">
        {STEPS.map((s, i) => (
          <div
            key={s.id}
            className={`h-1 flex-1 rounded-full ${
              i < currentStepIndex ? "bg-[#059669]" : i === currentStepIndex ? "bg-foreground" : "bg-muted"
            }`}
          />
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-5">

        {/* Step 1: Summary */}
        {step === "summary" && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold">{order.title}</h2>
              <p className="text-sm text-muted-foreground mt-1">{typeLabel} · {capitalize(order.priority)} priority</p>
              {isOverdue && <p className="text-sm text-red-600 dark:text-red-400 mt-1 font-medium">Overdue — due {formatDate(order.due_date!)}</p>}
              {order.due_date && !isOverdue && <p className="text-sm text-muted-foreground mt-1">Due {formatDate(order.due_date)}</p>}
            </div>
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{order.description || "No description provided."}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 2: Location */}
        {step === "location" && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Where to go</h2>
            {location ? (
              <Card>
                <CardContent className="pt-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div>
                      <p className="font-medium">{location.name}</p>
                      {location.address && <p className="text-sm text-muted-foreground">{location.address}</p>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground">No location specified for this work order. Check the asset details for more information.</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Step 3: Asset identification */}
        {step === "asset" && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Identify the asset</h2>
            {asset ? (
              <>
                <Card>
                  <CardContent className="pt-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <Package className="h-5 w-5 text-muted-foreground shrink-0" />
                      <div>
                        <p className="font-medium">{asset.name}</p>
                        {asset.asset_tag && <p className="text-xs text-muted-foreground">{asset.asset_tag}</p>}
                        {asset.serial_number && <p className="text-xs text-muted-foreground">SN: {asset.serial_number}</p>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Button variant="outline" className="w-full gap-2" onClick={() => router.push(`/${company}/app/scan`)}>
                  <ScanLine className="h-4 w-4" /> Scan QR to verify
                </Button>
              </>
            ) : (
              <Card>
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground">No asset linked to this work order.</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Step 4: Work details / instructions */}
        {step === "details" && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Work instructions</h2>
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm whitespace-pre-wrap">{order.description || "No instructions provided."}</p>
              </CardContent>
            </Card>
            {asset && (
              <div className="text-sm space-y-1">
                <p className="text-muted-foreground">Asset: <span className="text-foreground font-medium">{asset.name}</span></p>
                {location && <p className="text-muted-foreground">Location: <span className="text-foreground font-medium">{location.name}</span></p>}
              </div>
            )}
          </div>
        )}

        {/* Step 5: Complete */}
        {step === "complete" && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Complete work order</h2>
            <div>
              <p className="text-sm text-muted-foreground mb-2">Add any notes about the work performed:</p>
              <Textarea
                placeholder="What was done? Any issues found?"
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              {order.status !== "in_progress" && order.status !== "completed" && (
                <Button className="w-full gap-2" onClick={() => { handleStatusChange("in_progress"); }}>
                  Start work
                </Button>
              )}
              {order.status === "in_progress" && (
                <Button className="w-full gap-2" onClick={() => { handleStatusChange("completed"); router.back(); }}>
                  <CheckCircle className="h-4 w-4" /> Mark as complete
                </Button>
              )}
              {order.status === "completed" && (
                <div className="text-center py-4">
                  <CheckCircle className="h-8 w-8 text-[#059669] mx-auto mb-2" />
                  <p className="font-medium">Work order completed</p>
                  <p className="text-sm text-muted-foreground mt-1">{order.completed_at ? formatDate(order.completed_at) : ""}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom action */}
      {step !== "complete" && (
        <div className="sticky bottom-0 border-t bg-background px-4 py-3 safe-bottom">
          <Button className="w-full gap-2" onClick={() => setStep(STEPS[currentStepIndex + 1].id)}>
            Continue <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
