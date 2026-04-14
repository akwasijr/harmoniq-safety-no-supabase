"use client";

import * as React from "react";
import { MapPin, Navigation, Pencil, ChevronDown, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LocationOption {
  id: string;
  name: string;
  address?: string | null;
}

export interface LocationPickerValue {
  locationId: string;
  manualText: string;
  gpsLat: number | null;
  gpsLng: number | null;
}

interface LocationPickerProps {
  locations: LocationOption[];
  value: LocationPickerValue;
  onChange: (value: LocationPickerValue) => void;
  label?: string;
  required?: boolean;
  compact?: boolean;
}

type Mode = "select" | "gps" | "manual";

export function LocationPicker({
  locations,
  value,
  onChange,
  label = "Location",
  required = false,
  compact = false,
}: LocationPickerProps) {
  const [mode, setMode] = React.useState<Mode>(
    value.locationId ? "select" : value.gpsLat ? "gps" : value.manualText ? "manual" : "select",
  );
  const [isLocating, setIsLocating] = React.useState(false);
  const [gpsError, setGpsError] = React.useState<string | null>(null);

  const selectedLocation = locations.find((l) => l.id === value.locationId);

  const handleGPS = () => {
    if (!navigator.geolocation) {
      setGpsError("Geolocation is not supported by this browser.");
      return;
    }
    setIsLocating(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onChange({
          ...value,
          locationId: "",
          gpsLat: position.coords.latitude,
          gpsLng: position.coords.longitude,
          manualText: "",
        });
        setMode("gps");
        setIsLocating(false);
      },
      (error) => {
        setGpsError(error.code === 1 ? "Location access denied." : "Unable to get location.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const clearValue = () => {
    onChange({ locationId: "", manualText: "", gpsLat: null, gpsLng: null });
  };

  const modeButtons = (
    <div className={cn("flex rounded-lg border bg-muted/30 p-0.5", compact ? "gap-0.5" : "gap-1")}>
      {[
        { id: "select" as Mode, icon: MapPin, label: "Select" },
        { id: "gps" as Mode, icon: Navigation, label: "GPS" },
        { id: "manual" as Mode, icon: Pencil, label: "Manual" },
      ].map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={() => { setMode(m.id); if (m.id === "gps") handleGPS(); }}
          className={cn(
            "flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
            mode === m.id
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <m.icon className="h-3 w-3" />
          {!compact && m.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">
          {label}{required && <span className="text-destructive ml-0.5">*</span>}
        </label>
        {modeButtons}
      </div>

      {/* Select from existing */}
      {mode === "select" && (
        <div className="relative">
          <select
            value={value.locationId}
            onChange={(e) => {
              onChange({ ...value, locationId: e.target.value, manualText: "", gpsLat: null, gpsLng: null });
            }}
            className="w-full appearance-none rounded-md border bg-background px-3 py-2 pr-8 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Select a location...</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}{loc.address ? ` — ${loc.address}` : ""}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div>
      )}

      {/* GPS */}
      {mode === "gps" && (
        <div className="space-y-2">
          {isLocating ? (
            <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Getting your location...
            </div>
          ) : value.gpsLat && value.gpsLng ? (
            <div className="flex items-center justify-between rounded-md border bg-green-50 dark:bg-green-950/20 p-3">
              <div className="flex items-center gap-2">
                <Navigation className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-800 dark:text-green-400">Location captured</p>
                  <p className="text-xs text-muted-foreground">
                    {value.gpsLat.toFixed(6)}, {value.gpsLng.toFixed(6)}
                  </p>
                </div>
              </div>
              <button type="button" onClick={() => { clearValue(); handleGPS(); }} className="text-xs text-muted-foreground hover:text-foreground underline">
                Refresh
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleGPS}
              className="w-full flex items-center justify-center gap-2 rounded-md border border-dashed p-3 text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
            >
              <Navigation className="h-4 w-4" />
              Tap to get current location
            </button>
          )}
          {gpsError && (
            <p className="text-xs text-destructive">{gpsError}</p>
          )}
        </div>
      )}

      {/* Manual text entry */}
      {mode === "manual" && (
        <div className="relative">
          <input
            type="text"
            value={value.manualText}
            onChange={(e) => {
              onChange({ ...value, manualText: e.target.value, locationId: "", gpsLat: null, gpsLng: null });
            }}
            placeholder="Type location name or address..."
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {value.manualText && (
            <button
              type="button"
              onClick={() => onChange({ ...value, manualText: "" })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Current value summary */}
      {(selectedLocation || value.manualText) && mode === "select" && selectedLocation && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          {selectedLocation.name}
          {selectedLocation.address && ` — ${selectedLocation.address}`}
        </p>
      )}
    </div>
  );
}
