"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { CheckCircle, XCircle, Info, X } from "lucide-react";

type ToastVariant = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = React.createContext<ToastContextValue | undefined>(undefined);

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

const icons: Record<ToastVariant, React.ElementType> = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
};

const styles: Record<ToastVariant, string> = {
  success: "border-green-200 bg-white text-green-800 dark:border-green-700 dark:bg-green-950 dark:text-green-100",
  error: "border-red-200 bg-white text-red-800 dark:border-red-700 dark:bg-red-950 dark:text-red-100",
  info: "border-blue-200 bg-white text-blue-800 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-100",
};

const iconStyles: Record<ToastVariant, string> = {
  success: "text-green-500",
  error: "text-red-500",
  info: "text-blue-500",
};

const barStyles: Record<ToastVariant, string> = {
  success: "bg-green-500",
  error: "bg-red-500",
  info: "bg-blue-500",
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const Icon = icons[toast.variant];

  React.useEffect(() => {
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      className={cn(
        "pointer-events-auto flex items-center gap-3 overflow-hidden rounded-lg border shadow-xl transition-all animate-in slide-in-from-top-2 fade-in",
        styles[toast.variant]
      )}
    >
      <Icon className={cn("h-5 w-5 shrink-0 my-3 ml-3", iconStyles[toast.variant])} />
      <p className="text-sm font-medium flex-1 py-3 pr-1">{toast.message}</p>
      <button onClick={onDismiss} className="shrink-0 p-3 opacity-40 hover:opacity-100 transition-opacity">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const toast = React.useCallback((message: string, variant: ToastVariant = "success") => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, variant }]);
  }, []);

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none w-96 max-w-[calc(100vw-2rem)]">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
