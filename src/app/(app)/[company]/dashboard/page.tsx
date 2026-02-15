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
} from "lucide-react";
import { KPICard } from "@/components/ui/kpi-card";
import { FilterPanel, commonFilterOptions } from "@/components/ui/filter-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChartCard, AreaChart, BarChart, DonutChart, COLORS } from "@/components/charts";
import { useCompanyStore } from "@/stores/company-store";
import { useCompanyData } from "@/hooks/use-company-data";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "@/i18n";

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

export default function DashboardPage() {
  const company = useCompanyParam();
  const { t, formatDate, formatNumber } = useTranslation();
  const [dateRange, setDateRange] = React.useState("last_30_days");
  
  // Filter states
  const [locationFilter, setLocationFilter] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("");
  const [severityFilter, setSeverityFilter] = React.useState("");
  const [departmentFilter, setDepartmentFilter] = React.useState("");

  const { isSuperAdmin, hasSelectedCompany, switchCompany } = useAuth();
  const { items: allCompanies } = useCompanyStore();
  const { incidents, locations, users, assets: allAssets } = useCompanyData();

  // Ensure super admin respects the URL company slug (avoid platform overview when a tenant slug is present).
  React.useEffect(() => {
    if (!isSuperAdmin || !company || isPlatformSlug(company)) return;
    const match = allCompanies.find((c) => c.slug === company);
    if (match) {
      switchCompany(match.id);
    }
  }, [isSuperAdmin, company, allCompanies, switchCompany]);

  // For super admins hitting the generic dashboard route, never fall back to platform overview.
  // Instead, auto-select the first non-platform company (or any company) and show a lightweight loading state.
  React.useEffect(() => {
    if (!isSuperAdmin || hasSelectedCompany) return;
    if (!allCompanies.length) return;
    const fallback = allCompanies.find((c) => !isPlatformSlug(c.slug)) ?? allCompanies[0];
    if (fallback?.id) {
      switchCompany(fallback.id);
    }
  }, [isSuperAdmin, hasSelectedCompany, allCompanies, switchCompany]);

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
    ltir: incidents.length > 0 ? Math.round((openIncidents.length / Math.max(incidents.length, 1)) * 100) / 10 : 0,
    compliance_rate: incidents.length > 0 ? Math.round(((incidents.length - openIncidents.length) / Math.max(incidents.length, 1)) * 1000) / 10 : 100,
  };
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
    checkDate(asset.next_calibration_date, "Calibration");
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
      options: commonFilterOptions.incidentType,
      value: typeFilter,
      onChange: setTypeFilter,
    },
    {
      id: "severity",
      label: t("dashboard.allSeverities"),
      options: commonFilterOptions.severity,
      value: severityFilter,
      onChange: setSeverityFilter,
    },
    {
      id: "department",
      label: t("dashboard.allDepartments"),
      options: commonFilterOptions.department,
      value: departmentFilter,
      onChange: setDepartmentFilter,
    },
  ];

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
      
      return true;
    });
  }, [incidents, dateRangeFilter.start, dateRangeFilter.end, locationFilter, typeFilter, severityFilter]);

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

  // Update stats to use filtered data
  const filteredStats = {
    ...stats,
    open_incidents: filteredIncidents.filter((i) => i.status === "new" || i.status === "in_progress").length,
    total_incidents: filteredIncidents.length,
  };

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

  const recentFilteredIncidents = filteredIncidents.slice(0, 5);

  return (
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

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title={t("dashboard.openIncidents")}
          value={formatNumber(filteredStats.open_incidents)}
          icon={AlertTriangle}
          trend={{
            value: Math.abs(trendPercentage),
            direction: trendPercentage <= 0 ? "down" : "up",
            label: t("dashboard.fromLastMonth"),
          }}
        />
        <KPICard
          title={t("dashboard.totalIncidents")}
          value={formatNumber(filteredStats.total_incidents)}
          icon={Users}
          trend={{
            value: Math.abs(trendPercentage),
            direction: trendPercentage >= 0 ? "up" : "down",
            label: t("dashboard.fromLastMonth"),
          }}
        />
        <KPICard
          title="Upcoming expiries"
          value={formatNumber(expiryAlerts.length)}
          icon={Clock}
          trend={{
            value: expiryAlerts.filter(a => a.daysLeft <= 0).length,
            direction: "up",
            label: "overdue",
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

          {/* Recent Incidents */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-medium">{t("dashboard.recentIncidents")}</CardTitle>
              <Link href={company ? `/${company}/dashboard/incidents` : "#"}>
                <Button variant="ghost" size="sm" className="gap-1">
                  {t("common.viewAll")} <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentFilteredIncidents.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No incidents match the current filters</p>
                ) : recentFilteredIncidents.map((incident) => (
                  <Link
                    key={incident.id}
                    href={company ? `/${company}/dashboard/incidents/${incident.id}` : "#"}
                    className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">{incident.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {incident.reference_number} • {formatDate(incident.incident_date)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={incident.severity}>{incident.severity}</Badge>
                      <Badge
                        variant={
                          incident.status === "new"
                            ? "destructive"
                            : incident.status === "resolved"
                            ? "success"
                            : "secondary"
                        }
                      >
                        {incident.status.replace("_", " ")}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
