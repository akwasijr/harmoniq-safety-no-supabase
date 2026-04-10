"use client";

import * as React from "react";
import {
  Plus,
  FileKey,
  Clock,
  AlertTriangle,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  X,
  Trash2,
  CheckCircle,
  List,
  History,
  Zap,
  Ban,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KPICard } from "@/components/ui/kpi-card";
import { SortableTh, sortData, type SortDirection } from "@/components/ui/sortable-th";
import { SearchFilterBar } from "@/components/ui/search-filter-bar";
import { useCompanyData } from "@/hooks/use-company-data";
import { LoadingPage } from "@/components/ui/loading";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "@/i18n";
import { RoleGuard } from "@/components/auth/role-guard";
import { PAGINATION } from "@/lib/constants";
import { getUserDisplayName } from "@/lib/status-utils";
import type { PermitToWork, PermitType, PermitStatus } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ITEMS_PER_PAGE = PAGINATION.DEFAULT_PAGE_SIZE;

type SubTab = "active" | "all" | "history";

const PERMIT_TYPE_LABELS: Record<PermitType, string> = {
  hot_work: "permits.hotWork",
  confined_space: "permits.confinedSpace",
  working_at_height: "permits.workingAtHeight",
  electrical_isolation: "permits.electricalIsolation",
  excavation: "permits.excavation",
  other: "permits.other",
};

const PERMIT_STATUS_BADGE: Record<PermitStatus, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
  draft: { variant: "secondary", label: "Draft" },
  pending_approval: { variant: "outline", label: "permits.pendingApproval" },
  approved: { variant: "default", label: "Approved" },
  active: { variant: "default", label: "Active" },
  expired: { variant: "destructive", label: "Expired" },
  cancelled: { variant: "secondary", label: "Cancelled" },
  closed: { variant: "secondary", label: "Closed" },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function computePermitStatus(permit: PermitToWork): PermitStatus {
  if (permit.status === "cancelled" || permit.status === "closed") return permit.status;
  const now = new Date();
  const start = new Date(permit.start_time);
  const end = new Date(permit.end_time);
  if (permit.status === "approved" && start <= now && end > now) return "active";
  if ((permit.status === "approved" || permit.status === "active") && end <= now) return "expired";
  return permit.status;
}

