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
  DollarSign,
  ChevronLeft,
  ChevronRight,
  X,
  Download,
  Upload,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingPage } from "@/components/ui/loading";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { KPICard } from "@/components/ui/kpi-card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchFilterBar } from "@/components/ui/search-filter-bar";
import { SortableTh, sortData, type SortDirection } from "@/components/ui/sortable-th";
import { useFilterOptions } from "@/components/ui/filter-panel";
import { useCompanyData } from "@/hooks/use-company-data";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/components/ui/toast";
import { capitalize } from "@/lib/utils";
import { downloadCsv, parseCsv, downloadCsvTemplate } from "@/lib/csv";
import { getOverdueMaintenanceWorkOrders } from "@/lib/work-order-generator";
import { WORK_ORDER_TYPES } from "@/types";
import type { WorkOrder, WorkOrderType, Priority } from "@/types";

/* ── Work Order CSV import helpers ── */
const WO_COLUMN_ALIASES: Record<string, string> = {
  // Title
  "work_order_title": "title", "work order title": "title", "wo title": "title",
  "task_name": "title", "task name": "title", "name": "title", "subject": "title",
  // Description
  "work_order_description": "description", "work order description": "description",
  "details": "description", "notes": "description", "scope": "description",
  // Type
  "work_order_type": "type", "work order type": "type", "wo_type": "type",
  "maintenance_type": "type", "maintenance type": "type", "category": "type",
  // Priority
  "priority_level": "priority", "priority level": "priority", "urgency": "priority",
  // Status
  "work_order_status": "status", "work order status": "status", "wo_status": "status",
  // Asset
  "asset_name": "asset", "asset name": "asset", "equipment": "asset", "equipment_name": "asset",
  "machine": "asset", "machine_name": "asset",
  // Asset tag
  "asset_id": "asset_tag", "asset id": "asset_tag", "equipment_id": "asset_tag",
  // Due date
  "due_by": "due_date", "due by": "due_date", "target_date": "due_date", "target date": "due_date",
  "completion_date": "due_date", "completion date": "due_date", "deadline": "due_date",
  // Hours
  "est_hours": "estimated_hours", "estimated hours": "estimated_hours",
  "labor_hours": "estimated_hours", "labor hours": "estimated_hours",
  // Costs
  "material_cost": "parts_cost", "material cost": "parts_cost", "parts cost": "parts_cost",
  "labor_cost": "labor_cost", "labor cost": "labor_cost",
  // Assignee
  "assigned_to": "assigned_to", "assigned to": "assigned_to", "assignee": "assigned_to",
  "technician": "assigned_to", "worker": "assigned_to",
};

const WO_TYPE_ALIASES: Record<string, string> = {
  "preventive": "preventive_maintenance", "pm": "preventive_maintenance", "scheduled": "preventive_maintenance",
  "corrective": "corrective_maintenance", "cm": "corrective_maintenance", "repair": "corrective_maintenance",
  "breakdown": "corrective_maintenance", "fix": "corrective_maintenance", "reactive": "corrective_maintenance",
  "emergency": "emergency", "urgent": "emergency", "breakdown repair": "emergency",
  "inspection": "inspection", "check": "inspection", "audit": "inspection",
  "service": "service_request", "request": "service_request", "service request": "service_request",
};

const VALID_WO_TYPES = ["preventive_maintenance", "corrective_maintenance", "emergency", "inspection", "service_request"];
const VALID_PRIORITIES = ["low", "medium", "high", "critical"];

