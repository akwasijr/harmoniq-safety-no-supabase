"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  AlertTriangle,
  Users,
  MapPin,
  Package,
  FileText,
  ClipboardCheck,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Moon,
  Sun,
  BarChart3,
  Globe,
  Building2,
  UserCog,
  LibraryBig,
  Layers,
  Radio,
  ShieldCheck,
  FileKey,
  MessageSquare,
  GraduationCap,
  Leaf,
  ClipboardList,
  ChevronDown,
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
  title: string;
  titleKey?: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  exactMatch?: boolean;
  additionalPaths?: string[];
  requiredRoles?: string[];
}

type NavGroup = {
  label: string;
  items: NavItem[];
};

const companyNavGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [
      {
        title: "Dashboard",
        titleKey: "nav.dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        exactMatch: true,
      },
      {
        title: "Live Feed",
        href: "/dashboard/live-feed",
        icon: Radio,
        requiredRoles: ["company_admin", "manager", "super_admin"],
      },
    ],
  },
  // OPERATIONS
  {
    label: "Operations",
    items: [
      {
        title: "Incidents",
        titleKey: "nav.incidents",
        href: "/dashboard/incidents",
        icon: AlertTriangle,
        additionalPaths: ["/dashboard/tickets"],
      },
      {
        title: "Inspections",
        href: "/dashboard/checklists",
        icon: ClipboardCheck,
        exactMatch: true,
        additionalPaths: ["/dashboard/risk-assessments", "/dashboard/inspections", "/dashboard/checklists/my-templates", "/dashboard/checklists/templates"],
      },
      {
        title: "Permits",
        href: "/dashboard/permits",
        icon: FileKey,
        requiredRoles: ["company_admin", "manager", "super_admin"],
      },
      {
        title: "Toolbox Talks",
        href: "/dashboard/toolbox-talks",
        icon: MessageSquare,
        requiredRoles: ["company_admin", "manager", "super_admin", "safety_officer"],
      },
    ],
  },
  // MANAGEMENT
  {
    label: "Management",
    items: [
      {
        title: "Risk Register",
        href: "/dashboard/risk-register",
        icon: ShieldCheck,
        requiredRoles: ["company_admin", "manager", "super_admin"],
      },
      {
        title: "Training",
        href: "/dashboard/training",
        icon: GraduationCap,
        requiredRoles: ["company_admin", "manager", "super_admin"],
      },
      {
        title: "Environment",
        href: "/dashboard/environment",
        icon: Leaf,
        requiredRoles: ["company_admin", "manager", "super_admin"],
      },
      {
        title: "Compliance",
        href: "/dashboard/compliance",
        icon: ClipboardList,
        requiredRoles: ["company_admin", "manager", "super_admin", "viewer"],
      },
    ],
  },
  // REPORTING
  {
    label: "Reporting",
    items: [
      {
        title: "Analytics",
        titleKey: "nav.analytics",
        href: "/dashboard/analytics",
        icon: BarChart3,
        requiredRoles: ["company_admin", "manager", "super_admin", "viewer"],
      },
      {
        title: "Documents",
        href: "/dashboard/content",
        icon: FileText,
        requiredRoles: ["company_admin", "manager", "super_admin", "safety_officer"],
      },
    ],
  },
  // ADMIN
  {
    label: "Admin",
    items: [
      {
        title: "Asset Management",
        titleKey: "nav.assets",
        href: "/dashboard/assets",
        icon: Package,
        additionalPaths: ["/dashboard/corrective-actions", "/dashboard/work-orders", "/dashboard/parts", "/dashboard/inspection-routes"],
        requiredRoles: ["company_admin", "manager", "super_admin", "safety_officer", "viewer"],
      },
      {
        title: "Users & Teams",
        titleKey: "nav.usersTeams",
        href: "/dashboard/users",
        icon: Users,
        requiredRoles: ["company_admin", "manager", "super_admin"],
      },
      {
        title: "Locations",
        titleKey: "nav.locations",
        href: "/dashboard/locations",
        icon: MapPin,
        additionalPaths: ["/dashboard/qr-codes"],
        requiredRoles: ["company_admin", "manager", "super_admin"],
      },
      {
        title: "Settings",
        titleKey: "nav.settings",
        href: "/dashboard/settings",
        icon: Settings,
        requiredRoles: ["company_admin", "super_admin"],
      },
    ],
  },
];

// Flatten for backward compat
const companyNavItems: NavItem[] = companyNavGroups.flatMap((g) => g.items);

