"use client";

import * as React from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Location {
  lat: number;
  lng: number;
  city: string | null;
  country: string;
  count: number;
}

export default function LeafletMap({ locations }: { locations: Location[] }) {
  const mapRef = React.useRef<HTMLDivElement>(null);
  const mapInstanceRef = React.useRef<L.Map | null>(null);

  React.useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [20, 0],
      zoom: 2,
      minZoom: 2,
      maxZoom: 12,
      scrollWheelZoom: true,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
      maxZoom: 18,
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  React.useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing markers
    map.eachLayer((layer) => {
      if (layer instanceof L.CircleMarker) map.removeLayer(layer);
    });

    // Add markers for each location
    locations.forEach((loc) => {
      const radius = Math.min(6 + loc.count * 2, 20);
      L.circleMarker([loc.lat, loc.lng], {
        radius,
        fillColor: "#2563eb",
        color: "#1d4ed8",
        weight: 2,
        opacity: 0.8,
        fillOpacity: 0.5,
      })
        .addTo(map)
        .bindPopup(
          `<strong>${loc.city || loc.country}</strong><br/>${loc.count} visitor${loc.count !== 1 ? "s" : ""}`
        );
    });

    // Fit bounds if locations exist
    if (locations.length > 0) {
      const bounds = L.latLngBounds(locations.map((l) => [l.lat, l.lng]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 6 });
    }
  }, [locations]);

  return <div ref={mapRef} className="w-full h-full" style={{ minHeight: 400 }} />;
}
