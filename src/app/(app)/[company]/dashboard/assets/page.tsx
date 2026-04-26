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
  DollarSign,
  Search,
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
import { NoDataEmptyState } from "@/components/ui/empty-state";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCompanyData } from "@/hooks/use-company-data";
import { useAuth } from "@/hooks/use-auth";
import { LoadingPage } from "@/components/ui/loading";
import { useToast } from "@/components/ui/toast";
import { useTranslation } from "@/i18n";
import { cn, capitalize } from "@/lib/utils";
import { WORK_ORDER_STATUS_COLORS } from "@/lib/status-utils";
import { DetailTabs } from "@/components/ui/detail-tabs";
import { isWithinDateRange, DateRangeValue } from "@/lib/date-utils";
import { downloadCsv, parseCsv, downloadCsvTemplate } from "@/lib/csv";

import type { Asset, Alert, WorkOrder, CorrectiveAction, Part, Priority, Severity } from "@/types";
import { WORK_ORDER_TYPES } from "@/types";
import { formatStatusLabel } from "@/components/tasks/task-detail-header";
import { getUserFirstLastName, getAssetDisplayName } from "@/lib/status-utils";
import { RoleGuard } from "@/components/auth/role-guard";
import { PAGINATION } from "@/lib/constants";

const ITEMS_PER_PAGE = PAGINATION.DEFAULT_PAGE_SIZE;

/* ── Asset CSV import helpers ── */
const ASSET_COLUMN_ALIASES: Record<string, string> = {
  // Name
  "asset_name": "name", "asset name": "name", "equipment_name": "name", "equipment name": "name",
  "machine_name": "name", "machine name": "name", "item_name": "name", "item name": "name",
  // Tag
  "asset_tag": "asset_tag", "asset tag": "asset_tag", "tag": "asset_tag", "asset_id": "asset_tag",
  "asset id": "asset_tag", "equipment_id": "asset_tag", "equipment id": "asset_tag", "barcode": "asset_tag",
  // Serial
  "serial_number": "serial_number", "serial number": "serial_number", "serial": "serial_number", "sn": "serial_number",
  // Category
  "asset_category": "category", "asset category": "category", "equipment_type": "category",
  "equipment type": "category", "type": "category",
  // Status
  "asset_status": "status", "asset status": "status",
  // Condition
  "asset_condition": "condition", "asset condition": "condition",
  // Manufacturer
  "make": "manufacturer", "brand": "manufacturer", "oem": "manufacturer",
  // Department
  "dept": "department", "dept.": "department", "cost_center": "department", "cost center": "department",
  // Cost
  "cost": "purchase_cost", "price": "purchase_cost", "purchase_price": "purchase_cost",
  "purchase price": "purchase_cost", "acquisition_cost": "purchase_cost",
  // Location
  "site": "location", "building": "location", "location_name": "location", "location name": "location",
  // Dates
  "purchase_date": "purchase_date", "purchase date": "purchase_date", "acquired_date": "purchase_date",
  "warranty_expiry": "warranty_expiry", "warranty expiry": "warranty_expiry", "warranty_end": "warranty_expiry",
  "warranty end": "warranty_expiry", "warranty_date": "warranty_expiry",
};

const ASSET_CATEGORY_ALIASES: Record<string, string> = {
  "machine": "machinery", "machines": "machinery",
  "car": "vehicle", "truck": "vehicle", "fleet": "vehicle", "vehicles": "vehicle",
  "tools": "tool", "hand tool": "tool", "power tool": "tool",
  "ppe": "ppe", "safety": "safety_equipment", "safety gear": "safety_equipment",
  "electric": "electrical", "electronics": "electrical",
  "hvac": "hvac", "heating": "hvac", "cooling": "hvac", "air conditioning": "hvac",
  "plumbing": "plumbing", "pipe": "plumbing", "pipes": "plumbing",
  "fire": "fire_safety", "fire safety": "fire_safety", "fire equipment": "fire_safety",
  "crane": "lifting_equipment", "hoist": "lifting_equipment", "forklift": "lifting_equipment", "lift": "lifting_equipment",
  "boiler": "pressure_vessel", "tank": "pressure_vessel", "compressor": "pressure_vessel",
};

const VALID_ASSET_CATEGORIES = ["machinery", "vehicle", "safety_equipment", "tool", "electrical", "hvac", "plumbing", "fire_safety", "lifting_equipment", "pressure_vessel", "ppe", "other"];
const VALID_ASSET_STATUSES = ["active", "inactive", "maintenance", "retired"];
const VALID_ASSET_CONDITIONS = ["excellent", "good", "fair", "poor", "failed"];

