"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { X } from "lucide-react";

interface SheetPageShellProps {
  title: string;
  /** Optional element rendered to the right of the X (e.g. "Mark all read" pill). */
  topRight?: React.ReactNode;
  /** Optional element rendered between the title row and the content (e.g. filter pills). */
  toolbar?: React.ReactNode;
  /** When provided, overrides the default router.back() behaviour. */
  onClose?: () => void;
  children: React.ReactNode;
}

/**
 * Full-bleed iOS-style sheet shell. Designed to cover the parent app shell
 * (header + bottom nav) so that pages opened from header icons feel like a
 * modal overlay even though they're real routes — back button + URL still work.
 */
export function SheetPageShell({
  title,
  topRight,
  toolbar,
  onClose,
  children,
}: SheetPageShellProps) {
  const router = useRouter();

  const handleClose = () => {
    // Navigate immediately so the underlying page renders instantly with no
    // visible grey/flash gap between the sheet closing and the previous page
    // appearing. We skip the exit animation entirely on purpose.
    if (onClose) {
      onClose();
      return;
    }
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("./");
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col overflow-hidden"
      initial={{ y: "4%", opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
    >
      <div className="flex flex-1 flex-col bg-background overflow-hidden">
      {/* Top bar — X on left, optional action on right, sits above the safe area */}
      <div
        className="sticky top-0 z-10 bg-background"
        style={{ paddingTop: "env(safe-area-inset-top, 0)" }}
      >
        <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-2">
          <button
            type="button"
            onClick={handleClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/70 text-foreground active:scale-95 transition-transform"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          {topRight ?? <div className="h-10 w-10" />}
        </div>

        {/* Large title */}
        <div className="px-5 pt-2 pb-3">
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        </div>

        {toolbar && <div className="px-4 pb-3">{toolbar}</div>}
      </div>

      {/* Scrollable content */}
      <div
        className="flex-1 overflow-y-auto bg-muted/40"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0) + 24px)" }}
      >
        {children}
      </div>
      </div>
    </motion.div>
  );
}
