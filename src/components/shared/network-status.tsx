"use client";

import * as React from "react";
import { WifiOff, Wifi, X } from "lucide-react";
import { cn } from "@/lib/utils";

// ---------- Context ----------

interface NetworkStatusContextValue {
  isOnline: boolean;
  wasOffline: boolean; // True briefly after reconnecting
}

const NetworkStatusContext = React.createContext<NetworkStatusContextValue>({
  isOnline: true,
  wasOffline: false,
});

export function useNetworkStatus() {
  return React.useContext(NetworkStatusContext);
}

// ---------- Provider ----------

export function NetworkStatusProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = React.useState(true);
  const [wasOffline, setWasOffline] = React.useState(false);
  const [showBanner, setShowBanner] = React.useState(false);
  const [showReconnected, setShowReconnected] = React.useState(false);
  const reconnectTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    // Set initial state from browser
    if (typeof navigator !== "undefined") {
      setIsOnline(navigator.onLine);
    }

    const handleOnline = () => {
      setIsOnline(true);
      setShowBanner(false);
      setShowReconnected(true);
      setWasOffline(true);
      // Hide "reconnected" banner after 3s, clearing any previous timer
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = setTimeout(() => {
        setShowReconnected(false);
        setWasOffline(false);
      }, 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowBanner(true);
      setShowReconnected(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    };
  }, []);

  return (
    <NetworkStatusContext.Provider value={{ isOnline, wasOffline }}>
      {children}

      {/* Offline banner — fixed at top */}
      {showBanner && (
        <div
          className={cn(
            "fixed top-0 left-0 right-0 z-[100] flex items-center justify-center gap-2",
            "bg-destructive text-destructive-foreground px-4 py-2.5 text-sm font-medium",
            "animate-in slide-in-from-top duration-300"
          )}
          role="alert"
          aria-live="assertive"
        >
          <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>You are offline. Changes will sync when reconnected.</span>
          <button
            onClick={() => setShowBanner(false)}
            className="ml-2 rounded p-0.5 hover:bg-white/20 transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Reconnected banner */}
      {showReconnected && (
        <div
          className={cn(
            "fixed top-0 left-0 right-0 z-[100] flex items-center justify-center gap-2",
            "bg-emerald-600 text-white px-4 py-2.5 text-sm font-medium",
            "animate-in slide-in-from-top duration-300"
          )}
          role="status"
          aria-live="polite"
        >
          <Wifi className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Back online — your connection has been restored.</span>
        </div>
      )}
    </NetworkStatusContext.Provider>
  );
}
