"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KPICard } from "@/components/ui/kpi-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RoleGuard } from "@/components/auth/role-guard";
import { useToast } from "@/components/ui/toast";
import {
  DEFAULT_PLATFORM_PRIVACY_SETTINGS,
  type PlatformPrivacySettings,
} from "@/lib/platform-privacy-settings";
import {
  filterVisitorLocations,
  getVisibleVisitorCount,
  getVisitorCountries,
  type VisitorLocation,
} from "@/lib/analytics-geo";
import { buildSiteUrl } from "@/lib/site-url";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/i18n";
import {
  BarChart3, Users, Globe, Shield,
  CheckCircle, MapPin, Activity, Monitor, Smartphone, RefreshCw, TrendingUp, Save,
} from "lucide-react";

const LeafletMap = dynamic(() => import("@/components/shared/leaflet-map"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[400px] items-center justify-center rounded-lg border bg-muted/20 text-sm text-muted-foreground">
      Loading map…
    </div>
  ),
});

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
  locations: VisitorLocation[];
}

interface ConsentRecord {
  id: string;
  ip_hash: string;
  user_agent: string;
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  created_at: string;
}

function ConsentAuditLog() {
  const [records, setRecords] = React.useState<ConsentRecord[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);

  const fetchRecords = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/consent?limit=20");
      if (res.ok) {
        const data = await res.json();
        setRecords(data.records || []);
        setTotal(data.total || 0);
      }
    } catch {
      // API may not be ready yet
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const consentRate = records.length > 0
    ? Math.round(records.filter(r => r.analytics).length / records.length * 100)
    : 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Consent Audit Log
        </CardTitle>
        <div className="flex items-center gap-3">
          <Badge variant="secondary">{total} total records</Badge>
          <Button variant="ghost" size="sm" onClick={fetchRecords}>
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {records.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="rounded-lg border p-3 text-center">
              <p className="text-2xl font-bold">{total}</p>
              <p className="text-xs text-muted-foreground">Total Consents</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-2xl font-bold text-success">{consentRate}%</p>
              <p className="text-xs text-muted-foreground">Analytics Opt-in</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-2xl font-bold">{records.filter(r => r.marketing).length}</p>
              <p className="text-xs text-muted-foreground">Marketing Opt-in</p>
            </div>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 font-medium text-muted-foreground">Time</th>
                <th className="text-left py-2 font-medium text-muted-foreground">IP Hash</th>
                <th className="text-center py-2 font-medium text-muted-foreground">Analytics</th>
                <th className="text-center py-2 font-medium text-muted-foreground">Marketing</th>
                <th className="text-left py-2 font-medium text-muted-foreground">Device</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">Loading...</td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">No consent records yet. Records appear after visitors interact with the cookie banner.</td></tr>
              ) : records.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="py-2 text-xs">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="py-2 font-mono text-xs text-muted-foreground">{r.ip_hash.slice(0, 8)}…</td>
                  <td className="py-2 text-center">
                    <Badge variant={r.analytics ? "success" : "secondary"} className="text-xs">{r.analytics ? "Yes" : "No"}</Badge>
                  </td>
                  <td className="py-2 text-center">
                    <Badge variant={r.marketing ? "success" : "secondary"} className="text-xs">{r.marketing ? "Yes" : "No"}</Badge>
                  </td>
                  <td className="py-2 text-xs text-muted-foreground truncate max-w-[200px]">
                    {r.user_agent.includes("Mobile") ? "Mobile" : r.user_agent.includes("Mac") ? "Desktop (Mac)" : r.user_agent.includes("Windows") ? "Desktop (Win)" : "Other"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PlatformAnalyticsPage() {
  const { formatNumber } = useTranslation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = React.useState<SubTab>("dashboard");
  const [trafficPeriod, setTrafficPeriod] = React.useState<"7d" | "30d" | "90d">("30d");
  const [analyticsData, setAnalyticsData] = React.useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [gdpr, setGdpr] = React.useState<PlatformPrivacySettings>(DEFAULT_PLATFORM_PRIVACY_SETTINGS);
  const [isSavingPrivacy, setIsSavingPrivacy] = React.useState(false);
  const [geoQuery, setGeoQuery] = React.useState("");
  const [geoCountryFilter, setGeoCountryFilter] = React.useState("All countries");
  const [geoMinVisitors, setGeoMinVisitors] = React.useState(1);
  const [geoSort, setGeoSort] = React.useState<"Most visitors" | "City (A-Z)" | "Country (A-Z)">("Most visitors");

  const fetchData = React.useCallback(() => {
    setIsLoading(true);
    const days = trafficPeriod === "7d" ? 7 : trafficPeriod === "90d" ? 90 : 30;
    fetch(`/api/analytics?days=${days}`)
      .then(async (r) => {
        if (!r.ok) {
          throw new Error("Failed to load analytics");
        }
        return r.json();
      })
      .then(setAnalyticsData)
      .catch(() => setAnalyticsData(null))
      .finally(() => setIsLoading(false));
  }, [trafficPeriod]);

  React.useEffect(() => { fetchData(); }, [fetchData]);

  React.useEffect(() => {
    let active = true;

    const loadPrivacySettings = async () => {
      try {
        const response = await fetch("/api/platform/privacy-settings", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Failed to load privacy settings");
        }
        const data = (await response.json()) as PlatformPrivacySettings;
        if (active) {
          setGdpr(data);
        }
      } catch {
        if (active) {
          setGdpr(DEFAULT_PLATFORM_PRIVACY_SETTINGS);
        }
      }
    };

    void loadPrivacySettings();

    return () => {
      active = false;
    };
  }, []);

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
  const visitorCountries = React.useMemo(
    () => getVisitorCountries(analyticsData?.locations || []),
    [analyticsData],
  );
  const filteredLocations = React.useMemo(
    () =>
      filterVisitorLocations(analyticsData?.locations || [], {
        country: geoCountryFilter,
        query: geoQuery,
        minVisitors: geoMinVisitors,
        sort: geoSort,
      }),
    [analyticsData, geoCountryFilter, geoMinVisitors, geoQuery, geoSort],
  );
  const visibleVisitorCount = React.useMemo(
    () => getVisibleVisitorCount(filteredLocations),
    [filteredLocations],
  );
  const visibleCountryCount = React.useMemo(
    () => new Set(filteredLocations.map((location) => location.country)).size,
    [filteredLocations],
  );

  const total = analyticsData?.total || 0;
  const unique = analyticsData?.uniqueVisitors || 0;
  const maxDaily = Math.max(...dailyData.map((d) => d.views), 1);
  const activePrivacyControls = [
    gdpr.cookieConsent,
    gdpr.rightToErasure,
    gdpr.dataExport,
    gdpr.anonymizeIp,
  ].filter(Boolean).length;

  const tabs: { id: SubTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "dashboard", label: "Traffic Overview", icon: BarChart3 },
    { id: "realtime", label: "Live Traffic", icon: Activity },
    { id: "audience", label: "Audience", icon: Users },
    { id: "geo", label: "Geography", icon: Globe },
    { id: "compliance", label: "Privacy & Consent", icon: Shield },
  ];

  const savePrivacySettings = async () => {
    setIsSavingPrivacy(true);
    try {
      const response = await fetch("/api/platform/privacy-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(gdpr),
      });

      if (!response.ok) {
        throw new Error("Failed to save privacy settings");
      }

      const data = (await response.json()) as PlatformPrivacySettings;
      setGdpr(data);
      toast("Privacy controls updated", "success");
    } catch {
      toast("Could not save privacy controls", "error");
    } finally {
      setIsSavingPrivacy(false);
    }
  };

  const resetGeoFilters = () => {
    setGeoQuery("");
    setGeoCountryFilter("All countries");
    setGeoMinVisitors(1);
    setGeoSort("Most visitors");
  };

  return (
    <RoleGuard allowedRoles={["super_admin", "company_admin"]}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div />
          <div className="flex items-center gap-2">
            {activeTab === "compliance" && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={savePrivacySettings}
                disabled={isSavingPrivacy}
              >
                <Save className="h-4 w-4" />
                {isSavingPrivacy ? "Saving..." : "Save marketing privacy settings"}
              </Button>
            )}
            <div className="flex gap-1">
              {(["7d", "30d", "90d"] as const).map((p) => (
                <Button key={p} variant={trafficPeriod === p ? "default" : "outline"} size="sm" onClick={() => setTrafficPeriod(p)}>
                  {p === "7d" ? "7d" : p === "30d" ? "30d" : "90d"}
                </Button>
              ))}
            </div>
            <Button variant="ghost" size="icon" onClick={fetchData} disabled={isLoading} className="h-8 w-8" aria-label="Refresh marketing site data">
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>
          </div>
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
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <KPICard title="Page Views" value={formatNumber(total)} icon={BarChart3} />
              <KPICard title="Unique Visitors" value={formatNumber(unique)} icon={Users} />
              <KPICard title="Countries" value={topCountries.length} icon={Globe} />
              <KPICard title="Tracked Pages" value={topPages.length} icon={Activity} />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Consent pipeline</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <span className="text-sm font-medium">Cookie banner</span>
                    <Badge variant={gdpr.cookieConsent ? "success" : "secondary"}>
                      {gdpr.cookieConsent ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <span className="text-sm font-medium">Privacy controls</span>
                    <span className="text-sm text-muted-foreground">{activePrivacyControls}/4 active</span>
                  </div>
                </CardContent>
              </Card>
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
            <CardContent className="space-y-4">
              {(analyticsData?.locations?.length || 0) === 0 ? (
                <div className="text-center py-12 text-muted-foreground"><MapPin className="h-10 w-10 mx-auto mb-3 opacity-50" /><p className="font-medium">No location data yet</p><p className="text-sm mt-1">Visit the site to generate visitor data.</p></div>
              ) : (
                <>
                  <div className="grid gap-3 rounded-lg border bg-muted/20 p-4 lg:grid-cols-[minmax(0,1.4fr)_220px]">
                    <div className="space-y-2">
                      <Label htmlFor="geo-search" className="text-xs text-muted-foreground">Find a city or country</Label>
                      <Input
                        id="geo-search"
                        value={geoQuery}
                        onChange={(event) => setGeoQuery(event.target.value)}
                        placeholder="Search Amsterdam, London, US..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Country</Label>
                      <Select value={geoCountryFilter} onValueChange={setGeoCountryFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="All countries" />
                        </SelectTrigger>
                        <SelectContent aria-label="Country filter">
                          <SelectItem value="All countries">All countries</SelectItem>
                          {visitorCountries.map((country) => (
                            <SelectItem key={country} value={country}>
                              {country}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">Minimum visitors per plotted point</p>
                      <div className="flex flex-wrap gap-2">
                        {[1, 2, 5, 10].map((threshold) => (
                          <Button
                            key={threshold}
                            type="button"
                            size="sm"
                            variant={geoMinVisitors === threshold ? "default" : "outline"}
                            onClick={() => setGeoMinVisitors(threshold)}
                          >
                            {threshold === 1 ? "All" : `${threshold}+`}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">Sort locations</p>
                      <div className="flex flex-wrap gap-2">
                        {(["Most visitors", "City (A-Z)", "Country (A-Z)"] as const).map((option) => (
                          <Button
                            key={option}
                            type="button"
                            size="sm"
                            variant={geoSort === option ? "default" : "outline"}
                            onClick={() => setGeoSort(option)}
                          >
                            {option}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-end lg:justify-end">
                      <Button type="button" variant="ghost" size="sm" onClick={resetGeoFilters}>
                        Reset filters
                      </Button>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-lg border p-4">
                      <p className="text-2xl font-semibold">{filteredLocations.length}</p>
                      <p className="text-xs text-muted-foreground">Mapped locations</p>
                    </div>
                    <div className="rounded-lg border p-4">
                      <p className="text-2xl font-semibold">{formatNumber(visibleVisitorCount)}</p>
                      <p className="text-xs text-muted-foreground">Visitors in view</p>
                    </div>
                    <div className="rounded-lg border p-4">
                      <p className="text-2xl font-semibold">{visibleCountryCount}</p>
                      <p className="text-xs text-muted-foreground">Countries in view</p>
                    </div>
                  </div>
                  {filteredLocations.length === 0 ? (
                    <div className="rounded-lg border border-dashed py-12 text-center text-muted-foreground">
                      <p className="font-medium">No locations match the current filters</p>
                      <p className="mt-1 text-sm">Try widening the country search or lowering the minimum visitor threshold.</p>
                    </div>
                  ) : (
                    <>
                      <div className="rounded-lg overflow-hidden border" style={{ height: 500 }}>
                        <LeafletMap locations={filteredLocations} />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Locations are plotted from privacy-safe edge geolocation headers captured for marketing-site visits.
                      </p>
                    </>
                  )}
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredLocations.map((loc, i) => (
                      <div key={`${loc.country}-${loc.city || "unknown"}-${i}`} className="flex items-center gap-2 rounded-lg border p-2.5 text-sm">
                        <div className="h-2.5 w-2.5 rounded-full bg-primary shrink-0" />
                        <div className="min-w-0">
                          <p className="truncate font-medium">{loc.city || "Unknown city"}</p>
                          <p className="truncate text-xs text-muted-foreground">{loc.country}</p>
                        </div>
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
                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="text-sm font-medium">Public-site privacy pipeline</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    These settings now control the marketing cookie banner, consent logging, policy links,
                    and whether optional visitor analytics can run after consent.
                  </p>
                </div>
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-4">
                    {([
                      { key: "cookieConsent" as const, label: "Cookie Consent Banner", desc: "Show cookie consent to visitors" },
                      { key: "rightToErasure" as const, label: "Right to Erasure (Art. 17)", desc: "Allow data deletion requests" },
                      { key: "dataExport" as const, label: "Data Portability (Art. 20)", desc: "Allow users to export their data" },
                      { key: "anonymizeIp" as const, label: "IP Anonymization", desc: "Always enforced for visitor analytics" },
                    ]).map((item) => (
                      <div key={item.key} className="flex items-center justify-between">
                        <div><p className="text-sm font-medium">{item.label}</p><p className="text-xs text-muted-foreground">{item.desc}</p></div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={gdpr[item.key]}
                          aria-disabled={item.key === "anonymizeIp"}
                          disabled={item.key === "anonymizeIp"}
                          onClick={() => {
                            if (item.key === "anonymizeIp") return;
                            setGdpr((s) => ({ ...s, [item.key]: !s[item.key] }));
                          }}
                          className={`w-11 h-6 rounded-full transition-colors ${gdpr[item.key] ? "bg-primary" : "bg-muted"} ${item.key === "anonymizeIp" ? "cursor-not-allowed opacity-70" : ""}`}
                        >
                          <span className={`block w-5 h-5 rounded-full bg-white shadow transform transition-transform ${gdpr[item.key] ? "translate-x-5" : "translate-x-0.5"}`} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-3">
                    <div><Label className="text-xs">Data Retention Period (days)</Label><Input type="number" value={gdpr.retentionDays} onChange={(e) => setGdpr((s) => ({ ...s, retentionDays: parseInt(e.target.value) || 365 }))} className="mt-1" /></div>
                    <div><Label className="text-xs">Data Protection Officer Email</Label><Input value={gdpr.dpoEmail} onChange={(e) => setGdpr((s) => ({ ...s, dpoEmail: e.target.value }))} className="mt-1" /></div>
                    <div><Label className="text-xs">Privacy Policy URL</Label><Input value={gdpr.privacyUrl || buildSiteUrl("/privacy")} onChange={(e) => setGdpr((s) => ({ ...s, privacyUrl: e.target.value }))} className="mt-1" /></div>
                    <div><Label className="text-xs">Cookie Policy URL</Label><Input value={gdpr.cookieUrl || buildSiteUrl("/cookies")} onChange={(e) => setGdpr((s) => ({ ...s, cookieUrl: e.target.value }))} className="mt-1" /></div>
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

            <ConsentAuditLog />
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
