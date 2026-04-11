"use client";

import * as React from "react";
import Link from "next/link";
import { useCompanyParam } from "@/hooks/use-company-param";
import {
  AlertTriangle,
  Users,
  ClipboardCheck,
  TrendingUp,
  ArrowRight,
  Building2,
  Clock,
  ChevronRight,
  CheckCircle,
  Info,
} from "lucide-react";
import { KPICard } from "@/components/ui/kpi-card";
import { FilterPanel, useFilterOptions } from "@/components/ui/filter-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChartCard, AreaChart, BarChart, DonutChart, COLORS } from "@/components/charts";
import { OnboardingChecklist } from "@/components/onboarding/onboarding-checklist";
import { useCompanyStore } from "@/stores/company-store";
import { useCompanyData } from "@/hooks/use-company-data";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "@/i18n";
import { RoleGuard } from "@/components/auth/role-guard";
import { cn } from "@/lib/utils";

const PLATFORM_SLUGS =
  (process.env.NEXT_PUBLIC_PLATFORM_SLUGS || "platform,admin,superadmin")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
const isPlatformSlug = (slug?: string | null) =>
  !!slug &&
  (PLATFORM_SLUGS.includes(slug.toLowerCase()) || slug.toLowerCase().includes("platform"));

// Helper to get date N months ago
function getMonthsAgo(n: number): Date {
  const date = new Date();
  date.setMonth(date.getMonth() - n);
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date;
}

// Helper to get date range based on filter
function getDateRangeFilter(dateRange: string): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now);
  let start: Date;
  
  switch (dateRange) {
    case "today":
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case "last_7_days":
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "last_30_days":
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case "last_90_days":
      start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case "last_year":
      start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
  
  return { start, end };
}

