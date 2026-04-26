"use client";

import * as React from "react";
import { MapPin, Navigation, Pencil, ChevronDown, X, Loader2, QrCode, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LocationOption {
  id: string;
  name: string;
  address?: string | null;
  parent_id?: string | null;
  type?: string;
}

export interface LocationPickerValue {
  locationId: string;
  manualText: string;
  gpsLat: number | null;
  gpsLng: number | null;
  gpsAddress?: string;
}

interface LocationPickerProps {
  locations: LocationOption[];
  value: LocationPickerValue;
  onChange: (value: LocationPickerValue) => void;
  label?: string;
  required?: boolean;
  compact?: boolean;
  scanUrl?: string;
}

type Mode = "select" | "gps" | "manual" | "scan";

export function LocationPicker({
  locations,
  value,
  onChange,
  label = "Location",
  required = false,
  compact = false,
  scanUrl,
}: LocationPickerProps) {
  const [mode, setMode] = React.useState<Mode>(
    value.locationId ? "select" : value.gpsLat ? "gps" : value.manualText ? "manual" : "select",
  );
  const [isLocating, setIsLocating] = React.useState(false);
  const [gpsError, setGpsError] = React.useState<string | null>(null);
  const [gpsAddress, setGpsAddress] = React.useState<string | null>(value.gpsAddress || null);
  const [isGeocoding, setIsGeocoding] = React.useState(false);
  const [addressDraft, setAddressDraft] = React.useState<string>(value.manualText || value.gpsAddress || "");
  const [addressEdited, setAddressEdited] = React.useState<boolean>(
    Boolean(value.manualText) && value.manualText !== (value.gpsAddress || ""),
  );

  const selectedLocation = locations.find((l) => l.id === value.locationId);

  const valueRef = React.useRef(value);
  valueRef.current = value;

  const geocodingRef = React.useRef(false);

  // Detect insecure context once. Geolocation only works on HTTPS or localhost.
  const isSecure = React.useMemo(() => {
    if (typeof window === "undefined") return true;
    return window.isSecureContext === true;
  }, []);

  const reverseGeocode = async (lat: number, lng: number) => {
    if (geocodingRef.current) return;
    geocodingRef.current = true;
    setIsGeocoding(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
        headers: { "Accept-Language": "en" },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.display_name) {
          setGpsAddress(data.display_name);
          // Only seed the draft if the user hasn't started editing it yet.
          if (!addressEdited) {
            setAddressDraft(data.display_name);
            onChange({
              ...valueRef.current,
              gpsLat: lat,
              gpsLng: lng,
              gpsAddress: data.display_name,
              manualText: data.display_name,
            });
          } else {
            onChange({ ...valueRef.current, gpsLat: lat, gpsLng: lng, gpsAddress: data.display_name });
          }
        }
      }
    } catch {
      // silently fail — coordinates still work
    } finally {
      setIsGeocoding(false);
      geocodingRef.current = false;
    }
  };

  const handleGPS = () => {
    if (!isSecure) {
      setGpsError(
        "Location requires a secure connection. Open the app over HTTPS (or localhost) to use GPS on this device.",
      );
      return;
    }
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGpsError("Geolocation is not supported by this browser.");
      return;
    }
    setIsLocating(true);
    setGpsError(null);
    setGpsAddress(null);
    setAddressDraft("");
    setAddressEdited(false);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        onChange({
          ...valueRef.current,
          locationId: "",
          gpsLat: lat,
          gpsLng: lng,
          manualText: "",
          gpsAddress: undefined,
        });
        setMode("gps");
        setIsLocating(false);
        reverseGeocode(lat, lng);
      },
      (error) => {
        const msg = error.code === 1
          ? "Location access denied. Allow location for this site in your browser settings, then try again."
          : error.code === 2
            ? "Location unavailable. Make sure GPS / location services are enabled on your device."
            : "Location request timed out. Please try again.";
        setGpsError(msg);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };

  const handleAddressChange = (next: string) => {
    setAddressDraft(next);
    setAddressEdited(next.trim() !== (gpsAddress || "").trim());
    onChange({ ...valueRef.current, manualText: next });
  };

  const resetAddressToDetected = () => {
    if (!gpsAddress) return;
    setAddressDraft(gpsAddress);
    setAddressEdited(false);
    onChange({ ...valueRef.current, manualText: gpsAddress });
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
    <div className="space-y-3">
      <label className="text-sm font-medium">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </label>

      {/* Mode selection — vertical radio-style */}
      <div className="space-y-2">
        {[
          { id: "select" as Mode, icon: MapPin, label: "Select from locations", desc: "Choose from your organisation's locations" },
          { id: "scan" as Mode, icon: QrCode, label: "Scan QR code", desc: "Scan an asset or location QR code" },
          { id: "gps" as Mode, icon: Navigation, label: "Use GPS", desc: "Capture your current coordinates" },
          { id: "manual" as Mode, icon: Pencil, label: "Enter manually", desc: "Type an address or location name" },
        ].map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => { setMode(m.id); if (m.id === "gps") handleGPS(); }}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors",
              mode === m.id
                ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                : "border-border hover:bg-muted/50",
            )}
          >
            <div className={cn(
              "flex h-4 w-4 items-center justify-center rounded-full border-2 shrink-0",
              mode === m.id ? "border-primary" : "border-muted-foreground/30",
            )}>
              {mode === m.id && <div className="h-2 w-2 rounded-full bg-primary" />}
            </div>
            <m.icon className={cn("h-4 w-4 shrink-0", mode === m.id ? "text-primary" : "text-muted-foreground")} />
            <div>
              <p className="text-sm font-medium">{m.label}</p>
              <p className="text-xs text-muted-foreground">{m.desc}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Select from existing — cascading dropdowns */}
      {mode === "select" && (() => {
        const hasHierarchy = locations.some((l) => l.parent_id);

        if (!hasHierarchy) {
          return (
            <div className="relative">
              <select
                value={value.locationId}
                onChange={(e) => onChange({ ...value, locationId: e.target.value, manualText: "", gpsLat: null, gpsLng: null })}
                className="w-full appearance-none rounded-md border-2 border-border bg-muted/20 px-3 py-2 pr-8 text-sm"
              >
                <option value="">Select a location...</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          );
        }

        // Build the selection chain: site → building → floor → zone → room
        const getChildren = (parentId: string | null) =>
          parentId ? locations.filter((l) => l.parent_id === parentId) : locations.filter((l) => !l.parent_id);

        // Walk up from current selection to build the chain of selected IDs
        const chain: Array<{ level: string; selected: string; options: LocationOption[] }> = [];
        const roots = getChildren(null);
        if (roots.length > 0) {
          chain.push({ level: roots[0]?.type || "Site", selected: "", options: roots });
        }

        // Find which root (or deeper) is selected by walking the value up
        if (value.locationId) {
          const path: string[] = [];
          let cur = locations.find((l) => l.id === value.locationId);
          while (cur) {
            path.unshift(cur.id);
            cur = cur.parent_id ? locations.find((l) => l.id === cur!.parent_id) : undefined;
          }

          // Rebuild chain from path
          chain.length = 0;
          let parentId: string | null = null;
          for (const id of path) {
            const options = getChildren(parentId);
            const selected = locations.find((l) => l.id === id);
            chain.push({
              level: selected?.type || (options[0]?.type || "Location"),
              selected: id,
              options,
            });
            parentId = id;
          }
          // Add next level if children exist
          const nextChildren = getChildren(parentId);
          if (nextChildren.length > 0) {
            chain.push({ level: nextChildren[0]?.type || "Location", selected: "", options: nextChildren });
          }
        }

        // Handle selection at any level — clear children below
        const handleSelect = (levelIndex: number, selectedId: string) => {
          if (!selectedId) {
            // Cleared this level — use parent as the value
            const parentValue = levelIndex > 0 ? chain[levelIndex - 1].selected : "";
            onChange({ ...value, locationId: parentValue, manualText: "", gpsLat: null, gpsLng: null });
          } else {
            onChange({ ...value, locationId: selectedId, manualText: "", gpsLat: null, gpsLng: null });
          }
        };

        return (
          <div className="space-y-2">
            {chain.map((level, idx) => (
              <div key={idx}>
                <label className="text-xs text-muted-foreground capitalize mb-1 block">{level.level}</label>
                <div className="relative">
                  <select
                    value={level.selected}
                    onChange={(e) => handleSelect(idx, e.target.value)}
                    className="w-full appearance-none rounded-md border-2 border-border bg-muted/20 px-3 py-2 pr-8 text-sm"
                  >
                    <option value="">Select {level.level}...</option>
                    {level.options.map((loc) => (
                      <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* GPS */}
      {mode === "gps" && (
        <div className="space-y-2">
          {!isSecure && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-900">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-medium">GPS unavailable on this connection</p>
                <p className="text-[11px] leading-relaxed">
                  Browsers only allow location access over HTTPS or localhost. If you&apos;re testing on a phone over LAN
                  (e.g. http://192.168.x.x), the prompt won&apos;t appear. Use HTTPS, a tunnel (e.g. ngrok), or pick the
                  location manually below.
                </p>
              </div>
            </div>
          )}

          {isLocating ? (
            <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Getting your location...
            </div>
          ) : value.gpsLat && value.gpsLng ? (
            <div className="rounded-xl border bg-card overflow-hidden">
              <div className="p-3.5 space-y-3">
                <div className="flex items-start gap-2">
                  <Navigation className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-muted-foreground">Detected address</p>
                      {isGeocoding && (
                        <div className="flex items-center gap-1.5">
                          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground">Looking up…</span>
                        </div>
                      )}
                    </div>
                    <input
                      type="text"
                      value={addressDraft}
                      onChange={(e) => handleAddressChange(e.target.value)}
                      placeholder={isGeocoding ? "Looking up address…" : "Address"}
                      className="mt-1 w-full rounded-md border bg-background px-2.5 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Auto-filled from GPS. You can correct the street number, unit, or building name if it&apos;s off.
                      {addressEdited && gpsAddress && (
                        <>
                          {" "}
                          <button
                            type="button"
                            onClick={resetAddressToDetected}
                            className="text-primary font-medium underline-offset-2 hover:underline"
                          >
                            Reset to detected
                          </button>
                        </>
                      )}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1.5">
                      Coordinates: {value.gpsLat.toFixed(6)}, {value.gpsLng.toFixed(6)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex border-t divide-x divide-border">
                <button
                  type="button"
                  onClick={() => { setGpsAddress(null); clearValue(); handleGPS(); }}
                  className="flex-1 py-2.5 text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
                >
                  Refresh GPS
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleGPS}
              disabled={!isSecure}
              className={cn(
                "w-full flex items-center justify-center gap-2 rounded-md border border-dashed p-3 text-sm transition-colors",
                isSecure
                  ? "text-muted-foreground hover:bg-muted/50"
                  : "text-muted-foreground/50 cursor-not-allowed",
              )}
            >
              <Navigation className="h-4 w-4" />
              {isSecure ? "Tap to get current location" : "GPS unavailable on this connection"}
            </button>
          )}
          {gpsError && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-destructive font-medium">{gpsError}</p>
                {isSecure && (
                  <button type="button" onClick={handleGPS} className="text-xs text-primary font-medium mt-1">Try again</button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Scan QR code */}
      {mode === "scan" && (
        <div className="space-y-2">
          {scanUrl ? (
            <a
              href={scanUrl}
              className="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
            >
              <QrCode className="h-6 w-6" />
              <span>Open QR scanner</span>
            </a>
          ) : (
            <div className="flex flex-col items-center gap-3 rounded-lg border-2 border-dashed p-6">
              <QrCode className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-center text-muted-foreground">Scan an asset or location QR code to auto-fill the location</p>
              <p className="text-xs text-muted-foreground">Use your device camera or the QR scanner in the app</p>
            </div>
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
