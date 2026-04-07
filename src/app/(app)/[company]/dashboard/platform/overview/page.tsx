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

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-medium">
                <Server className="h-4 w-4 text-primary" />
                Platform Health
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm font-medium">Status</span>
                <Badge variant={health?.ok ? "success" : "secondary"}>{healthLabel}</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm font-medium">Database latency</span>
                <span className="text-sm text-muted-foreground">
                  {health?.checks.database.ok ? `${health.checks.database.latency_ms ?? 0} ms` : "Offline"}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm font-medium">Uptime</span>
                <span className="text-sm text-muted-foreground">{health ? `${uptimeHours}h` : "--"}</span>
              </div>
              <Link href={`/${company}/dashboard/platform/settings`}>
                <Button variant="ghost" size="sm" className="gap-1 text-xs">
                  Review platform settings <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-medium">
                <Globe className="h-4 w-4 text-primary" />
                Public Website Analytics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm font-medium">Unique visitors (30d)</span>
                <span className="text-sm text-muted-foreground">{analytics?.uniqueVisitors ?? 0}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm font-medium">Page views</span>
                <span className="text-sm text-muted-foreground">{analytics?.total ?? 0}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm font-medium">Top country</span>
                <span className="text-sm text-muted-foreground">
                  {topCountry ? `${topCountry.country} (${topCountry.visits})` : "No data"}
                </span>
              </div>
              <Link href={`/${company}/dashboard/platform/analytics`}>
                <Button variant="ghost" size="sm" className="gap-1 text-xs">
                  Open website analytics <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-medium">
                <Shield className="h-4 w-4 text-primary" />
                Website Privacy & Consent
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm font-medium">Cookie banner</span>
                <Badge variant={privacySettings.cookieConsent ? "success" : "secondary"}>
                  {privacySettings.cookieConsent ? "Enabled" : "Disabled"}
                </Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm font-medium">Analytics opt-in rate</span>
                <span className="text-sm text-muted-foreground">{analyticsOptInRate}%</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm font-medium">DPO contact</span>
                <span className="truncate text-sm text-muted-foreground">{privacySettings.dpoEmail}</span>
              </div>
              <Link href={`/${company}/dashboard/platform/analytics`}>
                <Button variant="ghost" size="sm" className="gap-1 text-xs">
                  Manage privacy <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
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
