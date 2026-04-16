"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock,
  FileCheck,
  Layers,
  ShieldAlert,
  Wrench,
  Calendar as CalendarIcon,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RoleGuard } from "@/components/auth/role-guard";
import { useCompanyData } from "@/hooks/use-company-data";
import { useCompanyParam } from "@/hooks/use-company-param";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "@/i18n";
import { LoadingPage } from "@/components/ui/loading";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────

type EventType = "incident" | "work_order" | "corrective_action" | "checklist" | "inspection" | "procedure";
type EventStatus = "overdue" | "due_soon" | "upcoming" | "completed";
type ViewMode = "day" | "week" | "month" | "quarter" | "year";

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  type: EventType;
  status: EventStatus;
  color: string;
  href: string;
}

const EVENT_CONFIG: Record<EventType, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  incident: { label: "Incident", icon: AlertTriangle, color: "text-red-600" },
  work_order: { label: "Work Order", icon: Wrench, color: "text-blue-600" },
  corrective_action: { label: "Corrective Action", icon: FileCheck, color: "text-amber-600" },
  checklist: { label: "Checklist", icon: ClipboardCheck, color: "text-green-600" },
  inspection: { label: "Inspection", icon: ShieldAlert, color: "text-purple-600" },
  procedure: { label: "Procedure", icon: Layers, color: "text-indigo-600" },
};

const STATUS_COLORS: Record<EventStatus, { dot: string; bg: string; text: string }> = {
  overdue: { dot: "bg-red-500", bg: "bg-red-50 dark:bg-red-950/20", text: "text-red-700 dark:text-red-400" },
  due_soon: { dot: "bg-amber-500", bg: "bg-amber-50 dark:bg-amber-950/20", text: "text-amber-700 dark:text-amber-400" },
  upcoming: { dot: "bg-blue-500", bg: "bg-blue-50 dark:bg-blue-950/20", text: "text-blue-700 dark:text-blue-400" },
  completed: { dot: "bg-green-500", bg: "bg-green-50 dark:bg-green-950/20", text: "text-green-700 dark:text-green-400" },
};

// ── Helpers ───────────────────────────────────────────────────────────────

