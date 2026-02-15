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
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useContentStore } from "@/stores/content-store";
import { useChecklistTemplatesStore, useChecklistSubmissionsStore } from "@/stores/checklists-store";
import { useIncidentsStore } from "@/stores/incidents-store";
import { useTicketsStore } from "@/stores/tickets-store";
import { useCompanyParam } from "@/hooks/use-company-param";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "@/i18n";

// 30 safety tips that cycle daily
const SAFETY_TIPS = [
  { tip: "Always inspect your PPE before starting a shift.", icon: Shield },
  { tip: "Report near-misses — they prevent real incidents.", icon: AlertTriangle },
  { tip: "Know your emergency exits and assembly points.", icon: Siren },
  { tip: "Take regular breaks to stay alert and focused.", icon: Timer },
  { tip: "Good housekeeping prevents slips, trips & falls.", icon: Sparkles },
  { tip: "Never bypass safety guards on equipment.", icon: Lock },
  { tip: "Communication saves lives — speak up about hazards.", icon: Megaphone },
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
  { tip: "Stay hydrated — dehydration reduces focus and reaction time.", icon: Heart },
  { tip: "Secure loose clothing and hair near moving equipment.", icon: ShieldCheck },
  { tip: "Report any spills immediately and clean them up.", icon: AlertCircle },
  { tip: "Use the buddy system for high-risk tasks.", icon: Users },
  { tip: "Check ladders for damage before climbing.", icon: Eye },
  { tip: "Follow speed limits when driving forklifts or vehicles on-site.", icon: Truck },
  { tip: "Stretch before physically demanding tasks.", icon: RefreshCw },
  { tip: "Ensure proper ventilation when working with fumes.", icon: Activity },
  { tip: "Attend all scheduled safety training sessions.", icon: BookOpen },
  { tip: "Use the right tool for the job — improvising causes injuries.", icon: Hammer },
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
  const { t, formatDate } = useTranslation();

  // Use state for time-dependent values to prevent hydration mismatch
  const [mounted, setMounted] = React.useState(false);
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
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  // Only compute time-sensitive values after mount to prevent hydration mismatch
  const safeDays = mounted ? Math.floor((Date.now() - lastIncidentDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;
  const userTickets = tickets.filter((ticket) => ticket.assigned_to === user.id);
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
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

  // Quick action grid items (3 per row, 6 total, consistent neutral style)
  const quickActions = [
    { href: `/${company}/app/report`, icon: AlertTriangle, label: t("app.reportIncident") },
    { href: `/${company}/app/checklists`, icon: ClipboardCheck, label: t("app.safetyTasks") },
    { href: `/${company}/app/maintenance`, icon: Wrench, label: t("app.requestFix") },
    { href: `/${company}/app/assets`, icon: Search, label: t("app.browseAssets") },
    { href: `/${company}/app/scan`, icon: ScanLine, label: t("app.scanAsset") },
    { href: `/${company}/app/checklists?tab=risk-assessment`, icon: ShieldCheck, label: t("app.riskAssessment") },
  ];

  // ── Shared hero section ──
  const HeroSection = () => (
    <div className="relative overflow-hidden px-5 pt-5 pb-8" style={{ minHeight: 160 }}>
      {/* Background image with overlay */}
      {currentCompany?.hero_image_url ? (
        <>
          <img
            src={currentCompany.hero_image_url}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-black/60" aria-hidden="true" />
        </>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-[hsl(var(--secondary))]" aria-hidden="true">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
          <div className="absolute -left-4 bottom-0 h-20 w-20 rounded-full bg-white/[0.08]" />
        </div>
      )}

      <div className="relative z-10">
        <p className="text-white/70 text-sm font-medium">{greeting}</p>
        <h1 className="text-xl font-bold text-white mt-0.5">
          {user.first_name} {user.last_name}
        </h1>

        {/* Stats row */}
        <div className="flex gap-3 mt-4">
          <div className="flex items-center gap-2 rounded-lg bg-white/15 backdrop-blur-sm px-3 py-2 flex-1">
            <Flame className="h-4 w-4 text-orange-300" aria-hidden="true" />
            <div>
              <p className="text-[11px] text-white/70 leading-none">{t("app.safeDays")}</p>
              <p className="text-sm font-bold text-white mt-0.5">{safetyStreak}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-white/15 backdrop-blur-sm px-3 py-2 flex-1">
            <CheckCircle className="h-4 w-4 text-emerald-300" aria-hidden="true" />
            <div>
              <p className="text-[11px] text-white/70 leading-none">{t("app.thisWeek")}</p>
              <p className="text-sm font-bold text-white mt-0.5">{completedThisWeek} {t("app.tasks")}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ── Tip of the Day card ──
  const TipCard = () => {
    const TipIcon = todayTip.icon;
    return (
      <div className="mx-4 -mt-4 relative z-10">
        <div className="rounded-xl bg-card shadow-sm p-3.5 flex items-start gap-3">
          <TipIcon className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 tracking-widest">{t("app.tipOfTheDay")}</p>
            <p className="text-sm text-foreground mt-0.5 leading-snug">{todayTip.tip}</p>
          </div>
        </div>
      </div>
    );
  };

  // ── Quick Actions Grid (3 per row, 6 total, consistent neutral style) ──
  const QuickActionsGrid = () => (
    <div className="px-4 pt-5 pb-1">
      <p className="text-[11px] font-semibold text-muted-foreground mb-3">{t("app.getStarted")}</p>
      <div className="grid grid-cols-3 gap-2.5">
        {quickActions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="flex flex-col items-center gap-2 rounded-xl bg-muted/50 p-3.5 transition-all active:scale-95 hover:bg-muted"
          >
            <action.icon className="h-6 w-6 text-primary" aria-hidden="true" />
            <span className="text-[11px] font-medium text-center leading-tight text-foreground">{action.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );

  // ── Always show full feed (no early return for empty state) ──
  return (
    <div className="flex flex-col min-h-full">
      {/* ── Hero Section ── */}
      <HeroSection />

      {/* ── Tip of the Day ── */}
      <TipCard />

      {/* ── Quick Actions ── */}
      <QuickActionsGrid />

      {/* ── Content Feed ── */}
      <div className="px-4 pt-3 pb-4 space-y-1">

        {/* News & Updates — first */}
        <Section
          title={t("app.newsAndUpdates")}
          icon={Newspaper}
          iconColor="text-secondary"
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
                <FileText className="h-5 w-5 text-secondary shrink-0 mt-0.5" aria-hidden="true" />
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

        <div className="border-t" />

        {/* Pending Tasks — below news */}
        <Section
          title={t("app.pendingTasks")}
          icon={ClipboardCheck}
          iconColor="text-warning"
          action={
            pendingChecklists.length > 0 ? (
              <Link href={`/${company}/app/checklists`} className="text-xs text-primary font-medium flex items-center gap-0.5">
                {t("common.viewAll")} <ArrowRight className="h-3 w-3" />
              </Link>
            ) : undefined
          }
        >
          {pendingChecklists.length > 0 ? (
            pendingChecklists.map((checklist) => (
              <Link
                key={checklist.id}
                href={`/${company}/app/checklists/${checklist.id}`}
                className="flex items-center gap-3 rounded-lg border p-3 transition-colors active:bg-muted/50 hover:bg-muted/40"
              >
                <ClipboardCheck className="h-5 w-5 text-warning shrink-0" aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm leading-tight">{checklist.name}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{checklist.items?.length || 0} {t("app.items")}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
              </Link>
            ))
          ) : (
            <div className="py-4 text-center">
              <CheckCircle className="h-6 w-6 text-success/50 mx-auto" aria-hidden="true" />
              <p className="text-xs font-medium text-success mt-2">{t("app.allCaughtUp")}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{t("app.noPendingTasks")}</p>
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}
