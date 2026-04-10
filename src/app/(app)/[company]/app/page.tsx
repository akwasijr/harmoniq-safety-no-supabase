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

const QUICK_ACTION_ICON_MAP: Record<FieldAppQuickActionId, React.ComponentType<{ className?: string }>> = {
  report_incident: AlertTriangle,
  my_tasks: ClipboardCheck,
  browse_assets: Search,
  request_fix: Wrench,
  scan_asset: ScanLine,
  risk_check: ShieldCheck,
  checklists: ClipboardCheck,
  news: Newspaper,
};

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
          {quickActions.slice(0, 4).map((action, i) => {
            const colors = [
              "bg-red-500/15 text-red-500",
              "bg-blue-500/15 text-blue-500",
              "bg-amber-500/15 text-amber-500",
              "bg-emerald-500/15 text-emerald-500",
            ];
            const color = colors[i % colors.length];
            return (
            <Link key={action.href + action.labelKey} href={action.href}
              className="flex flex-col items-center gap-2 w-[72px] active:scale-95 transition-transform home-section"
              style={{ animationDelay: `${0.15 - Math.min(i * 0.02, 0.12)}s` }}>
              <div className={`h-14 w-14 rounded-full flex items-center justify-center ${color.split(" ")[0]}`}>
                <action.icon className={`h-6 w-6 ${color.split(" ")[1]}`} />
              </div>
              <span className="text-[11px] font-medium text-center text-muted-foreground leading-tight">{t(action.labelKey) || action.fallbackLabel}</span>
            </Link>
            );
          })}
        </div>
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
