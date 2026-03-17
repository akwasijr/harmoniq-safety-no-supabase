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
  Wrench,
  Search,
  ScanLine,
  Newspaper,
  HardHat,
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

// Rotating tip icons to keep it visually fresh
const TIP_ICONS = [Zap, Flame, Shield, Eye, Activity, Sparkles, Heart];

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
    .slice(0, 2);
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
  const safetyStreak = safeDays;

  // Determine if we have enough data for the full feed view
  const hasData = pendingChecklists.length > 0 || recentNews.length > 0;

  // ── Quick action grid items ──
  const quickActions = [
    { href: `/${company}/app/report`, labelKey: "app.reportIncident", label: "Report Incident", icon: AlertTriangle },
    { href: `/${company}/app/my-tasks`, labelKey: "app.myTasks", label: "My Tasks", icon: ClipboardCheck },
    { href: `/${company}/app/assets`, labelKey: "app.browseAssets", label: "Browse Assets", icon: Search },
    { href: `/${company}/app/report`, labelKey: "app.requestFix", label: "Request Fix", icon: Wrench },
    { href: `/${company}/app/scan`, labelKey: "app.scanAsset", label: "Scan Asset", icon: ScanLine },
    { href: `/${company}/app/report`, labelKey: "app.riskAssessment", label: "Risk Check", icon: ShieldCheck },
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
        <p className="text-white/50 text-xs mt-1">{currentCompany?.name}</p>

        {/* Stats row - white/glass cards */}
        <div className="grid grid-cols-3 gap-3 mt-5">
          <div className="rounded-xl bg-white/10 backdrop-blur-sm p-3 text-center">
            <p className="text-2xl font-bold text-white">{safeDays}</p>
            <p className="text-[11px] text-white/60 mt-0.5">{t("app.safeDays")}</p>
          </div>
          <Link href={`/${company}/app/tasks`} className="rounded-xl bg-white/10 backdrop-blur-sm p-3 text-center">
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

        {/* News & Updates */}
        <div className="rounded-xl bg-card border border-border/50 px-4 py-2">
        <Section
          title={t("app.newsAndUpdates")}
          icon={Newspaper}
          iconColor="text-primary"
          action={
            recentNews.length > 0 ? (
              <Link href={`/${company}/app/news`} className="text-xs text-primary font-medium flex items-center gap-0.5">
                {t("common.viewAll")} <ArrowRight className="h-3 w-3" />
              </Link>
            ) : undefined
          }
        >
          {recentNews.length > 0 ? (
            recentNews.map((item) => (
              <Link
                key={item.id}
                href={`/${company}/app/news/${item.id}`}
                className="flex items-start gap-3 rounded-lg p-2.5 transition-colors active:bg-muted/60 hover:bg-muted/40"
              >
                <FileText className="h-5 w-5 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm leading-tight line-clamp-2">{item.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                    <span className="text-[11px] text-muted-foreground">
                      {formatDate(new Date(item.published_at || item.created_at))}
                    </span>
                    {item.category && (
                      <span className="text-[10px] text-muted-foreground">{item.category}</span>
                    )}
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="py-4 text-center">
              <Newspaper className="h-6 w-6 text-muted-foreground/30 mx-auto" aria-hidden="true" />
              <p className="text-xs font-medium text-muted-foreground mt-2">{t("app.noNewsYet")}</p>
              <p className="text-[11px] text-muted-foreground/70 mt-0.5">{t("app.noNewsDesc")}</p>
            </div>
          )}
        </Section>
        </div>

      </div>
    </div>
  );
}
