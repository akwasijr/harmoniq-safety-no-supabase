"use client";

import { MapPin, Navigation, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GpsCaptureBtnProps {
  coords: { lat: number; lng: number } | null;
  loading: boolean;
  error: string | null;
  onCapture: () => void;
}

export function GpsCaptureButton({ coords, loading, error, onCapture }: GpsCaptureBtnProps) {
  return (
    <div className="space-y-1.5">
      {coords ? (
        <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/5 px-3 py-2">
          <MapPin className="h-4 w-4 text-success shrink-0" />
          <span className="text-xs font-mono text-success">
            {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="ml-auto h-6 text-xs text-muted-foreground"
            onClick={onCapture}
          >
            Refresh
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full gap-2"
          onClick={onCapture}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Navigation className="h-4 w-4" />
          )}
          {loading ? "Getting location..." : "Capture Location"}
        </Button>
      )}
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
