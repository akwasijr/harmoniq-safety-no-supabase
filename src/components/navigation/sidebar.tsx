"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  AlertTriangle,
  Users,
  MapPin,
  Package,
  FileText,
  ClipboardCheck,
  Settings,
  Shield,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Moon,
  Sun,
  BarChart3,
  Globe,
  Building2,
  UserCog,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "@/i18n";

interface SidebarProps {
  company: string;
  companyName?: string;
  companyLogo?: string | null;
  userName?: string;
  userRole?: string;
  showPlatformAdmin?: boolean;
}

interface NavItem {
  title: string; // fallback
  titleKey?: string; // i18n translation key
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  exactMatch?: boolean;
  additionalPaths?: string[];
}

const navItems: NavItem[] = [
  {
    title: "Dashboard",
    titleKey: "nav.dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    exactMatch: true,
  },
  {
    title: "Analytics",
    titleKey: "nav.analytics",
    href: "/dashboard/analytics",
    icon: BarChart3,
  },
  {
    title: "Incidents",
    titleKey: "nav.incidents",
    href: "/dashboard/incidents",
    icon: AlertTriangle,
    additionalPaths: ["/dashboard/tickets"],
  },
  {
    title: "Safety Tasks",
    titleKey: "nav.safetyTasks",
    href: "/dashboard/checklists",
    icon: ClipboardCheck,
    additionalPaths: ["/dashboard/risk-assessments", "/dashboard/inspections"],
  },
  {
    title: "Users & Teams",
    titleKey: "nav.usersTeams",
    href: "/dashboard/users",
    icon: Users,
  },
  {
    title: "Locations",
    titleKey: "nav.locations",
    href: "/dashboard/locations",
    icon: MapPin,
    additionalPaths: ["/dashboard/qr-codes"],
  },
  {
    title: "Asset Management",
    titleKey: "nav.assets",
    href: "/dashboard/assets",
    icon: Package,
    additionalPaths: ["/dashboard/corrective-actions", "/dashboard/work-orders", "/dashboard/parts", "/dashboard/inspection-routes"],
  },
  {
    title: "Content",
    titleKey: "nav.content",
    href: "/dashboard/content",
    icon: FileText,
  },
  {
    title: "Settings",
    titleKey: "nav.settings",
    href: "/dashboard/settings",
    icon: Settings,
  },
];

const platformNavItems: NavItem[] = [
  {
    title: "Overview",
    href: "/dashboard",
    icon: LayoutDashboard,
    exactMatch: true,
  },
  {
    title: "Analytics & Privacy",
    href: "/dashboard/platform/analytics",
    icon: BarChart3,
  },
  {
    title: "Companies",
    href: "/dashboard/platform/companies",
    icon: Building2,
  },
  {
    title: "Platform Users",
    href: "/dashboard/platform/users",
    icon: UserCog,
  },
  {
    title: "Platform Settings",
    href: "/dashboard/platform/settings",
    icon: Settings,
  },
];

