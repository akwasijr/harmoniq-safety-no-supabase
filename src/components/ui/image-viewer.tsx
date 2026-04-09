"use client";

import * as React from "react";
import { X, ZoomIn, Pencil, Circle, Undo2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ImageViewerProps {
  src: string;
  alt?: string;
  onClose: () => void;
  onSave?: (annotatedDataUrl: string) => void;
}

type Tool = "none" | "red" | "green";

export function ImageViewer({ src, alt, onClose, onSave }: ImageViewerProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const imgRef = React.useRef<HTMLImageElement | null>(null);
  const [tool, setTool] = React.useState<Tool>("none");
  const [isDrawing, setIsDrawing] = React.useState(false);
  const [history, setHistory] = React.useState<ImageData[]>([]);
  const [loaded, setLoaded] = React.useState(false);

  // Load image onto canvas
  React.useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      setLoaded(true);
    };
    img.src = src;
  }, [src]);

  const saveSnapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    setHistory((prev) => [...prev.slice(-10), ctx.getImageData(0, 0, canvas.width, canvas.height)]);
  };

  const undo = () => {
    const canvas = canvasRef.current;
    if (!canvas || history.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const last = history[history.length - 1];
    ctx.putImageData(last, 0, 0);
    setHistory((prev) => prev.slice(0, -1));
  };

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    return {
      x: ((clientX - rect.left) / rect.width) * canvas.width,
      y: ((clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    if (tool === "none") return;
    saveSnapshot();
    setIsDrawing(true);
    const pos = getPos(e);
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.strokeStyle = tool === "red" ? "#ef4444" : "#22c55e";
    ctx.lineWidth = Math.max(3, canvasRef.current!.width / 150);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || tool === "none") return;
    const pos = getPos(e);
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const endDraw = () => {
    setIsDrawing(false);
  };

  const handleSave = () => {
    if (!canvasRef.current || !onSave) return;
    onSave(canvasRef.current.toDataURL("image/jpeg", 0.85));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-black/95">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80">
        <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/10">
          <X className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setTool("none")}
            className={cn("rounded-lg px-3 py-1.5 text-xs text-white transition-colors", tool === "none" ? "bg-white/20" : "hover:bg-white/10")}
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setTool("red")}
            className={cn("rounded-lg px-3 py-1.5 text-xs transition-colors flex items-center gap-1.5", tool === "red" ? "bg-red-500/30 text-red-400" : "text-white hover:bg-white/10")}
          >
            <Circle className="h-3 w-3 fill-red-500 text-red-500" />
            Issue
          </button>
          <button
            type="button"
            onClick={() => setTool("green")}
            className={cn("rounded-lg px-3 py-1.5 text-xs transition-colors flex items-center gap-1.5", tool === "green" ? "bg-green-500/30 text-green-400" : "text-white hover:bg-white/10")}
          >
            <Circle className="h-3 w-3 fill-green-500 text-green-500" />
            OK
          </button>
          {history.length > 0 && (
            <button type="button" onClick={undo} className="rounded-lg px-3 py-1.5 text-xs text-white hover:bg-white/10">
              <Undo2 className="h-4 w-4" />
            </button>
          )}
        </div>
        {onSave && (
          <Button variant="ghost" size="sm" onClick={handleSave} className="text-white hover:bg-white/10 gap-1.5">
            <Check className="h-4 w-4" /> Save
          </Button>
        )}
        {!onSave && <div className="w-10" />}
      </div>

      {/* Canvas / Image */}
      <div className="flex-1 flex items-center justify-center overflow-auto p-4">
        <canvas
          ref={canvasRef}
          className={cn(
            "max-w-full max-h-full rounded-lg",
            tool !== "none" ? "cursor-crosshair" : "cursor-zoom-in",
          )}
          style={{ touchAction: tool !== "none" ? "none" : "auto" }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
        {!loaded && (
          <div className="animate-pulse text-white/50 text-sm">Loading image...</div>
        )}
      </div>
    </div>
  );
}
