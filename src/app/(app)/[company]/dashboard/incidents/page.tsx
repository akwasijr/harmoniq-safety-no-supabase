"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { getUserDisplayName } from "@/lib/status-utils";
import { useCompanyParam } from "@/hooks/use-company-param";
import {
  Plus,
  AlertCircle,
  Download,
  ChevronLeft,
  ChevronRight,
  X,
  Clock,
  AlertTriangle,
  Flame,
  Wrench,
  Shield,
  HelpCircle,
  CheckCircle,
  Eye,
  Ticket,
  User,
  MapPin as MapPinIcon,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KPICard } from "@/components/ui/kpi-card";
const ChartCard = dynamic(() => import("@/components/charts").then((m) => ({ default: m.ChartCard })));
const BarChart = dynamic(() => import("@/components/charts").then((m) => ({ default: m.BarChart })), { ssr: false });
const DonutChart = dynamic(() => import("@/components/charts").then((m) => ({ default: m.DonutChart })), { ssr: false });
import { SortableTh, sortData, type SortDirection } from "@/components/ui/sortable-th";
import { SearchFilterBar } from "@/components/ui/search-filter-bar";
import { useFilterOptions } from "@/components/ui/filter-panel";
import { useCompanyData } from "@/hooks/use-company-data";
import { LoadingPage } from "@/components/ui/loading";
import { useNotificationsStore } from "@/stores/notifications-store";
import { notifyCriticalIncident, notifyIncidentEscalated } from "@/stores/notification-triggers";
import { useToast } from "@/components/ui/toast";
import { cn, capitalize } from "@/lib/utils";
import { isWithinDateRange, DateRangeValue } from "@/lib/date-utils";
import { downloadCsv, parseCsv, downloadCsvTemplate } from "@/lib/csv";
import { useAuth } from "@/hooks/use-auth";
import type { Incident } from "@/types";
import { useTranslation } from "@/i18n";
import { RoleGuard } from "@/components/auth/role-guard";
import { PAGINATION } from "@/lib/constants";
import { getEscalationCandidates } from "@/lib/escalation";
import { useTheme } from "next-themes";
import dynamic from "next/dynamic";

const IncidentMapLazy = dynamic(
  () => import("@/components/incidents/incident-map").then((m) => ({ default: m.IncidentMap })),
  { ssr: false, loading: () => <div className="h-[600px] bg-muted rounded-lg animate-pulse" /> },
);

const SEVERITY_LEGEND: Record<string, string> = {
  critical: "#dc2626",
  high: "#ea580c",
  medium: "#b45309",
  low: "#059669",
};

type SubTabType = "incidents" | "tickets" | "map";

const ITEMS_PER_PAGE = PAGINATION.DEFAULT_PAGE_SIZE;

const incidentTypes = [
  { value: "injury", label: "Injury", icon: AlertCircle },
  { value: "near_miss", label: "Near Miss", icon: AlertTriangle },
  { value: "equipment_failure", label: "Equipment Failure", icon: Wrench },
  { value: "fire", label: "Fire", icon: Flame },
  { value: "environmental", label: "Environmental", icon: Shield },
  { value: "other", label: "Other", icon: HelpCircle },
];

const severityLevels = [
  { value: "low", label: "Low", color: "bg-green-100 text-green-800" },
  { value: "medium", label: "Medium", color: "bg-yellow-100 text-yellow-800" },
  { value: "high", label: "High", color: "bg-orange-100 text-orange-800" },
  { value: "critical", label: "Critical", color: "bg-red-100 text-red-800" },
];

const statusOptions = [
  { value: "all", label: "All Status" },
  { value: "new", label: "New" },
  { value: "in_progress", label: "In Progress" },
  { value: "in_review", label: "In Review" },
  { value: "resolved", label: "Resolved" },
];

// Column alias mapping for imports from SafetyCulture, Intelex, Cority, etc.
const COLUMN_ALIASES: Record<string, string> = {
  // Title
  "incident_title": "title", "incident title": "title", "event title": "title", "name": "title",
  // Type  
  "incident_type": "type", "incident type": "type", "event type": "type", "category": "type", "injury type": "type",
  // Severity
  "severity_level": "severity", "severity level": "severity",
  // Description
  "incident_description": "description", "incident description": "description", "event description": "description",
  // Date
  "date_of_incident": "incident_date", "date of incident": "incident_date", "event date": "incident_date", "date": "incident_date",
  // Time
  "time_of_incident": "incident_time", "time of incident": "incident_time", "event time": "incident_time", "time": "incident_time",
  // Location
  "location_name": "building", "location name": "building", "site": "building", "department": "zone", "area": "zone",
  // Lost time
  "lost_time_days": "lost_time", "days_lost": "lost_time", "days lost": "lost_time", "days away": "lost_time",
  // Reporter
  "reporter_name": "reporter", "reported_by": "reporter", "reported by": "reporter",
};

const TYPE_ALIASES: Record<string, string> = {
  "near miss": "near_miss", "nearmiss": "near_miss",
  "equipment failure": "equipment_failure", "equipment": "equipment_failure",
  "property damage": "property_damage", "damage": "property_damage",
  "slip": "injury", "fall": "injury", "slip/fall": "injury", "cut": "injury", "burn": "injury",
  "chemical": "environmental", "spill": "spill",
  "theft": "security", "break-in": "security", "trespass": "security",
};

