"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCompanyParam } from "@/hooks/use-company-param";
import { useAuth } from "@/hooks/use-auth";
import { useAssetsStore } from "@/stores/assets-store";
import { useInspectionRoutesStore } from "@/stores/inspection-routes-store";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NoDataEmptyState } from "@/components/ui/empty-state";
import { LoadingPage } from "@/components/ui/loading";
import { useTranslation } from "@/i18n";
import {
  ChevronRight,
  ClipboardCheck,
  MapPin,
  ScanLine,
  Search,
  ShieldCheck,
  User,
  Users,
} from "lucide-react";

type RouteAudience = "assigned" | "team" | "tenant";

/**
 * /inspection route handler:
 * - If ?asset=<id> is present, redirect to /inspection/[assetId] to start an inspection
 * - Otherwise, show inspection work available to the field user
 */
function InspectionIndexPageContent() {
  const router = useRouter();
  const company = useCompanyParam();
  const searchParams = useSearchParams();
  const assetParam = searchParams.get("asset");
  const { user } = useAuth();
  const { items: assets, isLoading: isAssetsLoading } = useAssetsStore();
  const { items: routes, isLoading: isRoutesLoading } = useInspectionRoutesStore();
  const { t } = useTranslation();

  React.useEffect(() => {
    if (assetParam) {
      router.replace(`/${company}/app/inspection/${assetParam}`);
    }
  }, [assetParam, company, router]);

  const activeAssets = React.useMemo(
    () =>
      assets
        .filter((asset) => !user || asset.company_id === user.company_id)
        .filter((asset) => asset.status === "active")
        .slice(0, 8),
    [assets, user],
  );

  const visibleRoutes = React.useMemo(() => {
    if (!user) return [];

    const getAudience = (routeUserId: string | null, routeTeamId: string | null): RouteAudience => {
      if (routeUserId === user.id) return "assigned";
      if (routeTeamId && user.team_ids?.includes(routeTeamId)) return "team";
      return "tenant";
    };

    return routes
      .filter((route) => route.company_id === user.company_id && route.status === "active")
      .filter((route) => {
        if (route.assigned_to_user_id) return route.assigned_to_user_id === user.id;
        if (route.assigned_to_team_id) return user.team_ids?.includes(route.assigned_to_team_id) ?? false;
        return true;
      })
      .map((route) => ({
        route,
        audience: getAudience(route.assigned_to_user_id, route.assigned_to_team_id),
      }))
      .sort((a, b) => {
        const weight: Record<RouteAudience, number> = { assigned: 0, team: 1, tenant: 2 };
        return weight[a.audience] - weight[b.audience] || a.route.name.localeCompare(b.route.name);
      });
  }, [routes, user]);

  if (isAssetsLoading || isRoutesLoading || !user) {
    return <LoadingPage />;
  }

  const audienceBadge = (audience: RouteAudience) => {
    if (audience === "assigned") {
      return {
        label: t("inspectionRounds.assignedToYou") || "Assigned to you",
        icon: User,
        className: "bg-primary/10 text-primary",
      };
    }

    if (audience === "team") {
      return {
        label: t("inspectionRounds.teamAssigned") || "Assigned to your team",
        icon: Users,
        className: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
      };
    }

    return {
      label: t("inspectionRounds.availableToAll") || "Available to your company",
      icon: ShieldCheck,
      className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    };
  };

  return (
    <div className="flex min-h-full flex-col pb-20">
      <div className="sticky top-14 z-10 border-b bg-background px-4 pt-4 pb-3">
        <h1 className="text-lg font-bold">{t("inspectionRounds.title") || "Inspection work"}</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("inspectionRounds.workerHubHint") || "Run published inspection rounds or inspect an individual asset."}
        </p>
      </div>

      <div className="space-y-4 px-4 pt-4">
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Link
            href={`/${company}/app/assets`}
            className="flex items-start gap-3 rounded-xl border bg-card p-4 transition-colors hover:bg-muted/30"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Search className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold">{t("assets.tabs.assets") || "Browse assets"}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("inspection.assetBrowseHint") || "Choose an asset to inspect directly from the field app."}
              </p>
            </div>
          </Link>

          <Link
            href={`/${company}/app/scan`}
            className="flex items-start gap-3 rounded-xl border bg-card p-4 transition-colors hover:bg-muted/30"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10">
              <ScanLine className="h-5 w-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold">{t("app.scanAsset") || "Scan asset"}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("inspection.scanHint") || "Scan a QR code to open the correct asset or inspection flow faster."}
              </p>
            </div>
          </Link>
        </section>

        <section aria-labelledby="inspection-routes-heading" className="space-y-3">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-primary" aria-hidden="true" />
            <h2 id="inspection-routes-heading" className="text-sm font-semibold">
              {t("inspectionRounds.availableRoutes") || "Inspection rounds"}
            </h2>
          </div>

          {visibleRoutes.length === 0 ? (
            <NoDataEmptyState entityName="inspection routes" />
          ) : (
            visibleRoutes.map(({ route, audience }) => {
              const badge = audienceBadge(audience);
              const AudienceIcon = badge.icon;
              return (
                <Link key={route.id} href={`/${company}/app/inspection-round?route=${route.id}`}>
                  <Card className="transition-colors hover:bg-muted/30">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                          <ClipboardCheck className="h-5 w-5 text-primary" aria-hidden="true" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-semibold">{route.name}</p>
                            <Badge className={badge.className}>
                              <AudienceIcon className="mr-1 h-3 w-3" aria-hidden="true" />
                              {badge.label}
                            </Badge>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {route.checkpoints.length} {t("inspectionRounds.checkpoints") || "checkpoints"} · {t(`inspectionRounds.recurrence.${route.recurrence}`) || route.recurrence}
                          </p>
                          {route.description ? (
                            <p className="mt-1 text-xs text-muted-foreground">{route.description}</p>
                          ) : null}
                        </div>
                        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })
          )}
        </section>

        <section aria-labelledby="asset-inspection-heading" className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
              <h2 id="asset-inspection-heading" className="text-sm font-semibold">
                {t("inspection.inspectAsset") || "Inspect an asset"}
              </h2>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href={`/${company}/app/assets`}>{t("common.viewAll") || "View all"}</Link>
            </Button>
          </div>

          {activeAssets.length === 0 ? (
            <NoDataEmptyState entityName="active assets" />
          ) : (
            <div className="space-y-2">
              {activeAssets.map((asset) => (
                <Link key={asset.id} href={`/${company}/app/inspection/${asset.id}`}>
                  <Card className="transition-colors hover:bg-muted/30">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10">
                          <ShieldCheck className="h-5 w-5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{asset.name}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {asset.asset_tag || asset.serial_number || asset.category.replace(/_/g, " ")}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default function InspectionIndexPage() {
  return (
    <React.Suspense fallback={<div className="flex min-h-[400px] items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}>
      <InspectionIndexPageContent />
    </React.Suspense>
  );
}
