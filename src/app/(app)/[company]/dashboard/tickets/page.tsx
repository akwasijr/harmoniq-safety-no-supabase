"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useCompanyParam } from "@/hooks/use-company-param";
import {
  Plus,
  Ticket,
  Clock,
  CheckCircle,
  AlertCircle,
  X,
  User,
  ChevronLeft,
  ChevronRight,
  Eye,
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
import { useTicketsStore } from "@/stores/tickets-store";
import { useIncidentsStore } from "@/stores/incidents-store";
import { useUsersStore } from "@/stores/users-store";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/hooks/use-auth";
import { isWithinDateRange, DateRangeValue } from "@/lib/date-utils";
import type { Ticket as TicketType } from "@/types";
import { useTranslation } from "@/i18n";

const ITEMS_PER_PAGE = 10;

export default function TicketsPage() {
  const router = useRouter();
  const company = useCompanyParam();
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [dateRange, setDateRange] = React.useState("all_time");

  // Filters
  const [statusFilter, setStatusFilter] = React.useState("");
  const [priorityFilter, setPriorityFilter] = React.useState("");
  const [assigneeFilter, setAssigneeFilter] = React.useState("");

  const [newTicket, setNewTicket] = React.useState({
    title: "",
    description: "",
    priority: "medium",
    assigned_to: "",
    incident_id: "",
    due_date: "",
  });

  const { items: tickets, add: addTicket } = useTicketsStore();
  const { items: incidents } = useIncidentsStore();
  const { items: users } = useUsersStore();
  const { toast } = useToast();
  const { user } = useAuth();
  const { t, formatDate } = useTranslation();

  const assigneeOptions = users.map((u) => ({ value: u.id, label: u.full_name }));

  // Filter tickets
  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch = searchQuery === "" || 
      ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "" || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === "" || ticket.priority === priorityFilter;
    const matchesAssignee = assigneeFilter === "" || ticket.assigned_to === assigneeFilter;
    const matchesDate = isWithinDateRange(ticket.created_at, dateRange as DateRangeValue);
    return matchesSearch && matchesStatus && matchesPriority && matchesAssignee && matchesDate;
  });

  // Pagination
  const totalPages = Math.ceil(filteredTickets.length / ITEMS_PER_PAGE);
  const paginatedTickets = filteredTickets.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const statusCounts = {
    new: tickets.filter((t) => t.status === "new").length,
    in_progress: tickets.filter((t) => t.status === "in_progress").length,
    resolved: tickets.filter((t) => t.status === "resolved").length,
  };

  const filters = [
    {
      id: "status",
      label: "All statuses",
      options: commonFilterOptions.ticketStatus,
      value: statusFilter,
      onChange: (v: string) => { setStatusFilter(v); setCurrentPage(1); },
    },
    {
      id: "priority",
      label: "All priorities",
      options: commonFilterOptions.ticketPriority,
      value: priorityFilter,
      onChange: (v: string) => { setPriorityFilter(v); setCurrentPage(1); },
    },
    {
      id: "assignee",
      label: "All assignees",
      options: assigneeOptions,
      value: assigneeFilter,
      onChange: (v: string) => { setAssigneeFilter(v); setCurrentPage(1); },
    },
  ];

  const handleAddTicket = () => {
    if (!newTicket.title || !newTicket.description) {
      toast("Please provide a title and description", "error");
      return;
    }
    const now = new Date().toISOString();
    const ticket: TicketType = {
      id: `tkt_${Date.now()}`,
      company_id: company || user?.company_id || "",
      title: newTicket.title,
      description: newTicket.description,
      priority: newTicket.priority as TicketType["priority"],
      status: "new",
      due_date: newTicket.due_date || null,
      assigned_to: newTicket.assigned_to || null,
      assigned_groups: [],
      incident_ids: newTicket.incident_id ? [newTicket.incident_id] : [],
      created_by: user?.id || users[0]?.id || "",
      created_at: now,
      updated_at: now,
    };
    addTicket(ticket);
    toast("Ticket created successfully");
    setShowAddModal(false);
    setNewTicket({
      title: "",
      description: "",
      priority: "medium",
      assigned_to: "",
      incident_id: "",
      due_date: "",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold truncate">{t("tickets.title")}</h1>
        <Button size="sm" className="gap-2" onClick={() => setShowAddModal(true)}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          {t("tickets.newTicket")}
        </Button>
      </div>

      {/* Status summary - clickable for filtering */}
      <div className="grid gap-4 sm:grid-cols-3">
        <KPICard
          title={t("tickets.statuses.new")}
          value={statusCounts.new}
          icon={AlertCircle}
          onClick={() => { setStatusFilter(statusFilter === "new" ? "" : "new"); setCurrentPage(1); }}
          active={statusFilter === "new"}
        />
        <KPICard
          title={t("tickets.statuses.inProgress")}
          value={statusCounts.in_progress}
          icon={Clock}
          onClick={() => { setStatusFilter(statusFilter === "in_progress" ? "" : "in_progress"); setCurrentPage(1); }}
          active={statusFilter === "in_progress"}
        />
        <KPICard
          title={t("tickets.statuses.resolved")}
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
        searchPlaceholder={t("tickets.placeholders.searchTickets")}
        filters={filters}
        dateRange={dateRange}
        onDateRangeChange={(value) => { setDateRange(value); setCurrentPage(1); }}
        showDateRange={true}
      />

      {/* Tickets table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{filteredTickets.length} ticket{filteredTickets.length !== 1 ? "s" : ""}</CardTitle>
            <p className="text-sm text-muted-foreground">Page {currentPage} of {totalPages || 1}</p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-3 font-medium">{t("tickets.labels.title")}</th>
                  <th className="pb-3 font-medium">{t("tickets.labels.priority")}</th>
                  <th className="hidden pb-3 font-medium md:table-cell">{t("tickets.labels.assignee")}</th>
                  <th className="hidden pb-3 font-medium lg:table-cell">{t("tickets.labels.dueDate")}</th>
                  <th className="pb-3 font-medium">{t("tickets.labels.status")}</th>
                  <th className="pb-3 font-medium w-10"></th>
                </tr>
              </thead>
              <tbody>
                {paginatedTickets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">{t("tickets.empty.noTickets")}</td>
                  </tr>
                ) : (
                  paginatedTickets.map((ticket) => {
                    const assignee = users.find((u) => u.id === ticket.assigned_to);
                    return (
                      <tr 
                        key={ticket.id} 
                        className="border-b last:border-0 cursor-pointer hover:bg-muted/50 transition-colors group"
                        onClick={() => router.push(`/${company}/dashboard/tickets/${ticket.id}`)}
                      >
                        <td className="py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                              <Ticket className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                            </div>
                            <div>
                              <p className="font-medium">{ticket.title}</p>
                              <p className="text-xs text-muted-foreground line-clamp-1">{ticket.description}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3">
                          <Badge variant={ticket.priority === "high" || ticket.priority === "critical" ? "destructive" : ticket.priority === "medium" ? "warning" : "secondary"} className="text-xs">
                            {ticket.priority}
                          </Badge>
                        </td>
                        <td className="hidden py-3 md:table-cell">
                          <div className="flex items-center gap-2">
                            <User className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs">{assignee?.full_name || "Unassigned"}</span>
                          </div>
                        </td>
                        <td className="hidden py-3 lg:table-cell text-xs text-muted-foreground">
                          {ticket.due_date ? formatDate(new Date(ticket.due_date)) : "—"}
                        </td>
                        <td className="py-3">
                          <Badge variant={ticket.status === "new" ? "destructive" : ticket.status === "resolved" ? "success" : "secondary"} className="text-xs">
                            {ticket.status.replace("_", " ")}
                          </Badge>
                        </td>
                        <td className="py-3">
                          <Eye className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </td>
                      </tr>
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
                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredTickets.length)} of {filteredTickets.length}
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

      {/* Add Ticket Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowAddModal(false)}>
          <div className="relative w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto rounded-lg bg-background p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold">{t("tickets.createTicket")}</h2>
                <p className="text-sm text-muted-foreground">Fill in the ticket details</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowAddModal(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="title">{t("tickets.labels.title")} *</Label>
                <Input
                  id="title"
                  value={newTicket.title}
                  onChange={(e) => setNewTicket({ ...newTicket, title: e.target.value })}
                  placeholder="Brief description of the issue"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="description">{t("tickets.labels.description")} *</Label>
                <Textarea
                  id="description"
                  value={newTicket.description}
                  onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                  placeholder="Detailed description..."
                  rows={3}
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Priority</Label>
                  <select
                    title="Select priority"
                    aria-label="Select priority"
                    value={newTicket.priority}
                    onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })}
                    className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="low">{t("tickets.priorities.low")}</option>
                    <option value="medium">{t("tickets.priorities.medium")}</option>
                    <option value="high">{t("tickets.priorities.high")}</option>
                    <option value="critical">{t("tickets.priorities.critical")}</option>
                  </select>
                </div>
                <div>
                  <Label>Assign to</Label>
                  <select
                    title="Select assignee"
                    aria-label="Select assignee"
                    value={newTicket.assigned_to}
                    onChange={(e) => setNewTicket({ ...newTicket, assigned_to: e.target.value })}
                    className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select assignee...</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>{user.full_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Related incident</Label>
                  <select
                    title="Select related incident"
                    aria-label="Select related incident"
                    value={newTicket.incident_id}
                    onChange={(e) => setNewTicket({ ...newTicket, incident_id: e.target.value })}
                    className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">None</option>
                    {incidents.map((inc) => (
                      <option key={inc.id} value={inc.id}>{inc.reference_number} - {inc.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Due date</Label>
                  <Input
                    type="date"
                    value={newTicket.due_date}
                    onChange={(e) => setNewTicket({ ...newTicket, due_date: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowAddModal(false)}>{t("common.cancel")}</Button>
              <Button onClick={handleAddTicket} disabled={!newTicket.title || !newTicket.description}>{t("tickets.createTicket")}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