function mapImportColumns(data: { headers: string[]; rows: Record<string, string>[] }) {
  const headerMap: Record<string, string> = {};
  data.headers.forEach((h) => {
    const lower = h.toLowerCase().trim();
    headerMap[h] = COLUMN_ALIASES[lower] || lower.replace(/\s+/g, "_");
  });

  const mappedHeaders = data.headers.map((h) => headerMap[h]);
  const mappedRows = data.rows.map((row) => {
    const mapped: Record<string, string> = {};
    for (const [key, value] of Object.entries(row)) {
      mapped[headerMap[key] || key] = value;
    }
    // Normalize type aliases
    if (mapped.type) {
      const lower = mapped.type.toLowerCase().trim();
      mapped.type = TYPE_ALIASES[lower] || lower;
    }
    // Normalize severity
    if (mapped.severity) mapped.severity = mapped.severity.toLowerCase().trim();
    // Handle "days lost" as lost_time
    if (mapped.lost_time && /^\d+$/.test(mapped.lost_time.trim())) {
      mapped.lost_time = "yes"; // numeric days → yes
    }
    return mapped;
  });

  return { headers: mappedHeaders, rows: mappedRows };
}

const VALID_TYPES = ["injury", "near_miss", "equipment_failure", "environmental", "fire", "security", "spill", "hazard", "property_damage", "other"];
const VALID_SEVERITIES = ["low", "medium", "high", "critical"];

