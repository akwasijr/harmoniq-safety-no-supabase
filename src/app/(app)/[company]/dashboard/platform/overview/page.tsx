"use client";

import * as React from "react";
import { useTranslation } from "@/i18n";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Package,
  RefreshCw,
  Server,
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

export default function PlatformOverviewPage() {
  const params = useParams();
  const company = params.company as string;

  const { items: companies } = useCompanyStore();
  const { items: users } = useUsersStore();
  const { items: incidents } = useIncidentsStore();
  const { items: assets } = useAssetsStore();

  const [health, setHealth] = React.useState<PlatformHealthSnapshot | null>(null);
  const [loadingHealth, setLoadingHealth] = React.useState(true);

  const activeCompanies = companies.filter((c) => c.status === "active");
  const trialCompanies = companies.filter((c) => c.status === "trial");
  const suspendedCompanies = companies.filter((c) => c.status === "suspended");
  const totalUsers = users.length;
  const companyAdmins = users.filter((u) => u.role === "company_admin");
  const superAdmins = users.filter((u) => u.role === "super_admin");
  const openIncidents = incidents.filter((i) => i.status === "new" || i.status === "in_progress");

  const recentCompanies = [...companies]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const recentIncidents = [...incidents]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const fetchHealth = React.useCallback(async () => {
    setLoadingHealth(true);

    try {
      const healthResponse = await fetch("/api/health", { cache: "no-store" });

      if (healthResponse.ok) {
        setHealth((await healthResponse.json()) as PlatformHealthSnapshot);
      } else {
        setHealth(null);
      }
    } finally {
      setLoadingHealth(false);
    }
  }, []);

  React.useEffect(() => {
    void fetchHealth();
  }, [fetchHealth]);

  const statusVariant = (status: string) => {
    switch (status) {
      case "active":
        return "active" as const;
      case "trial":
        return "info" as const;
      case "suspended":
        return "destructive" as const;
      default:
        return "secondary" as const;
    }
  };

  const severityVariant = (severity: string) => {
    switch (severity) {
      case "critical":
        return "critical" as const;
      case "high":
        return "high" as const;
      case "medium":
        return "medium" as const;
      case "low":
        return "low" as const;
      default:
        return "secondary" as const;
    }
  };

  const healthLabel = health?.ok ? "Healthy" : health ? "Attention" : "Loading";
  const uptimeHours = health ? Math.floor(health.uptime_seconds / 3600) : 0;
  const platformSignals = [...(health?.issues ?? []), ...(health?.warnings ?? [])].slice(0, 4);

  return (
    <RoleGuard allowedRoles={["super_admin", "company_admin"]}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>

            <p className="mt-1 text-sm text-muted-foreground">
              Tenant operations, platform health, and administrator coverage across the live platform.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => void fetchHealth()}
              disabled={loadingHealth}
            >
              <RefreshCw className={cn("h-4 w-4", loadingHealth && "animate-spin")} />
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
            title="Active Companies"
            value={activeCompanies.length}
            icon={Building2}
            trend={{ value: trialCompanies.length, direction: "up", label: "on trial" }}
          />
          <KPICard
            title="Platform Users"
            value={totalUsers}
            icon={Users}
            trend={{ value: companyAdmins.length + superAdmins.length, direction: "up", label: "admins" }}
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
              <div className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Signals to review</span>
                  <span className="text-sm text-muted-foreground">{platformSignals.length}</span>
                </div>
                <div className="mt-2 space-y-2">
                  {platformSignals.length > 0 ? (
                    platformSignals.map((signal) => (
                      <div key={signal} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                        <span>{signal}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No active platform warnings.</p>
                  )}
                </div>
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
                <Building2 className="h-4 w-4 text-primary" />
                Company Lifecycle
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm font-medium">Total companies</span>
                <span className="text-sm text-muted-foreground">{companies.length}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm font-medium">Active tenants</span>
                <span className="text-sm text-muted-foreground">{activeCompanies.length}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm font-medium">Trial tenants</span>
                <span className="text-sm text-muted-foreground">{trialCompanies.length}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm font-medium">Suspended tenants</span>
                <span className="text-sm text-muted-foreground">{suspendedCompanies.length}</span>
              </div>
              <Link href={`/${company}/dashboard/platform/companies`}>
                <Button variant="ghost" size="sm" className="gap-1 text-xs">
                  Manage company portfolio <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-medium">
                <Users className="h-4 w-4 text-primary" />
                Administrator Coverage
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm font-medium">Super admins</span>
                <span className="text-sm text-muted-foreground">{superAdmins.length}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm font-medium">Company admins</span>
                <span className="text-sm text-muted-foreground">{companyAdmins.length}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm font-medium">All users</span>
                <span className="truncate text-sm text-muted-foreground">{users.length}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm font-medium">Open incidents</span>
                <span className="text-sm text-muted-foreground">{openIncidents.length}</span>
              </div>
              <Link href={`/${company}/dashboard/platform/users`}>
                <Button variant="ghost" size="sm" className="gap-1 text-xs">
                  Review platform admins <ArrowRight className="h-3.5 w-3.5" />
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
                      <Badge variant={statusVariant(companyRecord.status)} className="text-[11px]">
                        {companyRecord.status}
                      </Badge>
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
                        <Badge variant={severityVariant(incident.severity)} className="text-xs">
                          {incident.severity}
                        </Badge>
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
