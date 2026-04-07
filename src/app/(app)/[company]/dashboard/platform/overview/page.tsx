"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Building2,
  Database,
  Globe,
  Package,
  RefreshCw,
  Server,
  Shield,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KPICard } from "@/components/ui/kpi-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RoleGuard } from "@/components/auth/role-guard";
import { useCompanyStore } from "@/stores/company-store";
import { useUsersStore } from "@/stores/users-store";
import { useIncidentsStore } from "@/stores/incidents-store";
import { useAssetsStore } from "@/stores/assets-store";
import {
  DEFAULT_PLATFORM_PRIVACY_SETTINGS,
  type PlatformPrivacySettings,
} from "@/lib/platform-privacy-settings";
import { cn } from "@/lib/utils";

interface PlatformHealthSnapshot {
  ok: boolean;
  uptime_seconds: number;
  issues: string[];
  warnings: string[];
  checks: {
    database: {
      ok: boolean;
      latency_ms: number | null;
    };
  };
}

interface AnalyticsSnapshot {
  total: number;
  uniqueVisitors: number;
  by_country: Record<string, number>;
}

interface ConsentRecord {
  id: string;
  analytics: boolean;
  marketing: boolean;
}

export default function PlatformOverviewPage() {
  const params = useParams();
  const company = params.company as string;

  const { items: companies } = useCompanyStore();
  const { items: users } = useUsersStore();
  const { items: incidents } = useIncidentsStore();
  const { items: assets } = useAssetsStore();

  const [health, setHealth] = React.useState<PlatformHealthSnapshot | null>(null);
  const [analytics, setAnalytics] = React.useState<AnalyticsSnapshot | null>(null);
  const [privacySettings, setPrivacySettings] = React.useState<PlatformPrivacySettings>(
    DEFAULT_PLATFORM_PRIVACY_SETTINGS
  );
  const [consentRecords, setConsentRecords] = React.useState<ConsentRecord[]>([]);
  const [loadingObservability, setLoadingObservability] = React.useState(true);

  const activeCompanies = companies.filter((c) => c.status === "active");
  const trialCompanies = companies.filter((c) => c.status === "trial");
  const totalUsers = users.length;
  const adminUsers = users.filter((u) => u.role === "super_admin" || u.role === "company_admin");
  const openIncidents = incidents.filter((i) => i.status === "new" || i.status === "in_progress");

  const recentCompanies = [...companies]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const recentIncidents = [...incidents]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const fetchObservability = React.useCallback(async () => {
    setLoadingObservability(true);

    try {
      const [healthResponse, analyticsResponse, consentResponse, privacyResponse] = await Promise.all([
        fetch("/api/health", { cache: "no-store" }),
        fetch("/api/analytics?days=30", { cache: "no-store" }),
        fetch("/api/consent?limit=100", { cache: "no-store" }),
        fetch("/api/platform/privacy-settings", { cache: "no-store" }),
      ]);

      if (healthResponse.ok) {
        setHealth((await healthResponse.json()) as PlatformHealthSnapshot);
      }

      if (analyticsResponse.ok) {
        setAnalytics((await analyticsResponse.json()) as AnalyticsSnapshot);
      } else {
        setAnalytics(null);
      }

      if (consentResponse.ok) {
        const consentData = (await consentResponse.json()) as { records?: ConsentRecord[] };
        setConsentRecords(consentData.records || []);
      } else {
        setConsentRecords([]);
      }

      if (privacyResponse.ok) {
        setPrivacySettings((await privacyResponse.json()) as PlatformPrivacySettings);
      } else {
        setPrivacySettings(DEFAULT_PLATFORM_PRIVACY_SETTINGS);
      }
    } finally {
      setLoadingObservability(false);
    }
  }, []);

  React.useEffect(() => {
    void fetchObservability();
  }, [fetchObservability]);

  const statusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-emerald-500/15 text-emerald-600 border-emerald-500/20";
      case "trial":
        return "bg-blue-500/15 text-blue-600 border-blue-500/20";
      case "suspended":
        return "bg-red-500/15 text-red-600 border-red-500/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const severityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-500/15 text-red-600";
      case "high":
        return "bg-orange-500/15 text-orange-600";
      case "medium":
        return "bg-amber-500/15 text-amber-600";
      case "low":
        return "bg-emerald-500/15 text-emerald-600";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const topCountry = React.useMemo(() => {
    if (!analytics) {
      return null;
    }

    const [country, visits] =
      Object.entries(analytics.by_country || {}).sort((a, b) => b[1] - a[1])[0] || [];

    return country ? { country, visits } : null;
  }, [analytics]);

  const analyticsOptInRate =
    consentRecords.length > 0
      ? Math.round((consentRecords.filter((record) => record.analytics).length / consentRecords.length) * 100)
      : 0;

  const healthLabel = health?.ok ? "Healthy" : health ? "Attention" : "Loading";
  const uptimeHours = health ? Math.floor(health.uptime_seconds / 3600) : 0;

  return (
    <RoleGuard allowedRoles={["super_admin", "company_admin"]}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Platform Overview</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => void fetchObservability()}
              disabled={loadingObservability}
            >
              <RefreshCw className={cn("h-4 w-4", loadingObservability && "animate-spin")} />
              Refresh
            </Button>
            <Link href={`/${company}/dashboard/platform/companies`}>
              <Button variant="outline" size="sm" className="gap-2">
                <Building2 className="h-4 w-4" />
                Manage Companies
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <KPICard
            title="Total Companies"
            value={companies.length}
            icon={Building2}
            trend={{ value: trialCompanies.length, direction: "up", label: "on trial" }}
          />
          <KPICard
            title="Total Users"
            value={totalUsers}
            icon={Users}
            trend={{ value: adminUsers.length, direction: "up", label: "admins" }}
          />
          <KPICard
            title="Open Incidents"
            value={openIncidents.length}
            icon={AlertTriangle}
            trend={{ value: incidents.length, direction: "up", label: "total" }}
          />
          <KPICard
            title="Total Assets"
            value={assets.length}
            icon={Package}
            trend={{
              value: assets.filter((a) => a.status === "active").length,
              direction: "up",
              label: "active",
            }}
          />
          <KPICard
            title="Unique Visitors (30d)"
            value={analytics?.uniqueVisitors ?? 0}
            icon={Globe}
            trend={{
              value: analytics?.total ?? 0,
              direction: "up",
              label: "page views",
            }}
          />
          <KPICard
            title="Platform Health"
            value={healthLabel}
            icon={Server}
            trend={{
              value: (health?.issues.length || 0) + (health?.warnings.length || 0),
              direction: health?.ok ? "up" : "down",
              label: health?.ok ? "checks clear" : "items to review",
            }}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-medium">Platform Health</CardTitle>
              <Badge variant={health?.ok ? "success" : "secondary"}>{healthLabel}</Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Server className="h-4 w-4 text-primary" />
                    API status
                  </div>
                  <p className="mt-3 text-2xl font-semibold">{health?.ok ? "Online" : "Check now"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {health?.issues.length ? `${health.issues.length} blocking issue(s)` : "No blocking issues"}
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Database className="h-4 w-4 text-primary" />
                    Database
                  </div>
                  <p className="mt-3 text-2xl font-semibold">
                    {health?.checks.database.ok ? `${health.checks.database.latency_ms ?? 0} ms` : "Offline"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {health?.checks.database.ok ? "Current connectivity latency" : "Database connection needs review"}
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Activity className="h-4 w-4 text-primary" />
                    Uptime
                  </div>
                  <p className="mt-3 text-2xl font-semibold">{health ? `${uptimeHours}h` : "--"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {health?.warnings.length ? `${health.warnings.length} warning(s)` : "No active warnings"}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">Marketing observability</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Analytics events now come from the public marketing site only, after consent.
                    </p>
                  </div>
                  <Link href={`/${company}/dashboard/platform/analytics`}>
                    <Button variant="ghost" size="sm" className="gap-1 text-xs">
                      Open analytics <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-medium">Privacy & Consent</CardTitle>
              <Shield className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border p-4">
                  <p className="text-xs font-medium text-muted-foreground">Analytics opt-in rate</p>
                  <p className="mt-2 text-2xl font-semibold">{analyticsOptInRate}%</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Based on the latest {consentRecords.length} consent decisions
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-xs font-medium text-muted-foreground">Cookie banner</p>
                  <p className="mt-2 text-2xl font-semibold">
                    {privacySettings.cookieConsent ? "Enabled" : "Disabled"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {privacySettings.cookieConsent
                      ? "Visitors must consent before optional tracking runs"
                      : "Optional visitor tracking stays off"}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">Public privacy pipeline</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Policy links, cookie consent, and marketing analytics now read the same platform settings.
                    </p>
                  </div>
                  <Link href={`/${company}/dashboard/platform/analytics`}>
                    <Button variant="ghost" size="sm" className="gap-1 text-xs">
                      Manage privacy <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  <Badge variant={privacySettings.rightToErasure ? "success" : "secondary"}>Erasure</Badge>
                  <Badge variant={privacySettings.dataExport ? "success" : "secondary"}>Portability</Badge>
                  <Badge variant="success">IP anonymization</Badge>
                </div>
                <div className="mt-4 space-y-2 text-xs text-muted-foreground">
                  <p>DPO contact: {privacySettings.dpoEmail}</p>
                  <p>Privacy policy: {privacySettings.privacyUrl}</p>
                  <p>Cookie policy: {privacySettings.cookieUrl}</p>
                  {topCountry && <p>Top visitor country: {topCountry.country} ({topCountry.visits})</p>}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-medium">Companies</CardTitle>
              <Link href={`/${company}/dashboard/platform/companies`}>
                <Button variant="ghost" size="sm" className="gap-1 text-xs">
                  View all <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {recentCompanies.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No companies yet. Create one to get started.
                </p>
              ) : (
                <div className="divide-y">
                  {recentCompanies.map((companyRecord) => (
                    <Link
                      key={companyRecord.id}
                      href={`/${company}/dashboard/platform/companies/${companyRecord.id}`}
                      className="flex items-center justify-between rounded px-2 py-2.5 transition-colors hover:bg-muted/50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{companyRecord.name}</p>
                        <p className="text-xs text-muted-foreground">{companyRecord.country}</p>
                      </div>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                          statusColor(companyRecord.status)
                        )}
                      >
                        {companyRecord.status}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-medium">Recent Incidents</CardTitle>
              <span className="text-xs text-muted-foreground">{openIncidents.length} open</span>
            </CardHeader>
            <CardContent>
              {recentIncidents.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No incidents reported yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {recentIncidents.map((incident) => (
                    <div key={incident.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{incident.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {incident.reference_number} · {new Date(incident.incident_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="ml-2 flex items-center gap-2">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                            severityColor(incident.severity)
                          )}
                        >
                          {incident.severity}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </RoleGuard>
  );
}
