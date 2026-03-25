"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Navigation, X } from "lucide-react";
import { useTranslation } from "@/i18n";
import type { MapMarker } from "@/components/shared/asset-location-map";

const AssetLocationMap = dynamic(
  () =>
    import("@/components/shared/asset-location-map").then((m) => ({
      default: m.AssetLocationMap,
    })),
  { ssr: false }
);

interface GpsPickerProps {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number | null, lng: number | null) => void;
}

export function GpsPicker({ lat, lng, onChange }: GpsPickerProps) {
  const { t } = useTranslation();
  const [geoError, setGeoError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by your browser");
      return;
    }
    setLoading(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onChange(position.coords.latitude, position.coords.longitude);
        setLoading(false);
      },
      (error) => {
        setGeoError(error.message);
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleMapClick = (clickLat: number, clickLng: number) => {
    onChange(
      Math.round(clickLat * 1000000) / 1000000,
      Math.round(clickLng * 1000000) / 1000000
    );
  };

  const handleLatChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === "" || val === "-") {
      onChange(null, lng);
      return;
    }
    const parsed = parseFloat(val);
    if (!isNaN(parsed)) {
      onChange(parsed, lng);
    }
  };

  const handleLngChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === "" || val === "-") {
      onChange(lat, null);
      return;
    }
    const parsed = parseFloat(val);
    if (!isNaN(parsed)) {
      onChange(lat, parsed);
    }
  };

  const handleClear = () => {
    onChange(null, null);
    setGeoError(null);
  };

  const markers: MapMarker[] =
    lat != null && lng != null
      ? [
          {
            id: "picker-pin",
            name: "Selected location",
            type: "location",
            lat,
            lng,
          },
        ]
      : [];

  const hasCoords = lat != null && lng != null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium flex items-center gap-1.5">
          <MapPin className="h-4 w-4" />
          GPS Coordinates
        </Label>
        {hasCoords && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground"
            onClick={handleClear}
          >
            <X className="h-3 w-3 mr-1" />
            {t("gps.clear")}
          </Button>
        )}
      </div>

      {/* Current value or "Not set" */}
      {hasCoords ? (
        <p className="text-xs text-muted-foreground font-mono">
          {lat!.toFixed(6)}, {lng!.toFixed(6)}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground italic">Not set</p>
      )}

      {/* Use My Location button */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
        onClick={handleUseMyLocation}
        disabled={loading}
      >
        <Navigation className="h-4 w-4 mr-1.5" />
        {loading ? "Getting location..." : t("gps.useMyLocation")}
      </Button>

      {geoError && (
        <p className="text-xs text-destructive">{geoError}</p>
      )}

      {/* Mini map */}
      <div className="rounded-md overflow-hidden border">
        <AssetLocationMap
          markers={markers}
          height="200px"
          zoom={hasCoords ? 15 : 2}
          center={hasCoords ? [lat!, lng!] : undefined}
          onMapClick={handleMapClick}
        />
      </div>
      <p className="text-xs text-muted-foreground">{t("gps.clickToPlace")}</p>

      {/* Manual lat/lng inputs */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="gps-lat" className="text-xs">
            {t("gps.latitude")}
          </Label>
          <Input
            id="gps-lat"
            type="number"
            step="any"
            value={lat ?? ""}
            onChange={handleLatChange}
            placeholder="52.3676"
            className="mt-1 text-xs"
          />
        </div>
        <div>
          <Label htmlFor="gps-lng" className="text-xs">
            {t("gps.longitude")}
          </Label>
          <Input
            id="gps-lng"
            type="number"
            step="any"
            value={lng ?? ""}
            onChange={handleLngChange}
            placeholder="4.9041"
            className="mt-1 text-xs"
          />
        </div>
      </div>
    </div>
  );
}
