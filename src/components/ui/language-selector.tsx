"use client";

import * as React from "react";
import { useTranslation, type SupportedLocale } from "@/i18n";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Flag SVGs (circle style, 20×20) ── */

function USFlag({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={cn("h-5 w-5 shrink-0", className)} aria-hidden="true">
      <clipPath id="us-clip"><circle cx="10" cy="10" r="10" /></clipPath>
      <g clipPath="url(#us-clip)">
        <rect width="20" height="20" fill="#B22234" />
        <rect y="1.54" width="20" height="1.54" fill="#fff" />
        <rect y="4.62" width="20" height="1.54" fill="#fff" />
        <rect y="7.69" width="20" height="1.54" fill="#fff" />
        <rect y="10.77" width="20" height="1.54" fill="#fff" />
        <rect y="13.85" width="20" height="1.54" fill="#fff" />
        <rect y="16.92" width="20" height="1.54" fill="#fff" />
        <rect width="8" height="10.77" fill="#3C3B6E" />
      </g>
    </svg>
  );
}

function NLFlag({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={cn("h-5 w-5 shrink-0", className)} aria-hidden="true">
      <clipPath id="nl-clip"><circle cx="10" cy="10" r="10" /></clipPath>
      <g clipPath="url(#nl-clip)">
        <rect width="20" height="6.67" fill="#AE1C28" />
        <rect y="6.67" width="20" height="6.66" fill="#fff" />
        <rect y="13.33" width="20" height="6.67" fill="#21468B" />
      </g>
    </svg>
  );
}

function SEFlag({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={cn("h-5 w-5 shrink-0", className)} aria-hidden="true">
      <clipPath id="se-clip"><circle cx="10" cy="10" r="10" /></clipPath>
      <g clipPath="url(#se-clip)">
        <rect width="20" height="20" fill="#006AA7" />
        <rect x="6" y="0" width="2.5" height="20" fill="#FECC00" />
        <rect x="0" y="8.75" width="20" height="2.5" fill="#FECC00" />
      </g>
    </svg>
  );
}

const LANGUAGE_OPTIONS: { code: SupportedLocale; label: string; Flag: React.FC<{ className?: string }> }[] = [
  { code: "en", label: "English", Flag: USFlag },
  { code: "nl", label: "Nederlands", Flag: NLFlag },
  { code: "sv", label: "Svenska", Flag: SEFlag },
];

interface LanguageSelectorProps {
  variant?: "pill" | "compact";
  className?: string;
}

export function LanguageSelector({ variant = "pill", className }: LanguageSelectorProps) {
  const { locale, setLocale } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  const current = LANGUAGE_OPTIONS.find((o) => o.code === locale) || LANGUAGE_OPTIONS[0];

  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSelect = (code: SupportedLocale) => {
    setLocale(code);
    // Also set cookie for server-side detection (marketing pages)
    document.cookie = `harmoniq_locale=${code};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
    setOpen(false);
  };

  if (variant === "compact") {
    return (
      <div ref={ref} className={cn("relative", className)}>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1.5 p-1.5 rounded-md hover:bg-sidebar-accent text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors"
          title={current.label}
        >
          <current.Flag className="h-4 w-4" />
        </button>
        {open && (
          <div className="absolute bottom-full left-0 mb-1 w-40 rounded-lg border bg-popover p-1 shadow-lg z-50">
            {LANGUAGE_OPTIONS.map((opt) => (
              <button
                key={opt.code}
                type="button"
                onClick={() => handleSelect(opt.code)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
                  opt.code === locale ? "bg-accent text-accent-foreground" : "hover:bg-muted"
                )}
              >
                <opt.Flag />
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Pill variant (for marketing header)
  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-full bg-zinc-800/80 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-700/80 transition-colors"
      >
        <current.Flag />
        <span className="hidden sm:inline">{current.label}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 text-zinc-400 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute left-0 bottom-full mb-2 w-44 rounded-lg bg-zinc-800 p-1 shadow-xl z-[60]">
          {LANGUAGE_OPTIONS.map((opt) => (
            <button
              key={opt.code}
              type="button"
              onClick={() => handleSelect(opt.code)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                opt.code === locale ? "bg-zinc-700 text-white" : "text-zinc-300 hover:bg-zinc-700/50 hover:text-white"
              )}
            >
              <opt.Flag />
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Light-themed variant for marketing pages with light backgrounds */
export function LanguageSelectorLight({ className }: { className?: string }) {
  const { locale, setLocale } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  const current = LANGUAGE_OPTIONS.find((o) => o.code === locale) || LANGUAGE_OPTIONS[0];

  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSelect = (code: SupportedLocale) => {
    setLocale(code);
    document.cookie = `harmoniq_locale=${code};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
    setOpen(false);
  };

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-800 shadow-sm hover:bg-zinc-50 transition-colors"
      >
        <current.Flag />
        <span>{current.label}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 text-zinc-400 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-44 rounded-lg border bg-white p-1 shadow-xl z-50">
          {LANGUAGE_OPTIONS.map((opt) => (
            <button
              key={opt.code}
              type="button"
              onClick={() => handleSelect(opt.code)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                opt.code === locale ? "bg-zinc-100 text-zinc-900 font-medium" : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
              )}
            >
              <opt.Flag />
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
