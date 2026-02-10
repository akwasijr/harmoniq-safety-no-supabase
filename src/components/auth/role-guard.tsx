"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldAlert } from "lucide-react";
import { useAuth, useRole } from "@/hooks/use-auth";
import type { Permission, UserRole } from "@/types";

interface RoleGuardProps {
  children: React.ReactNode;
  
  // Role-based access
  allowedRoles?: UserRole[];
  requireSuperAdmin?: boolean;
  
  // Permission-based access
  requiredPermission?: Permission;
  requiredPermissions?: Permission[];
  anyPermission?: Permission[];
  
  // Fallback behavior
  fallback?: React.ReactNode;
  redirectTo?: string;
}

/**
 * RoleGuard - Protects content based on user role or permissions
 * 
 * Usage:
 *   <RoleGuard requireSuperAdmin>
 *     <PlatformAdminContent />
 *   </RoleGuard>
 * 
 *   <RoleGuard allowedRoles={["company_admin", "manager"]}>
 *     <UserManagement />
 *   </RoleGuard>
 * 
 *   <RoleGuard requiredPermission="settings.edit">
 *     <SettingsEditor />
 *   </RoleGuard>
 */
export function RoleGuard({
  children,
  allowedRoles,
  requireSuperAdmin,
  requiredPermission,
  requiredPermissions,
  anyPermission,
  fallback,
  redirectTo,
}: RoleGuardProps) {
  const router = useRouter();
  const { user, isLoading, hasPermission, hasAnyPermission, hasAllPermissions } = useAuth();
  const { isSuperAdmin, role } = useRole();
  
  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  // Not logged in
  if (!user) {
    if (redirectTo) {
      router.push(redirectTo);
      return null;
    }
    return fallback || <AccessDenied message="Please log in to access this content." />;
  }
  
  // Check super admin requirement
  if (requireSuperAdmin && !isSuperAdmin) {
    if (redirectTo) {
      router.push(redirectTo);
      return null;
    }
    return fallback || <AccessDenied message="This section is only accessible to platform administrators." />;
  }
  
  // Check allowed roles
  if (allowedRoles && allowedRoles.length > 0) {
    if (!role || !allowedRoles.includes(role)) {
      if (redirectTo) {
        router.push(redirectTo);
        return null;
      }
      return fallback || <AccessDenied message="You don't have the required role to access this content." />;
    }
  }
  
  // Check single permission
  if (requiredPermission && !hasPermission(requiredPermission)) {
    if (redirectTo) {
      router.push(redirectTo);
      return null;
    }
    return fallback || <AccessDenied message="You don't have permission to access this content." />;
  }
  
  // Check all permissions
  if (requiredPermissions && requiredPermissions.length > 0) {
    if (!hasAllPermissions(requiredPermissions)) {
      if (redirectTo) {
        router.push(redirectTo);
        return null;
      }
      return fallback || <AccessDenied message="You don't have all required permissions." />;
    }
  }
  
  // Check any permission
  if (anyPermission && anyPermission.length > 0) {
    if (!hasAnyPermission(anyPermission)) {
      if (redirectTo) {
        router.push(redirectTo);
        return null;
      }
      return fallback || <AccessDenied message="You don't have any of the required permissions." />;
    }
  }
  
  // All checks passed
  return <>{children}</>;
}

// Default access denied component
function AccessDenied({ message }: { message: string }) {
  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center gap-4 text-center">
      <div className="rounded-full bg-destructive/10 p-4">
        <ShieldAlert className="h-8 w-8 text-destructive" />
      </div>
      <div>
        <h2 className="text-lg font-semibold">Access Denied</h2>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

/**
 * SuperAdminOnly - Shorthand for super admin content
 */
export function SuperAdminOnly({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <RoleGuard requireSuperAdmin fallback={fallback}>
      {children}
    </RoleGuard>
  );
}

/**
 * CompanyAdminOnly - Shorthand for company admin content
 */
export function CompanyAdminOnly({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={["company_admin", "super_admin"]} fallback={fallback}>
      {children}
    </RoleGuard>
  );
}

/**
 * ManagerOnly - Shorthand for manager+ content
 */
export function ManagerOnly({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={["manager", "company_admin", "super_admin"]} fallback={fallback}>
      {children}
    </RoleGuard>
  );
}

/**
 * useRoleGuard - Hook for conditional rendering based on role
 */
export function useRoleGuard() {
  const { isSuperAdmin, role, hasPermission, hasAnyPermission } = useAuth();
  
  return {
    canAccessPlatformAdmin: isSuperAdmin,
    canManageUsers: hasAnyPermission(["users.create", "users.edit", "users.delete"]),
    canManageSettings: hasPermission("settings.edit"),
    canViewAnalytics: hasAnyPermission(["reports.view_team", "reports.view_all"]),
    canExportData: hasPermission("reports.export"),
    canManageTeams: hasAnyPermission(["teams.create", "teams.edit", "teams.delete"]),
    role,
  };
}
