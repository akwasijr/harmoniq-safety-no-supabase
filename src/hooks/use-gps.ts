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

    const onSuccess = (pos: GeolocationPosition) => {
      setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      setLoading(false);
    };

    // Try high accuracy first, fall back to low accuracy on failure
    navigator.geolocation.getCurrentPosition(
      onSuccess,
      () => {
        navigator.geolocation.getCurrentPosition(
          onSuccess,
          (err) => {
            setError(err.message);
            setLoading(false);
          },
          { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 }
        );
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 }
    );
  }, []);

  return { coords, loading, error, captureLocation };
}
