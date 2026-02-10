"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Menu, X, User, LogOut, Settings, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { MOCK_NOTIFICATIONS } from "@/mocks/data";

interface HeaderProps {
  company?: string;
  companyName?: string;
  userName?: string;
  userRole?: string;
  notificationCount?: number;
  showMobileMenu?: boolean;
  onMobileMenuToggle?: () => void;
}

export function Header({
  company,
  companyName = "Company",
  userName = "User",
  userRole = "Employee",
  notificationCount = 0,
  showMobileMenu = false,
  onMobileMenuToggle,
}: HeaderProps) {
  const pathname = usePathname();
  const [showUserMenu, setShowUserMenu] = React.useState(false);
  const [showNotifications, setShowNotifications] = React.useState(false);
  const userMenuRef = React.useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setShowUserMenu(false);
      }
      // Close notifications if clicking outside
      const notifEl = document.getElementById("notification-panel");
      if (notifEl && !notifEl.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // L12: Get page title from pathname — handles dynamic segments properly
  const getPageTitle = () => {
    const segments = pathname.split("/").filter(Boolean);
    // Remove the company slug (first segment)
    const routeSegments = segments.slice(1);

    // Known route-to-title mappings
    const routeTitles: Record<string, string> = {
      "dashboard": "Dashboard",
      "app": "Home",
      "dashboard/analytics": "Analytics",
      "dashboard/incidents": "Incidents",
      "dashboard/incidents/new": "New Incident",
      "dashboard/checklists": "Safety Tasks",
      "dashboard/checklists/new": "New Checklist",
      "dashboard/users": "Users & Teams",
      "dashboard/users/new": "New User",
      "dashboard/locations": "Locations",
      "dashboard/assets": "Assets",
      "dashboard/content": "Content",
      "dashboard/content/new": "New Content",
      "dashboard/settings": "Settings",
      "dashboard/tickets": "Tickets",
      "dashboard/tickets/new": "New Ticket",
      "dashboard/qr-codes": "QR Codes",
      "dashboard/inspections": "Inspections",
      "dashboard/risk-assessments": "Risk Assessments",
      "dashboard/platform/companies": "Companies",
      "dashboard/platform/users": "Platform Users",
      "dashboard/platform/settings": "Platform Settings",
      "app/report": "Report Incident",
      "app/report/success": "Report Submitted",
      "app/checklists": "Safety Tasks",
      "app/news": "News & Updates",
      "app/profile": "Profile",
      "app/risk-assessment": "Risk Assessment",
      "app/risk-assessment/jha": "Job Hazard Analysis",
      "app/risk-assessment/jsa": "Job Safety Analysis",
      "app/risk-assessment/rie": "RI&E Assessment",
      "app/risk-assessment/arbowet": "Arbowet Assessment",
      "app/risk-assessment/sam": "SAM Assessment",
      "app/risk-assessment/osa": "OSA Assessment",
    };

    // Dynamic segment patterns — check from most specific to least
    const dynamicPatterns: [RegExp, string][] = [
      [/^dashboard\/users\/teams\/[^/]+$/, "Team Details"],
      [/^dashboard\/incidents\/[^/]+$/, "Incident Details"],
      [/^dashboard\/checklists\/[^/]+$/, "Checklist Details"],
      [/^dashboard\/users\/[^/]+$/, "User Details"],
      [/^dashboard\/locations\/[^/]+$/, "Location Details"],
      [/^dashboard\/assets\/[^/]+$/, "Asset Details"],
      [/^dashboard\/content\/[^/]+$/, "Content Details"],
      [/^dashboard\/tickets\/[^/]+$/, "Ticket Details"],
      [/^dashboard\/inspections\/[^/]+$/, "Inspection Details"],
      [/^dashboard\/risk-assessments\/[^/]+$/, "Assessment Details"],
      [/^dashboard\/platform\/companies\/[^/]+$/, "Company Details"],
      [/^dashboard\/platform\/users\/[^/]+$/, "User Details"],
      [/^app\/news\/[^/]+$/, "Article"],
      [/^app\/checklists\/[^/]+$/, "Checklist"],
      [/^app\/inspection\/[^/]+$/, "Inspection"],
      [/^app\/location\/[^/]+$/, "Location"],
      [/^app\/risk-assessment\/[^/]+$/, "Risk Assessment"],
    ];

    const routeKey = routeSegments.join("/");

    // Check exact match first
    if (routeTitles[routeKey]) {
      return routeTitles[routeKey];
    }

    // Check dynamic patterns
    for (const [pattern, title] of dynamicPatterns) {
      if (pattern.test(routeKey)) {
        return title;
      }
    }

    // Fallback: capitalize the last non-dynamic segment
    const lastSegment = routeSegments[routeSegments.length - 1];
    if (!lastSegment) return "Dashboard";
    return lastSegment
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:px-6">
      {/* Left side */}
      <div className="flex items-center gap-4">
        {/* Mobile menu button */}
        {onMobileMenuToggle && (
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onMobileMenuToggle}
            aria-label={showMobileMenu ? "Close menu" : "Open menu"}
          >
            {showMobileMenu ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        )}

        {/* Page title */}
        <div>
          <h1 className="text-lg font-semibold">{getPageTitle()}</h1>
          <p className="text-sm text-muted-foreground">{companyName}</p>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <ThemeToggle />

        {/* Help - links to settings */}
        <Link href={company ? `/${company}/dashboard/settings` : "/login"}>
          <Button variant="ghost" size="icon" aria-label="Help & Support">
            <HelpCircle className="h-5 w-5" />
          </Button>
        </Link>

        {/* Notifications */}
        <div className="relative" id="notification-panel">
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            aria-label={`Notifications${notificationCount > 0 ? ` (${notificationCount} unread)` : ""}`}
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <Bell className="h-5 w-5" />
            {notificationCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
                {notificationCount > 9 ? "9+" : notificationCount}
              </span>
            )}
          </Button>
          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 rounded-md border bg-card p-4 shadow-lg">
              <h3 className="font-medium mb-2">Notifications</h3>
              {notificationCount > 0 ? (
                <div className="space-y-2">
                  {MOCK_NOTIFICATIONS.map((notif) => (
                    <div key={notif.id} className="rounded-md bg-muted/50 p-3 text-sm">
                      <p className="font-medium">{notif.title}</p>
                      <p className="text-xs text-muted-foreground">{notif.timeAgo}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No new notifications</p>
              )}
            </div>
          )}
        </div>

        {/* User menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className={cn(
              "flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors",
              "hover:bg-accent",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            )}
            aria-expanded={showUserMenu}
            aria-haspopup="menu"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
              {userName
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2)}
            </div>
            <div className="hidden text-left md:block">
              <p className="text-sm font-medium">{userName}</p>
              <p className="text-xs text-muted-foreground">{userRole}</p>
            </div>
          </button>

          {/* Dropdown menu */}
          {showUserMenu && (
            <div className="absolute right-0 top-full mt-2 w-56 rounded-md border bg-card p-1 shadow-lg">
              <div className="border-b px-3 py-2 md:hidden">
                <p className="font-medium">{userName}</p>
                <p className="text-sm text-muted-foreground">{userRole}</p>
              </div>
              <div className="py-1">
                <Link
                  href={company ? `/${company}/dashboard/settings` : "/login"}
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent"
                  onClick={() => setShowUserMenu(false)}
                >
                  <User className="h-4 w-4" aria-hidden="true" />
                  Profile
                </Link>
                <Link
                  href={company ? `/${company}/dashboard/settings` : "/settings"}
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent"
                  onClick={() => setShowUserMenu(false)}
                >
                  <Settings className="h-4 w-4" aria-hidden="true" />
                  Settings
                </Link>
              </div>
              <div className="border-t py-1">
                <Link
                  href="/login"
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive hover:bg-accent"
                  onClick={() => setShowUserMenu(false)}
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  Sign out
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
