"use client";

import * as React from "react";
import {
  Plus,
  Trash2 as Trash2Icon,
  AlertTriangle,
  Recycle,
  Droplets,
  ChevronLeft,
  ChevronRight,
  X,
  BarChart3,
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
import type { WasteLog, SpillRecord, WasteCategory, SpillSeverity } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ITEMS_PER_PAGE = PAGINATION.DEFAULT_PAGE_SIZE;

type SubTab = "waste" | "spills" | "overview";

const WASTE_CATEGORY_LABELS: Record<WasteCategory, string> = {
  hazardous: "environment.hazardous",
  non_hazardous: "environment.nonHazardous",
  recyclable: "environment.recyclable",
  special: "environment.special",
  clinical: "environment.clinical",
};

const WASTE_CATEGORY_BADGE: Record<WasteCategory, { variant: "default" | "secondary" | "destructive" | "outline" }> = {
  hazardous: { variant: "destructive" },
  non_hazardous: { variant: "secondary" },
  recyclable: { variant: "default" },
  special: { variant: "outline" },
  clinical: { variant: "destructive" },
};

const SPILL_SEVERITY_BADGE: Record<SpillSeverity, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
  minor: { variant: "secondary", label: "environment.minor" },
  moderate: { variant: "outline", label: "environment.moderate" },
  major: { variant: "destructive", label: "environment.major" },
};

const SPILL_STATUS_BADGE: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
  open: { variant: "destructive", label: "environment.open" },
  contained: { variant: "outline", label: "environment.contained" },
  cleaned: { variant: "default", label: "environment.cleaned" },
  closed: { variant: "secondary", label: "environment.closed" },
};

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

