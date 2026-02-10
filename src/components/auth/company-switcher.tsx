"use client";

import * as React from "react";
import { Building2, ChevronDown, Check, ArrowRightLeft, Globe } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

/**
 * CompanySwitcher - Allows super admins to switch between companies
 * Shows current company and dropdown to switch
 * C6: Also syncs the URL when switching companies
 */
export function CompanySwitcher() {
  const { isSuperAdmin, currentCompany, availableCompanies, switchCompany } = useAuth();
  const router = useRouter();
  const params = useParams();
  const currentSlug = params.company as string | undefined;
  const [isOpen, setIsOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  // Close on click outside — must be called before any early returns to preserve hook order
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Only render for super admins
  if (!isSuperAdmin) {
    return null;
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm transition-colors hover:bg-muted",
          isOpen && "bg-muted"
        )}
      >
        {currentCompany ? (
          <Building2 className="h-4 w-4 text-muted-foreground" />
        ) : (
          <Globe className="h-4 w-4 text-primary" />
        )}
        <span className="max-w-[160px] truncate font-medium">
          {currentCompany?.name || "Platform Admin"}
        </span>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-lg border bg-popover p-1 shadow-lg animate-in fade-in-0 zoom-in-95">
          <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
            <ArrowRightLeft className="mr-1 inline-block h-3 w-3" />
            Switch Company
          </div>
          <div className="max-h-64 overflow-auto">
            {/* Platform Only option - deselects company */}
            <button
              onClick={() => {
                switchCompany(null);
                setIsOpen(false);
                // C6: Navigate to platform dashboard (use first company slug as fallback)
                const fallbackSlug = availableCompanies[0]?.slug || currentSlug || "platform";
                router.push(`/${fallbackSlug}/dashboard`);
              }}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors",
                !currentCompany ? "bg-primary/10 text-primary" : "hover:bg-muted"
              )}
            >
              <div className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-xs font-medium",
                !currentCompany ? "bg-primary text-primary-foreground" : "bg-muted"
              )}>
                <Globe className="h-4 w-4" />
              </div>
              <div className="flex-1 text-left">
                <div className="font-medium">Platform Only</div>
                <div className="text-xs text-muted-foreground">Admin controls</div>
              </div>
              {!currentCompany && <Check className="h-4 w-4 text-primary" />}
            </button>
            <div className="my-1 border-t" />
            {availableCompanies.map((company) => {
              const isSelected = company.id === currentCompany?.id;
              return (
                <button
                  key={company.id}
                  onClick={() => {
                    switchCompany(company.id);
                    setIsOpen(false);
                    // C6: Navigate to the new company's dashboard URL
                    if (company.slug !== currentSlug) {
                      router.push(`/${company.slug}/dashboard`);
                    }
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors",
                    isSelected ? "bg-primary/10 text-primary" : "hover:bg-muted"
                  )}
                >
                  <div className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-xs font-medium",
                    isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                  )}>
                    {company.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-medium truncate">{company.name}</div>
                    <div className="text-xs text-muted-foreground">{company.country}</div>
                  </div>
                  {isSelected && <Check className="h-4 w-4 text-primary" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * CompanyBadge - Simple display of current company (for non-super admins)
 */
export function CompanyBadge() {
  const { currentCompany, isSuperAdmin } = useAuth();
  
  // Super admins use the switcher instead
  if (isSuperAdmin) return null;
  
  return (
    <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2 text-sm">
      <Building2 className="h-4 w-4 text-muted-foreground" />
      <span className="font-medium">{currentCompany?.name}</span>
    </div>
  );
}
