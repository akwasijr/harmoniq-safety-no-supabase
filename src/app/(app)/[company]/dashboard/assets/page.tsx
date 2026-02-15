"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCompanyParam } from "@/hooks/use-company-param";
import {
  Plus,
  Package,
  AlertTriangle,
  CheckCircle,
  Clock,
  X,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Eye,
  ChevronDown,
  Layers,
  Box,
  Calendar,
  Download,
  Upload,
  Wrench,
  ClipboardList,
  Cog,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KPICard } from "@/components/ui/kpi-card";
import { SearchFilterBar } from "@/components/ui/search-filter-bar";
import { commonFilterOptions } from "@/components/ui/filter-panel";
import { useAssetsStore } from "@/stores/assets-store";
import { useLocationsStore } from "@/stores/locations-store";
import { useUsersStore } from "@/stores/users-store";
import { useToast } from "@/components/ui/toast";
import { useTranslation } from "@/i18n";
import { cn } from "@/lib/utils";
import { DetailTabs } from "@/components/ui/detail-tabs";
import { isWithinDateRange, DateRangeValue } from "@/lib/date-utils";
import CorrectiveActionsContent from "@/app/(app)/[company]/dashboard/corrective-actions/page";
import WorkOrdersContent from "@/app/(app)/[company]/dashboard/work-orders/page";
import PartsContent from "@/app/(app)/[company]/dashboard/parts/page";
import type { Asset, Alert } from "@/types";

const ITEMS_PER_PAGE = 10;

