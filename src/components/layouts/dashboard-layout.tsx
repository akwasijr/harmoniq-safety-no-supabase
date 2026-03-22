"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Menu, X } from "lucide-react";
import { Sidebar } from "@/components/navigation/sidebar";
import { Button } from "@/components/ui/button";
import { CompanySwitcher } from "@/components/auth/company-switcher";

interface DashboardLayoutProps {
  children: React.ReactNode;
  company: string;
  companyName?: string;
  companyLogo?: string | null;
  userName?: string;
  userRole?: string;
}

export function DashboardLayout({
  children,
  company,
  companyName = "Company",
  companyLogo = null,
  userName = "User",
  userRole = "Employee",
}: DashboardLayoutProps) {
  const [showMobileMenu, setShowMobileMenu] = React.useState(false);
  const pathname = usePathname();

  // L18: Close mobile sidebar on Escape key
  React.useEffect(() => {
    if (!showMobileMenu) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowMobileMenu(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [showMobileMenu]);

  const breadcrumbs = React.useMemo(
    () => buildDashboardBreadcrumbs(pathname, company),
    [company, pathname]
  );

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <Sidebar 
          company={company} 
          companyName={companyName}
          companyLogo={companyLogo}
          userName={userName}
          userRole={userRole}
        />
      </div>

      {/* Mobile sidebar overlay */}
      {showMobileMenu && (
        <>
          <div
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
            onClick={() => setShowMobileMenu(false)}
            aria-hidden="true"
          />
          <div className="fixed inset-y-0 left-0 z-50 lg:hidden">
            <Sidebar 
              company={company}
              companyName={companyName}
              companyLogo={companyLogo}
              userName={userName}
              userRole={userRole}
            />
          </div>
        </>
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        {/* Header with company switcher for super admins */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b bg-background px-4">
          <div className="flex items-center gap-4">
            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              aria-label={showMobileMenu ? "Close menu" : "Open menu"}
              className="lg:hidden"
            >
              {showMobileMenu ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
            
            {/* Company switcher (super admin) or company name */}
            <CompanySwitcher />
            <span className="font-semibold lg:hidden">{companyName}</span>
          </div>
        </header>
        
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          {breadcrumbs.length > 0 && (
            <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
              {breadcrumbs.map((crumb, index) => {
                const isLast = index === breadcrumbs.length - 1;
                return (
                  <React.Fragment key={`${crumb.href}-${crumb.label}`}>
                    {index > 0 && <ChevronRight className="h-4 w-4" aria-hidden="true" />}
                    {isLast ? (
                      <span className="font-medium text-foreground">{crumb.label}</span>
                    ) : (
                      <Link href={crumb.href} className="transition-colors hover:text-foreground">
                        {crumb.label}
                      </Link>
                    )}
                  </React.Fragment>
                );
              })}
            </nav>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}

interface BreadcrumbItem {
  label: string;
  href: string;
}

function buildDashboardBreadcrumbs(pathname: string | null, company: string): BreadcrumbItem[] {
  if (!pathname) return [];

  const base = `/${company}/dashboard`;
  const normalizedPath = pathname.replace(/\/$/, "");

  if (!normalizedPath.startsWith(base)) {
    return [];
  }

  const suffix = normalizedPath.slice(base.length);
  if (!suffix) {
    return [{ label: "Dashboard", href: base }];
  }

  const segments = suffix.split("/").filter(Boolean);
  const crumbs: BreadcrumbItem[] = [{ label: "Dashboard", href: base }];
  const push = (label: string, href: string) => {
    if (!crumbs.some((crumb) => crumb.href === href && crumb.label === label)) {
      crumbs.push({ label, href });
    }
  };

  switch (segments[0]) {
    case "analytics":
      push("Analytics", `${base}/analytics`);
      break;
    case "incidents":
      push("Incidents", `${base}/incidents`);
      if (segments[1] === "new") {
        push("New incident", `${base}/incidents/new`);
      } else if (segments[1]) {
        push("Incident details", normalizedPath);
      }
      break;
    case "tickets":
      push("Incidents", `${base}/incidents`);
      push("Tickets", `${base}/tickets`);
      if (segments[1] === "new") {
        push("New ticket", `${base}/tickets/new`);
      } else if (segments[1]) {
        push("Ticket details", normalizedPath);
      }
      break;
    case "checklists":
      if (!segments[1]) {
        push("Safety Tasks", `${base}/checklists`);
      } else if (segments[1] === "my-templates") {
        push("Task Templates", `${base}/checklists/my-templates`);
      } else if (segments[1] === "templates") {
        push("Task Templates", `${base}/checklists/my-templates`);
        push("Template Library", `${base}/checklists/templates`);
      } else if (segments[1] === "new") {
        push("Task Templates", `${base}/checklists/my-templates`);
        push("New template", `${base}/checklists/new`);
      } else {
        push("Task Templates", `${base}/checklists/my-templates`);
        push("Template details", normalizedPath);
      }
      break;
    case "risk-assessments":
      push("Safety Tasks", `${base}/checklists`);
      push("Risk Assessments", `${base}/risk-assessments`);
      if (segments[1] === "new") {
        push("New assessment", `${base}/risk-assessments/new`);
      } else if (segments[1]) {
        push("Assessment details", normalizedPath);
      }
      break;
    case "inspections":
      push("Safety Tasks", `${base}/checklists`);
      push("Inspections", `${base}/inspections`);
      if (segments[1] === "new") {
        push("New inspection", `${base}/inspections/new`);
      } else if (segments[1]) {
        push("Inspection details", normalizedPath);
      }
      break;
    case "users":
      push("Users & Teams", `${base}/users`);
      if (segments[1] === "new") {
        push("New user", `${base}/users/new`);
      } else if (segments[1] === "teams") {
        push("Teams", `${base}/users?tab=teams`);
        if (segments[2]) {
          push("Team details", normalizedPath);
        }
      } else if (segments[1]) {
        push("User details", normalizedPath);
      }
      break;
    case "locations":
      push("Locations", `${base}/locations`);
      if (segments[1] === "new") {
        push("New location", `${base}/locations/new`);
      } else if (segments[1]) {
        push("Location details", normalizedPath);
      }
      break;
    case "qr-codes":
      push("Locations", `${base}/locations`);
      push("QR Codes", `${base}/qr-codes`);
      break;
    case "assets":
      push("Asset Management", `${base}/assets`);
      if (segments[1] === "new") {
        push("New asset", `${base}/assets/new`);
      } else if (segments[1]) {
        push("Asset details", normalizedPath);
      }
      break;
    case "work-orders":
      push("Asset Management", `${base}/assets`);
      push("Work Orders", `${base}/work-orders`);
      if (segments[1] === "new") {
        push("New work order", `${base}/work-orders/new`);
      } else if (segments[1]) {
        push("Work order details", normalizedPath);
      }
      break;
    case "corrective-actions":
      push("Asset Management", `${base}/assets`);
      push("Corrective Actions", `${base}/corrective-actions`);
      if (segments[1]) {
        push("Action details", normalizedPath);
      }
      break;
    case "parts":
      push("Asset Management", `${base}/assets`);
      push("Parts", `${base}/parts`);
      break;
    case "inspection-routes":
      push("Asset Management", `${base}/assets`);
      push("Inspection Routes", `${base}/inspection-routes`);
      if (segments[1]) {
        push("Route details", normalizedPath);
      }
      break;
    case "content":
      push("Content", `${base}/content`);
      if (segments[1] === "new") {
        push("New post", `${base}/content/new`);
      } else if (segments[1]) {
        push("Content details", normalizedPath);
      }
      break;
    case "settings":
      push("Settings", `${base}/settings`);
      break;
    default:
      push(
        segments[0]
          .split("-")
          .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
          .join(" "),
        `${base}/${segments[0]}`
      );
  }

  return crumbs;
}
