"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Building,
  Building2,
  DoorOpen,
  Layers,
  LayoutGrid,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SheetPageShell } from "@/components/layouts/sheet-page-shell";
import { useLocationsStore } from "@/stores/locations-store";
import { useAuth } from "@/hooks/use-auth";
import { LocationType } from "@/types";
import { useTranslation } from "@/i18n";
import { LoadingPage } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";

const LOCATION_TYPE_ICONS: Record<LocationType, React.ComponentType<{ className?: string }>> = {
  site: Building2,
  building: Building,
  floor: Layers,
  zone: LayoutGrid,
  room: DoorOpen,
};

export default function LocationLandingPage() {
  const router = useRouter();
  const routeParams = useParams();
  const rawLocationId = routeParams.locationId;
  const locationId =
    typeof rawLocationId === "string" ? rawLocationId : Array.isArray(rawLocationId) ? rawLocationId[0] : "";

  const { user } = useAuth();
  const { items: locations, isLoading } = useLocationsStore();
  const { t } = useTranslation();

  const locationTypeLabels: Record<string, string> = {
    site: t("locations.types.site"),
    building: t("locations.types.building"),
    floor: t("locations.types.floor"),
    zone: t("locations.types.zone"),
    room: t("locations.types.room"),
  };

  const matchedLocation = locations.find((item) => item.id === locationId);
  const location =
    matchedLocation && user?.company_id && matchedLocation.company_id !== user.company_id
      ? undefined
      : matchedLocation;

  const hierarchy = React.useMemo(() => {
    if (!location) return [];

    const chain: (typeof locations)[number][] = [];
    const seen = new Set<string>();
    let current: (typeof locations)[number] | null = location;

    while (current && !seen.has(current.id)) {
      chain.unshift(current);
      seen.add(current.id);
      const parentId: string | null = current.parent_id;
      current = parentId ? (locations.find((item) => item.id === parentId) ?? null) : null;
    }

    return chain;
  }, [location, locations]);

  if (isLoading && locations.length === 0) {
    return <LoadingPage />;
  }

  if (!location) {
    return (
      <EmptyState
        icon={MapPin}
        title="Location not found"
        description="This location may have been removed or you don't have access."
        action={
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go back
          </Button>
        }
      />
    );
  }

  const LocationIcon = LOCATION_TYPE_ICONS[location.type] || Building;

  return (
    <SheetPageShell title="Location details">
      <div className="mx-auto max-w-lg p-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <LocationIcon className="h-7 w-7 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold">{location.name}</h2>
                <p className="mt-1 text-sm capitalize text-muted-foreground">
                  {locationTypeLabels[location.type] || location.type}
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {hierarchy.map((item, index) => (
                <div key={item.id} className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                    {index + 1}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs capitalize text-muted-foreground">
                      {locationTypeLabels[item.type] || item.type}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {location.address && (
              <div className="mt-6 border-t pt-4">
                <p className="text-xs font-medium text-muted-foreground">Address</p>
                <p className="mt-1 text-sm text-foreground">{location.address}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SheetPageShell>
  );
}
