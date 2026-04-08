"use client";

import * as React from "react";
import Link from "next/link";
import { WORK_ORDER_STATUS_COLORS, getAssetDisplayName, getUserFirstLastName } from "@/lib/status-utils";
import { formatStatusLabel } from "@/components/tasks/task-detail-header";
import { PAGINATION, LIMITS } from "@/lib/constants";
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
  ChevronLeft,
  ChevronRight,
  UserX,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingPage } from "@/components/ui/loading";
import { NoDataEmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { KPICard } from "@/components/ui/kpi-card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCompanyData } from "@/hooks/use-company-data";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/components/ui/toast";
import { capitalize } from "@/lib/utils";
import { getOverdueMaintenanceWorkOrders } from "@/lib/work-order-generator";
import { WORK_ORDER_TYPES } from "@/types";
import type { WorkOrder, WorkOrderType, Priority } from "@/types";
import { useTranslation } from "@/i18n";
import { RoleGuard } from "@/components/auth/role-guard";

const STATUS_FLOW: Record<string, string[]> = {
  waiting_approval: ["waiting_material", "approved", "cancelled"],
  waiting_material: ["approved", "cancelled"],
  approved: ["scheduled", "in_progress", "cancelled"],
  scheduled: ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export default function WorkOrdersPage() {
  const { t, formatDate, formatNumber } = useTranslation();
  const company = useCompanyParam();
  const { user } = useAuth();
  const { toast } = useToast();
  const { workOrders: orders, teams, assets, users, parts, stores } = useCompanyData();
  const { add, update, isLoading } = stores.workOrders;
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [typeFilter, setTypeFilter] = React.useState("all");
  const [assignmentFilter, setAssignmentFilter] = React.useState<"all" | "unassigned" | "assigned">("all");
  const [showCreate, setShowCreate] = React.useState(false);
  const [expandedParts, setExpandedParts] = React.useState<string | null>(null);
  const [currentPage, setCurrentPage] = React.useState(1);
  const ITEMS_PER_PAGE = PAGINATION.WORK_ORDERS_PAGE_SIZE;

  // Auto-create work orders for overdue maintenance (runs once per session)
  const overdueCheckRan = React.useRef(false);
  React.useEffect(() => {
    if (overdueCheckRan.current || isLoading) return;
    overdueCheckRan.current = true;
    const newOrders = getOverdueMaintenanceWorkOrders({
      assets,
      existingWorkOrders: orders,
    });
    // Deduplicate: only create if not already in the current orders list
    const existingIds = new Set(orders.map((o) => o.asset_id));
    const dedupedOrders = newOrders.filter((wo) => !existingIds.has(wo.asset_id));
    if (dedupedOrders.length > 0) {
      dedupedOrders.forEach((wo) => add(wo));
      toast(`Created ${dedupedOrders.length} work order${dedupedOrders.length > 1 ? "s" : ""} for overdue maintenance`);
    }
  }, [isLoading, assets, orders, add, toast]);
  const [form, setForm] = React.useState({
    title: "",
    description: "",
    asset_id: "",
    type: "service_request" as string,
    priority: "medium" as Priority,
    assigned_to: "",
    assigned_to_team_id: "",
    due_date: "",
    estimated_hours: "",
  });

  const filtered = orders.filter((o) => {
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    if (typeFilter !== "all" && o.type !== typeFilter) return false;
    if (assignmentFilter === "unassigned" && (o.assigned_to !== null || o.assigned_to_team_id)) return false;
    if (assignmentFilter === "assigned" && o.assigned_to === null && !o.assigned_to_team_id) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const asset = o.asset_id ? assets.find((a) => a.id === o.asset_id) : null;
      return o.title.toLowerCase().includes(q) || o.description.toLowerCase().includes(q) || (asset?.name || "").toLowerCase().includes(q);
    }
    return true;
  });

  React.useEffect(() => { setCurrentPage(1); }, [searchQuery, statusFilter, typeFilter, assignmentFilter]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedOrders = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const unassignedCount = orders.filter((o) => o.assigned_to === null && !o.assigned_to_team_id).length;
  const openCount = orders.filter((o) => o.status === "waiting_approval" || o.status === "waiting_material" || o.status === "approved").length;
  const scheduledCount = orders.filter((o) => o.status === "scheduled").length;
  const inProgressCount = orders.filter((o) => o.status === "in_progress").length;
  const completedCount = orders.filter((o) => o.status === "completed").length;
  const totalCost = orders.filter((o) => o.status === "completed").reduce((sum, o) => sum + (o.parts_cost || 0) + (o.labor_cost || 0), 0);

  const handleCreate = () => {
    if (!form.title.trim() || !form.description.trim()) return;
    const order: WorkOrder = {
      id: crypto.randomUUID(),
      company_id: user?.company_id || "",
      asset_id: form.asset_id || null,
      title: form.title.trim(),
      description: form.description.trim(),
      priority: form.priority,
      type: form.type as WorkOrder["type"],
      status: "waiting_approval" as const,
      requested_by: user?.id || "",
      assigned_to: form.assigned_to || null,
      assigned_to_team_id: form.assigned_to_team_id || null,
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
    setForm({ title: "", description: "", asset_id: "", type: "service_request", priority: "medium", assigned_to: "", assigned_to_team_id: "", due_date: "", estimated_hours: "" });
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

  const getAssetName = (id: string | null) => getAssetDisplayName(id, assets, "No asset");
  const getUserName = (id: string | null) => getUserFirstLastName(id, users, "Unassigned");
  const getTeamName = (id: string | null | undefined) => teams.find((team) => team.id === id)?.name ?? null;

  const statusColors = WORK_ORDER_STATUS_COLORS;

  if (isLoading && orders.length === 0) {
    return <LoadingPage />;
  }

  return (
    <RoleGuard requiredPermission="work_orders.view">
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
        <KPICard title={t("workOrders.labels.totalCost")} value={`$${formatNumber(totalCost)}`} icon={DollarSign} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder={t("workOrders.placeholders.searchWorkOrders")} className="pl-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <div className="flex gap-2 flex-wrap">
          {["all", "waiting_approval", "waiting_material", "approved", "scheduled", "in_progress", "completed", "cancelled"].map((s) => (
            <Button key={s} size="sm" variant={statusFilter === s ? "default" : "outline"} onClick={() => setStatusFilter(s)}>
              {s === "all" ? "All" : formatStatusLabel(s)}
            </Button>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px] h-8 text-xs">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {WORK_ORDER_TYPES.map((woType) => (
                <SelectItem key={woType} value={woType}>{formatStatusLabel(woType)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2 flex-wrap">
          {(["all", "unassigned", "assigned"] as const).map((val) => (
            <Button
              key={val}
              size="sm"
              variant={assignmentFilter === val ? "default" : "outline"}
              onClick={() => setAssignmentFilter(val)}
              className="gap-1.5"
            >
              {val === "unassigned" && <UserX className="h-3.5 w-3.5" />}
              {val === "all" ? "All assignments" : capitalize(val)}
              {val === "unassigned" && ` (${unassignedCount})`}
            </Button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <NoDataEmptyState
          entityName="work orders"
          onAdd={() => setShowCreate(true)}
          addLabel={t("workOrders.newWorkOrder")}
        />
      ) : (
        <div className="space-y-3">
          {paginatedOrders.map((order) => (
            <Card key={order.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link href={`/${company}/dashboard/work-orders/${order.id}`} className="font-medium hover:underline text-primary">
                        {order.title}
                      </Link>
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
                      <span>Assigned: {getUserName(order.assigned_to) !== "Unassigned" ? getUserName(order.assigned_to) : getTeamName(order.assigned_to_team_id) || "Unassigned"}</span>
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

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t mt-4">
          <p className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length}
          </p>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {(() => {
              const pages: (number | "...")[] = totalPages <= 7
                ? Array.from({ length: totalPages }, (_, i) => i + 1)
                : (() => {
                    const p: (number | "...")[] = [1];
                    if (currentPage > 3) p.push("...");
                    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) p.push(i);
                    if (currentPage < totalPages - 2) p.push("...");
                    p.push(totalPages);
                    return p;
                  })();
              return pages.map((p, idx) =>
                p === "..." ? (
                  <span key={`ellipsis-${idx}`} className="px-2 text-sm text-muted-foreground">…</span>
                ) : (
                  <Button key={p} variant={currentPage === p ? "default" : "outline"} size="sm" onClick={() => setCurrentPage(p as number)}>
                    {p}
                  </Button>
                )
              );
            })()}
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t("workOrders.newWorkOrder")}</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setShowCreate(false)} aria-label="Close"><X className="h-4 w-4" /></Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-muted-foreground">
                Work orders are for repair, maintenance, and asset service execution. Use tickets for investigation follow-up and corrective actions for remediation tracking.
              </div>
              <div>
                <Label>{t("workOrders.labels.title")} *</Label>
                <Input className="mt-1" placeholder={t("workOrders.placeholders.title")} value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} maxLength={200} />
              </div>
              <div>
                <Label>{t("workOrders.labels.description")} *</Label>
                <Textarea className="mt-1" placeholder={t("workOrders.placeholders.description")} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} maxLength={LIMITS.MAX_DESCRIPTION_LENGTH} />
                <p className="text-xs text-muted-foreground text-right mt-1">{form.description.length}/{LIMITS.MAX_DESCRIPTION_LENGTH}</p>
              </div>
              <div>
                <Label>{t("workOrders.labels.asset")}</Label>
                <Select value={form.asset_id} onValueChange={(v) => setForm((p) => ({ ...p, asset_id: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder={t("workOrders.placeholders.selectAsset")} /></SelectTrigger>
                  <SelectContent>
                    {assets.filter((a) => a.status !== "retired").map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Type</Label>
                  <Select value={form.type} onValueChange={(v) => setForm((p) => ({ ...p, type: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {WORK_ORDER_TYPES.map((woType) => (
                        <SelectItem key={woType} value={woType}>{formatStatusLabel(woType)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
                    <SelectTrigger className="mt-1"><SelectValue placeholder={t("workOrders.placeholders.selectUser")} /></SelectTrigger>
                    <SelectContent>
                      {users.filter((u) => u.role !== "super_admin").map((u) => (
                        <SelectItem key={u.id} value={u.id}>{u.first_name} {u.last_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Assign team</Label>
                  <Select value={form.assigned_to_team_id || "__none__"} onValueChange={(v) => setForm((p) => ({ ...p, assigned_to_team_id: v === "__none__" ? "" : v }))}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="No team" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No team</SelectItem>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>{t("workOrders.labels.estimatedHours")}</Label>
                  <Input type="number" min="0" step="0.5" className="mt-1" placeholder={t("workOrders.placeholders.estimatedHours")} value={form.estimated_hours} onChange={(e) => setForm((p) => ({ ...p, estimated_hours: e.target.value }))} />
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
    </RoleGuard>
  );
}
