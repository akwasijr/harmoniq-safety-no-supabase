"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCompanyParam } from "@/hooks/use-company-param";
import { useAuth } from "@/hooks/use-auth";
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
  ScanLine,
  X,
  ArrowUpDown,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAssetsStore } from "@/stores/assets-store";
import { useLocationsStore } from "@/stores/locations-store";
import { useWorkOrdersStore } from "@/stores/work-orders-store";
import { useInspectionRoutesStore } from "@/stores/inspection-routes-store";
import { useTranslation } from "@/i18n";
import { LoadingPage } from "@/components/ui/loading";
import { NoDataEmptyState } from "@/components/ui/empty-state";
import { isAssignedToUserOrTeam } from "@/lib/assignment-utils";
import { QuickActionFAB } from "@/components/ui/quick-action-fab";

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
  const { user } = useAuth();
  const { items: assets, isLoading } = useAssetsStore();
  const { items: locations } = useLocationsStore();
  const { items: workOrders } = useWorkOrdersStore();
  const { items: inspectionRoutes } = useInspectionRoutesStore();
  const { t, formatDate } = useTranslation();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = React.useState<SubTab>(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "work" || tabParam === "rounds" || tabParam === "browse") return tabParam;
    return "browse";
  });
  const [search, setSearch] = React.useState("");
  const [browseSearch, setBrowseSearch] = React.useState("");
  const [browseSearchOpen, setBrowseSearchOpen] = React.useState(false);
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [categoryFilter, setCategoryFilter] = React.useState<string>("all");

  const companyAssets = React.useMemo(
    () =>
      assets.filter((asset) => !user || asset.company_id === user.company_id),
    [assets, user],
  );

  const myOpenWorkOrders = workOrders.filter(
    (wo) =>
      wo.company_id === user?.company_id &&
      !["completed", "cancelled"].includes(wo.status),
  );

  // Search results for the Find tab (only when user types)
  const searchResults = React.useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return companyAssets.filter(a =>
      a.name.toLowerCase().includes(q) ||
      a.serial_number?.toLowerCase().includes(q) ||
      a.asset_tag?.toLowerCase().includes(q)
    ).slice(0, 10);
  }, [companyAssets, search]);

  // Browse filtered list
  const browseFiltered = React.useMemo(() => {
    let result = companyAssets;
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
  }, [companyAssets, browseSearch, statusFilter, categoryFilter]);

  const categories = React.useMemo(() => {
    const cats = new Set(companyAssets.map(a => a.category));
    return Array.from(cats).sort();
  }, [companyAssets]);

  const activeRoutes = inspectionRoutes.filter(
    (route) =>
      route.company_id === user?.company_id &&
      route.status === "active" &&
      (
        (!route.assigned_to_user_id && !route.assigned_to_team_id) ||
        route.assigned_to_user_id === user?.id ||
        (route.assigned_to_team_id
          ? user?.team_ids?.includes(route.assigned_to_team_id)
          : false)
      ),
  );

  if (isLoading && assets.length === 0) {
    return <LoadingPage />;
  }

  const tabs = [
    { id: "browse" as SubTab, label: t("assets.tabs.assets"), icon: List },
    { id: "rounds" as SubTab, label: t("inspectionRounds.title"), icon: ClipboardCheck, count: activeRoutes.length },
    { id: "work" as SubTab, label: t("workOrders.title"), icon: Wrench, count: myOpenWorkOrders.length },
  ];

  return (
    <div className="flex flex-col min-h-full pb-20">
      {/* Header */}
      <div className="sticky top-[60px] z-10 bg-background border-b px-4 pt-4 pb-3">
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
                  <span className="ml-0.5 h-2 w-2 rounded-full bg-blue-500 shrink-0" />
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
            {/* Search — toggle */}
            {browseSearchOpen && (
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input
                  value={browseSearch}
                  onChange={(e) => setBrowseSearch(e.target.value)}
                  placeholder={t("assets.placeholders.searchByNameSerialTag")}
                  className="h-8 pl-8 pr-8 text-sm"
                  autoFocus
                />
                <button type="button" onClick={() => { setBrowseSearchOpen(false); setBrowseSearch(""); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Filter pills + Sort + Scan */}
            <div className="flex items-center gap-2">
              {!browseSearchOpen && (
                <button
                  type="button"
                  onClick={() => setBrowseSearchOpen(true)}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  aria-label="Search"
                >
                  <Search className="h-4 w-4" />
                </button>
              )}
              {[
                { value: "all", label: t("common.all") || "All" },
                { value: "active", label: t("assets.statuses.active") || "Active" },
                { value: "maintenance", label: t("assets.statuses.maintenance") || "Maintenance" },
                { value: "inactive", label: t("assets.statuses.inactive") || "Inactive" },
              ].map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setStatusFilter(filter.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all active:scale-95 ${
                    statusFilter === filter.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
              <Link
                href={`/${company}/app/scan`}
                className="ml-auto p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="Scan QR code"
              >
                <ScanLine className="h-4 w-4" />
              </Link>
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
              <NoDataEmptyState entityName="assets" />
            ) : (
              browseFiltered.map(asset => {
                const location = asset.location_id ? locations.find(l => l.id === asset.location_id) : null;
                const config = STATUS_CONFIG[asset.status] || STATUS_CONFIG.active;
                const StatusIcon = config.icon;
                return (
                  <Link key={asset.id} href={`/${company}/app/asset?id=${asset.id}`} className="block">
                    <Card className="hover:bg-muted/50 active:bg-muted/70 transition-colors">
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
            <NoDataEmptyState entityName="inspection rounds" />
          ) : (
            activeRoutes.map((route) => (
              <Link key={route.id} href={`/${company}/app/inspection-round?route=${route.id}`}>
                <Card className="hover:bg-muted/50 active:bg-muted/70 transition-colors cursor-pointer">
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
            <NoDataEmptyState entityName="work orders" />
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                {myOpenWorkOrders.length !== 1
                  ? t("assets.openWorkOrdersPlural", { count: myOpenWorkOrders.length })
                  : t("assets.openWorkOrders", { count: myOpenWorkOrders.length })}
              </p>
              {myOpenWorkOrders.map(wo => {
                const asset = assets.find(a => a.id === wo.asset_id);
                const woOverdue = wo.due_date && !["completed", "cancelled"].includes(wo.status) && new Date(wo.due_date) < new Date();
                const typeLabel = wo.type?.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
                return (
                  <Link key={wo.id} href={`/${company}/app/tasks/work-orders/${wo.id}`} className="block">
                    <Card className="hover:bg-muted/50 active:bg-muted/70 transition-colors">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-sm truncate">{wo.title}</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {asset?.name || t("assets.unknownAsset")} · {wo.priority}
                            </p>
                            <div className="flex items-center gap-2 flex-wrap mt-1.5">
                              {typeLabel && <Badge variant="outline" className="text-[10px] py-0">{typeLabel}</Badge>}
                              <span className="text-xs capitalize">
                                {wo.status.replace(/_/g, " ")}
                              </span>
                              {wo.due_date && (
                                <span className={cn("text-xs", woOverdue ? "text-red-600 dark:text-red-400 font-medium" : "text-muted-foreground")}>
                                  {woOverdue ? "Overdue" : `Due: ${formatDate(wo.due_date)}`}
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

      {/* Assets FAB */}
      <QuickActionFAB
        actions={[
          { id: "scan", label: "Scan QR Code", icon: ScanLine, href: `/${company}/app/scan` },
          { id: "browse", label: "Add New Asset", icon: Plus, href: `/${company}/app/assets/new` },
        ]}
      />
    </div>
  );
}
