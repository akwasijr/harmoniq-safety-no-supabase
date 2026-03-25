"use client";

import { useState, useCallback } from "react";

interface GpsCoords {
  lat: number;
  lng: number;
}

interface UseGpsReturn {
  coords: GpsCoords | null;
  loading: boolean;
  error: string | null;
  captureLocation: () => void;
}

export function useGps(): UseGpsReturn {
  const [coords, setCoords] = useState<GpsCoords | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const captureLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError("GPS not available on this device");
      return;
    }
    setLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  return { coords, loading, error, captureLocation };
}