export function Sidebar({ 
  company, 
  companyName = "Harmoniq",
  companyLogo = null,
  userName = "User",
  userRole = "Employee",
  showPlatformAdmin = false,
}: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = React.useState(false);
  const [hovered, setHovered] = React.useState(false);
  const [allowPlatform, setAllowPlatform] = React.useState(showPlatformAdmin);
  const { theme, setTheme } = useTheme();
  const { isSuperAdmin, hasSelectedCompany, logout } = useAuth();
  const { t } = useTranslation();
  const isCollapsed = collapsed && !hovered;

  React.useEffect(() => {
    if (showPlatformAdmin) {
      setAllowPlatform(true);
      return;
    }
    if (typeof window !== "undefined") {
      const flag = window.localStorage.getItem("harmoniq_admin_entry") === "true";
      const hasCookie = document.cookie.split(";").some((c) => c.trim().startsWith("harmoniq_admin_entry="));
      setAllowPlatform(flag && hasCookie);
    }
  }, [showPlatformAdmin]);

  const showPlatformNav = isSuperAdmin && allowPlatform;

  // Helper to resolve nav item title via i18n
  const getTitle = (item: NavItem) => item.titleKey ? t(item.titleKey) : item.title;

  const userInitials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside
      className={cn(
        "sticky top-0 flex h-screen flex-col border-r bg-sidebar-background text-sidebar-foreground transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}
      onMouseEnter={() => {
        if (collapsed) setHovered(true);
      }}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
        <Link
          href={`/${company}/dashboard`}
          className="flex items-center gap-2 min-w-0"
        >
          {companyLogo ? (
            <img
              src={companyLogo}
              alt={`${companyName} logo`}
              className="h-8 w-8 shrink-0 rounded object-contain"
            />
          ) : (
            <Shield className="h-6 w-6 shrink-0 text-sidebar-primary" aria-hidden="true" />
          )}
          {!isCollapsed && (
            <span className="text-lg font-semibold truncate">{companyName}</span>
          )}
        </Link>
        <button
          className="ml-2 rounded-md p-2 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
          onClick={() => {
            setCollapsed(!collapsed);
            setHovered(false);
          }}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2">
        {/* Platform Admin section - super admin and company admin */}
        {showPlatformNav && (
          <div className="mb-3">
            {!isCollapsed && (
              <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                <Globe className="h-3.5 w-3.5" aria-hidden="true" />
                Platform Admin
              </div>
            )}
            {isCollapsed && (
              <div className="flex justify-center py-1.5">
                <Globe className="h-4 w-4 text-sidebar-foreground/50" aria-hidden="true" />
              </div>
            )}
            <ul className="space-y-1">
              {platformNavItems.map((item) => {
                const href = `/${company}${item.href}`;
                const isActive = item.exactMatch
                  ? pathname === href
                  : pathname === href || pathname.startsWith(`${href}/`);
                return (
                  <li key={item.href}>
                    <Link
                      href={href}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-sidebar-foreground/70",
                        isCollapsed && "justify-center px-2"
                      )}
                      title={isCollapsed ? getTitle(item) : undefined}
                    >
                      <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                      {!isCollapsed && <span>{getTitle(item)}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div className="my-2 border-t border-sidebar-border" />
          </div>
        )}

        {/* Company nav items: hidden for super admin until they select a company */}
        {(!isSuperAdmin || hasSelectedCompany) && <ul className="space-y-1">
          {navItems.map((item) => {
            const href = `/${company}${item.href}`;
            
            // Check if current path matches this nav item
            let isActive = false;
            if (item.exactMatch) {
              // For exact match items (like Dashboard), only match the exact path
              isActive = pathname === href;
            } else {
              // Check main href
              isActive = pathname === href || pathname.startsWith(`${href}/`);
              
              // Check additional paths (e.g., Safety Tasks should match risk-assessments, inspections)
              if (!isActive && item.additionalPaths) {
                isActive = item.additionalPaths.some(additionalPath => {
                  const fullPath = `/${company}${additionalPath}`;
                  return pathname === fullPath || pathname.startsWith(`${fullPath}/`);
                });
              }
            }

            return (
              <li key={item.href}>
                <Link
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-sidebar-foreground/70",
                    isCollapsed && "justify-center px-2"
                  )}
                  title={isCollapsed ? getTitle(item) : undefined}
                >
                  <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                  {!isCollapsed && <span>{getTitle(item)}</span>}
                  {!isCollapsed && item.badge !== undefined && item.badge > 0 && (
                    <span className="ml-auto rounded-full bg-sidebar-primary px-2 py-0.5 text-xs text-sidebar-primary-foreground">
                      {item.badge}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>}
      </nav>

      {/* Bottom section - User and icons */}
      <div className="border-t border-sidebar-border p-3">
        <div className={cn(
          "flex items-center",
          isCollapsed ? "flex-col gap-3" : "gap-2"
        )}>
          {/* User avatar with initials */}
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground shrink-0">
            {userInitials}
          </div>
          
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium">{userName}</p>
              <p className="truncate text-xs text-sidebar-foreground/50">{userRole}</p>
            </div>
          )}

          {/* Icon buttons */}
          <div className={cn(
            "flex items-center",
            isCollapsed ? "flex-col gap-1" : "gap-1"
          )}>
            {/* Theme toggle */}
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 rounded-md hover:bg-sidebar-accent text-sidebar-foreground/70 hover:text-sidebar-accent-foreground transition-colors"
              title={theme === "dark" ? "Light mode" : "Dark mode"}
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Moon className="h-4 w-4" aria-hidden="true" />
              )}
            </button>

            {/* Sign out */}
            <button
              onClick={(e) => {
                e.preventDefault();
                logout();
              }}
              className="p-2 rounded-md hover:bg-sidebar-accent text-sidebar-foreground/70 hover:text-sidebar-accent-foreground transition-colors"
              title={t("common.signOut")}
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
