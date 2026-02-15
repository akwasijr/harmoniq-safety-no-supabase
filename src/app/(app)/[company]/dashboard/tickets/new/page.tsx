"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useCompanyParam } from "@/hooks/use-company-param";
import {
  ArrowLeft,
  Save,
  AlertTriangle,
  Link as LinkIcon,
  User,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useTicketsStore } from "@/stores/tickets-store";
import { useUsersStore } from "@/stores/users-store";
import { useIncidentsStore } from "@/stores/incidents-store";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/hooks/use-auth";
import type { Ticket } from "@/types";
import { useTranslation } from "@/i18n";

const priorities = [
  { value: "low", label: "Low", color: "bg-green-100 text-green-800" },
  { value: "medium", label: "Medium", color: "bg-yellow-100 text-yellow-800" },
  { value: "high", label: "High", color: "bg-orange-100 text-orange-800" },
  { value: "critical", label: "Critical", color: "bg-red-100 text-red-800" },
];

export default function NewTicketPage() {
  const router = useRouter();
  const company = useCompanyParam();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { add: addTicket } = useTicketsStore();
  const { items: users } = useUsersStore();
  const { items: incidents } = useIncidentsStore();
  const [formData, setFormData] = React.useState({
    title: "",
    description: "",
    priority: "medium",
    assigned_to: "",
    due_date: "",
    incident_id: "",
  });

  const assignees = users.filter((u) => u.role === "company_admin" || u.role === "manager");
  const openIncidents = incidents.filter((i) => i.status !== "resolved");

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const now = new Date().toISOString();
    const ticket: Ticket = {
      id: crypto.randomUUID(),
      company_id: company || user?.company_id || "",
      title: formData.title,
      description: formData.description,
      priority: formData.priority as Ticket["priority"],
      status: "new",
      due_date: formData.due_date || null,
      assigned_to: formData.assigned_to || null,
      assigned_groups: [],
      incident_ids: formData.incident_id ? [formData.incident_id] : [],
      created_by: user?.id || users[0]?.id || "",
      created_at: now,
      updated_at: now,
    };
    addTicket(ticket);
    toast("Ticket created successfully");
    router.push(`/${company}/dashboard/tickets`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">{t("tickets.createTicket")}</h1>
          <p className="text-sm text-muted-foreground">
            Create a new work ticket for follow-up actions
          </p>
        </div>
        <Button onClick={handleSubmit} disabled={isSubmitting || !formData.title}>
          <Save className="h-4 w-4 mr-2" />
          {t("tickets.createTicket")}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("tickets.title")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">{t("tickets.labels.title")} *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Brief description of the task"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="description">{t("tickets.labels.description")}</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detailed description of what needs to be done..."
                  rows={6}
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          {/* Priority */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("tickets.labels.priority")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-3">
                {priorities.map((priority) => (
                  <button
                    key={priority.value}
                    onClick={() => setFormData({ ...formData, priority: priority.value })}
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-lg border-2 py-3 px-4 transition-all",
                      formData.priority === priority.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <div className={cn("h-3 w-3 rounded-full", priority.color)} />
                    <span className={cn(
                      "font-medium text-sm",
                      formData.priority === priority.value && "text-primary"
                    )}>
                      {priority.label}
                    </span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Link to Incident */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <LinkIcon className="h-4 w-4" />
                {t("tickets.labels.relatedIncident")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <select
                value={formData.incident_id}
                onChange={(e) => setFormData({ ...formData, incident_id: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">No linked incident</option>
                {openIncidents.map((incident) => (
                  <option key={incident.id} value={incident.id}>
                    {incident.reference_number} - {incident.description.slice(0, 50)}...
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-muted-foreground">
                Optionally link this ticket to an existing incident
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4" />
                {t("tickets.labels.assignee")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Label htmlFor="assigned_to">{t("tickets.labels.assignee")}</Label>
              <select
                id="assigned_to"
                value={formData.assigned_to}
                onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Unassigned</option>
                {assignees.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.full_name} ({user.role.replace("_", " ")})
                  </option>
                ))}
              </select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {t("tickets.labels.dueDate")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                When should this task be completed?
              </p>
            </CardContent>
          </Card>

          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Quick tip</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Link tickets to incidents for better tracking and reporting. 
                    Assigned users will receive notifications.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
