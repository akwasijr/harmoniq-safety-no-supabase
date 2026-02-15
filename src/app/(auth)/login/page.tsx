// Deployed at: 1770751895
"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Mail, Loader, Eye, EyeOff } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { loadFromStorage, saveToStorage } from "@/lib/local-storage";

type AppChoice = "dashboard" | "app";
const APP_CHOICE_STORAGE_KEY = "harmoniq_app_choice";
const APP_CHOICE_COOKIE = "harmoniq_app_choice";
const ADMIN_ENTRY_STORAGE_KEY = "harmoniq_admin_entry";
const ADMIN_ENTRY_COOKIE = "harmoniq_admin_entry";
const SELECTED_COMPANY_STORAGE_KEY = "harmoniq_selected_company";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [loginMode, setLoginMode] = React.useState<"password" | "magic">("password");
  const [appChoice, setAppChoice] = React.useState<AppChoice>(() => {
    if (typeof window === "undefined") return "dashboard";
    const stored = window.localStorage.getItem(APP_CHOICE_STORAGE_KEY);
    return stored === "app" || stored === "dashboard" ? stored : "dashboard";
  });

  React.useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam) {
      setError(errorParam);
    }
  }, [searchParams]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    // Regular login should never keep the platform admin entry flag
    window.localStorage.removeItem(ADMIN_ENTRY_STORAGE_KEY);
    document.cookie = `${ADMIN_ENTRY_COOKIE}=; path=/; max-age=0; samesite=lax`;
    window.localStorage.setItem(APP_CHOICE_STORAGE_KEY, appChoice);
    document.cookie = `${APP_CHOICE_COOKIE}=${appChoice}; path=/; max-age=2592000; samesite=lax`;
  }, [appChoice]);

  const PLATFORM_SLUGS =
    (process.env.NEXT_PUBLIC_PLATFORM_SLUGS || "platform,admin,superadmin")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
  // Supabase .not("col","in","(val1,val2)") requires NO quotes around values
  const PLATFORM_SLUGS_LIST = `(${PLATFORM_SLUGS.join(",")})`;
  const isPlatformSlug = (slug?: string | null) =>
    !!slug &&
    (PLATFORM_SLUGS.includes(slug.toLowerCase()) || slug.toLowerCase() === "platform");

  const getAllowedApps = (role: string): AppChoice[] => {
    if (role === "employee") return ["app"];
    if (role === "super_admin") return ["dashboard"]; // still allow picker value, but we will block platform portal here
    if (role === "company_admin" || role === "manager") return ["dashboard", "app"];
    return ["dashboard"];
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      setError("");

      const supabase = createClient();
      const { error: authError, data } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        setIsLoading(false);
        return;
      }

      // Ensure session is available for subsequent profile fetches
      if (data.session) {
        saveToStorage("harmoniq_auth_session", {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at,
        });
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
      }

      // Route based on user profile
      const userId = data.user?.id;
      if (!userId) {
        setError("Login succeeded but no user returned.");
        setIsLoading(false);
        return;
      }

      const fetchProfile = () =>
        supabase
          .from("users")
          .select("role, company_id")
          .eq("id", userId)
          .single();

      let { data: profile, error: profileError } = await fetchProfile();
      if (profileError?.message?.toLowerCase().includes("aborted")) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        ({ data: profile, error: profileError } = await fetchProfile());
      }

      if (profileError) {
        if (email.toLowerCase() === "demo@harmoniq.safety") {
          const { data: anyCompany } = await supabase.from("companies").select("slug").limit(1).single();
          const s = anyCompany?.slug || "harmoniq";
          router.replace(appChoice === "app" ? `/${s}/app` : `/${s}/dashboard`);
          return;
        }
        setError(`Profile error: ${profileError.message}`);
        setIsLoading(false);
        return;
      }

      if (!profile) {
        if (email.toLowerCase() === "demo@harmoniq.safety") {
          const { data: anyCompany } = await supabase.from("companies").select("slug").limit(1).single();
          const s = anyCompany?.slug || "harmoniq";
          router.replace(appChoice === "app" ? `/${s}/app` : `/${s}/dashboard`);
          return;
        }
        setError("No user profile found. Contact your administrator.");
        setIsLoading(false);
        return;
      }

      saveToStorage("harmoniq_auth_profile", profile);

      const allowedApps = getAllowedApps(profile.role);
      if (!allowedApps.includes(appChoice)) {
        await supabase.auth.signOut();
        setError("Access denied for the selected app. Please choose a permitted app.");
        setIsLoading(false);
        return;
      }

      // Super admins must use a direct link for the platform portal; from the chooser, route them to a real tenant dashboard.
      if (profile.role === "super_admin") {
        if (searchParams.get("source") !== "admin-link") {
          const { data: nonPlatform } = await supabase
            .from("companies")
            .select("id, slug")
             .not("slug", "in", PLATFORM_SLUGS_LIST)
            .order("created_at", { ascending: true })
            .limit(1)
            .single();

          if (!nonPlatform?.id || !nonPlatform.slug) {
            setError("No company available for dashboard access. Contact your administrator.");
            setIsLoading(false);
            return;
          }

          saveToStorage(SELECTED_COMPANY_STORAGE_KEY, nonPlatform.id);
          router.replace(`/${nonPlatform.slug}/dashboard`);
          return;
        }

        // If explicitly coming from the admin link, allow platform portal routing to continue via callback
      }

      // Pick company for redirect (non-super admins)
      const storedCompanyId = loadFromStorage<string | null>(SELECTED_COMPANY_STORAGE_KEY, null);
      let companyId = profile.company_id || storedCompanyId;

      if (!companyId) {
        const { data: firstCompany } = await supabase
          .from("companies")
          .select("id, slug")
          .not("slug", "in", PLATFORM_SLUGS_LIST)
          .order("created_at", { ascending: true })
          .limit(1)
          .single();

        if (firstCompany?.id) {
          companyId = firstCompany.id;
          saveToStorage(SELECTED_COMPANY_STORAGE_KEY, companyId);
        }

        if (!companyId) {
          setError("No company available. Contact your administrator.");
          setIsLoading(false);
          return;
        }
      }

      saveToStorage(SELECTED_COMPANY_STORAGE_KEY, companyId);

      // Resolve company slug for redirect (avoid platform slugs and avoid falling back to platform defaults)
      const pickFirstNonPlatform = async () => {
        const { data: nonPlatform } = await supabase
          .from("companies")
          .select("id, slug")
          .not("slug", "in", PLATFORM_SLUGS_LIST)
          .order("created_at", { ascending: true })
          .limit(1)
          .single();
        return nonPlatform;
      };

      let { data: company } = await supabase
        .from("companies")
        .select("id, slug")
        .eq("id", companyId)
        .single();

      if (!company) {
        company = await pickFirstNonPlatform();
        if (!company?.id || !company.slug) {
          setError("No company available for dashboard access. Contact your administrator.");
          setIsLoading(false);
          return;
        }
        companyId = company.id;
        saveToStorage(SELECTED_COMPANY_STORAGE_KEY, companyId);
      }

      if (company.slug && isPlatformSlug(company.slug)) {
        const nonPlatform = await pickFirstNonPlatform();
        if (!nonPlatform?.id || !nonPlatform.slug) {
          setError("No company available for dashboard access. Contact your administrator.");
          setIsLoading(false);
          return;
        }
        company = nonPlatform;
        companyId = nonPlatform.id;
        saveToStorage(SELECTED_COMPANY_STORAGE_KEY, companyId);
      }

      const slug = company.slug;
      const dest = appChoice === "app" ? `/${slug}/app` : `/${slug}/dashboard`;
      router.replace(dest);
    } catch (err: any) {
      if (err?.message?.includes("abort")) return;
      setError(`Error: ${err.message}`);
      setIsLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: "google" | "azure") => {
    try {
      setIsLoading(true);
      setError("");
      setSuccess("");

      const supabase = createClient();

      const { data, error: authError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (authError) {
        const msg = authError.message.toLowerCase();
        if (msg.includes("unsupported provider") || msg.includes("oauth secret")) {
          const name = provider === "google" ? "Google" : "Microsoft";
          setError(`${name} sign-in is not configured yet. Please use email and password to sign in, or contact your administrator.`);
        } else {
          setError(`OAuth error: ${authError.message}`);
        }
        setIsLoading(false);
      }
    } catch (err: any) {
      setError(`Error: ${err.message}`);
      setIsLoading(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email address.");
      return;
    }
    try {
      setIsLoading(true);
      setError("");
      setSuccess("");

      const supabase = createClient();
      const { error: magicError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (magicError) {
        setError(magicError.message);
      } else {
        setSuccess("Magic link sent! Check your email inbox and click the link to sign in.");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError("Enter your email address first, then click Forgot password.");
      return;
    }
    try {
      setIsLoading(true);
      setError("");
      const supabase = createClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
      });
      if (resetError) {
        setError(resetError.message);
      } else {
        setError("");
        alert("Password reset email sent. Check your inbox.");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center justify-center gap-3">
          <Image
            src="/favicon.svg"
            alt="Harmoniq Logo"
            width={48}
            height={48}
            className="h-12 w-12"
          />
          <span className="text-2xl font-semibold">Harmoniq Safety</span>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Welcome back</CardTitle>
            <CardDescription>
              Sign in to your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {error && (
                <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
                  {error}
                </div>
              )}

              {success && (
                <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300">
                  {success}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">Choose app</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAppChoice("dashboard")}
                    disabled={isLoading}
                    className={`inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
                      appChoice === "dashboard"
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input bg-background hover:bg-accent hover:text-accent-foreground"
                    }`}
                  >
                    Dashboard
                  </button>
                  <button
                    type="button"
                    onClick={() => setAppChoice("app")}
                    disabled={isLoading}
                    className={`inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
                      appChoice === "app"
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input bg-background hover:bg-accent hover:text-accent-foreground"
                    }`}
                  >
                    Mobile App
                  </button>
                </div>
              </div>

              {/* Email field — shared between both modes */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-1">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  disabled={isLoading}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                />
              </div>

              {loginMode === "password" ? (
                /* Password mode */
                <form onSubmit={handleEmailSignIn} className="space-y-3">
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium mb-1">Password</label>
                    <div className="relative">
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        disabled={isLoading}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                  >
                    {isLoading ? <Loader className="h-4 w-4 animate-spin" /> : null}
                    Sign in with password
                  </button>
                </form>
              ) : (
                /* Magic link mode */
                <button
                  type="button"
                  onClick={handleMagicLink}
                  disabled={isLoading || !email}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                >
                  {isLoading ? <Loader className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                  Send magic link
                </button>
              )}

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or</span>
                </div>
              </div>

              {/* Toggle between modes */}
              <button
                type="button"
                onClick={() => { setLoginMode(loginMode === "password" ? "magic" : "password"); setError(""); setSuccess(""); }}
                disabled={isLoading}
                className="w-full inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
              >
                <Mail className="h-4 w-4" />
                {loginMode === "password" ? "Sign in with magic link instead" : "Sign in with password instead"}
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Back to home */}
        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    }>
      <LoginForm />
    </React.Suspense>
  );
}
