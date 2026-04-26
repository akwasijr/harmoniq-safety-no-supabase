"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Download,
  FileText,
  Image as ImageIcon,
  Link as LinkIcon,
  MapPin,
  MoreHorizontal,
  Paperclip,
  Plus,
  Search,
  X,
  Calendar as CalendarIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { RoleGuard } from "@/components/auth/role-guard";
import { useCompanyData } from "@/hooks/use-company-data";
import { useCompanyParam } from "@/hooks/use-company-param";
import { useAuth } from "@/hooks/use-auth";
import { useUsersStore } from "@/stores/users-store";
import { useCustomEventsStore, type CustomEvent } from "@/stores/custom-events-store";
import { useCalendarEvents, EVENT_CONFIG, STATUS_COLORS, getEventStatus } from "@/hooks/use-calendar-events";
import type { CalendarEvent, EventType, EventStatus } from "@/hooks/use-calendar-events";
import { LoadingPage } from "@/components/ui/loading";
import { cn } from "@/lib/utils";

// ── Types (re-exported from hook) ─────────────────────────────────────────

const INLINE_FILTER_TYPES: EventType[] = ["incident", "work_order", "checklist"];
const MORE_FILTER_TYPES: EventType[] = ["corrective_action", "inspection", "procedure", "training", "certification", "compliance"];

// STATUS_COLORS imported from use-calendar-events hook

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_FULL_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const STATUS_BADGE_MAP: Record<EventStatus, { label: string; classes: string }> = {
  completed: { label: "Done", classes: "[background-color:#16a34a] [color:#fff]" },
  upcoming: { label: "Upcoming", classes: "[background-color:#2563eb] [color:#fff]" },
  due_soon: { label: "Due soon", classes: "[background-color:#d97706] [color:#fff]" },
  overdue: { label: "Overdue", classes: "[background-color:#dc2626] [color:#fff]" },
};

const PROGRESS_MAP: Record<EventStatus, { width: string; color: string }> = {
  completed: { width: "100%", color: "bg-green-500" },
  upcoming: { width: "15%", color: "bg-blue-500" },
  due_soon: { width: "60%", color: "bg-amber-500" },
  overdue: { width: "35%", color: "bg-red-500" },
};

const CUSTOM_EVENT_TYPE_LABELS: Record<CustomEvent["event_type"], string> = {
  safety_meeting: "Safety Meeting",
  drill: "Drill",
  audit: "Audit",
  training: "Training",
  inspection: "Inspection",
  other: "Other",
};

// ── Helpers ───────────────────────────────────────────────────────────────

// getEventStatus imported from use-calendar-events hook

function getTimelineDotColor(status: EventStatus): string {
  if (status === "completed" || status === "upcoming") return "bg-green-500";
  if (status === "due_soon") return "bg-amber-500";
  return "bg-red-500";
}

function formatEventDate(date: Date): string {
  return `${MONTH_NAMES[date.getMonth()]} ${date.getDate()}`;
}

function getISOWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

type ViewMode = "day" | "week" | "month" | "quarter" | "year";

