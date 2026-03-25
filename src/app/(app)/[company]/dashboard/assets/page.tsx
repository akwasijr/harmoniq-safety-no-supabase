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
  Check,
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
  Shield,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KPICard } from "@/components/ui/kpi-card";
import { SearchFilterBar } from "@/components/ui/search-filter-bar";
import { useFilterOptions } from "@/components/ui/filter-panel";
import { useCompanyData } from "@/hooks/use-company-data";
import { LoadingPage } from "@/components/ui/loading";
import { useToast } from "@/components/ui/toast";
import { useTranslation } from "@/i18n";
import { cn } from "@/lib/utils";
import { DetailTabs } from "@/components/ui/detail-tabs";
import { isWithinDateRange, DateRangeValue } from "@/lib/date-utils";

import type { Asset, Alert } from "@/types";
import { RoleGuard } from "@/components/auth/role-guard";
import { PAGINATION } from "@/lib/constants";

const ITEMS_PER_PAGE = PAGINATION.DEFAULT_PAGE_SIZE;

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
  const [stableNow] = React.useState(() => Date.now());

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
    condition: "good" as string,
    location_id: "",
    purchase_date: "",
    asset_type: "static",
    department: "",
    warranty_expiry: "",
    criticality: "medium" as string,
    parent_asset_id: "",
    purchase_cost: "",
    currency: "USD",
    expected_life_years: "",
    installation_date: "",
    requires_certification: false,
    maintenance_frequency_days: "",
    safety_instructions: "",
  });

  // Wizard step tracking
  const [wizardStep, setWizardStep] = React.useState(0);
  const wizardSteps = [
    { id: "basic", titleKey: "assets.wizard.basic", descKey: "assets.wizard.basicDesc", icon: Package },
    { id: "technical", titleKey: "assets.wizard.technical", descKey: "assets.wizard.technicalDesc", icon: Wrench },
    { id: "location", titleKey: "assets.wizard.location", descKey: "assets.wizard.locationDesc", icon: MapPin },
    { id: "lifecycle", titleKey: "assets.wizard.lifecycle", descKey: "assets.wizard.lifecycleDesc", icon: Calendar },
    { id: "compliance", titleKey: "assets.wizard.compliance", descKey: "assets.wizard.complianceDesc", icon: Shield },
  ] as const;

  const { assets, locations, users, stores } = useCompanyData();
  const { isLoading, add: addAsset } = stores.assets;
  const { toast } = useToast();
  const { t, formatDate } = useTranslation();
  const filterOptions = useFilterOptions();

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
      const existingAssetTags = new Set(assets.map((asset) => asset.asset_tag));
      let imported = 0;
      for (let i = 1; i < lines.length; i++) {
        const vals = lines[i].match(/(".*?"|[^,]*)/g)?.map(v => v.replace(/^"|"$/g, "").replace(/""/g, '"').trim()) || [];
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => { row[h] = vals[idx] || ""; });
        if (!row.name) continue;
        const requestedAssetTag = row.asset_tag?.trim();
        const assetTag = requestedAssetTag && !existingAssetTags.has(requestedAssetTag)
          ? requestedAssetTag
          : `AST-${Date.now()}-${i}`;
        existingAssetTags.add(assetTag);
        addAsset({
          id: `asset_import_${Date.now()}_${i}`,
          company_id: company || "",
          location_id: row.location_id || null,
          parent_asset_id: null,
          is_system: false,
          name: row.name,
          asset_tag: assetTag,
          serial_number: row.serial_number || null,
          qr_code: null,
          category: (row.category as Asset["category"]) || "other",
          sub_category: null,
          asset_type: (row.asset_type as Asset["asset_type"]) || "static",
          criticality: "medium",
          department: row.department || null,
          manufacturer: row.manufacturer || null,
          model: row.model || null,
          purchase_date: row.purchase_date || null,
          installation_date: null,
          warranty_expiry: row.warranty_expiry || null,
          expected_life_years: null,
          condition: (row.condition as Asset["condition"]) || "good",
          last_condition_assessment: null,
          purchase_cost: row.purchase_cost ? parseFloat(row.purchase_cost) : null,
          current_value: null, depreciation_rate: null, currency: "USD",
          maintenance_frequency_days: null, last_maintenance_date: null,
          next_maintenance_date: null,
          requires_certification: false,
          safety_instructions: null,
          status: (row.status as Asset["status"]) || "active",
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
    const now = new Date(stableNow);
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
  }, [assets, stableNow, formatDate]);

  // Alerts - active (not dismissed/resolved)
  const activeAlerts = computedAlerts.filter(a => !a.is_dismissed && !a.is_resolved);
  const criticalAlerts = activeAlerts.filter(a => a.severity === "critical");
  const warningAlerts = activeAlerts.filter(a => a.severity === "warning");
  const infoAlerts = activeAlerts.filter(a => a.severity === "info");
  
  // Upcoming alerts (due within next 30 days)
  const today = new Date(stableNow);
  const thirtyDaysFromNow = new Date(stableNow + 30 * 24 * 60 * 60 * 1000);
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
  const filteredAssets = React.useMemo(() => assets.filter((asset) => {
    const matchesSearch = searchQuery === "" || 
      asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (asset.serial_number?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (asset.asset_tag?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesStatus = statusFilter === "" || asset.status === statusFilter;
    const matchesCategory = categoryFilter === "" || asset.category === categoryFilter;
    const matchesLocation = locationFilter === "" || asset.location_id === locationFilter;
    const matchesDate = asset.purchase_date ? isWithinDateRange(asset.purchase_date, dateRange as DateRangeValue) : true;
    return matchesSearch && matchesStatus && matchesCategory && matchesLocation && matchesDate;
  }), [assets, searchQuery, statusFilter, categoryFilter, locationFilter, dateRange]);

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

  const avgHealthScore = React.useMemo(() => {
    const activeAssets = filteredAssets.filter(a => a.status !== "retired");
    if (activeAssets.length === 0) return 0;
    const conditionScores: Record<string, number> = { excellent: 100, good: 80, fair: 60, poor: 40, failed: 10 };
    return Math.round(
      activeAssets.reduce((sum, asset) => {
        const statusPenalty = asset.status === "active" ? 0 : asset.status === "maintenance" ? -10 : -30;
        return sum + (conditionScores[asset.condition] || 60) + statusPenalty;
      }, 0) / activeAssets.length
    );
  }, [filteredAssets]);

  const filters = [
    {
      id: "status",
      label: t("assets.allStatuses"),
      options: filterOptions.assetStatus,
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
      parent_asset_id: newAsset.parent_asset_id || null,
      is_system: false,
      name: newAsset.name,
      asset_tag: `AST-${Date.now().toString().slice(-6)}`,
      serial_number: newAsset.serial_number || null,
      qr_code: null,
      category: newAsset.category as Asset["category"],
      sub_category: null,
      asset_type: newAsset.asset_type as Asset["asset_type"],
      criticality: (newAsset.criticality as Asset["criticality"]) || "medium",
      department: newAsset.department || null,
      manufacturer: newAsset.manufacturer || null,
      model: newAsset.model || null,
      purchase_date: newAsset.purchase_date || null,
      installation_date: newAsset.installation_date || null,
      warranty_expiry: newAsset.warranty_expiry || null,
      expected_life_years: newAsset.expected_life_years ? parseInt(newAsset.expected_life_years) : null,
      condition: (newAsset.condition as Asset["condition"]) || "good",
      last_condition_assessment: null,
      purchase_cost: newAsset.purchase_cost ? parseFloat(newAsset.purchase_cost) : null,
      current_value: null,
      depreciation_rate: null,
      currency: (newAsset.currency as Asset["currency"]) || "USD",
      maintenance_frequency_days: newAsset.maintenance_frequency_days ? parseInt(newAsset.maintenance_frequency_days) : null,
      last_maintenance_date: null,
      next_maintenance_date: null,
      requires_certification: newAsset.requires_certification,
      safety_instructions: newAsset.safety_instructions || null,
      status: "active",
      created_at: now,
      updated_at: now,
    };
    addAsset(asset);
    toast("Asset added successfully");
    setShowAddModal(false);
    setWizardStep(0);
    setNewAsset({
      name: "",
      serial_number: "",
      category: "machinery",
      manufacturer: "",
      model: "",
      condition: "good",
      location_id: "",
      purchase_date: "",
      asset_type: "static",
      department: "",
      warranty_expiry: "",
      criticality: "medium",
      parent_asset_id: "",
      purchase_cost: "",
      currency: "USD",
      expected_life_years: "",
      installation_date: "",
      requires_certification: false,
      maintenance_frequency_days: "",
      safety_instructions: "",
    });
    setCurrentPage(1);
  };

  if (isLoading) {
    return <LoadingPage />;
  }

  return (
    <RoleGuard allowedRoles={["manager", "company_admin", "super_admin"]}>
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
          <KPICard
            title={t("assets.avgHealthScore")}
            value={`${avgHealthScore}%`}
            description={t("assets.avgHealthScoreDesc")}
            icon={Activity}
            className={avgHealthScore > 80 ? "border-green-200 dark:border-green-900" : avgHealthScore >= 50 ? "border-amber-200 dark:border-amber-900" : "border-red-200 dark:border-red-900"}
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
        </CardContent>
      </Card>
      )}
      </>
      )}

      {/* Work Orders Tab */}
      {activeTab === "work-orders" && (
        <div className="text-center py-12">
          <Wrench className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground mb-4">View and manage work orders for this asset</p>
          <Link href={`/${company}/dashboard/work-orders`}>
            <Button>Go to Work Orders</Button>
          </Link>
        </div>
      )}

      {/* Parts Tab */}
      {activeTab === "parts" && (
        <div className="text-center py-12">
          <Box className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground mb-4">View and manage parts inventory</p>
          <Link href={`/${company}/dashboard/parts`}>
            <Button>Go to Parts</Button>
          </Link>
        </div>
      )}

      {/* Corrective Actions Tab */}
      {activeTab === "corrective-actions" && (
        <div className="text-center py-12">
          <ClipboardList className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground mb-4">View and manage corrective actions</p>
          <Link href={`/${company}/dashboard/corrective-actions`}>
            <Button>Go to Corrective Actions</Button>
          </Link>
        </div>
      )}

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
                              href={`/${company}/dashboard/assets/${alert.asset_id}`}
                              className={`text-primary hover:underline flex items-center gap-1 ${!alert.asset_id ? "pointer-events-none opacity-50" : ""}`}
                              aria-disabled={!alert.asset_id}
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

      {/* Add Asset Modal - Multi-step Wizard */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => { setShowAddModal(false); setWizardStep(0); }} />
          <div className="relative z-50 w-full max-w-2xl rounded-xl bg-background p-6 shadow-xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-semibold">{t("assets.buttons.newAsset")}</h2>
              <Button variant="ghost" size="icon" onClick={() => { setShowAddModal(false); setWizardStep(0); }}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mb-5">
              {t("assets.wizard.step", { current: String(wizardStep + 1), total: String(wizardSteps.length) })}: {t(wizardSteps[wizardStep].descKey)}
            </p>

            {/* Progress indicator */}
            <div className="flex items-center gap-2 mb-6">
              {wizardSteps.map((step, i) => {
                const StepIcon = step.icon;
                return (
                  <React.Fragment key={step.id}>
                    <button
                      type="button"
                      onClick={() => { if (i < wizardStep) setWizardStep(i); }}
                      className={cn(
                        "flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors",
                        i < wizardStep
                          ? "bg-primary text-primary-foreground cursor-pointer hover:bg-primary/90"
                          : i === wizardStep
                          ? "bg-primary text-primary-foreground ring-2 ring-primary/30"
                          : "bg-muted text-muted-foreground cursor-default"
                      )}
                      aria-label={t(step.titleKey)}
                      title={t(step.titleKey)}
                    >
                      {i < wizardStep ? <Check className="h-4 w-4" /> : <StepIcon className="h-4 w-4" />}
                    </button>
                    {i < wizardSteps.length - 1 && (
                      <div className={cn("h-0.5 flex-1 rounded-full transition-colors", i < wizardStep ? "bg-primary" : "bg-muted")} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Step 1: Basic Info */}
            {wizardStep === 0 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">{t("assets.labels.name")} *</Label>
                  <Input
                    id="name"
                    value={newAsset.name}
                    onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })}
                    placeholder={t("assets.placeholders.assetName")}
                    className="mt-1"
                    autoFocus
                    maxLength={200}
                  />
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
                <div className="grid gap-4 sm:grid-cols-2">
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
                  <div>
                    <Label htmlFor="serial">{t("assets.labels.serialNumber")}</Label>
                    <Input
                      id="serial"
                      value={newAsset.serial_number}
                      onChange={(e) => setNewAsset({ ...newAsset, serial_number: e.target.value })}
                      placeholder={t("assets.placeholders.serialNumber")}
                      className="mt-1"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="criticality">Criticality</Label>
                  <select
                    id="criticality"
                    title="Select criticality"
                    aria-label="Select criticality"
                    value={newAsset.criticality}
                    onChange={(e) => setNewAsset({ ...newAsset, criticality: e.target.value })}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>
            )}

            {/* Step 2: Technical Details */}
            {wizardStep === 1 && (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="manufacturer">{t("assets.labels.manufacturer")}</Label>
                    <Input
                      id="manufacturer"
                      value={newAsset.manufacturer}
                      onChange={(e) => setNewAsset({ ...newAsset, manufacturer: e.target.value })}
                      placeholder={t("assets.placeholders.manufacturer")}
                      className="mt-1"
                      autoFocus
                      maxLength={100}
                    />
                  </div>
                  <div>
                    <Label htmlFor="model">{t("assets.labels.model")}</Label>
                    <Input
                      id="model"
                      value={newAsset.model}
                      onChange={(e) => setNewAsset({ ...newAsset, model: e.target.value })}
                      placeholder={t("assets.placeholders.model")}
                      className="mt-1"
                      maxLength={100}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="condition">Condition</Label>
                  <select
                    id="condition"
                    title="Select condition"
                    aria-label="Select condition"
                    value={newAsset.condition}
                    onChange={(e) => setNewAsset({ ...newAsset, condition: e.target.value })}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="new">New</option>
                    <option value="good">Good</option>
                    <option value="fair">Fair</option>
                    <option value="poor">Poor</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>
            )}

            {/* Step 3: Location & Assignment */}
            {wizardStep === 2 && (
              <div className="space-y-4">
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
                    placeholder={t("assets.placeholders.department")}
                    className="mt-1"
                  />
                  <datalist id="asset-departments">
                    {departmentOptions.map((dept) => (
                      <option key={dept} value={dept} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <Label htmlFor="parent_asset">Parent Asset</Label>
                  <select
                    id="parent_asset"
                    title="Select parent asset"
                    aria-label="Select parent asset"
                    value={newAsset.parent_asset_id}
                    onChange={(e) => setNewAsset({ ...newAsset, parent_asset_id: e.target.value })}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">None (top-level asset)</option>
                    {assets.filter(a => a.status !== "retired").map((a) => (
                      <option key={a.id} value={a.id}>{a.name} ({a.asset_tag})</option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Link this asset as a component of another asset
                  </p>
                </div>
              </div>
            )}

            {/* Step 4: Lifecycle & Financial */}
            {wizardStep === 3 && (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
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
                    <Label htmlFor="installation_date">Installation Date</Label>
                    <Input
                      id="installation_date"
                      type="date"
                      value={newAsset.installation_date}
                      onChange={(e) => setNewAsset({ ...newAsset, installation_date: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="purchase_cost">Purchase Cost</Label>
                    <Input
                      id="purchase_cost"
                      type="number"
                      min="0"
                      step="0.01"
                      value={newAsset.purchase_cost}
                      onChange={(e) => setNewAsset({ ...newAsset, purchase_cost: e.target.value })}
                      placeholder="0.00"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="currency">Currency</Label>
                    <select
                      id="currency"
                      title="Select currency"
                      aria-label="Select currency"
                      value={newAsset.currency}
                      onChange={(e) => setNewAsset({ ...newAsset, currency: e.target.value })}
                      className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="SEK">SEK</option>
                      <option value="GBP">GBP</option>
                    </select>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
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
                  <div>
                    <Label htmlFor="expected_life_years">Expected Life (years)</Label>
                    <Input
                      id="expected_life_years"
                      type="number"
                      min="0"
                      value={newAsset.expected_life_years}
                      onChange={(e) => setNewAsset({ ...newAsset, expected_life_years: e.target.value })}
                      placeholder="e.g., 10"
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Compliance */}
            {wizardStep === 4 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">Requires Certification</p>
                    <p className="text-xs text-muted-foreground">Asset needs active certification to operate</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={newAsset.requires_certification}
                    onClick={() => setNewAsset({ ...newAsset, requires_certification: !newAsset.requires_certification })}
                    className={cn(
                      "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                      newAsset.requires_certification ? "bg-primary" : "bg-muted"
                    )}
                  >
                    <span className={cn(
                      "pointer-events-none inline-block h-5 w-5 rounded-full bg-background shadow-lg transition-transform",
                      newAsset.requires_certification ? "translate-x-5" : "translate-x-0"
                    )} />
                  </button>
                </div>
                <div>
                  <Label htmlFor="maintenance_frequency">Maintenance Frequency (days)</Label>
                  <Input
                    id="maintenance_frequency"
                    type="number"
                    min="1"
                    value={newAsset.maintenance_frequency_days}
                    onChange={(e) => setNewAsset({ ...newAsset, maintenance_frequency_days: e.target.value })}
                    placeholder="e.g., 90"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="safety_instructions">{t("assets.safetyInstructions")}</Label>
                  <textarea
                    id="safety_instructions"
                    value={newAsset.safety_instructions}
                    onChange={(e) => setNewAsset({ ...newAsset, safety_instructions: e.target.value })}
                    placeholder="Required PPE, hazard warnings, operating procedures..."
                    rows={3}
                    maxLength={2000}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
                  />
                  <p className="text-xs text-muted-foreground text-right mt-1">{newAsset.safety_instructions.length}/2000</p>
                </div>
              </div>
            )}

            {/* Navigation buttons */}
            <div className="flex gap-3 mt-6 pt-4 border-t">
              {wizardStep === 0 ? (
                <Button variant="outline" className="flex-1" onClick={() => { setShowAddModal(false); setWizardStep(0); }}>
                  {t("common.cancel")}
                </Button>
              ) : (
                <Button variant="outline" className="flex-1" onClick={() => setWizardStep(wizardStep - 1)}>
                  {t("assets.wizard.back")}
                </Button>
              )}
              {wizardStep < wizardSteps.length - 1 ? (
                <Button
                  className="flex-1"
                  onClick={() => setWizardStep(wizardStep + 1)}
                  disabled={wizardStep === 0 && (!newAsset.name.trim() || !newAsset.category)}
                >
                  {t("assets.wizard.next")}
                </Button>
              ) : (
                <Button className="flex-1" onClick={handleAddAsset} disabled={!newAsset.name.trim()}>
                  {t("assets.wizard.create")}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
    </RoleGuard>
  );
}
