"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import jsQR from "jsqr";
import {
  ArrowLeft,
  QrCode,
  Camera,
  Search,
  Package,
  AlertTriangle,
  MapPin,
  ChevronRight,
  Flashlight,
  FlashlightOff,
  ScanLine,
  Keyboard,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useCompanyParam } from "@/hooks/use-company-param";
import { useCompanyData } from "@/hooks/use-company-data";
import { useTranslation } from "@/i18n";

type ScanMode = "camera" | "manual";
type ScanState = "scanning" | "found" | "not-found";

export default function ScanAssetPage() {
  const router = useRouter();
  const company = useCompanyParam();
  const { assets, locations } = useCompanyData();
  const { t } = useTranslation();

  const [mode, setMode] = React.useState<ScanMode>("camera");
  const [scanState, setScanState] = React.useState<ScanState>("scanning");
  const [manualInput, setManualInput] = React.useState("");
  const [foundAssetId, setFoundAssetId] = React.useState<string | null>(null);
  const [isTorchOn, setIsTorchOn] = React.useState(false);
  const [cameraError, setCameraError] = React.useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const scanIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const [lastScannedCode, setLastScannedCode] = React.useState<string | null>(null);

  const foundAsset = foundAssetId ? assets.find((a) => a.id === foundAssetId) : null;
  const foundLocation = foundAsset?.location_id
    ? locations.find((l) => l.id === foundAsset.location_id)
    : null;

  // Look up asset by tag, QR code, serial number, barcode, or ID
  const lookupAsset = React.useCallback(
    (query: string): string | null => {
      const q = query.trim().toLowerCase();
      if (!q) return null;

      const match = assets.find(
        (a) =>
          a.id.toLowerCase() === q ||
          a.asset_tag.toLowerCase() === q ||
          a.qr_code?.toLowerCase() === q ||
          a.serial_number?.toLowerCase() === q ||
          a.barcode?.toLowerCase() === q
      );
      return match?.id || null;
    },
    [assets]
  );

  // Start camera for QR scanning with jsQR decoding
  React.useEffect(() => {
    if (mode !== "camera" || scanState !== "scanning") return;

    let cancelled = false;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        // Start scanning frames with jsQR
        const scanFrame = () => {
          if (cancelled || !videoRef.current || !canvasRef.current) return;
          
          const video = videoRef.current;
          const canvas = canvasRef.current;
          const ctx = canvas.getContext("2d");
          
          if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) {
            scanIntervalRef.current = setTimeout(scanFrame, 100);
            return;
          }
          
          // Set canvas size to match video
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          
          // Draw current video frame to canvas
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // Get image data for jsQR
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          
          // Decode QR code
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          });
          
          if (code && code.data) {
            // Found a QR code!
            const scannedData = code.data.trim();
            setLastScannedCode(scannedData);
            
            // Try to look up asset
            const assetId = lookupAsset(scannedData);
            if (assetId) {
              setFoundAssetId(assetId);
              setScanState("found");
              // Stop camera
              if (streamRef.current) {
                streamRef.current.getTracks().forEach((t) => t.stop());
                streamRef.current = null;
              }
              return; // Stop scanning
            } else {
              // QR code found but not matching any asset
              // Keep scanning but show a brief indicator
              console.log("QR code detected but no matching asset:", scannedData);
            }
          }
          
          // Continue scanning
          scanIntervalRef.current = setTimeout(scanFrame, 150);
        };
        
        // Start scanning after a brief delay to let video stabilize
        scanIntervalRef.current = setTimeout(scanFrame, 500);
        
      } catch {
        if (!cancelled) {
          setCameraError(true);
          setMode("manual");
        }
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      if (scanIntervalRef.current) clearTimeout(scanIntervalRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [mode, scanState, lookupAsset]);

  // Stop camera when leaving the page
  React.useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // Toggle torch/flashlight when isTorchOn changes
  React.useEffect(() => {
    if (!streamRef.current) return;
    
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;
    
    // Check if torch is supported
    const capabilities = track.getCapabilities?.() as MediaTrackCapabilities & { torch?: boolean };
    if (!capabilities?.torch) {
      console.log("Torch not supported on this device");
      return;
    }
    
    // Apply torch constraint
    track.applyConstraints({
      advanced: [{ torch: isTorchOn } as MediaTrackConstraintSet],
    }).catch((err) => {
      console.warn("Failed to toggle torch:", err);
    });
  }, [isTorchOn]);

  const handleManualSearch = () => {
    const assetId = lookupAsset(manualInput);
    if (assetId) {
      setFoundAssetId(assetId);
      setScanState("found");
    } else {
      setScanState("not-found");
    }
  };

  // Simulate a successful QR scan (demo mode)
  const handleSimulatedScan = (assetTag: string) => {
    const assetId = lookupAsset(assetTag);
    if (assetId) {
      setFoundAssetId(assetId);
      setScanState("found");
      // Stop camera
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    }
  };

  const handleReset = () => {
    setScanState("scanning");
    setFoundAssetId(null);
    setManualInput("");
  };

  const navigateToAsset = () => {
    if (foundAssetId) {
      router.push(`/${company}/app/asset?id=${foundAssetId}`);
    }
  };

  const navigateToInspection = () => {
    if (foundAssetId) {
      router.push(`/${company}/app/inspection/${foundAssetId}`);
    }
  };

  // ── Found Asset Result ──
  if (scanState === "found" && foundAsset) {
    const conditionColors: Record<string, string> = {
      excellent: "text-success",
      good: "text-success",
      fair: "text-warning",
      poor: "text-destructive",
      critical: "text-destructive",
    };

    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-background border-b px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={handleReset}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-semibold">{t("scan.assetFound")}</h1>
        </header>

        <div className="flex-1 p-4 space-y-4 max-w-lg mx-auto w-full">
          {/* Success indicator */}
          <div className="flex flex-col items-center py-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10 mb-3">
              <Package className="h-8 w-8 text-success" />
            </div>
            <p className="text-sm text-muted-foreground">{t("scan.assetIdentified")}</p>
          </div>

          {/* Asset Card */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 shrink-0">
                  <Package className="h-7 w-7 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-lg">{foundAsset.name}</h2>
                  <p className="text-sm text-muted-foreground font-mono">{foundAsset.asset_tag}</p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="text-xs capitalize">
                      {foundAsset.status}
                    </span>
                    <span
                      className={`text-xs capitalize ${conditionColors[foundAsset.condition] || "text-muted-foreground"}`}
                    >
                      {foundAsset.condition}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-2 text-sm">
                {foundAsset.manufacturer && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Package className="h-4 w-4 shrink-0" />
                    <span>
                      {foundAsset.manufacturer} {foundAsset.model || ""}
                    </span>
                  </div>
                )}
                {foundLocation && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4 shrink-0" />
                    <span>{foundLocation.name}</span>
                  </div>
                )}
                {foundAsset.serial_number && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="text-xs font-medium">S/N:</span>
                    <span className="font-mono text-xs">{foundAsset.serial_number}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Safety Warning */}
          {foundAsset.safety_instructions && (
            <Card className="border-warning/50 bg-warning/5">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">{t("assets.safetyInstructions")}</p>
                    <p className="text-sm text-muted-foreground mt-1">{foundAsset.safety_instructions}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="space-y-3 pt-2">
            <Button className="w-full h-14 gap-2 text-base" onClick={navigateToInspection}>
              <ScanLine className="h-5 w-5" />
              {t("assets.startInspection")}
            </Button>
            <Button variant="outline" className="w-full h-12 gap-2" onClick={navigateToAsset}>
              <Package className="h-5 w-5" />
              {t("scan.viewAssetDetails")}
            </Button>
            <Button variant="ghost" className="w-full gap-2" onClick={handleReset}>
              <QrCode className="h-4 w-4" />
              {t("scan.scanAnother")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Not Found State ──
  if (scanState === "not-found") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="sticky top-0 z-10 bg-background border-b px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={handleReset}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-semibold">{t("scan.title")}</h1>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 mb-4">
            <X className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="text-lg font-semibold mb-1">{t("scan.notFound")}</h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-xs">
            {t("scan.notFoundDesc")}
          </p>
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <Button className="w-full gap-2" onClick={handleReset}>
              <QrCode className="h-4 w-4" />
              {t("scan.tryAgain")}
            </Button>
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => router.push(`/${company}/app/assets/new`)}
            >
              <Package className="h-4 w-4" />
              {t("scan.registerNew")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Scanner View ──
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background border-b px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="font-semibold flex-1">{t("scan.title")}</h1>
        <div className="flex gap-1">
          <Button
            variant={mode === "camera" ? "default" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => setMode("camera")}
          >
            <Camera className="h-4 w-4" />
          </Button>
          <Button
            variant={mode === "manual" ? "default" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => setMode("manual")}
          >
            <Keyboard className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {mode === "camera" ? (
        <div className="flex-1 flex flex-col">
          {/* Camera View */}
          <div className="relative flex-1 bg-black min-h-[50vh]">
            {!cameraError && (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}
            
            {/* Hidden canvas for QR code frame capture */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Scanning overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              {/* Corner markers */}
              <div className="relative w-64 h-64">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-lg" />
                {/* Scanning line animation */}
                <div className="absolute left-2 right-2 h-0.5 bg-primary/80 animate-scan-line" />
              </div>
            </div>

            {/* Torch toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 bg-black/30 text-white hover:bg-black/50"
              onClick={() => setIsTorchOn(!isTorchOn)}
            >
              {isTorchOn ? (
                <FlashlightOff className="h-5 w-5" />
              ) : (
                <Flashlight className="h-5 w-5" />
              )}
            </Button>

            {/* Instruction text */}
            <div className="absolute bottom-6 left-0 right-0 text-center">
              {lastScannedCode ? (
                <p className="text-white text-sm font-medium bg-warning/80 inline-block px-4 py-2 rounded-full">
                  Code detected: {lastScannedCode.substring(0, 20)}{lastScannedCode.length > 20 ? "..." : ""} — No matching asset
                </p>
              ) : (
                <p className="text-white text-sm font-medium bg-black/40 inline-block px-4 py-2 rounded-full">
                  {t("scan.pointAtQR")}
                </p>
              )}
            </div>
          </div>

          {/* Demo quick-scan buttons (simulates QR codes being scanned) */}
          <div className="p-4 bg-background border-t">
            <p className="text-xs text-muted-foreground mb-3 text-center">{t("scan.demoHint")}</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {assets.slice(0, 5).map((asset) => (
                <button
                  key={asset.id}
                  onClick={() => handleSimulatedScan(asset.asset_tag)}
                  className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium shrink-0 hover:bg-muted active:bg-muted transition-colors"
                >
                  <QrCode className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{asset.asset_tag}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        // ── Manual Entry Mode ──
        <div className="flex-1 p-4 space-y-4">
          <div className="flex flex-col items-center py-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
              <Keyboard className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-lg font-semibold">{t("scan.manualEntry")}</h2>
            <p className="text-sm text-muted-foreground mt-1 text-center max-w-xs">
              {t("scan.manualEntryDesc")}
            </p>
          </div>

          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("scan.enterAssetCode")}
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleManualSearch()}
                className="pl-10 h-12"
                autoFocus
              />
            </div>
            <Button className="w-full h-12 gap-2" onClick={handleManualSearch} disabled={!manualInput.trim()}>
              <Search className="h-4 w-4" />
              {t("scan.lookupAsset")}
            </Button>
          </div>

          {/* Recent / Nearby Assets for quick access */}
          <div className="pt-4">
            <p className="text-sm font-medium text-muted-foreground mb-3">{t("scan.recentAssets")}</p>
            <div className="space-y-2">
              {assets.slice(0, 5).map((asset) => {
                const loc = asset.location_id
                  ? locations.find((l) => l.id === asset.location_id)
                  : null;
                return (
                  <button
                    key={asset.id}
                    onClick={() => {
                      setFoundAssetId(asset.id);
                      setScanState("found");
                    }}
                    className="w-full flex items-center gap-3 rounded-lg border p-3 text-left hover:bg-muted active:bg-muted/80 transition-colors"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted shrink-0">
                      <Package className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{asset.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {asset.asset_tag}
                        {loc ? ` · ${loc.name}` : ""}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
