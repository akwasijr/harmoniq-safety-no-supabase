"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCompanyParam } from "@/hooks/use-company-param";
import { ArrowLeft, Wrench, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useAssetsStore } from "@/stores/assets-store";
import { useWorkOrdersStore } from "@/stores/work-orders-store";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/components/ui/toast";
import type { WorkOrder, Priority } from "@/types";
import { useTranslation } from "@/i18n";

function RequestMaintenancePageContent() {
  const router = useRouter();
  const company = useCompanyParam();
  const searchParams = useSearchParams();
  const preselectedAssetId = searchParams.get("asset") || "";
  const { user } = useAuth();
  const { toast } = useToast();
  const { items: assets } = useAssetsStore();
  const { add: addWorkOrder } = useWorkOrdersStore();
  const { t } = useTranslation();
  const [form, setForm] = React.useState({
    asset_id: preselectedAssetId,
    title: "",
    description: "",
    priority: "medium" as Priority,
  });

  const selectedAsset = form.asset_id ? assets.find(a => a.id === form.asset_id) : null;

  const handleSubmit = () => {
    if (!form.title.trim() || !form.description.trim()) return;
    const order: WorkOrder = {
      id: `wo_${Date.now()}`,
      company_id: user?.company_id || "",
      asset_id: form.asset_id || null,
      title: form.title.trim(),
      description: form.description.trim(),
      priority: form.priority,
      status: "requested",
      requested_by: user?.id || "",
      assigned_to: null,
      due_date: null,
      estimated_hours: null,
      actual_hours: null,
      parts_cost: null,
      labor_cost: null,
      corrective_action_id: null,
      completed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    addWorkOrder(order);
    toast("Maintenance request submitted");
    router.back();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background border-b px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="font-semibold">{t("maintenance.title")}</h1>
          <p className="text-xs text-muted-foreground">{t("maintenance.submitWorkOrder")}</p>
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-lg mx-auto">
        {selectedAsset && (
          <Card className="bg-muted/50">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Wrench className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{selectedAsset.name}</p>
                  <p className="text-xs text-muted-foreground">{selectedAsset.asset_tag} • <span className="text-xs capitalize">{selectedAsset.condition}</span></p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-2">
          <Label>{t("maintenance.labels.asset")}</Label>
          <select
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={form.asset_id}
            onChange={(e) => setForm(p => ({ ...p, asset_id: e.target.value }))}
          >
            <option value="">{t("maintenance.selectAsset")}</option>
            {assets.filter(a => a.status !== "retired").map(a => (
              <option key={a.id} value={a.id}>{a.name} ({a.asset_tag})</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label>{t("maintenance.labels.whatNeedsFixing")} *</Label>
          <Input placeholder={t("maintenance.briefTitle")} value={form.title} onChange={(e) => setForm(p => ({ ...p, title: e.target.value }))} />
        </div>

        <div className="space-y-2">
          <Label>{t("maintenance.labels.description")} *</Label>
          <Textarea rows={4} placeholder={t("maintenance.describeTheProblem")} value={form.description} onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} />
        </div>

        <div className="space-y-2">
          <Label>{t("maintenance.labels.priority")}</Label>
          <div className="flex gap-2">
            {(["low", "medium", "high", "critical"] as Priority[]).map(p => (
              <Button key={p} size="sm" variant={form.priority === p ? "default" : "outline"} onClick={() => setForm(prev => ({ ...prev, priority: p }))} className="flex-1 capitalize">
                {p}
              </Button>
            ))}
          </div>
        </div>

        <Button className="w-full gap-2 mt-4" size="lg" disabled={!form.title.trim() || !form.description.trim()} onClick={handleSubmit}>
          <Send className="h-4 w-4" />
          {t("maintenance.buttons.submitRequest")}
        </Button>
      </div>
    </div>
  );
}

export default function RequestMaintenancePage() {
  return (
    <React.Suspense fallback={<div className="flex min-h-[400px] items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}>
      <RequestMaintenancePageContent />
    </React.Suspense>
  );
}