const superAdminPlatformNav: NavItem[] = [
  {
    title: "Overview",
    href: "/dashboard/platform/overview",
    icon: Layers,
    additionalPaths: ["/dashboard/platform"],
    exactMatch: false,
  },
  {
    title: "Marketing Site",
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

const PLATFORM_ENTRY_KEY = "harmoniq_platform_entry";

// Collapsible sidebar group
function SidebarGroup({ label, isCollapsed, children }: { label: string; isCollapsed: boolean; children: React.ReactNode }) {
  const [open, setOpen] = React.useState(true);

  if (isCollapsed) {
    return <ul className="space-y-0.5">{children}</ul>;
  }

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/40 hover:text-sidebar-foreground/60 transition-colors"
      >
        <span>{label}</span>
        <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <ul className="space-y-0.5 mt-0.5">
          {children}
        </ul>
      )}
    </div>
  );
}

export function Sidebar({ 
  company, 
  companyName = "Harmoniq",
  companyLogo = null,
  userName = "User",
  userRole = "Employee",
  showPlatformAdmin = false,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = React.useState(false);
  const [hovered, setHovered] = React.useState(false);
  const [enteredViaPlatform, setEnteredViaPlatform] = React.useState(false);
  const { theme, setTheme } = useTheme();
  const { isSuperAdmin, isCompanyAdmin, hasSelectedCompany, currentCompany, availableCompanies, switchCompany, logout, user } = useAuth();
  const { t } = useTranslation();
  const isCollapsed = collapsed && !hovered;
  const actualRole = user?.role || "employee";

  // Platform nav only shows when user entered via /admin login flow
  // Track platform entry state to avoid hydration mismatch
  React.useEffect(() => {
    setEnteredViaPlatform(window.localStorage.getItem(PLATFORM_ENTRY_KEY) === "true");
  }, []);

  const isAdmin = isSuperAdmin || isCompanyAdmin;
  const showPlatformNav = isAdmin && enteredViaPlatform;
  const platformNavItems = superAdminPlatformNav;

  const getTitle = (item: NavItem) => item.titleKey ? t(item.titleKey) : item.title;

  const isNavItemActive = (item: NavItem) => {
    const href = `/${company}${item.href}`;

    if (item.href === "/dashboard/checklists/my-templates") {
      return pathname === href
        || pathname === `/${company}/dashboard/checklists/templates`
        || pathname === `/${company}/dashboard/checklists/new`
        || /^\/[^/]+\/dashboard\/checklists\/[^/]+$/.test(pathname);
    }

    // Special case for platform overview — match /dashboard/platform/overview exactly
    if (item.href === "/dashboard/platform/overview") {
      return pathname === href;
    }

    if (item.exactMatch) {
      if (pathname === href) return true;
    } else if (pathname === href || pathname.startsWith(`${href}/`)) {
      return true;
    }

    return (item.additionalPaths || []).some((additionalPath) => {
      const fullPath = `/${company}${additionalPath}`;
      return pathname === fullPath || pathname.startsWith(`${fullPath}/`);
    });
  };

  const userInitials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleCompanySelect = (companyId: string | null, slug?: string) => {
    switchCompany(companyId);
    if (slug && slug !== company) {
      router.push(`/${slug}/dashboard`);
    }
  };

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
      {/* Header */}
      <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-3">
        <Link
          href={showPlatformNav ? `/${company}/dashboard/platform/overview` : `/${company}/dashboard`}
          className="flex items-center gap-2 min-w-0"
        >
          {showPlatformNav ? (
            <img
              src="/favicon.svg"
              alt="Harmoniq"
              className="h-6 w-6 shrink-0"
            />
          ) : companyLogo ? (
            <img
              src={companyLogo}
              alt={`${companyName} logo`}
              className="h-7 w-7 shrink-0 rounded object-contain"
            />
          ) : (
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary text-[11px] font-bold text-primary-foreground">
              {companyName.charAt(0).toUpperCase()}
            </div>
          )}
          {!isCollapsed && (
            <span className="text-sm font-semibold truncate">
              {showPlatformNav ? "Harmoniq" : companyName}
            </span>
          )}
        </Link>
        <button
          className="rounded-md p-1.5 text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
          onClick={() => {
            setCollapsed(!collapsed);
            setHovered(false);
          }}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {/* Platform Admin Section */}
        {showPlatformNav && (
          <div className="mb-1">
            {!isCollapsed && (
              <p className="px-3 mb-1.5 text-[11px] font-medium text-sidebar-foreground/40">
                Platform
              </p>
            )}
            {isCollapsed && (
              <div className="flex justify-center mb-1.5">
                <Globe className="h-3.5 w-3.5 text-sidebar-foreground/40" aria-hidden="true" />
              </div>
            )}
            <ul className="space-y-0.5">
              {platformNavItems.map((item) => {
                const href = `/${company}${item.href}`;
                const isActive = isNavItemActive(item);
                return (
                  <li key={item.href}>
                    <Link
                      href={href}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors",
                        "hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                        isActive
                          ? "bg-primary text-primary-foreground font-semibold"
                          : "text-sidebar-foreground/60",
                        isCollapsed && "justify-center px-2"
                      )}
                      title={isCollapsed ? getTitle(item) : undefined}
                    >
                      <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                      {!isCollapsed && <span>{getTitle(item)}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Company Selector — shown in platform mode for all admin roles */}
        {showPlatformNav && !isCollapsed && (
          <div className="my-3 px-2">
            <label className="block text-[11px] font-medium text-sidebar-foreground/40 mb-1.5 px-1">
              Company
            </label>
            <select
              value={currentCompany?.id || ""}
              onChange={(e) => {
                const val = e.target.value;
                if (!val) {
                  handleCompanySelect(null);
                } else {
                  const target = availableCompanies.find((c) => c.id === val);
                  if (target) handleCompanySelect(target.id, target.slug);
                }
              }}
              className="w-full rounded-md border border-sidebar-border bg-sidebar-background px-2.5 py-1.5 text-[13px] font-medium text-sidebar-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            >
              <option value="">Platform only</option>
              {availableCompanies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Divider between platform and company sections */}
        {showPlatformNav && hasSelectedCompany && (
          <div className="my-2 mx-2 border-t border-sidebar-border" />
        )}

        {/* Company nav items — collapsible groups */}
        {(!showPlatformNav || hasSelectedCompany) && (
          <div className="space-y-1">
            {companyNavGroups.map((group, groupIdx) => {
              const visibleItems = group.items.filter((item) =>
                !item.requiredRoles || item.requiredRoles.includes(actualRole)
              );
              if (visibleItems.length === 0) return null;
              return (
                <SidebarGroup
                  key={groupIdx}
                  label={group.label}
                  isCollapsed={isCollapsed}
                >
                  {visibleItems.map((item) => {
                    const href = `/${company}${item.href}`;
                    const isActive = isNavItemActive(item);
                    return (
                      <li key={item.href}>
                        <Link
                          href={href}
                          className={cn(
                            "flex items-center gap-2.5 rounded-md py-1.5 text-[13px] transition-colors",
                            isCollapsed ? "justify-center px-2" : "pl-7 pr-3",
                            "hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                            isActive
                              ? "bg-primary text-primary-foreground font-semibold"
                              : "text-sidebar-foreground/40"
                          )}
                          title={isCollapsed ? getTitle(item) : undefined}
                        >
                          <item.icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          {!isCollapsed && <span>{getTitle(item)}</span>}
                          {!isCollapsed && item.badge !== undefined && item.badge > 0 && (
                            <span className="ml-auto rounded-full bg-sidebar-primary px-1.5 py-0.5 text-[10px] text-sidebar-primary-foreground">
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </SidebarGroup>
              );
            })}
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-2.5">
        <div className={cn(
          "flex items-center",
          isCollapsed ? "flex-col gap-2" : "gap-2"
        )}>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary shrink-0">
            {userInitials}
          </div>
          
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="truncate text-[13px] font-medium">{userName}</p>
              <p className="truncate text-[11px] text-sidebar-foreground/40">{userRole}</p>
            </div>
          )}

          <div className={cn(
            "flex items-center",
            isCollapsed ? "flex-col gap-0.5" : "gap-0.5"
          )}>
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-1.5 rounded-md hover:bg-sidebar-accent text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors"
              title={theme === "dark" ? "Light mode" : "Dark mode"}
            >
              {theme === "dark" ? (
                <Sun className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <Moon className="h-3.5 w-3.5" aria-hidden="true" />
              )}
            </button>

            <button
              onClick={(e) => {
                e.preventDefault();
                logout();
              }}
              className="p-1.5 rounded-md hover:bg-sidebar-accent text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors"
              title={t("common.signOut")}
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
