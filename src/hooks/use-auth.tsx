"use client";

import * as React from "react";
import { createClient } from "@/lib/supabase/client";
import { getCurrentUser } from "@/mocks/data";
import { ROLE_PERMISSIONS } from "@/types";
import { useCompanyStore } from "@/stores/company-store";
import { clearAllHarmoniqStorage } from "@/lib/local-storage";
import { resetPrimaryColor } from "@/lib/branding";
import type { User, Company, Permission, UserRole, CompanyRole } from "@/types";

const isSupabaseConfigured =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

interface AuthContextType {
  // Current user
  user: User | null;
  isLoading: boolean;
  
  // Role checks
  isSuperAdmin: boolean;
  isCompanyAdmin: boolean;
  isManager: boolean;
  isEmployee: boolean;
  role: UserRole | null;
  
  // Company context (for super admin company switching)
  currentCompany: Company | null;
  hasSelectedCompany: boolean;
  switchCompany: (companyId: string | null) => void;
  availableCompanies: Company[];
  
  // Permission checks
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  hasAllPermissions: (permissions: Permission[]) => boolean;
  
  // Auth actions (for future real auth)
  logout: () => void;
}

const AuthContext = React.createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = React.useState(true);
  const [user, setUser] = React.useState<User | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = React.useState<string | null>(null);
  const { items: allCompanies } = useCompanyStore();
  
  // Initialize auth state
  React.useEffect(() => {
    if (isSupabaseConfigured) {
      // Supabase auth: get session then fetch user profile
      const supabase = createClient();
      
      const initAuth = async () => {
        try {
          const { data: { user: authUser } } = await supabase.auth.getUser();
          if (authUser) {
            // Fetch the user profile from our users table
            const { data: profile } = await supabase
              .from("users")
              .select("*")
              .eq("id", authUser.id)
              .single();
            
            if (profile) {
              setUser(profile as User);
              setSelectedCompanyId(
                profile.role === "super_admin" ? null : profile.company_id
              );
            }
          }
        } catch (err) {
          console.error("[Harmoniq] Auth init error:", err);
        } finally {
          setIsLoading(false);
        }
      };
      
      initAuth();

      // Listen for auth state changes (login, logout, token refresh)
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (event === "SIGNED_OUT" || !session?.user) {
            setUser(null);
            setSelectedCompanyId(null);
            return;
          }
          if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
            const { data: profile } = await supabase
              .from("users")
              .select("*")
              .eq("id", session.user.id)
              .single();
            if (profile) {
              setUser(profile as User);
              setSelectedCompanyId(
                profile.role === "super_admin" ? null : profile.company_id
              );
            }
          }
        }
      );

      return () => { subscription.unsubscribe(); };
    } else {
      // Mock auth fallback
      const currentUser = getCurrentUser();
      setUser(currentUser);
      setSelectedCompanyId(currentUser.role === "super_admin" ? null : currentUser.company_id);
      setIsLoading(false);
    }
  }, []);
  
  // Role checks
  const isSuperAdmin = user?.role === "super_admin";
  const isCompanyAdmin = user?.role === "company_admin";
  const isManager = user?.role === "manager";
  const isEmployee = user?.role === "employee";
  const role = user?.role || null;
  
  // Current company (respects super admin company switching)
  const currentCompany = React.useMemo(() => {
    if (!user) return null;
    const companyId = isSuperAdmin ? selectedCompanyId : user.company_id;
    if (!companyId) return null;
    return allCompanies.find((company) => company.id === companyId) || null;
  }, [user, isSuperAdmin, selectedCompanyId, allCompanies]);
  
  // Whether a company is currently selected (for showing company nav)
  const hasSelectedCompany = currentCompany !== null;
  
  // Available companies (only super admin can switch)
  const availableCompanies = React.useMemo(() => {
    if (!isSuperAdmin) return currentCompany ? [currentCompany] : [];
    return allCompanies;
  }, [isSuperAdmin, currentCompany, allCompanies]);
  
  // Switch company (super admin only). Pass null to go back to platform-only mode.
  const switchCompany = React.useCallback((companyId: string | null) => {
    if (!isSuperAdmin) return;
    setSelectedCompanyId(companyId);
  }, [isSuperAdmin]);
  
  // Get effective permissions
  const getEffectivePermissions = React.useCallback((): Permission[] => {
    if (!user) return [];
    if (isSuperAdmin) return ROLE_PERMISSIONS["super_admin"];
    
    // Get role-based permissions
    const rolePerms = ROLE_PERMISSIONS[user.role as CompanyRole] || [];
    
    // Merge with custom permissions
    const customPerms = user.custom_permissions || [];
    
    return [...new Set([...rolePerms, ...customPerms])];
  }, [user, isSuperAdmin]);
  
  // Permission checks
  const hasPermission = React.useCallback((permission: Permission): boolean => {
    if (isSuperAdmin) return true; // Super admin has all permissions
    return getEffectivePermissions().includes(permission);
  }, [isSuperAdmin, getEffectivePermissions]);
  
  const hasAnyPermission = React.useCallback((permissions: Permission[]): boolean => {
    if (isSuperAdmin) return true;
    const effectivePerms = getEffectivePermissions();
    return permissions.some((p) => effectivePerms.includes(p));
  }, [isSuperAdmin, getEffectivePermissions]);
  
  const hasAllPermissions = React.useCallback((permissions: Permission[]): boolean => {
    if (isSuperAdmin) return true;
    const effectivePerms = getEffectivePermissions();
    return permissions.every((p) => effectivePerms.includes(p));
  }, [isSuperAdmin, getEffectivePermissions]);
  
  // Logout
  const logout = React.useCallback(async () => {
    if (isSupabaseConfigured) {
      const supabase = createClient();
      await supabase.auth.signOut();
    }
    // Clear mock auth cookie
    document.cookie = "harmoniq_auth=; path=/; max-age=0; SameSite=Lax";
    clearAllHarmoniqStorage();
    resetPrimaryColor();
    setUser(null);
    setSelectedCompanyId(null);
    window.location.href = "/login";
  }, []);
  
  const value: AuthContextType = {
    user,
    isLoading,
    isSuperAdmin,
    isCompanyAdmin,
    isManager,
    isEmployee,
    role,
    currentCompany,
    hasSelectedCompany,
    switchCompany,
    availableCompanies,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    logout,
  };
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Convenience hook for permission checks
export function usePermission(permission: Permission): boolean {
  const { hasPermission } = useAuth();
  return hasPermission(permission);
}

// Convenience hook for role checks
export function useRole() {
  const { isSuperAdmin, isCompanyAdmin, isManager, isEmployee, role } = useAuth();
  return { isSuperAdmin, isCompanyAdmin, isManager, isEmployee, role };
}
