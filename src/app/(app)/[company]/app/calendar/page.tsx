"use client";

import * as React from "react";
import Link from "next/link";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Image as ImageIcon,
  Link as LinkIcon,
  MapPin,
  MoreHorizontal,
  Paperclip,
  Plus,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useCompanyParam } from "@/hooks/use-company-param";
import { useAuth } from "@/hooks/use-auth";
import { useCompanyData } from "@/hooks/use-company-data";
import {
  useCustomEventsStore,
  type CustomEvent,
} from "@/stores/custom-events-store";
import {
  useCalendarEvents,
  EVENT_CONFIG,
  STATUS_COLORS,
  type CalendarEvent,
  type EventType,
  type EventStatus,
} from "@/hooks/use-calendar-events";
import { SheetPageShell } from "@/components/layouts/sheet-page-shell";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { RoleGuard } from "@/components/auth/role-guard";
import { cn } from "@/lib/utils";

// ── Constants ────────────────────────────────────────────────────────────

const WEEKDAYS_SHORT = ["M", "T", "W", "T", "F", "S", "S"];
const WEEKDAYS_LONG = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTH_NAMES_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const DAY_NAMES = [
  "Sunday", "Monday", "Tuesday", "Wednesday",
  "Thursday", "Friday", "Saturday",
];

const STATUS_LABEL: Record<EventStatus, string> = {
  overdue: "Overdue",
  due_soon: "Due soon",
  upcoming: "Upcoming",
  completed: "Completed",
};

const CUSTOM_EVENT_TYPE_LABELS: Record<CustomEvent["event_type"], string> = {
  safety_meeting: "Safety Meeting",
  drill: "Drill",
  audit: "Audit",
  training: "Training",
  inspection: "Inspection",
  other: "Other",
};

type ViewMode = "day" | "week" | "month";

const VIEW_MODES: { value: ViewMode; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
];

// ── Helpers ──────────────────────────────────────────────────────────────

