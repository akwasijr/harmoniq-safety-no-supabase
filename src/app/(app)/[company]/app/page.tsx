"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ClipboardCheck,
  FileText,
  ChevronRight,
  Clock,
  AlertCircle,
  Shield,
  Flame,
  Zap,
  Sparkles,
  Heart,
  Megaphone,
  CheckCircle,
  ChevronDown,
  ArrowRight,
  ChevronLeft,
  Wrench,
  Search,
  ScanLine,
  Newspaper,
  Eye,
  Thermometer,
  Lock,
  Ear,
  Footprints,
  Siren,
  HandMetal,
  BookOpen,
  Activity,
  Stethoscope,
  BellRing,
  Users,
  ShieldCheck,
  Truck,
  RefreshCw,
  Timer,
  Gauge,
  Hammer,
  Lightbulb,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useContentStore } from "@/stores/content-store";
import { useChecklistTemplatesStore, useChecklistSubmissionsStore } from "@/stores/checklists-store";
import { useIncidentsStore } from "@/stores/incidents-store";
import { useTicketsStore } from "@/stores/tickets-store";
import { useWorkOrdersStore } from "@/stores/work-orders-store";
import { useCorrectiveActionsStore } from "@/stores/corrective-actions-store";
import { useCompanyParam } from "@/hooks/use-company-param";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "@/i18n";
import type { Content } from "@/types";

