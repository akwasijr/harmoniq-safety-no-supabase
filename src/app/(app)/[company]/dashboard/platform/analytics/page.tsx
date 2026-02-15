"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useCompanyStore } from "@/stores/company-store";
import { useUsersStore } from "@/stores/users-store";
import { useIncidentsStore } from "@/stores/incidents-store";
import { useAssetsStore } from "@/stores/assets-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KPICard } from "@/components/ui/kpi-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RoleGuard } from "@/components/auth/role-guard";
import { cn } from "@/lib/utils";
import {
  BarChart3, Users, Building2, Globe, Shield, AlertTriangle, Package,
  Eye, FileText, CheckCircle, MapPin, Activity, Monitor, Smartphone,
  RefreshCw, TrendingUp, Clock,
} from "lucide-react";

const LeafletMap = dynamic(() => import("@/components/shared/leaflet-map"), { ssr: false });

type SubTab = "dashboard" | "realtime" | "audience" | "geo" | "compliance";

interface AnalyticsData {
  total: number;
  uniqueVisitors: number;
  by_page: Record<string, number>;
  by_country: Record<string, number>;
  by_browser: Record<string, number>;
  by_device: Record<string, number>;
  by_referrer: Record<string, number>;
  by_day: Record<string, number>;
  locations: { lat: number; lng: number; city: string | null; country: string; count: number }[];
}