function mapAssetImportColumns(data: { headers: string[]; rows: Record<string, string>[] }) {
  const headerMap: Record<string, string> = {};
  data.headers.forEach((h) => {
    const lower = h.toLowerCase().trim();
    headerMap[h] = ASSET_COLUMN_ALIASES[lower] || lower.replace(/\s+/g, "_");
  });

  const mappedRows = data.rows.map((row) => {
    const mapped: Record<string, string> = {};
    for (const [key, value] of Object.entries(row)) {
      mapped[headerMap[key] || key] = value;
    }
    if (mapped.category) {
      const lower = mapped.category.toLowerCase().trim();
      mapped.category = ASSET_CATEGORY_ALIASES[lower] || lower.replace(/\s+/g, "_");
    }
    if (mapped.status) mapped.status = mapped.status.toLowerCase().trim();
    if (mapped.condition) mapped.condition = mapped.condition.toLowerCase().trim();
    return mapped;
  });

  return { headers: data.headers.map((h) => headerMap[h]), rows: mappedRows };
}

function AssetImportPreview({ importData, assets: existing, companyId, addAsset, toast, onBack, onDone }: {
  importData: { headers: string[]; rows: Record<string, string>[] };
  assets: Asset[];
  companyId: string;
  addAsset: (a: Asset) => void;
  toast: (msg: string, type?: "success" | "error" | "info") => void;
  onBack: () => void;
  onDone: () => void;
}) {
  const [rows, setRows] = React.useState(() => importData.rows.map((r) => ({ ...r })));
  const existingTags = React.useMemo(() => new Set(existing.map((a) => a.asset_tag)), [existing]);

  const updateCell = (idx: number, field: string, value: string) => {
    setRows((prev) => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  };
  const removeRow = (idx: number) => {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  };

  const validated = rows.map((row, i) => {
    const errors: string[] = [];
    const warnings: string[] = [];
    if (!row.name?.trim()) errors.push("Missing name");
    if (row.asset_tag && existingTags.has(row.asset_tag.trim())) warnings.push("Duplicate tag");
    if (row.category && !VALID_ASSET_CATEGORIES.includes(row.category.toLowerCase().trim())) warnings.push("Unknown category");
    if (row.status && !VALID_ASSET_STATUSES.includes(row.status.toLowerCase().trim())) warnings.push("Unknown status");
    return { row, index: i, errors, warnings, valid: errors.length === 0 };
  });

  const validCount = validated.filter((v) => v.valid).length;
  const errorCount = validated.filter((v) => !v.valid).length;

  const handleImport = () => {
    const now = new Date();
    const usedTags = new Set(existingTags);
    let imported = 0;
    validated.forEach((v, idx) => {
      if (!v.valid) return;
      const row = v.row;
      const category = (VALID_ASSET_CATEGORIES.includes((row.category || "").toLowerCase()) ? row.category.toLowerCase() : "other") as Asset["category"];
      const status = (VALID_ASSET_STATUSES.includes((row.status || "").toLowerCase()) ? row.status.toLowerCase() : "active") as Asset["status"];
      const condition = (VALID_ASSET_CONDITIONS.includes((row.condition || "").toLowerCase()) ? row.condition.toLowerCase() : "good") as Asset["condition"];
      let tag = row.asset_tag?.trim();
      if (!tag || usedTags.has(tag)) tag = `AST-${Date.now()}-${idx}`;
      usedTags.add(tag);

      const asset: Asset = {
        id: crypto.randomUUID(),
        company_id: companyId,
        location_id: null,
        parent_asset_id: null,
        is_system: false,
        name: row.name.trim(),
        asset_tag: tag,
        serial_number: row.serial_number || null,
        qr_code: null,
        category,
        sub_category: null,
        asset_type: (row.asset_type === "movable" ? "movable" : "static") as Asset["asset_type"],
        criticality: "medium",
        department: row.department || null,
        manufacturer: row.manufacturer || null,
        model: row.model || null,
        purchase_date: row.purchase_date || null,
        installation_date: null,
        warranty_expiry: row.warranty_expiry || null,
        expected_life_years: null,
        condition,
        last_condition_assessment: null,
        purchase_cost: row.purchase_cost ? parseFloat(row.purchase_cost) : null,
        current_value: null,
        depreciation_rate: null,
        currency: "USD",
        maintenance_frequency_days: null,
        last_maintenance_date: null,
        next_maintenance_date: null,
        requires_certification: false,
        safety_instructions: null,
        status,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      };
      addAsset(asset);
      imported++;
    });
    toast(`${imported} assets imported${errorCount > 0 ? `, ${errorCount} skipped` : ""}`);
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
              <th className="px-1.5 py-1 text-left font-medium">Name</th>
              <th className="px-1.5 py-1 text-left font-medium w-28">Category</th>
              <th className="px-1.5 py-1 text-left font-medium w-20">Status</th>
              <th className="px-1.5 py-1 text-left font-medium w-16">Result</th>
              <th className="px-1.5 py-1 w-6"></th>
            </tr>
          </thead>
          <tbody>
            {validated.map((v) => (
              <tr key={v.index} className={`border-t ${!v.valid ? "bg-destructive/5" : ""}`}>
                <td className="px-1.5 py-1 text-muted-foreground">{v.index + 1}</td>
                <td className="px-1.5 py-1">
                  <input
                    className={`w-full bg-transparent border-0 outline-none text-xs ${!v.row.name?.trim() ? "border-b border-destructive" : ""}`}
                    value={v.row.name || ""}
                    onChange={(e) => updateCell(v.index, "name", e.target.value)}
                    placeholder="Required"
                  />
                </td>
                <td className="px-1.5 py-1">
                  <select
                    className="w-full bg-transparent border-0 outline-none text-xs"
                    value={VALID_ASSET_CATEGORIES.includes((v.row.category || "").toLowerCase()) ? v.row.category.toLowerCase() : "other"}
                    onChange={(e) => updateCell(v.index, "category", e.target.value)}
                  >
                    {VALID_ASSET_CATEGORIES.map((c) => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
                  </select>
                </td>
                <td className="px-1.5 py-1">
                  <select
                    className="w-full bg-transparent border-0 outline-none text-xs"
                    value={VALID_ASSET_STATUSES.includes((v.row.status || "").toLowerCase()) ? v.row.status.toLowerCase() : "active"}
                    onChange={(e) => updateCell(v.index, "status", e.target.value)}
                  >
                    {VALID_ASSET_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
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

  // Work Orders tab state
  const [woSearch, setWoSearch] = React.useState("");
  const [woStatusFilter, setWoStatusFilter] = React.useState("all");
  const [woTypeFilter, setWoTypeFilter] = React.useState("all");
  const [woPage, setWoPage] = React.useState(1);
  const [showWoCreate, setShowWoCreate] = React.useState(false);
  const [woForm, setWoForm] = React.useState({ title: "", description: "", asset_id: "", type: "service_request", priority: "medium" as Priority, due_date: "" });

  // Parts tab state
  const [partsSearch, setPartsSearch] = React.useState("");
  const [partsPage, setPartsPage] = React.useState(1);
  const [showPartsCreate, setShowPartsCreate] = React.useState(false);
  const [partsForm, setPartsForm] = React.useState({ name: "", part_number: "", unit_cost: "", quantity_in_stock: "", minimum_stock: "", supplier: "" });

  // Corrective Actions tab state
  const [caSearch, setCaSearch] = React.useState("");
  const [caStatusFilter, setCaStatusFilter] = React.useState("all");
  const [caPage, setCaPage] = React.useState(1);
  const [showCaCreate, setShowCaCreate] = React.useState(false);
  const [caForm, setCaForm] = React.useState({ asset_id: "", description: "", severity: "medium" as Severity, due_date: "" });

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

  const { companyId, assets, locations, users, teams, workOrders, correctiveActions, parts, stores } = useCompanyData();
  const { isLoading, add: addAsset } = stores.assets;
  const { user } = useAuth();
  const { toast } = useToast();
  const { t, formatDate } = useTranslation();
  const filterOptions = useFilterOptions();

  const departmentOptions = Array.from(
    new Set(users.map((u) => u.department).filter((d): d is string => !!d))
  );

  // CSV export
  const handleExportCSV = () => {
    downloadCsv(`assets-export-${new Date().toISOString().split("T")[0]}.csv`, assets.map((a) => {
      const loc = a.location_id ? locations.find((l) => l.id === a.location_id) : null;
      return {
        name: a.name,
        asset_tag: a.asset_tag,
        serial_number: a.serial_number || "",
        category: a.category,
        asset_type: a.asset_type,
        criticality: a.criticality,
        department: a.department || "",
        status: a.status,
        condition: a.condition,
        manufacturer: a.manufacturer || "",
        model: a.model || "",
        location: loc?.name || "",
        purchase_date: a.purchase_date || "",
        purchase_cost: a.purchase_cost ?? "",
        currency: a.currency,
        warranty_expiry: a.warranty_expiry || "",
        maintenance_frequency_days: a.maintenance_frequency_days ?? "",
        last_maintenance_date: a.last_maintenance_date || "",
        next_maintenance_date: a.next_maintenance_date || "",
        created_at: a.created_at,
      };
    }));
    toast(t("assets.assetsExported"));
  };

  // CSV import state
  const [showImport, setShowImport] = React.useState(false);
  const [importData, setImportData] = React.useState<{ headers: string[]; rows: Record<string, string>[] } | null>(null);
  
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
      company_id: companyId || "",
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

  if (isLoading && assets.length === 0) {
    return <LoadingPage />;
  }

  return (
    <RoleGuard allowedRoles={["manager", "company_admin", "super_admin"]}>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div />
        <div className="flex gap-2">
          {activeTab === "assets" && (
            <>
              <Button size="sm" variant="outline" className="gap-2" onClick={() => setShowImport(true)}>
                <Upload className="h-4 w-4" />
                {t("assets.buttons.import")}
              </Button>
              <Button size="sm" variant="outline" className="gap-2" onClick={handleExportCSV}>
                <Download className="h-4 w-4" />
                {t("assets.buttons.export")}
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
                        "flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 active:bg-muted transition-colors",
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
                              "flex items-center gap-3 p-3 pl-14 hover:bg-muted/50 active:bg-muted transition-colors group",
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
                        className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 active:bg-muted transition-colors group"
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
      <>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{filteredAssets.length} asset{filteredAssets.length !== 1 ? "s" : ""}</p>
        <Button size="sm" className="gap-2" onClick={() => setShowAddModal(true)}>
          <Plus className="h-4 w-4" aria-hidden="true" /> {t("assets.buttons.newAsset")}
        </Button>
      </div>
      <Card>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-muted/40">
                <tr className="text-left">
                  <th className="px-4 py-3 font-medium">{t("assets.tabs.assets")}</th>
                  <th className="px-4 py-3 font-medium">{t("assets.labels.category")}</th>
                  <th className="hidden px-4 py-3 font-medium md:table-cell">{t("assets.labels.location")}</th>
                  <th className="hidden px-4 py-3 font-medium lg:table-cell">{t("assets.labels.purchaseDate")}</th>
                  <th className="px-4 py-3 font-medium">{t("assets.labels.status")}</th>
                  <th className="px-4 py-3 font-medium w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedAssets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">{t("assets.empty.noAssets")}</td>
                  </tr>
                ) : (
                  paginatedAssets.map((asset) => (
                    <tr 
                      key={asset.id} 
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => router.push(`/${company}/dashboard/assets/${asset.id}`)}
                    >
                      <td className="px-4 py-3">
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
                      <td className="px-4 py-3 text-xs text-muted-foreground">{capitalize(asset.category.replace("_", " "))}</td>
                      <td className="hidden px-4 py-3 md:table-cell">
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
                      <td className="hidden px-4 py-3 lg:table-cell text-xs text-muted-foreground">
                        {asset.purchase_date ? formatDate(asset.purchase_date) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={asset.status === "active" ? "success" : asset.status === "maintenance" ? "warning" : "destructive"} className="text-xs">
                          {capitalize(asset.status.replace("_", " "))}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Eye className="h-4 w-4 text-muted-foreground" />
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
      </>
      )}

      </>
      )}

      {/* Work Orders Tab — Full inline content */}
      {activeTab === "work-orders" && (() => {
        const woFiltered = workOrders.filter((o) => {
          if (woStatusFilter !== "all" && o.status !== woStatusFilter) return false;
          if (woTypeFilter !== "all" && o.type !== woTypeFilter) return false;
          if (woSearch) {
            const q = woSearch.toLowerCase();
            const asset = o.asset_id ? assets.find((a) => a.id === o.asset_id) : null;
            return o.title.toLowerCase().includes(q) || o.description.toLowerCase().includes(q) || (asset?.name || "").toLowerCase().includes(q);
          }
          return true;
        });
        const woOpenCount = workOrders.filter((o) => ["waiting_approval", "waiting_material", "approved"].includes(o.status)).length;
        const woInProgressCount = workOrders.filter((o) => o.status === "in_progress").length;
        const woCompletedCount = workOrders.filter((o) => o.status === "completed").length;
        const woPaginated = woFiltered.slice((woPage - 1) * 10, woPage * 10);
        const handleWoCreate = () => {
          if (!woForm.title.trim() || !woForm.description.trim()) return;
          stores.workOrders.add({
            id: crypto.randomUUID(), company_id: user?.company_id || "", asset_id: woForm.asset_id || null,
            title: woForm.title.trim(), description: woForm.description.trim(), type: woForm.type as WorkOrder["type"],
            priority: woForm.priority, status: "waiting_approval", requested_by: user?.id || "",
            assigned_to: null, assigned_to_team_id: null, due_date: woForm.due_date || null,
            estimated_hours: null, actual_hours: null, parts_cost: null, labor_cost: null,
            corrective_action_id: null, completed_at: null,
            created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
          } as WorkOrder);
          toast("Work order created");
          setShowWoCreate(false);
          setWoForm({ title: "", description: "", asset_id: "", type: "service_request", priority: "medium", due_date: "" });
        };

        return (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <KPICard title="Open" value={woOpenCount} icon={ClipboardList} />
              <KPICard title="In progress" value={woInProgressCount} icon={Clock} />
              <KPICard title="Completed" value={woCompletedCount} icon={CheckCircle} />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search work orders..." className="pl-10" value={woSearch} onChange={(e) => { setWoSearch(e.target.value); setWoPage(1); }} />
              </div>
              <Select value={woStatusFilter} onValueChange={(v) => { setWoStatusFilter(v); setWoPage(1); }}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="All statuses" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {["waiting_approval", "waiting_material", "approved", "scheduled", "in_progress", "completed", "cancelled"].map((s) => (
                    <SelectItem key={s} value={s}>{formatStatusLabel(s)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={woTypeFilter} onValueChange={(v) => { setWoTypeFilter(v); setWoPage(1); }}>
                <SelectTrigger className="w-[200px]"><SelectValue placeholder="All types" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {WORK_ORDER_TYPES.map((woType) => (
                    <SelectItem key={woType} value={woType}>{formatStatusLabel(woType)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {woFiltered.length === 0 ? (
              <NoDataEmptyState entityName="work orders" onAdd={() => setShowWoCreate(true)} addLabel="New work order" />
            ) : (
              <>
                <div className="flex justify-end">
                  <Button size="sm" className="gap-2" onClick={() => setShowWoCreate(true)}>
                    <Plus className="h-4 w-4" /> New work order
                  </Button>
                </div>
                <Card>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-border text-sm">
                        <thead className="bg-muted/40">
                          <tr className="text-left">
                            <th className="px-4 py-3 font-medium">Title</th>
                            <th className="px-4 py-3 font-medium">Type</th>
                            <th className="px-4 py-3 font-medium">Asset</th>
                            <th className="px-4 py-3 font-medium">Priority</th>
                            <th className="px-4 py-3 font-medium">Status</th>
                            <th className="px-4 py-3 font-medium">Due date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {woPaginated.map((wo) => {
                            const asset = wo.asset_id ? assets.find((a) => a.id === wo.asset_id) : null;
                            return (
                              <tr key={wo.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => router.push(`/${company}/dashboard/work-orders/${wo.id}`)}>
                                <td className="px-4 py-3 font-medium">{wo.title}</td>
                                <td className="px-4 py-3 text-muted-foreground">{capitalize((wo.type || "service_request").replace(/_/g, " "))}</td>
                                <td className="px-4 py-3 text-muted-foreground">{asset?.name || "—"}</td>
                                <td className="px-4 py-3"><Badge variant={wo.priority === "critical" || wo.priority === "high" ? "destructive" : wo.priority === "medium" ? "warning" : "secondary"}>{capitalize(wo.priority)}</Badge></td>
                                <td className="px-4 py-3"><Badge variant={WORK_ORDER_STATUS_COLORS[wo.status] || "secondary"}>{capitalize(wo.status.replace(/_/g, " "))}</Badge></td>
                                <td className="px-4 py-3 text-muted-foreground">{wo.due_date ? formatDate(wo.due_date) : "—"}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                  {woFiltered.length > 10 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t">
                      <p className="text-sm text-muted-foreground">Showing {(woPage - 1) * 10 + 1}–{Math.min(woPage * 10, woFiltered.length)} of {woFiltered.length}</p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" disabled={woPage === 1} onClick={() => setWoPage((p) => p - 1)}>Previous</Button>
                        <Button size="sm" variant="outline" disabled={woPage * 10 >= woFiltered.length} onClick={() => setWoPage((p) => p + 1)}>Next</Button>
                      </div>
                    </div>
                  )}
                </Card>
              </>
            )}

            {showWoCreate && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                <Card className="w-full max-w-lg"><CardHeader className="flex flex-row items-center justify-between"><CardTitle>New work order</CardTitle><Button variant="ghost" size="icon" onClick={() => setShowWoCreate(false)} aria-label="Close"><X className="h-4 w-4" /></Button></CardHeader>
                  <CardContent className="space-y-4">
                    <div><Label>Title *</Label><Input className="mt-1" placeholder="Work order title" value={woForm.title} onChange={(e) => setWoForm((p) => ({ ...p, title: e.target.value }))} /></div>
                    <div><Label>Description *</Label><Textarea className="mt-1" placeholder="Describe the work" value={woForm.description} onChange={(e) => setWoForm((p) => ({ ...p, description: e.target.value }))} /></div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div><Label>Asset</Label><Select value={woForm.asset_id} onValueChange={(v) => setWoForm((p) => ({ ...p, asset_id: v }))}><SelectTrigger className="mt-1"><SelectValue placeholder="Select asset" /></SelectTrigger><SelectContent>{assets.filter((a) => a.status !== "retired").map((a) => (<SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>))}</SelectContent></Select></div>
                      <div><Label>Type</Label><Select value={woForm.type} onValueChange={(v) => setWoForm((p) => ({ ...p, type: v }))}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{WORK_ORDER_TYPES.map((t) => (<SelectItem key={t} value={t}>{formatStatusLabel(t)}</SelectItem>))}</SelectContent></Select></div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div><Label>Priority</Label><Select value={woForm.priority} onValueChange={(v) => setWoForm((p) => ({ ...p, priority: v as Priority }))}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{(["low", "medium", "high", "critical"] as Priority[]).map((p) => (<SelectItem key={p} value={p}>{capitalize(p)}</SelectItem>))}</SelectContent></Select></div>
                      <div><Label>Due date</Label><Input type="date" className="mt-1" value={woForm.due_date} onChange={(e) => setWoForm((p) => ({ ...p, due_date: e.target.value }))} /></div>
                    </div>
                    <div className="flex gap-2 justify-end"><Button variant="outline" onClick={() => setShowWoCreate(false)}>Cancel</Button><Button onClick={handleWoCreate} disabled={!woForm.title.trim() || !woForm.description.trim()}>Create</Button></div>
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        );
      })()}

      {/* Parts Tab — Full inline content */}
      {activeTab === "parts" && (() => {
        const partsFiltered = parts.filter((p) => {
          if (!partsSearch) return true;
          const q = partsSearch.toLowerCase();
          return p.name.toLowerCase().includes(q) || p.part_number.toLowerCase().includes(q);
        });
        const totalValue = parts.reduce((sum, p) => sum + (p.unit_cost || 0) * (p.quantity_in_stock || 0), 0);
        const lowStockCount = parts.filter((p) => (p.quantity_in_stock || 0) <= (p.minimum_stock || 0)).length;
        const partsPaginated = partsFiltered.slice((partsPage - 1) * 10, partsPage * 10);
        const handlePartsCreate = () => {
          if (!partsForm.name.trim() || !partsForm.part_number.trim()) return;
          stores.parts.add({
            id: `part_${Date.now()}`, company_id: user?.company_id || "",
            name: partsForm.name.trim(), part_number: partsForm.part_number.trim(),
            unit_cost: parseFloat(partsForm.unit_cost) || 0, quantity_in_stock: parseInt(partsForm.quantity_in_stock) || 0,
            minimum_stock: parseInt(partsForm.minimum_stock) || 0, supplier: partsForm.supplier.trim() || null,
            created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
          } as Part);
          toast("Part added"); setShowPartsCreate(false);
          setPartsForm({ name: "", part_number: "", unit_cost: "", quantity_in_stock: "", minimum_stock: "", supplier: "" });
        };

        return (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <KPICard title="Total parts" value={parts.length} icon={Package} />
              <KPICard title="Inventory value" value={`$${totalValue.toLocaleString()}`} icon={DollarSign} />
              <KPICard title="Low stock" value={lowStockCount} icon={AlertTriangle} />
            </div>

            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search parts..." className="pl-10" value={partsSearch} onChange={(e) => { setPartsSearch(e.target.value); setPartsPage(1); }} />
            </div>

            {partsFiltered.length === 0 ? (
              <NoDataEmptyState entityName="parts" onAdd={() => setShowPartsCreate(true)} addLabel="Add part" />
            ) : (
              <>
                <div className="flex justify-end">
                  <Button size="sm" className="gap-2" onClick={() => setShowPartsCreate(true)}>
                    <Plus className="h-4 w-4" /> Add part
                  </Button>
                </div>
                <Card>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-border text-sm">
                        <thead className="bg-muted/40">
                          <tr className="text-left">
                            <th className="px-4 py-3 font-medium">Part</th>
                            <th className="px-4 py-3 font-medium">Supplier</th>
                            <th className="px-4 py-3 font-medium">Unit cost</th>
                            <th className="px-4 py-3 font-medium">In stock</th>
                            <th className="px-4 py-3 font-medium">Min stock</th>
                            <th className="px-4 py-3 font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {partsPaginated.map((part) => {
                            const isLow = (part.quantity_in_stock || 0) <= (part.minimum_stock || 0);
                            return (
                              <tr key={part.id} className="hover:bg-muted/50">
                                <td className="px-4 py-3"><div className="font-medium">{part.name}</div><div className="font-mono text-xs text-muted-foreground">{part.part_number}</div></td>
                                <td className="px-4 py-3 text-muted-foreground">{part.supplier || "—"}</td>
                                <td className="px-4 py-3">${(part.unit_cost || 0).toFixed(2)}</td>
                                <td className="px-4 py-3">{part.quantity_in_stock || 0}</td>
                                <td className="px-4 py-3">{part.minimum_stock || 0}</td>
                                <td className="px-4 py-3"><Badge variant={isLow ? "warning" : "secondary"}>{isLow ? "Low stock" : "In stock"}</Badge></td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                  {partsFiltered.length > 10 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t">
                      <p className="text-sm text-muted-foreground">Showing {(partsPage - 1) * 10 + 1}–{Math.min(partsPage * 10, partsFiltered.length)} of {partsFiltered.length}</p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" disabled={partsPage === 1} onClick={() => setPartsPage((p) => p - 1)}>Previous</Button>
                        <Button size="sm" variant="outline" disabled={partsPage * 10 >= partsFiltered.length} onClick={() => setPartsPage((p) => p + 1)}>Next</Button>
                      </div>
                    </div>
                  )}
                </Card>
              </>
            )}

            {showPartsCreate && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                <Card className="w-full max-w-md"><CardHeader className="flex flex-row items-center justify-between"><CardTitle>Add part</CardTitle><Button variant="ghost" size="icon" onClick={() => setShowPartsCreate(false)} aria-label="Close"><X className="h-4 w-4" /></Button></CardHeader>
                  <CardContent className="space-y-4">
                    <div><Label>Part name *</Label><Input className="mt-1" value={partsForm.name} onChange={(e) => setPartsForm((p) => ({ ...p, name: e.target.value }))} /></div>
                    <div><Label>Part number *</Label><Input className="mt-1" value={partsForm.part_number} onChange={(e) => setPartsForm((p) => ({ ...p, part_number: e.target.value }))} /></div>
                    <div className="grid gap-4 grid-cols-2">
                      <div><Label>Unit cost</Label><Input type="number" min="0" step="0.01" className="mt-1" value={partsForm.unit_cost} onChange={(e) => setPartsForm((p) => ({ ...p, unit_cost: e.target.value }))} /></div>
                      <div><Label>Qty in stock</Label><Input type="number" min="0" className="mt-1" value={partsForm.quantity_in_stock} onChange={(e) => setPartsForm((p) => ({ ...p, quantity_in_stock: e.target.value }))} /></div>
                    </div>
                    <div className="grid gap-4 grid-cols-2">
                      <div><Label>Min stock</Label><Input type="number" min="0" className="mt-1" value={partsForm.minimum_stock} onChange={(e) => setPartsForm((p) => ({ ...p, minimum_stock: e.target.value }))} /></div>
                      <div><Label>Supplier</Label><Input className="mt-1" value={partsForm.supplier} onChange={(e) => setPartsForm((p) => ({ ...p, supplier: e.target.value }))} /></div>
                    </div>
                    <div className="flex gap-2 justify-end"><Button variant="outline" onClick={() => setShowPartsCreate(false)}>Cancel</Button><Button onClick={handlePartsCreate} disabled={!partsForm.name.trim() || !partsForm.part_number.trim()}>Add part</Button></div>
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        );
      })()}

      {/* Corrective Actions Tab — Full inline content */}
      {activeTab === "corrective-actions" && (() => {
        const caFiltered = correctiveActions.filter((a) => {
          if (caStatusFilter !== "all" && a.status !== caStatusFilter) return false;
          if (caSearch) {
            const q = caSearch.toLowerCase();
            const asset = assets.find((as) => as.id === a.asset_id);
            return a.description.toLowerCase().includes(q) || (asset?.name || "").toLowerCase().includes(q);
          }
          return true;
        });
        const caOpenCount = correctiveActions.filter((a) => a.status === "open").length;
        const caInProgressCount = correctiveActions.filter((a) => a.status === "in_progress").length;
        const caOverdueCount = correctiveActions.filter((a) => a.status !== "completed" && a.due_date && new Date(a.due_date).getTime() < stableNow).length;
        const caCompletedCount = correctiveActions.filter((a) => a.status === "completed").length;
        const caPaginated = caFiltered.slice((caPage - 1) * 10, caPage * 10);
        const handleCaCreate = () => {
          if (!caForm.asset_id || !caForm.description.trim() || !caForm.due_date) return;
          stores.correctiveActions.add({
            id: `ca_${crypto.randomUUID().slice(0, 8)}`, company_id: user?.company_id || "",
            asset_id: caForm.asset_id, inspection_id: null, description: caForm.description.trim(),
            severity: caForm.severity, assigned_to: null, assigned_to_team_id: null,
            due_date: caForm.due_date, status: "open", resolution_notes: null, completed_at: null,
            created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
          } as CorrectiveAction);
          toast("Corrective action created"); setShowCaCreate(false);
          setCaForm({ asset_id: "", description: "", severity: "medium", due_date: "" });
        };

        return (
          <>
            <div className="grid gap-4 sm:grid-cols-4">
              <KPICard title="Open" value={caOpenCount} icon={ClipboardList} />
              <KPICard title="In progress" value={caInProgressCount} icon={Clock} />
              <KPICard title="Overdue" value={caOverdueCount} icon={AlertTriangle} />
              <KPICard title="Completed" value={caCompletedCount} icon={CheckCircle} />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search actions..." className="pl-10" value={caSearch} onChange={(e) => { setCaSearch(e.target.value); setCaPage(1); }} />
              </div>
              <Select value={caStatusFilter} onValueChange={(v) => { setCaStatusFilter(v); setCaPage(1); }}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="All statuses" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {caFiltered.length === 0 ? (
              <NoDataEmptyState entityName="corrective actions" onAdd={() => setShowCaCreate(true)} addLabel="New action" />
            ) : (
              <>
                <div className="flex justify-end">
                  <Button size="sm" className="gap-2" onClick={() => setShowCaCreate(true)}>
                    <Plus className="h-4 w-4" /> New action
                  </Button>
                </div>
                <Card>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-border text-sm">
                        <thead className="bg-muted/40">
                          <tr className="text-left">
                            <th className="px-4 py-3 font-medium">Description</th>
                            <th className="px-4 py-3 font-medium">Asset</th>
                            <th className="px-4 py-3 font-medium">Severity</th>
                            <th className="px-4 py-3 font-medium">Status</th>
                            <th className="px-4 py-3 font-medium">Due date</th>
                            <th className="px-4 py-3 font-medium sr-only">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {caPaginated.map((action) => {
                            const asset = action.asset_id ? assets.find((a) => a.id === action.asset_id) : null;
                            const isOverdue = action.due_date && action.status !== "completed" && new Date(action.due_date).getTime() < stableNow;
                            return (
                              <tr key={action.id} className={cn("hover:bg-muted/50 cursor-pointer", isOverdue && "border-l-2 border-l-destructive")} onClick={() => router.push(`/${company}/dashboard/corrective-actions/${action.id}`)}>
                                <td className="px-4 py-3 font-medium max-w-xs truncate">{action.description}</td>
                                <td className="px-4 py-3 text-muted-foreground">{asset?.name || "—"}</td>
                                <td className="px-4 py-3"><Badge variant={action.severity === "critical" || action.severity === "high" ? "destructive" : action.severity === "medium" ? "warning" : "secondary"}>{capitalize(action.severity)}</Badge></td>
                                <td className="px-4 py-3"><Badge variant={action.status === "completed" ? "completed" : action.status === "in_progress" ? "in_progress" : "secondary"}>{isOverdue ? "Overdue" : capitalize(action.status.replace(/_/g, " "))}</Badge></td>
                                <td className="px-4 py-3 text-muted-foreground">{action.due_date ? formatDate(action.due_date) : "—"}</td>
                                <td className="px-4 py-3">
                                  {action.status === "open" && <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); stores.correctiveActions.update(action.id, { status: "in_progress", updated_at: new Date().toISOString() }); toast("Started"); }}>Start</Button>}
                                  {action.status === "in_progress" && <Button size="sm" onClick={(e) => { e.stopPropagation(); stores.correctiveActions.update(action.id, { status: "completed", completed_at: new Date().toISOString(), updated_at: new Date().toISOString() }); toast("Completed"); }}>Complete</Button>}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                  {caFiltered.length > 10 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t">
                      <p className="text-sm text-muted-foreground">Showing {(caPage - 1) * 10 + 1}–{Math.min(caPage * 10, caFiltered.length)} of {caFiltered.length}</p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" disabled={caPage === 1} onClick={() => setCaPage((p) => p - 1)}>Previous</Button>
                        <Button size="sm" variant="outline" disabled={caPage * 10 >= caFiltered.length} onClick={() => setCaPage((p) => p + 1)}>Next</Button>
                      </div>
                    </div>
                  )}
                </Card>
              </>
            )}

            {showCaCreate && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                <Card className="w-full max-w-lg"><CardHeader className="flex flex-row items-center justify-between"><CardTitle>New corrective action</CardTitle><Button variant="ghost" size="icon" onClick={() => setShowCaCreate(false)} aria-label="Close"><X className="h-4 w-4" /></Button></CardHeader>
                  <CardContent className="space-y-4">
                    <div><Label>Asset *</Label><Select value={caForm.asset_id} onValueChange={(v) => setCaForm((p) => ({ ...p, asset_id: v }))}><SelectTrigger className="mt-1"><SelectValue placeholder="Select asset" /></SelectTrigger><SelectContent>{assets.filter((a) => a.status !== "retired").map((a) => (<SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>))}</SelectContent></Select></div>
                    <div><Label>Description *</Label><Textarea className="mt-1" placeholder="Describe the corrective action" value={caForm.description} onChange={(e) => setCaForm((p) => ({ ...p, description: e.target.value }))} /></div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div><Label>Severity</Label><Select value={caForm.severity} onValueChange={(v) => setCaForm((p) => ({ ...p, severity: v as Severity }))}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{(["low", "medium", "high", "critical"] as Severity[]).map((s) => (<SelectItem key={s} value={s}>{capitalize(s)}</SelectItem>))}</SelectContent></Select></div>
                      <div><Label>Due date *</Label><Input type="date" className="mt-1" value={caForm.due_date} onChange={(e) => setCaForm((p) => ({ ...p, due_date: e.target.value }))} /></div>
                    </div>
                    <div className="flex gap-2 justify-end"><Button variant="outline" onClick={() => setShowCaCreate(false)}>Cancel</Button><Button onClick={handleCaCreate} disabled={!caForm.asset_id || !caForm.description.trim() || !caForm.due_date}>Create</Button></div>
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        );
      })()}

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

      {/* Asset Import modal */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => { setShowImport(false); setImportData(null); }}>
          <div className="relative w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto rounded-lg bg-background p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Import assets</h2>
              <button onClick={() => { setShowImport(false); setImportData(null); }} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            {!importData ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Upload a CSV file to bulk-import assets. Download the template first to see the required format.</p>
                <Button variant="outline" size="sm" className="gap-2" onClick={() => downloadCsvTemplate("asset-import-template.csv", ["name", "asset_tag", "serial_number", "category", "asset_type", "department", "manufacturer", "model", "condition", "status", "purchase_date", "purchase_cost", "warranty_expiry"])}>
                  <Download className="h-4 w-4" /> Download template
                </Button>
                <label className="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 cursor-pointer hover:bg-muted/50 transition-colors">
                  <input type="file" accept=".csv,.txt" className="hidden" onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const data = await parseCsv(file);
                      if (data.rows.length === 0) { toast("File is empty", "error"); return; }
                      const mapped = mapAssetImportColumns(data);
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
              <AssetImportPreview
                importData={importData}
                assets={assets}
                companyId={companyId || ""}
                addAsset={addAsset}
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
