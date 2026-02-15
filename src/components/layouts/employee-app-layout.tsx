"use client";

import * as React from "react";
import Link from "next/link";
import { Shield } from "lucide-react";
import { BottomTabs } from "@/components/navigation/bottom-tabs";

interface EmployeeAppLayoutProps {
  children: React.ReactNode;
  company: string;
  companyName?: string;
  companyLogo?: string | null;
  showHeader?: boolean;
  headerTitle?: string;
}

export function EmployeeAppLayout({
  children,
  company,
  companyName = "Harmoniq Safety",
  companyLogo = null,
  showHeader = true,
  headerTitle,
}: EmployeeAppLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      {/* Header */}
      {showHeader && (
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background px-4">
          <Link href={`/${company}/app`} className="flex items-center gap-2">
            {companyLogo ? (
              <img
                src={companyLogo}
                alt={`${companyName} logo`}
                className="h-6 w-6 rounded object-contain"
              />
            ) : (
              <Shield className="h-5 w-5" aria-hidden="true" />
            )}
            <span className="font-semibold">{headerTitle || companyName}</span>
          </Link>
        </header>
      )}

      {/* Main content */}
      <main className="flex-1 pb-20">{children}</main>

      {/* Bottom navigation */}
      <BottomTabs company={company} />
    </div>
  );
}
