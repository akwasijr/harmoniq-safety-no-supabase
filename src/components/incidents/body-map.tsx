"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface InjuryMarker {
  id: string;
  body_part: string;
  view: "front" | "back";
  x: number;
  y: number;
  description?: string;
}

// Predefined body part zones with center positions (% of 200x400 viewBox)
const BODY_ZONES_FRONT: { part: string; x: number; y: number; w: number; h: number }[] = [
  { part: "Head",            x: 50, y: 7,  w: 22, h: 12 },
  { part: "Neck",            x: 50, y: 17, w: 10, h: 4 },
  { part: "Left shoulder",   x: 32, y: 21, w: 12, h: 6 },
  { part: "Right shoulder",  x: 68, y: 21, w: 12, h: 6 },
  { part: "Chest",           x: 50, y: 28, w: 28, h: 12 },
  { part: "Abdomen",         x: 50, y: 42, w: 24, h: 10 },
  { part: "Left arm",        x: 22, y: 33, w: 10, h: 16 },
  { part: "Right arm",       x: 78, y: 33, w: 10, h: 16 },
  { part: "Left hand",       x: 16, y: 52, w: 8,  h: 6 },
  { part: "Right hand",      x: 84, y: 52, w: 8,  h: 6 },
  { part: "Left hip",        x: 40, y: 53, w: 10, h: 6 },
  { part: "Right hip",       x: 60, y: 53, w: 10, h: 6 },
  { part: "Left leg",        x: 40, y: 68, w: 10, h: 20 },
  { part: "Right leg",       x: 60, y: 68, w: 10, h: 20 },
  { part: "Left knee",       x: 40, y: 78, w: 8,  h: 6 },
  { part: "Right knee",      x: 60, y: 78, w: 8,  h: 6 },
  { part: "Left foot",       x: 39, y: 96, w: 8,  h: 4 },
  { part: "Right foot",      x: 61, y: 96, w: 8,  h: 4 },
];

const BODY_ZONES_BACK: { part: string; x: number; y: number; w: number; h: number }[] = [
  { part: "Head",            x: 50, y: 7,  w: 22, h: 12 },
  { part: "Neck",            x: 50, y: 17, w: 10, h: 4 },
  { part: "Upper back",      x: 50, y: 28, w: 28, h: 12 },
  { part: "Lower back",      x: 50, y: 42, w: 24, h: 10 },
  { part: "Left shoulder",   x: 32, y: 21, w: 12, h: 6 },
  { part: "Right shoulder",  x: 68, y: 21, w: 12, h: 6 },
  { part: "Left arm",        x: 22, y: 33, w: 10, h: 16 },
  { part: "Right arm",       x: 78, y: 33, w: 10, h: 16 },
  { part: "Left hand",       x: 16, y: 52, w: 8,  h: 6 },
  { part: "Right hand",      x: 84, y: 52, w: 8,  h: 6 },
  { part: "Left hip",        x: 40, y: 53, w: 10, h: 6 },
  { part: "Right hip",       x: 60, y: 53, w: 10, h: 6 },
  { part: "Left leg",        x: 40, y: 68, w: 10, h: 20 },
  { part: "Right leg",       x: 60, y: 68, w: 10, h: 20 },
  { part: "Left knee",       x: 40, y: 78, w: 8,  h: 6 },
  { part: "Right knee",      x: 60, y: 78, w: 8,  h: 6 },
  { part: "Left foot",       x: 39, y: 96, w: 8,  h: 4 },
  { part: "Right foot",      x: 61, y: 96, w: 8,  h: 4 },
];

function BodySVG({ view }: { view: "front" | "back" }) {
  return (
    <svg viewBox="0 0 200 400" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity={0.25}>
      <ellipse cx="100" cy="35" rx="22" ry="28" />
      <line x1="92" y1="63" x2="92" y2="78" />
      <line x1="108" y1="63" x2="108" y2="78" />
      <path d="M70 78 Q60 85 58 120 Q56 180 65 210 L80 210 Q85 195 100 195 Q115 195 120 210 L135 210 Q144 180 142 120 Q140 85 130 78 Z" />
      <path d="M70 78 Q50 90 38 130 Q30 160 28 190 Q26 200 32 210" />
      <path d="M130 78 Q150 90 162 130 Q170 160 172 190 Q174 200 168 210" />
      <path d="M80 210 Q78 260 76 310 Q74 350 72 380 Q70 395 78 398" />
      <path d="M120 210 Q122 260 124 310 Q126 350 128 380 Q130 395 122 398" />
      {view === "back" && <line x1="100" y1="78" x2="100" y2="195" strokeDasharray="4 4" />}
    </svg>
  );
}

