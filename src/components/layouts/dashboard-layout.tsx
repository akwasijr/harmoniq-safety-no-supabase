"use client";

import * as React from "react";
import { Menu, X } from "lucide-react";
import { Sidebar } from "@/components/navigation/sidebar";
import { Button } from "@/components/ui/button";
import { CompanySwitcher } from "@/components/auth/company-switcher";
import { useAuth } from "@/hooks/use-auth";

interface DashboardLayoutProps {
  children: React.ReactNode;
  company: string;
  companyName?: string;
  companyLogo?: string | null;
  userName?: string;
  userRole?: string;
  notificationCount?: number;
}

export function DashboardLayout({
  children,
  company,
  companyName = "Company",
  companyLogo = null,
  userName = "User",
  userRole = "Employee",
  notificationCount = 0,
}: DashboardLayoutProps) {
  const [showMobileMenu, setShowMobileMenu] = React.useState(false);
  const { isSuperAdmin } = useAuth();

  // L18: Close mobile sidebar on Escape key
  React.useEffect(() => {
    if (!showMobileMenu) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowMobileMenu(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [showMobileMenu]);

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
          notificationCount={notificationCount}
          showPlatformAdmin={isSuperAdmin}
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
              notificationCount={notificationCount}
              showPlatformAdmin={isSuperAdmin}
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
            {!isSuperAdmin && (
              <span className="font-semibold lg:hidden">{companyName}</span>
            )}
          </div>
        </header>
        
        <main className="flex-1 overflow-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