// 30 safety tips that cycle daily
const SAFETY_TIPS = [
  { tip: "Always inspect your PPE before starting a shift.", icon: Shield },
  { tip: "Report near-misses. They prevent real incidents.", icon: AlertTriangle },
  { tip: "Know your emergency exits and assembly points.", icon: Siren },
  { tip: "Take regular breaks to stay alert and focused.", icon: Timer },
  { tip: "Good housekeeping prevents slips, trips & falls.", icon: Sparkles },
  { tip: "Never bypass safety guards on equipment.", icon: Lock },
  { tip: "Communication saves lives. Speak up about hazards.", icon: Megaphone },
  { tip: "Wear appropriate footwear for your work environment.", icon: Footprints },
  { tip: "Keep fire extinguishers accessible and know how to use them.", icon: Flame },
  { tip: "Always follow lockout/tagout procedures.", icon: Lock },
  { tip: "Lift with your legs, not your back.", icon: Activity },
  { tip: "Store chemicals in labelled containers with SDS available.", icon: Thermometer },
  { tip: "Keep walkways and emergency exits clear at all times.", icon: ArrowRight },
  { tip: "Report damaged electrical cords or outlets immediately.", icon: Zap },
  { tip: "Use hearing protection in high-noise areas.", icon: Ear },
  { tip: "Wash your hands regularly, especially before eating.", icon: HandMetal },
  { tip: "Know the location of first aid kits on your floor.", icon: Stethoscope },
  { tip: "Never operate machinery you haven't been trained on.", icon: Gauge },
  { tip: "Stay hydrated. Dehydration reduces focus and reaction time.", icon: Heart },
  { tip: "Secure loose clothing and hair near moving equipment.", icon: ShieldCheck },
  { tip: "Report any spills immediately and clean them up.", icon: AlertCircle },
  { tip: "Use the buddy system for high-risk tasks.", icon: Users },
  { tip: "Check ladders for damage before climbing.", icon: Eye },
  { tip: "Follow speed limits when driving forklifts or vehicles on-site.", icon: Truck },
  { tip: "Stretch before physically demanding tasks.", icon: RefreshCw },
  { tip: "Ensure proper ventilation when working with fumes.", icon: Activity },
  { tip: "Attend all scheduled safety training sessions.", icon: BookOpen },
  { tip: "Use the right tool for the job. Improvising causes injuries.", icon: Hammer },
  { tip: "Review risk assessments before starting unfamiliar work.", icon: ClipboardCheck },
  { tip: "If in doubt, stop and ask your supervisor.", icon: BellRing },
];

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
      <div className="rounded-xl bg-card border border-border/50 px-4 py-6">
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
            className="flex-shrink-0 snap-start rounded-lg border bg-card overflow-hidden transition-shadow hover:shadow-md active:shadow-sm"
            style={{ width: "52%" }}
          >
            {/* Image / gradient placeholder */}
            <div className={`h-20 w-full bg-gradient-to-br ${cardColors[i % cardColors.length]} relative overflow-hidden`}>
              {item.featured_image ? (
                <img
                  src={item.featured_image}
                  alt=""
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
  const { items: contentItems } = useContentStore();
  const { items: checklistTemplates } = useChecklistTemplatesStore();
  const { items: checklistSubmissions } = useChecklistSubmissionsStore();
  const { items: incidents } = useIncidentsStore();
  const { items: tickets } = useTicketsStore();
  const { items: workOrders } = useWorkOrdersStore();
  const { items: correctiveActions } = useCorrectiveActionsStore();
  const { t, formatDate } = useTranslation();

  // Use state for time-dependent values to prevent hydration mismatch
  const [mounted, setMounted] = React.useState(false);
  const [stableNow] = React.useState(() => Date.now());
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
      ticket.assigned_to === user.id ||
      (user.team_ids?.length && ticket.assigned_groups?.some((g) => user.team_ids!.includes(g))),
  );
  const userWorkOrders = workOrders.filter((wo) => wo.assigned_to === user.id || wo.requested_by === user.id);
  const userActions = correctiveActions.filter((ca) => ca.assigned_to === user.id);
  const pendingTaskCount = userTickets.filter((t) => t.status !== "resolved" && t.status !== "closed").length
    + userWorkOrders.filter((wo) => wo.status !== "completed" && wo.status !== "cancelled").length
    + userActions.filter((ca) => ca.status !== "completed").length;
  const oneWeekAgo = new Date(stableNow - 7 * 24 * 60 * 60 * 1000);
  const completedThisWeek = userTickets.filter(
    (ticket) => ticket.updated_at && new Date(ticket.updated_at) > oneWeekAgo
  ).length;
  
  // Data feeds
  const recentNews = contentItems
    .filter((item) => item.status === "published" && item.type === "news")
    .slice(0, 5);
  const completedTemplateIds = new Set(
    checklistSubmissions
      .filter((submission) => submission.submitter_id === user.id && submission.status === "submitted")
      .map((submission) => submission.template_id)
  );
  const pendingChecklists = checklistTemplates.filter((template) => !completedTemplateIds.has(template.id)).slice(0, 2);

  // Safety tip of the day (rotates daily)
  const todayTip = SAFETY_TIPS[getDayOfYear() % SAFETY_TIPS.length];
  const greeting = t(getGreetingKey());

  // Stats from computed user data

  // ── Quick action grid items ──
  const quickActions = [
    { href: `/${company}/app/report`, labelKey: "app.reportIncident", label: "Report Incident", icon: AlertTriangle },
    { href: `/${company}/app/checklists?tab=tasks`, labelKey: "app.myTasks", label: "My Tasks", icon: ClipboardCheck },
    { href: `/${company}/app/assets`, labelKey: "app.browseAssets", label: "Browse Assets", icon: Search },
    { href: `/${company}/app/maintenance`, labelKey: "app.requestFix", label: "Request Fix", icon: Wrench },
    { href: `/${company}/app/scan`, labelKey: "app.scanAsset", label: "Scan Asset", icon: ScanLine },
    { href: `/${company}/app/checklists?tab=risk-assessment`, labelKey: "app.riskAssessment", label: "Risk Check", icon: ShieldCheck },
  ];

  // ── Always show full feed (no early return for empty state) ──
  return (
    <div className="flex flex-col min-h-full">
      {/* ── Hero Section ── */}
      <div className="bg-primary px-5 pt-6 pb-8">
        <p className="text-white/60 text-sm">{greeting}</p>
        <h1 className="text-2xl font-bold text-white mt-1">
          {user?.first_name || t("app.welcome")}
        </h1>

        {/* Stats row - white/glass cards */}
        <div className="grid grid-cols-3 gap-3 mt-5">
          <div className="rounded-xl bg-white/10 backdrop-blur-sm p-3 text-center">
            <p className="text-2xl font-bold text-white">{safeDays}</p>
            <p className="text-[11px] text-white/60 mt-0.5">{t("app.safeDays")}</p>
          </div>
          <Link href={`/${company}/app/checklists?tab=tasks`} className="rounded-xl bg-white/10 backdrop-blur-sm p-3 text-center">
            <p className="text-2xl font-bold text-white">{pendingTaskCount}</p>
            <p className="text-[11px] text-white/60 mt-0.5">{t("app.pendingTasks") || "Pending Tasks"}</p>
          </Link>
          <div className="rounded-xl bg-white/10 backdrop-blur-sm p-3 text-center">
            <p className="text-2xl font-bold text-white">{completedThisWeek}</p>
            <p className="text-[11px] text-white/60 mt-0.5">{t("app.completedWeek") || "This Week"}</p>
          </div>
        </div>
      </div>

      {/* ── Tip of the Day ── */}
      <div className="mx-4 -mt-4 relative z-10">
        <div className="rounded-xl bg-card border border-border/50 px-4 py-3 flex items-start gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
            <Lightbulb className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-primary tracking-widest uppercase">{t("app.tipOfTheDay") || "Tip of the Day"}</p>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{todayTip.tip}</p>
          </div>
        </div>
      </div>

      {/* ── Quick Actions ── */}
      <div className="px-4 mt-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold">{t("app.quickActions") || "Quick Actions"}</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((action) => (
            <Link key={action.href + action.labelKey} href={action.href}
              className="flex items-center gap-3 rounded-xl bg-card p-4 border border-border/50 active:scale-[0.98] transition-transform">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <action.icon className="h-6 w-6 text-primary" />
              </div>
              <span className="text-sm font-medium">{t(action.labelKey) || action.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Content Feed ── */}
      <div className="px-4 pt-5 pb-20 space-y-1">

        {/* Featured News Carousel */}
        <FeaturedNewsCarousel news={recentNews} company={company} t={t} formatDate={formatDate} />

      </div>
    </div>
  );
}
