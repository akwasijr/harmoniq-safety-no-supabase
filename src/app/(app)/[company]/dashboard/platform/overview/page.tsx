"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Building2,
  Users,
  AlertTriangle,
  Package,
  ArrowRight,
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

export default function PlatformOverviewPage() {
  const params = useParams();
  const company = params.company as string;

  const { items: companies } = useCompanyStore();
  const { items: users } = useUsersStore();
  const { items: incidents } = useIncidentsStore();
  const { items: assets } = useAssetsStore();

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

  const statusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-emerald-500/15 text-emerald-600 border-emerald-500/20";
      case "trial": return "bg-blue-500/15 text-blue-600 border-blue-500/20";
      case "suspended": return "bg-red-500/15 text-red-600 border-red-500/20";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const severityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "bg-red-500/15 text-red-600";
      case "high": return "bg-orange-500/15 text-orange-600";
      case "medium": return "bg-amber-500/15 text-amber-600";
      case "low": return "bg-emerald-500/15 text-emerald-600";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <RoleGuard allowedRoles={["super_admin", "company_admin"]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Platform Overview</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Monitor all companies and platform health
            </p>
          </div>
          <Link href={`/${company}/dashboard/platform/companies`}>
            <Button variant="outline" size="sm" className="gap-2">
              <Building2 className="h-4 w-4" />
              Manage Companies
            </Button>
          </Link>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KPICard
            title="Total Companies"
            value={companies.length}
            icon={Building2}
            trend={{
              value: trialCompanies.length,
              direction: "up",
              label: "on trial",
            }}
          />
          <KPICard
            title="Total Users"
            value={totalUsers}
            icon={Users}
            trend={{
              value: adminUsers.length,
              direction: "up",
              label: "admins",
            }}
          />
          <KPICard
            title="Open Incidents"
            value={openIncidents.length}
            icon={AlertTriangle}
            trend={{
              value: incidents.length,
              direction: "up",
              label: "total",
            }}
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

        {/* Two-column content */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Companies List */}
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
                <p className="text-sm text-muted-foreground text-center py-8">
                  No companies yet. Create one to get started.
                </p>
              ) : (
                <div className="divide-y">
                  {recentCompanies.map((c) => (
                    <Link
                      key={c.id}
                      href={`/${company}/dashboard/platform/companies/${c.id}`}
                      className="flex items-center justify-between py-2.5 px-1 hover:bg-muted/50 -mx-1 px-2 rounded transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.country}</p>
                      </div>
                      <span className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                        statusColor(c.status)
                      )}>
                        {c.status}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Incidents Across All Companies */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-medium">Recent Incidents</CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {openIncidents.length} open
                </span>
              </div>
            </CardHeader>
            <CardContent>
              {recentIncidents.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No incidents reported yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {recentIncidents.map((inc) => (
                    <div
                      key={inc.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{inc.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {inc.reference_number} · {new Date(inc.incident_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        <span className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                          severityColor(inc.severity)
                        )}>
                          {inc.severity}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Links row — simple text links */}
        <div className="flex flex-wrap gap-4">
          {[
            { title: "Analytics & Privacy", href: `/${company}/dashboard/platform/analytics` },
            { title: "Platform Users", href: `/${company}/dashboard/platform/users` },
            { title: "Platform Settings", href: `/${company}/dashboard/platform/settings` },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-primary hover:underline"
            >
              {link.title} →
            </Link>
          ))}
        </div>
      </div>
    </RoleGuard>
  );
}
