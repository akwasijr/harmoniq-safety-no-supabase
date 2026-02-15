"use client";

import * as React from "react";
import Link from "next/link";
import { useCompanyParam } from "@/hooks/use-company-param";
import {
  Plus,
  AlertTriangle,
  CheckCircle,
  Clock,
  Search,
  X,
  Wrench,
  ClipboardList,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { KPICard } from "@/components/ui/kpi-card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCorrectiveActionsStore } from "@/stores/corrective-actions-store";
import { useAssetsStore } from "@/stores/assets-store";
import { useUsersStore } from "@/stores/users-store";
import { useWorkOrdersStore } from "@/stores/work-orders-store";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/components/ui/toast";
import { capitalize } from "@/lib/utils";
import type { CorrectiveAction, WorkOrder, Severity } from "@/types";
import { useTranslation } from "@/i18n";

export default function CorrectiveActionsPage() {
  const { t, formatDate } = useTranslation();
  const company = useCompanyParam();
  const { user } = useAuth();
  const { toast } = useToast();
  const { items: actions, add, update , isLoading } = useCorrectiveActionsStore();
  const { items: assets } = useAssetsStore();
  const { items: users } = useUsersStore();
  const { add: addWorkOrder } = useWorkOrdersStore();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [showCreate, setShowCreate] = React.useState(false);
  const [form, setForm] = React.useState({
    asset_id: "",
    description: "",
    severity: "medium" as Severity,
    assigned_to: "",
    due_date: "",
  });

  const now = new Date();
  const filtered = actions.filter((a) => {
    if (statusFilter !== "all" && a.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const asset = assets.find((as) => as.id === a.asset_id);
      return a.description.toLowerCase().includes(q) || (asset?.name || "").toLowerCase().includes(q);
    }
    return true;
  });

  const openCount = actions.filter((a) => a.status === "open").length;
  const inProgressCount = actions.filter((a) => a.status === "in_progress").length;
  const overdueCount = actions.filter((a) => {
    if (a.status === "completed") return false;
    return new Date(a.due_date) < now;
  }).length;
  const completedCount = actions.filter((a) => a.status === "completed").length;

  const handleCreate = () => {
    if (!form.asset_id || !form.description.trim() || !form.due_date) return;
    const action: CorrectiveAction = {
      id: `ca_${Date.now()}`,
      company_id: user?.company_id || "",
      asset_id: form.asset_id,
      inspection_id: null,
      description: form.description.trim(),
      severity: form.severity,
      assigned_to: form.assigned_to || null,
      due_date: form.due_date,
      status: "open",
      resolution_notes: null,
      completed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    add(action);
    toast("Corrective action created");
    setShowCreate(false);
    setForm({ asset_id: "", description: "", severity: "medium", assigned_to: "", due_date: "" });
  };

  const handleStatusChange = (id: string, newStatus: string) => {
    const updates: Partial<CorrectiveAction> = {
      status: newStatus as CorrectiveAction["status"],
      updated_at: new Date().toISOString(),
    };
    if (newStatus === "completed") {
      updates.completed_at = new Date().toISOString();
    }
    update(id, updates);
    toast(`Status updated to ${newStatus.replace("_", " ")}`);
  };

  const handleCreateWorkOrder = (action: CorrectiveAction) => {
    const wo: WorkOrder = {
      id: `wo_${Date.now()}`,
      company_id: user?.company_id || "",
      asset_id: action.asset_id,
      title: `WO for: ${action.description.slice(0, 60)}`,
      description: action.description,
      priority: action.severity === "critical" ? "critical" : action.severity === "high" ? "high" : action.severity === "medium" ? "medium" : "low",
      status: "requested",
      requested_by: user?.id || "",
      assigned_to: action.assigned_to,
      due_date: action.due_date,
      estimated_hours: null,
      actual_hours: null,
      parts_cost: null,
      labor_cost: null,
      corrective_action_id: action.id,
      completed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    addWorkOrder(wo);
    toast("Work order created from corrective action");
  };

  const getAssetName = (id: string) => assets.find((a) => a.id === id)?.name || "Unknown";
  const getUserName = (id: string | null) => {
    if (!id) return "Unassigned";
    const u = users.find((usr) => usr.id === id);
    return u ? `${u.first_name} ${u.last_name}` : "Unknown";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Button size="sm" className="gap-2" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" />
          {t("correctiveActions.newAction")}
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <KPICard title={t("correctiveActions.statuses.open")} value={openCount} icon={AlertTriangle} />
        <KPICard title={t("correctiveActions.statuses.inProgress")} value={inProgressCount} icon={Clock} />
        <KPICard title={t("correctiveActions.statuses.overdue")} value={overdueCount} icon={AlertTriangle} />
        <KPICard title={t("correctiveActions.statuses.completed")} value={completedCount} icon={CheckCircle} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder={t("correctiveActions.placeholders.searchActions")} className="pl-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <div className="flex gap-2">
          {["all", "open", "in_progress", "completed"].map((s) => (
            <Button key={s} size="sm" variant={statusFilter === s ? "default" : "outline"} onClick={() => setStatusFilter(s)}>
              {s === "all" ? "All" : capitalize(s.replace("_", " "))}
            </Button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <Wrench className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No corrective actions found</p>
            <p className="text-sm">Create one to track fixes for failed inspections</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((action) => {
            const isOverdue = action.status !== "completed" && new Date(action.due_date) < now;
            return (
              <Card key={action.id} className={isOverdue ? "border-destructive/50" : ""}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link href={`/${company}/dashboard/assets/${action.asset_id}`} className="font-medium text-primary hover:underline">
                          {getAssetName(action.asset_id)}
                        </Link>
                        <Badge variant={action.severity === "critical" || action.severity === "high" ? "destructive" : action.severity === "medium" ? "warning" : "secondary"} className="capitalize">
                          {action.severity}
                        </Badge>
                        <Badge variant={action.status === "completed" ? "success" : action.status === "in_progress" ? "warning" : isOverdue ? "destructive" : "secondary"} className="capitalize">
                          {isOverdue && action.status !== "completed" ? "Overdue" : action.status.replace("_", " ")}
                        </Badge>
                      </div>
                      <p className="text-sm mt-1">{action.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>Assigned: {getUserName(action.assigned_to)}</span>
                        <span>Due: {formatDate(action.due_date)}</span>
                        <span>Created: {formatDate(action.created_at)}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {action.status !== "completed" && (
                        <Button size="sm" variant="outline" className="gap-1" onClick={() => handleCreateWorkOrder(action)}>
                          <ClipboardList className="h-4 w-4" />
                          {t("correctiveActions.buttons.createWo")}
                        </Button>
                      )}
                      {action.status === "open" && (
                        <Button size="sm" variant="outline" onClick={() => handleStatusChange(action.id, "in_progress")}>
                          {t("correctiveActions.buttons.start")}
                        </Button>
                      )}
                      {action.status === "in_progress" && (
                        <Button size="sm" onClick={() => handleStatusChange(action.id, "completed")}>
                          <CheckCircle className="h-4 w-4 mr-1" />
                          {t("correctiveActions.buttons.complete")}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t("correctiveActions.newAction")}</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setShowCreate(false)}><X className="h-4 w-4" /></Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>{t("correctiveActions.labels.asset")} *</Label>
                <Select value={form.asset_id} onValueChange={(v) => setForm((p) => ({ ...p, asset_id: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select asset" /></SelectTrigger>
                  <SelectContent>
                    {assets.filter((a) => a.status !== "retired").map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("correctiveActions.labels.description")} *</Label>
                <Textarea className="mt-1" placeholder={t("correctiveActions.placeholders.whatNeedsCorrected")} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>{t("correctiveActions.labels.severity")}</Label>
                  <Select value={form.severity} onValueChange={(v) => setForm((p) => ({ ...p, severity: v as Severity }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(["low", "medium", "high", "critical"] as Severity[]).map((s) => (
                        <SelectItem key={s} value={s}>{capitalize(s)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t("correctiveActions.labels.dueDate")} *</Label>
                  <Input type="date" className="mt-1" value={form.due_date} onChange={(e) => setForm((p) => ({ ...p, due_date: e.target.value }))} />
                </div>
              </div>
              <div>
                <Label>{t("correctiveActions.labels.assignTo")}</Label>
                <Select value={form.assigned_to} onValueChange={(v) => setForm((p) => ({ ...p, assigned_to: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select user" /></SelectTrigger>
                  <SelectContent>
                    {users.filter((u) => u.role !== "super_admin").map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.first_name} {u.last_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowCreate(false)}>{t("common.cancel")}</Button>
                <Button onClick={handleCreate} disabled={!form.asset_id || !form.description.trim() || !form.due_date}>
                  <Plus className="h-4 w-4 mr-1" /> {t("correctiveActions.buttons.create")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