export default function AssetsPage() {
  const router = useRouter();
  const company = useCompanyParam();
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [dateRange, setDateRange] = React.useState("all_time");
  const [viewMode, setViewMode] = React.useState<"list" | "tree">("list");
  const [expandedSystems, setExpandedSystems] = React.useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = React.useState<"assets" | "alerts" | "corrective-actions" | "work-orders" | "parts">("assets");
  const [alertSeverityFilter, setAlertSeverityFilter] = React.useState<string>("");

  // Filters
  const [statusFilter, setStatusFilter] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState("");
  const [locationFilter, setLocationFilter] = React.useState("");

  const [newAsset, setNewAsset] = React.useState({
    name: "",
    serial_number: "",
    category: "machinery",
    manufacturer: "",
    model: "",
    location_id: "",
    purchase_date: "",
    asset_type: "static",
    department: "",
    warranty_expiry: "",
  });

  const { items: assets, add: addAsset } = useAssetsStore();
  const { items: locations } = useLocationsStore();
  const { items: users } = useUsersStore();
  const { toast } = useToast();
  const { t, formatDate } = useTranslation();

  const departmentOptions = Array.from(
    new Set(users.map((u) => u.department).filter((d): d is string => !!d))
  );

  // CSV export
  const handleExportCSV = () => {
    const headers = ["name","asset_tag","serial_number","category","asset_type","department","status","condition","manufacturer","model","location_id","purchase_date","purchase_cost","warranty_expiry"];
    const rows = assets.map(a => headers.map(h => {
      const val = a[h as keyof typeof a];
      return val !== null && val !== undefined ? `"${String(val).replace(/"/g, '""')}"` : "";
    }).join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `assets-export-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast(t("assets.assetsExported"));
  };

  // CSV import
  const importRef = React.useRef<HTMLInputElement>(null);
  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const lines = text.split("\n").filter(l => l.trim());
      if (lines.length < 2) { toast("No data rows found in CSV"); return; }
      const headers = lines[0].split(",").map(h => h.replace(/"/g, "").trim());
      let imported = 0;
      for (let i = 1; i < lines.length; i++) {
        const vals = lines[i].match(/(".*?"|[^,]*)/g)?.map(v => v.replace(/^"|"$/g, "").replace(/""/g, '"').trim()) || [];
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => { row[h] = vals[idx] || ""; });
        if (!row.name) continue;
        addAsset({
          id: `asset_import_${Date.now()}_${i}`,
          company_id: "",
          location_id: row.location_id || null,
          parent_asset_id: null,
          is_system: false,
          name: row.name,
          asset_tag: row.asset_tag || `AST-${Date.now()}-${i}`,
          serial_number: row.serial_number || null,
          barcode: null, qr_code: null,
          category: (row.category as Asset["category"]) || "other",
          sub_category: null,
          asset_type: (row.asset_type as Asset["asset_type"]) || "static",
          criticality: "medium",
          department: row.department || null,
          manufacturer: row.manufacturer || null,
          model: row.model || null, model_number: null,
          specifications: null, manufactured_date: null,
          purchase_date: row.purchase_date || null,
          installation_date: null,
          warranty_expiry: row.warranty_expiry || null,
          expected_life_years: null,
          condition: (row.condition as Asset["condition"]) || "good",
          condition_notes: null, last_condition_assessment: null,
          purchase_cost: row.purchase_cost ? parseFloat(row.purchase_cost) : null,
          current_value: null, depreciation_rate: null, currency: "USD",
          maintenance_frequency_days: null, last_maintenance_date: null,
          next_maintenance_date: null, maintenance_notes: null,
          requires_certification: false, requires_calibration: false,
          calibration_frequency_days: null, last_calibration_date: null,
          next_calibration_date: null, safety_instructions: null,
          status: (row.status as Asset["status"]) || "active",
          decommission_date: null, disposal_method: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        imported++;
      }
      toast(`${imported} assets imported`);
    };
    reader.readAsText(file);
    e.target.value = "";
  };
  
  // Compute alerts from asset data
  const computedAlerts = React.useMemo(() => {
    const now = new Date();
    const alerts: Alert[] = [];
    const DAY = 24 * 60 * 60 * 1000;

    const severity = (due: Date): "critical" | "warning" | "info" => {
      const diff = due.getTime() - now.getTime();
      if (diff < 0) return "critical";
      if (diff <= 30 * DAY) return "warning";
      return "info";
    };

    for (const asset of assets) {
      if (asset.status === "retired") continue;

      if (asset.warranty_expiry) {
        const due = new Date(asset.warranty_expiry);
        const diff = due.getTime() - now.getTime();
        if (diff <= 90 * DAY) {
          const s = severity(due);
          alerts.push({
            id: `alert_warranty_${asset.id}`,
            company_id: asset.company_id,
            type: diff < 0 ? "warranty_expired" : "warranty_expiring",
            asset_id: asset.id,
            schedule_id: null,
            title: `${asset.name}: Warranty ${diff < 0 ? "expired" : "expiring"}`,
            description: `Warranty ${diff < 0 ? "expired" : "expires"} on ${formatDate(due)}`,
            due_date: asset.warranty_expiry,
            severity: s,
            is_dismissed: false,
            dismissed_by_user_id: null,
            dismissed_at: null,
            is_resolved: false,
            resolved_at: null,
            created_at: now.toISOString(),
          });
        }
      }

      if (asset.next_calibration_date && asset.requires_calibration) {
        const due = new Date(asset.next_calibration_date);
        const diff = due.getTime() - now.getTime();
        if (diff <= 90 * DAY) {
          const s = severity(due);
          alerts.push({
            id: `alert_calibration_${asset.id}`,
            company_id: asset.company_id,
            type: diff < 0 ? "calibration_overdue" : "calibration_due",
            asset_id: asset.id,
            schedule_id: null,
            title: `${asset.name}: Calibration ${diff < 0 ? "overdue" : "due"}`,
            description: `Calibration ${diff < 0 ? "was due" : "due"} on ${formatDate(due)}`,
            due_date: asset.next_calibration_date,
            severity: s,
            is_dismissed: false,
            dismissed_by_user_id: null,
            dismissed_at: null,
            is_resolved: false,
            resolved_at: null,
            created_at: now.toISOString(),
          });
        }
      }

      if (asset.next_maintenance_date) {
        const due = new Date(asset.next_maintenance_date);
        const diff = due.getTime() - now.getTime();
        if (diff <= 90 * DAY) {
          const s = severity(due);
          alerts.push({
            id: `alert_maintenance_${asset.id}`,
            company_id: asset.company_id,
            type: diff < 0 ? "maintenance_overdue" : "maintenance_due",
            asset_id: asset.id,
            schedule_id: null,
            title: `${asset.name}: Maintenance ${diff < 0 ? "overdue" : "due"}`,
            description: `Maintenance ${diff < 0 ? "was due" : "due"} on ${formatDate(due)}`,
            due_date: asset.next_maintenance_date,
            severity: s,
            is_dismissed: false,
            dismissed_by_user_id: null,
            dismissed_at: null,
            is_resolved: false,
            resolved_at: null,
            created_at: now.toISOString(),
          });
        }
      }
    }
    return alerts;
  }, [assets]);

  // Alerts - active (not dismissed/resolved)
  const activeAlerts = computedAlerts.filter(a => !a.is_dismissed && !a.is_resolved);
  const criticalAlerts = activeAlerts.filter(a => a.severity === "critical");
  const warningAlerts = activeAlerts.filter(a => a.severity === "warning");
  const infoAlerts = activeAlerts.filter(a => a.severity === "info");
  
  // Upcoming alerts (due within next 30 days)
  const today = new Date();
  const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
  const upcomingAlerts = activeAlerts.filter(a => {
    const dueDate = new Date(a.due_date);
    return dueDate >= today && dueDate <= thirtyDaysFromNow;
  });
  
  // Filtered alerts based on severity filter
  const filteredAlerts = alertSeverityFilter 
    ? alertSeverityFilter === "upcoming" 
      ? upcomingAlerts 
      : activeAlerts.filter(a => a.severity === alertSeverityFilter)
    : activeAlerts;

  // Organize assets into hierarchy
  const systemAssets = assets.filter(a => a.is_system);
  const standaloneAssets = assets.filter(a => !a.parent_asset_id && !a.is_system);
  const getChildAssets = (parentId: string) => assets.filter(a => a.parent_asset_id === parentId);

  // Toggle system expansion
  const toggleSystem = (systemId: string) => {
    setExpandedSystems(prev => {
      const next = new Set(prev);
      if (next.has(systemId)) {
        next.delete(systemId);
      } else {
        next.add(systemId);
      }
      return next;
    });
  };

  const locationOptions = locations.map((loc) => ({ value: loc.id, label: loc.name }));
  const categoryOptions = [
    { value: "machinery", label: t("assets.categories.machinery") },
    { value: "vehicle", label: t("assets.categories.vehicle") },
    { value: "safety_equipment", label: t("assets.categories.safety_equipment") },
    { value: "tool", label: t("assets.categories.tool") },
    { value: "electrical", label: t("assets.categories.electrical") },
    { value: "other", label: t("assets.categories.other") },
  ];

  // Filter assets
  const filteredAssets = assets.filter((asset) => {
    const matchesSearch = searchQuery === "" || 
      asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (asset.serial_number?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (asset.asset_tag?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesStatus = statusFilter === "" || asset.status === statusFilter;
    const matchesCategory = categoryFilter === "" || asset.category === categoryFilter;
    const matchesLocation = locationFilter === "" || asset.location_id === locationFilter;
    const matchesDate = asset.purchase_date ? isWithinDateRange(asset.purchase_date, dateRange as DateRangeValue) : true;
    return matchesSearch && matchesStatus && matchesCategory && matchesLocation && matchesDate;
  });

  // Pagination
  const totalPages = Math.ceil(filteredAssets.length / ITEMS_PER_PAGE);
  const paginatedAssets = filteredAssets.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const statusCounts = {
    active: assets.filter((a) => a.status === "active").length,
    maintenance: assets.filter((a) => a.status === "maintenance").length,
    retired: assets.filter((a) => a.status === "retired").length,
  };

  const filters = [
    {
      id: "status",
      label: t("assets.allStatuses"),
      options: commonFilterOptions.assetStatus,
      value: statusFilter,
      onChange: (v: string) => { setStatusFilter(v); setCurrentPage(1); },
    },
    {
      id: "category",
      label: t("assets.allCategories"),
      options: categoryOptions,
      value: categoryFilter,
      onChange: (v: string) => { setCategoryFilter(v); setCurrentPage(1); },
    },
    {
      id: "location",
      label: t("assets.allLocations"),
      options: locationOptions,
      value: locationFilter,
      onChange: (v: string) => { setLocationFilter(v); setCurrentPage(1); },
    },
  ];

  const handleAddAsset = () => {
    if (!newAsset.name.trim()) {
      toast("Asset name is required", "error");
      return;
    }
    const now = new Date().toISOString();
    const asset: Asset = {
      id: `asset_${Date.now()}`,
      company_id: company || "",
      location_id: newAsset.location_id || null,
      parent_asset_id: null,
      is_system: false,
      name: newAsset.name,
      asset_tag: `AST-${Date.now().toString().slice(-6)}`,
      serial_number: newAsset.serial_number || null,
      barcode: null,
      qr_code: null,
      category: newAsset.category as Asset["category"],
      sub_category: null,
      asset_type: newAsset.asset_type as Asset["asset_type"],
      criticality: "medium",
      department: newAsset.department || null,
      manufacturer: newAsset.manufacturer || null,
      model: newAsset.model || null,
      model_number: null,
      specifications: null,
      manufactured_date: null,
      purchase_date: newAsset.purchase_date || null,
      installation_date: null,
      warranty_expiry: newAsset.warranty_expiry || null,
      expected_life_years: null,
      condition: "good",
      condition_notes: null,
      last_condition_assessment: null,
      purchase_cost: null,
      current_value: null,
      depreciation_rate: null,
      currency: "USD",
      maintenance_frequency_days: null,
      last_maintenance_date: null,
      next_maintenance_date: null,
      maintenance_notes: null,
      requires_certification: false,
      requires_calibration: false,
      calibration_frequency_days: null,
      last_calibration_date: null,
      next_calibration_date: null,
      safety_instructions: null,
      status: "active",
      decommission_date: null,
      disposal_method: null,
      created_at: now,
      updated_at: now,
    };
    addAsset(asset);
    toast("Asset added successfully");
    setShowAddModal(false);
    setNewAsset({
      name: "",
      serial_number: "",
      category: "machinery",
      manufacturer: "",
      model: "",
      location_id: "",
      purchase_date: "",
      asset_type: "static",
      department: "",
      warranty_expiry: "",
    });
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">
          <span className="sm:hidden">{t("nav.assetsShort")}</span>
          <span className="hidden sm:inline">{t("nav.assets")}</span>
        </h1>
        <div className="flex gap-2">
          {activeTab === "assets" && (
            <>
              <input ref={importRef} type="file" accept=".csv" className="hidden" onChange={handleImportCSV} />
              <Button size="sm" variant="outline" className="gap-2" onClick={() => importRef.current?.click()}>
                <Upload className="h-4 w-4" />
                {t("assets.buttons.import")}
              </Button>
              <Button size="sm" variant="outline" className="gap-2" onClick={handleExportCSV}>
                <Download className="h-4 w-4" />
                {t("assets.buttons.export")}
              </Button>
              <Button size="sm" className="gap-2" onClick={() => setShowAddModal(true)}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                {t("assets.buttons.newAsset")}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <DetailTabs
        tabs={[
          { id: "assets", label: t("assets.tabs.assets"), icon: Package },
          { id: "work-orders", label: t("workOrders.title"), icon: ClipboardList },
          { id: "parts", label: t("parts.title"), icon: Cog },
          { id: "corrective-actions", label: t("correctiveActions.title"), icon: Wrench },
          { id: "alerts", label: t("assets.tabs.alerts"), icon: AlertTriangle, count: activeAlerts.length },
        ]}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as typeof activeTab)}
      />

      {/* Assets Tab Content */}
      {activeTab === "assets" && (
        <>
        {/* Status summary - clickable for filtering */}
        <div className="grid gap-4 sm:grid-cols-3">
          <KPICard
            title={t("assets.statuses.active")}
            value={statusCounts.active}
            icon={CheckCircle}
            onClick={() => { setStatusFilter(statusFilter === "active" ? "" : "active"); setCurrentPage(1); }}
            active={statusFilter === "active"}
          />
          <KPICard
            title={t("assets.statuses.maintenance")}
            value={statusCounts.maintenance}
            icon={Clock}
            onClick={() => { setStatusFilter(statusFilter === "maintenance" ? "" : "maintenance"); setCurrentPage(1); }}
            active={statusFilter === "maintenance"}
          />
          <KPICard
            title={t("assets.statuses.retired")}
            value={statusCounts.retired}
            icon={AlertTriangle}
            onClick={() => { setStatusFilter(statusFilter === "retired" ? "" : "retired"); setCurrentPage(1); }}
            active={statusFilter === "retired"}
          />
        </div>

        {/* Search and filters */}
        <SearchFilterBar
          searchQuery={searchQuery}
          onSearchChange={(value) => { setSearchQuery(value); setCurrentPage(1); }}
          searchPlaceholder={t("assets.placeholders.searchByNameSerialTag")}
          filters={filters}
          dateRange={dateRange}
          onDateRangeChange={(value) => { setDateRange(value); setCurrentPage(1); }}
          showDateRange={true}
        />

      {/* View Mode Toggle */}
      <div className="flex items-center gap-2">
        <Button
          variant={viewMode === "list" ? "default" : "outline"}
          size="sm"
          onClick={() => setViewMode("list")}
          className="gap-1"
        >
          <Package className="h-4 w-4" />
          List
        </Button>
        <Button
          variant={viewMode === "tree" ? "default" : "outline"}
          size="sm"
          onClick={() => setViewMode("tree")}
          className="gap-1"
        >
          <Layers className="h-4 w-4" />
          Hierarchy
        </Button>
      </div>

      {/* Assets Tree View */}
      {viewMode === "tree" && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Asset Hierarchy</CardTitle>
              <p className="text-sm text-muted-foreground">
                {systemAssets.length} systems, {standaloneAssets.length} standalone
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {/* Systems with children */}
              {systemAssets.map((system) => {
                const children = getChildAssets(system.id);
                const isExpanded = expandedSystems.has(system.id);
                return (
                  <div key={system.id} className="border rounded-lg">
                    <div 
                      className={cn(
                        "flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors",
                        isExpanded && "border-b"
                      )}
                      onClick={() => toggleSystem(system.id)}
                    >
                      <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </Button>
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                        <Layers className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium">{system.name}</span>
                        <p className="text-sm text-muted-foreground">
                          {children.length} component{children.length !== 1 ? "s" : ""} • {system.category}
                        </p>
                      </div>
                      <Link href={`/${company}/dashboard/assets/${system.id}`} onClick={(e) => e.stopPropagation()}>
                        <Button variant="outline" size="sm" className="gap-1">
                          <Eye className="h-4 w-4" />
                          View
                        </Button>
                      </Link>
                    </div>
                    {isExpanded && children.length > 0 && (
                      <div className="bg-muted/30">
                        {children.map((child, idx) => (
                          <Link 
                            key={child.id} 
                            href={`/${company}/dashboard/assets/${child.id}`}
                            className={cn(
                              "flex items-center gap-3 p-3 pl-14 hover:bg-muted/50 transition-colors group",
                              idx < children.length - 1 && "border-b border-border/50"
                            )}
                          >
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-background border shrink-0">
                              <Box className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="font-medium">{child.name}</span>
                              <p className="text-sm text-muted-foreground">{child.category}</p>
                            </div>
                            <Eye className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </Link>
                        ))}
                      </div>
                    )}
                    {isExpanded && children.length === 0 && (
                      <div className="p-4 pl-14 text-sm text-muted-foreground">
                        No components attached to this system
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Standalone assets */}
              {standaloneAssets.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Standalone Assets</h4>
                  <div className="space-y-1">
                    {standaloneAssets.map((asset) => (
                      <Link 
                        key={asset.id} 
                        href={`/${company}/dashboard/assets/${asset.id}`}
                        className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors group"
                      >
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted shrink-0">
                          <Package className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="font-medium">{asset.name}</span>
                          <p className="text-sm text-muted-foreground">{asset.category}</p>
                        </div>
                        <Eye className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assets table (List View) */}
      {viewMode === "list" && (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{filteredAssets.length} asset{filteredAssets.length !== 1 ? "s" : ""}</CardTitle>
            <p className="text-sm text-muted-foreground">Page {currentPage} of {totalPages || 1}</p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-3 font-medium">{t("assets.tabs.assets")}</th>
                  <th className="pb-3 font-medium">{t("assets.labels.category")}</th>
                  <th className="hidden pb-3 font-medium md:table-cell">{t("assets.labels.location")}</th>
                  <th className="hidden pb-3 font-medium lg:table-cell">{t("assets.labels.purchaseDate")}</th>
                  <th className="pb-3 font-medium">{t("assets.labels.status")}</th>
                  <th className="pb-3 font-medium w-10"></th>
                </tr>
              </thead>
              <tbody>
                {paginatedAssets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">{t("assets.empty.noAssets")}</td>
                  </tr>
                ) : (
                  paginatedAssets.map((asset) => (
                    <tr 
                      key={asset.id} 
                      className="border-b last:border-0 cursor-pointer hover:bg-muted/50 transition-colors group"
                      onClick={() => router.push(`/${company}/dashboard/assets/${asset.id}`)}
                    >
                      <td className="py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                            <Package className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                          </div>
                          <div>
                            <p className="font-medium">{asset.name}</p>
                            <p className="text-xs text-muted-foreground">{asset.asset_tag || asset.serial_number || asset.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 capitalize text-xs">{asset.category.replace("_", " ")}</td>
                      <td className="hidden py-3 md:table-cell">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          {asset.location_id ? (
                            <>
                              <MapPin className="h-3 w-3" />
                              {locations.find(l => l.id === asset.location_id)?.name || "Unknown"}
                            </>
                          ) : (
                            <span>Unassigned</span>
                          )}
                        </div>
                      </td>
                      <td className="hidden py-3 lg:table-cell text-xs text-muted-foreground">
                        {asset.purchase_date ? formatDate(asset.purchase_date) : "N/A"}
                      </td>
                      <td className="py-3">
                        <Badge variant={asset.status === "active" ? "success" : asset.status === "maintenance" ? "warning" : "destructive"} className="text-xs">
                          {asset.status.replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="py-3">
                        <Eye className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t mt-4">
              <p className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredAssets.length)} of {filteredAssets.length}
              </p>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => (
                  <Button key={i + 1} variant={currentPage === i + 1 ? "default" : "outline"} size="sm" onClick={() => setCurrentPage(i + 1)}>
                    {i + 1}
                  </Button>
                ))}
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      )}
      </>
      )}

      {/* Work Orders Tab */}
      {activeTab === "work-orders" && <WorkOrdersContent />}

      {/* Parts Tab */}
      {activeTab === "parts" && <PartsContent />}

      {/* Corrective Actions Tab */}
      {activeTab === "corrective-actions" && <CorrectiveActionsContent />}

      {/* Alerts Tab Content */}
      {activeTab === "alerts" && (
        <>
        {/* Alerts KPIs */}
        <div className="grid gap-4 sm:grid-cols-4">
          <KPICard
            title="Critical"
            value={criticalAlerts.length}
            icon={AlertTriangle}
            onClick={() => setAlertSeverityFilter(alertSeverityFilter === "critical" ? "" : "critical")}
            active={alertSeverityFilter === "critical"}
          />
          <KPICard
            title="Warning"
            value={warningAlerts.length}
            icon={Clock}
            onClick={() => setAlertSeverityFilter(alertSeverityFilter === "warning" ? "" : "warning")}
            active={alertSeverityFilter === "warning"}
          />
          <KPICard
            title="Info"
            value={infoAlerts.length}
            icon={CheckCircle}
            onClick={() => setAlertSeverityFilter(alertSeverityFilter === "info" ? "" : "info")}
            active={alertSeverityFilter === "info"}
          />
          <KPICard
            title="Upcoming (30d)"
            value={upcomingAlerts.length}
            icon={Calendar}
            onClick={() => setAlertSeverityFilter(alertSeverityFilter === "upcoming" ? "" : "upcoming")}
            active={alertSeverityFilter === "upcoming"}
          />
        </div>

        {/* Alerts List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {filteredAlerts.length} {alertSeverityFilter ? alertSeverityFilter.charAt(0).toUpperCase() + alertSeverityFilter.slice(1) : "Active"} Alert{filteredAlerts.length !== 1 ? "s" : ""}
              {alertSeverityFilter && (
                <Button variant="ghost" size="sm" className="ml-2 h-6 px-2 text-xs" onClick={() => setAlertSeverityFilter("")}>
                  Clear filter
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredAlerts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-3 text-success" />
                <p className="font-medium">All Clear</p>
                <p className="text-sm">No {alertSeverityFilter || "active"} alerts</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 font-medium">Asset</th>
                      <th className="pb-2 font-medium">Type</th>
                      <th className="pb-2 font-medium">Due Date</th>
                      <th className="pb-2 font-medium">Severity</th>
                      <th className="pb-2 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAlerts.map((alert) => {
                      const asset = assets.find(a => a.id === alert.asset_id);
                      return (
                        <tr key={alert.id} className="border-b last:border-0">
                          <td className="py-2">{asset?.name || "Unknown asset"}</td>
                          <td className="py-2">{alert.title}</td>
                          <td className="py-2">{formatDate(alert.due_date)}</td>
                          <td className="py-2 capitalize">{alert.severity}</td>
                          <td className="py-2">
                            <Link
                              href={alert.asset_id ? `/${company}/dashboard/assets/${alert.asset_id}` : "#"}
                              className="text-primary hover:underline flex items-center gap-1"
                            >
                              <Eye className="h-4 w-4" />
                              View
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
        </>
      )}

      {/* Add Asset Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowAddModal(false)} />
          <div className="relative z-50 w-full max-w-lg rounded-xl bg-background p-6 shadow-xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Add New Asset</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowAddModal(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
              <Label htmlFor="name">{t("assets.labels.name")} *</Label>
                  <Input
                    id="name"
                    value={newAsset.name}
                    onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })}
                    placeholder="e.g., Forklift #12"
                    className="mt-1"
                  />
                </div>
                <div>
              <Label htmlFor="serial">{t("assets.labels.serialNumber")}</Label>
                  <Input
                    id="serial"
                    value={newAsset.serial_number}
                    onChange={(e) => setNewAsset({ ...newAsset, serial_number: e.target.value })}
                    placeholder="e.g., SN-12345"
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="category">{t("assets.labels.category")} *</Label>
                <select
                  id="category"
                  title="Select category"
                  aria-label="Select category"
                  value={newAsset.category}
                  onChange={(e) => setNewAsset({ ...newAsset, category: e.target.value })}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {categoryOptions.map((cat) => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="asset_type">{t("assets.labels.assetType")}</Label>
                <select
                  id="asset_type"
                  title="Select asset type"
                  aria-label="Select asset type"
                  value={newAsset.asset_type}
                  onChange={(e) => setNewAsset({ ...newAsset, asset_type: e.target.value })}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="static">Static</option>
                  <option value="movable">Movable</option>
                </select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="manufacturer">{t("assets.labels.manufacturer")}</Label>
                  <Input
                    id="manufacturer"
                    value={newAsset.manufacturer}
                    onChange={(e) => setNewAsset({ ...newAsset, manufacturer: e.target.value })}
                    placeholder="e.g., Toyota"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="model">{t("assets.labels.model")}</Label>
                  <Input
                    id="model"
                    value={newAsset.model}
                    onChange={(e) => setNewAsset({ ...newAsset, model: e.target.value })}
                    placeholder="e.g., 8FGU25"
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="location">{t("assets.labels.location")}</Label>
                <select
                  id="location"
                  title="Select location"
                  aria-label="Select location"
                  value={newAsset.location_id}
                  onChange={(e) => setNewAsset({ ...newAsset, location_id: e.target.value })}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">No location assigned</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>{loc.name} ({loc.type})</option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-muted-foreground">
                  Optionally assign this asset to a specific location
                </p>
              </div>

              <div>
                <Label htmlFor="department">{t("assets.labels.department")}</Label>
                <Input
                  id="department"
                  list="asset-departments"
                  value={newAsset.department}
                  onChange={(e) => setNewAsset({ ...newAsset, department: e.target.value })}
                  placeholder="e.g., Operations"
                  className="mt-1"
                />
                <datalist id="asset-departments">
                  {departmentOptions.map((dept) => (
                    <option key={dept} value={dept} />
                  ))}
                </datalist>
              </div>

              <div>
                <Label htmlFor="purchase_date">{t("assets.labels.purchaseDate")}</Label>
                <Input
                  id="purchase_date"
                  type="date"
                  value={newAsset.purchase_date}
                  onChange={(e) => setNewAsset({ ...newAsset, purchase_date: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="warranty_expiry">{t("assets.labels.warrantyExpiry")}</Label>
                <Input
                  id="warranty_expiry"
                  type="date"
                  value={newAsset.warranty_expiry}
                  onChange={(e) => setNewAsset({ ...newAsset, warranty_expiry: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => setShowAddModal(false)}>
                {t("common.cancel")}
              </Button>
              <Button className="flex-1" onClick={handleAddAsset} disabled={!newAsset.name}>
                {t("assets.buttons.newAsset")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
