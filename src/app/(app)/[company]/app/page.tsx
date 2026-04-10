"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ClipboardCheck,
  ChevronRight,
  ChevronDown,
  ArrowRight,
  ChevronLeft,
  Newspaper,
  Wrench,
  Search,
  ScanLine,
  ShieldCheck,
  Zap,
  AlertCircle,
  Clock,
  Info,
  Ticket,
  CheckCircle,
  TrendingDown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useFieldAppSettings } from "@/components/providers/field-app-settings-provider";
import { useContentStore } from "@/stores/content-store";
import { useIncidentsStore } from "@/stores/incidents-store";
import { useTicketsStore } from "@/stores/tickets-store";
import { useWorkOrdersStore } from "@/stores/work-orders-store";
import { useCorrectiveActionsStore } from "@/stores/corrective-actions-store";
import { useChecklistTemplatesStore, useChecklistSubmissionsStore } from "@/stores/checklists-store";
import { useCompanyParam } from "@/hooks/use-company-param";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "@/i18n";
import type { Content } from "@/types";
import { isAssignedToUserOrTeam } from "@/lib/assignment-utils";
import { getDueChecklists } from "@/lib/checklist-due";
import { isVisibleToFieldApp } from "@/lib/template-activation";
import {
  type FieldAppQuickActionId,
  getFieldAppQuickActionDefinition,
  getFieldAppTip,
} from "@/lib/field-app-settings";

const QUICK_ACTION_ICON_MAP: Record<FieldAppQuickActionId, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  report_incident: AlertTriangle,
  my_tasks: ClipboardCheck,
  browse_assets: Search,
  request_fix: Wrench,
  scan_asset: ScanLine,
  risk_check: ShieldCheck,
  checklists: ClipboardCheck,
  news: Newspaper,
};

/* ── Field Focus ── */
type FocusItem = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

type FocusTab = "urgent" | "upcoming" | "good_to_know";