export default function PlatformAnalyticsPage() {
  const { items: companies } = useCompanyStore();
  const { items: users } = useUsersStore();
  const { items: incidents } = useIncidentsStore();
  const { items: assets } = useAssetsStore();
  const [activeTab, setActiveTab] = React.useState<SubTab>("dashboard");
  const [trafficPeriod, setTrafficPeriod] = React.useState<"7d" | "30d" | "90d">("30d");
  const [analyticsData, setAnalyticsData] = React.useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const fetchData = React.useCallback(() => {
    setIsLoading(true);
    const days = trafficPeriod === "7d" ? 7 : trafficPeriod === "90d" ? 90 : 30;
    fetch(`/api/analytics?days=${days}`)
      .then((r) => r.json())
      .then(setAnalyticsData)
      .catch(() => setAnalyticsData(null))
      .finally(() => setIsLoading(false));
  }, [trafficPeriod]);

  React.useEffect(() => { fetchData(); }, [fetchData]);

  const topPages = React.useMemo(() =>
    Object.entries(analyticsData?.by_page || {}).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([path, views]) => ({ path, views })),
  [analyticsData]);
  const topReferrers = React.useMemo(() =>
    Object.entries(analyticsData?.by_referrer || {}).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([source, visits]) => ({ source, visits })),
  [analyticsData]);
  const topCountries = React.useMemo(() =>
    Object.entries(analyticsData?.by_country || {}).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([country, visits]) => ({ country, visits })),
  [analyticsData]);
  const browsers = React.useMemo(() =>
    Object.entries(analyticsData?.by_browser || {}).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count })),
  [analyticsData]);
  const devices = React.useMemo(() =>
    Object.entries(analyticsData?.by_device || {}).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count })),
  [analyticsData]);
  const dailyData = React.useMemo(() =>
    Object.entries(analyticsData?.by_day || {}).sort((a, b) => a[0].localeCompare(b[0])).slice(-14).map(([date, views]) => ({ date, views })),
  [analyticsData]);

  const activeCompanies = companies.filter((c) => c.status === "active").length;
  const activeUsers = users.filter((u) => u.status === "active").length;
  const openIncidents = incidents.filter((i) => i.status === "new" || i.status === "in_progress").length;
  const total = analyticsData?.total || 0;
  const unique = analyticsData?.uniqueVisitors || 0;
  const maxDaily = Math.max(...dailyData.map((d) => d.views), 1);

  const [gdpr, setGdpr] = React.useState({
    cookieConsent: true, rightToErasure: true, dataExport: true, anonymizeIp: true,
    retentionDays: 365, dpoEmail: "privacy@harmoniq.safety",
    privacyUrl: "https://harmoniq-safety.vercel.app/privacy",
    cookieUrl: "https://harmoniq-safety.vercel.app/cookies",
  });

  const tabs: { id: SubTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
    { id: "realtime", label: "Real-time", icon: Activity },
    { id: "audience", label: "Audience", icon: Users },
    { id: "geo", label: "Geography", icon: Globe },
    { id: "compliance", label: "Compliance", icon: Shield },
  ];

  const PeriodSelector = () => (
    <div className="flex items-center gap-2">
      <div className="flex gap-1">
        {(["7d", "30d", "90d"] as const).map((p) => (
          <Button key={p} variant={trafficPeriod === p ? "default" : "outline"} size="sm" onClick={() => setTrafficPeriod(p)}>
            {p === "7d" ? "7d" : p === "30d" ? "30d" : "90d"}
          </Button>
        ))}
      </div>
      <Button variant="ghost" size="icon" onClick={fetchData} disabled={isLoading} className="h-8 w-8">
        <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
      </Button>
    </div>
  );

  return (
    <RoleGuard allowedRoles={["super_admin", "company_admin"]}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Observability</h1>
            <p className="text-sm text-muted-foreground mt-1">Platform analytics, visitor intelligence, and compliance</p>
          </div>
          <PeriodSelector />
        </div>

        <div className="border-b overflow-x-auto">
          <div className="flex gap-4 min-w-max">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={cn(
                  "flex items-center gap-2 py-3 px-1 text-sm font-medium transition-colors relative whitespace-nowrap",
                  activeTab === tab.id ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}>
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{tab.label}</span>
                  {tab.id === "realtime" && total > 0 && (
                    <span className="ml-1 h-2 w-2 rounded-full bg-success animate-pulse" />
                  )}
                  {activeTab === tab.id && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* ===== DASHBOARD ===== */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KPICard title="Companies" value={activeCompanies} icon={Building2} />
              <KPICard title="Active Users" value={activeUsers} icon={Users} />
              <KPICard title="Open Incidents" value={openIncidents} icon={AlertTriangle} />
              <KPICard title="Total Assets" value={assets.length} icon={Package} />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Card><CardContent className="pt-6 text-center"><p className="text-3xl font-bold">{total.toLocaleString()}</p><p className="text-xs text-muted-foreground mt-1">Page Views</p></CardContent></Card>
              <Card><CardContent className="pt-6 text-center"><p className="text-3xl font-bold">{unique.toLocaleString()}</p><p className="text-xs text-muted-foreground mt-1">Unique Visitors</p></CardContent></Card>
              <Card><CardContent className="pt-6 text-center"><p className="text-3xl font-bold">{topCountries.length}</p><p className="text-xs text-muted-foreground mt-1">Countries</p></CardContent></Card>
            </div>

            {/* Sparkline-style daily chart */}
            {dailyData.length > 1 && (
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4" />Daily Traffic</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex items-end gap-1 h-32">
                    {dailyData.map((d) => (
                      <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                        <div
                          className="w-full rounded-t bg-primary/80 hover:bg-primary transition-colors min-h-[2px]"
                          style={{ height: `${(d.views / maxDaily) * 100}%` }}
                          title={`${d.date}: ${d.views} views`}
                        />
                        <span className="text-[9px] text-muted-foreground rotate-[-45deg] origin-top-left whitespace-nowrap">
                          {d.date.slice(5)}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid gap-6 sm:grid-cols-2">
              <Card>
                <CardHeader><CardTitle className="text-base">Top Pages</CardTitle></CardHeader>
                <CardContent><div className="space-y-2">{topPages.length === 0 ? <p className="text-sm text-muted-foreground">No data yet</p> : topPages.map((p) => (
                  <div key={p.path} className="flex items-center justify-between rounded-lg border p-2.5 text-sm"><span className="font-mono text-xs text-muted-foreground truncate flex-1 mr-2">{p.path}</span><span className="font-medium shrink-0">{p.views}</span></div>
                ))}</div></CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">Top Referrers</CardTitle></CardHeader>
                <CardContent><div className="space-y-2">{topReferrers.length === 0 ? <p className="text-sm text-muted-foreground">No data yet</p> : topReferrers.map((r) => (
                  <div key={r.source} className="flex items-center justify-between rounded-lg border p-2.5 text-sm"><span className="truncate flex-1 mr-2">{r.source}</span><span className="font-medium shrink-0">{r.visits}</span></div>
                ))}</div></CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* ===== REAL-TIME ===== */}
        {activeTab === "realtime" && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <p className="text-sm text-muted-foreground">Use the refresh button to update data</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Card className="border-primary/20"><CardContent className="pt-6 text-center"><p className="text-4xl font-bold text-primary">{total}</p><p className="text-xs text-muted-foreground mt-1">Total Events</p></CardContent></Card>
              <Card><CardContent className="pt-6 text-center"><p className="text-4xl font-bold">{unique}</p><p className="text-xs text-muted-foreground mt-1">Unique Visitors</p></CardContent></Card>
              <Card><CardContent className="pt-6 text-center"><p className="text-4xl font-bold">{(analyticsData?.locations?.length || 0)}</p><p className="text-xs text-muted-foreground mt-1">Active Locations</p></CardContent></Card>
            </div>
            {topPages.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4" />Active Pages</CardTitle></CardHeader>
                <CardContent><div className="space-y-2">{topPages.slice(0, 5).map((p) => (
                  <div key={p.path} className="flex items-center gap-3 rounded-lg border p-3">
                    <div className="h-2 w-2 rounded-full bg-success animate-pulse shrink-0" />
                    <span className="font-mono text-sm text-muted-foreground truncate flex-1">{p.path}</span>
                    <Badge variant="secondary">{p.views} views</Badge>
                  </div>
                ))}</div></CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ===== AUDIENCE ===== */}
        {activeTab === "audience" && (
          <div className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Monitor className="h-4 w-4" />Browsers</CardTitle></CardHeader>
                <CardContent>
                  {browsers.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center">No data yet</p> : (
                    <div className="space-y-3">
                      {browsers.map((b) => {
                        const pct = total > 0 ? Math.round((b.count / total) * 100) : 0;
                        return (
                          <div key={b.name} className="space-y-1">
                            <div className="flex justify-between text-sm"><span className="font-medium">{b.name}</span><span className="text-muted-foreground">{b.count} ({pct}%)</span></div>
                            <div className="h-2 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} /></div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Smartphone className="h-4 w-4" />Devices</CardTitle></CardHeader>
                <CardContent>
                  {devices.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center">No data yet</p> : (
                    <div className="space-y-3">
                      {devices.map((d) => {
                        const pct = total > 0 ? Math.round((d.count / total) * 100) : 0;
                        return (
                          <div key={d.name} className="space-y-1">
                            <div className="flex justify-between text-sm"><span className="font-medium capitalize">{d.name}</span><span className="text-muted-foreground">{d.count} ({pct}%)</span></div>
                            <div className="h-2 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} /></div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            {topCountries.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base">Countries</CardTitle></CardHeader>
                <CardContent><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{topCountries.map((c) => (
                  <div key={c.country} className="flex items-center justify-between rounded-lg border p-2.5 text-sm"><span className="font-medium">{c.country}</span><span className="text-muted-foreground">{c.visits}</span></div>
                ))}</div></CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ===== GEOGRAPHY ===== */}
        {activeTab === "geo" && (
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><MapPin className="h-4 w-4" />Visitor Locations</CardTitle></CardHeader>
            <CardContent>
              {(analyticsData?.locations?.length || 0) === 0 ? (
                <div className="text-center py-12 text-muted-foreground"><MapPin className="h-10 w-10 mx-auto mb-3 opacity-50" /><p className="font-medium">No location data yet</p><p className="text-sm mt-1">Visit the site to generate visitor data.</p></div>
              ) : (
                <>
                  <div className="rounded-lg overflow-hidden border" style={{ height: 500 }}>
                    <LeafletMap locations={analyticsData?.locations || []} />
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {analyticsData?.locations?.map((loc, i) => (
                      <div key={i} className="flex items-center gap-2 rounded-lg border p-2.5 text-sm">
                        <div className="h-2.5 w-2.5 rounded-full bg-primary shrink-0" />
                        <span className="truncate font-medium">{loc.city || "Unknown"}</span>
                        <span className="text-muted-foreground text-xs">{loc.country}</span>
                        <span className="ml-auto text-xs font-medium">{loc.count}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* ===== COMPLIANCE ===== */}
        {activeTab === "compliance" && (
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4" />GDPR & Privacy Controls</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-4">
                    {([
                      { key: "cookieConsent" as const, label: "Cookie Consent Banner", desc: "Show cookie consent to visitors" },
                      { key: "rightToErasure" as const, label: "Right to Erasure (Art. 17)", desc: "Allow data deletion requests" },
                      { key: "dataExport" as const, label: "Data Portability (Art. 20)", desc: "Allow users to export their data" },
                      { key: "anonymizeIp" as const, label: "IP Anonymization", desc: "Hash IPs before storage (enabled)" },
                    ]).map((item) => (
                      <div key={item.key} className="flex items-center justify-between">
                        <div><p className="text-sm font-medium">{item.label}</p><p className="text-xs text-muted-foreground">{item.desc}</p></div>
                        <button type="button" role="switch" aria-checked={gdpr[item.key]} onClick={() => setGdpr((s) => ({ ...s, [item.key]: !s[item.key] }))} className={`w-11 h-6 rounded-full transition-colors ${gdpr[item.key] ? "bg-primary" : "bg-muted"}`}>
                          <span className={`block w-5 h-5 rounded-full bg-white shadow transform transition-transform ${gdpr[item.key] ? "translate-x-5" : "translate-x-0.5"}`} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-3">
                    <div><Label className="text-xs">Data Retention Period (days)</Label><Input type="number" value={gdpr.retentionDays} onChange={(e) => setGdpr((s) => ({ ...s, retentionDays: parseInt(e.target.value) || 365 }))} className="mt-1" /></div>
                    <div><Label className="text-xs">Data Protection Officer Email</Label><Input value={gdpr.dpoEmail} onChange={(e) => setGdpr((s) => ({ ...s, dpoEmail: e.target.value }))} className="mt-1" /></div>
                    <div><Label className="text-xs">Privacy Policy URL</Label><Input value={gdpr.privacyUrl} onChange={(e) => setGdpr((s) => ({ ...s, privacyUrl: e.target.value }))} className="mt-1" /></div>
                    <div><Label className="text-xs">Cookie Policy URL</Label><Input value={gdpr.cookieUrl} onChange={(e) => setGdpr((s) => ({ ...s, cookieUrl: e.target.value }))} className="mt-1" /></div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Compliance Status</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { label: "IP Anonymization", status: gdpr.anonymizeIp, detail: "All IPs are hashed before storage" },
                    { label: "Cookie Consent", status: gdpr.cookieConsent, detail: "Banner shown to new visitors" },
                    { label: "Data Retention Policy", status: gdpr.retentionDays <= 730, detail: `${gdpr.retentionDays} days retention` },
                    { label: "Right to Erasure", status: gdpr.rightToErasure, detail: "Users can request data deletion" },
                    { label: "Data Portability", status: gdpr.dataExport, detail: "Users can export their data" },
                    { label: "DPO Contact", status: !!gdpr.dpoEmail, detail: gdpr.dpoEmail || "Not set" },
                    { label: "Privacy Policy", status: !!gdpr.privacyUrl, detail: gdpr.privacyUrl ? "Published" : "Not set" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-3 rounded-lg border p-3">
                      <CheckCircle className={cn("h-5 w-5 shrink-0", item.status ? "text-success" : "text-muted-foreground/30")} />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.detail}</p>
                      </div>
                      <Badge variant={item.status ? "success" : "secondary"}>{item.status ? "Active" : "Off"}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
