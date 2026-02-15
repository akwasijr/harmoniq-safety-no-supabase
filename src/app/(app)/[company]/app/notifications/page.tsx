"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Newspaper,
  ClipboardCheck,
  AlertTriangle,
  Wrench,
  Bell,
  CheckCircle,
  Clock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useContentStore } from "@/stores/content-store";
import { useChecklistTemplatesStore, useChecklistSubmissionsStore } from "@/stores/checklists-store";
import { useIncidentsStore } from "@/stores/incidents-store";
import { useTicketsStore } from "@/stores/tickets-store";
import { useCompanyParam } from "@/hooks/use-company-param";
import { useTranslation } from "@/i18n";
import { cn } from "@/lib/utils";

interface NotificationItem {
  id: string;
  type: "news" | "task" | "incident" | "ticket";
  title: string;
  description: string;
  timestamp: Date;
  read: boolean;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
}

export default function NotificationsPage() {
  const company = useCompanyParam();
  const router = useRouter();
  const { user } = useAuth();
  const { items: contentItems } = useContentStore();
  const { items: checklistTemplates } = useChecklistTemplatesStore();
  const { items: checklistSubmissions } = useChecklistSubmissionsStore();
  const { items: incidents } = useIncidentsStore();
  const { items: tickets } = useTicketsStore();
  const { t, formatDate } = useTranslation();

  const notifications = React.useMemo<NotificationItem[]>(() => {
    if (!user) return [];
    const items: NotificationItem[] = [];

    // News notifications
    contentItems
      .filter((item) => item.status === "published" && item.type === "news")
      .forEach((item) => {
        items.push({
          id: `news-${item.id}`,
          type: "news",
          title: item.title,
          description: item.category || "Company news",
          timestamp: new Date(item.published_at || item.created_at),
          read: false,
          href: `/${company}/app/news/${item.id}`,
          icon: Newspaper,
          iconColor: "text-blue-500 bg-blue-50",
        });
      });

    // Pending checklist tasks
    const completedIds = new Set(
      checklistSubmissions
        .filter((s) => s.submitter_id === user.id && s.status === "submitted")
        .map((s) => s.template_id)
    );
    checklistTemplates
      .filter((template) => !completedIds.has(template.id))
      .forEach((template) => {
        items.push({
          id: `task-${template.id}`,
          type: "task",
          title: template.name,
          description: `${template.items?.length || 0} items to complete`,
          timestamp: new Date(template.created_at || Date.now()),
          read: false,
          href: `/${company}/app/checklists/${template.id}`,
          icon: ClipboardCheck,
          iconColor: "text-primary bg-primary/10",
        });
      });

    // Recent incidents reported by user
    incidents
      .filter((inc) => inc.reporter_id === user.id)
      .slice(0, 5)
      .forEach((inc) => {
        items.push({
          id: `incident-${inc.id}`,
          type: "incident",
          title: inc.title || "Incident report",
          description: `Status: ${inc.status}`,
          timestamp: new Date(inc.incident_date),
          read: true,
          href: `/${company}/app/incidents/${inc.id}`,
          icon: AlertTriangle,
          iconColor: "text-orange-500 bg-orange-50",
        });
      });

    // Assigned tickets
    tickets
      .filter((ticket) => ticket.assigned_to === user.id && ticket.status === "new")
      .forEach((ticket) => {
        items.push({
          id: `ticket-${ticket.id}`,
          type: "ticket",
          title: ticket.title || "Work order",
          description: `Priority: ${ticket.priority || "normal"}`,
          timestamp: new Date(ticket.created_at || Date.now()),
          read: false,
          href: `/${company}/app/maintenance`,
          icon: Wrench,
          iconColor: "text-purple-500 bg-purple-50",
        });
      });

    // Sort by newest first
    items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return items;
  }, [user, contentItems, checklistTemplates, checklistSubmissions, incidents, tickets, company]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="sticky top-14 z-20 flex items-center gap-3 border-b bg-background px-4 py-3">
        <button
          onClick={() => router.back()}
          className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-semibold">Notifications</h1>
        </div>
        {unreadCount > 0 && (
          <Badge variant="secondary" className="text-xs">
            {unreadCount} new
          </Badge>
        )}
      </div>

      {/* Notification list */}
      <div className="flex-1">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <Bell className="h-12 w-12 text-muted-foreground/30" aria-hidden="true" />
            <p className="text-sm font-medium text-muted-foreground mt-4">No notifications</p>
            <p className="text-xs text-muted-foreground/70 mt-1 text-center">
              You&apos;re all caught up! Notifications about tasks, news, and incidents will appear here.
            </p>
          </div>
        ) : (
          <ul className="divide-y">
            {notifications.map((notification) => (
              <li key={notification.id}>
                <Link
                  href={notification.href}
                  className={cn(
                    "flex items-start gap-3 px-4 py-3.5 transition-colors active:bg-muted/50 hover:bg-muted/30",
                    !notification.read && "bg-primary/[0.03]"
                  )}
                >
                  <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full mt-0.5", notification.iconColor)}>
                    <notification.icon className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn("text-sm leading-tight line-clamp-2", !notification.read && "font-semibold")}>
                        {notification.title}
                      </p>
                      {!notification.read && (
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{notification.description}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Clock className="h-3 w-3 text-muted-foreground/60" aria-hidden="true" />
                      <span className="text-[11px] text-muted-foreground/60">
                        {formatDate(notification.timestamp)}
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