export default function EnvironmentPage() {
  const { user } = useAuth();
  const { t, formatDate } = useTranslation();
  const { toast } = useToast();
  const {
    users,
    locations,
    wasteLogs,
    spillRecords,
    stores,
    companyId,
  } = useCompanyData();

  const wasteLogsStore = stores.wasteLogs;
  const spillRecordsStore = stores.spillRecords;

  // ── Tab / page state ──
  const [activeTab, setActiveTab] = React.useState<SubTab>("waste");
  const [currentPage, setCurrentPage] = React.useState(1);

  // ── Filters ──
  const [searchQuery, setSearchQuery] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");

  // ── Sort ──
  const [sortKey, setSortKey] = React.useState<string | null>(null);
  const [sortDir, setSortDir] = React.useState<SortDirection>(null);

  // ── Modals ──
  const [showAddWaste, setShowAddWaste] = React.useState(false);
  const [showAddSpill, setShowAddSpill] = React.useState(false);

  // Reset page on filter/tab changes
  React.useEffect(() => { setCurrentPage(1); }, [searchQuery, categoryFilter, statusFilter, activeTab]);

  // ── Location map ──
  const locationMap = React.useMemo(() => {
    const m = new Map<string, string>();
    locations.forEach((l) => m.set(l.id, l.name));
    return m;
  }, [locations]);

  // ── KPI computations ──
  const kpis = React.useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const wasteThisMonth = wasteLogs.filter((w) => new Date(w.date) >= monthStart);
    const totalWaste = wasteThisMonth.reduce((sum, w) => sum + w.volume, 0);

    const spillCount = spillRecords.filter((s) => new Date(s.date) >= monthStart).length;

    const recyclable = wasteThisMonth.filter((w) => w.category === "recyclable").reduce((sum, w) => sum + w.volume, 0);
    const recyclingRate = totalWaste > 0 ? Math.round((recyclable / totalWaste) * 100) : 0;

    const openSpills = spillRecords.filter((s) => s.status === "open" || s.status === "contained").length;

    return { totalWaste, spillCount, recyclingRate, openSpills };
  }, [wasteLogs, spillRecords]);

  // ── Waste Log filtering ──
  const filteredWaste = React.useMemo(() => {
    let data = wasteLogs;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      data = data.filter((w) =>
        w.waste_type.toLowerCase().includes(q) ||
        w.disposal_method.toLowerCase().includes(q) ||
        (w.contractor ?? "").toLowerCase().includes(q) ||
        (w.notes ?? "").toLowerCase().includes(q),
      );
    }
    if (categoryFilter) data = data.filter((w) => w.category === categoryFilter);
    return data;
  }, [wasteLogs, searchQuery, categoryFilter]);

  const sortedWaste = React.useMemo(
    () =>
      sortData(filteredWaste, sortKey, sortDir, (item, key) => {
        if (key === "date") return item.date;
        if (key === "waste_type") return item.waste_type;
        if (key === "category") return item.category;
        if (key === "volume") return String(item.volume);
        if (key === "disposal_method") return item.disposal_method;
        if (key === "contractor") return item.contractor ?? "";
        if (key === "location") return locationMap.get(item.location_id ?? "") ?? "";
        if (key === "recorded_by") return getUserDisplayName(item.recorded_by, users, "");
        return (item as unknown as Record<string, unknown>)[key] as string;
      }),
    [filteredWaste, sortKey, sortDir, users, locationMap],
  );

  const wasteTotalPages = Math.ceil(sortedWaste.length / ITEMS_PER_PAGE);
  const wastePageData = sortedWaste.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // ── Spill Records filtering ──
  const filteredSpills = React.useMemo(() => {
    let data = spillRecords;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      data = data.filter((s) =>
        s.material.toLowerCase().includes(q) ||
        s.containment_action.toLowerCase().includes(q) ||
        (s.location_description ?? "").toLowerCase().includes(q) ||
        (s.notes ?? "").toLowerCase().includes(q),
      );
    }
    if (categoryFilter) data = data.filter((s) => s.severity === categoryFilter);
    if (statusFilter) data = data.filter((s) => s.status === statusFilter);
    return data;
  }, [spillRecords, searchQuery, categoryFilter, statusFilter]);

  const sortedSpills = React.useMemo(
    () =>
      sortData(filteredSpills, sortKey, sortDir, (item, key) => {
        if (key === "date") return item.date;
        if (key === "material") return item.material;
        if (key === "volume") return String(item.volume);
        if (key === "severity") return item.severity;
        if (key === "location") return locationMap.get(item.location_id ?? "") ?? item.location_description ?? "";
        if (key === "status") return item.status;
        if (key === "containment_action") return item.containment_action;
        if (key === "reported_by") return getUserDisplayName(item.reported_by, users, "");
        return (item as unknown as Record<string, unknown>)[key] as string;
      }),
    [filteredSpills, sortKey, sortDir, users, locationMap],
  );

  const spillTotalPages = Math.ceil(sortedSpills.length / ITEMS_PER_PAGE);
  const spillPageData = sortedSpills.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // ── Sort handler ──
  const handleSort = React.useCallback((key: string, dir: SortDirection) => {
    setSortKey(dir ? key : null);
    setSortDir(dir);
  }, []);

  // ── Waste filters ──
  const wasteFilters = React.useMemo(
    () => [
      {
        id: "category",
        label: t("environment.wasteType"),
        options: Object.entries(WASTE_CATEGORY_LABELS).map(([value, key]) => ({ value, label: t(key) })),
        value: categoryFilter,
        onChange: setCategoryFilter,
      },
    ],
    [categoryFilter, t],
  );

  // ── Spill filters ──
  const spillFilters = React.useMemo(
    () => [
      {
        id: "severity",
        label: t("environment.severity"),
        options: [
          { value: "minor", label: t("environment.minor") },
          { value: "moderate", label: t("environment.moderate") },
          { value: "major", label: t("environment.major") },
        ],
        value: categoryFilter,
        onChange: setCategoryFilter,
      },
      {
        id: "status",
        label: "Status",
        options: [
          { value: "open", label: "Open" },
          { value: "contained", label: "Contained" },
          { value: "cleaned", label: "Cleaned" },
          { value: "closed", label: "Closed" },
        ],
        value: statusFilter,
        onChange: setStatusFilter,
      },
    ],
    [categoryFilter, statusFilter],
  );

  // ── Add Waste form ──
  const [wasteForm, setWasteForm] = React.useState({
    waste_type: "",
    category: "" as WasteCategory | "",
    volume: "",
    unit: "kg",
    disposal_method: "",
    contractor: "",
    location_id: "",
    date: new Date().toISOString().split("T")[0],
    notes: "",
  });

  const resetWasteForm = React.useCallback(() => {
    setWasteForm({
      waste_type: "",
      category: "",
      volume: "",
      unit: "kg",
      disposal_method: "",
      contractor: "",
      location_id: "",
      date: new Date().toISOString().split("T")[0],
      notes: "",
    });
  }, []);

  const handleSaveWaste = React.useCallback(() => {
    if (!wasteForm.waste_type || !wasteForm.category || !wasteForm.volume || !wasteForm.disposal_method || !wasteForm.date) return;
    const now = new Date().toISOString();

    const newWaste: WasteLog = {
      id: crypto.randomUUID(),
      company_id: companyId ?? "",
      waste_type: wasteForm.waste_type,
      category: wasteForm.category as WasteCategory,
      volume: parseFloat(wasteForm.volume),
      unit: wasteForm.unit,
      disposal_method: wasteForm.disposal_method,
      contractor: wasteForm.contractor || null,
      location_id: wasteForm.location_id || null,
      date: wasteForm.date,
      notes: wasteForm.notes || null,
      recorded_by: user?.id ?? "",
      created_at: now,
      updated_at: now,
    };

    wasteLogsStore.add(newWaste);
    toast("Waste entry added");
    resetWasteForm();
    setShowAddWaste(false);
  }, [wasteForm, companyId, user, wasteLogsStore, toast, resetWasteForm]);

  // ── Delete waste ──
  const handleDeleteWaste = React.useCallback(
    (id: string) => {
      wasteLogsStore.remove(id);
      toast("Waste entry removed");
    },
    [wasteLogsStore, toast],
  );

  // ── Add Spill form ──
  const [spillForm, setSpillForm] = React.useState({
    material: "",
    volume: "",
    unit: "liters",
    severity: "" as SpillSeverity | "",
    location_id: "",
    location_description: "",
    containment_action: "",
    date: new Date().toISOString().split("T")[0],
    notes: "",
  });

  const resetSpillForm = React.useCallback(() => {
    setSpillForm({
      material: "",
      volume: "",
      unit: "liters",
      severity: "",
      location_id: "",
      location_description: "",
      containment_action: "",
      date: new Date().toISOString().split("T")[0],
      notes: "",
    });
  }, []);

  const handleSaveSpill = React.useCallback(() => {
    if (!spillForm.material || !spillForm.volume || !spillForm.severity || !spillForm.containment_action || !spillForm.date) return;
    const now = new Date().toISOString();

    const newSpill: SpillRecord = {
      id: crypto.randomUUID(),
      company_id: companyId ?? "",
      material: spillForm.material,
      volume: parseFloat(spillForm.volume),
      unit: spillForm.unit,
      severity: spillForm.severity as SpillSeverity,
      location_id: spillForm.location_id || null,
      location_description: spillForm.location_description || null,
      containment_action: spillForm.containment_action,
      incident_id: null,
      date: spillForm.date,
      reported_by: user?.id ?? "",
      status: "open",
      notes: spillForm.notes || null,
      created_at: now,
      updated_at: now,
    };

    spillRecordsStore.add(newSpill);
    toast("Spill record added");
    resetSpillForm();
    setShowAddSpill(false);
  }, [spillForm, companyId, user, spillRecordsStore, toast, resetSpillForm]);

  // ── Delete spill ──
  const handleDeleteSpill = React.useCallback(
    (id: string) => {
      spillRecordsStore.remove(id);
      toast("Spill record removed");
    },
    [spillRecordsStore, toast],
  );

  // ── Update spill status ──
  const handleUpdateSpillStatus = React.useCallback(
    (spill: SpillRecord, newStatus: SpillRecord["status"]) => {
      const now = new Date().toISOString();
      spillRecordsStore.update(spill.id, {
        ...spill,
        status: newStatus,
        updated_at: now,
      });
      toast(`Spill marked as ${newStatus}`);
    },
    [spillRecordsStore, toast],
  );

  // ── Overview data ──
  const overviewData = React.useMemo(() => {
    const wasteByCategory: Record<string, number> = {};
    wasteLogs.forEach((w) => {
      const label = WASTE_CATEGORY_LABELS[w.category] ?? w.category;
      wasteByCategory[label] = (wasteByCategory[label] ?? 0) + w.volume;
    });

    const disposalMethods: Record<string, number> = {};
    wasteLogs.forEach((w) => {
      disposalMethods[w.disposal_method] = (disposalMethods[w.disposal_method] ?? 0) + 1;
    });

    // Monthly spill counts (last 6 months)
    const now = new Date();
    const monthlySpills: { label: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mEnd = new Date(m.getFullYear(), m.getMonth() + 1, 0);
      const label = m.toLocaleDateString("en-US", { month: "short", year: "numeric" });
      const count = spillRecords.filter((s) => {
        const d = new Date(s.date);
        return d >= m && d <= mEnd;
      }).length;
      monthlySpills.push({ label, count });
    }

    return { wasteByCategory, disposalMethods, monthlySpills };
  }, [wasteLogs, spillRecords]);

  // ── Loading ──
  if (wasteLogsStore.isLoading || spillRecordsStore.isLoading) {
    return <LoadingPage />;
  }

  // ── Render ──
  return (
    <RoleGuard allowedRoles={["company_admin", "manager", "super_admin"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Environment</h1>
            <p className="text-sm text-muted-foreground">Track waste disposal, spill incidents, and environmental metrics</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => {
                resetWasteForm();
                setShowAddWaste(true);
              }}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add Waste Entry
            </Button>
            <Button
              size="sm"
              className="gap-2"
              onClick={() => {
                resetSpillForm();
                setShowAddSpill(true);
              }}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add Spill Record
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KPICard title={t("environment.totalWaste")} value={`${kpis.totalWaste.toLocaleString()} kg`} icon={Trash2Icon} description={t("environment.thisMonth")} />
          <KPICard
            title={t("environment.spills")}
            value={kpis.spillCount}
            icon={AlertTriangle}
            className={kpis.spillCount > 0 ? "border-amber-500/50" : undefined}
            description={t("environment.thisMonth")}
          />
          <KPICard title={t("environment.recyclingRate")} value={`${kpis.recyclingRate}%`} icon={Recycle} description={t("environment.ofTotalVolume")} />
          <KPICard
            title={t("environment.openSpills")}
            value={kpis.openSpills}
            icon={Droplets}
            className={kpis.openSpills > 0 ? "border-destructive/50" : undefined}
            description={t("environment.requiringAttention")}
          />
        </div>

        {/* Sub Tabs */}
        <div className="border-b">
          <div className="flex gap-4">
            {([
              { key: "waste" as const, label: t("environment.wasteLog"), icon: Trash2Icon },
              { key: "spills" as const, label: t("environment.spills"), icon: Droplets },
              { key: "overview" as const, label: t("environment.overview"), icon: BarChart3 },
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

        {/* ================================================================ */}
        {/* Waste Log Tab                                                    */}
        {/* ================================================================ */}
        {activeTab === "waste" && (
          <>
            <SearchFilterBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              searchPlaceholder="Search by waste type, method, contractor..."
              filters={wasteFilters}
              showDateRange={false}
            />
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Waste Log ({filteredWaste.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-muted-foreground border-b">
                        <SortableTh sortKey="date" currentSort={sortKey} currentDirection={sortDir} onSort={handleSort}>Date</SortableTh>
                        <SortableTh sortKey="waste_type" currentSort={sortKey} currentDirection={sortDir} onSort={handleSort}>Waste Type</SortableTh>
                        <SortableTh sortKey="category" currentSort={sortKey} currentDirection={sortDir} onSort={handleSort}>Category</SortableTh>
                        <SortableTh sortKey="volume" currentSort={sortKey} currentDirection={sortDir} onSort={handleSort}>Volume</SortableTh>
                        <SortableTh sortKey="disposal_method" currentSort={sortKey} currentDirection={sortDir} onSort={handleSort}>Disposal Method</SortableTh>
                        <SortableTh sortKey="contractor" currentSort={sortKey} currentDirection={sortDir} onSort={handleSort}>Contractor</SortableTh>
                        <SortableTh sortKey="location" currentSort={sortKey} currentDirection={sortDir} onSort={handleSort}>Location</SortableTh>
                        <SortableTh sortKey="recorded_by" currentSort={sortKey} currentDirection={sortDir} onSort={handleSort}>Recorded By</SortableTh>
                        <th className="pb-3 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {wastePageData.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-12 text-center text-muted-foreground">
                            No waste log entries found
                          </td>
                        </tr>
                      ) : (
                        wastePageData.map((w) => {
                          const catBadge = WASTE_CATEGORY_BADGE[w.category] ?? { variant: "secondary" as const };
                          return (
                            <tr key={w.id} className="hover:bg-muted/50 transition-colors">
                              <td className="py-3 pr-4">{formatDate(w.date)}</td>
                              <td className="py-3 pr-4 font-medium">{w.waste_type}</td>
                              <td className="py-3 pr-4">
                                <Badge variant={catBadge.variant}>{WASTE_CATEGORY_LABELS[w.category]}</Badge>
                              </td>
                              <td className="py-3 pr-4">{w.volume} {w.unit}</td>
                              <td className="py-3 pr-4">{w.disposal_method}</td>
                              <td className="py-3 pr-4 text-muted-foreground">{w.contractor ?? "—"}</td>
                              <td className="py-3 pr-4 text-muted-foreground">{locationMap.get(w.location_id ?? "") ?? "—"}</td>
                              <td className="py-3 pr-4 text-muted-foreground">{getUserDisplayName(w.recorded_by, users)}</td>
                              <td className="py-3 text-right">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => handleDeleteWaste(w.id)}
                                >
                                  <Trash2Icon className="h-3.5 w-3.5" aria-hidden="true" />
                                  <span className="sr-only">Delete</span>
                                </Button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
                <Pagination currentPage={currentPage} totalPages={wasteTotalPages} totalItems={filteredWaste.length} onPageChange={setCurrentPage} />
              </CardContent>
            </Card>
          </>
        )}

        {/* ================================================================ */}
        {/* Spills Tab                                                       */}
        {/* ================================================================ */}
        {activeTab === "spills" && (
          <>
            <SearchFilterBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              searchPlaceholder="Search by material, location, action..."
              filters={spillFilters}
              showDateRange={false}
            />
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Spill Records ({filteredSpills.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-muted-foreground border-b">
                        <SortableTh sortKey="date" currentSort={sortKey} currentDirection={sortDir} onSort={handleSort}>Date</SortableTh>
                        <SortableTh sortKey="material" currentSort={sortKey} currentDirection={sortDir} onSort={handleSort}>Material</SortableTh>
                        <SortableTh sortKey="volume" currentSort={sortKey} currentDirection={sortDir} onSort={handleSort}>Volume</SortableTh>
                        <SortableTh sortKey="severity" currentSort={sortKey} currentDirection={sortDir} onSort={handleSort}>Severity</SortableTh>
                        <SortableTh sortKey="location" currentSort={sortKey} currentDirection={sortDir} onSort={handleSort}>Location</SortableTh>
                        <SortableTh sortKey="status" currentSort={sortKey} currentDirection={sortDir} onSort={handleSort}>Status</SortableTh>
                        <SortableTh sortKey="containment_action" currentSort={sortKey} currentDirection={sortDir} onSort={handleSort}>Containment</SortableTh>
                        <SortableTh sortKey="reported_by" currentSort={sortKey} currentDirection={sortDir} onSort={handleSort}>Reported By</SortableTh>
                        <th className="pb-3 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {spillPageData.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-12 text-center text-muted-foreground">
                            No spill records found
                          </td>
                        </tr>
                      ) : (
                        spillPageData.map((s) => {
                          const sevBadge = SPILL_SEVERITY_BADGE[s.severity] ?? SPILL_SEVERITY_BADGE.minor;
                          const stsBadge = SPILL_STATUS_BADGE[s.status] ?? SPILL_STATUS_BADGE.open;
                          return (
                            <tr key={s.id} className="hover:bg-muted/50 transition-colors">
                              <td className="py-3 pr-4">{formatDate(s.date)}</td>
                              <td className="py-3 pr-4 font-medium">{s.material}</td>
                              <td className="py-3 pr-4">{s.volume} {s.unit}</td>
                              <td className="py-3 pr-4">
                                <Badge variant={sevBadge.variant}>{sevBadge.label}</Badge>
                              </td>
                              <td className="py-3 pr-4 text-muted-foreground">
                                {locationMap.get(s.location_id ?? "") ?? s.location_description ?? "—"}
                              </td>
                              <td className="py-3 pr-4">
                                <Badge variant={stsBadge.variant}>{stsBadge.label}</Badge>
                              </td>
                              <td className="py-3 pr-4">
                                <p className="line-clamp-1">{s.containment_action}</p>
                              </td>
                              <td className="py-3 pr-4 text-muted-foreground">{getUserDisplayName(s.reported_by, users)}</td>
                              <td className="py-3 text-right">
                                <div className="flex justify-end gap-1">
                                  {s.status === "open" && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 text-xs"
                                      onClick={() => handleUpdateSpillStatus(s, "contained")}
                                    >
                                      Contain
                                    </Button>
                                  )}
                                  {s.status === "contained" && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 text-xs"
                                      onClick={() => handleUpdateSpillStatus(s, "cleaned")}
                                    >
                                      Cleaned
                                    </Button>
                                  )}
                                  {s.status === "cleaned" && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 text-xs"
                                      onClick={() => handleUpdateSpillStatus(s, "closed")}
                                    >
                                      Close
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                    onClick={() => handleDeleteSpill(s.id)}
                                  >
                                    <Trash2Icon className="h-3.5 w-3.5" aria-hidden="true" />
                                    <span className="sr-only">Delete</span>
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
                <Pagination currentPage={currentPage} totalPages={spillTotalPages} totalItems={filteredSpills.length} onPageChange={setCurrentPage} />
              </CardContent>
            </Card>
          </>
        )}

        {/* ================================================================ */}
        {/* Overview Tab                                                     */}
        {/* ================================================================ */}
        {activeTab === "overview" && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Waste by Category */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Waste by Category</CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(overviewData.wasteByCategory).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No waste data recorded</p>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(overviewData.wasteByCategory)
                      .sort(([, a], [, b]) => b - a)
                      .map(([category, volume]) => (
                        <div key={category} className="flex items-center justify-between">
                          <span className="text-sm">{category}</span>
                          <span className="text-sm font-medium">{volume.toLocaleString()} kg</span>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top Disposal Methods */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top Disposal Methods</CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(overviewData.disposalMethods).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No disposal data recorded</p>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(overviewData.disposalMethods)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 8)
                      .map(([method, count]) => (
                        <div key={method} className="flex items-center justify-between">
                          <span className="text-sm">{method}</span>
                          <Badge variant="secondary">{count}</Badge>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Monthly Spill Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Spill Trend (6 months)</CardTitle>
              </CardHeader>
              <CardContent>
                {overviewData.monthlySpills.every((m) => m.count === 0) ? (
                  <p className="text-sm text-muted-foreground">No spills recorded</p>
                ) : (
                  <div className="space-y-3">
                    {overviewData.monthlySpills.map((m) => (
                      <div key={m.label} className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{m.label}</span>
                        <div className="flex items-center gap-2">
                          <div
                            className="h-2 rounded-full bg-primary"
                            style={{ width: `${Math.max(4, m.count * 20)}px` }}
                          />
                          <span className="text-sm font-medium w-6 text-right">{m.count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ================================================================ */}
        {/* Add Waste Entry Modal                                            */}
        {/* ================================================================ */}
        {showAddWaste && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => { setShowAddWaste(false); resetWasteForm(); }}>
            <div
              className="relative z-50 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto rounded-lg bg-background p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold">Add Waste Entry</h2>
                  <p className="text-sm text-muted-foreground">Record a new waste disposal entry</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => { setShowAddWaste(false); resetWasteForm(); }}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="space-y-4">
                {/* Waste Type */}
                <div>
                  <Label htmlFor="waste-type">Waste Type *</Label>
                  <Input
                    id="waste-type"
                    value={wasteForm.waste_type}
                    onChange={(e) => setWasteForm((f) => ({ ...f, waste_type: e.target.value }))}
                    placeholder="e.g. Used motor oil, Paper waste"
                    className="mt-1"
                  />
                </div>

                {/* Category */}
                <div>
                  <Label htmlFor="waste-category">Category *</Label>
                  <select
                    id="waste-category"
                    aria-label="Select waste category"
                    value={wasteForm.category}
                    onChange={(e) => setWasteForm((f) => ({ ...f, category: e.target.value as WasteCategory }))}
                    className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select category...</option>
                    {Object.entries(WASTE_CATEGORY_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                {/* Volume + Unit */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="waste-volume">Volume *</Label>
                    <Input
                      id="waste-volume"
                      type="number"
                      step="0.01"
                      value={wasteForm.volume}
                      onChange={(e) => setWasteForm((f) => ({ ...f, volume: e.target.value }))}
                      placeholder="0"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="waste-unit">Unit</Label>
                    <select
                      id="waste-unit"
                      aria-label="Select unit"
                      value={wasteForm.unit}
                      onChange={(e) => setWasteForm((f) => ({ ...f, unit: e.target.value }))}
                      className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="kg">kg</option>
                      <option value="liters">liters</option>
                      <option value="tonnes">tonnes</option>
                      <option value="m3">m³</option>
                      <option value="gallons">gallons</option>
                    </select>
                  </div>
                </div>

                {/* Disposal Method */}
                <div>
                  <Label htmlFor="waste-disposal">Disposal Method *</Label>
                  <Input
                    id="waste-disposal"
                    value={wasteForm.disposal_method}
                    onChange={(e) => setWasteForm((f) => ({ ...f, disposal_method: e.target.value }))}
                    placeholder="e.g. Incineration, Landfill, Recycling"
                    className="mt-1"
                  />
                </div>

                {/* Contractor + Location */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="waste-contractor">Contractor</Label>
                    <Input
                      id="waste-contractor"
                      value={wasteForm.contractor}
                      onChange={(e) => setWasteForm((f) => ({ ...f, contractor: e.target.value }))}
                      placeholder="Disposal company name"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="waste-location">Location</Label>
                    <select
                      id="waste-location"
                      aria-label="Select location"
                      value={wasteForm.location_id}
                      onChange={(e) => setWasteForm((f) => ({ ...f, location_id: e.target.value }))}
                      className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Select location...</option>
                      {locations.map((l) => (
                        <option key={l.id} value={l.id}>{l.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Date */}
                <div>
                  <Label htmlFor="waste-date">Date *</Label>
                  <Input
                    id="waste-date"
                    type="date"
                    value={wasteForm.date}
                    onChange={(e) => setWasteForm((f) => ({ ...f, date: e.target.value }))}
                    className="mt-1"
                  />
                </div>

                {/* Notes */}
                <div>
                  <Label htmlFor="waste-notes">Notes</Label>
                  <Textarea
                    id="waste-notes"
                    value={wasteForm.notes}
                    onChange={(e) => setWasteForm((f) => ({ ...f, notes: e.target.value }))}
                    placeholder="Additional notes..."
                    rows={2}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                <Button variant="outline" onClick={() => { setShowAddWaste(false); resetWasteForm(); }}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveWaste}
                  disabled={!wasteForm.waste_type || !wasteForm.category || !wasteForm.volume || !wasteForm.disposal_method || !wasteForm.date}
                >
                  Add Entry
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* Add Spill Record Modal                                           */}
        {/* ================================================================ */}
        {showAddSpill && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => { setShowAddSpill(false); resetSpillForm(); }}>
            <div
              className="relative z-50 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto rounded-lg bg-background p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold">Add Spill Record</h2>
                  <p className="text-sm text-muted-foreground">Report a new spill incident</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => { setShowAddSpill(false); resetSpillForm(); }}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="space-y-4">
                {/* Material */}
                <div>
                  <Label htmlFor="spill-material">Material *</Label>
                  <Input
                    id="spill-material"
                    value={spillForm.material}
                    onChange={(e) => setSpillForm((f) => ({ ...f, material: e.target.value }))}
                    placeholder="e.g. Diesel fuel, Hydraulic oil"
                    className="mt-1"
                  />
                </div>

                {/* Volume + Unit + Severity */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="spill-volume">Volume *</Label>
                    <Input
                      id="spill-volume"
                      type="number"
                      step="0.01"
                      value={spillForm.volume}
                      onChange={(e) => setSpillForm((f) => ({ ...f, volume: e.target.value }))}
                      placeholder="0"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="spill-unit">Unit</Label>
                    <select
                      id="spill-unit"
                      aria-label="Select unit"
                      value={spillForm.unit}
                      onChange={(e) => setSpillForm((f) => ({ ...f, unit: e.target.value }))}
                      className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="liters">liters</option>
                      <option value="kg">kg</option>
                      <option value="gallons">gallons</option>
                      <option value="m3">m³</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="spill-severity">Severity *</Label>
                    <select
                      id="spill-severity"
                      aria-label="Select severity"
                      value={spillForm.severity}
                      onChange={(e) => setSpillForm((f) => ({ ...f, severity: e.target.value as SpillSeverity }))}
                      className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Select severity...</option>
                      <option value="minor">Minor</option>
                      <option value="moderate">Moderate</option>
                      <option value="major">Major</option>
                    </select>
                  </div>
                </div>

                {/* Location + Description */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="spill-location">Location</Label>
                    <select
                      id="spill-location"
                      aria-label="Select location"
                      value={spillForm.location_id}
                      onChange={(e) => setSpillForm((f) => ({ ...f, location_id: e.target.value }))}
                      className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Select location...</option>
                      {locations.map((l) => (
                        <option key={l.id} value={l.id}>{l.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="spill-loc-desc">Location Description</Label>
                    <Input
                      id="spill-loc-desc"
                      value={spillForm.location_description}
                      onChange={(e) => setSpillForm((f) => ({ ...f, location_description: e.target.value }))}
                      placeholder="e.g. Near loading dock"
                      className="mt-1"
                    />
                  </div>
                </div>

                {/* Containment Action */}
                <div>
                  <Label htmlFor="spill-containment">Containment Action *</Label>
                  <Textarea
                    id="spill-containment"
                    value={spillForm.containment_action}
                    onChange={(e) => setSpillForm((f) => ({ ...f, containment_action: e.target.value }))}
                    placeholder="Describe the containment measures taken..."
                    rows={3}
                    className="mt-1"
                  />
                </div>

                {/* Date */}
                <div>
                  <Label htmlFor="spill-date">Date *</Label>
                  <Input
                    id="spill-date"
                    type="date"
                    value={spillForm.date}
                    onChange={(e) => setSpillForm((f) => ({ ...f, date: e.target.value }))}
                    className="mt-1"
                  />
                </div>

                {/* Notes */}
                <div>
                  <Label htmlFor="spill-notes">Notes</Label>
                  <Textarea
                    id="spill-notes"
                    value={spillForm.notes}
                    onChange={(e) => setSpillForm((f) => ({ ...f, notes: e.target.value }))}
                    placeholder="Additional notes..."
                    rows={2}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                <Button variant="outline" onClick={() => { setShowAddSpill(false); resetSpillForm(); }}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveSpill}
                  disabled={!spillForm.material || !spillForm.volume || !spillForm.severity || !spillForm.containment_action || !spillForm.date}
                >
                  Add Spill Record
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
