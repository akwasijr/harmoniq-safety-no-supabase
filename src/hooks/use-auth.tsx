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
  const authRetryRef = React.useRef(0);

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
    
    const withTimeout = async <T,>(promise: Promise<T>, ms: number, label: string) => {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`${label} timeout`)), ms)
      );
      return Promise.race([promise, timeout]) as Promise<T>;
    };

    const initAuth = async () => {
      let shouldRetry = false;
      try {
        let authUser: typeof undefined | null | { id: string; email?: string };
        let sessionData: { access_token?: string; refresh_token?: string; expires_at?: number } | null = null;
        try {
          const {
            data: { session },
          } = await withTimeout(supabase.auth.getSession(), 4_000, "getSession");
          authUser = session?.user ?? null;
          if (session?.access_token && session?.refresh_token) {
            saveToStorage(SESSION_STORAGE_KEY, {
              access_token: session.access_token,
              refresh_token: session.refresh_token,
              expires_at: session.expires_at ?? undefined,
            });
          }
        } catch (err) {
          console.warn("[Harmoniq] getSession failed, falling back to getUser:", err);
          const {
            data: { user },
          } = await withTimeout(supabase.auth.getUser(), 6_000, "getUser");
          authUser = user ?? null;
        }

        if (!authUser) {
          sessionData = loadFromStorage<{ access_token?: string; refresh_token?: string; expires_at?: number } | null>(
            SESSION_STORAGE_KEY,
            null
          );
          if (sessionData?.access_token && sessionData?.refresh_token) {
            const { data } = await supabase.auth.setSession({
              access_token: sessionData.access_token,
              refresh_token: sessionData.refresh_token,
            });
            authUser = data.user ?? null;
          }
        }

        if (authUser) {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 8_000);

          const { data: profile, error: profileError } = await supabase
            .from("users")
            .select("*")
            .eq("id", authUser.id)
            .abortSignal(controller.signal)
            .single();

          clearTimeout(timeout);

           if (profileError) {
             console.error("[Harmoniq] Profile fetch error:", profileError.message);
           } else if (profile) {
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
          setUser(null);
          setSelectedCompanyId(null);
          if (typeof window !== "undefined") {
            window.localStorage.removeItem(PROFILE_STORAGE_KEY);
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("timeout") && authRetryRef.current < 2) {
          authRetryRef.current += 1;
          shouldRetry = true;
          console.warn("[Harmoniq] Auth init timeout, retrying...", authRetryRef.current);
          setTimeout(initAuth, 1500);
        } else {
          console.error("[Harmoniq] Auth init error:", err);
        }
      } finally {
        if (!shouldRetry) {
          setIsLoading(false);
        }
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
    const supabase = createClient();
    await supabase.auth.signOut();
    clearAllHarmoniqStorage();
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("harmoniq_admin_entry");
      document.cookie = `${ADMIN_ENTRY_COOKIE}=; path=/; max-age=0; samesite=lax`;
    }
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
