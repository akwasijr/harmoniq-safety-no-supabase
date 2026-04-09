"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { hasValidCoordinates } from "@/lib/map-utils";

export interface MapMarker {
  id: string;
  name: string;
  type: "location" | "asset";
  lat: number;
  lng: number;
  description?: string;
  status?: string;
}

const LIGHT_TILES = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const DARK_TILES = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

interface AssetLocationMapProps {
  markers: MapMarker[];
  center?: [number, number];
  zoom?: number;
  height?: string;
  darkMode?: boolean;
  onMapClick?: (lat: number, lng: number) => void;
  selectedMarkerId?: string;
}

export function AssetLocationMap({
  markers,
  center,
  zoom = 13,
  height = "400px",
  darkMode = false,
  onMapClick,
  selectedMarkerId,
}: AssetLocationMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const defaultCenter: [number, number] = center || [52.3676, 4.9041];
    const map = L.map(mapRef.current).setView(defaultCenter, zoom);

    L.tileLayer(darkMode ? DARK_TILES : LIGHT_TILES, {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    mapInstance.current = map;
    requestAnimationFrame(() => map.invalidateSize());

    if (onMapClick) {
      map.on("click", (e: L.LeafletMouseEvent) => {
        onMapClick(e.latlng.lat, e.latlng.lng);
      });
    }

    return () => {
      map.remove();
      mapInstance.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    // Clear existing markers (keep tile layer)
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.CircleMarker) {
        map.removeLayer(layer);
      }
    });

    const validMarkers = markers.filter((m) => hasValidCoordinates(m.lat, m.lng));
    validMarkers.forEach((marker) => {
      const color = marker.type === "location" ? "#3b82f6" : "#10b981";
      const isSelected = marker.id === selectedMarkerId;

      const circle = L.circleMarker([marker.lat, marker.lng], {
        radius: isSelected ? 12 : 8,
        fillColor: color,
        color: isSelected ? "#000" : color,
        weight: isSelected ? 3 : 2,
        opacity: 1,
        fillOpacity: 0.7,
      }).addTo(map);

      circle.bindPopup(`
        <div style="min-width:120px">
          <strong>${marker.name}</strong>
          ${marker.description ? `<br/><span style="color:#666">${marker.description}</span>` : ""}
          ${
            marker.status
              ? `<br/><span style="font-size:11px;padding:2px 6px;border-radius:4px;background:${marker.status === "active" ? "#dcfce7" : "#fef3c7"};color:${marker.status === "active" ? "#166534" : "#92400e"}">${marker.status}</span>`
              : ""
          }
        </div>
      `);
    });

    // Fit bounds if we have markers
    if (validMarkers.length > 0) {
      const bounds = L.latLngBounds(
        validMarkers.map((m) => [m.lat, m.lng] as [number, number])
      );
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
    requestAnimationFrame(() => map.invalidateSize());
  }, [markers, selectedMarkerId]);

  return (
    <div
      ref={mapRef}
      style={{ height, width: "100%", borderRadius: "8px" }}
    />
  );
}