const VIEW_MODES: { value: ViewMode; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "quarter", label: "Quarter" },
  { value: "year", label: "Year" },
];

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getMonthDays(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const startDay = first.getDay() || 7; // Monday = 1
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

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay() || 7; // Monday = 1
  d.setDate(d.getDate() - (day - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

function getQuarterForMonth(month: number): number {
  return Math.floor(month / 3);
}

// ── ICS helpers ───────────────────────────────────────────────────────────

function formatICSLocal(d: Date): string {
  // Floating local time per RFC 5545 — no Z suffix, no TZID. The recipient's
  // calendar app will treat this as wall-clock time in their own timezone.
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
    `T${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  );
}

function generateICS(event: { title: string; description: string; date: string; location?: string; link?: string }): string {
  const d = new Date(event.date);
  const dtStart = formatICSLocal(d);
  const dtEnd = formatICSLocal(new Date(d.getTime() + 3600000));
  const location = [event.location, event.link].filter(Boolean).join(" | ");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Harmoniq//Safety//EN",
    "BEGIN:VEVENT",
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${event.title}`,
    `DESCRIPTION:${event.description || ""}`,
    location ? `LOCATION:${location}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");
}

function downloadICS(event: CalendarEvent & { physical_location?: string; meeting_link?: string; description?: string }) {
  const ics = generateICS({
    title: event.title,
    description: event.description || "",
    date: event.date.toISOString(),
    location: event.physical_location,
    link: event.meeting_link,
  });
  const blob = new Blob([ics], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${event.title.replace(/\s+/g, "_")}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Page ──────────────────────────────────────────────────────────────────

function CalendarPageContent() {
  const router = useRouter();
  const company = useCompanyParam();
  const { user, currentCompany } = useAuth();
  const {
    users: companyUsers,
  } = useCompanyData();
  const customEventsStore = useCustomEventsStore();
  const companyId = currentCompany?.id || user?.company_id;
  const customEventsAll = customEventsStore.itemsForCompany(companyId);

  const now = new Date();
  const currentYear = now.getFullYear();
  const [selectedMonth, setSelectedMonth] = React.useState(now.getMonth());
  const [viewMode, setViewMode] = React.useState<ViewMode>("month");
  const [selectedDate, setSelectedDate] = React.useState<Date>(new Date(now));
  const [currentDate, setCurrentDate] = React.useState<Date>(new Date(now));
  const [typeFilters, setTypeFilters] = React.useState<Set<EventType>>(
    () => new Set(Object.keys(EVENT_CONFIG) as EventType[])
  );
  const [statusFilter, setStatusFilter] = React.useState<EventStatus | null>(null);

  // More dropdown state
  const [filterOpen, setFilterOpen] = React.useState(false);
  const filterRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!filterOpen) return;
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [filterOpen]);

  // Add Event modal state
  const [showAddEvent, setShowAddEvent] = React.useState(false);
  const [editingEventId, setEditingEventId] = React.useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = React.useState<string | null>(null);
  const [openCardMenu, setOpenCardMenu] = React.useState<string | null>(null);
  const [newTitle, setNewTitle] = React.useState("");
  const [newDate, setNewDate] = React.useState("");
  const [newDescription, setNewDescription] = React.useState("");
  const [newEventType, setNewEventType] = React.useState<CustomEvent["event_type"]>("safety_meeting");
  const [newShareMode, setNewShareMode] = React.useState<"private" | "everyone" | "select">("private");
  const [newSharedWith, setNewSharedWith] = React.useState<Set<string>>(new Set());
  const [newPhysicalLocation, setNewPhysicalLocation] = React.useState("");
  const [newMeetingLink, setNewMeetingLink] = React.useState("");
  const [newAttachments, setNewAttachments] = React.useState<Array<{ name: string; data: string; type: string }>>([]);
  const [peopleSearch, setPeopleSearch] = React.useState("");
  const [qSelectedMonth, setQSelectedMonth] = React.useState<number>(-1);
  const [uploadError, setUploadError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!uploadError) return;
    const t = window.setTimeout(() => setUploadError(null), 4000);
    return () => window.clearTimeout(t);
  }, [uploadError]);

  const handleFileUpload = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const maxFiles = 5;
    const maxSize = 5 * 1024 * 1024;
    const rejected: string[] = [];

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
        rejected.push(`${file.name} (unsupported type)`);
        return;
      }
      if (file.size > maxSize) {
        rejected.push(`${file.name} (over 5 MB)`);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        setNewAttachments((prev) => {
          if (prev.length >= maxFiles) {
            setUploadError(`Maximum ${maxFiles} attachments — ${file.name} skipped.`);
            return prev;
          }
          return [...prev, { name: file.name, data: reader.result as string, type: file.type }];
        });
      };
      reader.readAsDataURL(file);
    });
    if (rejected.length > 0) {
      setUploadError(`Skipped: ${rejected.join(", ")}`);
    }
    e.target.value = "";
  }, []);

  const resetForm = React.useCallback(() => {
    setNewTitle("");
    setNewDate("");
    setNewDescription("");
    setNewEventType("safety_meeting");
    setNewShareMode("private");
    setNewSharedWith(new Set());
    setNewPhysicalLocation("");
    setNewMeetingLink("");
    setNewAttachments([]);
    setPeopleSearch("");
  }, []);

  const handleSaveEvent = React.useCallback(() => {
    if (!newTitle.trim() || !newDate || !user) return;
    const nowStr = new Date().toISOString();

    if (editingEventId) {
      const existing = customEventsStore.getById(editingEventId);
      if (!existing) {
        setUploadError("Event no longer exists. Your changes were not saved.");
        return;
      }
      customEventsStore.update(editingEventId, {
        title: newTitle.trim(),
        description: newDescription.trim(),
        date: newDate,
        event_type: newEventType,
        shared_with: newShareMode === "select" ? Array.from(newSharedWith) : [],
        share_all: newShareMode === "everyone",
        physical_location: newPhysicalLocation.trim(),
        meeting_link: newMeetingLink.trim(),
        attachments: newAttachments.map((a) => a.data),
        updated_at: nowStr,
      });
    } else {
      const event: CustomEvent = {
        id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        company_id: companyId || "",
        creator_id: user.id,
        title: newTitle.trim(),
        description: newDescription.trim(),
        date: newDate,
        event_type: newEventType,
        shared_with: newShareMode === "select" ? Array.from(newSharedWith) : [],
        share_all: newShareMode === "everyone",
        physical_location: newPhysicalLocation.trim(),
        meeting_link: newMeetingLink.trim(),
        attachments: newAttachments.map((a) => a.data),
        created_at: nowStr,
        updated_at: nowStr,
      };
      customEventsStore.add(event);
    }

    resetForm();
    setShowAddEvent(false);
    setEditingEventId(null);
  }, [editingEventId, newTitle, newDate, newDescription, newEventType, newShareMode, newSharedWith, newPhysicalLocation, newMeetingLink, newAttachments, user, companyId, customEventsStore, resetForm]);

  const startEditEvent = React.useCallback((ce: CustomEvent) => {
    setNewTitle(ce.title);
    setNewDate(ce.date);
    setNewDescription(ce.description);
    setNewEventType(ce.event_type);
    setNewShareMode(ce.share_all ? "everyone" : ce.shared_with.length > 0 ? "select" : "private");
    setNewSharedWith(new Set(ce.shared_with));
    setNewPhysicalLocation(ce.physical_location);
    setNewMeetingLink(ce.meeting_link);
    setNewAttachments(ce.attachments.map((data, i) => ({
      name: `attachment-${i + 1}`,
      data,
      type: data.startsWith("data:application/pdf") ? "application/pdf" : "image/*",
    })));
    setEditingEventId(ce.id);
    setShowAddEvent(true);
    setOpenCardMenu(null);
  }, []);

  const confirmDeleteEvent = React.useCallback((eventId: string) => {
    customEventsStore.remove(eventId);
    setPendingDelete(null);
    setOpenCardMenu(null);
  }, [customEventsStore]);

  // Aggregate all events via shared hook
  const allEvents = useCalendarEvents(company);

  // Status counts across all events
  const statusCounts = React.useMemo(() => {
    const counts = { overdue: 0, due_soon: 0, upcoming: 0, completed: 0 };
    allEvents.forEach((e) => { counts[e.status]++; });
    return counts;
  }, [allEvents]);

  // Events grouped by month for the current year
  const filteredAllEvents = React.useMemo(() => {
    let events = allEvents.filter((e) => typeFilters.has(e.type));
    if (statusFilter) {
      if (statusFilter === "upcoming") {
        events = events.filter((e) => e.status === "completed" || e.status === "upcoming");
      } else {
        events = events.filter((e) => e.status === statusFilter);
      }
    }
    return events;
  }, [allEvents, typeFilters, statusFilter]);

  const eventsByMonth = React.useMemo(() => {
    const months: CalendarEvent[][] = Array.from({ length: 12 }, () => []);
    filteredAllEvents.forEach((e) => {
      if (e.date.getFullYear() === currentYear) {
        months[e.date.getMonth()].push(e);
      }
    });
    return months;
  }, [filteredAllEvents, currentYear]);

  const monthEvents = React.useMemo(() => {
    return eventsByMonth[selectedMonth];
  }, [eventsByMonth, selectedMonth]);

  // Week view events
  const weekStart = React.useMemo(() => getWeekStart(currentDate), [currentDate]);
  const weekDays = React.useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [weekStart]);

  // Day view events
  const dayEvents = React.useMemo(() => {
    return filteredAllEvents.filter((e) => isSameDay(e.date, selectedDate));
  }, [filteredAllEvents, selectedDate]);

  // Month grid days
  const monthGridDays = React.useMemo(() => {
    return getMonthDays(currentDate.getFullYear(), currentDate.getMonth());
  }, [currentDate]);

  // Selected day events (for month view)
  const selectedDayEvents = React.useMemo(() => {
    return filteredAllEvents.filter((e) => isSameDay(e.date, selectedDate));
  }, [filteredAllEvents, selectedDate]);

  // Quarter info
  const currentQuarter = React.useMemo(() => getQuarterForMonth(currentDate.getMonth()), [currentDate]);
  const quarterMonths = React.useMemo(() => {
    const startMonth = currentQuarter * 3;
    return [startMonth, startMonth + 1, startMonth + 2];
  }, [currentQuarter]);

  const toggleTypeFilter = React.useCallback((type: EventType) => {
    setTypeFilters((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }, []);

  const moreOffCount = MORE_FILTER_TYPES.filter((t) => !typeFilters.has(t)).length;

  const onTrackCount = statusCounts.completed + statusCounts.upcoming;
  const atRiskCount = statusCounts.due_soon;
  const criticalCount = statusCounts.overdue;

  return (
    <div className="-mt-2 space-y-4">
      {/* Stats Bar + Toolbar */}
      <div className="space-y-3">
        {/* Section 1: Stats Bar */}
        <div className="rounded-xl bg-muted/30 px-4 py-4 flex items-center gap-3 overflow-x-auto">
        <button
          type="button"
          onClick={() => setStatusFilter(null)}
          className="flex items-center gap-2 shrink-0 rounded-lg bg-background px-4 py-2.5 cursor-pointer"
        >
          <span className="text-2xl font-bold tabular-nums">{allEvents.length}</span>
          <span className="text-sm text-muted-foreground">Total</span>
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === "upcoming" ? null : "upcoming")}
          className={cn("flex items-center gap-2 shrink-0 rounded-lg bg-background px-4 py-2.5 transition-colors cursor-pointer", statusFilter === "upcoming" && "bg-green-500/10")}
        >
          <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
          <span className="text-sm font-medium tabular-nums">{onTrackCount}</span>
          <span className="text-sm text-muted-foreground">On track</span>
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === "due_soon" ? null : "due_soon")}
          className={cn("flex items-center gap-2 shrink-0 rounded-lg bg-background px-4 py-2.5 transition-colors cursor-pointer", statusFilter === "due_soon" && "bg-amber-500/10")}
        >
          <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
          <span className="text-sm font-medium tabular-nums">{atRiskCount}</span>
          <span className="text-sm text-muted-foreground">At risk</span>
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === "overdue" ? null : "overdue")}
          className={cn("flex items-center gap-2 shrink-0 rounded-lg bg-background px-4 py-2.5 transition-colors cursor-pointer", statusFilter === "overdue" && "bg-red-500/10")}
        >
          <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
          <span className="text-sm font-medium tabular-nums">{criticalCount}</span>
          <span className="text-sm text-muted-foreground">Critical</span>
        </button>
      </div>

      {/* Section 2: Toolbar — Filters LEFT, View Switcher + Add Event RIGHT */}
      <div className="flex items-center justify-between gap-4">
        {/* Left: inline pills + More dropdown */}
        <div className="flex items-center gap-2 flex-wrap">
          {INLINE_FILTER_TYPES.map((type) => {
            const cfg = EVENT_CONFIG[type];
            const active = typeFilters.has(type);
            return (
              <button
                key={type}
                type="button"
                onClick={() => toggleTypeFilter(type)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors",
                  active
                    ? "bg-muted text-foreground"
                    : "bg-transparent text-muted-foreground/50 line-through",
                )}
              >
                <cfg.icon className="h-3 w-3" />
                {cfg.label}
              </button>
            );
          })}

          {/* Custom event pill */}
          {(() => {
            const cfg = EVENT_CONFIG.custom;
            const active = typeFilters.has("custom");
            return (
              <button
                type="button"
                onClick={() => toggleTypeFilter("custom")}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors",
                  active
                    ? "bg-muted text-foreground"
                    : "bg-transparent text-muted-foreground/50 line-through",
                )}
              >
                <cfg.icon className="h-3 w-3" />
                {cfg.label}
              </button>
            );
          })()}

          {/* More dropdown */}
          <div className="relative" ref={filterRef}>
            <button
              type="button"
              onClick={() => setFilterOpen((v) => !v)}
              className={cn(
                "inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-colors",
                filterOpen
                  ? "bg-muted text-foreground"
                  : "bg-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              More
              {moreOffCount > 0 && (
                <span className="ml-0.5 text-[10px] text-amber-600 dark:text-amber-400">
                  ({moreOffCount} off)
                </span>
              )}
              <ChevronDown className="h-3 w-3" />
            </button>
            {filterOpen && (
              <div className="absolute top-full left-0 mt-1 z-50 w-52 rounded-lg border bg-card p-2 space-y-1">
                {MORE_FILTER_TYPES.map((type) => {
                  const cfg = EVENT_CONFIG[type];
                  const active = typeFilters.has(type);
                  return (
                    <label
                      key={type}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50 cursor-pointer text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={() => toggleTypeFilter(type)}
                        className="h-3.5 w-3.5 rounded border-border accent-primary"
                      />
                      <cfg.icon className={cn("h-3.5 w-3.5", cfg.color)} />
                      <span className={cn(!active && "text-muted-foreground/50 line-through")}>
                        {cfg.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Add Event + View Switcher */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowAddEvent(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-3 py-1 text-xs font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Event
          </button>
          <div className="flex rounded-lg bg-muted p-0.5">
            {VIEW_MODES.map((mode) => (
              <button
                key={mode.value}
                type="button"
                onClick={() => setViewMode(mode.value)}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-medium transition-colors capitalize",
                  viewMode === mode.value
                    ? "bg-background text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      </div>

      {/* ── Year View ──────────────────────────────────────────────── */}
      {viewMode === "year" && (
        <>
          {/* Year Timeline */}
          <div className="rounded-xl bg-muted/40 overflow-x-auto">
            <div className="flex min-w-max">
              {MONTH_NAMES.map((name, monthIdx) => {
                const events = eventsByMonth[monthIdx];
                const isSelected = monthIdx === selectedMonth;
                const maxDots = 5;
                const overflow = events.length > maxDots ? events.length - maxDots : 0;

                return (
                  <button
                    key={monthIdx}
                    type="button"
                    onClick={() => {
                      setSelectedMonth(monthIdx);
                    }}
                    className={cn(
                      "relative flex flex-col items-center gap-2 px-4 py-3 min-w-[80px] flex-1 transition-colors",
                      isSelected ? "bg-primary/5" : "hover:bg-muted/50",
                    )}
                  >
                    <span className={cn(
                      "text-xs font-medium",
                      isSelected ? "text-primary" : "text-muted-foreground",
                    )}>
                      {name}
                    </span>

                    <div className="flex items-center justify-center gap-1 h-[12px]">
                      {events.slice(0, maxDots).map((e, i) => (
                        <div key={i} className={cn("h-2 w-2 rounded-full shrink-0", STATUS_COLORS[e.status].dot)} />
                      ))}
                      {overflow > 0 && (
                        <span className="text-[10px] text-muted-foreground leading-none shrink-0">+{overflow}</span>
                      )}
                    </div>

                    {isSelected && (
                      <div className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-primary" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Month Events */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setSelectedMonth((m) => m > 0 ? m - 1 : 11)} className="p-1.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <CalendarIcon className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-base font-semibold">
                {MONTH_FULL_NAMES[selectedMonth]} {currentYear} events
              </h2>
              <button type="button" onClick={() => setSelectedMonth((m) => m < 11 ? m + 1 : 0)} className="p-1.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {monthEvents.length === 0 ? (
              <div className="rounded-lg bg-muted/40 p-12 text-center">
                <CalendarIcon className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">
                  No events in {MONTH_FULL_NAMES[selectedMonth]}.
                </p>
              </div>
            ) : (
              <EventCardGrid events={monthEvents} router={router} customEvents={customEventsAll} currentUserId={user?.id} onEdit={startEditEvent} onDelete={setPendingDelete} openMenuId={openCardMenu} setOpenMenuId={setOpenCardMenu} />
            )}
          </div>
        </>
      )}

      {/* ── Month View ─────────────────────────────────────────────── */}
      {viewMode === "month" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))} className="p-1.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <CalendarIcon className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-base font-semibold">
              {MONTH_FULL_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()} events
            </h2>
            <button type="button" onClick={() => setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))} className="p-1.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="rounded-lg bg-card overflow-hidden">
            <div className="grid grid-cols-7">
              {WEEKDAYS.map((day) => (
                <div key={day} className="p-2 text-center text-xs font-medium text-muted-foreground border-b border-border/30">
                  {day}
                </div>
              ))}
              {monthGridDays.map((day, idx) => {
                const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                const isToday = isSameDay(day, now);
                const isSelected = isSameDay(day, selectedDate);
                const dayEvts = filteredAllEvents.filter((e) => isSameDay(e.date, day));
                const maxDots = 3;
                const overflow = dayEvts.length > maxDots ? dayEvts.length - maxDots : 0;

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSelectedDate(new Date(day));
                      setViewMode("day");
                    }}
                    className={cn(
                      "p-2 min-h-[80px] border-r border-border/30 border-b border-b-border/30 text-left transition-colors",
                      idx % 7 === 6 && "border-r-0",
                      isSelected ? "bg-primary/5" : "hover:bg-muted/30",
                      !isCurrentMonth && "opacity-40",
                    )}
                  >
                    <span className={cn(
                      "text-xs tabular-nums",
                      isToday && "font-bold text-primary",
                      !isToday && isCurrentMonth && "text-foreground",
                      !isCurrentMonth && "text-muted-foreground",
                    )}>
                      {day.getDate()}
                    </span>
                    {dayEvts.length > 0 && (
                      <div className="flex flex-wrap gap-0.5 mt-1">
                        {dayEvts.slice(0, maxDots).map((e, i) => (
                          <div key={i} className={cn("h-1.5 w-1.5 rounded-full", STATUS_COLORS[e.status].dot)} />
                        ))}
                        {overflow > 0 && (
                          <span className="text-[9px] text-muted-foreground leading-none">+{overflow}</span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected day events */}
          {selectedDayEvents.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">
                {selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              </h3>
              <EventCardGrid events={selectedDayEvents} router={router} customEvents={customEventsAll} currentUserId={user?.id} onEdit={startEditEvent} onDelete={setPendingDelete} openMenuId={openCardMenu} setOpenMenuId={setOpenCardMenu} />
            </div>
          )}
        </div>
      )}

      {/* ── Week View ──────────────────────────────────────────────── */}
      {viewMode === "week" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setCurrentDate((d) => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; })} className="p-1.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <CalendarIcon className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-base font-semibold">
              W{getISOWeekNumber(weekDays[0])}: {weekDays[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} – {weekDays[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </h2>
            <button type="button" onClick={() => setCurrentDate((d) => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; })} className="p-1.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-3">
            {weekDays.map((day, idx) => {
              const dayEvts = filteredAllEvents.filter((e) => isSameDay(e.date, day));
              const isToday = isSameDay(day, now);

              return (
                <div key={idx} className="space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDate(new Date(day));
                      setViewMode("day");
                    }}
                    className={cn(
                      "w-full text-center py-2 rounded-md text-xs font-medium cursor-pointer transition-colors",
                      isToday ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {WEEKDAYS[idx]} {day.getDate()}
                  </button>
                  <div className="space-y-1.5 min-h-[100px]">
                    {dayEvts.length === 0 && (
                      <div className="flex items-center justify-center h-[60px] rounded-md bg-muted/20 text-muted-foreground/30">
                        <span className="text-[10px]">No events</span>
                      </div>
                    )}
                    {dayEvts.map((event) => {
                      const cfg = EVENT_CONFIG[event.type];
                      const Icon = cfg.icon;
                      return (
                        <div
                          key={event.id}
                          className="rounded-md bg-muted/50 p-2 cursor-pointer hover:bg-muted/70 transition-colors"
                          onClick={() => router.push(event.href)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") router.push(event.href); }}
                        >
                          <div className="flex items-center gap-1 mb-1">
                            <div className={cn("h-1.5 w-1.5 rounded-full shrink-0", STATUS_COLORS[event.status].dot)} />
                            <Icon className={cn("h-3 w-3 shrink-0", cfg.color)} />
                          </div>
                          <p className="text-[11px] font-medium truncate">{event.title}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Day View ───────────────────────────────────────────────── */}
      {viewMode === "day" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setSelectedDate((d) => { const n = new Date(d); n.setDate(n.getDate() - 1); return n; })} className="p-1.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <CalendarIcon className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-base font-semibold">
              {selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            </h2>
            <button type="button" onClick={() => setSelectedDate((d) => { const n = new Date(d); n.setDate(n.getDate() + 1); return n; })} className="p-1.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {dayEvents.length === 0 ? (
            <div className="rounded-lg bg-muted/40 p-12 text-center">
              <CalendarIcon className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">No events on this day.</p>
            </div>
          ) : (
            <EventCardGrid events={dayEvents} router={router} customEvents={customEventsAll} currentUserId={user?.id} onEdit={startEditEvent} onDelete={setPendingDelete} openMenuId={openCardMenu} setOpenMenuId={setOpenCardMenu} />
          )}
        </div>
      )}

      {/* ── Quarter View ───────────────────────────────────────────── */}
      {viewMode === "quarter" && (() => {
        const qMonths = quarterMonths;
        const effectiveQMonth = qMonths.includes(qSelectedMonth) ? qSelectedMonth : qMonths[0];
        const qMonthEvents = filteredAllEvents.filter(
          (e) => e.date.getFullYear() === currentDate.getFullYear() && e.date.getMonth() === effectiveQMonth
        );

        return (
          <div className="space-y-4">
            {/* 3-month timeline */}
            <div className="rounded-xl bg-muted/40 overflow-x-auto">
              <div className="flex min-w-max">
                {qMonths.map((monthIdx) => {
                  const events = filteredAllEvents.filter(
                    (e) => e.date.getFullYear() === currentDate.getFullYear() && e.date.getMonth() === monthIdx
                  );
                  const isSelected = monthIdx === effectiveQMonth;
                  const maxDots = 5;
                  const overflow = events.length > maxDots ? events.length - maxDots : 0;

                  return (
                    <button
                      key={monthIdx}
                      type="button"
                      onClick={() => setQSelectedMonth(monthIdx)}
                      className={cn(
                        "relative flex flex-col items-center gap-2 px-4 py-3 min-w-[80px] flex-1 transition-colors",
                        isSelected ? "bg-primary/5" : "hover:bg-muted/50",
                      )}
                    >
                      <span className={cn("text-xs font-medium", isSelected ? "text-primary" : "text-muted-foreground")}>
                        {MONTH_NAMES[monthIdx]}
                      </span>
                      <div className="flex items-center justify-center gap-1 h-[12px]">
                        {events.slice(0, maxDots).map((e, i) => (
                          <div key={i} className={cn("h-2 w-2 rounded-full shrink-0", STATUS_COLORS[e.status].dot)} />
                        ))}
                        {overflow > 0 && (
                          <span className="text-[10px] text-muted-foreground leading-none shrink-0">+{overflow}</span>
                        )}
                      </div>
                      {isSelected && (
                        <div className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected month events */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() - 3, 1))} className="p-1.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                <h3 className="text-base font-semibold">
                  {MONTH_FULL_NAMES[effectiveQMonth]} {currentDate.getFullYear()} events
                  <span className="text-muted-foreground font-normal"> (Q{currentQuarter + 1} {currentDate.getFullYear()})</span>
                </h3>
                <button type="button" onClick={() => setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() + 3, 1))} className="p-1.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {qMonthEvents.length === 0 ? (
                <div className="rounded-lg bg-muted/40 p-12 text-center">
                  <CalendarIcon className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground">No events in {MONTH_FULL_NAMES[effectiveQMonth]}.</p>
                </div>
              ) : (
                <EventCardGrid events={qMonthEvents} router={router} customEvents={customEventsAll} currentUserId={user?.id} onEdit={startEditEvent} onDelete={setPendingDelete} openMenuId={openCardMenu} setOpenMenuId={setOpenCardMenu} />
              )}
            </div>
          </div>
        );
      })()}

      {/* ── Add Event Modal ──────────────────────────────────────── */}
      {showAddEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-card rounded-lg border w-full max-w-md mx-4 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">
                {editingEventId ? "Edit Custom Event" : "Add Custom Event"}
              </h2>
              <button
                type="button"
                onClick={() => { setShowAddEvent(false); setEditingEventId(null); resetForm(); }}
                className="p-1 rounded-md hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Title */}
              <div className="space-y-1">
                <label htmlFor="ce-title" className="text-xs font-medium text-muted-foreground">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  id="ce-title"
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Event title"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              {/* Date */}
              <div className="space-y-1">
                <label htmlFor="ce-date" className="text-xs font-medium text-muted-foreground">
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  id="ce-date"
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label htmlFor="ce-desc" className="text-xs font-medium text-muted-foreground">
                  Description
                </label>
                <textarea
                  id="ce-desc"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Optional description"
                  rows={3}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
              </div>

              {/* Physical Location */}
              <div className="space-y-1">
                <label htmlFor="ce-location" className="text-xs font-medium text-muted-foreground">
                  Physical Location
                </label>
                <div className="relative">
                  <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    id="ce-location"
                    type="text"
                    value={newPhysicalLocation}
                    onChange={(e) => setNewPhysicalLocation(e.target.value)}
                    placeholder="Building, room, or address"
                    className="w-full rounded-md border bg-background pl-8 pr-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>

              {/* Meeting Link */}
              <div className="space-y-1">
                <label htmlFor="ce-link" className="text-xs font-medium text-muted-foreground">
                  Meeting Link
                </label>
                <div className="relative">
                  <LinkIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    id="ce-link"
                    type="text"
                    value={newMeetingLink}
                    onChange={(e) => setNewMeetingLink(e.target.value)}
                    placeholder="Paste Teams, Zoom, or Meet link"
                    className="w-full rounded-md border bg-background pl-8 pr-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>

              {/* Event Type */}
              <div className="space-y-1">
                <label htmlFor="ce-type" className="text-xs font-medium text-muted-foreground">
                  Event Type
                </label>
                <select
                  id="ce-type"
                  value={newEventType}
                  onChange={(e) => setNewEventType(e.target.value as CustomEvent["event_type"])}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {(Object.entries(CUSTOM_EVENT_TYPE_LABELS) as [CustomEvent["event_type"], string][]).map(([val, lbl]) => (
                    <option key={val} value={val}>{lbl}</option>
                  ))}
                </select>
              </div>

              {/* Attachments */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Attachments{" "}
                  <span className="font-normal text-muted-foreground/70">(Images &amp; PDF only, max 5 files, 5MB each)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground hover:bg-muted/30 transition-colors">
                  <Paperclip className="h-3.5 w-3.5" />
                  <span>{newAttachments.length >= 5 ? "Max files reached" : "Choose files…"}</span>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    multiple
                    onChange={handleFileUpload}
                    disabled={newAttachments.length >= 5}
                    className="sr-only"
                  />
                </label>
                {uploadError && (
                  <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    {uploadError}
                  </div>
                )}
                {newAttachments.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {newAttachments.map((att, i) => (
                      <div key={i} className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs">
                        {att.type.startsWith("image/") ? <ImageIcon className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                        <span className="truncate max-w-[120px]">{att.name}</span>
                        <button
                          type="button"
                          onClick={() => setNewAttachments((prev) => prev.filter((_, j) => j !== i))}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Sharing */}
              <div className="space-y-2">
                <span className="text-xs font-medium text-muted-foreground">Sharing</span>
                <div className="space-y-1.5">
                  {([
                    { value: "private" as const, label: "Only me" },
                    { value: "everyone" as const, label: "Everyone" },
                    { value: "select" as const, label: "Select people" },
                  ]).map((opt) => (
                    <label key={opt.value} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="radio"
                        name="share-mode"
                        checked={newShareMode === opt.value}
                        onChange={() => setNewShareMode(opt.value)}
                        className="accent-primary"
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>

                {newShareMode === "select" && (
                  <div className="border rounded-md p-2 space-y-2">
                    {/* Selected people chips */}
                    {newSharedWith.size > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {Array.from(newSharedWith).map((uid) => {
                          const u = companyUsers.find((cu) => cu.id === uid) as { id: string; first_name?: string; last_name?: string; email?: string } | undefined;
                          if (!u) return null;
                          return (
                            <span key={uid} className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs">
                              {u.first_name || u.email || uid}
                              <button
                                type="button"
                                onClick={() => setNewSharedWith((prev) => { const next = new Set(prev); next.delete(uid); return next; })}
                                className="hover:text-primary/70"
                              >
                                <X className="h-2.5 w-2.5" />
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {/* Search input */}
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <input
                        type="text"
                        value={peopleSearch}
                        onChange={(e) => setPeopleSearch(e.target.value)}
                        placeholder="Search people..."
                        className="w-full rounded-md border bg-background pl-7 pr-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>

                    {/* Filtered user list */}
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {companyUsers.length === 0 && (
                        <p className="text-xs text-muted-foreground">No users found.</p>
                      )}
                      {companyUsers
                        .filter((u) => {
                          if (!peopleSearch.trim()) return true;
                          const q = peopleSearch.toLowerCase();
                          const cu = u as { first_name?: string; last_name?: string; email?: string };
                          return (
                            (cu.first_name || "").toLowerCase().includes(q) ||
                            (cu.last_name || "").toLowerCase().includes(q) ||
                            (cu.email || "").toLowerCase().includes(q)
                          );
                        })
                        .map((u) => (
                          <label key={u.id} className="flex items-center gap-2 text-sm cursor-pointer px-1 py-0.5 rounded hover:bg-muted/50">
                            <input
                              type="checkbox"
                              checked={newSharedWith.has(u.id)}
                              onChange={() => {
                                setNewSharedWith((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(u.id)) next.delete(u.id);
                                  else next.add(u.id);
                                  return next;
                                });
                              }}
                              className="h-3.5 w-3.5 rounded accent-primary"
                            />
                            <span className="truncate">
                              {(u as { first_name?: string; last_name?: string; email?: string }).first_name || ""}{" "}
                              {(u as { first_name?: string; last_name?: string; email?: string }).last_name || ""}{" "}
                              <span className="text-muted-foreground text-xs">
                                {(u as { email?: string }).email ? `(${(u as { email?: string }).email})` : ""}
                              </span>
                            </span>
                          </label>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => { setShowAddEvent(false); setEditingEventId(null); resetForm(); }}
                className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEvent}
                disabled={!newTitle.trim() || !newDate}
                className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {editingEventId ? "Save Changes" : "Save Event"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirmation ───────────────────────────────────── */}
      {pendingDelete && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40"
          onClick={() => setPendingDelete(null)}
        >
          <div
            className="bg-card rounded-lg border w-full max-w-sm mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold">Delete this event?</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">
              This will remove it from everyone&apos;s calendar. This can&apos;t be undone.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => confirmDeleteEvent(pendingDelete)}
                className="rounded-md bg-red-600 text-white px-4 py-2 text-sm font-medium hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Shared Event Card Grid ────────────────────────────────────────────────

function EventCardGrid({
  events,
  router,
  customEvents,
  currentUserId,
  onEdit,
  onDelete,
  openMenuId,
  setOpenMenuId,
}: {
  events: CalendarEvent[];
  router: ReturnType<typeof useRouter>;
  customEvents: CustomEvent[];
  currentUserId?: string;
  onEdit?: (ce: CustomEvent) => void;
  onDelete?: (ceId: string) => void;
  openMenuId?: string | null;
  setOpenMenuId?: (id: string | null) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {events.map((event) => {
        const cfg = EVENT_CONFIG[event.type];
        const Icon = cfg.icon;
        const badge = STATUS_BADGE_MAP[event.status];
        const progress = PROGRESS_MAP[event.status];
        const ce = event.type === "custom" ? customEvents.find((c) => c.id === event.id) : undefined;
        const isOwner = Boolean(ce && currentUserId && ce.creator_id === currentUserId);
        const isMenuOpen = openMenuId === event.id;

        return (
          <div
            key={event.id}
            className="relative rounded-lg bg-muted/50 p-4 space-y-2 cursor-pointer hover:bg-muted/70 transition-colors"
            onClick={() => { if (event.href) router.push(event.href); }}
            role={event.href ? "button" : undefined}
            tabIndex={event.href ? 0 : undefined}
            onKeyDown={(e) => { if (event.href && (e.key === "Enter" || e.key === " ")) router.push(event.href); }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={cn("h-2 w-2 rounded-full shrink-0", STATUS_COLORS[event.status].dot)} />
                <span className="text-xs text-muted-foreground">{formatEventDate(event.date)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                {event.type === "custom" && (
                  <button
                    type="button"
                    title="Download .ics"
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadICS({
                        ...event,
                        physical_location: ce?.physical_location,
                        meeting_link: ce?.meeting_link,
                        description: ce?.description,
                      });
                    }}
                    className="p-1 rounded-md hover:bg-muted transition-colors"
                  >
                    <Download className="h-3 w-3 text-muted-foreground" />
                  </button>
                )}
                {isOwner && ce && setOpenMenuId && (
                  <div className="relative">
                    <button
                      type="button"
                      title="Event actions"
                      aria-label="Event actions"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(isMenuOpen ? null : event.id);
                      }}
                      className="p-1 rounded-md hover:bg-muted transition-colors"
                    >
                      <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                    {isMenuOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-30"
                          onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); }}
                        />
                        <div className="absolute right-0 top-full mt-1 z-40 min-w-[140px] rounded-md border border-border bg-background shadow-lg py-1">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onEdit?.(ce); }}
                            className="block w-full text-left px-3 py-2 text-xs hover:bg-muted"
                          >
                            Edit event
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onDelete?.(ce.id); }}
                            className="block w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-muted"
                          >
                            Delete event
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
                <span className={cn(
                  "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold",
                  badge.classes,
                )}>
                  {badge.label}
                </span>
              </div>
            </div>

            <p className="text-sm font-semibold truncate">{event.title}</p>

            <div className="flex items-center gap-1.5">
              <Icon className={cn("h-3.5 w-3.5", cfg.color)} />
              <span className="text-xs text-muted-foreground">{cfg.label}</span>
            </div>
          </div>
        );
      })}
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
