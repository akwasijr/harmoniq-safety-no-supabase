"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCompanyParam } from "@/hooks/use-company-param";
import {
  Search,
  Package,
  MapPin,
  CheckCircle,
  AlertTriangle,
  Clock,
  ChevronRight,
  QrCode,
  Plus,
  List,
  Wrench,
  ClipboardCheck,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAssetsStore } from "@/stores/assets-store";
import { useLocationsStore } from "@/stores/locations-store";
import { useWorkOrdersStore } from "@/stores/work-orders-store";
import { useInspectionRoutesStore } from "@/stores/inspection-routes-store";
import { useTranslation } from "@/i18n";

const STATUS_CONFIG: Record<string, { color: string; icon: React.ComponentType<{ className?: string }> }> = {
  active: { color: "text-success", icon: CheckCircle },
  maintenance: { color: "text-warning", icon: Clock },
  inactive: { color: "text-muted-foreground", icon: AlertTriangle },
  retired: { color: "text-destructive", icon: AlertTriangle },
};

type SubTab = "browse" | "rounds" | "work";

export default function EmployeeAssetsPage() {
  const company = useCompanyParam();
  const router = useRouter();
  const { items: assets } = useAssetsStore();
  const { items: locations } = useLocationsStore();
  const { items: workOrders } = useWorkOrdersStore();
  const { items: inspectionRoutes } = useInspectionRoutesStore();
  const { t, formatDate } = useTranslation();

  const [activeTab, setActiveTab] = React.useState<SubTab>("browse");
  const [search, setSearch] = React.useState("");
  const [browseSearch, setBrowseSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [categoryFilter, setCategoryFilter] = React.useState<string>("all");

  const myOpenWorkOrders = workOrders.filter(wo => wo.status === "in_progress" || wo.status === "approved");

  // Search results for the Find tab (only when user types)
  const searchResults = React.useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return assets.filter(a =>
      a.name.toLowerCase().includes(q) ||
      a.serial_number?.toLowerCase().includes(q) ||
      a.asset_tag?.toLowerCase().includes(q)
    ).slice(0, 10);
  }, [assets, search]);

  // Browse filtered list
  const browseFiltered = React.useMemo(() => {
    let result = assets;
    if (browseSearch) {
      const q = browseSearch.toLowerCase();
      result = result.filter(a =>
        a.name.toLowerCase().includes(q) ||
        a.serial_number?.toLowerCase().includes(q) ||
        a.asset_tag?.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "all") {
      result = result.filter(a => a.status === statusFilter);
    }
    if (categoryFilter !== "all") {
      result = result.filter(a => a.category === categoryFilter);
    }
    return result;
  }, [assets, browseSearch, statusFilter, categoryFilter]);

  const categories = React.useMemo(() => {
    const cats = new Set(assets.map(a => a.category));
    return Array.from(cats).sort();
  }, [assets]);

  const activeRoutes = inspectionRoutes.filter(r => r.status === "active");

  const tabs = [
    { id: "browse" as SubTab, label: t("assets.tabs.assets"), icon: List },
    { id: "rounds" as SubTab, label: t("inspectionRounds.title"), icon: ClipboardCheck, count: activeRoutes.length },
    { id: "work" as SubTab, label: t("workOrders.title"), icon: Wrench, count: myOpenWorkOrders.length },
  ];

  return (
    <div className="flex flex-col min-h-full pb-20">
      {/* Header */}
      <div className="sticky top-14 z-10 bg-background border-b px-4 pt-4 pb-3">
        <h1 className="text-lg font-bold mb-3">{t("nav.assets")}</h1>

        <div className="flex gap-1 bg-muted rounded-lg p-1 overflow-x-auto" role="tablist">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-medium rounded-md transition-all whitespace-nowrap",
                  isActive
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">{tab.label}</span>
                {tab.count ? (
                  <span className="ml-1 bg-primary/10 text-primary text-[10px] px-1.5 py-0.5 rounded-full">{tab.count}</span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* ====== BROWSE TAB ====== */}
      {activeTab === "browse" && (
        <div>
          {/* Filters bar */}
          <div className="px-4 pt-3 pb-2 space-y-2">
            {/* Search within browse */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder={t("assets.placeholders.searchByNameSerialTag")}
                value={browseSearch}
                onChange={e => setBrowseSearch(e.target.value)}
                className="w-full rounded-lg border bg-muted/50 py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Filter chips */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="rounded-lg border bg-muted/50 px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">{t("common.all")}: {t("incidents.labels.status")}</option>
                {["active", "maintenance", "inactive", "retired"].map(s => (
                  <option key={s} value={s}>{t(`assets.statuses.${s}`)}</option>
                ))}
              </select>

              {/* Category filter */}
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="rounded-lg border bg-muted/50 px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">{t("common.all")}: {t("incidents.labels.type")}</option>
                {categories.map(c => (
                  <option key={c} value={c}>{c.replace(/_/g, " ")}</option>
                ))}
              </select>

              {(statusFilter !== "all" || categoryFilter !== "all") && (
                <button
                  onClick={() => { setStatusFilter("all"); setCategoryFilter("all"); }}
                  className="text-xs text-primary font-medium whitespace-nowrap px-2"
                >
                  {t("common.clear")}
                </button>
              )}
            </div>
          </div>

          {/* Count */}
          <div className="px-4 pb-2">
            <p className="text-xs text-muted-foreground">
              {browseFiltered.length} {browseFiltered.length !== 1 ? t("assets.assetCountPlural", { count: browseFiltered.length }) : t("assets.assetCount", { count: browseFiltered.length })}
            </p>
          </div>

          {/* Asset list */}
          <div className="px-4 space-y-2">
            {browseFiltered.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-sm font-medium text-muted-foreground">{t("assets.noAssetsFound")}</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  {browseSearch ? t("assets.tryDifferentSearch") : t("assets.noAssetsAvailable")}
                </p>
              </div>
            ) : (
              browseFiltered.map(asset => {
                const location = asset.location_id ? locations.find(l => l.id === asset.location_id) : null;
                const config = STATUS_CONFIG[asset.status] || STATUS_CONFIG.active;
                const StatusIcon = config.icon;
                return (
                  <Link key={asset.id} href={`/${company}/app/asset?id=${asset.id}`} className="block">
                    <Card className="hover:bg-muted/50 transition-colors">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium text-sm truncate">{asset.name}</h3>
                              <StatusIcon className={cn("h-3.5 w-3.5 shrink-0", config.color)} />
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {asset.asset_tag || asset.serial_number || asset.category.replace(/_/g, " ")}
                            </p>
                            {location && (
                              <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                                <MapPin className="h-3 w-3" />
                                <span className="truncate">{location.name}</span>
                              </div>
                            )}
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ====== INSPECTION ROUNDS TAB ====== */}
      {activeTab === "rounds" && (
        <div className="px-4 pt-4 space-y-3">
          {activeRoutes.length === 0 ? (
            <div className="text-center py-12">
              <ClipboardCheck className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-sm font-medium text-muted-foreground">{t("inspectionRounds.noRoutes")}</p>
              <p className="text-xs text-muted-foreground mt-1">{t("inspectionRounds.noRoutesDesc")}</p>
            </div>
          ) : (
            activeRoutes.map((route) => (
              <Link key={route.id} href={`/${company}/app/inspection-round?route=${route.id}`}>
                <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                        <ClipboardCheck className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{route.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {route.checkpoints.length} {t("inspectionRounds.checkpoints")} • {t(`inspectionRounds.recurrence.${route.recurrence}`)}
                        </p>
                        {route.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{route.description}</p>
                        )}
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </div>
      )}

      {/* ====== MY WORK TAB ====== */}
      {activeTab === "work" && (
        <div className="px-4 pt-4 space-y-3">
          {myOpenWorkOrders.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-10 w-10 mx-auto mb-3 text-success/50" />
              <p className="text-sm font-medium text-muted-foreground">{t("assets.work_orders_empty_title") || "All caught up!"}</p>
              <p className="text-xs text-muted-foreground/70 mt-1">{t("assets.work_orders_empty_description") || "No open work orders assigned to you"}</p>
            </div>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                {myOpenWorkOrders.length} open work order{myOpenWorkOrders.length !== 1 ? "s" : ""}
              </p>
              {myOpenWorkOrders.map(wo => {
                const asset = assets.find(a => a.id === wo.asset_id);
                return (
                  <Link key={wo.id} href={`/${company}/app/asset?id=${wo.asset_id}`} className="block">
                    <Card className="hover:bg-muted/50 transition-colors">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-sm truncate">{wo.title}</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {asset?.name || "Unknown asset"} · {wo.priority}
                            </p>
                            <div className="flex items-center gap-3 mt-1.5">
                              <span className="text-xs capitalize">
                                {wo.status.replace(/_/g, " ")}
                              </span>
                              {wo.due_date && (
                                <span className="text-xs text-muted-foreground">
                                  Due: {formatDate(wo.due_date)}
                                </span>
                              )}
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}