// ── Dashboard Focus Strip ──
function DashboardFocusStrip({ tabs, company }: {
  tabs: { id: string; label: string; dot: string; items: { id: string; title: string; subtitle?: string; type?: string; href: string; time?: string }[] }[];
  company: string;
}) {
  const [activeTab, setActiveTab] = React.useState(tabs[0]?.id || "urgent");
  const active = tabs.find((t) => t.id === activeTab) || tabs[0];
  const totalItems = tabs.reduce((sum, t) => sum + t.items.length, 0);

  if (totalItems === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Focus Strip</CardTitle>
          <div className="flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                  activeTab === tab.id ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", tab.dot)} />
                {tab.label}
                {tab.items.length > 0 && <span className="text-[10px] opacity-60">({tab.items.length})</span>}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {active.items.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
            {activeTab === "urgent" ? <CheckCircle className="h-4 w-4" /> : activeTab === "upcoming" ? <Clock className="h-4 w-4" /> : <Info className="h-4 w-4" />}
            {activeTab === "urgent" ? "No urgent items" : activeTab === "upcoming" ? "Nothing upcoming" : "All clear"}
          </div>
        ) : (
          <div className="space-y-1">
            {active.items.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="flex items-center gap-3 rounded-lg px-3 py-3 hover:bg-muted/50 transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.title}</p>
                  {item.subtitle && <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.subtitle}</p>}
                </div>
                {item.type && (
                  <Badge variant="outline" className="text-[10px] shrink-0">{item.type}</Badge>
                )}
                {item.time && (
                  <span className={cn(
                    "shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full",
                    activeTab === "urgent" ? "text-red-500 bg-red-500/10" : "text-amber-500 bg-amber-500/10"
                  )}>{item.time}</span>
                )}
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40 group-hover:text-foreground transition-colors" />
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const company = useCompanyParam();
  const { t, formatDate, formatNumber } = useTranslation();
  const filterOptions = useFilterOptions();
  const [dateRange, setDateRange] = React.useState("last_30_days");
  
  // Filter states
  const [locationFilter, setLocationFilter] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("");
  const [severityFilter, setSeverityFilter] = React.useState("");
  const [departmentFilter, setDepartmentFilter] = React.useState("");

  const { isSuperAdmin, hasSelectedCompany, switchCompany, user } = useAuth();
  const { items: allCompanies } = useCompanyStore();
  const { incidents, locations, users, assets: allAssets, tickets, workOrders, correctiveActions, workerCertifications, trainingAssignments, complianceObligations, checklistSubmissions, checklistTemplates, stores } = useCompanyData();

  // Track platform entry state to avoid hydration mismatch
  const [isPlatformEntry, setIsPlatformEntry] = React.useState(false);
  React.useEffect(() => {
    setIsPlatformEntry(window.localStorage.getItem("harmoniq_platform_entry") === "true");
  }, []);

  // Ensure super admin respects the URL company slug (avoid platform overview when a tenant slug is present).
  // Skip this when in platform mode — let them browse without auto-selecting
  React.useEffect(() => {
    if (!isSuperAdmin || !company || isPlatformSlug(company) || isPlatformEntry) return;
    const match = allCompanies.find((c) => c.slug === company);
    if (match) {
      switchCompany(match.id);
    }
  }, [isSuperAdmin, company, allCompanies, switchCompany, isPlatformEntry]);

  // For super admins in regular mode (not platform), auto-select the first company
  React.useEffect(() => {
    if (!isSuperAdmin || hasSelectedCompany || isPlatformEntry) return;
    if (!allCompanies.length) return;
    const fallback = allCompanies.find((c) => !isPlatformSlug(c.slug)) ?? allCompanies[0];
    if (fallback?.id) {
      switchCompany(fallback.id);
    }
  }, [isSuperAdmin, hasSelectedCompany, allCompanies, switchCompany, isPlatformEntry]);

  // Apply filters to incidents
  const dateRangeFilter = getDateRangeFilter(dateRange);
  const filteredIncidents = React.useMemo(() => {
    return incidents.filter((inc) => {
      // Date filter
      const incDate = new Date(inc.incident_date);
      if (incDate < dateRangeFilter.start || incDate > dateRangeFilter.end) return false;
      
      // Location filter
      if (locationFilter && inc.location_id !== locationFilter) return false;
      
      // Type filter
      if (typeFilter && inc.type !== typeFilter) return false;
      
      // Severity filter
      if (severityFilter && inc.severity !== severityFilter) return false;
      
      // Department filter (field may not exist on all incidents)
      if (departmentFilter) {
        const dept = (inc as unknown as Record<string, unknown>).department;
        if (dept !== departmentFilter) return false;
      }
      
      return true;
    });
  }, [incidents, dateRangeFilter.start, dateRangeFilter.end, locationFilter, typeFilter, severityFilter, departmentFilter]);

  // Compute chart data from filtered incidents
  const incidentTrendData = React.useMemo(() => {
    const months: { [key: string]: number } = {};
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const d = getMonthsAgo(i);
      const key = monthNames[d.getMonth()];
      months[key] = 0;
    }
    
    // Count incidents per month
    filteredIncidents.forEach((inc) => {
      const d = new Date(inc.incident_date);
      const key = monthNames[d.getMonth()];
      if (key in months) {
        months[key]++;
      }
    });
    
    return Object.entries(months).map(([month, incidents]) => ({ month, incidents }));
  }, [filteredIncidents]);

  const incidentsByTypeData = React.useMemo(() => {
    const typeMap: { [key: string]: number } = {};
    const typeLabels: { [key: string]: string } = {
      injury: "Injury",
      near_miss: "Near Miss",
      hazard: "Hazard",
      property_damage: "Property",
      equipment_failure: "Equipment",
      environmental: "Environmental",
      fire: "Fire",
      security: "Security",
      spill: "Spill",
      other: "Other",
    };
    
    filteredIncidents.forEach((inc) => {
      const label = typeLabels[inc.type] || inc.type;
      typeMap[label] = (typeMap[label] || 0) + 1;
    });
    
    return Object.entries(typeMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5); // Top 5
  }, [filteredIncidents]);

  const incidentsBySeverityData = React.useMemo(() => {
    const severityMap: { [key: string]: number } = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };
    
    filteredIncidents.forEach((inc) => {
      if (inc.severity in severityMap) {
        severityMap[inc.severity]++;
      }
    });
    
    return [
      { name: "Low", count: severityMap.low },
      { name: "Medium", count: severityMap.medium },
      { name: "High", count: severityMap.high },
      { name: "Critical", count: severityMap.critical },
    ];
  }, [filteredIncidents]);

  // Compute trend (compare to previous period)
  const previousPeriodFilter = React.useMemo(() => {
    const duration = dateRangeFilter.end.getTime() - dateRangeFilter.start.getTime();
    return {
      start: new Date(dateRangeFilter.start.getTime() - duration),
      end: new Date(dateRangeFilter.start.getTime()),
    };
  }, [dateRangeFilter]);

  const previousPeriodIncidents = React.useMemo(() => {
    return incidents.filter((inc) => {
      const incDate = new Date(inc.incident_date);
      return incDate >= previousPeriodFilter.start && incDate < previousPeriodFilter.end;
    });
  }, [incidents, previousPeriodFilter]);

  const trendPercentage = React.useMemo(() => {
    const current = filteredIncidents.length;
    const previous = previousPeriodIncidents.length;
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  }, [filteredIncidents.length, previousPeriodIncidents.length]);


  if (isSuperAdmin && !hasSelectedCompany) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-sm text-muted-foreground">Selecting a company workspace…</div>
      </div>
    );
  }

  const openIncidents = incidents.filter((i) => i.status === "new" || i.status === "in_progress");
  const resolvedToday = incidents.filter((i) => {
    if (i.status !== "resolved" && i.status !== "archived") return false;
    const today = new Date().toISOString().slice(0, 10);
    return i.updated_at?.slice(0, 10) === today || i.resolved_at?.slice(0, 10) === today;
  });
  const avgResolutionHours = (() => {
    const resolved = incidents.filter(i => i.resolved_at && i.created_at);
    if (!resolved.length) return 0;
    const total = resolved.reduce((sum, i) => {
      return sum + (new Date(i.resolved_at!).getTime() - new Date(i.created_at).getTime()) / 3600000;
    }, 0);
    return Math.round(total / resolved.length);
  })();

  const stats = {
    open_incidents: openIncidents.length,
    total_incidents: incidents.length,
    resolved_today: resolvedToday.length,
    avg_resolution_time_hours: avgResolutionHours,
    compliance_rate: incidents.length > 0 ? Math.round(((incidents.length - openIncidents.length) / Math.max(incidents.length, 1)) * 1000) / 10 : 100,
  };

  // TRIR = (Total Recordable Incidents × 200,000) / Total Hours Worked
  // Using headcount × 2000 annual hours as proxy
  const headcount = Math.max(users.length, 1);
  const hoursWorked = headcount * 2000;
  const recordableIncidents = incidents.filter((i) => i.type === "injury" || i.severity === "critical" || i.severity === "high").length;
  const trir = hoursWorked > 0 ? Math.round((recordableIncidents * 200000 / hoursWorked) * 100) / 100 : 0;

  // LTIFR = (Lost Time Injuries × 1,000,000) / Total Hours Worked
  const lostTimeIncidents = incidents.filter((i) => i.lost_time === true);
  const totalLostDays = lostTimeIncidents.reduce((sum, i) => sum + (i.lost_time_amount || 0) + (i.lost_time_restricted_days || 0), 0);
  const ltifr = hoursWorked > 0 ? Math.round((lostTimeIncidents.length * 1000000 / hoursWorked) * 100) / 100 : 0;
  const recentIncidents = incidents.slice(0, 5);

  // Compute asset expiry alerts (warranty, calibration, maintenance)
  const now = new Date();
  const in30Days = new Date();
  in30Days.setDate(now.getDate() + 30);
  
  const expiryAlerts = allAssets.filter(a => a.status === "active").flatMap(asset => {
    const alerts: Array<{ asset_id: string; asset_name: string; type: string; date: string; daysLeft: number }> = [];
    const checkDate = (date: string | null, type: string) => {
      if (!date) return;
      const d = new Date(date);
      if (d <= in30Days) {
        alerts.push({ asset_id: asset.id, asset_name: asset.name, type, date, daysLeft: Math.ceil((d.getTime() - now.getTime()) / 86400000) });
      }
    };
    checkDate(asset.warranty_expiry, "Warranty");
    checkDate(asset.next_maintenance_date, "Maintenance");
    return alerts;
  }).sort((a, b) => a.daysLeft - b.daysLeft).slice(0, 5);

  const locationOptions = locations.map((loc) => ({
    value: loc.id,
    label: loc.name,
  }));

  const filters = [
    {
      id: "location",
      label: t("dashboard.allLocations"),
      options: locationOptions,
      value: locationFilter,
      onChange: setLocationFilter,
    },
    {
      id: "type",
      label: t("dashboard.allTypes"),
      options: filterOptions.incidentType,
      value: typeFilter,
      onChange: setTypeFilter,
    },
    {
      id: "severity",
      label: t("dashboard.allSeverities"),
      options: filterOptions.severity,
      value: severityFilter,
      onChange: setSeverityFilter,
    },
    {
      id: "department",
      label: t("dashboard.allDepartments"),
      options: filterOptions.department,
      value: departmentFilter,
      onChange: setDepartmentFilter,
    },
  ];

  // Update stats to use filtered data
  const filteredStats = {
    ...stats,
    open_incidents: filteredIncidents.filter((i) => i.status === "new" || i.status === "in_progress").length,
    total_incidents: filteredIncidents.length,
  };

  const recentFilteredIncidents = filteredIncidents.slice(0, 5);

  // ── Focus Strip data ──
  const focusNow = new Date();
  const focus7Days = new Date(focusNow.getTime() + 7 * 24 * 60 * 60 * 1000);
  const isManager = ["company_admin", "manager", "super_admin"].includes(user?.role || "");
  const isDirector = user?.role === "viewer";

  type FocusStripItem = { id: string; title: string; subtitle?: string; type?: string; href: string; time?: string };
  const focusUrgent: FocusStripItem[] = [];
  const focusUpcoming: FocusStripItem[] = [];
  const focusGoodToKnow: FocusStripItem[] = [];

  const daysOverdue = (date: string) => {
    const d = Math.floor((focusNow.getTime() - new Date(date).getTime()) / 86400000);
    return d === 0 ? "Today" : `${d}d overdue`;
  };
  const daysUntil = (date: string) => {
    const d = Math.ceil((new Date(date).getTime() - focusNow.getTime()) / 86400000);
    return d === 0 ? "Today" : d === 1 ? "Tomorrow" : `In ${d}d`;
  };

  // Manager sees: all critical incidents, overdue items across the board
  if (isManager) {
    incidents.filter((i) => (i.severity === "critical" || i.severity === "high") && i.status !== "resolved" && i.status !== "archived")
      .slice(0, 3).forEach((i) => {
        const loc = locations.find((l) => l.id === i.location_id);
        focusUrgent.push({ id: `inc-${i.id}`, title: i.title, subtitle: `${i.reference_number || ""} · ${loc?.name || i.building || "Unknown location"}`, type: i.severity, href: `/${company}/dashboard/incidents/${i.id}`, time: daysOverdue(i.incident_date) });
      });
    tickets.filter((t_) => t_.status !== "resolved" && t_.status !== "closed" && t_.due_date && new Date(t_.due_date) < focusNow)
      .slice(0, 3).forEach((t_) => focusUrgent.push({ id: `tk-${t_.id}`, title: t_.title, subtitle: `Ticket · ${t_.priority} priority`, type: "Ticket", href: `/${company}/dashboard/tickets/${t_.id}`, time: daysOverdue(t_.due_date!) }));
    workOrders.filter((w) => w.status !== "completed" && w.status !== "cancelled" && w.due_date && new Date(w.due_date) < focusNow)
      .slice(0, 3).forEach((w) => focusUrgent.push({ id: `wo-${w.id}`, title: w.title, subtitle: `Work order · ${w.type.replace(/_/g, " ")}`, type: "WO", href: `/${company}/dashboard/work-orders/${w.id}`, time: daysOverdue(w.due_date!) }));
    correctiveActions.filter((c) => c.status !== "completed" && c.due_date && new Date(c.due_date) < focusNow)
      .slice(0, 2).forEach((c) => focusUrgent.push({ id: `ca-${c.id}`, title: c.description?.slice(0, 60) || "Corrective action", subtitle: `${c.severity} severity`, type: "Action", href: `/${company}/dashboard/corrective-actions/${c.id}`, time: daysOverdue(c.due_date!) }));

    // Upcoming
    tickets.filter((t_) => t_.status !== "resolved" && t_.status !== "closed" && t_.due_date && new Date(t_.due_date) >= focusNow && new Date(t_.due_date) <= focus7Days)
      .slice(0, 3).forEach((t_) => focusUpcoming.push({ id: `tk-${t_.id}`, title: t_.title, subtitle: `Ticket · ${t_.priority} priority`, type: "Ticket", href: `/${company}/dashboard/tickets/${t_.id}`, time: daysUntil(t_.due_date!) }));
    workOrders.filter((w) => w.status !== "completed" && w.status !== "cancelled" && w.due_date && new Date(w.due_date) >= focusNow && new Date(w.due_date) <= focus7Days)
      .slice(0, 3).forEach((w) => focusUpcoming.push({ id: `wo-${w.id}`, title: w.title, subtitle: `Work order · ${w.type.replace(/_/g, " ")}`, type: "WO", href: `/${company}/dashboard/work-orders/${w.id}`, time: daysUntil(w.due_date!) }));
  }

  // Director sees: high-level status items
  if (isDirector) {
    incidents.filter((i) => i.severity === "critical" && i.status !== "resolved" && i.status !== "archived")
      .slice(0, 3).forEach((i) => {
        const loc = locations.find((l) => l.id === i.location_id);
        focusUrgent.push({ id: `inc-${i.id}`, title: i.title, subtitle: `${i.reference_number || ""} · ${loc?.name || ""}`, type: i.severity, href: `/${company}/dashboard/incidents/${i.id}`, time: daysOverdue(i.incident_date) });
      });
  }

  // Good to Know for both
  const weekAgo = new Date(focusNow.getTime() - 7 * 86400000);
  const resolvedThisWeek = incidents.filter((i) => i.status === "resolved" && i.resolved_at && new Date(i.resolved_at) > weekAgo).length;
  if (resolvedThisWeek > 0) focusGoodToKnow.push({ id: "resolved-week", title: `${resolvedThisWeek} incidents resolved this week`, subtitle: "Team is making progress", href: `/${company}/dashboard/incidents` });
  if (expiryAlerts.length === 0) focusGoodToKnow.push({ id: "no-expiry", title: "No upcoming asset expiries", subtitle: "All assets within compliance window", href: `/${company}/dashboard/assets` });

  // Training: expired certifications → urgent
  const expiredCerts = workerCertifications.filter((c) => c.expiry_date && new Date(c.expiry_date) < focusNow && c.status !== "revoked");
  expiredCerts.slice(0, 3).forEach((c) => {
    const worker = users.find((u) => u.id === c.user_id);
    focusUrgent.push({ id: `cert-${c.id}`, title: `${worker?.full_name || "Worker"} — expired certification`, subtitle: c.issuer || "", type: "Training", href: `/${company}/dashboard/training`, time: daysOverdue(c.expiry_date!) });
  });

  // Training: expiring certs within 30 days → upcoming
  const thirtyDays = new Date(focusNow.getTime() + 30 * 86400000);
  const expiringCerts = workerCertifications.filter((c) => c.expiry_date && new Date(c.expiry_date) >= focusNow && new Date(c.expiry_date) <= thirtyDays);
  expiringCerts.slice(0, 3).forEach((c) => {
    const worker = users.find((u) => u.id === c.user_id);
    focusUpcoming.push({ id: `cert-${c.id}`, title: `${worker?.full_name || "Worker"} — cert expiring`, subtitle: c.issuer || "", type: "Training", href: `/${company}/dashboard/training`, time: daysUntil(c.expiry_date!) });
  });

  // Training: overdue assignments → urgent
  trainingAssignments.filter((a) => a.status !== "completed" && new Date(a.due_date) < focusNow)
    .slice(0, 2).forEach((a) => {
      const worker = users.find((u) => u.id === a.user_id);
      focusUrgent.push({ id: `ta-${a.id}`, title: `${worker?.full_name || "Worker"} — overdue training`, subtitle: a.course_name, type: "Training", href: `/${company}/dashboard/training`, time: daysOverdue(a.due_date) });
    });

  // Compliance: overdue obligations → urgent
  const allObligations = complianceObligations;
  allObligations.filter((o) => o.is_active && o.next_due_date && new Date(o.next_due_date) < focusNow && o.status !== "compliant")
    .slice(0, 3).forEach((o) => {
      focusUrgent.push({ id: `co-${o.id}`, title: o.title, subtitle: o.regulation, type: "Compliance", href: `/${company}/dashboard/compliance`, time: daysOverdue(o.next_due_date) });
    });

  // Compliance: due soon → upcoming
  allObligations.filter((o) => o.is_active && o.next_due_date && new Date(o.next_due_date) >= focusNow && new Date(o.next_due_date) <= focus7Days)
    .slice(0, 3).forEach((o) => {
      focusUpcoming.push({ id: `co-${o.id}`, title: o.title, subtitle: o.regulation, type: "Compliance", href: `/${company}/dashboard/compliance`, time: daysUntil(o.next_due_date) });
    });

  // Checklist: failed items without linked work orders → upcoming suggestions
  if (isManager) {
    const recentSubmissions = checklistSubmissions
      .filter((s) => s.status === "submitted" && new Date(s.created_at) > weekAgo);

    for (const sub of recentSubmissions) {
      const failedItems = sub.responses.filter((r) => r.value === false);
      if (failedItems.length === 0) continue;

      const template = checklistTemplates.find((t) => t.id === sub.template_id);
      const templateName = template?.name || "Checklist";

      // Check if a work order already exists for this submission
      const hasLinkedWO = workOrders.some((wo) => wo.checklist_submission_id === sub.id);
      if (hasLinkedWO) continue;

      focusUpcoming.push({
        id: `cl-fail-${sub.id}`,
        title: `${failedItems.length} failed item${failedItems.length > 1 ? "s" : ""} in ${templateName}`,
        subtitle: "Create work order?",
        type: "Inspection",
        href: `/${company}/dashboard/checklists/${sub.template_id}`,
        time: daysOverdue(sub.created_at),
      });
    }
  }

  // Lost time: remind managers to update incidents without return dates
  if (isManager) {
    const sevenDaysAgo = new Date(focusNow.getTime() - 7 * 86400000);
    incidents.filter((i) => i.lost_time && !i.lost_time_return_date && new Date(i.incident_date) < sevenDaysAgo && i.status !== "resolved" && i.status !== "archived")
      .slice(0, 2).forEach((i) => {
        focusUpcoming.push({ id: `lt-${i.id}`, title: `Update lost time: ${i.title}`, subtitle: "Return date not recorded", type: "Lost Time", href: `/${company}/dashboard/incidents/${i.id}`, time: daysOverdue(i.incident_date) });
      });
  }

  const focusTabs = [
    { id: "urgent" as const, label: "Urgent", dot: "bg-red-500", items: focusUrgent },
    { id: "upcoming" as const, label: "Upcoming", dot: "bg-amber-500", items: focusUpcoming },
    { id: "good_to_know" as const, label: "Good to Know", dot: "bg-blue-500", items: focusGoodToKnow },
  ];

  return (
    <RoleGuard allowedRoles={["manager", "company_admin", "super_admin", "viewer"]}>
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">{t("nav.dashboard")}</h1>
        <div className="flex gap-2 sm:ml-auto">
          <FilterPanel
            filters={filters}
            dateRange={dateRange}
            onDateRangeChange={(value) => setDateRange(value)}
            showDateRange={true}
          />
        </div>
      </div>

      {/* Onboarding Checklist */}
      <OnboardingChecklist />

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title={t("nav.incidents")}
          value={`${formatNumber(filteredStats.open_incidents)} open`}
          icon={AlertTriangle}
          trend={{
            value: filteredStats.total_incidents,
            direction: trendPercentage <= 0 ? "down" : "up",
            label: `of ${filteredStats.total_incidents} total`,
          }}
        />
        <KPICard
          title="TRIR"
          value={String(trir)}
          icon={TrendingUp}
          trend={{
            value: recordableIncidents,
            direction: trir > 2 ? "up" : "down",
            label: `${recordableIncidents} recordable`,
          }}
        />
        <KPICard
          title="LTIFR"
          value={String(ltifr)}
          icon={Clock}
          trend={{
            value: totalLostDays,
            direction: ltifr > 0 ? "up" : "down",
            label: `${totalLostDays} lost days`,
          }}
        />
        <KPICard
          title={t("dashboard.avgResolutionTime")}
          value={`${stats.avg_resolution_time_hours}h`}
          icon={TrendingUp}
          trend={{
            value: 0,
            direction: "down",
            label: t("dashboard.fromLastMonth"),
          }}
        />
      </div>

      {/* Content with transition */}
      <div className="space-y-6 transition-all duration-300 ease-in-out">
        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-3">
          <ChartCard title={t("dashboard.incidentTrend")} description={t("dashboard.last6Months")} className="lg:col-span-2">
            <AreaChart
              data={incidentTrendData}
              dataKey="incidents"
              xAxisKey="month"
              height={280}
              color={COLORS.primary}
            />
          </ChartCard>

          <ChartCard title={t("dashboard.byType")} description={t("dashboard.distribution")}>
            <DonutChart data={incidentsByTypeData} height={280} />
          </ChartCard>
        </div>

        {/* Second Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* By Severity */}
          <ChartCard title={t("dashboard.bySeverity")} description={t("dashboard.incidentBreakdown")}>
            <BarChart
              data={incidentsBySeverityData}
              dataKey="count"
              xAxisKey="name"
              height={250}
              color={COLORS.primary}
            />
          </ChartCard>

          {/* Focus Strip — replaces Recent Incidents */}
          {(isManager || isDirector) && (
            <DashboardFocusStrip tabs={focusTabs} company={company} />
          )}
        </div>
      </div>
    </div>
    </RoleGuard>
  );
}
