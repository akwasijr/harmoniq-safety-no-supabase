"use client";

import * as React from "react";
import { createClient } from "@/lib/supabase/client";
import { hasSupabasePublicEnv } from "@/lib/supabase/public-env";
import { ROLE_PERMISSIONS } from "@/types";
import { useCompanyStore } from "@/stores/company-store";
import { clearAllHarmoniqStorage, loadOptionalStringFromStorage, saveToStorage } from "@/lib/local-storage";
import { resetBranding } from "@/lib/branding";
import { clearClientCookie } from "@/lib/client-cookies";
import { getPlatformSlugs } from "@/lib/platform-config";
import { mockUsers } from "@/mocks/data";
import type { User, Company, Permission, UserRole, CompanyRole } from "@/types";

const MOCK_AUTH_KEY = "harmoniq_mock_user_email";
const IS_MOCK_MODE = process.env.NEXT_PUBLIC_ENABLE_MOCK_MODE === "true" && !hasSupabasePublicEnv();

const LEGACY_SESSION_STORAGE_KEY = "harmoniq_auth_session";
const LEGACY_PROFILE_STORAGE_KEY = "harmoniq_auth_profile";
const PLATFORM_SLUGS = getPlatformSlugs();

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
  const SELECTED_COMPANY_STORAGE_KEY = "harmoniq_selected_company";
  const initialSelectedCompany = loadOptionalStringFromStorage(SELECTED_COMPANY_STORAGE_KEY);
  const [isLoading, setIsLoading] = React.useState(true);
  const [user, setUser] = React.useState<User | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = React.useState<string | null>(initialSelectedCompany);
  const { items: allCompanies } = useCompanyStore();

  const clearLegacyAuthCache = React.useCallback(() => {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(LEGACY_SESSION_STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_PROFILE_STORAGE_KEY);
  }, []);

  const clearStoredAuthState = React.useCallback(() => {
    if (typeof window === "undefined") return;
    clearLegacyAuthCache();
    window.localStorage.removeItem(SELECTED_COMPANY_STORAGE_KEY);
  }, [clearLegacyAuthCache]);

  const hydrateProfile = React.useCallback(
    async (userId: string, accessToken?: string) => {
      // Use the access token directly with Supabase REST API to avoid
      // re-entrancy issues with the SSR browser client's internal getSession()
      // call during auth state hydration.
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      const token = accessToken || supabaseKey;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);

      let profile = null;
      let error = null;

      try {
        const res = await fetch(
          `${supabaseUrl}/rest/v1/users?select=*&id=eq.${userId}`,
          {
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${token}`,
              Accept: "application/vnd.pgrst.object+json",
            },
            signal: controller.signal,
          }
        );
        clearTimeout(timeout);

        if (!res.ok) {
          const body = await res.text();
          error = { message: `HTTP ${res.status}: ${body}` };
        } else {
          profile = await res.json();
        }
      } catch (fetchErr: unknown) {
        clearTimeout(timeout);
        const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
        console.warn("[Harmoniq] Profile fetch failed:", msg);
        error = { message: msg };
      }

      if (error) throw error;

      if (!profile) {
        setUser(null);
        setSelectedCompanyId(null);
        clearStoredAuthState();
        return null;
      }

      clearLegacyAuthCache();
      const nextUser = profile as User;
      setUser(nextUser);
      const storedCompanyId = loadOptionalStringFromStorage(SELECTED_COMPANY_STORAGE_KEY);
      const nextCompanyId = nextUser.role === "super_admin" ? storedCompanyId ?? nextUser.company_id : nextUser.company_id;
      setSelectedCompanyId(nextCompanyId);

      if (nextCompanyId) {
        saveToStorage(SELECTED_COMPANY_STORAGE_KEY, nextCompanyId);
      } else if (typeof window !== "undefined") {
        window.localStorage.removeItem(SELECTED_COMPANY_STORAGE_KEY);
      }

      return nextUser;
    },
    [clearLegacyAuthCache, clearStoredAuthState]
  );

  // Initialize auth state, mock mode (no Supabase) or real Supabase
  React.useEffect(() => {
    if (IS_MOCK_MODE) {
      // Mock auth: check localStorage for a previously logged-in mock user
      const storedEmail = typeof window !== "undefined" ? window.localStorage.getItem(MOCK_AUTH_KEY) : null;
      if (storedEmail) {
        const mockUser = mockUsers.find((u) => u.email === storedEmail) as User | undefined;
        if (mockUser) {
          setUser(mockUser);
          const cid = mockUser.company_id;
          setSelectedCompanyId(cid);
          if (cid) saveToStorage(SELECTED_COMPANY_STORAGE_KEY, cid);
        }
      }
      setIsLoading(false);
      return;
    }

    const supabase = createClient();
    
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          await hydrateProfile(session.user.id, session.access_token);
        } else {
          setUser(null);
          setSelectedCompanyId(null);
          clearStoredAuthState();
        }
      } catch (err) {
        console.error("[Harmoniq] Auth init error:", err);
        setUser(null);
        setSelectedCompanyId(null);
        clearStoredAuthState();
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
          clearStoredAuthState();
          return;
        }
        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          try {
            await hydrateProfile(session.user.id, session.access_token);
          } catch (err) {
            console.error("[Harmoniq] Auth state change error:", err);
            setUser(null);
            setSelectedCompanyId(null);
            clearStoredAuthState();
          }
        }
      }
    );

    return () => { subscription.unsubscribe(); };
  }, [clearStoredAuthState, hydrateProfile]);
  
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

  // Super admin: if no company is selected yet AND not in platform mode, auto-select the first non-platform company
  const isPlatformEntry = typeof window !== "undefined" && window.localStorage.getItem("harmoniq_platform_entry") === "true";
  React.useEffect(() => {
    if (!isSuperAdmin || selectedCompanyId || isPlatformEntry) return;
    const nonPlatform = allCompanies.find((c) => !PLATFORM_SLUGS.includes(c.slug?.toLowerCase?.() || ""));
      const fallback = nonPlatform ?? allCompanies[0];
      if (fallback?.id) {
        setSelectedCompanyId(fallback.id);
        saveToStorage(SELECTED_COMPANY_STORAGE_KEY, fallback.id);
    }
  }, [isSuperAdmin, selectedCompanyId, allCompanies, isPlatformEntry]);

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
    if (companyId) {
      saveToStorage(SELECTED_COMPANY_STORAGE_KEY, companyId);
    } else if (typeof window !== "undefined") {
      window.localStorage.removeItem(SELECTED_COMPANY_STORAGE_KEY);
    }
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
    setUser(null);
    setSelectedCompanyId(null);

    if (IS_MOCK_MODE) {
      if (typeof window !== "undefined") window.localStorage.removeItem(MOCK_AUTH_KEY);
    } else {
      try {
        const supabase = createClient();
        await Promise.race([
          supabase.auth.signOut({ scope: "global" }),
          new Promise((resolve) => setTimeout(resolve, 3000)),
        ]);
      } catch {
        // Ignore errors. We always want to clear local state
      }
    }
    
    clearAllHarmoniqStorage();
    if (typeof window !== "undefined") {
      document.cookie.split(";").forEach((c) => {
        const name = c.trim().split("=")[0];
        if (name.startsWith("sb-") || name.startsWith("harmoniq")) {
          clearClientCookie(name);
        }
      });
      Object.keys(window.localStorage).forEach((key) => {
        if (key.startsWith("sb-")) window.localStorage.removeItem(key);
      });
    }
    resetBranding();
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

/** Mock login: stores email in localStorage and reloads. Password: "demo123" for all users. */
export function mockLogin(email: string): User | null {
  if (!IS_MOCK_MODE) return null;
  const found = mockUsers.find((u) => u.email.toLowerCase() === email.toLowerCase()) as User | undefined;
  if (!found) return null;
  window.localStorage.setItem(MOCK_AUTH_KEY, found.email);
  return found;
}

export { IS_MOCK_MODE };

// ---------------------------------------------------------------------------
// Standalone permission helpers (pure functions, no React context needed)
// ---------------------------------------------------------------------------

export function getEffectivePermissions(role: UserRole | null, customPermissions?: Permission[]): Permission[] {
  if (!role) return [];
  if (role === "super_admin") return ROLE_PERMISSIONS["super_admin"];

  const rolePerms = ROLE_PERMISSIONS[role as CompanyRole] || [];
  const customPerms = customPermissions || [];
  return [...new Set([...rolePerms, ...customPerms])];
}

export function hasPermission(role: UserRole | null, permission: Permission, customPermissions?: Permission[]): boolean {
  if (role === "super_admin") return true;
  return getEffectivePermissions(role, customPermissions).includes(permission);
}

export function hasAnyPermission(role: UserRole | null, permissions: Permission[], customPermissions?: Permission[]): boolean {
  if (role === "super_admin") return true;
  const effectivePerms = getEffectivePermissions(role, customPermissions);
  return permissions.some((p) => effectivePerms.includes(p));
}

export function hasAllPermissions(role: UserRole | null, permissions: Permission[], customPermissions?: Permission[]): boolean {
  if (role === "super_admin") return true;
  const effectivePerms = getEffectivePermissions(role, customPermissions);
  return permissions.every((p) => effectivePerms.includes(p));
}