function mapWoImportColumns(data: { headers: string[]; rows: Record<string, string>[] }) {
  const headerMap: Record<string, string> = {};
  data.headers.forEach((h) => {
    const lower = h.toLowerCase().trim();
    headerMap[h] = WO_COLUMN_ALIASES[lower] || lower.replace(/\s+/g, "_");
  });

  const mappedRows = data.rows.map((row) => {
    const mapped: Record<string, string> = {};
    for (const [key, value] of Object.entries(row)) {
      mapped[headerMap[key] || key] = value;
    }
    if (mapped.type) {
      const lower = mapped.type.toLowerCase().trim();
      mapped.type = WO_TYPE_ALIASES[lower] || lower.replace(/\s+/g, "_");
    }
    if (mapped.priority) mapped.priority = mapped.priority.toLowerCase().trim();
    return mapped;
  });

  return { headers: data.headers.map((h) => headerMap[h]), rows: mappedRows };
}

function WoImportPreview({ importData, orders, assets: allAssets, user, add, toast, onBack, onDone }: {
  importData: { headers: string[]; rows: Record<string, string>[] };
  orders: WorkOrder[];
  assets: { id: string; name: string; asset_tag: string }[];
  user: { id: string; company_id: string } | null;
  add: (wo: WorkOrder) => void;
  toast: (msg: string, type?: "success" | "error" | "info") => void;
  onBack: () => void;
  onDone: () => void;
}) {
  const [rows, setRows] = React.useState(() => importData.rows.map((r) => ({ ...r })));

  const updateCell = (idx: number, field: string, value: string) => {
    setRows((prev) => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  };
  const removeRow = (idx: number) => {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  };

  const validated = rows.map((row, i) => {
    const errors: string[] = [];
    const warnings: string[] = [];
    if (!row.title?.trim()) errors.push("Missing title");
    if (row.type && !VALID_WO_TYPES.includes(row.type.toLowerCase().trim())) warnings.push("Unknown type");
    if (row.priority && !VALID_PRIORITIES.includes(row.priority.toLowerCase().trim())) warnings.push("Unknown priority");
    return { row, index: i, errors, warnings, valid: errors.length === 0 };
  });

  const validCount = validated.filter((v) => v.valid).length;
  const errorCount = validated.filter((v) => !v.valid).length;

  const handleImport = () => {
    const now = new Date();
    let imported = 0;
    validated.forEach((v) => {
      if (!v.valid) return;
      const row = v.row;
      const type = (VALID_WO_TYPES.includes((row.type || "").toLowerCase()) ? row.type.toLowerCase() : "service_request") as WorkOrderType;
      const priority = (VALID_PRIORITIES.includes((row.priority || "").toLowerCase()) ? row.priority.toLowerCase() : "medium") as Priority;
      // Try to match asset by name or tag
      const assetMatch = row.asset || row.asset_tag
        ? allAssets.find((a) =>
            (row.asset && a.name.toLowerCase() === row.asset.toLowerCase()) ||
            (row.asset_tag && a.asset_tag.toLowerCase() === row.asset_tag.toLowerCase())
          )
        : null;
      const wo: WorkOrder = {
        id: crypto.randomUUID(),
        company_id: user?.company_id || "",
        title: row.title.trim(),
        description: row.description || "",
        type,
        priority,
        status: "waiting_approval",
        asset_id: assetMatch?.id || null,
        location_id: null,
        requested_by: user?.id || "",
        assigned_to: null,
        assigned_to_team_id: null,
        due_date: row.due_date || null,
        estimated_hours: row.estimated_hours ? parseFloat(row.estimated_hours) : null,
        actual_hours: null,
        parts_cost: row.parts_cost ? parseFloat(row.parts_cost) : null,
        labor_cost: row.labor_cost ? parseFloat(row.labor_cost) : null,
        corrective_action_id: null,
        completed_at: null,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      };
      add(wo);
      imported++;
    });
    toast(`${imported} work orders imported${errorCount > 0 ? `, ${errorCount} skipped` : ""}`);
    onDone();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 text-sm">
        <span className="font-medium">{rows.length} rows</span>
        <Badge variant="success" className="text-[10px]">{validCount} valid</Badge>
        {errorCount > 0 && <Badge variant="destructive" className="text-[10px]">{errorCount} errors</Badge>}
      </div>
      <div className="max-h-72 overflow-auto rounded border text-xs">
        <table className="w-full">
          <thead>
            <tr className="bg-muted sticky top-0 z-10">
              <th className="px-1.5 py-1 text-left font-medium w-6">#</th>
              <th className="px-1.5 py-1 text-left font-medium">Title</th>
              <th className="px-1.5 py-1 text-left font-medium w-32">Type</th>
              <th className="px-1.5 py-1 text-left font-medium w-20">Priority</th>
              <th className="px-1.5 py-1 text-left font-medium w-16">Status</th>
              <th className="px-1.5 py-1 w-6"></th>
            </tr>
          </thead>
          <tbody>
            {validated.map((v) => (
              <tr key={v.index} className={`border-t ${!v.valid ? "bg-destructive/5" : ""}`}>
                <td className="px-1.5 py-1 text-muted-foreground">{v.index + 1}</td>
                <td className="px-1.5 py-1">
                  <input
                    className={`w-full bg-transparent border-0 outline-none text-xs ${!v.row.title?.trim() ? "border-b border-destructive" : ""}`}
                    value={v.row.title || ""}
                    onChange={(e) => updateCell(v.index, "title", e.target.value)}
                    placeholder="Required"
                  />
                </td>
                <td className="px-1.5 py-1">
                  <select
                    className="w-full bg-transparent border-0 outline-none text-xs"
                    value={VALID_WO_TYPES.includes((v.row.type || "").toLowerCase()) ? v.row.type.toLowerCase() : "service_request"}
                    onChange={(e) => updateCell(v.index, "type", e.target.value)}
                  >
                    {VALID_WO_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
                  </select>
                </td>
                <td className="px-1.5 py-1">
                  <select
                    className="w-full bg-transparent border-0 outline-none text-xs"
                    value={VALID_PRIORITIES.includes((v.row.priority || "").toLowerCase()) ? v.row.priority.toLowerCase() : "medium"}
                    onChange={(e) => updateCell(v.index, "priority", e.target.value)}
                  >
                    {VALID_PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </td>
                <td className="px-1.5 py-1">
                  {v.valid ? (
                    <span className="text-green-600 dark:text-green-400">Ready</span>
                  ) : (
                    <span className="text-destructive">{v.errors[0]}</span>
                  )}
                </td>
                <td className="px-1.5 py-1">
                  <button type="button" onClick={() => removeRow(v.index)} className="text-muted-foreground hover:text-destructive">×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onBack}>Back</Button>
        <Button className="flex-1" disabled={validCount === 0} onClick={handleImport}>
          Import {validCount} of {rows.length}
        </Button>
      </div>
    </div>
  );
}
import { useTranslation } from "@/i18n";
import { RoleGuard } from "@/components/auth/role-guard";
import { getProcedureTemplateIdForType, getProcedureTemplateForType } from "@/data/work-order-procedure-templates";

export default function WorkOrdersPage() {
  const { t, formatDate, formatNumber } = useTranslation();
  const company = useCompanyParam();
  const { user, hasPermission } = useAuth();
  const canCreate = hasPermission("work_orders.create");
  const { toast } = useToast();
  const filterOptions = useFilterOptions();
  const { workOrders: orders, teams, assets, locations, users, parts, checklistTemplates, stores } = useCompanyData();
  const { add, update, isLoading } = stores.workOrders;
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("");
  const [assignmentFilter, setAssignmentFilter] = React.useState("");
  const [showCreate, setShowCreate] = React.useState(false);
  const [showImport, setShowImport] = React.useState(false);
  const [importData, setImportData] = React.useState<{ headers: string[]; rows: Record<string, string>[] } | null>(null);
  const [expandedParts, setExpandedParts] = React.useState<string | null>(null);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [sortKey, setSortKey] = React.useState<string | null>(null);
  const [sortDir, setSortDir] = React.useState<SortDirection>(null);
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
    location_id: "",
    type: "service_request" as string,
    checklist_template_id: getProcedureTemplateIdForType("service_request"),
    priority: "medium" as Priority,
    assigned_to: "",
    assigned_to_team_id: "",
    due_date: "",
    estimated_hours: "",
  });

  const selectedProcedureTemplate = React.useMemo(
    () => getProcedureTemplateForType(form.type as WorkOrderType),
    [form.type],
  );

  const filtered = orders.filter((o) => {
    if (statusFilter && o.status !== statusFilter) return false;
    if (typeFilter && o.type !== typeFilter) return false;
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

  const sortedOrders = sortData(filtered, sortKey, sortDir);
  const totalPages = Math.ceil(sortedOrders.length / ITEMS_PER_PAGE);
  const paginatedOrders = sortedOrders.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const unassignedCount = orders.filter((o) => o.assigned_to === null && !o.assigned_to_team_id).length;
  const openCount = orders.filter((o) => o.status === "waiting_approval" || o.status === "waiting_material" || o.status === "approved").length;
  const scheduledCount = orders.filter((o) => o.status === "scheduled").length;
  const inProgressCount = orders.filter((o) => o.status === "in_progress").length;
  const completedCount = orders.filter((o) => o.status === "completed").length;
  const totalCost = orders.filter((o) => o.status === "completed").reduce((sum, o) => sum + (o.parts_cost || 0) + (o.labor_cost || 0), 0);
  const filters = [
    {
      id: "status",
      label: "All statuses",
      options: [
        ...filterOptions.ticketStatus
          .filter((option) =>
            ["in_progress"].includes(option.value),
          )
          .map((option) => ({
            value: option.value,
            label: option.label,
          })),
        { value: "waiting_approval", label: "Waiting approval" },
        { value: "waiting_material", label: "Waiting material" },
        { value: "approved", label: "Approved" },
        { value: "scheduled", label: "Scheduled" },
        { value: "completed", label: "Completed" },
        { value: "cancelled", label: "Cancelled" },
      ],
      value: statusFilter,
      onChange: (v: string) => {
        setStatusFilter(v);
        setCurrentPage(1);
      },
    },
    {
      id: "type",
      label: "All types",
      options: WORK_ORDER_TYPES.map((woType) => ({
        value: woType,
        label: formatStatusLabel(woType),
      })),
      value: typeFilter,
      onChange: (v: string) => {
        setTypeFilter(v);
        setCurrentPage(1);
      },
    },
    {
      id: "assignment",
      label: "All assignments",
      options: [
        { value: "unassigned", label: `Unassigned (${unassignedCount})` },
        { value: "assigned", label: "Assigned" },
      ],
      value: assignmentFilter,
      onChange: (v: string) => {
        setAssignmentFilter(v);
        setCurrentPage(1);
      },
    },
  ];

  const handleCreate = () => {
    if (!form.title.trim() || !form.description.trim()) return;
    const order: WorkOrder = {
      id: crypto.randomUUID(),
      company_id: user?.company_id || "",
      asset_id: form.asset_id || null,
      location_id: form.location_id || null,
      title: form.title.trim(),
      description: form.description.trim(),
      priority: form.priority,
      type: form.type as WorkOrder["type"],
      checklist_template_id: getProcedureTemplateIdForType(form.type as WorkOrderType),
      checklist_submission_id: null,
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
    setForm({
      title: "",
      description: "",
      asset_id: "",
      location_id: "",
      type: "service_request",
      checklist_template_id: getProcedureTemplateIdForType("service_request"),
      priority: "medium",
      assigned_to: "",
      assigned_to_team_id: "",
      due_date: "",
      estimated_hours: "",
    });
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold truncate">Work Orders</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowImport(true)}>
            <Upload className="h-4 w-4" />
            Import
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => {
              downloadCsv("work-orders.csv", filtered.map((o) => {
                const a = o.asset_id ? assets.find((item) => item.id === o.asset_id) : null;
                const loc = o.location_id ? locations.find((l) => l.id === o.location_id) : null;
                return {
                  reference: `WO-${o.id.substring(0, 8).toUpperCase()}`,
                  title: o.title,
                  description: o.description,
                  type: o.type,
                  priority: o.priority,
                  status: o.status,
                  asset: a?.name || "",
                  asset_tag: a?.asset_tag || "",
                  location: loc?.name || "",
                  assigned_to: getUserName(o.assigned_to),
                  assigned_team: getTeamName(o.assigned_to_team_id) || "",
                  due_date: o.due_date || "",
                  estimated_hours: o.estimated_hours ?? "",
                  actual_hours: o.actual_hours ?? "",
                  parts_cost: o.parts_cost ?? "",
                  labor_cost: o.labor_cost ?? "",
                  completed_at: o.completed_at || "",
                  declined_reason: o.declined_reason || "",
                  created_at: o.created_at,
                };
              }));
            }}
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
          {canCreate && (
          <Button size="sm" className="gap-2" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            {t("workOrders.newWorkOrder")}
          </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard title="Open" value={openCount} icon={ClipboardList} />
        <KPICard title={t("workOrders.statuses.inProgress")} value={inProgressCount} icon={Clock} />
        <KPICard title={t("workOrders.statuses.completed")} value={completedCount} icon={CheckCircle} />
        <KPICard title={t("workOrders.labels.totalCost")} value={`$${formatNumber(totalCost)}`} icon={DollarSign} />
      </div>

      <SearchFilterBar
        searchQuery={searchQuery}
        onSearchChange={(value) => {
          setSearchQuery(value);
          setCurrentPage(1);
        }}
        searchPlaceholder={t("workOrders.placeholders.searchWorkOrders")}
        filters={filters}
        showDateRange={false}
      />

      <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                {filtered.length} work order{filtered.length !== 1 ? "s" : ""}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages || 1}
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <SortableTh sortKey="title" currentSort={sortKey} currentDirection={sortDir} onSort={(k, d) => { setSortKey(k); setSortDir(d); }}>Title</SortableTh>
                    <SortableTh sortKey="type" currentSort={sortKey} currentDirection={sortDir} onSort={(k, d) => { setSortKey(k); setSortDir(d); }}>Type</SortableTh>
                    <th className="pb-3 font-medium">Asset</th>
                    <SortableTh sortKey="priority" currentSort={sortKey} currentDirection={sortDir} onSort={(k, d) => { setSortKey(k); setSortDir(d); }}>Priority</SortableTh>
                    <SortableTh sortKey="status" currentSort={sortKey} currentDirection={sortDir} onSort={(k, d) => { setSortKey(k); setSortDir(d); }}>Status</SortableTh>
                    <th className="hidden pb-3 font-medium md:table-cell">Assigned</th>
                    <SortableTh sortKey="due_date" currentSort={sortKey} currentDirection={sortDir} onSort={(k, d) => { setSortKey(k); setSortDir(d); }}>Due date</SortableTh>
                  </tr>
                </thead>
                <tbody>
                  {paginatedOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-muted-foreground">
                        No work orders match the current filters.
                      </td>
                    </tr>
                  ) : (
                    paginatedOrders.map((order) => (
                    <tr key={order.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                      <td className="py-3 font-medium">
                        <Link href={`/${company}/dashboard/work-orders/${order.id}`} className="text-primary hover:underline">
                          {order.title}
                        </Link>
                      </td>
                      <td className="py-3 text-muted-foreground">{capitalize((order.type || "service_request").replace(/_/g, " "))}</td>
                      <td className="py-3 text-muted-foreground">
                        {order.asset_id ? (
                          <Link href={`/${company}/dashboard/assets/${order.asset_id}`} className="text-primary hover:underline">
                            {getAssetName(order.asset_id)}
                          </Link>
                        ) : "—"}
                      </td>
                      <td className="py-3">
                        <Badge variant={order.priority === "critical" || order.priority === "high" ? "destructive" : order.priority === "medium" ? "warning" : "secondary"}>
                          {order.priority}
                        </Badge>
                      </td>
                      <td className="py-3">
                        <Badge variant={statusColors[order.status] as "success" | "warning" | "secondary" | "destructive"}>
                          {order.status.replace(/_/g, " ")}
                        </Badge>
                      </td>
                      <td className="hidden py-3 text-muted-foreground md:table-cell">
                        {getUserName(order.assigned_to) !== "Unassigned" ? getUserName(order.assigned_to) : getTeamName(order.assigned_to_team_id) || "Unassigned"}
                      </td>
                      <td className="py-3 text-muted-foreground">{order.due_date ? formatDate(order.due_date) : "—"}</td>
                    </tr>
                  )))}
                </tbody>
              </table>
            </div>
          </CardContent>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
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
        </Card>

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
                <Label>Location</Label>
                <Select value={form.location_id || "__none__"} onValueChange={(v) => setForm((p) => ({ ...p, location_id: v === "__none__" ? "" : v }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select location" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No location</SelectItem>
                    {locations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>{location.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("workOrders.labels.asset")}</Label>
                <Select
                  value={form.asset_id}
                  onValueChange={(v) =>
                    setForm((p) => {
                      const nextAsset = assets.find((a) => a.id === v) ?? null;
                      return {
                        ...p,
                        asset_id: v,
                        location_id: nextAsset?.location_id || p.location_id,
                      };
                    })
                  }
                >
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
                  <Select
                    value={form.type}
                    onValueChange={(v) =>
                      setForm((p) => ({
                        ...p,
                        type: v,
                        checklist_template_id: getProcedureTemplateIdForType(v as WorkOrderType),
                      }))
                    }
                    >
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {WORK_ORDER_TYPES.map((woType) => (
                        <SelectItem key={woType} value={woType}>{formatStatusLabel(woType)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="mt-1 text-xs text-muted-foreground">
                    The procedure checklist is auto-assigned based on the selected type.
                  </p>
                </div>
                <div>
                  <Label>Procedure checklist</Label>
                  <div className="mt-2 rounded-md border bg-muted/40 p-3">
                    <p className="text-sm font-medium">{selectedProcedureTemplate.name}</p>
                    {selectedProcedureTemplate.description && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {selectedProcedureTemplate.description}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {selectedProcedureTemplate.items.length} steps
                    </p>
                  </div>
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

      {/* Import modal */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => { setShowImport(false); setImportData(null); }}>
          <div className="relative w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto rounded-lg bg-background p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Import work orders</h2>
              <button onClick={() => { setShowImport(false); setImportData(null); }} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            {!importData ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Upload a CSV file to bulk-import work orders. Download the template first to see the required format.</p>
                <Button variant="outline" size="sm" className="gap-2" onClick={() => downloadCsvTemplate("work-order-import-template.csv", ["title", "description", "type", "priority", "asset", "asset_tag", "due_date", "estimated_hours", "parts_cost", "labor_cost", "assigned_to"])}>
                  <Download className="h-4 w-4" /> Download template
                </Button>
                <label className="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 cursor-pointer hover:bg-muted/50 transition-colors">
                  <input type="file" accept=".csv,.txt" className="hidden" onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const data = await parseCsv(file);
                      if (data.rows.length === 0) { toast("File is empty", "error"); return; }
                      const mapped = mapWoImportColumns(data);
                      setImportData(mapped);
                    } catch {
                      toast("Failed to parse CSV file", "error");
                    }
                    e.target.value = "";
                  }} />
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Choose CSV file</span>
                </label>
              </div>
            ) : (
              <WoImportPreview
                importData={importData}
                orders={orders}
                assets={assets}
                user={user}
                add={add}
                toast={toast}
                onBack={() => setImportData(null)}
                onDone={() => { setShowImport(false); setImportData(null); }}
              />
            )}
          </div>
        </div>
      )}
    </div>
    </RoleGuard>
  );
}