function ImportPreview({ importData, incidents, user, addIncident, addTicket, toast, onBack, onDone }: {
  importData: { headers: string[]; rows: Record<string, string>[] };
  incidents: Incident[];
  user: { id: string; company_id: string } | null;
  addIncident: (i: Incident) => void;
  addTicket: (t: import("@/types").Ticket) => void;
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
    if (row.type && !VALID_TYPES.includes(row.type.toLowerCase().trim())) warnings.push("Unknown type");
    if (row.severity && !VALID_SEVERITIES.includes(row.severity.toLowerCase().trim())) warnings.push("Unknown severity");
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
      const type = (VALID_TYPES.includes((row.type || "").toLowerCase()) ? row.type.toLowerCase() : "other") as Incident["type"];
      const severity = (VALID_SEVERITIES.includes((row.severity || "").toLowerCase()) ? row.severity.toLowerCase() : "medium") as Incident["severity"];
      const incident: Incident = {
        id: crypto.randomUUID(),
        company_id: user?.company_id || "",
        reference_number: `INC-${now.getFullYear()}-${String(incidents.length + imported + 1).padStart(4, "0")}`,
        reporter_id: user?.id || "",
        type,
        type_other: null,
        severity,
        priority: severity === "critical" || severity === "high" ? "high" : severity as Incident["priority"],
        title: row.title.trim(),
        description: row.description || "",
        incident_date: row.incident_date || now.toISOString().split("T")[0],
        incident_time: row.incident_time || "00:00",
        lost_time: row.lost_time?.toLowerCase().trim() === "yes",
        lost_time_amount: null,
        lost_time_restricted_days: null,
        lost_time_return_date: null,
        lost_time_updated_at: null,
        lost_time_updated_by: null,
        active_hazard: row.active_hazard?.toLowerCase().trim() === "yes",
        location_id: null,
        building: row.building || null,
        floor: row.floor || null,
        zone: row.zone || null,
        room: row.room || null,
        gps_lat: null,
        gps_lng: null,
        location_description: row.location_description || null,
        asset_id: null,
        media_urls: [],
        status: "new",
        flagged: false,
        resolved_at: null,
        resolved_by: null,
        resolution_notes: null,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      };
      addIncident(incident);
      if (severity === "critical" || severity === "high") {
        addTicket({
          id: crypto.randomUUID(),
          company_id: incident.company_id,
          title: `Investigate: ${incident.title}`,
          description: `Auto-created for imported ${severity} incident ${incident.reference_number}`,
          priority: severity === "critical" ? "critical" : "high",
          status: "new",
          due_date: null,
          assigned_to: null,
          assigned_groups: [],
          incident_ids: [incident.id],
          created_by: user?.id || "",
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
        });
      }
      imported++;
    });
    toast(`${imported} imported${errorCount > 0 ? `, ${errorCount} skipped` : ""}`);
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
              <th className="px-1.5 py-1 text-left font-medium w-28">Type</th>
              <th className="px-1.5 py-1 text-left font-medium w-20">Severity</th>
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
                    value={VALID_TYPES.includes((v.row.type || "").toLowerCase()) ? v.row.type.toLowerCase() : "other"}
                    onChange={(e) => updateCell(v.index, "type", e.target.value)}
                  >
                    {VALID_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
                  </select>
                </td>
                <td className="px-1.5 py-1">
                  <select
                    className="w-full bg-transparent border-0 outline-none text-xs"
                    value={VALID_SEVERITIES.includes((v.row.severity || "").toLowerCase()) ? v.row.severity.toLowerCase() : "medium"}
                    onChange={(e) => updateCell(v.index, "severity", e.target.value)}
                  >
                    {VALID_SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
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

export default function IncidentsPage() {
  const router = useRouter();
  const company = useCompanyParam();
  const [activeSubTab, setActiveSubTab] = React.useState<SubTabType>("incidents");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [showImport, setShowImport] = React.useState(false);
  const [importData, setImportData] = React.useState<{ headers: string[]; rows: Record<string, string>[] } | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [dateRange, setDateRange] = React.useState("all_time");
  
  // Filters
  const [statusFilter, setStatusFilter] = React.useState("");
  const [severityFilter, setSeverityFilter] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("");
  const [ticketStatusFilter, setTicketStatusFilter] = React.useState("");
  const [ticketPriorityFilter, setTicketPriorityFilter] = React.useState("");
  const [sortKey, setSortKey] = React.useState<string | null>(null);
  const [sortDir, setSortDir] = React.useState<SortDirection>(null);
  const [expandedRows, setExpandedRows] = React.useState<Set<string>>(new Set());

  // New incident form
  const [newIncident, setNewIncident] = React.useState({
    type: "",
    severity: "",
    title: "",
    description: "",
    location_id: "",
    location_description: "",
  });

  const { user, currentCompany } = useAuth();
  const { t, formatDate } = useTranslation();
  const filterOptions = useFilterOptions();
  const { toast } = useToast();
  const { theme } = useTheme();
  const isDarkMode = theme === "dark";
  const { incidents, tickets, locations, users, stores } = useCompanyData();
  const { isLoading, add: addIncident, update: updateIncident } = stores.incidents;
  const { add: addTicket } = stores.tickets;
  const { add: addNotif } = useNotificationsStore();

  const incidentsWithGps = React.useMemo(
    () => incidents.filter((i) => i.gps_lat != null && i.gps_lng != null),
    [incidents],
  );

  // Auto-escalation check
  const escalationCheckRan = React.useRef(false);
  React.useEffect(() => {
    if (escalationCheckRan.current || isLoading) return;
    escalationCheckRan.current = true;
    const candidates = getEscalationCandidates(incidents);
    candidates.forEach((id) => {
      updateIncident(id, { escalated: true, escalated_at: new Date().toISOString(), updated_at: new Date().toISOString() });
      const inc = incidents.find((i) => i.id === id);
      if (inc) {
        notifyIncidentEscalated(addNotif, {
          companyId: inc.company_id,
          incidentTitle: inc.title,
          incidentId: inc.id,
          severity: inc.severity,
        });
      }
    });
    if (candidates.length > 0) {
      toast(`${candidates.length} incident${candidates.length > 1 ? "s" : ""} auto-escalated`);
    }
  }, [isLoading, incidents, updateIncident, toast]);

  // Filter incidents
  const filteredIncidents = incidents.filter((incident) => {
    const matchesSearch = searchQuery === "" || 
      incident.reference_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      incident.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      incident.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "" || incident.status === statusFilter;
    const matchesSeverity = severityFilter === "" || incident.severity === severityFilter;
    const matchesType = typeFilter === "" || incident.type === typeFilter;
    const matchesDate = isWithinDateRange(incident.incident_date, dateRange as DateRangeValue);
    
    return matchesSearch && matchesStatus && matchesSeverity && matchesType && matchesDate;
  });

  // Sort + Pagination
  const sortedIncidents = sortData(filteredIncidents, sortKey, sortDir);
  const totalPages = Math.ceil(sortedIncidents.length / ITEMS_PER_PAGE);
  const paginatedIncidents = sortedIncidents.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Status counts
  const statusCounts = {
    new: incidents.filter((i) => i.status === "new").length,
    in_progress: incidents.filter((i) => i.status === "in_progress").length,
    in_review: incidents.filter((i) => i.status === "in_review").length,
    resolved: incidents.filter((i) => i.status === "resolved").length,
  };

  const clearFilters = () => {
    setStatusFilter("");
    setSeverityFilter("");
    setTypeFilter("");
    setSearchQuery("");
    setDateRange("last_30_days");
    setCurrentPage(1);
  };

  const hasActiveFilters = statusFilter !== "" || severityFilter !== "" || typeFilter !== "" || searchQuery !== "" || dateRange !== "last_30_days";

  const filters = [
    {
      id: "status",
      label: "All statuses",
      options: filterOptions.incidentStatus,
      value: statusFilter,
      onChange: (v: string) => { setStatusFilter(v); setCurrentPage(1); },
    },
    {
      id: "severity",
      label: "All severities",
      options: filterOptions.severity,
      value: severityFilter,
      onChange: (v: string) => { setSeverityFilter(v); setCurrentPage(1); },
    },
    {
      id: "type",
      label: "All types",
      options: filterOptions.incidentType,
      value: typeFilter,
      onChange: (v: string) => { setTypeFilter(v); setCurrentPage(1); },
    },
  ];

  const handleAddIncident = () => {
    if (!newIncident.type || !newIncident.severity || !newIncident.title) {
      toast("Please complete all required fields", "error");
      return;
    }
    const now = new Date();
    const incident: Incident = {
      id: `inc_${Date.now()}`,
      company_id: user?.company_id || "",
      reference_number: `INC-${now.getFullYear()}-${String(incidents.length + 1).padStart(4, "0")}`,
      reporter_id: user?.id || "",
      type: newIncident.type as Incident["type"],
      type_other: newIncident.type === "other" ? "Other" : null,
      severity: newIncident.severity as Incident["severity"],
      priority: newIncident.severity as Incident["priority"],
      title: newIncident.title,
      description: newIncident.description,
      incident_date: now.toISOString().split("T")[0],
      incident_time: now.toISOString().split("T")[1]?.slice(0, 5) || "00:00",
      lost_time: false,
      lost_time_amount: null,
        lost_time_restricted_days: null,
        lost_time_return_date: null,
        lost_time_updated_at: null,
        lost_time_updated_by: null,
      active_hazard: false,
      location_id: newIncident.location_id || null,
      building: null,
      floor: null,
      zone: null,
      room: null,
      gps_lat: null,
      gps_lng: null,
      location_description: newIncident.location_description || null,
      asset_id: null,
      media_urls: [],
      status: "new",
      flagged: false,
      resolved_at: null,
      resolved_by: null,
      resolution_notes: null,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };
    addIncident(incident);
    // Auto-create investigation ticket for critical/high incidents
    if (incident.severity === "critical" || incident.severity === "high") {
      addTicket({
        id: crypto.randomUUID(),
        company_id: incident.company_id,
        title: `Investigate: ${incident.title}`,
        description: `Investigation ticket auto-created for ${incident.severity} severity incident ${incident.reference_number}`,
        priority: incident.severity === "critical" ? "critical" : "high",
        status: "new",
        due_date: null,
        assigned_to: null,
        assigned_groups: [],
        incident_ids: [incident.id],
        created_by: user?.id || "",
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      });
    }
    if (incident.severity === "critical") {
      notifyCriticalIncident(addNotif, {
        companyId: incident.company_id,
        incidentTitle: incident.title,
        incidentId: incident.id,
      });
    }
    toast("Incident created successfully");
    setShowAddModal(false);
    setNewIncident({
      type: "",
      severity: "",
      title: "",
      description: "",
      location_id: "",
      location_description: "",
    });
    setCurrentPage(1);
  };

  // Ticket filters and data
  const ticketFilters = [
    {
      id: "status",
      label: "All statuses",
      options: filterOptions.ticketStatus,
      value: ticketStatusFilter,
      onChange: (v: string) => { setTicketStatusFilter(v); setCurrentPage(1); },
    },
    {
      id: "priority",
      label: "All priorities",
      options: filterOptions.ticketPriority,
      value: ticketPriorityFilter,
      onChange: (v: string) => { setTicketPriorityFilter(v); setCurrentPage(1); },
    },
  ];

  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch = searchQuery === "" || 
      ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = ticketStatusFilter === "" || ticket.status === ticketStatusFilter;
    const matchesPriority = ticketPriorityFilter === "" || ticket.priority === ticketPriorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const ticketStatusCounts = {
    new: tickets.filter((t) => t.status === "new").length,
    in_progress: tickets.filter((t) => t.status === "in_progress").length,
    resolved: tickets.filter((t) => t.status === "resolved").length,
    closed: tickets.filter((t) => t.status === "closed").length,
  };

  const ticketTotalPages = Math.ceil(filteredTickets.length / ITEMS_PER_PAGE);
  const paginatedTickets = filteredTickets.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const getAssigneeName = (userId?: string | null) => getUserDisplayName(userId, users);

  const getIncidentRef = (incidentIds?: string[]) => {
    if (!incidentIds || incidentIds.length === 0) return "—";
    const incident = incidents.find((i) => i.id === incidentIds[0]);
    return incident?.reference_number || incidentIds[0];
  };

  // Reset page when switching tabs
  React.useEffect(() => {
    setCurrentPage(1);
    setSearchQuery("");
  }, [activeSubTab]);

  if (isLoading && incidents.length === 0) {
    return <LoadingPage />;
  }

  return (
    <RoleGuard requiredPermission="incidents.view_own">
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold truncate">{t("incidents.title")}</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => {
              const rows =
                activeSubTab === "incidents"
                  ? filteredIncidents.map((i) => {
                      const rep = users.find((u) => u.id === i.reporter_id);
                      const loc = locations.find((l) => l.id === i.location_id);
                      return {
                        reference: i.reference_number,
                        title: i.title,
                        type: i.type,
                        severity: i.severity,
                        priority: i.priority,
                        status: i.status,
                        date: i.incident_date,
                        time: i.incident_time || "",
                        description: i.description,
                        reporter: rep?.full_name || (i.reporter_id === "__anonymous__" ? "Anonymous" : "Unknown"),
                        location: loc?.name || i.location_description || "",
                        building: i.building || "",
                        floor: i.floor || "",
                        zone: i.zone || "",
                        room: i.room || "",
                        gps: i.gps_lat && i.gps_lng ? `${i.gps_lat},${i.gps_lng}` : "",
                        lost_time: i.lost_time ? "Yes" : "No",
                        lost_time_hours: i.lost_time_amount ?? "",
                        active_hazard: i.active_hazard ? "Yes" : "No",
                        escalated: i.escalated ? "Yes" : "No",
                        resolved_at: i.resolved_at || "",
                        created_at: i.created_at,
                      };
                    })
                  : filteredTickets.map((t_) => ({
                      title: t_.title,
                      description: t_.description,
                      status: t_.status,
                      priority: t_.priority,
                      assignee: getAssigneeName(t_.assigned_to),
                      due_date: t_.due_date || "",
                      created_at: t_.created_at,
                    }));
              downloadCsv(
                activeSubTab === "incidents" ? "incidents.csv" : "tickets.csv",
                rows
              );
              toast("Export generated");
            }}
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            {t("incidents.buttons.export")}
          </Button>
          {activeSubTab === "incidents" && (
            <>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowImport(true)}>
              <Upload className="h-4 w-4" aria-hidden="true" />
              Import
            </Button>
            <Button size="sm" className="gap-2" onClick={() => setShowAddModal(true)}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              {t("incidents.newIncident")}
            </Button>
            </>
          )}
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="border-b">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveSubTab("incidents")}
            className={cn(
              "flex items-center gap-2 py-3 px-1 text-sm font-medium transition-colors relative",
              activeSubTab === "incidents" 
                ? "text-primary" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            <span>{t("incidents.title")}</span>
            {activeSubTab === "incidents" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
          <button
            onClick={() => setActiveSubTab("tickets")}
            className={cn(
              "flex items-center gap-2 py-3 px-1 text-sm font-medium transition-colors relative",
              activeSubTab === "tickets" 
                ? "text-primary" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Ticket className="h-4 w-4" aria-hidden="true" />
            <span>{t("tickets.title")}</span>
            {activeSubTab === "tickets" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
          <button
            onClick={() => setActiveSubTab("map")}
            className={cn(
              "flex items-center gap-2 py-3 px-1 text-sm font-medium transition-colors relative",
              activeSubTab === "map" 
                ? "text-primary" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <MapPinIcon className="h-4 w-4" aria-hidden="true" />
            <span>Map</span>
            {activeSubTab === "map" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        </div>
      </div>

      {/* Incidents Tab Content */}
      {activeSubTab === "incidents" && (
        <>
          {/* Status summary cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KPICard
              title={t("incidents.statuses.new")}
          value={statusCounts.new}
          icon={AlertCircle}
          onClick={() => { setStatusFilter(statusFilter === "new" ? "" : "new"); setCurrentPage(1); }}
          active={statusFilter === "new"}
        />
        <KPICard
          title={t("incidents.statuses.inProgress")}
          value={statusCounts.in_progress}
          icon={Clock}
          onClick={() => { setStatusFilter(statusFilter === "in_progress" ? "" : "in_progress"); setCurrentPage(1); }}
          active={statusFilter === "in_progress"}
        />
        <KPICard
          title={t("incidents.statuses.inReview")}
          value={statusCounts.in_review}
          icon={Eye}
          onClick={() => { setStatusFilter(statusFilter === "in_review" ? "" : "in_review"); setCurrentPage(1); }}
          active={statusFilter === "in_review"}
        />
        <KPICard
          title={t("incidents.statuses.resolved")}
          value={statusCounts.resolved}
          icon={CheckCircle}
          onClick={() => { setStatusFilter(statusFilter === "resolved" ? "" : "resolved"); setCurrentPage(1); }}
          active={statusFilter === "resolved"}
        />
      </div>

      {/* Analytics charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="By type">
          <BarChart
            data={(() => {
              const typeCounts: Record<string, number> = {};
              incidents.forEach((i) => {
                const label = capitalize(i.type.replace(/_/g, " "));
                typeCounts[label] = (typeCounts[label] || 0) + 1;
              });
              return Object.entries(typeCounts)
                .map(([name, value]) => ({ name, value }))
                .sort((a, b) => b.value - a.value);
            })()}
            dataKey="value"
            xAxisKey="name"
            height={200}
          />
        </ChartCard>
        <ChartCard title="By severity">
          <DonutChart
            data={[
              { name: "Low", value: incidents.filter((i) => i.severity === "low").length },
              { name: "Medium", value: incidents.filter((i) => i.severity === "medium").length },
              { name: "High", value: incidents.filter((i) => i.severity === "high").length },
              { name: "Critical", value: incidents.filter((i) => i.severity === "critical").length },
            ].filter((d) => d.value > 0)}
            height={200}
          />
        </ChartCard>
      </div>

      {/* Search and filters */}
      <SearchFilterBar
        searchQuery={searchQuery}
        onSearchChange={(value) => { setSearchQuery(value); setCurrentPage(1); }}
        searchPlaceholder="Search by reference, title, or description..."
        filters={filters}
        dateRange={dateRange}
        onDateRangeChange={(value) => { setDateRange(value); setCurrentPage(1); }}
        showDateRange={true}
      />

      {/* Incidents table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              {filteredIncidents.length} incident{filteredIncidents.length !== 1 ? "s" : ""}
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
                  <SortableTh sortKey="reference_number" currentSort={sortKey} currentDirection={sortDir} onSort={(k, d) => { setSortKey(k); setSortDir(d); }}>Reference</SortableTh>
                  <SortableTh sortKey="title" currentSort={sortKey} currentDirection={sortDir} onSort={(k, d) => { setSortKey(k); setSortDir(d); }}>Title</SortableTh>
                  <SortableTh sortKey="type" currentSort={sortKey} currentDirection={sortDir} onSort={(k, d) => { setSortKey(k); setSortDir(d); }}>Type</SortableTh>
                  <SortableTh sortKey="severity" currentSort={sortKey} currentDirection={sortDir} onSort={(k, d) => { setSortKey(k); setSortDir(d); }}>Severity</SortableTh>
                  <SortableTh sortKey="building" currentSort={sortKey} currentDirection={sortDir} onSort={(k, d) => { setSortKey(k); setSortDir(d); }} className="hidden md:table-cell">Location</SortableTh>
                  <SortableTh sortKey="incident_date" currentSort={sortKey} currentDirection={sortDir} onSort={(k, d) => { setSortKey(k); setSortDir(d); }} className="hidden lg:table-cell">Date</SortableTh>
                  <SortableTh sortKey="status" currentSort={sortKey} currentDirection={sortDir} onSort={(k, d) => { setSortKey(k); setSortDir(d); }}>Status</SortableTh>
                  <th className="pb-3 font-medium w-10"></th>
                  <th className="pb-3 font-medium w-10"></th>
                </tr>
              </thead>
              <tbody>
                {paginatedIncidents.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-muted-foreground">
                      {t("incidents.empty.noIncidents")}
                    </td>
                  </tr>
                ) : (
                  paginatedIncidents.map((incident) => {
                    const linkedTickets = tickets.filter((t) => t.incident_ids?.includes(incident.id));
                    return (
                    <React.Fragment key={incident.id}>
                    <tr
                      onClick={() => router.push(`/${company}/dashboard/incidents/${incident.id}`)}
                      className="border-b last:border-0 cursor-pointer hover:bg-muted/50 active:bg-muted transition-colors group"
                    >
                      <td className="py-3">
                        <div className="flex items-center gap-1.5">
                          {linkedTickets.length > 0 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedRows((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(incident.id)) next.delete(incident.id);
                                  else next.add(incident.id);
                                  return next;
                                });
                              }}
                              className="flex h-4 w-4 shrink-0 items-center justify-center rounded text-[10px] font-bold text-muted-foreground hover:bg-muted transition-colors"
                            >
                              {expandedRows.has(incident.id) ? "−" : "+"}
                            </button>
                          )}
                          <span className="font-medium font-mono text-xs">{incident.reference_number}</span>
                          {incident.escalated && (
                            <Badge variant="destructive" className="ml-1 text-[9px] px-1.5 py-0">Escalated</Badge>
                          )}
                          {linkedTickets.length > 0 && !expandedRows.has(incident.id) && (
                            <span className="text-[10px] text-muted-foreground">{linkedTickets.length} ticket{linkedTickets.length > 1 ? "s" : ""}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 max-w-[200px] truncate">{incident.title}</td>
                      <td className="py-3 capitalize text-xs">{t(`incidents.types.${incident.type === "near_miss" ? "nearMiss" : incident.type === "equipment_failure" ? "equipmentFailure" : incident.type === "property_damage" ? "propertyDamage" : incident.type}`)}</td>
                      <td className="py-3">
                        <Badge variant={incident.severity} className="text-xs">{incident.severity}</Badge>
                      </td>
                      <td className="hidden py-3 md:table-cell text-muted-foreground text-xs">
                        {incident.building || incident.location_description || (incident.location_id ? locations.find((l) => l.id === incident.location_id)?.name : null) || "—"}
                      </td>
                      <td className="hidden py-3 lg:table-cell text-muted-foreground text-xs">
                        {formatDate(new Date(incident.incident_date))}
                      </td>
                      <td className="py-3">
                        <Badge variant={incident.status === "new" ? "secondary" : incident.status as "in_progress" | "in_review" | "resolved"} className="text-xs">
                          {t(`incidents.statuses.${incident.status === "in_progress" ? "inProgress" : incident.status === "in_review" ? "inReview" : incident.status}`)}
                        </Badge>
                      </td>
                      <td className="py-3">
                        <Eye className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </td>
                      <td className="py-3">
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              const { IncidentReportPDF, downloadPDF } = await import("@/lib/pdf-export");
                              const reporterUser = users.find((u) => u.id === incident.reporter_id);
                              const loc = locations.find((l) => l.id === incident.location_id);
                              const doc = <IncidentReportPDF
                                companyName={currentCompany?.name || company}
                                incident={{
                                  title: incident.title,
                                  type: incident.type,
                                  severity: incident.severity,
                                  priority: incident.priority,
                                  status: incident.status,
                                  incident_date: incident.incident_date,
                                  incident_time: incident.incident_time,
                                  location: loc?.name,
                                  location_description: incident.location_description,
                                  building: incident.building,
                                  floor: incident.floor,
                                  zone: incident.zone,
                                  room: incident.room,
                                  description: incident.description,
                                  reference_number: incident.reference_number,
                                  reporter_name: reporterUser?.full_name || "Unknown",
                                  corrective_actions: incident.actions?.map((a) => ({ title: a.title, status: a.status, dueDate: a.dueDate })),
                                  media_urls: incident.media_urls,
                                  active_hazard: incident.active_hazard,
                                  lost_time: incident.lost_time,
                                  lost_time_amount: incident.lost_time_amount,
                                  created_at: incident.created_at,
                                }}
                              />;
                              await downloadPDF(doc, `incident-${incident.reference_number || incident.id.slice(0, 8)}.pdf`);
                            } catch {
                              // silently fail
                            }
                          }}
                          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          aria-label="Export PDF"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                    {expandedRows.has(incident.id) && linkedTickets.map((ticket) => (
                      <tr
                        key={`ticket-${ticket.id}`}
                        onClick={(e) => { e.stopPropagation(); router.push(`/${company}/dashboard/tickets/${ticket.id}`); }}
                        className="cursor-pointer hover:bg-muted/30 transition-colors"
                      >
                        <td className="py-2 pl-8" colSpan={2}>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="h-px w-3 bg-border" />
                            <Ticket className="h-3 w-3 shrink-0" />
                            <span className="truncate">{ticket.title}</span>
                          </div>
                        </td>
                        <td className="py-2" colSpan={3}></td>
                        <td className="hidden py-2 lg:table-cell"></td>
                        <td className="py-2">
                          <Badge variant={ticket.status === "resolved" || ticket.status === "closed" ? "completed" : ticket.status === "in_progress" ? "in_progress" : "secondary"} className="text-[10px]">
                            {ticket.status.replace(/_/g, " ")}
                          </Badge>
                        </td>
                        <td className="py-2" colSpan={2}></td>
                      </tr>
                    ))}
                    </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t mt-4">
              <p className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredIncidents.length)} of {filteredIncidents.length}
              </p>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
        </>
      )}

      {/* Tickets Tab Content */}
      {activeSubTab === "tickets" && (
        <>
          {/* Ticket Status summary cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KPICard
              title={t("tickets.statuses.new")}
              value={ticketStatusCounts.new}
              icon={AlertCircle}
              onClick={() => { setTicketStatusFilter(ticketStatusFilter === "new" ? "" : "new"); setCurrentPage(1); }}
              active={ticketStatusFilter === "new"}
            />
            <KPICard
              title={t("tickets.statuses.inProgress")}
              value={ticketStatusCounts.in_progress}
              icon={Clock}
              onClick={() => { setTicketStatusFilter(ticketStatusFilter === "in_progress" ? "" : "in_progress"); setCurrentPage(1); }}
              active={ticketStatusFilter === "in_progress"}
            />
            <KPICard
              title={t("tickets.statuses.resolved")}
              value={ticketStatusCounts.resolved}
              icon={CheckCircle}
              onClick={() => { setTicketStatusFilter(ticketStatusFilter === "resolved" ? "" : "resolved"); setCurrentPage(1); }}
              active={ticketStatusFilter === "resolved"}
            />
            <KPICard
              title="Closed"
              value={ticketStatusCounts.closed}
              icon={CheckCircle}
              onClick={() => { setTicketStatusFilter(ticketStatusFilter === "closed" ? "" : "closed"); setCurrentPage(1); }}
              active={ticketStatusFilter === "closed"}
            />
          </div>

          {/* Search and filters */}
          <SearchFilterBar
            searchQuery={searchQuery}
            onSearchChange={(value) => { setSearchQuery(value); setCurrentPage(1); }}
            searchPlaceholder="Search tickets by ID or title..."
            filters={ticketFilters}
            dateRange={dateRange}
            onDateRangeChange={(value) => { setDateRange(value); setCurrentPage(1); }}
            showDateRange={true}
          />

          {/* Tickets table */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  {filteredTickets.length} ticket{filteredTickets.length !== 1 ? "s" : ""}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Page {currentPage} of {ticketTotalPages || 1}
                </p>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-3 font-medium">Ticket ID</th>
                      <th className="pb-3 font-medium">Title</th>
                      <th className="pb-3 font-medium">Incident</th>
                      <th className="pb-3 font-medium">Assignee</th>
                      <th className="pb-3 font-medium">Priority</th>
                      <th className="hidden pb-3 font-medium lg:table-cell">Created</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedTickets.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-muted-foreground">
                          {t("tickets.empty.noTickets")}
                        </td>
                      </tr>
                    ) : (
                      paginatedTickets.map((ticket) => (
                        <tr
                          key={ticket.id}
                          onClick={() => router.push(`/${company}/dashboard/tickets/${ticket.id}`)}
                          className="border-b last:border-0 cursor-pointer hover:bg-muted/50 active:bg-muted transition-colors group"
                        >
                          <td className="py-3">
                            <span className="font-medium font-mono text-xs">{ticket.id}</span>
                          </td>
                          <td className="py-3 max-w-[200px] truncate">{ticket.title}</td>
                          <td className="py-3">
                            <span className="font-mono text-xs text-muted-foreground">
                              {getIncidentRef(ticket.incident_ids)}
                            </span>
                          </td>
                          <td className="py-3">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="text-xs">{getAssigneeName(ticket.assigned_to)}</span>
                            </div>
                          </td>
                          <td className="py-3">
                            <Badge variant={ticket.priority} className="text-xs">{ticket.priority}</Badge>
                          </td>
                          <td className="hidden py-3 lg:table-cell text-muted-foreground text-xs">
                            {formatDate(new Date(ticket.created_at))}
                          </td>
                          <td className="py-3">
                            <Badge 
                              variant={ticket.status === "resolved" || ticket.status === "closed" ? "success" : ticket.status === "in_progress" ? "warning" : "secondary"} 
                              className="text-xs"
                            >
                              {t(`tickets.statuses.${ticket.status === "in_progress" ? "inProgress" : ticket.status}`)}
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
              {ticketTotalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t mt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredTickets.length)} of {filteredTickets.length}
                  </p>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    {Array.from({ length: Math.min(5, ticketTotalPages) }, (_, i) => {
                      const page = i + 1;
                      return (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                        >
                          {page}
                        </Button>
                      );
                    })}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(ticketTotalPages, p + 1))}
                      disabled={currentPage === ticketTotalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Incident Map Tab */}
      {activeSubTab === "map" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {incidentsWithGps.length} of {incidents.length} incidents have GPS coordinates
            </p>
            <div className="flex gap-2 text-xs">
              {Object.entries(SEVERITY_LEGEND).map(([sev, color]) => (
                <span key={sev} className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                  {sev}
                </span>
              ))}
            </div>
          </div>
          <IncidentMapLazy
            markers={incidentsWithGps.map((i) => ({
              id: i.id,
              title: i.title,
              severity: i.severity,
              status: i.status,
              type: i.type,
              lat: i.gps_lat!,
              lng: i.gps_lng!,
              date: i.incident_date,
              reference: i.reference_number,
            }))}
            height="600px"
            darkMode={isDarkMode}
            onMarkerClick={(id) => router.push(`/${company}/dashboard/incidents/${id}`)}
          />
        </div>
      )}

      {/* Add Incident Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowAddModal(false)}>
          <div className="relative z-50 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto rounded-lg bg-background p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold">{t("incidents.reportIncident")}</h2>
                <p className="text-sm text-muted-foreground">Fill in the incident details</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowAddModal(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="space-y-6">
              {/* Incident Type */}
              <div>
                <Label>{t("incidents.labels.type")} *</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {incidentTypes.map((type) => {
                    const Icon = type.icon;
                    const isSelected = newIncident.type === type.value;
                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setNewIncident({ ...newIncident, type: type.value })}
                        className={cn(
                          "flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-all",
                          isSelected ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/50"
                        )}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="text-xs font-medium">{type.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Severity */}
              <div>
                <Label>{t("incidents.labels.severity")} *</Label>
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {severityLevels.map((level) => {
                    const isSelected = newIncident.severity === level.value;
                    return (
                      <button
                        key={level.value}
                        type="button"
                        onClick={() => setNewIncident({ ...newIncident, severity: level.value })}
                        className={cn(
                          "rounded-lg border-2 py-2 px-3 text-sm font-medium transition-all",
                          isSelected ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/50"
                        )}
                      >
                        {level.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Title */}
              <div>
                <Label htmlFor="title">{t("incidents.labels.title")} *</Label>
                <Input
                  id="title"
                  value={newIncident.title}
                  onChange={(e) => setNewIncident({ ...newIncident, title: e.target.value })}
                  placeholder={t("incidents.placeholders.briefDescription")}
                  className="mt-1"
                />
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description">{t("incidents.labels.description")} *</Label>
                <Textarea
                  id="description"
                  value={newIncident.description}
                  onChange={(e) => setNewIncident({ ...newIncident, description: e.target.value })}
                  placeholder={t("incidents.placeholders.describeWhatHappened")}
                  rows={4}
                  className="mt-1"
                />
              </div>

              {/* Location */}
              <div>
                <Label htmlFor="location">{t("incidents.labels.location")}</Label>
                <select
                  id="location"
                  title="Select location"
                  aria-label="Select location"
                  value={newIncident.location_id}
                  onChange={(e) => setNewIncident({ ...newIncident, location_id: e.target.value })}
                  className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select location...</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
              </div>

              {/* Location Description */}
              <div>
                <Label htmlFor="location_desc">Specific Location Details</Label>
                <Input
                  id="location_desc"
                  value={newIncident.location_description}
                  onChange={(e) => setNewIncident({ ...newIncident, location_description: e.target.value })}
                  placeholder={t("incidents.placeholders.locationDetails")}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Custom fields */}
            {currentCompany?.custom_incident_fields && currentCompany.custom_incident_fields.length > 0 && (
              <div className="space-y-3 pt-3 border-t">
                {currentCompany.custom_incident_fields
                  .filter((f) => !f.applies_to || f.applies_to.length === 0 || f.applies_to.includes(newIncident.type))
                  .map((field) => (
                    <div key={field.id}>
                      <label className="text-sm font-medium">{field.label}{field.required && " *"}</label>
                      {field.type === "text" && (
                        <Input className="mt-1" placeholder={field.label} />
                      )}
                      {field.type === "number" && (
                        <Input type="number" className="mt-1" placeholder={field.label} />
                      )}
                      {field.type === "date" && (
                        <Input type="date" className="mt-1" />
                      )}
                      {field.type === "toggle" && (
                        <div className="flex items-center gap-2 mt-1">
                          <input type="checkbox" className="h-4 w-4 rounded border-input" />
                          <span className="text-sm text-muted-foreground">{field.label}</span>
                        </div>
                      )}
                      {field.type === "select" && field.options && (
                        <select className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                          <option value="">Select...</option>
                          {field.options.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  ))}
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowAddModal(false)}>
                {t("common.cancel")}
              </Button>
              <Button 
                onClick={handleAddIncident} 
                disabled={!newIncident.type || !newIncident.severity || !newIncident.title}
              >
                {t("incidents.reportIncident")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Import modal */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => { setShowImport(false); setImportData(null); }}>
          <div className="relative w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto rounded-lg bg-background p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Import incidents</h2>
              <button onClick={() => { setShowImport(false); setImportData(null); }} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            {!importData ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Upload a CSV file to bulk-import incidents. Download the template first to see the required format.</p>
                <Button variant="outline" size="sm" className="gap-2" onClick={() => downloadCsvTemplate("incident-import-template.csv", ["title", "type", "severity", "description", "incident_date", "incident_time", "building", "floor", "zone", "room", "location_description", "lost_time", "active_hazard"])}>
                  <Download className="h-4 w-4" /> Download template
                </Button>
                <label className="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 cursor-pointer hover:bg-muted/50 transition-colors">
                  <input type="file" accept=".csv,.txt" className="hidden" onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const data = await parseCsv(file);
                      if (data.rows.length === 0) { toast("File is empty", "error"); return; }
                      // Auto-map column aliases from popular tools
                      const mapped = mapImportColumns(data);
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
              <ImportPreview
                importData={importData}
                incidents={incidents}
                user={user}
                addIncident={addIncident}
                addTicket={addTicket}
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