function getMonthDays(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const startDay = first.getDay() || 7;
  const start = new Date(year, month, 1 - (startDay - 1));
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    days.push(
      new Date(start.getFullYear(), start.getMonth(), start.getDate() + i),
    );
  }
  return days;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - (day - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

function getISOWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function formatICSLocal(d: Date): string {
  // Floating local time per RFC 5545 — no Z suffix, no TZID. The recipient's
  // calendar app will treat this as wall-clock time in their own timezone.
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
    `T${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  );
}

function downloadICS(title: string, date: Date, description?: string) {
  const d = date;
  const dtStart = formatICSLocal(d);
  const dtEnd = formatICSLocal(new Date(d.getTime() + 3600000));
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Harmoniq//Safety//EN",
    "BEGIN:VEVENT",
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description || ""}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const blob = new Blob([ics], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title.replace(/\s+/g, "_")}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Reusable: Event Row (used in Day/Week/Month/Quarter event lists) ─────

function EventRow({
  event,
  currentUserId,
  onMenu,
}: {
  event: CalendarEvent;
  currentUserId?: string;
  onMenu?: (event: CalendarEvent) => void;
}) {
  const config = EVENT_CONFIG[event.type];
  const statusColor = STATUS_COLORS[event.status];
  const Icon = config.icon;
  const isCustom = event.type === "custom";
  // The id of a custom event is the same as the underlying CustomEvent.id, but
  // we don't have creator_id here — so callers gate `onMenu` to creator-only
  // before passing it. The presence of `onMenu` means "show the kebab menu".
  const showKebab = isCustom && Boolean(onMenu);

  const inner = (
    <div className="flex items-start gap-3 px-4 py-3.5 border-b border-border last:border-0 bg-background">
      <div className="mt-0.5 shrink-0">
        <Icon className={cn("h-5 w-5", config.color)} aria-hidden="true" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium leading-snug truncate">
            {event.title}
          </p>
          <span
            className={cn(
              "mt-1 h-1.5 w-1.5 shrink-0 rounded-full",
              statusColor.dot,
            )}
            aria-label={STATUS_LABEL[event.status]}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {config.label} ·{" "}
          {event.date.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
          })}
        </p>
        <p className="text-[10px] text-muted-foreground/70 mt-1">
          {STATUS_LABEL[event.status]}
        </p>
      </div>
      {isCustom && showKebab && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onMenu!(event);
          }}
          className="shrink-0 -mr-1 p-2 rounded-md hover:bg-muted active:bg-muted transition-colors"
          aria-label="Event actions"
        >
          <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
        </button>
      )}
      {isCustom && !showKebab && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            downloadICS(event.title, event.date);
          }}
          className="shrink-0 p-1.5 rounded-md hover:bg-muted active:bg-muted transition-colors"
          aria-label="Download .ics"
        >
          <Download className="h-4 w-4 text-muted-foreground" />
        </button>
      )}
    </div>
  );

  // Suppress unused param warning for currentUserId — kept in signature for
  // call-site clarity even though gating happens before passing onMenu.
  void currentUserId;

  if (event.href) {
    return (
      <Link
        href={event.href}
        className="block active:bg-muted/50 transition-colors"
      >
        {inner}
      </Link>
    );
  }
  return inner;
}

// ── Page component ───────────────────────────────────────────────────────

function CalendarPageContent() {
  const company = useCompanyParam();
  const { user, currentCompany } = useAuth();
  const { users: companyUsers } = useCompanyData();
  const customEventsStore = useCustomEventsStore();
  const companyId = currentCompany?.id || user?.company_id;

  const allEvents = useCalendarEvents(company);
  const now = new Date();

  // ── State ───────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = React.useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = React.useState<Date>(new Date(now));
  const [selectedDate, setSelectedDate] = React.useState<Date>(new Date(now));

  // Filters
  const [typeFilters, setTypeFilters] = React.useState<Set<EventType>>(
    () => new Set(Object.keys(EVENT_CONFIG) as EventType[]),
  );
  const [filtersOpen, setFiltersOpen] = React.useState(false);

  // Add Event sheet state
  const [showAddEvent, setShowAddEvent] = React.useState(false);
  const [editingEventId, setEditingEventId] = React.useState<string | null>(null);
  const [actionEvent, setActionEvent] = React.useState<CalendarEvent | null>(null);
  const [pendingDelete, setPendingDelete] = React.useState<string | null>(null);
  const [newTitle, setNewTitle] = React.useState("");
  const [newDate, setNewDate] = React.useState("");
  const [newDescription, setNewDescription] = React.useState("");
  const [newEventType, setNewEventType] =
    React.useState<CustomEvent["event_type"]>("safety_meeting");
  const [newShareMode, setNewShareMode] =
    React.useState<"private" | "everyone" | "select">("private");
  const [newSharedWith, setNewSharedWith] = React.useState<Set<string>>(new Set());
  const [newPhysicalLocation, setNewPhysicalLocation] = React.useState("");
  const [newMeetingLink, setNewMeetingLink] = React.useState("");
  const [newAttachments, setNewAttachments] = React.useState<
    Array<{ name: string; data: string; type: string }>
  >([]);
  const [peopleSearch, setPeopleSearch] = React.useState("");
  const [uploadError, setUploadError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!uploadError) return;
    const t = window.setTimeout(() => setUploadError(null), 4000);
    return () => window.clearTimeout(t);
  }, [uploadError]);

  // ── Derived ──────────────────────────────────────────────────────────

  const filteredEvents = React.useMemo(() => {
    return allEvents.filter((e) => typeFilters.has(e.type));
  }, [allEvents, typeFilters]);

  const ALL_TYPES = React.useMemo(
    () => Object.keys(EVENT_CONFIG) as EventType[],
    [],
  );
  const offCount = ALL_TYPES.filter((t) => !typeFilters.has(t)).length;

  // ── Handlers ────────────────────────────────────────────────────────

  const toggleTypeFilter = (type: EventType) => {
    setTypeFilters((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const goToday = () => {
    const today = new Date();
    setCurrentDate(new Date(today));
    setSelectedDate(new Date(today));
  };

  // ── Add Event handlers ──────────────────────────────────────────────

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

  const handleFileUpload = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
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
            return [
              ...prev,
              { name: file.name, data: reader.result as string, type: file.type },
            ];
          });
        };
        reader.readAsDataURL(file);
      });
      if (rejected.length > 0) {
        setUploadError(`Skipped: ${rejected.join(", ")}`);
      }
      e.target.value = "";
    },
    [],
  );

  const handleSaveEvent = React.useCallback(() => {
    if (!newTitle.trim() || !newDate || !user) return;
    const nowStr = new Date().toISOString();

    if (editingEventId) {
      // Edit path — update existing event in place
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
      // Create path
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
    const created = new Date(newDate);
    setCurrentDate(created);
    setSelectedDate(created);
    setViewMode("day");
  }, [
    editingEventId,
    newTitle, newDate, newDescription, newEventType, newShareMode,
    newSharedWith, newPhysicalLocation, newMeetingLink, newAttachments,
    user, companyId, customEventsStore, resetForm,
  ]);

  // ── Edit / Delete handlers ──────────────────────────────────────────

  // Find the underlying CustomEvent for a calendar event row (by id).
  const findCustomEvent = React.useCallback(
    (eventId: string): CustomEvent | undefined =>
      customEventsStore.getById(eventId),
    [customEventsStore],
  );

  const startEditEvent = React.useCallback((calEvent: CalendarEvent) => {
    const ce = findCustomEvent(calEvent.id);
    if (!ce) return;
    setNewTitle(ce.title);
    setNewDate(ce.date);
    setNewDescription(ce.description);
    setNewEventType(ce.event_type);
    setNewShareMode(
      ce.share_all ? "everyone" : ce.shared_with.length > 0 ? "select" : "private",
    );
    setNewSharedWith(new Set(ce.shared_with));
    setNewPhysicalLocation(ce.physical_location);
    setNewMeetingLink(ce.meeting_link);
    setNewAttachments(
      ce.attachments.map((data, i) => ({
        name: `attachment-${i + 1}`,
        data,
        type: data.startsWith("data:application/pdf") ? "application/pdf" : "image/*",
      })),
    );
    setEditingEventId(ce.id);
    setShowAddEvent(true);
    setActionEvent(null);
  }, [findCustomEvent]);

  const confirmDeleteEvent = React.useCallback((eventId: string) => {
    customEventsStore.remove(eventId);
    setPendingDelete(null);
    setActionEvent(null);
  }, [customEventsStore]);

  // Decide whether to expose the kebab menu for a given calendar event
  const eventRowOnMenu = React.useCallback(
    (e: CalendarEvent) => {
      const ce = findCustomEvent(e.id);
      if (!ce || !user || ce.creator_id !== user.id) return undefined;
      return () => setActionEvent(e);
    },
    [findCustomEvent, user],
  );

  // Stable wrapper passed to EventRow — only fires for owned custom events
  const handleRowMenu = React.useCallback(
    (e: CalendarEvent) => {
      const fn = eventRowOnMenu(e);
      if (fn) fn();
    },
    [eventRowOnMenu],
  );

  const renderEventRow = React.useCallback(
    (event: CalendarEvent) => {
      const ce = findCustomEvent(event.id);
      const isOwner = ce && user && ce.creator_id === user.id;
      return (
        <EventRow
          event={event}
          currentUserId={user?.id}
          onMenu={isOwner ? handleRowMenu : undefined}
        />
      );
    },
    [findCustomEvent, user, handleRowMenu],
  );

  // ── Toolbar ─────────────────────────────────────────────────────────

  const toolbar = (
    <div className="space-y-2.5">
      {/* View switcher — segmented control (Day / Week / Month) */}
      <div
        role="tablist"
        aria-label="Calendar view"
        className="grid grid-cols-3 gap-1 rounded-xl bg-muted/50 p-1"
      >
        {VIEW_MODES.map((mode) => {
          const active = viewMode === mode.value;
          return (
            <button
              key={mode.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setViewMode(mode.value)}
              className={cn(
                "py-1.5 rounded-lg text-xs font-medium transition-colors",
                active
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {mode.label}
            </button>
          );
        })}
      </div>

      {/* Filter button — opens bottom sheet with all type toggles */}
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => setFiltersOpen(true)}
          aria-expanded={filtersOpen}
          aria-haspopup="dialog"
          className={cn(
            "inline-flex items-center gap-1.5 px-3 h-8 rounded-full text-xs font-medium border transition-colors",
            offCount > 0
              ? "bg-foreground text-background border-foreground"
              : "bg-background text-foreground border-border hover:bg-muted",
          )}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span>Filters</span>
          {offCount > 0 && (
            <span
              className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-background text-foreground px-1 text-[10px] font-semibold tabular-nums"
              aria-label={`${offCount} filters hidden`}
            >
              {offCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );

  const topRight = null;

  // ── View renderers ──────────────────────────────────────────────────

  const renderDayView = () => {
    const dayEvents = filteredEvents
      .filter((e) => isSameDay(e.date, selectedDate))
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    return (
      <div>
        <div className="flex items-center justify-between gap-2 px-3 py-3 bg-background border-b border-border">
          <button
            type="button"
            onClick={() =>
              setSelectedDate((d) => {
                const n = new Date(d);
                n.setDate(n.getDate() - 1);
                return n;
              })
            }
            className="p-1.5 rounded-md hover:bg-muted active:bg-muted transition-colors"
            aria-label="Previous day"
          >
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          </button>
          <div className="flex-1 text-center">
            <div className="text-sm font-semibold">
              {DAY_NAMES[selectedDate.getDay()]}
            </div>
            <div className="text-xs text-muted-foreground">
              {MONTH_NAMES[selectedDate.getMonth()]} {selectedDate.getDate()},{" "}
              {selectedDate.getFullYear()}
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              setSelectedDate((d) => {
                const n = new Date(d);
                n.setDate(n.getDate() + 1);
                return n;
              })
            }
            className="p-1.5 rounded-md hover:bg-muted active:bg-muted transition-colors"
            aria-label="Next day"
          >
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
        {dayEvents.length === 0 ? (
          <div className="text-center py-12">
            <CalendarIcon className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No events</p>
          </div>
        ) : (
          <ul>
            {dayEvents.map((event) => (
              <li key={event.id}>
                {renderEventRow(event)}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = getWeekStart(currentDate);
    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
    const selectedDay = currentDate;
    const dayEvts = filteredEvents
      .filter((e) => isSameDay(e.date, selectedDay))
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    return (
      <div>
        {/* Week navigator */}
        <div className="flex items-center justify-between gap-2 px-3 py-3 bg-background border-b border-border">
          <button
            type="button"
            onClick={() =>
              setCurrentDate((d) => {
                const n = new Date(d);
                n.setDate(n.getDate() - 7);
                return n;
              })
            }
            className="p-1.5 rounded-md hover:bg-muted active:bg-muted transition-colors"
            aria-label="Previous week"
          >
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          </button>
          <div className="flex-1 text-center">
            <div className="text-sm font-semibold">
              Week {getISOWeekNumber(weekDays[0])}
            </div>
            <div className="text-xs text-muted-foreground">
              {MONTH_NAMES_SHORT[weekDays[0].getMonth()]} {weekDays[0].getDate()} –{" "}
              {MONTH_NAMES_SHORT[weekDays[6].getMonth()]} {weekDays[6].getDate()}
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              setCurrentDate((d) => {
                const n = new Date(d);
                n.setDate(n.getDate() + 7);
                return n;
              })
            }
            className="p-1.5 rounded-md hover:bg-muted active:bg-muted transition-colors"
            aria-label="Next week"
          >
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Horizontal day strip */}
        <div
          role="tablist"
          aria-label="Days of week"
          className="grid grid-cols-7 gap-1 px-2 py-2 bg-background border-b border-border"
        >
          {weekDays.map((day, i) => {
            const today = isSameDay(day, now);
            const selected = isSameDay(day, selectedDay);
            const dayCount = filteredEvents.filter((e) =>
              isSameDay(e.date, day),
            ).length;
            return (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setCurrentDate(new Date(day))}
                className={cn(
                  "flex flex-col items-center gap-1 py-2 rounded-lg min-h-[56px] transition-colors",
                  selected
                    ? "bg-foreground text-background"
                    : "hover:bg-muted active:bg-muted",
                )}
              >
                <span
                  className={cn(
                    "text-[10px] uppercase tracking-wide font-medium",
                    selected
                      ? "text-background/80"
                      : "text-muted-foreground",
                  )}
                >
                  {WEEKDAYS_SHORT[i]}
                </span>
                <span
                  className={cn(
                    "text-base tabular-nums",
                    selected
                      ? "font-semibold"
                      : today
                        ? "font-semibold"
                        : "font-normal",
                    !selected && today && "text-foreground",
                  )}
                >
                  {day.getDate()}
                </span>
                <span
                  className={cn(
                    "h-1 w-1 rounded-full",
                    dayCount > 0
                      ? selected
                        ? "bg-background"
                        : "bg-foreground/60"
                      : "bg-transparent",
                  )}
                  aria-hidden="true"
                />
              </button>
            );
          })}
        </div>

        {/* Selected day's events */}
        <div className="px-4 py-3 bg-muted/30 border-b border-border">
          <div className="text-sm font-semibold">
            {WEEKDAYS_LONG[(selectedDay.getDay() + 6) % 7]},{" "}
            {MONTH_NAMES_SHORT[selectedDay.getMonth()]} {selectedDay.getDate()}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            {dayEvts.length} {dayEvts.length === 1 ? "event" : "events"}
          </div>
        </div>
        {dayEvts.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-muted-foreground">
            No events scheduled
          </div>
        ) : (
          <ul>
            {dayEvts.map((event) => (
              <li key={event.id} className="border-b border-border last:border-0">
                {renderEventRow(event)}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  const renderMonthView = () => {
    const days = getMonthDays(currentDate.getFullYear(), currentDate.getMonth());
    const eventsByDay = new Map<string, EventStatus[]>();
    filteredEvents.forEach((e) => {
      const key = `${e.date.getFullYear()}-${e.date.getMonth()}-${e.date.getDate()}`;
      const list = eventsByDay.get(key) || [];
      list.push(e.status);
      eventsByDay.set(key, list);
    });
    const selectedDayEvents = filteredEvents
      .filter((e) => isSameDay(e.date, selectedDate))
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    return (
      <div>
        {/* Month nav */}
        <div className="bg-background px-3 pt-3 pb-3 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() =>
                setCurrentDate(
                  (d) => new Date(d.getFullYear(), d.getMonth() - 1, 1),
                )
              }
              className="p-1.5 rounded-md hover:bg-muted active:bg-muted transition-colors"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4 text-muted-foreground" />
            </button>
            <h2 className="text-sm font-semibold">
              {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={goToday}
                className="text-xs font-medium text-muted-foreground px-2.5 py-1 rounded-md hover:bg-muted active:bg-muted transition-colors"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() =>
                  setCurrentDate(
                    (d) => new Date(d.getFullYear(), d.getMonth() + 1, 1),
                  )
                }
                className="p-1.5 rounded-md hover:bg-muted active:bg-muted transition-colors"
                aria-label="Next month"
              >
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS_SHORT.map((d, i) => (
              <div
                key={i}
                className="text-center text-[10px] font-medium text-muted-foreground/70 py-1"
              >
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {days.map((day, i) => {
              const dayKey = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
              const statuses = eventsByDay.get(dayKey) || [];
              const uniqueStatuses = [...new Set(statuses)].slice(0, 3);
              const inMonth = day.getMonth() === currentDate.getMonth();
              const today = isSameDay(day, now);
              const selected = isSameDay(day, selectedDate);
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setSelectedDate(new Date(day));
                    if (!inMonth) setCurrentDate(new Date(day));
                  }}
                  className={cn(
                    "flex flex-col items-center justify-start pt-1.5 pb-1 rounded-md transition-colors relative min-h-[44px]",
                    !inMonth && "opacity-30",
                    selected && "bg-muted",
                  )}
                >
                  <span
                    className={cn(
                      "flex items-center justify-center h-6 w-6 text-xs rounded-full",
                      today && "bg-foreground text-background font-semibold",
                      !today && selected && "font-semibold",
                    )}
                  >
                    {day.getDate()}
                  </span>
                  <div className="flex items-center gap-0.5 mt-1 h-1">
                    {uniqueStatuses.map((status, j) => (
                      <span
                        key={j}
                        className={cn(
                          "h-1 w-1 rounded-full",
                          STATUS_COLORS[status].dot,
                        )}
                      />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-center gap-3 mt-3">
            {(["overdue", "due_soon", "upcoming", "completed"] as EventStatus[]).map(
              (status) => (
                <div key={status} className="flex items-center gap-1">
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      STATUS_COLORS[status].dot,
                    )}
                  />
                  <span className="text-[10px] text-muted-foreground">
                    {STATUS_LABEL[status]}
                  </span>
                </div>
              ),
            )}
          </div>
        </div>

        {/* Selected day events */}
        <div className="px-4 pt-4 pb-2">
          <h3 className="text-xs font-medium text-muted-foreground">
            {DAY_NAMES[selectedDate.getDay()]}, {MONTH_NAMES[selectedDate.getMonth()]}{" "}
            {selectedDate.getDate()}
            {selectedDayEvents.length > 0 && (
              <span className="ml-1.5">· {selectedDayEvents.length}</span>
            )}
          </h3>
        </div>
        {selectedDayEvents.length === 0 ? (
          <div className="text-center py-12">
            <CalendarIcon className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No events</p>
          </div>
        ) : (
          <ul>
            {selectedDayEvents.map((event) => (
              <li key={event.id}>
                {renderEventRow(event)}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };


  return (
    <SheetPageShell title="Calendar" topRight={topRight} toolbar={toolbar}>
      <div className="flex flex-col flex-1 bg-background">
        {viewMode === "day" && renderDayView()}
        {viewMode === "week" && renderWeekView()}
        {viewMode === "month" && renderMonthView()}
      </div>

      {/* Floating Action Button — Add event */}
      <button
        type="button"
        onClick={() => setShowAddEvent(true)}
        className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:shadow-xl active:scale-95 transition-all ring-1 ring-background/50"
        aria-label="Add event"
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* ── Filters bottom sheet ─────────────────────────────────── */}
      <BottomSheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filter by type"
      >
        <div className="flex items-center justify-between -mt-1 mb-2">
          <p className="text-xs text-muted-foreground">
            {offCount === 0
              ? "All event types showing"
              : `${offCount} ${offCount === 1 ? "type" : "types"} hidden`}
          </p>
          <button
            type="button"
            onClick={() => setTypeFilters(new Set(ALL_TYPES))}
            disabled={offCount === 0}
            className="text-xs font-medium text-primary disabled:text-muted-foreground/50 disabled:cursor-not-allowed"
          >
            Show all
          </button>
        </div>
        <div className="divide-y divide-border/50">
          {ALL_TYPES.map((type) => {
            const cfg = EVENT_CONFIG[type];
            const active = typeFilters.has(type);
            const Icon = cfg.icon;
            return (
              <label
                key={type}
                className="flex items-center gap-3 py-3 cursor-pointer min-h-[44px]"
              >
                <Icon
                  className={cn(
                    "h-5 w-5 shrink-0",
                    active ? "text-foreground" : "text-muted-foreground/60",
                  )}
                />
                <span
                  className={cn(
                    "flex-1 text-sm",
                    !active && "text-muted-foreground/60",
                  )}
                >
                  {cfg.label}
                </span>
                <input
                  type="checkbox"
                  checked={active}
                  onChange={() => toggleTypeFilter(type)}
                  className="h-5 w-5 rounded border-border accent-primary"
                />
              </label>
            );
          })}
        </div>
      </BottomSheet>

      {/* ── Add Event sheet (full screen overlay) ─────────────────── */}
      {showAddEvent && (
        <div
          className="fixed inset-0 z-[60] bg-background flex flex-col"
          style={{ paddingTop: "env(safe-area-inset-top, 0)" }}
        >
          <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-border">
            <button
              type="button"
              onClick={() => {
                setShowAddEvent(false);
                setEditingEventId(null);
                resetForm();
              }}
              className="text-sm text-muted-foreground"
            >
              Cancel
            </button>
            <h2 className="text-base font-semibold">
              {editingEventId ? "Edit Event" : "New Event"}
            </h2>
            <button
              type="button"
              onClick={handleSaveEvent}
              disabled={!newTitle.trim() || !newDate}
              className="text-sm font-semibold text-primary disabled:text-muted-foreground/50"
            >
              Save
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            <div className="space-y-1">
              <label htmlFor="m-ce-title" className="text-xs font-medium text-muted-foreground">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                id="m-ce-title"
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Event title"
                className="w-full rounded-md border bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="m-ce-date" className="text-xs font-medium text-muted-foreground">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                id="m-ce-date"
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="m-ce-desc" className="text-xs font-medium text-muted-foreground">
                Description
              </label>
              <textarea
                id="m-ce-desc"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Optional description"
                rows={3}
                className="w-full rounded-md border bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="m-ce-location" className="text-xs font-medium text-muted-foreground">
                Physical location
              </label>
              <div className="relative">
                <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  id="m-ce-location"
                  type="text"
                  value={newPhysicalLocation}
                  onChange={(e) => setNewPhysicalLocation(e.target.value)}
                  placeholder="Building, room, or address"
                  className="w-full rounded-md border bg-background pl-8 pr-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="m-ce-link" className="text-xs font-medium text-muted-foreground">
                Meeting link
              </label>
              <div className="relative">
                <LinkIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  id="m-ce-link"
                  type="text"
                  value={newMeetingLink}
                  onChange={(e) => setNewMeetingLink(e.target.value)}
                  placeholder="Paste Teams, Zoom, or Meet link"
                  className="w-full rounded-md border bg-background pl-8 pr-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="m-ce-type" className="text-xs font-medium text-muted-foreground">
                Event type
              </label>
              <select
                id="m-ce-type"
                value={newEventType}
                onChange={(e) =>
                  setNewEventType(e.target.value as CustomEvent["event_type"])
                }
                className="w-full rounded-md border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {(Object.entries(CUSTOM_EVENT_TYPE_LABELS) as [
                  CustomEvent["event_type"],
                  string,
                ][]).map(([val, lbl]) => (
                  <option key={val} value={val}>
                    {lbl}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Attachments{" "}
                <span className="font-normal text-muted-foreground/70">
                  (Images &amp; PDF, max 5 files, 5MB each)
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer rounded-md border border-dashed px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted/30 transition-colors">
                <Paperclip className="h-3.5 w-3.5" />
                <span>
                  {newAttachments.length >= 5 ? "Max files reached" : "Choose files…"}
                </span>
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
                <div className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] text-red-700">
                  {uploadError}
                </div>
              )}
              {newAttachments.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {newAttachments.map((att, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs"
                    >
                      {att.type.startsWith("image/") ? (
                        <ImageIcon className="h-3 w-3" />
                      ) : (
                        <FileText className="h-3 w-3" />
                      )}
                      <span className="truncate max-w-[120px]">{att.name}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setNewAttachments((prev) =>
                            prev.filter((_, j) => j !== i),
                          )
                        }
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <span className="text-xs font-medium text-muted-foreground">
                Sharing
              </span>
              <div className="space-y-1.5">
                {(
                  [
                    { value: "private" as const, label: "Only me" },
                    { value: "everyone" as const, label: "Everyone" },
                    { value: "select" as const, label: "Select people" },
                  ]
                ).map((opt) => (
                  <label
                    key={opt.value}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="m-share-mode"
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
                  {newSharedWith.size > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {Array.from(newSharedWith).map((uid) => {
                        const u = companyUsers.find((cu) => cu.id === uid) as
                          | {
                              id: string;
                              first_name?: string;
                              last_name?: string;
                              email?: string;
                            }
                          | undefined;
                        if (!u) return null;
                        return (
                          <span
                            key={uid}
                            className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs"
                          >
                            {u.first_name || u.email || uid}
                            <button
                              type="button"
                              onClick={() =>
                                setNewSharedWith((prev) => {
                                  const next = new Set(prev);
                                  next.delete(uid);
                                  return next;
                                })
                              }
                              className="hover:text-primary/70"
                            >
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}

                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      value={peopleSearch}
                      onChange={(e) => setPeopleSearch(e.target.value)}
                      placeholder="Search people..."
                      className="w-full rounded-md border bg-background pl-7 pr-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {companyUsers.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        No users found.
                      </p>
                    )}
                    {companyUsers
                      .filter((u) => {
                        if (!peopleSearch.trim()) return true;
                        const q = peopleSearch.toLowerCase();
                        const cu = u as {
                          first_name?: string;
                          last_name?: string;
                          email?: string;
                        };
                        return (
                          (cu.first_name || "").toLowerCase().includes(q) ||
                          (cu.last_name || "").toLowerCase().includes(q) ||
                          (cu.email || "").toLowerCase().includes(q)
                        );
                      })
                      .map((u) => {
                        const cu = u as {
                          id: string;
                          first_name?: string;
                          last_name?: string;
                          email?: string;
                        };
                        return (
                          <label
                            key={cu.id}
                            className="flex items-center gap-2 text-sm cursor-pointer px-1 py-1 rounded hover:bg-muted/50"
                          >
                            <input
                              type="checkbox"
                              checked={newSharedWith.has(cu.id)}
                              onChange={() => {
                                setNewSharedWith((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(cu.id)) next.delete(cu.id);
                                  else next.add(cu.id);
                                  return next;
                                });
                              }}
                              className="h-3.5 w-3.5 rounded accent-primary"
                            />
                            <span className="truncate">
                              {cu.first_name || ""} {cu.last_name || ""}{" "}
                              <span className="text-muted-foreground text-xs">
                                {cu.email ? `(${cu.email})` : ""}
                              </span>
                            </span>
                          </label>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Action sheet (Edit / Delete / Download) ───────────────── */}
      {actionEvent && !pendingDelete && (
        <div
          className="fixed inset-0 z-[70] flex items-end bg-black/30"
          onClick={() => setActionEvent(null)}
        >
          <div
            className="w-full bg-background border-t border-border rounded-t-2xl pb-[env(safe-area-inset-bottom,0)] animate-in slide-in-from-bottom duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 pt-3 pb-2 border-b border-border">
              <p className="text-sm font-semibold truncate">{actionEvent.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {actionEvent.date.toLocaleDateString("en-US", {
                  weekday: "short", month: "short", day: "numeric",
                })}
              </p>
            </div>
            <button
              type="button"
              onClick={() => startEditEvent(actionEvent)}
              className="block w-full text-left px-4 py-3.5 text-sm border-b border-border active:bg-muted"
            >
              Edit event
            </button>
            <button
              type="button"
              onClick={() => {
                downloadICS(actionEvent.title, actionEvent.date);
                setActionEvent(null);
              }}
              className="block w-full text-left px-4 py-3.5 text-sm border-b border-border active:bg-muted"
            >
              Download .ics
            </button>
            <button
              type="button"
              onClick={() => setPendingDelete(actionEvent.id)}
              className="block w-full text-left px-4 py-3.5 text-sm text-red-600 border-b border-border active:bg-muted"
            >
              Delete event
            </button>
            <button
              type="button"
              onClick={() => setActionEvent(null)}
              className="block w-full text-center px-4 py-3.5 text-sm font-medium text-muted-foreground active:bg-muted"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Delete confirmation ───────────────────────────────────── */}
      {pendingDelete && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center px-6 bg-black/40"
          onClick={() => setPendingDelete(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-background p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold">Delete this event?</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">
              This will remove it from everyone&apos;s calendar. This can&apos;t be undone.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                className="flex-1 rounded-lg border border-border px-3 py-2.5 text-sm font-medium active:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => confirmDeleteEvent(pendingDelete)}
                className="flex-1 rounded-lg bg-red-600 px-3 py-2.5 text-sm font-medium text-white active:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </SheetPageShell>
  );
}

export default function CalendarPage() {
  return (
    <RoleGuard requiredPermission="incidents.view_own">
      <CalendarPageContent />
    </RoleGuard>
  );
}
