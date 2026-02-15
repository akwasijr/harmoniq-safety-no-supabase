"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KPICard } from "@/components/ui/kpi-card";
import { SearchFilterBar } from "@/components/ui/search-filter-bar";
import { commonFilterOptions } from "@/components/ui/filter-panel";
import { useIncidentsStore } from "@/stores/incidents-store";
import { useLocationsStore } from "@/stores/locations-store";
import { useTicketsStore } from "@/stores/tickets-store";
import { useUsersStore } from "@/stores/users-store";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { isWithinDateRange, DateRangeValue } from "@/lib/date-utils";
import { downloadCsv } from "@/lib/csv";
import { useAuth } from "@/hooks/use-auth";
import type { Incident } from "@/types";
import { useTranslation } from "@/i18n";

type SubTabType = "incidents" | "tickets";

const ITEMS_PER_PAGE = 10;

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

export default function IncidentsPage() {
  const router = useRouter();
  const company = useCompanyParam();
  const [activeSubTab, setActiveSubTab] = React.useState<SubTabType>("incidents");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [dateRange, setDateRange] = React.useState("all_time");
  
  // Filters
  const [statusFilter, setStatusFilter] = React.useState("");
  const [severityFilter, setSeverityFilter] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("");
  const [ticketStatusFilter, setTicketStatusFilter] = React.useState("");
  const [ticketPriorityFilter, setTicketPriorityFilter] = React.useState("");

  // New incident form
  const [newIncident, setNewIncident] = React.useState({
    type: "",
    severity: "",
    title: "",
    description: "",
    location_id: "",
    location_description: "",
  });

  const { user } = useAuth();
  const { t, formatDate } = useTranslation();
  const { toast } = useToast();
  const { items: incidents, add: addIncident } = useIncidentsStore();
  const { items: tickets } = useTicketsStore();
  const { items: locations } = useLocationsStore();
  const { items: users } = useUsersStore();

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

  // Pagination
  const totalPages = Math.ceil(filteredIncidents.length / ITEMS_PER_PAGE);
  const paginatedIncidents = filteredIncidents.slice(
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
      options: commonFilterOptions.incidentStatus,
      value: statusFilter,
      onChange: (v: string) => { setStatusFilter(v); setCurrentPage(1); },
    },
    {
      id: "severity",
      label: "All severities",
      options: commonFilterOptions.severity,
      value: severityFilter,
      onChange: (v: string) => { setSeverityFilter(v); setCurrentPage(1); },
    },
    {
      id: "type",
      label: "All types",
      options: commonFilterOptions.incidentType,
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
      company_id: company || user?.company_id || "",
      reference_number: `INC-${now.getTime().toString().slice(-6)}`,
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
      options: commonFilterOptions.ticketStatus,
      value: ticketStatusFilter,
      onChange: (v: string) => { setTicketStatusFilter(v); setCurrentPage(1); },
    },
    {
      id: "priority",
      label: "All priorities",
      options: commonFilterOptions.ticketPriority,
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

  const getAssigneeName = (userId?: string | null) => {
    if (!userId) return "Unassigned";
    const user = users.find((u) => u.id === userId);
    return user?.full_name || "Unknown";
  };

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

  return (
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
                  ? filteredIncidents.map((i) => ({
                      reference: i.reference_number,
                      title: i.title,
                      status: i.status,
                      severity: i.severity,
                      type: i.type,
                      date: i.incident_date,
                    }))
                  : filteredTickets.map((t) => ({
                      id: t.id,
                      title: t.title,
                      status: t.status,
                      priority: t.priority,
                      assignee: getAssigneeName(t.assigned_to),
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
            <Button size="sm" className="gap-2" onClick={() => setShowAddModal(true)}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              {t("incidents.newIncident")}
            </Button>
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
                  <th className="pb-3 font-medium">Reference</th>
                  <th className="pb-3 font-medium">Title</th>
                  <th className="pb-3 font-medium">Type</th>
                  <th className="pb-3 font-medium">Severity</th>
                  <th className="hidden pb-3 font-medium md:table-cell">Location</th>
                  <th className="hidden pb-3 font-medium lg:table-cell">Date</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium w-10"></th>
                </tr>
              </thead>
              <tbody>
                {paginatedIncidents.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-muted-foreground">
                      {t("incidents.empty.noIncidents")}
                    </td>
                  </tr>
                ) : (
                  paginatedIncidents.map((incident) => (
                    <tr
                      key={incident.id}
                      onClick={() => router.push(`/${company}/dashboard/incidents/${incident.id}`)}
                      className="border-b last:border-0 cursor-pointer hover:bg-muted/50 transition-colors group"
                    >
                      <td className="py-3">
                        <span className="font-medium font-mono text-xs">{incident.reference_number}</span>
                      </td>
                      <td className="py-3 max-w-[200px] truncate">{incident.title}</td>
                      <td className="py-3 capitalize text-xs">{t(`incidents.types.${incident.type === "near_miss" ? "nearMiss" : incident.type === "equipment_failure" ? "equipmentFailure" : incident.type === "property_damage" ? "propertyDamage" : incident.type}`)}</td>
                      <td className="py-3">
                        <Badge variant={incident.severity} className="text-xs">{incident.severity}</Badge>
                      </td>
                      <td className="hidden py-3 md:table-cell text-muted-foreground text-xs">
                        {incident.building || "—"}
                      </td>
                      <td className="hidden py-3 lg:table-cell text-muted-foreground text-xs">
                        {formatDate(new Date(incident.incident_date))}
                      </td>
                      <td className="py-3">
                        <Badge variant={incident.status as "new" | "in_progress" | "in_review" | "resolved"} className="text-xs">
                          {t(`incidents.statuses.${incident.status === "in_progress" ? "inProgress" : incident.status === "in_review" ? "inReview" : incident.status}`)}
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
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
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
                          className="border-b last:border-0 cursor-pointer hover:bg-muted/50 transition-colors group"
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
                  placeholder="Brief description of the incident"
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
                  placeholder="Describe what happened in detail..."
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
                  placeholder="e.g., Near the main entrance, by machine #3"
                  className="mt-1"
                />
              </div>
            </div>

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
    </div>
  );
}
