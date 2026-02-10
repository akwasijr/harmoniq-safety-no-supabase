"use client";

import * as React from "react";
import {
  AlertTriangle,
  Users,
  Clock,
  Target,
  Download,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { KPICard } from "@/components/ui/kpi-card";
import { FilterPanel, commonFilterOptions } from "@/components/ui/filter-panel";
import { ChartCard, AreaChart, DonutChart, LineChart, COLORS } from "@/components/charts";
import { RoleGuard } from "@/components/auth/role-guard";
import { useIncidentsStore } from "@/stores/incidents-store";
import { useLocationsStore } from "@/stores/locations-store";
import { downloadCsv } from "@/lib/csv";
import { capitalize } from "@/lib/utils";
import { getDateRangeFromValue, isWithinDateRange, DateRangeValue } from "@/lib/date-utils";
import { useTranslation } from "@/i18n";

/**
 * Format a Date into a month label.
 * - If the range spans more than 12 months, include the year: "Jan '24"
 * - Otherwise just "Jan"
 */
function formatMonthLabel(date: Date, includeYear: boolean): string {
  const month = date.toLocaleString("default", { month: "short" });
  if (includeYear) {
    return `${month} '${String(date.getFullYear()).slice(2)}`;
  }
  return month;
}

export default function AnalyticsPage() {
  const { t, formatDate, formatNumber } = useTranslation();
  const [dateRange, setDateRange] = React.useState("last_6_months");
  
  // Filter states
  const [locationFilter, setLocationFilter] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("");
  const [severityFilter, setSeverityFilter] = React.useState("");

  const { items: incidents } = useIncidentsStore();
  const { items: locations } = useLocationsStore();

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

  // Build months array — for "all_time", cap to earliest incident date instead of epoch
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
      // No incidents — show last 12 months
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
    [months, incidentStatsByMonth, spansMultipleYears]
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
    [months, incidentStatsByMonth, spansMultipleYears]
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
    [months, incidentStatsByMonth, spansMultipleYears]
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
    const ltir = totalIncidents ? (lostTimeIncidents / totalIncidents * 100).toFixed(1) : "0.0";
    const trir = totalIncidents ? (totalIncidents / Math.max(locations.length, 1)).toFixed(1) : "0.0";
    const complianceRate = totalIncidents
      ? Math.round((resolvedIncidents.length / totalIncidents) * 100)
      : 0;

    return { totalIncidents, avgResolutionHours, ltir, trir, complianceRate };
  }, [filteredIncidents, locations.length]);

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
      options: commonFilterOptions.incidentType,
      value: typeFilter,
      onChange: setTypeFilter,
    },
    {
      id: "severity",
      label: "All severities",
      options: commonFilterOptions.severity,
      value: severityFilter,
      onChange: setSeverityFilter,
    },
  ];

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
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => {
                const exportRows = filteredIncidents.map((incident) => ({
                  Reference: incident.reference_number,
                  Title: incident.title,
                  Type: incident.type,
                  Severity: incident.severity,
                  Status: incident.status,
                  Location:
                    locations.find((loc) => loc.id === incident.location_id)?.name || "Unassigned",
                  Date: incident.incident_date,
                }));
                downloadCsv("incidents-analytics.csv", exportRows);
              }}
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
          </FilterPanel>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title={t("analytics.metrics.ltir")}
          value={kpis.ltir}
          icon={Target}
        />
        <KPICard
          title={t("analytics.metrics.trir")}
          value={kpis.trir}
          icon={AlertTriangle}
        />
        <KPICard
          title={t("analytics.metrics.avgResolution")}
          value={kpis.avgResolutionHours ? `${kpis.avgResolutionHours}h` : "—"}
          icon={Clock}
        />
        <KPICard
          title={t("analytics.metrics.complianceRate")}
          value={`${kpis.complianceRate}%`}
          icon={Users}
        />
      </div>

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