function formatTimeRemaining(endTime: string): string {
  const now = new Date();
  const end = new Date(endTime);
  const diff = end.getTime() - now.getTime();
  if (diff <= 0) return "Expired";
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h remaining`;
  }
  return `${hours}h ${minutes}m remaining`;
}

function generatePermitNumber(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const seq = String(Math.floor(Math.random() * 9999) + 1).padStart(4, "0");
  return `PTW-${y}${m}-${seq}`;
}

// ---------------------------------------------------------------------------
// Pagination component
// ---------------------------------------------------------------------------

function Pagination({
  currentPage,
  totalPages,
  totalItems,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between pt-4 border-t mt-4">
      <p className="text-sm text-muted-foreground">
        Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{" "}
        {Math.min(currentPage * ITEMS_PER_PAGE, totalItems)} of {totalItems}
      </p>
      <div className="flex gap-1">
        <Button variant="outline" size="sm" onClick={() => onPageChange(Math.max(1, currentPage - 1))} disabled={currentPage === 1}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {(() => {
          const pages: (number | "...")[] =
            totalPages <= 7
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
              <Button key={p} variant={currentPage === p ? "default" : "outline"} size="sm" onClick={() => onPageChange(p as number)}>
                {p}
              </Button>
            ),
          );
        })()}
        <Button variant="outline" size="sm" onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function PermitsPage() {
  const { user } = useAuth();
  const { t, formatDate } = useTranslation();
  const { toast } = useToast();
  const {
    users,
    locations,
    permits,
    stores,
    companyId,
  } = useCompanyData();

  const permitsStore = stores.permits;

  // ── Enrich permits with computed status ──
  const permitsWithStatus = React.useMemo(
    () =>
      permits.map((p) => ({
        ...p,
        _status: computePermitStatus(p),
      })),
    [permits],
  );

  // ── Tab / page state ──
  const [activeTab, setActiveTab] = React.useState<SubTab>("active");
  const [currentPage, setCurrentPage] = React.useState(1);

  // ── Filters ──
  const [searchQuery, setSearchQuery] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");

  // ── Sort ──
  const [sortKey, setSortKey] = React.useState<string | null>(null);
  const [sortDir, setSortDir] = React.useState<SortDirection>(null);

  // ── Modals ──
  const [showCreatePermit, setShowCreatePermit] = React.useState(false);

  // Reset page on filter/tab changes
  React.useEffect(() => { setCurrentPage(1); }, [searchQuery, typeFilter, statusFilter, activeTab]);

  // ── Location map ──
  const locationMap = React.useMemo(() => {
    const m = new Map<string, string>();
    locations.forEach((l) => m.set(l.id, l.name));
    return m;
  }, [locations]);

  // ── KPI computations ──
  const kpis = React.useMemo(() => {
    const active = permitsWithStatus.filter((p) => p._status === "active").length;
    const pendingApproval = permitsWithStatus.filter((p) => p._status === "pending_approval").length;

    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const expiringToday = permitsWithStatus.filter((p) => {
      if (p._status !== "active" && p._status !== "approved") return false;
      const end = new Date(p.end_time);
      return end >= todayStart && end <= today;
    }).length;

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const totalThisMonth = permitsWithStatus.filter((p) => new Date(p.created_at) >= monthStart).length;

    return { active, pendingApproval, expiringToday, totalThisMonth };
  }, [permitsWithStatus]);

  // ── Active permits (for active tab) ──
  const activePermits = React.useMemo(
    () => permitsWithStatus.filter((p) => p._status === "active" || p._status === "approved" || p._status === "pending_approval"),
    [permitsWithStatus],
  );

  // ── History permits ──
  const historyPermits = React.useMemo(
    () => permitsWithStatus.filter((p) => p._status === "expired" || p._status === "closed" || p._status === "cancelled"),
    [permitsWithStatus],
  );

  // ── Pick data source for current tab ──
  const currentDataSource = React.useMemo(() => {
    if (activeTab === "active") return activePermits;
    if (activeTab === "history") return historyPermits;
    return permitsWithStatus;
  }, [activeTab, activePermits, historyPermits, permitsWithStatus]);

  // ── Filtering ──
  const filteredPermits = React.useMemo(() => {
    let data = currentDataSource;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      data = data.filter((p) =>
        p.permit_number.toLowerCase().includes(q) ||
        p.title.toLowerCase().includes(q) ||
        (p.description ?? "").toLowerCase().includes(q) ||
        getUserDisplayName(p.requested_by, users, "").toLowerCase().includes(q),
      );
    }
    if (typeFilter) data = data.filter((p) => p.type === typeFilter);
    if (statusFilter) data = data.filter((p) => p._status === statusFilter);
    return data;
  }, [currentDataSource, searchQuery, typeFilter, statusFilter, users]);

  const sortedPermits = React.useMemo(
    () =>
      sortData(filteredPermits, sortKey, sortDir, (item, key) => {
        if (key === "permit_number") return item.permit_number;
        if (key === "title") return item.title;
        if (key === "type") return item.type;
        if (key === "location") return locationMap.get(item.location_id ?? "") ?? "";
        if (key === "start_time") return item.start_time;
        if (key === "end_time") return item.end_time;
        if (key === "status") return item._status;
        if (key === "requested_by") return getUserDisplayName(item.requested_by, users, "");
        if (key === "approved_by") return getUserDisplayName(item.approved_by, users, "");
        return (item as Record<string, unknown>)[key] as string;
      }),
    [filteredPermits, sortKey, sortDir, users, locationMap],
  );

  const totalPages = Math.ceil(sortedPermits.length / ITEMS_PER_PAGE);
  const pageData = sortedPermits.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // ── Sort handler ──
  const handleSort = React.useCallback((key: string, dir: SortDirection) => {
    setSortKey(dir ? key : null);
    setSortDir(dir);
  }, []);

  // ── Filters for SearchFilterBar ──
  const filters = React.useMemo(
    () => [
      {
        id: "type",
        label: "Type",
        options: Object.entries(PERMIT_TYPE_LABELS).map(([value, key]) => ({ value, label: t(key) })),
        value: typeFilter,
        onChange: setTypeFilter,
      },
      {
        id: "status",
        label: "Status",
        options: Object.entries(PERMIT_STATUS_BADGE).map(([value, { label }]) => ({ value, label: t(label) })),
        value: statusFilter,
        onChange: setStatusFilter,
      },
    ],
    [typeFilter, statusFilter, t],
  );

  // ── Create Permit form ──
  const [permitForm, setPermitForm] = React.useState({
    type: "" as PermitType | "",
    title: "",
    description: "",
    location_id: "",
    start_time: "",
    end_time: "",
    precautions: "",
    workers: [] as string[],
    notes: "",
  });

  const resetPermitForm = React.useCallback(() => {
    setPermitForm({
      type: "",
      title: "",
      description: "",
      location_id: "",
      start_time: "",
      end_time: "",
      precautions: "",
      workers: [],
      notes: "",
    });
  }, []);

  const handleSavePermit = React.useCallback(() => {
    if (!permitForm.type || !permitForm.title || !permitForm.start_time || !permitForm.end_time) return;
    const now = new Date().toISOString();

    const newPermit: PermitToWork = {
      id: crypto.randomUUID(),
      company_id: companyId ?? "",
      permit_number: generatePermitNumber(),
      type: permitForm.type as PermitType,
      title: permitForm.title,
      description: permitForm.description || null,
      location_id: permitForm.location_id || null,
      asset_id: null,
      requested_by: user?.id ?? "",
      approved_by: null,
      approved_at: null,
      start_time: new Date(permitForm.start_time).toISOString(),
      end_time: new Date(permitForm.end_time).toISOString(),
      status: "pending_approval",
      precautions: permitForm.precautions ? permitForm.precautions.split("\n").map((s) => s.trim()).filter(Boolean) : [],
      isolation_refs: [],
      workers: permitForm.workers,
      notes: permitForm.notes || null,
      closed_by: null,
      closed_at: null,
      created_at: now,
      updated_at: now,
    };

    permitsStore.add(newPermit);
    toast("Permit created");
    resetPermitForm();
    setShowCreatePermit(false);
  }, [permitForm, companyId, user, permitsStore, toast, resetPermitForm]);

  // ── Approve permit ──
  const handleApprove = React.useCallback(
    (permit: PermitToWork) => {
      const now = new Date().toISOString();
      permitsStore.update(permit.id, {
        ...permit,
        status: "approved",
        approved_by: user?.id ?? null,
        approved_at: now,
        updated_at: now,
      });
      toast("Permit approved");
    },
    [permitsStore, user, toast],
  );

  // ── Close permit ──
  const handleClose = React.useCallback(
    (permit: PermitToWork) => {
      const now = new Date().toISOString();
      permitsStore.update(permit.id, {
        ...permit,
        status: "closed",
        closed_by: user?.id ?? null,
        closed_at: now,
        updated_at: now,
      });
      toast("Permit closed");
    },
    [permitsStore, user, toast],
  );

  // ── Cancel permit ──
  const handleCancel = React.useCallback(
    (permit: PermitToWork) => {
      const now = new Date().toISOString();
      permitsStore.update(permit.id, {
        ...permit,
        status: "cancelled",
        updated_at: now,
      });
      toast("Permit cancelled");
    },
    [permitsStore, toast],
  );

  // ── Delete permit ──
  const handleDelete = React.useCallback(
    (id: string) => {
      permitsStore.remove(id);
      toast("Permit removed");
    },
    [permitsStore, toast],
  );

  // ── Worker toggle ──
  const toggleWorker = React.useCallback((userId: string) => {
    setPermitForm((prev) => ({
      ...prev,
      workers: prev.workers.includes(userId)
        ? prev.workers.filter((id) => id !== userId)
        : [...prev.workers, userId],
    }));
  }, []);

  // ── Loading ──
  if (permitsStore.isLoading) {
    return <LoadingPage />;
  }

  // ── Render ──
  return (
    <RoleGuard allowedRoles={["company_admin", "manager", "super_admin"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{t("permits.title")}</h1>
            <p className="text-sm text-muted-foreground">Manage work permits, approvals, and compliance</p>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="gap-2"
              onClick={() => {
                resetPermitForm();
                setShowCreatePermit(true);
              }}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              {t("permits.createPermit")}
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KPICard title={t("permits.activePermits")} value={kpis.active} icon={FileKey} description={t("permits.currentlyActive")} />
          <KPICard
            title={t("permits.pendingApproval")}
            value={kpis.pendingApproval}
            icon={Clock}
            className={kpis.pendingApproval > 0 ? "border-amber-500/50" : undefined}
            description={t("permits.awaitingReview")}
          />
          <KPICard
            title={t("permits.expiringToday")}
            value={kpis.expiringToday}
            icon={AlertTriangle}
            className={kpis.expiringToday > 0 ? "border-destructive/50" : undefined}
            description={t("permits.expiresByEndOfDay")}
          />
          <KPICard title={t("permits.totalThisMonth")} value={kpis.totalThisMonth} icon={ShieldCheck} description={t("permits.permitsCreated")} />
        </div>

        {/* Sub Tabs */}
        <div className="border-b">
          <div className="flex gap-4">
            {([
              { key: "active" as const, label: t("permits.activePermits"), icon: Zap },
              { key: "all" as const, label: t("permits.allPermits"), icon: List },
              { key: "history" as const, label: t("permits.history"), icon: History },
            ] as const).map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "flex items-center gap-2 py-3 px-1 text-sm font-medium transition-colors relative",
                    activeTab === tab.key ? "text-primary" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  <span>{tab.label}</span>
                  {activeTab === tab.key && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Search & Filter */}
        <SearchFilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search by permit number, title..."
          filters={filters}
          showDateRange={false}
        />

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {activeTab === "active" ? t("permits.activePermits") : activeTab === "history" ? t("permits.history") : t("permits.allPermits")} ({filteredPermits.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b">
                    <SortableTh sortKey="permit_number" currentSort={sortKey} currentDirection={sortDir} onSort={handleSort}>{t("permits.permitNumber")}</SortableTh>
                    <SortableTh sortKey="type" currentSort={sortKey} currentDirection={sortDir} onSort={handleSort}>{t("permits.type")}</SortableTh>
                    <SortableTh sortKey="title" currentSort={sortKey} currentDirection={sortDir} onSort={handleSort}>Title</SortableTh>
                    <SortableTh sortKey="location" currentSort={sortKey} currentDirection={sortDir} onSort={handleSort}>{t("permits.location")}</SortableTh>
                    <SortableTh sortKey="start_time" currentSort={sortKey} currentDirection={sortDir} onSort={handleSort}>{t("permits.startTime")}</SortableTh>
                    <SortableTh sortKey="end_time" currentSort={sortKey} currentDirection={sortDir} onSort={handleSort}>{t("permits.endTime")}</SortableTh>
                    <SortableTh sortKey="status" currentSort={sortKey} currentDirection={sortDir} onSort={handleSort}>Status</SortableTh>
                    <SortableTh sortKey="approved_by" currentSort={sortKey} currentDirection={sortDir} onSort={handleSort}>{t("permits.approvedBy")}</SortableTh>
                    <th className="pb-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {pageData.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-muted-foreground">
                        No permits found
                      </td>
                    </tr>
                  ) : (
                    pageData.map((p) => {
                      const badge = PERMIT_STATUS_BADGE[p._status] ?? PERMIT_STATUS_BADGE.draft;
                      return (
                        <tr key={p.id} className="hover:bg-muted/50 transition-colors">
                          <td className="py-3 pr-4 font-mono text-xs">{p.permit_number}</td>
                          <td className="py-3 pr-4">
                            <Badge variant="secondary">{t(PERMIT_TYPE_LABELS[p.type])}</Badge>
                          </td>
                          <td className="py-3 pr-4">
                            <div>
                              <p className="font-medium">{p.title}</p>
                              {p._status === "active" && (
                                <p className="text-xs text-muted-foreground">{formatTimeRemaining(p.end_time)}</p>
                              )}
                            </div>
                          </td>
                          <td className="py-3 pr-4 text-muted-foreground">{locationMap.get(p.location_id ?? "") ?? "—"}</td>
                          <td className="py-3 pr-4 text-muted-foreground">{formatDate(p.start_time)}</td>
                          <td className="py-3 pr-4 text-muted-foreground">{formatDate(p.end_time)}</td>
                          <td className="py-3 pr-4">
                            <Badge variant={badge.variant}>{t(badge.label)}</Badge>
                          </td>
                          <td className="py-3 pr-4 text-muted-foreground">{getUserDisplayName(p.approved_by, users)}</td>
                          <td className="py-3 text-right">
                            <div className="flex justify-end gap-1">
                              {p._status === "pending_approval" && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-green-600 hover:text-green-700"
                                  onClick={() => handleApprove(p)}
                                  title="Approve permit"
                                >
                                  <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" />
                                  <span className="sr-only">{t("permits.approve")}</span>
                                </Button>
                              )}
                              {(p._status === "active" || p._status === "approved") && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-blue-600 hover:text-blue-700"
                                  onClick={() => handleClose(p)}
                                  title="Close permit"
                                >
                                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                                  <span className="sr-only">{t("permits.close")}</span>
                                </Button>
                              )}
                              {(p._status === "draft" || p._status === "pending_approval") && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-amber-600 hover:text-amber-700"
                                  onClick={() => handleCancel(p)}
                                  title="Cancel permit"
                                >
                                  <Ban className="h-3.5 w-3.5" aria-hidden="true" />
                                  <span className="sr-only">{t("permits.cancel")}</span>
                                </Button>
                              )}
                              {(p._status === "draft" || p._status === "cancelled") && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => handleDelete(p.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                                  <span className="sr-only">Delete</span>
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={filteredPermits.length} onPageChange={setCurrentPage} />
          </CardContent>
        </Card>

        {/* ================================================================ */}
        {/* Create Permit Modal                                              */}
        {/* ================================================================ */}
        {showCreatePermit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => { setShowCreatePermit(false); resetPermitForm(); }}>
            <div
              className="relative z-50 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto rounded-lg bg-background p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold">{t("permits.createPermit")}</h2>
                  <p className="text-sm text-muted-foreground">Submit a new permit request for approval</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => { setShowCreatePermit(false); resetPermitForm(); }}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="space-y-4">
                {/* Type */}
                <div>
                  <Label htmlFor="permit-type">Permit Type *</Label>
                  <select
                    id="permit-type"
                    aria-label="Select permit type"
                    value={permitForm.type}
                    onChange={(e) => setPermitForm((f) => ({ ...f, type: e.target.value as PermitType }))}
                    className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select type...</option>
                    {Object.entries(PERMIT_TYPE_LABELS).map(([value, key]) => (
                      <option key={value} value={value}>{t(key)}</option>
                    ))}
                  </select>
                </div>

                {/* Title */}
                <div>
                  <Label htmlFor="permit-title">Title *</Label>
                  <Input
                    id="permit-title"
                    value={permitForm.title}
                    onChange={(e) => setPermitForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. Welding work on roof structure"
                    className="mt-1"
                  />
                </div>

                {/* Description */}
                <div>
                  <Label htmlFor="permit-desc">Description</Label>
                  <Textarea
                    id="permit-desc"
                    value={permitForm.description}
                    onChange={(e) => setPermitForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Describe the work to be performed..."
                    rows={3}
                    className="mt-1"
                  />
                </div>

                {/* Location */}
                <div>
                  <Label htmlFor="permit-location">{t("permits.location")}</Label>
                  <select
                    id="permit-location"
                    aria-label="Select location"
                    value={permitForm.location_id}
                    onChange={(e) => setPermitForm((f) => ({ ...f, location_id: e.target.value }))}
                    className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select location...</option>
                    {locations.map((l) => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>

                {/* Start Time + End Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="permit-start">{t("permits.startTime")} *</Label>
                    <Input
                      id="permit-start"
                      type="datetime-local"
                      value={permitForm.start_time}
                      onChange={(e) => setPermitForm((f) => ({ ...f, start_time: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="permit-end">{t("permits.endTime")} *</Label>
                    <Input
                      id="permit-end"
                      type="datetime-local"
                      value={permitForm.end_time}
                      onChange={(e) => setPermitForm((f) => ({ ...f, end_time: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                </div>

                {/* Precautions */}
                <div>
                  <Label htmlFor="permit-precautions">{t("permits.precautions")}</Label>
                  <Textarea
                    id="permit-precautions"
                    value={permitForm.precautions}
                    onChange={(e) => setPermitForm((f) => ({ ...f, precautions: e.target.value }))}
                    placeholder="One precaution per line&#10;e.g. Fire extinguisher on site&#10;Area barricaded"
                    rows={4}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Enter one precaution per line</p>
                </div>

                {/* Workers */}
                <div>
                  <Label>{t("permits.workers")}</Label>
                  <div className="mt-1 max-h-40 overflow-y-auto rounded-md border border-input p-2 space-y-1">
                    {users.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No users available</p>
                    ) : (
                      users.map((u) => (
                        <label key={u.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5">
                          <input
                            type="checkbox"
                            checked={permitForm.workers.includes(u.id)}
                            onChange={() => toggleWorker(u.id)}
                            className="rounded border-input"
                          />
                          {u.full_name}
                        </label>
                      ))
                    )}
                  </div>
                  {permitForm.workers.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">{permitForm.workers.length} worker(s) selected</p>
                  )}
                </div>

                {/* Notes */}
                <div>
                  <Label htmlFor="permit-notes">Notes</Label>
                  <Textarea
                    id="permit-notes"
                    value={permitForm.notes}
                    onChange={(e) => setPermitForm((f) => ({ ...f, notes: e.target.value }))}
                    placeholder="Additional notes..."
                    rows={2}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                <Button variant="outline" onClick={() => { setShowCreatePermit(false); resetPermitForm(); }}>
                  {t("permits.cancel")}
                </Button>
                <Button
                  onClick={handleSavePermit}
                  disabled={!permitForm.type || !permitForm.title || !permitForm.start_time || !permitForm.end_time}
                >
                  {t("permits.createPermit")}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