function FieldFocus({
  urgent,
  upcoming,
  goodToKnow,
  t,
}: {
  urgent: FocusItem[];
  upcoming: FocusItem[];
  goodToKnow: FocusItem[];
  t: (key: string) => string;
}) {
  const [activeTab, setActiveTab] = React.useState<FocusTab>("urgent");

  const tabs: { id: FocusTab; label: string; color: string; count: number }[] = [
    { id: "urgent", label: "Urgent", color: "text-red-500 border-red-500", count: urgent.length },
    { id: "upcoming", label: "Upcoming", color: "text-amber-500 border-amber-500", count: upcoming.length },
    { id: "good_to_know", label: "Good to Know", color: "text-blue-500 border-blue-500", count: goodToKnow.length },
  ];

  const items = activeTab === "urgent" ? urgent : activeTab === "upcoming" ? upcoming : goodToKnow;

  return (
    <div>
      <h2 className="text-base font-semibold mb-3">Field Focus</h2>
      {/* Tabs */}
      <div className="flex gap-1 mb-3">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex-1 text-xs font-medium py-2 rounded-lg text-center transition-colors",
              activeTab === tab.id
                ? `${tab.color} bg-current/10 border-b-2`
                : "text-muted-foreground"
            )}
            style={activeTab === tab.id ? { backgroundColor: `color-mix(in srgb, currentColor 10%, transparent)` } : undefined}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className="ml-1 text-[10px] opacity-70">({tab.count})</span>
            )}
          </button>
        ))}
      </div>
      {/* Items */}
      {items.length === 0 ? (
        <p className="py-4 text-center text-xs text-muted-foreground">
          {activeTab === "urgent" ? "No urgent items" : activeTab === "upcoming" ? "Nothing upcoming" : "All clear"}
        </p>
      ) : (
        <div className="space-y-0.5">
          {items.slice(0, 5).map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 active:bg-muted/50 transition-colors"
            >
              <item.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
              <p className="flex-1 text-sm truncate">{item.title}</p>
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function getGreetingKey(): string {
  if (typeof window === "undefined") return "app.goodMorning"; // SSR default
  const hour = new Date().getHours();
  if (hour < 12) return "app.goodMorning";
  if (hour < 17) return "app.goodAfternoon";
  return "app.goodEvening";
}

function getDayOfYear(): number {
  if (typeof window === "undefined") return 0; // SSR default
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

// Featured News Carousel (inspired by airport-style featured cards)
function FeaturedNewsCarousel({
  news,
  company,
  t,
  formatDate,
}: {
  news: Content[];
  company: string;
  t: (key: string) => string;
  formatDate: (date: string | Date, options?: Intl.DateTimeFormatOptions) => string;
}) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = React.useState(0);

  const scroll = (dir: "left" | "right") => {
    const container = scrollRef.current;
    if (!container) return;
    const cardWidth = container.offsetWidth * 0.52;
    const newIndex = dir === "left" ? Math.max(0, activeIndex - 1) : Math.min(news.length - 1, activeIndex + 1);
    container.scrollTo({ left: newIndex * cardWidth, behavior: "smooth" });
    setActiveIndex(newIndex);
  };

  // Track scroll position to update active dot
  React.useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const handleScroll = () => {
      const cardWidth = container.offsetWidth * 0.52;
      const idx = Math.round(container.scrollLeft / cardWidth);
      setActiveIndex(idx);
    };
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  // Placeholder colors for cards without images
  const cardColors = [
    "from-blue-500/20 to-blue-600/10",
    "from-emerald-500/20 to-emerald-600/10",
    "from-amber-500/20 to-amber-600/10",
    "from-violet-500/20 to-violet-600/10",
    "from-rose-500/20 to-rose-600/10",
  ];

  if (news.length === 0) {
    return (
      <div className="field-app-panel field-app-surface bg-card border border-border/50 px-4 py-6">
        <div className="flex flex-col items-center justify-center text-center py-4">
          <div className="rounded-full bg-muted p-3 mb-3">
            <Newspaper className="h-6 w-6 text-muted-foreground/40" aria-hidden="true" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">{t("app.noNewsYet") || "No news yet"}</p>
          <p className="text-xs text-muted-foreground/70 mt-1">{t("app.noNewsDesc") || "Company news and updates will appear here"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header with arrows */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold">{t("app.featured") || "Featured"}</h2>
        {news.length > 1 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => scroll("left")}
              disabled={activeIndex === 0}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-border transition-colors disabled:opacity-30 hover:bg-muted"
              aria-label="Previous"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => scroll("right")}
              disabled={activeIndex === news.length - 1}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-border transition-colors disabled:opacity-30 hover:bg-muted"
              aria-label="Next"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Scrollable cards */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide -mr-4 pr-4 pl-4"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {news.map((item, i) => (
          <Link
            key={item.id}
            href={`/${company}/app/news/${item.id}`}
            className="field-app-panel field-app-surface flex-shrink-0 snap-start border bg-card overflow-hidden transition-shadow hover:shadow-md active:shadow-sm"
            style={{ width: "52%" }}
          >
            {/* Image / gradient placeholder */}
            <div className={`h-20 w-full bg-gradient-to-br ${cardColors[i % cardColors.length]} relative overflow-hidden`}>
              {item.featured_image ? (
                <img
                  src={item.featured_image}
                  alt={item.title ? `Featured: ${item.title}` : "News article image"}
                  className="h-full w-full object-cover object-center"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <Newspaper className="h-6 w-6 text-foreground/10" aria-hidden="true" />
                </div>
              )}
            </div>

            {/* Content */}
            <div className="px-2.5 py-2 space-y-0.5">
              <h3 className="font-semibold text-[11px] leading-snug line-clamp-1">{item.title}</h3>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">
                  {formatDate(new Date(item.published_at || item.created_at))}
                </span>
                <span className="text-[10px] font-medium text-primary flex items-center gap-0.5">
                  {t("common.readMore") || "Read more"} <ArrowRight className="h-2.5 w-2.5" />
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Dot indicators */}
      {news.length > 1 && (
        <div className="flex justify-center gap-1.5">
          {news.map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === activeIndex ? "w-4 bg-primary" : "w-1.5 bg-muted-foreground/20"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Collapsible section (shared mobile pattern)
function Section({
  title,
  icon: Icon,
  iconColor = "text-muted-foreground",
  count,
  action,
  defaultOpen = true,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor?: string;
  count?: number;
  action?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);
  const sectionId = React.useId();
  return (
    <div>
      <div className="flex items-center gap-2 py-2">
        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-controls={sectionId}
          className="flex flex-1 items-center gap-2 text-sm font-semibold text-foreground"
        >
          <Icon className={cn("h-4 w-4 shrink-0", iconColor)} aria-hidden="true" />
          <span className="flex-1 text-left">{title}</span>
          {count !== undefined && count > 0 && (
            <Badge variant="secondary" className="text-[10px] h-5 min-w-5 justify-center">
              {count}
            </Badge>
          )}
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform shrink-0",
              isOpen && "rotate-180"
            )}
            aria-hidden="true"
          />
        </button>
        {action}
      </div>
      {isOpen && <div id={sectionId} className="space-y-2 pb-3">{children}</div>}
    </div>
  );
}

export default function EmployeeAppHomePage() {
  const company = useCompanyParam();
  const { user, currentCompany } = useAuth();
  const { settings: fieldAppSettings } = useFieldAppSettings();
  const { items: contentItems } = useContentStore();
  const { items: incidents } = useIncidentsStore();
  const { items: tickets } = useTicketsStore();
  const { items: workOrders } = useWorkOrdersStore();
  const { items: correctiveActions } = useCorrectiveActionsStore();
  const { items: checklistTemplates } = useChecklistTemplatesStore();
  const { items: checklistSubmissions } = useChecklistSubmissionsStore();
  const { t, formatDate } = useTranslation();

  // Use state for time-dependent values to prevent hydration mismatch
  const [mounted, setMounted] = React.useState(false);
  const [stableNow] = React.useState(() => Date.now());
  const [shouldAnimate] = React.useState(() => {
    if (typeof window === "undefined") return false;
    const key = "harmoniq_home_animated";
    if (sessionStorage.getItem(key)) return false;
    sessionStorage.setItem(key, "1");
    return true;
  });
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        {t("common.loading")}
      </div>
    );
  }

  const userIncidents = incidents.filter((incident) => incident.reporter_id === user.id);
  const lastIncidentDate = userIncidents.length > 0
    ? new Date(Math.max(...userIncidents.map((incident) => new Date(incident.incident_date).getTime())))
    : new Date(stableNow - 30 * 24 * 60 * 60 * 1000);
  // Only compute time-sensitive values after mount to prevent hydration mismatch
  const safeDays = mounted ? Math.floor((stableNow - lastIncidentDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;
  const userTickets = tickets.filter(
    (ticket) =>
      isAssignedToUserOrTeam(ticket, user),
  );
  const userWorkOrders = workOrders.filter((wo) => isAssignedToUserOrTeam(wo, user));
  const userActions = correctiveActions.filter((ca) => isAssignedToUserOrTeam(ca, user));

  // Due checklists for this user
  const myTemplates = checklistTemplates.filter(
    (tpl) => tpl.company_id === user?.company_id && isVisibleToFieldApp(tpl)
  );
  const mySubmissions = checklistSubmissions.filter((s) => s.submitter_id === user?.id);
  const dueChecklists = getDueChecklists(myTemplates, mySubmissions);

  const pendingTaskCount = userTickets.filter((t) => t.status !== "resolved" && t.status !== "closed").length
    + userWorkOrders.filter((wo) => wo.status !== "completed" && wo.status !== "cancelled").length
    + userActions.filter((ca) => ca.status !== "completed").length
    + dueChecklists.length;
  const oneWeekAgo = new Date(stableNow - 7 * 24 * 60 * 60 * 1000);
  const completedThisWeek = userTickets.filter(
    (ticket) => ticket.updated_at && new Date(ticket.updated_at) > oneWeekAgo
  ).length;
  
  // Data feeds
  const recentNews = fieldAppSettings.newsEnabled
    ? contentItems.filter((item) => item.status === "published" && item.type === "news").slice(0, 5)
    : [];
  const tipText = getFieldAppTip(
    currentCompany?.industry,
    (currentCompany?.language ?? user.language) || "en",
    getDayOfYear()
  );
  const greeting = t(getGreetingKey());

  const quickActions = fieldAppSettings.quickActions.map((actionId) => {
    const definition = getFieldAppQuickActionDefinition(actionId);
    return {
      ...definition,
      href: `/${company}${definition.href}`,
      icon: QUICK_ACTION_ICON_MAP[actionId],
    };
  });

  // ── Field Focus data ──
  const now = new Date(stableNow);
  const sevenDaysFromNow = new Date(stableNow + 7 * 24 * 60 * 60 * 1000);

  const focusUrgent: FocusItem[] = [];
  const focusUpcoming: FocusItem[] = [];
  const focusGoodToKnow: FocusItem[] = [];

  // Critical/high incidents still open
  incidents
    .filter((inc) => (inc.severity === "critical" || inc.severity === "high") && inc.status !== "resolved" && inc.status !== "archived")
    .slice(0, 5)
    .forEach((inc) => {
      focusUrgent.push({
        id: `inc-${inc.id}`,
        title: inc.title,
        subtitle: `${inc.severity} incident · ${inc.status}`,
        href: `/${company}/app/incidents/${inc.id}`,
        icon: AlertCircle,
      });
    });

  // Overdue tickets
  userTickets
    .filter((tk) => tk.status !== "resolved" && tk.status !== "closed" && tk.due_date && new Date(tk.due_date) < now)
    .forEach((tk) => {
      focusUrgent.push({
        id: `tk-${tk.id}`,
        title: tk.title,
        subtitle: `Overdue · was due ${tk.due_date}`,
        href: `/${company}/app/tasks/tickets/${tk.id}`,
        icon: Ticket,
      });
    });

  // Overdue work orders
  userWorkOrders
    .filter((wo) => wo.status !== "completed" && wo.status !== "cancelled" && wo.due_date && new Date(wo.due_date) < now)
    .forEach((wo) => {
      focusUrgent.push({
        id: `wo-${wo.id}`,
        title: wo.title,
        subtitle: `Overdue work order · ${wo.priority}`,
        href: `/${company}/app/tasks/work-orders/${wo.id}`,
        icon: Wrench,
      });
    });

  // Overdue corrective actions
  userActions
    .filter((ca) => ca.status !== "completed" && ca.due_date && new Date(ca.due_date) < now)
    .forEach((ca) => {
      focusUrgent.push({
        id: `ca-${ca.id}`,
        title: ca.description?.slice(0, 60) || "Corrective action",
        subtitle: `Overdue · ${ca.severity} severity`,
        href: `/${company}/app/tasks/actions/${ca.id}`,
        icon: AlertTriangle,
      });
    });

  // Due checklists (urgent)
  dueChecklists.slice(0, 3).forEach((dc) => {
    focusUrgent.push({
      id: `cl-${dc.template.id}`,
      title: dc.template.name,
      subtitle: dc.label || "Checklist due",
      href: `/${company}/app/checklists/${dc.template.id}`,
      icon: ClipboardCheck,
    });
  });

  // Upcoming: tickets/WOs/actions due within 7 days
  userTickets
    .filter((tk) => tk.status !== "resolved" && tk.status !== "closed" && tk.due_date && new Date(tk.due_date) >= now && new Date(tk.due_date) <= sevenDaysFromNow)
    .forEach((tk) => {
      focusUpcoming.push({
        id: `tk-${tk.id}`,
        title: tk.title,
        subtitle: `Due ${tk.due_date}`,
        href: `/${company}/app/tasks/tickets/${tk.id}`,
        icon: Clock,
      });
    });

  userWorkOrders
    .filter((wo) => wo.status !== "completed" && wo.status !== "cancelled" && wo.due_date && new Date(wo.due_date) >= now && new Date(wo.due_date) <= sevenDaysFromNow)
    .forEach((wo) => {
      focusUpcoming.push({
        id: `wo-${wo.id}`,
        title: wo.title,
        subtitle: `Due ${wo.due_date} · ${wo.type.replace(/_/g, " ")}`,
        href: `/${company}/app/tasks/work-orders/${wo.id}`,
        icon: Wrench,
      });
    });

  userActions
    .filter((ca) => ca.status !== "completed" && ca.due_date && new Date(ca.due_date) >= now && new Date(ca.due_date) <= sevenDaysFromNow)
    .forEach((ca) => {
      focusUpcoming.push({
        id: `ca-${ca.id}`,
        title: ca.description?.slice(0, 60) || "Corrective action",
        subtitle: `Due ${ca.due_date}`,
        href: `/${company}/app/tasks/actions/${ca.id}`,
        icon: Clock,
      });
    });

  // Good to Know: safe days milestone, completed tasks this week, resolved incidents
  if (safeDays > 0 && safeDays % 7 === 0) {
    focusGoodToKnow.push({
      id: "safe-milestone",
      title: `${safeDays} days without incidents`,
      subtitle: "Keep up the great work!",
      href: `/${company}/app`,
      icon: CheckCircle,
    });
  }

  if (completedThisWeek > 0) {
    focusGoodToKnow.push({
      id: "completed-week",
      title: `${completedThisWeek} tasks completed this week`,
      subtitle: "Your team is on track",
      href: `/${company}/app/checklists?tab=checklists`,
      icon: CheckCircle,
    });
  }

  incidents
    .filter((inc) => inc.status === "resolved" && inc.resolved_at && new Date(inc.resolved_at) > oneWeekAgo)
    .slice(0, 3)
    .forEach((inc) => {
      focusGoodToKnow.push({
        id: `resolved-${inc.id}`,
        title: `${inc.title} resolved`,
        subtitle: inc.reference_number || "Incident closed",
        href: `/${company}/app/incidents/${inc.id}`,
        icon: Info,
      });
    });

  // ── Always show full feed (no early return for empty state) ──
  return (
    <div className="flex flex-col min-h-full" data-animate={shouldAnimate ? "true" : "false"}>
      {/* ── Hero Section — no animation, visible immediately to avoid white flash ── */}
      <div className="bg-brand-solid px-5 pt-8 pb-10">
        <p className="text-brand-solid-foreground/60 text-sm home-section" style={{ animationDelay: "0.55s" }}>{greeting}</p>
        <h1 className="text-2xl font-bold text-brand-solid-foreground mt-1 home-section" style={{ animationDelay: "0.5s" }}>
          {user?.first_name || t("app.welcome")}
        </h1>

        {/* Stats row - white/glass cards */}
        <div className="grid grid-cols-3 gap-2.5 mt-6">
          <div className="field-app-panel field-app-surface bg-white/10 backdrop-blur-sm px-3 py-3.5 text-center home-section" style={{ animationDelay: "0.45s" }}>
            <p className="text-2xl font-bold text-brand-solid-foreground">{safeDays}</p>
            <p className="text-[11px] text-brand-solid-foreground/60 mt-0.5">{t("app.safeDays")}</p>
          </div>
          <Link href={`/${company}/app/checklists?tab=checklists`} className="field-app-panel field-app-surface bg-white/10 backdrop-blur-sm px-3 py-3.5 text-center hover:bg-white/20 transition-colors home-section" style={{ animationDelay: "0.4s" }}>
            <p className="text-2xl font-bold text-brand-solid-foreground">{pendingTaskCount}</p>
            <p className="text-[11px] text-brand-solid-foreground/60 mt-0.5">{t("app.pendingTasks") || "Pending Tasks"}</p>
          </Link>
          <div className="field-app-panel field-app-surface bg-white/10 backdrop-blur-sm px-3 py-3.5 text-center home-section" style={{ animationDelay: "0.35s" }}>
            <p className="text-2xl font-bold text-brand-solid-foreground">{completedThisWeek}</p>
            <p className="text-[11px] text-brand-solid-foreground/60 mt-0.5">{t("app.completedWeek") || "This Week"}</p>
          </div>
        </div>
      </div>

      {/* ── Tip of the Day (wide banner) ── */}
      {fieldAppSettings.tipOfTheDayEnabled && (
        <div className="mx-4 -mt-5 relative z-10 home-section" style={{ animationDelay: "0.3s" }}>
          <div className="field-app-panel field-app-surface bg-card rounded-2xl px-4 py-4">
            <p className="text-[10px] font-bold text-primary mb-1">{t("app.tipOfTheDay") || "Tip of the Day"}</p>
            <p className="text-sm text-foreground leading-relaxed">{tipText}</p>
          </div>
        </div>
      )}

      {/* ── Quick Actions (horizontal circles) ── */}
      <div className="px-4 mt-6 home-section" style={{ animationDelay: "0.2s" }}>
        <div className="flex justify-evenly">
          {quickActions.slice(0, 4).map((action, i) => (
            <Link key={action.href + action.labelKey} href={action.href}
              className="flex flex-col items-center gap-2 w-[72px] active:scale-95 transition-transform home-section"
              style={{ animationDelay: `${0.15 - Math.min(i * 0.02, 0.12)}s` }}>
              <div className="h-14 w-14 rounded-full bg-primary/15 flex items-center justify-center">
                <action.icon className="h-6 w-6 text-white" strokeWidth={1.5} />
              </div>
              <span className="text-[11px] font-medium text-center text-muted-foreground leading-tight">{t(action.labelKey) || action.fallbackLabel}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Field Focus ── */}
      <div className="px-4 mt-6 home-section" style={{ animationDelay: "0.1s" }}>
        <FieldFocus urgent={focusUrgent} upcoming={focusUpcoming} goodToKnow={focusGoodToKnow} t={t} />
      </div>

      {/* ── Content Feed ── */}
      <div className="px-4 pt-6 pb-24 space-y-1 home-section" style={{ animationDelay: "0s" }}>

        {/* Featured News Carousel */}
        {fieldAppSettings.newsEnabled && (
          <FeaturedNewsCarousel news={recentNews} company={company} t={t} formatDate={formatDate} />
        )}

      </div>

      <style>{`
        [data-animate="true"] .home-section {
          opacity: 0;
          transform: translateY(40px);
          animation: home-ease-in 0.7s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        @keyframes home-ease-in {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
