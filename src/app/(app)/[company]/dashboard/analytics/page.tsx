"use client";

import * as React from "react";
import {
  AlertTriangle,
  Users,
  Clock,
  Target,
  Download,
  ShieldAlert,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KPICard } from "@/components/ui/kpi-card";
import { FilterPanel, useFilterOptions } from "@/components/ui/filter-panel";
import { ChartCard, AreaChart, DonutChart, LineChart, COLORS } from "@/components/charts";
import { RoleGuard } from "@/components/auth/role-guard";
import { useCompanyData } from "@/hooks/use-company-data";
import { useAuth } from "@/hooks/use-auth";
import { LoadingPage } from "@/components/ui/loading";
import { downloadCsv } from "@/lib/csv";
import { capitalize } from "@/lib/utils";
import { getDateRangeFromValue, isWithinDateRange, DateRangeValue } from "@/lib/date-utils";
import { useTranslation } from "@/i18n";

export default function AnalyticsPage() {
  const { t, formatDate } = useTranslation();
  const filterOptions = useFilterOptions();

  const formatMonthLabel = React.useCallback(
    (date: Date, includeYear: boolean): string => {
      const month = formatDate(date, { month: "short" });
      if (includeYear) {
        return `${month} '${String(date.getFullYear()).slice(2)}`;
      }
      return month;
    },
    [formatDate]
  );

  const [dateRange, setDateRange] = React.useState("last_6_months");
  const [hoursOverride, setHoursOverride] = React.useState<string>("");
  
  // Filter states
  const [locationFilter, setLocationFilter] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("");
  const [severityFilter, setSeverityFilter] = React.useState("");

  const { incidents, locations, stores } = useCompanyData();
  const { currentCompany, hasPermission } = useAuth();
  const canExport = hasPermission("reports.export");
  const { isLoading } = stores.incidents;

  const filteredIncidents = React.useMemo(
    () =>
      incidents.filter((incident) => {
        const matchesLocation = !locationFilter || incident.location_id === locationFilter;
        const matchesType = !typeFilter || incident.type === typeFilter;
        const matchesSeverity = !severityFilter || incident.severity === severityFilter;
        const matchesDate = isWithinDateRange(incident.incident_date, dateRange as DateRangeValue);
        return matchesLocation && matchesType && matchesSeverity && matchesDate;
      }),
    [incidents, locationFilter, typeFilter, severityFilter, dateRange]
  );

  const locationOptions = React.useMemo(
    () => locations.map((loc) => ({ value: loc.id, label: loc.name })),
    [locations]
  );

  // Build months array. For "all_time", cap to earliest incident date instead of epoch
  const { months, spansMultipleYears } = React.useMemo(() => {
    const range = getDateRangeFromValue(dateRange as DateRangeValue);
    let effectiveStart = range.start;

    // For "all_time", use the earliest incident date (not epoch) to avoid thousands of empty rows
    if (dateRange === "all_time" && filteredIncidents.length > 0) {
      const earliestDate = filteredIncidents.reduce((earliest, inc) => {
        const d = new Date(inc.incident_date);
        return d < earliest ? d : earliest;
      }, new Date());
      effectiveStart = earliestDate;
    } else if (dateRange === "all_time") {
      // No incidents, show last 12 months
      effectiveStart = new Date();
      effectiveStart.setMonth(effectiveStart.getMonth() - 12);
    }

    const monthCursor = new Date(effectiveStart.getFullYear(), effectiveStart.getMonth(), 1);
    const endMonth = new Date(range.end.getFullYear(), range.end.getMonth(), 1);
    const result: Date[] = [];
    while (monthCursor <= endMonth) {
      result.push(new Date(monthCursor));
      monthCursor.setMonth(monthCursor.getMonth() + 1);
    }

    const spans = result.length > 12 ||
      (result.length > 0 && result[0].getFullYear() !== result[result.length - 1].getFullYear());

    return { months: result, spansMultipleYears: spans };
  }, [dateRange, filteredIncidents]);

  const incidentStatsByMonth = React.useMemo(
    () =>
      filteredIncidents.reduce<
        Record<string, { incidents: number; resolved: number; resolutionHours: number; resolutionCount: number }>
      >((acc, incident) => {
        const incidentDate = new Date(incident.incident_date);
        const key = `${incidentDate.getFullYear()}-${incidentDate.getMonth()}`;
        if (!acc[key]) {
          acc[key] = { incidents: 0, resolved: 0, resolutionHours: 0, resolutionCount: 0 };
        }
        acc[key].incidents += 1;
        if (incident.status === "resolved" && incident.resolved_at) {
          acc[key].resolved += 1;
          const resolvedAt = new Date(incident.resolved_at).getTime();
          const createdAt = new Date(incident.created_at).getTime();
          acc[key].resolutionHours += Math.max(0, (resolvedAt - createdAt) / 36e5);
          acc[key].resolutionCount += 1;
        }
        return acc;
      }, {}),
    [filteredIncidents]
  );

  const incidentTrendData = React.useMemo(
    () =>
      months.map((month) => {
        const key = `${month.getFullYear()}-${month.getMonth()}`;
        const stats = incidentStatsByMonth[key];
        return {
          month: formatMonthLabel(month, spansMultipleYears),
          monthKey: key,
          incidents: stats?.incidents || 0,
          resolved: stats?.resolved || 0,
        };
      }),
    [months, incidentStatsByMonth, spansMultipleYears, formatMonthLabel]
  );

  const resolutionTimeData = React.useMemo(
    () =>
      months.map((month) => {
        const key = `${month.getFullYear()}-${month.getMonth()}`;
        const stats = incidentStatsByMonth[key];
        const avgHours = stats?.resolutionCount
          ? Math.round(stats.resolutionHours / stats.resolutionCount)
          : 0;
        return {
          month: formatMonthLabel(month, spansMultipleYears),
          monthKey: key,
          hours: avgHours,
        };
      }),
    [months, incidentStatsByMonth, spansMultipleYears, formatMonthLabel]
  );

  const complianceData = React.useMemo(
    () =>
      months.map((month) => {
        const key = `${month.getFullYear()}-${month.getMonth()}`;
        const stats = incidentStatsByMonth[key];
        const rate = stats?.incidents ? Math.round((stats.resolved / stats.incidents) * 100) : 0;
        return {
          month: formatMonthLabel(month, spansMultipleYears),
          monthKey: key,
          rate,
        };
      }),
    [months, incidentStatsByMonth, spansMultipleYears, formatMonthLabel]
  );

  const incidentsByTypeData = React.useMemo(
    () =>
      Object.entries(
        filteredIncidents.reduce<Record<string, number>>((acc, incident) => {
          const label = incident.type.split("_").map((part) => capitalize(part)).join(" ");
          acc[label] = (acc[label] || 0) + 1;
          return acc;
        }, {})
      ).map(([name, value]) => ({ name, value })),
    [filteredIncidents]
  );

  const kpis = React.useMemo(() => {
    const totalIncidents = filteredIncidents.length;
    const lostTimeIncidents = filteredIncidents.filter((inc) => inc.lost_time).length;
    const totalLostDays = filteredIncidents
      .filter((inc) => inc.lost_time && inc.lost_time_amount)
      .reduce((acc, inc) => acc + (inc.lost_time_amount || 0), 0);

    const resolvedIncidents = filteredIncidents.filter(
      (inc) => inc.status === "resolved" && inc.resolved_at
    );
    const resolutionHoursTotal = resolvedIncidents.reduce((acc, inc) => {
      const resolvedAt = inc.resolved_at ? new Date(inc.resolved_at).getTime() : 0;
      const createdAt = new Date(inc.created_at).getTime();
      return acc + Math.max(0, (resolvedAt - createdAt) / 36e5);
    }, 0);
    const avgResolutionHours = resolvedIncidents.length
      ? Math.round(resolutionHoursTotal / resolvedIncidents.length)
      : 0;

    // Calculate total hours worked for the selected period
    const totalEmployees = currentCompany?.total_employees || 0;
    const avgHoursPerWeek = currentCompany?.average_hours_per_week || 40;
    const dateRangeResult = getDateRangeFromValue(dateRange as DateRangeValue);
    const rangeStart = dateRangeResult.start;
    const rangeEnd = dateRangeResult.end;
    let weeksInPeriod: number;
    if (rangeStart && rangeEnd) {
      weeksInPeriod = Math.max(1, Math.round((rangeEnd.getTime() - rangeStart.getTime()) / (7 * 24 * 36e5)));
    } else if (filteredIncidents.length > 0) {
      const earliest = Math.min(...filteredIncidents.map((inc) => new Date(inc.incident_date).getTime()));
      weeksInPeriod = Math.max(1, Math.round((Date.now() - earliest) / (7 * 24 * 36e5)));
    } else {
      weeksInPeriod = 52;
    }
    const autoHoursWorked = totalEmployees * avgHoursPerWeek * weeksInPeriod;
    const totalHoursWorked = hoursOverride ? Number(hoursOverride) : autoHoursWorked;

    // Country-aware multiplier: US = 200k (OSHA), international = 1M (LTIFR)
    const isUS = currentCompany?.country === "US";
    const multiplier = isUS ? 200_000 : 1_000_000;
    const rateLabel = isUS ? "per 200k hrs" : "per 1M hrs";

    // LTIR/LTIFR: (Lost Time Incidents × multiplier) / Total Hours Worked
    const ltir = totalHoursWorked > 0
      ? ((lostTimeIncidents * multiplier) / totalHoursWorked).toFixed(2)
      : "—";

    // TRIR: (All Recordable Incidents × multiplier) / Total Hours Worked
    const trir = totalHoursWorked > 0
      ? ((totalIncidents * multiplier) / totalHoursWorked).toFixed(2)
      : "—";

    // Severity Rate: (Lost Days × multiplier) / Total Hours Worked
    const severityRate = totalHoursWorked > 0
      ? ((totalLostDays * multiplier) / totalHoursWorked).toFixed(2)
      : "—";

    // DART cases = incidents with days away OR restricted/transferred duty
    const dartCases = filteredIncidents.filter((inc) =>
      inc.lost_time || (inc.lost_time_restricted_days && inc.lost_time_restricted_days > 0)
    ).length;

    // DART Rate: (DART cases × multiplier) / Total Hours Worked
    const dart = totalHoursWorked > 0
      ? ((dartCases * multiplier) / totalHoursWorked).toFixed(2)
      : "—";

    const complianceRate = totalIncidents
      ? Math.round((resolvedIncidents.length / totalIncidents) * 100)
      : 0;

    return {
      totalIncidents,
      lostTimeIncidents,
      totalLostDays,
      avgResolutionHours,
      ltir,
      trir,
      severityRate,
      dart,
      dartCases,
      complianceRate,
      totalHoursWorked,
      totalEmployees,
      avgHoursPerWeek,
      rateLabel,
      isConfigured: totalEmployees > 0,
    };
  }, [filteredIncidents, locations.length, currentCompany, dateRange, hoursOverride]);

  const filters = [
    {
      id: "location",
      label: "All locations",
      options: locationOptions,
      value: locationFilter,
      onChange: setLocationFilter,
    },
    {
      id: "type",
      label: "All types",
      options: filterOptions.incidentType,
      value: typeFilter,
      onChange: setTypeFilter,
    },
    {
      id: "severity",
      label: "All severities",
      options: filterOptions.severity,
      value: severityFilter,
      onChange: setSeverityFilter,
    },
  ];

  if (isLoading && incidents.length === 0) {
    return <LoadingPage />;
  }

  return (
    <RoleGuard allowedRoles={["super_admin", "company_admin", "manager"]}>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold truncate">{t("analytics.title")}</h1>
        <div className="flex gap-2 sm:ml-auto">
          <FilterPanel
            filters={filters}
            dateRange={dateRange}
            onDateRangeChange={(value) => setDateRange(value)}
            showDateRange={true}
          >
            {canExport && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={async () => {
                try {
                  const { AnalyticsReportPDF, downloadPDF } = await import("@/lib/pdf-export");
                  const doc = <AnalyticsReportPDF
                    companyName={currentCompany?.name || "Company"}
                    dateRange={dateRange}
                    kpis={{
                      ltir: kpis.ltir,
                      trir: kpis.trir,
                      severityRate: kpis.severityRate,
                      avgResolutionHours: kpis.avgResolutionHours,
                      complianceRate: kpis.complianceRate,
                      totalIncidents: kpis.totalIncidents,
                      lostTimeIncidents: kpis.lostTimeIncidents,
                      totalLostDays: kpis.totalLostDays,
                      totalHoursWorked: Math.round(kpis.totalHoursWorked),
                      rateLabel: kpis.rateLabel,
                    }}
                    incidents={filteredIncidents.map((inc) => ({
                      reference: inc.reference_number,
                      title: inc.title,
                      type: inc.type,
                      severity: inc.severity,
                      status: inc.status,
                      date: inc.incident_date,
                      lostTime: inc.lost_time,
                      lostHours: inc.lost_time_amount || 0,
                      location: locations.find((l) => l.id === inc.location_id)?.name || "Unassigned",
                    }))}
                    incidentsByType={incidentsByTypeData}
                  />;
                  await downloadPDF(doc, `safety-analytics-${dateRange}-${new Date().toISOString().split("T")[0]}.pdf`);
                } catch {
                  // silently fail
                }
              }}
            >
              <Download className="h-4 w-4" />
              Export PDF
            </Button>
            )}
          </FilterPanel>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <KPICard
          title="LTIR / LTIFR"
          value={kpis.ltir}
          subtitle={kpis.isConfigured ? kpis.rateLabel : "Set workforce in Settings"}
          tooltip="Lost Time Injury Frequency Rate — measures how many incidents caused workers to miss time, normalized per hours worked. Formula: (Lost Time Incidents × 200,000 or 1,000,000) ÷ Total Hours Worked. A lower number is better. Industry benchmarks vary: manufacturing typically targets below 3.0, construction below 5.0."
          icon={Target}
        />
        <KPICard
          title="TRIR"
          value={kpis.trir}
          subtitle={kpis.isConfigured ? kpis.rateLabel : "Set workforce in Settings"}
          tooltip="Total Recordable Incident Rate — counts ALL recordable safety incidents (not just lost time), normalized per hours worked. Formula: (Total Incidents × 200,000 or 1,000,000) ÷ Total Hours Worked. This is OSHA's primary benchmark. A lower number is better."
          icon={AlertTriangle}
        />
        <KPICard
          title="Severity Rate"
          value={kpis.severityRate}
          subtitle={kpis.totalLostDays > 0 ? `${kpis.totalLostDays} lost day(s)` : "No lost days"}
          tooltip="Measures the seriousness of incidents by tracking total lost working days, normalized per hours worked. Formula: (Total Lost Days × 200,000 or 1,000,000) ÷ Total Hours Worked. A high severity rate with low LTIR means fewer but more serious incidents."
          icon={ShieldAlert}
        />
        <KPICard
          title="DART"
          value={kpis.dart}
          subtitle={kpis.isConfigured ? kpis.rateLabel : "Set workforce in Settings"}
          tooltip="Days Away, Restricted, or Transferred rate (OSHA). Counts incidents where workers missed work OR were placed on restricted duty. Formula: (DART cases × multiplier) ÷ Total Hours Worked."
          icon={Target}
        />
        <KPICard
          title={t("analytics.metrics.avgResolution")}
          value={kpis.avgResolutionHours ? `${kpis.avgResolutionHours}h` : "—"}
          tooltip="Average time from when an incident is reported to when it is marked as resolved. Shorter resolution times indicate a more responsive safety management system. Target: under 48 hours for most incidents."
          icon={Clock}
        />
        <KPICard
          title={t("analytics.metrics.complianceRate")}
          value={`${kpis.complianceRate}%`}
          tooltip="Percentage of reported incidents that have been resolved. Measures how effectively your team closes out safety issues. Target: above 90% for the selected time period."
          icon={Users}
        />
      </div>

      {/* Hours Worked Configuration */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">Total Hours Worked (period)</p>
              <p className="text-xs text-muted-foreground">
                {kpis.isConfigured
                  ? `Auto: ${kpis.totalEmployees} employees × ${kpis.avgHoursPerWeek}h/week × period = ${Math.round(kpis.totalHoursWorked).toLocaleString()}h`
                  : "Set employee count and average hours in Company Settings to auto-calculate."}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="hours-override" className="text-xs text-muted-foreground whitespace-nowrap">
                Override:
              </Label>
              <Input
                id="hours-override"
                type="number"
                min="0"
                placeholder={kpis.totalHoursWorked > 0 ? String(Math.round(kpis.totalHoursWorked)) : "Enter hours"}
                value={hoursOverride}
                onChange={(e) => setHoursOverride(e.target.value)}
                className="w-40 h-8 text-sm"
              />
              {hoursOverride && (
                <button
                  type="button"
                  onClick={() => setHoursOverride("")}
                  className="text-xs text-muted-foreground hover:text-foreground underline"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts Row 1 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title={t("analytics.charts.incidentTrend")} description="Monthly incidents reported vs resolved">
          <AreaChart
            data={incidentTrendData}
            dataKey="incidents"
            xAxisKey="month"
            height={280}
            color={COLORS.primary}
          />
        </ChartCard>

        <ChartCard title={t("analytics.charts.resolutionTimeTrend")} description="Average hours to resolve incidents">
          <LineChart
            data={resolutionTimeData}
            dataKey="hours"
            xAxisKey="month"
            height={280}
            color={COLORS.secondary}
          />
        </ChartCard>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title={t("analytics.charts.incidentsByType")} description="Distribution by category">
          <DonutChart data={incidentsByTypeData} height={280} />
        </ChartCard>

        <ChartCard title={t("analytics.charts.complianceTrend")} description="Safety compliance rate over time">
          <AreaChart
            data={complianceData}
            dataKey="rate"
            xAxisKey="month"
            height={280}
            color={COLORS.success}
          />
        </ChartCard>
      </div>

      {/* Summary Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("analytics.table.monthlySummary")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-3 text-left font-medium">{t("analytics.table.month")}</th>
                  <th className="py-3 text-left font-medium">{t("analytics.table.incidents")}</th>
                  <th className="py-3 text-left font-medium">{t("analytics.table.resolved")}</th>
                  <th className="py-3 text-left font-medium">{t("analytics.table.avgTime")}</th>
                  <th className="py-3 text-left font-medium">{t("analytics.table.compliance")}</th>
                  <th className="py-3 text-left font-medium">{t("analytics.table.status")}</th>
                </tr>
              </thead>
              <tbody>
                {incidentTrendData
                  .filter((row) => row.incidents > 0 || row.resolved > 0)
                  .reverse()
                  .map((row, i, filtered) => {
                    const resIdx = incidentTrendData.findIndex((r) => r.monthKey === row.monthKey);
                    return (
                      <tr key={row.monthKey} className="border-b last:border-0">
                        <td className="py-3 font-medium">{row.month}</td>
                        <td className="py-3">{row.incidents}</td>
                        <td className="py-3">{row.resolved}</td>
                        <td className="py-3">{resolutionTimeData[resIdx]?.hours || 0}h</td>
                        <td className="py-3">{complianceData[resIdx]?.rate || 0}%</td>
                        <td className="py-3">
                          <Badge variant={row.resolved >= row.incidents ? "success" : "warning"}>
                            {row.resolved >= row.incidents ? t("analytics.table.onTrack") : t("analytics.table.behind")}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                {incidentTrendData.every((row) => row.incidents === 0 && row.resolved === 0) && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                      No incident data for the selected period
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
    </RoleGuard>
  );
}
