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
import { useCompanyData } from "@/hooks/use-company-data";
import { useTicketsStore } from "@/stores/tickets-store";
import { useNotificationsStore } from "@/stores/notifications-store";
import { notifyAssignment } from "@/stores/notification-triggers";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/hooks/use-auth";
import type { Ticket } from "@/types";
import { useTranslation } from "@/i18n";
import { RoleGuard } from "@/components/auth/role-guard";

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
  const { add: addNotif } = useNotificationsStore();
  const { users, teams, incidents } = useCompanyData();
  const [formData, setFormData] = React.useState({
    title: "",
    description: "",
    priority: "medium",
    assigned_to: "",
    assigned_to_team_id: "",
    due_date: "",
    incident_id: "",
  });
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const validateField = (field: string, value: string) => {
    const next = { ...errors };
    if (field === "title") {
      if (!value.trim()) {
        next.title = t("validation.required");
      } else if (value.trim().length < 3) {
        next.title = t("validation.minLength", { min: "3" });
      } else {
        delete next.title;
      }
    }
    if (field === "description") {
      if (value.trim().length > 0 && value.trim().length < 10) {
        next.description = t("validation.minLength", { min: "10" });
      } else {
        delete next.description;
      }
    }
    setErrors(next);
  };

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
      assigned_to_team_id: formData.assigned_to_team_id || null,
      assigned_groups: formData.assigned_to_team_id ? [formData.assigned_to_team_id] : [],
      incident_ids: formData.incident_id ? [formData.incident_id] : [],
      created_by: user?.id || users[0]?.id || "",
      created_at: now,
      updated_at: now,
    };
    addTicket(ticket);
    if (ticket.assigned_to) {
      notifyAssignment(addNotif, {
        userId: ticket.assigned_to,
        companyId: ticket.company_id,
        entityType: "ticket",
        entityTitle: ticket.title,
        entityId: ticket.id,
        assignedBy: user?.full_name || "Someone",
      });
    }
    toast("Ticket created successfully");
    router.push(`/${company}/dashboard/tickets`);
  };

  return (
    <RoleGuard requiredPermission="incidents.create">
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">{t("tickets.createTicket")}</h1>
          <p className="text-sm text-muted-foreground">
            Use tickets for incident follow-up and investigation coordination. Use work orders for maintenance and corrective actions for remediation.
          </p>
        </div>
        <Button onClick={handleSubmit} disabled={isSubmitting || Object.keys(errors).length > 0 || !formData.title}>
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
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-muted-foreground">
                Tickets are best for coordination, investigation follow-up, and incident-linked tasks that do not need to be treated as maintenance work.
              </div>
              <div>
                <Label htmlFor="title">{t("tickets.labels.title")} *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => {
                    setFormData({ ...formData, title: e.target.value });
                    if (errors.title) validateField("title", e.target.value);
                  }}
                  onBlur={(e) => validateField("title", e.target.value)}
                  placeholder={t("tickets.placeholders.briefDescription")}
                  className={cn("mt-1", errors.title && "border-red-500")}
                />
                {errors.title && <p className="text-sm text-red-500 mt-1">{errors.title}</p>}
              </div>

              <div>
                <Label htmlFor="description">{t("tickets.labels.description")}</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => {
                    setFormData({ ...formData, description: e.target.value });
                    if (errors.description) validateField("description", e.target.value);
                  }}
                  onBlur={(e) => validateField("description", e.target.value)}
                  placeholder={t("tickets.placeholders.detailedDescription")}
                  rows={6}
                  className={cn("mt-1", errors.description && "border-red-500")}
                />
                {errors.description && <p className="text-sm text-red-500 mt-1">{errors.description}</p>}
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

              <Label htmlFor="assigned_to_team" className="mt-4 block">Assign team</Label>
              <select
                id="assigned_to_team"
                value={formData.assigned_to_team_id}
                onChange={(e) => setFormData({ ...formData, assigned_to_team_id: e.target.value })}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">No team</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
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
    </RoleGuard>
  );
}