function getMonthDays(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const startDay = first.getDay() || 7;
  const start = new Date(year, month, 1 - (startDay - 1));
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    days.push(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  }
  return days;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function getEventStatus(date: Date, isCompleted: boolean): EventStatus {
  if (isCompleted) return "completed";
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const diff = d.getTime() - now.getTime();
  const days = diff / (1000 * 60 * 60 * 24);
  if (days < 0) return "overdue";
  if (days <= 7) return "due_soon";
  return "upcoming";
}

function formatMonthYear(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ── Page ──────────────────────────────────────────────────────────────────

function CalendarPageContent() {
  const router = useRouter();
  const company = useCompanyParam();
  const { t, formatDate } = useTranslation();
  const { currentCompany } = useAuth();
  const {
    incidents,
    workOrders,
    correctiveActions,
    checklistSubmissions,
    inspectionRounds,
    procedureSubmissions,
    locations,
    stores,
  } = useCompanyData();

  const [viewMode, setViewMode] = React.useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(new Date());
  const [typeFilters, setTypeFilters] = React.useState<Set<EventType>>(new Set(["incident", "work_order", "corrective_action", "checklist", "inspection", "procedure"]));
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [selectedEvent, setSelectedEvent] = React.useState<CalendarEvent | null>(null);

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  // Aggregate all events
  const allEvents: CalendarEvent[] = React.useMemo(() => {
    const events: CalendarEvent[] = [];

    incidents.forEach((inc) => {
      if (!inc.incident_date) return;
      const d = new Date(inc.incident_date);
      if (isNaN(d.getTime())) return;
      events.push({
        id: inc.id,
        title: inc.title || "Incident",
        date: d,
        type: "incident",
        status: getEventStatus(d, inc.status === "resolved" || inc.status === "archived"),
        color: "red",
        href: `/${company}/dashboard/incidents/${inc.id}`,
      });
    });

    workOrders.forEach((wo) => {
      if (!wo.due_date) return;
      const d = new Date(wo.due_date);
      if (isNaN(d.getTime())) return;
      events.push({
        id: wo.id,
        title: wo.title || "Work Order",
        date: d,
        type: "work_order",
        status: getEventStatus(d, wo.status === "completed"),
        color: "blue",
        href: `/${company}/dashboard/work-orders/${wo.id}`,
      });
    });

    correctiveActions.forEach((ca) => {
      if (!ca.due_date) return;
      const d = new Date(ca.due_date);
      if (isNaN(d.getTime())) return;
      events.push({
        id: ca.id,
        title: ca.description || "Corrective Action",
        date: d,
        type: "corrective_action",
        status: getEventStatus(d, ca.status === "completed"),
        color: "amber",
        href: `/${company}/dashboard/corrective-actions/${ca.id}`,
      });
    });

    checklistSubmissions.forEach((cs) => {
      const dateStr = cs.submitted_at || cs.created_at;
      if (!dateStr) return;
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return;
      events.push({
        id: cs.id,
        title: "Checklist Submission",
        date: d,
        type: "checklist",
        status: "completed",
        color: "green",
        href: `/${company}/dashboard/checklists/${cs.id}`,
      });
    });

    inspectionRounds.forEach((ir) => {
      if (!ir.started_at) return;
      const d = new Date(ir.started_at);
      if (isNaN(d.getTime())) return;
      events.push({
        id: ir.id,
        title: "Inspection Round",
        date: d,
        type: "inspection",
        status: getEventStatus(d, !!ir.completed_at),
        color: "purple",
        href: `/${company}/dashboard/inspection-routes`,
      });
    });

    procedureSubmissions.forEach((ps) => {
      if (!ps.started_at) return;
      const d = new Date(ps.started_at);
      if (isNaN(d.getTime())) return;
      events.push({
        id: ps.id,
        title: "Procedure",
        date: d,
        type: "procedure",
        status: getEventStatus(d, ps.status === "completed"),
        color: "indigo",
        href: `/${company}/dashboard/checklists/procedures/${ps.id}`,
      });
    });

    return events.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [incidents, workOrders, correctiveActions, checklistSubmissions, inspectionRounds, procedureSubmissions, company]);

  const filteredEvents = React.useMemo(() => {
    return allEvents.filter((e) => {
      if (!typeFilters.has(e.type)) return false;
      if (statusFilter !== "all" && e.status !== statusFilter) return false;
      return true;
    });
  }, [allEvents, typeFilters, statusFilter]);

  const monthDays = React.useMemo(() => getMonthDays(currentYear, currentMonth), [currentYear, currentMonth]);

  const eventsForDate = (date: Date) => filteredEvents.filter((e) => isSameDay(e.date, date));

  const statusCounts = React.useMemo(() => {
    const counts = { overdue: 0, due_soon: 0, upcoming: 0, completed: 0 };
    filteredEvents.forEach((e) => { counts[e.status]++; });
    return counts;
  }, [filteredEvents]);

  const selectedDayEvents = selectedDate ? eventsForDate(selectedDate) : [];

  const navigate = (delta: number) => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  const toggleType = (type: EventType) => {
    setTypeFilters((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type); else next.add(type);
      return next;
    });
  };

  const today = new Date();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <CalendarIcon className="h-6 w-6 text-muted-foreground" />
          <h1 className="text-2xl font-semibold">Calendar</h1>
        </div>
        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex rounded-lg border bg-muted/30 p-0.5">
            {(["day", "week", "month", "quarter", "year"] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-medium transition-colors capitalize",
                  viewMode === mode ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {mode}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={() => { setCurrentDate(new Date()); setSelectedDate(new Date()); }}>
            Today
          </Button>
        </div>
      </div>

      {/* Status summary + filters */}
      <div className="flex flex-col gap-4 lg:flex-row">
        {/* Status cards */}
        <div className="grid grid-cols-4 gap-2 flex-1">
          {(["overdue", "due_soon", "upcoming", "completed"] as EventStatus[]).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter((prev) => prev === status ? "all" : status)}
              className={cn(
                "rounded-lg border p-3 text-left transition-colors",
                statusFilter === status ? STATUS_COLORS[status].bg + " border-current" : "hover:bg-muted/50",
              )}
            >
              <div className="flex items-center gap-2">
                <div className={cn("h-2.5 w-2.5 rounded-full", STATUS_COLORS[status].dot)} />
                <span className="text-xs font-medium capitalize">{status.replace("_", " ")}</span>
              </div>
              <p className={cn("text-xl font-bold mt-1", STATUS_COLORS[status].text)}>{statusCounts[status]}</p>
            </button>
          ))}
        </div>

        {/* Type filters */}
        <div className="flex flex-wrap gap-1.5 items-start">
          {(Object.entries(EVENT_CONFIG) as [EventType, typeof EVENT_CONFIG[EventType]][]).map(([type, config]) => {
            const Icon = config.icon;
            const active = typeFilters.has(type);
            return (
              <button
                key={type}
                type="button"
                onClick={() => toggleType(type)}
                className={cn(
                  "flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors",
                  active ? "bg-background border-primary/30 text-foreground" : "bg-muted/30 text-muted-foreground/50 line-through",
                )}
              >
                <Icon className={cn("h-3 w-3", active ? config.color : "text-muted-foreground/30")} />
                {config.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-semibold">{formatMonthYear(currentDate)}</h2>
        <Button variant="ghost" size="icon" onClick={() => navigate(1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar grid (month view) */}
      {viewMode === "month" && (
        <div className="rounded-lg border overflow-hidden">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b bg-muted/30">
            {WEEKDAYS.map((d) => (
              <div key={d} className="py-2 text-center text-xs font-medium text-muted-foreground">{d}</div>
            ))}
          </div>
          {/* Day cells */}
          <div className="grid grid-cols-7">
            {monthDays.map((day, i) => {
              const isCurrentMonth = day.getMonth() === currentMonth;
              const isToday = isSameDay(day, today);
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const dayEvents = eventsForDate(day);
              const hasOverdue = dayEvents.some((e) => e.status === "overdue");
              const hasDueSoon = dayEvents.some((e) => e.status === "due_soon");
              const hasUpcoming = dayEvents.some((e) => e.status === "upcoming");

              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    "relative min-h-[80px] border-b border-r p-1.5 text-left transition-colors hover:bg-muted/50",
                    !isCurrentMonth && "bg-muted/10 text-muted-foreground/40",
                    isSelected && "bg-primary/5 ring-1 ring-primary/30",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                      isToday && "bg-primary text-primary-foreground",
                    )}>
                      {day.getDate()}
                    </span>
                    {/* Dots */}
                    {dayEvents.length > 0 && (
                      <div className="flex gap-0.5">
                        {hasOverdue && <div className="h-1.5 w-1.5 rounded-full bg-red-500" />}
                        {hasDueSoon && <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />}
                        {hasUpcoming && <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />}
                      </div>
                    )}
                  </div>
                  {/* Event previews */}
                  <div className="mt-1 space-y-0.5">
                    {dayEvents.slice(0, 2).map((e) => {
                      const cfg = EVENT_CONFIG[e.type];
                      return (
                        <div key={e.id} className={cn("truncate rounded px-1 py-0.5 text-[10px] font-medium", STATUS_COLORS[e.status].bg, STATUS_COLORS[e.status].text)}>
                          {e.title}
                        </div>
                      );
                    })}
                    {dayEvents.length > 2 && (
                      <div className="text-[10px] text-muted-foreground px-1">+{dayEvents.length - 2} more</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Week view */}
      {viewMode === "week" && (() => {
        const startOfWeek = new Date(currentDate);
        const dow = startOfWeek.getDay() || 7;
        startOfWeek.setDate(startOfWeek.getDate() - (dow - 1));
        const weekDays = Array.from({ length: 7 }, (_, i) => new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate() + i));

        return (
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day) => {
              const isToday = isSameDay(day, today);
              const dayEvents = eventsForDate(day);
              return (
                <div key={day.toISOString()} className={cn("rounded-lg border p-2 min-h-[200px]", isToday && "ring-1 ring-primary/30")}>
                  <p className={cn("text-xs font-medium mb-2", isToday ? "text-primary" : "text-muted-foreground")}>
                    {day.toLocaleDateString("en-US", { weekday: "short", day: "numeric" })}
                  </p>
                  <div className="space-y-1">
                    {dayEvents.map((e) => (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => setSelectedEvent(e)}
                        className={cn("w-full truncate rounded px-1.5 py-1 text-[11px] font-medium text-left", STATUS_COLORS[e.status].bg, STATUS_COLORS[e.status].text)}
                      >
                        {e.title}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* Day view */}
      {viewMode === "day" && (() => {
        const dayEvents = eventsForDate(currentDate);
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{formatDate(currentDate)} — {dayEvents.length} event(s)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {dayEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No events on this day.</p>
              ) : dayEvents.map((e) => {
                const cfg = EVENT_CONFIG[e.type];
                const Icon = cfg.icon;
                return (
                  <div key={e.id} className={cn("flex items-start gap-3 rounded-lg border p-3", STATUS_COLORS[e.status].bg)}>
                    <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", cfg.color)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{e.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px]">{cfg.label}</Badge>
                        <Badge variant="outline" className={cn("text-[10px]", STATUS_COLORS[e.status].text)}>{e.status.replace("_", " ")}</Badge>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => router.push(e.href)}>Open</Button>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })()}

      {/* Quarter view */}
      {viewMode === "quarter" && (
        <div className="grid grid-cols-3 gap-4">
          {[0, 1, 2].map((offset) => {
            const m = currentMonth + offset;
            const y = currentYear + Math.floor(m / 12);
            const mo = m % 12;
            const days = getMonthDays(y, mo);
            return (
              <div key={offset} className="rounded-lg border p-3">
                <p className="text-sm font-semibold mb-2">{new Date(y, mo).toLocaleDateString("en-US", { month: "long" })}</p>
                <div className="grid grid-cols-7 gap-0.5">
                  {WEEKDAYS.map((d) => <div key={d} className="text-center text-[9px] text-muted-foreground">{d[0]}</div>)}
                  {days.slice(0, 42).map((day, i) => {
                    const inMonth = day.getMonth() === mo;
                    const events = eventsForDate(day);
                    const hasRed = events.some((e) => e.status === "overdue");
                    const hasAmber = events.some((e) => e.status === "due_soon");
                    const hasBlue = events.some((e) => e.status === "upcoming");
                    return (
                      <div key={i} className={cn("h-5 flex items-center justify-center text-[9px] rounded", !inMonth && "text-muted-foreground/20")}>
                        <span className="relative">
                          {day.getDate()}
                          {events.length > 0 && (
                            <span className={cn("absolute -bottom-0.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full", hasRed ? "bg-red-500" : hasAmber ? "bg-amber-500" : hasBlue ? "bg-blue-500" : "bg-green-500")} />
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Year view */}
      {viewMode === "year" && (
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 12 }, (_, mo) => {
            const days = getMonthDays(currentYear, mo);
            return (
              <button
                key={mo}
                type="button"
                onClick={() => { setCurrentDate(new Date(currentYear, mo, 1)); setViewMode("month"); }}
                className="rounded-lg border p-2 hover:bg-muted/50 transition-colors text-left"
              >
                <p className="text-xs font-semibold mb-1">{new Date(currentYear, mo).toLocaleDateString("en-US", { month: "short" })}</p>
                <div className="grid grid-cols-7 gap-px">
                  {days.slice(0, 42).map((day, i) => {
                    const inMonth = day.getMonth() === mo;
                    const events = eventsForDate(day);
                    return (
                      <div key={i} className={cn("h-3 flex items-center justify-center", !inMonth && "opacity-0")}>
                        {events.length > 0 && (
                          <div className={cn("h-1.5 w-1.5 rounded-full", events.some((e) => e.status === "overdue") ? "bg-red-500" : events.some((e) => e.status === "due_soon") ? "bg-amber-500" : "bg-blue-500")} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Selected day events panel */}
      {selectedDate && viewMode === "month" && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">
                {formatDate(selectedDate)} — {selectedDayEvents.length} event(s)
              </CardTitle>
              {selectedDayEvents.length > 0 && (
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setCurrentDate(selectedDate); setViewMode("day"); }}>
                  View day
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {selectedDayEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No events on this day.</p>
            ) : (
              <div className="space-y-2">
                {selectedDayEvents.map((e) => {
                  const cfg = EVENT_CONFIG[e.type];
                  const Icon = cfg.icon;
                  return (
                    <div
                      key={e.id}
                      className={cn("flex items-center gap-3 rounded-lg border p-2.5 cursor-pointer hover:bg-muted/50 transition-colors", STATUS_COLORS[e.status].bg)}
                      onClick={() => router.push(e.href)}
                    >
                      <div className={cn("h-2 w-2 rounded-full shrink-0", STATUS_COLORS[e.status].dot)} />
                      <Icon className={cn("h-4 w-4 shrink-0", cfg.color)} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{e.title}</p>
                        <p className="text-[10px] text-muted-foreground">{cfg.label} · {e.status.replace("_", " ")}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function CalendarPage() {
  return (
    <RoleGuard requiredPermission="incidents.view_own">
      <React.Suspense fallback={<LoadingPage />}>
        <CalendarPageContent />
      </React.Suspense>
    </RoleGuard>
  );
}
