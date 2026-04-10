"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { hasValidCoordinates } from "@/lib/map-utils";

const LIGHT_TILES = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const DARK_TILES = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#dc2626",
  high: "#ea580c",
  medium: "#b45309",
  low: "#059669",
};

export interface IncidentMapMarker {
  id: string;
  title: string;
  severity: string;
  status: string;
  type: string;
  lat: number;
  lng: number;
  date: string;
  reference: string;
}

interface IncidentMapProps {
  markers: IncidentMapMarker[];
  center?: [number, number];
  zoom?: number;
  height?: string;
  darkMode?: boolean;
  onMarkerClick?: (id: string) => void;
}

export function IncidentMap({
  markers,
  center,
  zoom = 12,
  height = "500px",
  darkMode = false,
  onMarkerClick,
}: IncidentMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const defaultCenter: [number, number] = center || [29.7604, -95.3698];
    const map = L.map(mapRef.current, {
      zoomControl: true,
      attributionControl: false,
    }).setView(defaultCenter, zoom);

    L.tileLayer(darkMode ? DARK_TILES : LIGHT_TILES, {
      maxZoom: 19,
    }).addTo(map);

    mapInstance.current = map;
    requestAnimationFrame(() => map.invalidateSize());

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, [darkMode]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    map.eachLayer((layer) => {
      if (layer instanceof L.CircleMarker) {
        map.removeLayer(layer);
      }
    });

    const valid = markers.filter((m) => hasValidCoordinates(m.lat, m.lng));
    valid.forEach((marker) => {
      const color = SEVERITY_COLORS[marker.severity] || SEVERITY_COLORS.medium;

      const circle = L.circleMarker([marker.lat, marker.lng], {
        radius: 8,
        fillColor: color,
        color: darkMode ? "#1e293b" : "#ffffff",
        weight: 2,
        opacity: 1,
        fillOpacity: 0.85,
      }).addTo(map);

      circle.bindPopup(`
        <div style="min-width:140px;font-family:system-ui;font-size:13px">
          <strong>${marker.title}</strong>
          <br/><span style="color:#888;font-size:11px">${marker.reference} · ${marker.date}</span>
          <br/><span style="display:inline-block;margin-top:4px;padding:1px 6px;border-radius:4px;font-size:10px;font-weight:600;color:white;background:${color}">${marker.severity}</span>
        </div>
      `);

      if (onMarkerClick) {
        circle.on("click", () => onMarkerClick(marker.id));
      }
    });

    if (valid.length > 0) {
      const bounds = L.latLngBounds(valid.map((m) => [m.lat, m.lng] as [number, number]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }

    requestAnimationFrame(() => map.invalidateSize());
  }, [markers, darkMode, onMarkerClick]);

  return (
    <div
      ref={mapRef}
      style={{ height, width: "100%", borderRadius: "8px" }}
      className="border"
    />
  );
}
