"use client";

import * as React from "react";
import { createClient } from "@/lib/supabase/client";
import { ROLE_PERMISSIONS } from "@/types";
import { useCompanyStore } from "@/stores/company-store";
import { clearAllHarmoniqStorage, loadFromStorage, saveToStorage } from "@/lib/local-storage";
import { resetPrimaryColor } from "@/lib/branding";
import type { User, Company, Permission, UserRole, CompanyRole } from "@/types";

const ADMIN_ENTRY_STORAGE_KEY = "harmoniq_admin_entry";
const ADMIN_ENTRY_COOKIE = "harmoniq_admin_entry";
const PLATFORM_SLUGS =
  (process.env.NEXT_PUBLIC_PLATFORM_SLUGS || "platform,admin,superadmin")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

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
  
  // Auth actions
  logout: () => void;
}

const AuthContext = React.createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const SESSION_STORAGE_KEY = "harmoniq_auth_session";
  const PROFILE_STORAGE_KEY = "harmoniq_auth_profile";
  const SELECTED_COMPANY_STORAGE_KEY = "harmoniq_selected_company";
  const initialProfile = loadFromStorage<User | null>(PROFILE_STORAGE_KEY, null);
  const initialSelectedCompany = loadFromStorage<string | null>(
    SELECTED_COMPANY_STORAGE_KEY,
    initialProfile?.company_id ?? null
  );
  const [isLoading, setIsLoading] = React.useState(!initialProfile);
  const [user, setUser] = React.useState<User | null>(initialProfile);
  const [selectedCompanyId, setSelectedCompanyId] = React.useState<string | null>(
    initialProfile
      ? initialProfile.role === "super_admin"
        ? initialSelectedCompany
        : initialProfile.company_id
      : null
  );
  const { items: allCompanies } = useCompanyStore();

  // Ensure the platform admin entry flag is cleared on standard entry paths
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const path = window.location.pathname;
    const search = window.location.search || "";
    const isAdminEntry = path.startsWith("/admin") || search.includes("admin-link") || path.includes("/dashboard/platform");
    if (!isAdminEntry) {
      window.localStorage.removeItem(ADMIN_ENTRY_STORAGE_KEY);
      document.cookie = `${ADMIN_ENTRY_COOKIE}=; path=/; max-age=0; samesite=lax`;
    }
  }, []);
  
  // Initialize auth state via Supabase
  React.useEffect(() => {
    const supabase = createClient();
    
    const initAuth = async () => {
      try {
        // Primary: get session from Supabase (reads cookies set by middleware)
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          // Save session tokens for resilience
          saveToStorage(SESSION_STORAGE_KEY, {
            access_token: session.access_token,
            refresh_token: session.refresh_token,
            expires_at: session.expires_at ?? undefined,
          });
          
          // Fetch user profile
          const { data: profile } = await supabase
            .from("users")
            .select("*")
            .eq("id", session.user.id)
            .single();
          
          if (profile) {
            setUser(profile as User);
            const storedCompanyId = loadFromStorage<string | null>(
              SELECTED_COMPANY_STORAGE_KEY,
              profile.company_id ?? null
            );
            const nextCompanyId = profile.role === "super_admin" ? storedCompanyId : profile.company_id;
            setSelectedCompanyId(nextCompanyId);
            saveToStorage(SELECTED_COMPANY_STORAGE_KEY, nextCompanyId);
            saveToStorage(PROFILE_STORAGE_KEY, profile);
          }
        } else {
          // No active session — try to restore from cached tokens
          const cached = loadFromStorage<{ access_token?: string; refresh_token?: string } | null>(
            SESSION_STORAGE_KEY,
            null
          );
          if (cached?.access_token && cached?.refresh_token) {
            const { data } = await supabase.auth.setSession({
              access_token: cached.access_token,
              refresh_token: cached.refresh_token,
            });
            if (data.user) {
              const { data: profile } = await supabase
                .from("users")
                .select("*")
                .eq("id", data.user.id)
                .single();
              if (profile) {
                setUser(profile as User);
                const storedCompanyId = loadFromStorage<string | null>(
                  SELECTED_COMPANY_STORAGE_KEY,
                  profile.company_id ?? null
                );
                const nextCompanyId = profile.role === "super_admin" ? storedCompanyId : profile.company_id;
                setSelectedCompanyId(nextCompanyId);
                saveToStorage(SELECTED_COMPANY_STORAGE_KEY, nextCompanyId);
                saveToStorage(PROFILE_STORAGE_KEY, profile);
              }
            } else {
              // Cached tokens are invalid — clear them
              window.localStorage.removeItem(SESSION_STORAGE_KEY);
              window.localStorage.removeItem(PROFILE_STORAGE_KEY);
              setUser(null);
              setSelectedCompanyId(null);
            }
          } else {
            // No session, no cache — user is not logged in
            setUser(null);
            setSelectedCompanyId(null);
            window.localStorage.removeItem(PROFILE_STORAGE_KEY);
          }
        }
      } catch (err) {
        console.error("[Harmoniq] Auth init error:", err);
        // Fall back to cached profile if available
        const cached = loadFromStorage<User | null>(PROFILE_STORAGE_KEY, null);
        if (cached) {
          setUser(cached);
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_OUT" || !session?.user) {
          setUser(null);
          setSelectedCompanyId(null);
          if (typeof window !== "undefined") {
            window.localStorage.removeItem(SESSION_STORAGE_KEY);
            window.localStorage.removeItem(PROFILE_STORAGE_KEY);
          }
          return;
        }
           if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
             try {
               if (session?.access_token && session?.refresh_token) {
                 saveToStorage(SESSION_STORAGE_KEY, {
                access_token: session.access_token,
                refresh_token: session.refresh_token,
                expires_at: session.expires_at ?? undefined,
              });
            }
             const { data: profile } = await supabase
               .from("users")
               .select("*")
               .eq("id", session.user.id)
               .single();
             if (profile) {
               setUser(profile as User);
               const storedCompanyId = loadFromStorage<string | null>(
                 SELECTED_COMPANY_STORAGE_KEY,
                 profile.company_id ?? null
               );
               const nextCompanyId = profile.role === "super_admin" ? storedCompanyId : profile.company_id;
               setSelectedCompanyId(nextCompanyId);
               saveToStorage(SELECTED_COMPANY_STORAGE_KEY, nextCompanyId);
               saveToStorage(PROFILE_STORAGE_KEY, profile);
             }
           } catch (err) {
             console.error("[Harmoniq] Auth state change error:", err);
           }
         }
       }
     );

    return () => { subscription.unsubscribe(); };
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
  // For super admins, honor the stored company selection even before the company list finishes loading.
  const hasSelectedCompany = isSuperAdmin ? Boolean(selectedCompanyId) : currentCompany !== null;

  // Super admin: if no company is selected yet, auto-select the first non-platform company to avoid landing on platform screens
  React.useEffect(() => {
    if (!isSuperAdmin || selectedCompanyId) return;
    const nonPlatform = allCompanies.find((c) => !PLATFORM_SLUGS.includes(c.slug?.toLowerCase?.() || ""));
    const fallback = nonPlatform ?? allCompanies[0];
    if (fallback?.id) {
      setSelectedCompanyId(fallback.id);
      saveToStorage(SELECTED_COMPANY_STORAGE_KEY, fallback.id);
    }
  }, [isSuperAdmin, selectedCompanyId, allCompanies]);

  // If the stored selection points to a platform slug, move to a real tenant
  React.useEffect(() => {
    if (!isSuperAdmin || !selectedCompanyId) return;
    const selected = allCompanies.find((c) => c.id === selectedCompanyId);
    if (selected && PLATFORM_SLUGS.includes(selected.slug?.toLowerCase?.() || "")) {
      const nonPlatform = allCompanies.find((c) => !PLATFORM_SLUGS.includes(c.slug?.toLowerCase?.() || ""));
      if (nonPlatform?.id) {
        setSelectedCompanyId(nonPlatform.id);
        saveToStorage(SELECTED_COMPANY_STORAGE_KEY, nonPlatform.id);
      }
    }
  }, [isSuperAdmin, selectedCompanyId, allCompanies]);
  
  // Available companies (only super admin can switch)
  const availableCompanies = React.useMemo(() => {
    if (!isSuperAdmin) return currentCompany ? [currentCompany] : [];
    return allCompanies;
  }, [isSuperAdmin, currentCompany, allCompanies]);
  
  // Switch company (super admin only). Pass null to go back to platform-only mode.
  const switchCompany = React.useCallback((companyId: string | null) => {
    if (!isSuperAdmin) return;
    setSelectedCompanyId(companyId);
    saveToStorage(SELECTED_COMPANY_STORAGE_KEY, companyId);
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
    // Clear state first to prevent UI from showing stale data
    setUser(null);
    setSelectedCompanyId(null);
    
    try {
      const supabase = createClient();
      // Use "global" scope to invalidate server-side session too
      await Promise.race([
        supabase.auth.signOut({ scope: "global" }),
        new Promise((resolve) => setTimeout(resolve, 3000)),
      ]);
    } catch {
      // Ignore errors — we always want to clear local state
    }
    
    clearAllHarmoniqStorage();
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("harmoniq_admin_entry");
      // Clear ALL cookies that could hold session data
      document.cookie.split(";").forEach((c) => {
        const name = c.trim().split("=")[0];
        if (name.startsWith("sb-") || name.startsWith("harmoniq")) {
          document.cookie = `${name}=; path=/; max-age=0; samesite=lax`;
        }
      });
      // Clear all Supabase localStorage keys
      Object.keys(window.localStorage).forEach((key) => {
        if (key.startsWith("sb-")) window.localStorage.removeItem(key);
      });
    }
    resetPrimaryColor();
    // Force a full page reload to clear any in-memory state (React context, stores, etc.)
    window.location.replace("/login");
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