interface BodyMapProps {
  markers: InjuryMarker[];
  onAddMarker?: (marker: InjuryMarker) => void;
  onRemoveMarker?: (id: string) => void;
  readOnly?: boolean;
  className?: string;
}

export function BodyMap({ markers, onAddMarker, onRemoveMarker, readOnly = false, className }: BodyMapProps) {
  const [activeView, setActiveView] = React.useState<"front" | "back">("front");

  const zones = activeView === "front" ? BODY_ZONES_FRONT : BODY_ZONES_BACK;
  const viewMarkers = markers.filter((m) => m.view === activeView);
  const markedParts = new Set(markers.map((m) => `${m.view}:${m.body_part}`));

  const handleZoneTap = (zone: typeof zones[0]) => {
    if (readOnly || markers.length >= 5) return;
    const key = `${activeView}:${zone.part}`;
    if (markedParts.has(key)) return; // already marked
    onAddMarker?.({
      id: `marker_${typeof crypto !== "undefined" ? crypto.randomUUID() : ""}`,
      body_part: zone.part,
      view: activeView,
      x: zone.x,
      y: zone.y,
    });
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* View toggle */}
      <div className="flex gap-1 bg-muted rounded-lg p-1">
        {(["front", "back"] as const).map((view) => (
          <button
            key={view}
            type="button"
            onClick={() => setActiveView(view)}
            className={cn(
              "flex-1 py-1.5 text-xs font-medium rounded-md transition-colors capitalize",
              activeView === view ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
            )}
          >
            {view}
          </button>
        ))}
      </div>

      {/* Body diagram with tappable zones */}
      <div className="relative aspect-[1/2] max-h-[320px] mx-auto w-full max-w-[160px]">
        <BodySVG view={activeView} />

        {/* Tappable zones */}
        {!readOnly && zones.map((zone) => {
          const key = `${activeView}:${zone.part}`;
          const isMarked = markedParts.has(key);
          return (
            <button
              key={zone.part}
              type="button"
              onClick={() => handleZoneTap(zone)}
              disabled={isMarked || markers.length >= 5}
              className={cn(
                "absolute rounded-md transition-all",
                isMarked
                  ? "bg-destructive/20 border border-destructive/40"
                  : "hover:bg-primary/10 active:bg-primary/20",
              )}
              style={{
                left: `${zone.x - zone.w / 2}%`,
                top: `${zone.y - zone.h / 2}%`,
                width: `${zone.w}%`,
                height: `${zone.h}%`,
              }}
              title={zone.part}
            />
          );
        })}

        {/* Placed markers */}
        {viewMarkers.map((marker, idx) => (
          <div
            key={marker.id}
            className="absolute flex items-center justify-center pointer-events-none"
            style={{ left: `${marker.x}%`, top: `${marker.y}%`, transform: "translate(-50%, -50%)" }}
          >
            <div className="h-5 w-5 rounded-full bg-destructive text-white flex items-center justify-center text-[10px] font-bold shadow pointer-events-auto">
              {idx + 1}
            </div>
          </div>
        ))}

        {!readOnly && markers.length < 5 && (
          <p className="absolute bottom-0 left-0 right-0 text-center text-[10px] text-muted-foreground">
            Tap a body part to mark
          </p>
        )}
      </div>

      {/* Marker list */}
      {markers.length > 0 && (
        <div className="space-y-1">
          {markers.map((marker, idx) => (
            <div key={marker.id} className="flex items-center gap-2 text-xs">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-white text-[9px] font-bold shrink-0">
                {idx + 1}
              </span>
              <span className="text-muted-foreground capitalize">{marker.view}</span>
              <span className="font-medium">{marker.body_part}</span>
              {!readOnly && onRemoveMarker && (
                <button type="button" className="ml-auto text-muted-foreground hover:text-destructive text-[10px]" onClick={() => onRemoveMarker(marker.id)}>
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
