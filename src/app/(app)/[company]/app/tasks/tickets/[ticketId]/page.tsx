"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { Ticket, Calendar, UserIcon, AlertTriangle, Clock, FileText, LinkIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTicketsStore } from "@/stores/tickets-store";
import { useUsersStore } from "@/stores/users-store";
import { useIncidentsStore } from "@/stores/incidents-store";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/components/ui/toast";
import { useTranslation } from "@/i18n";
import { LoadingPage } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";
import { TaskDetailHeader, PRIORITY_CONFIG } from "@/components/tasks/task-detail-header";
import { TaskInfoCard } from "@/components/tasks/task-info-card";
import { TaskStatusActions } from "@/components/tasks/task-status-actions";
import { TaskDetailTabs } from "@/components/tasks/task-detail-tabs";
import { TaskComments, loadComments } from "@/components/tasks/task-comments";
import { TaskDocuments } from "@/components/tasks/task-documents";
import { TicketSubtasks } from "@/components/tasks/ticket-subtasks";
import { getFilesForEntity } from "@/lib/file-storage";
import { isAssignedToUserOrTeam } from "@/lib/assignment-utils";
import { ArrowLeft } from "lucide-react";
import type { TicketStatus } from "@/types";

export default function TicketDetailPage() {
  const router = useRouter();
  const params = useParams();
  const rawCompany = params.company;
  const company = typeof rawCompany === "string" ? rawCompany : Array.isArray(rawCompany) ? rawCompany[0] : "";
  const rawTicketId = params.ticketId;
  const ticketId = typeof rawTicketId === "string" ? rawTicketId : Array.isArray(rawTicketId) ? rawTicketId[0] : "";

  const { user } = useAuth();
  const { t, formatDate } = useTranslation();
  const { toast } = useToast();

  const { items: tickets, update: updateTicket, isLoading } = useTicketsStore();
  const { items: users } = useUsersStore();
  const { items: incidents } = useIncidentsStore();

  const [activeTab, setActiveTab] = React.useState("details");

  const matchedTicket = tickets.find((t) => t.id === ticketId);
  const ticket =
    matchedTicket &&
    user?.company_id &&
    matchedTicket.company_id === user.company_id &&
    isAssignedToUserOrTeam(matchedTicket, user)
      ? matchedTicket
      : undefined;
  const assignee = ticket?.assigned_to ? users.find((u) => u.id === ticket.assigned_to) : null;
  const creator = ticket?.created_by ? users.find((u) => u.id === ticket.created_by) : null;
  const linkedIncidents = (ticket?.incident_ids || []).map((id) => incidents.find((i) => i.id === id)).filter(Boolean);

  const isOverdue = (() => {
    if (!ticket?.due_date) return false;
    if (["resolved", "closed"].includes(ticket.status)) return false;
    return new Date(ticket.due_date) < new Date();
  })();

  const commentCount = loadComments("ticket", ticketId).length;
  const docCount = getFilesForEntity("ticket", ticketId).length;

  const handleStatusChange = React.useCallback(
    (targetStatus: string) => {
      updateTicket(ticketId, { status: targetStatus as TicketStatus, updated_at: new Date().toISOString() });
      toast("Status updated", "success");
    },
    [ticketId, updateTicket, toast],
  );

  if (isLoading) return <LoadingPage />;

  if (!ticket) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Ticket Not Found"
        description="This ticket may have been deleted or you don't have access."
        action={<Button variant="outline" onClick={() => router.back()}><ArrowLeft className="h-4 w-4 mr-2" />Go Back</Button>}
      />
    );
  }

  const priorityConf = PRIORITY_CONFIG[ticket.priority];

  const tabs = [
    { id: "details", label: "Details" },
    { id: "subtasks", label: "Subtasks" },
    { id: "activity", label: "Activity", count: commentCount },
    { id: "files", label: "Files", count: docCount },
  ];

  return (
    <div className="flex flex-col min-h-full bg-background">
      <TaskDetailHeader title="Ticket" subtitle={`#${ticketId.slice(0, 10)}`} status={ticket.status} overdue={isOverdue} />

      {/* Overdue banner */}
      {isOverdue && (
        <div className="mx-4 mt-3 flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 px-3 py-2">
          <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
          <p className="text-xs font-medium text-red-700 dark:text-red-300">
            Overdue — was due {formatDate(new Date(ticket.due_date!), { month: "short", day: "numeric" })}
          </p>
        </div>
      )}

      <TaskDetailTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="flex-1 px-4 py-4 space-y-4">
        {activeTab === "details" && (
          <>
            {/* Title & badges */}
            <div>
              <div className="flex items-start gap-3 mb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 shrink-0">
                  <Ticket className="h-5 w-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                </div>
                <h2 className="text-lg font-semibold leading-tight pt-1">{ticket.title}</h2>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {priorityConf && <Badge className={priorityConf.color}>{priorityConf.label}</Badge>}
              </div>
            </div>

            <TaskInfoCard rows={[
              { icon: UserIcon, label: "Created by", value: creator?.full_name || "Unknown" },
              { icon: UserIcon, label: "Assigned to", value: assignee?.full_name || "Unassigned" },
              ...(ticket.due_date ? [{ icon: Calendar, label: "Due date", value: formatDate(new Date(ticket.due_date), { weekday: "short", month: "short", day: "numeric", year: "numeric" }), valueClassName: isOverdue ? "text-red-600 dark:text-red-400" : undefined }] : []),
              { icon: Clock, label: "Created", value: formatDate(ticket.created_at) },
            ]} />

            {/* Description */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4" />Description</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{ticket.description || "No description provided."}</p>
              </CardContent>
            </Card>

            {/* Linked incidents */}
            {linkedIncidents.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2"><LinkIcon className="h-4 w-4" />Linked Incidents</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  {linkedIncidents.map((inc) => inc && (
                    <button
                      key={inc.id}
                      onClick={() => router.push(`/${company}/app/incidents/${inc.id}`)}
                      className="flex items-center gap-2 w-full p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left"
                    >
                      <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{inc.title}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(inc.incident_date)}</p>
                      </div>
                    </button>
                  ))}
                </CardContent>
              </Card>
            )}

            <TaskStatusActions kind="ticket" currentStatus={ticket.status} onStatusChange={handleStatusChange} />
          </>
        )}

        {activeTab === "subtasks" && <TicketSubtasks ticketId={ticketId} />}
        {activeTab === "activity" && <TaskComments entityType="ticket" entityId={ticketId} formatDate={formatDate} />}
        {activeTab === "files" && <TaskDocuments entityType="ticket" entityId={ticketId} formatDate={formatDate} />}
      </div>
    </div>
  );
}
