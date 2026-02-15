"use client";

import * as React from "react";
import Link from "next/link";
import { useCompanyParam } from "@/hooks/use-company-param";
import {
  Plus,
  ClipboardList,
  CheckCircle,
  Clock,
  Search,
  X,
  DollarSign,
  Package,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { KPICard } from "@/components/ui/kpi-card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWorkOrdersStore } from "@/stores/work-orders-store";
import { useCompanyData } from "@/hooks/use-company-data";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/components/ui/toast";
import { capitalize } from "@/lib/utils";
import type { WorkOrder, Priority } from "@/types";
import { useTranslation } from "@/i18n";

const STATUS_FLOW: Record<string, string[]> = {
  requested: ["approved", "cancelled"],
  approved: ["in_progress", "cancelled"],
  in_progress: ["completed"],
  completed: [],
  cancelled: [],
};

export default function WorkOrdersPage() {
  const { t, formatDate } = useTranslation();
  const company = useCompanyParam();
  const { user } = useAuth();
  const { toast } = useToast();
  const { items: orders, add, update , isLoading } = useWorkOrdersStore();
  const { assets, users, parts } = useCompanyData();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [showCreate, setShowCreate] = React.useState(false);
  const [expandedParts, setExpandedParts] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({
    title: "",
    description: "",
    asset_id: "",
    priority: "medium" as Priority,
    assigned_to: "",
    due_date: "",
    estimated_hours: "",
  });

  const filtered = orders.filter((o) => {
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const asset = o.asset_id ? assets.find((a) => a.id === o.asset_id) : null;
      return o.title.toLowerCase().includes(q) || o.description.toLowerCase().includes(q) || (asset?.name || "").toLowerCase().includes(q);
    }
    return true;
  });

  const openCount = orders.filter((o) => o.status === "requested" || o.status === "approved").length;
  const inProgressCount = orders.filter((o) => o.status === "in_progress").length;
  const completedCount = orders.filter((o) => o.status === "completed").length;
  const totalCost = orders.filter((o) => o.status === "completed").reduce((sum, o) => sum + (o.parts_cost || 0) + (o.labor_cost || 0), 0);

  const handleCreate = () => {
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
      assigned_to: form.assigned_to || null,
      due_date: form.due_date || null,
      estimated_hours: form.estimated_hours ? parseFloat(form.estimated_hours) : null,
      actual_hours: null,
      parts_cost: null,
      labor_cost: null,
      corrective_action_id: null,
      completed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    add(order);
    toast("Work order created");
    setShowCreate(false);
    setForm({ title: "", description: "", asset_id: "", priority: "medium", assigned_to: "", due_date: "", estimated_hours: "" });
  };

  const handleStatusChange = (id: string, newStatus: string) => {
    const updates: Partial<WorkOrder> = {
      status: newStatus as WorkOrder["status"],
      updated_at: new Date().toISOString(),
    };
    if (newStatus === "completed") {
      updates.completed_at = new Date().toISOString();
    }
    update(id, updates);
    toast(`Work order ${newStatus.replace("_", " ")}`);
  };

  // Toggle part usage on a work order (persisted to store)
  const handleTogglePart = (orderId: string, partId: string, isUsed: boolean) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;
    
    const currentParts = order.parts_used || [];
    let newParts;
    
    if (isUsed) {
      // Add part if not already present
      if (!currentParts.some((p) => p.part_id === partId)) {
        newParts = [...currentParts, { part_id: partId, quantity: 1 }];
      } else {
        return; // Already added
      }
    } else {
      // Remove part
      newParts = currentParts.filter((p) => p.part_id !== partId);
    }
    
    // Calculate parts cost
    const partsCost = newParts.reduce((sum, pu) => {
      const part = parts.find((p) => p.id === pu.part_id);
      return sum + (part?.unit_cost || 0) * pu.quantity;
    }, 0);
    
    update(orderId, {
      parts_used: newParts,
      parts_cost: partsCost,
      updated_at: new Date().toISOString(),
    });
  };

  const getAssetName = (id: string | null) => {
    if (!id) return "No asset";
    return assets.find((a) => a.id === id)?.name || "Unknown";
  };
  const getUserName = (id: string | null) => {
    if (!id) return "Unassigned";
    const u = users.find((usr) => usr.id === id);
    return u ? `${u.first_name} ${u.last_name}` : "Unknown";
  };

  const statusColors: Record<string, string> = {
    requested: "secondary",
    approved: "warning",
    in_progress: "warning",
    completed: "success",
    cancelled: "secondary",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Button size="sm" className="gap-2" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" />
          {t("workOrders.newWorkOrder")}
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <KPICard title="Open" value={openCount} icon={ClipboardList} />
        <KPICard title={t("workOrders.statuses.inProgress")} value={inProgressCount} icon={Clock} />
        <KPICard title={t("workOrders.statuses.completed")} value={completedCount} icon={CheckCircle} />
        <KPICard title={t("workOrders.labels.totalCost")} value={`$${totalCost.toLocaleString()}`} icon={DollarSign} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder={t("workOrders.placeholders.searchWorkOrders")} className="pl-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <div className="flex gap-2 flex-wrap">
          {["all", "requested", "approved", "in_progress", "completed"].map((s) => (
            <Button key={s} size="sm" variant={statusFilter === s ? "default" : "outline"} onClick={() => setStatusFilter(s)}>
              {s === "all" ? "All" : capitalize(s.replace("_", " "))}
            </Button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No work orders found</p>
            <p className="text-sm">Create one to track maintenance and repair work</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => (
            <Card key={order.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium">{order.title}</h3>
                      <Badge variant={order.priority === "critical" || order.priority === "high" ? "destructive" : order.priority === "medium" ? "warning" : "secondary"} className="capitalize">
                        {order.priority}
                      </Badge>
                      <Badge variant={statusColors[order.status] as "success" | "warning" | "secondary" | "destructive"} className="capitalize">
                        {order.status.replace("_", " ")}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{order.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                      {order.asset_id && (
                        <Link href={`/${company}/dashboard/assets/${order.asset_id}`} className="text-primary hover:underline">
                          {getAssetName(order.asset_id)}
                        </Link>
                      )}
                      <span>Assigned: {getUserName(order.assigned_to)}</span>
                      {order.due_date && <span>Due: {formatDate(order.due_date)}</span>}
                      {order.estimated_hours && <span>Est: {order.estimated_hours}h</span>}
                      <span>Created: {formatDate(order.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {STATUS_FLOW[order.status]?.map((next) => (
                      <Button key={next} size="sm" variant={next === "cancelled" ? "outline" : "default"} onClick={() => handleStatusChange(order.id, next)}>
                        {next === "approved" && t("workOrders.buttons.approve")}
                        {next === "in_progress" && t("workOrders.buttons.start")}
                        {next === "completed" && <><CheckCircle className="h-4 w-4 mr-1" />{t("workOrders.buttons.complete")}</>}
                        {next === "cancelled" && t("workOrders.buttons.cancel")}
                      </Button>
                    ))}
                  </div>
                </div>
                {/* Parts Used Section */}
                {parts.length > 0 && (
                  <div className="mt-3 border-t pt-3">
                    <button
                      className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                      onClick={() => setExpandedParts(expandedParts === order.id ? null : order.id)}
                    >
                      <Package className="h-3.5 w-3.5" />
                      {t("workOrders.labels.partsUsed")} ({order.parts_used?.length || 0})
                      {expandedParts === order.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>
                    {expandedParts === order.id && (
                      <div className="mt-2 space-y-1">
                        {parts.map((part) => {
                          const isUsed = order.parts_used?.some((pu) => pu.part_id === part.id) || false;
                          return (
                            <label key={part.id} className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={isUsed}
                                onChange={(e) => handleTogglePart(order.id, part.id, e.target.checked)}
                                className="rounded border"
                              />
                              <span>{part.name}</span>
                              <span className="text-muted-foreground">({part.part_number})</span>
                              <span className="text-muted-foreground ml-auto">${part.unit_cost.toFixed(2)} • Stock: {part.quantity_in_stock}</span>
                            </label>
                          );
                        })}
                        {order.parts_cost != null && order.parts_cost > 0 && (
                          <div className="pt-2 border-t mt-2 text-sm font-medium flex justify-between">
                            <span>Total Parts Cost:</span>
                            <span>${order.parts_cost.toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t("workOrders.newWorkOrder")}</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setShowCreate(false)}><X className="h-4 w-4" /></Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>{t("workOrders.labels.title")} *</Label>
                <Input className="mt-1" placeholder="Work order title" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
              </div>
              <div>
                <Label>{t("workOrders.labels.description")} *</Label>
                <Textarea className="mt-1" placeholder="Describe the work needed" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
              </div>
              <div>
                <Label>{t("workOrders.labels.asset")}</Label>
                <Select value={form.asset_id} onValueChange={(v) => setForm((p) => ({ ...p, asset_id: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select asset" /></SelectTrigger>
                  <SelectContent>
                    {assets.filter((a) => a.status !== "retired").map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>{t("workOrders.labels.priority")}</Label>
                  <Select value={form.priority} onValueChange={(v) => setForm((p) => ({ ...p, priority: v as Priority }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(["low", "medium", "high", "critical"] as Priority[]).map((p) => (
                        <SelectItem key={p} value={p}>{capitalize(p)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t("workOrders.labels.dueDate")}</Label>
                  <Input type="date" className="mt-1" value={form.due_date} onChange={(e) => setForm((p) => ({ ...p, due_date: e.target.value }))} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>{t("workOrders.labels.assignTo")}</Label>
                  <Select value={form.assigned_to} onValueChange={(v) => setForm((p) => ({ ...p, assigned_to: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select user" /></SelectTrigger>
                    <SelectContent>
                      {users.filter((u) => u.role !== "super_admin").map((u) => (
                        <SelectItem key={u.id} value={u.id}>{u.first_name} {u.last_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t("workOrders.labels.estimatedHours")}</Label>
                  <Input type="number" min="0" step="0.5" className="mt-1" placeholder="e.g. 2.5" value={form.estimated_hours} onChange={(e) => setForm((p) => ({ ...p, estimated_hours: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowCreate(false)}>{t("common.cancel")}</Button>
                <Button onClick={handleCreate} disabled={!form.title.trim() || !form.description.trim()}>
                  <Plus className="h-4 w-4 mr-1" /> {t("workOrders.buttons.create")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
