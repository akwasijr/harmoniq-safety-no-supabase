// Deployed at: 1770751895
"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { Mail, Loader, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { loadFromStorage, saveToStorage } from "@/lib/local-storage";
import { clearClientCookie, setClientCookie } from "@/lib/client-cookies";
import { type AppChoice, buildCompanyDestination, buildPlatformAnalyticsDestination } from "@/lib/navigation";
import { getPlatformSlugFilterList, isPlatformSlug } from "@/lib/platform-config";

const APP_CHOICE_STORAGE_KEY = "harmoniq_app_choice";
const APP_CHOICE_COOKIE = "harmoniq_app_choice";
const ADMIN_ENTRY_COOKIE = "harmoniq_admin_entry";
const SELECTED_COMPANY_STORAGE_KEY = "harmoniq_selected_company";

function LoginForm() {
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [emailError, setEmailError] = React.useState("");
  const [passwordError, setPasswordError] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [loginMode, setLoginMode] = React.useState<"password" | "magic">("password");
  const [appChoice, setAppChoice] = React.useState<"dashboard" | "app">(() => {
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
    clearClientCookie(ADMIN_ENTRY_COOKIE);
    window.localStorage.setItem(APP_CHOICE_STORAGE_KEY, appChoice);
    setClientCookie(APP_CHOICE_COOKIE, appChoice, 60 * 60 * 24 * 30);
  }, [appChoice]);

  // Supabase .not("col","in","(val1,val2)") requires NO quotes around values
  const PLATFORM_SLUGS_LIST = getPlatformSlugFilterList();

  const getAllowedApps = (role: string): AppChoice[] => {
    if (role === "employee") return ["app"];
    // super_admin, company_admin, manager can access both
    if (role === "super_admin" || role === "company_admin" || role === "manager") return ["dashboard", "app"];
    return ["dashboard"];
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      setError("");
      setSuccess("");
      setEmailError("");
      setPasswordError("");

      const supabase = createClient();

      // Timeout after 15s to avoid infinite hang (e.g. paused Supabase project)
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15_000);

      let authResult;
      try {
        authResult = await supabase.auth.signInWithPassword({
          email,
          password,
        });
      } catch (abortErr: unknown) {
        clearTimeout(timeout);
        if ((abortErr instanceof Error && abortErr.name === "AbortError") || controller.signal.aborted) {
          setError("Login timed out. The server may be starting up — please try again in a moment.");
          setIsLoading(false);
          return;
        }
        throw abortErr;
      }
      clearTimeout(timeout);

      const { error: authError, data } = authResult;

      if (authError) {
        if (authError.message.toLowerCase().includes("invalid login credentials")) {
          setPasswordError("Email or password is incorrect.");
        } else {
          setError(authError.message);
        }
        setIsLoading(false);
        return;
      }

        if (data.session) {
          await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          });
        }

      // Route based on user profile — wrap in a 10s timeout to prevent infinite spinner
      const userId = data.user?.id;
      if (!userId) {
        setError("Login succeeded but no user returned.");
        setIsLoading(false);
        return;
      }

      const profileTimeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Profile lookup timed out")), 10_000)
      );

      const fetchProfile = () =>
        Promise.race([
          supabase
            .from("users")
            .select("role, company_id")
            .eq("id", userId)
            .single(),
          profileTimeout.then(() => ({ data: null, error: { message: "Profile lookup timed out" } })),
        ]);

      let { data: profile, error: profileError } = await fetchProfile();
      if (profileError?.message?.toLowerCase().includes("aborted")) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        ({ data: profile, error: profileError } = await fetchProfile());
      }

        if (profileError) {
          if (email.toLowerCase() === "demo@harmoniq.safety") {
            const { data: anyCompany } = await supabase.from("companies").select("slug").limit(1).single();
            window.location.href = buildCompanyDestination(anyCompany?.slug, appChoice);
            return;
          }
          setError("We signed you in, but couldn’t load your profile. Please try again or contact your administrator.");
          setIsLoading(false);
          return;
        }

        if (!profile) {
          if (email.toLowerCase() === "demo@harmoniq.safety") {
            const { data: anyCompany } = await supabase.from("companies").select("slug").limit(1).single();
            window.location.href = buildCompanyDestination(anyCompany?.slug, appChoice);
            return;
          }
          setError("No user profile found. Contact your administrator.");
          setIsLoading(false);
          return;
        }

      const allowedApps = getAllowedApps(profile.role);
      if (!allowedApps.includes(appChoice)) {
        await supabase.auth.signOut();
        setError("Access denied for the selected app. Please choose a permitted app.");
        setIsLoading(false);
        return;
      }

      // Super admins: from the normal login page, route to a real tenant dashboard (not the platform portal).
      // The platform portal is only accessible via the direct /admin-login link.
      if (profile.role === "super_admin") {
        const isAdminEntry = searchParams.get("source") === "admin-link";

        if (!isAdminEntry) {
          // Try to find a real (non-platform) company in Supabase
          const { data: nonPlatform } = await supabase
            .from("companies")
            .select("id, slug")
            .not("slug", "in", PLATFORM_SLUGS_LIST)
            .order("created_at", { ascending: true })
            .limit(1)
            .single();

          const slug = nonPlatform?.slug || "harmoniq";
          if (nonPlatform?.id) {
            saveToStorage(SELECTED_COMPANY_STORAGE_KEY, nonPlatform.id);
          }
          window.location.href = buildCompanyDestination(slug, appChoice);
          return;
        }

        // Admin entry: route to platform portal
        const { data: adminCompany } = await supabase
          .from("companies")
          .select("slug")
          .not("slug", "in", PLATFORM_SLUGS_LIST)
          .order("created_at", { ascending: true })
          .limit(1)
          .single();
        window.location.href = buildPlatformAnalyticsDestination(adminCompany?.slug);
        return;
      }

      // Pick company for redirect (non-super admins)
      let slug = "harmoniq"; // safe default
      const storedCompanyId = loadFromStorage<string | null>(SELECTED_COMPANY_STORAGE_KEY, null);
      const companyId = profile.company_id || storedCompanyId;

      if (companyId) {
        const { data: company } = await supabase
          .from("companies")
          .select("slug")
          .eq("id", companyId)
          .single();
        if (company?.slug && !isPlatformSlug(company.slug)) {
          slug = company.slug;
        }
        saveToStorage(SELECTED_COMPANY_STORAGE_KEY, companyId);
      } else {
        // No company_id on profile — try to find one
        const { data: firstCompany } = await supabase
          .from("companies")
          .select("id, slug")
          .not("slug", "in", PLATFORM_SLUGS_LIST)
          .order("created_at", { ascending: true })
          .limit(1)
          .single();
        if (firstCompany?.slug) {
          slug = firstCompany.slug;
          saveToStorage(SELECTED_COMPANY_STORAGE_KEY, firstCompany.id);
        }
      }

      const dest = buildCompanyDestination(slug, appChoice);
      // Use full page navigation so middleware can read the new Supabase session cookies
      window.location.href = dest;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("abort")) return;
      setError(message.includes("timed out")
        ? "Connection timed out. The server may be starting up — please try again in a moment."
        : `Error: ${message}`);
      setIsLoading(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setEmailError("Enter your email address to receive a magic link.");
      setError("Please enter your email address.");
      return;
    }
    try {
      setIsLoading(true);
      setError("");
      setSuccess("");
      setEmailError("");

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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setEmailError("Enter your email address first.");
      setError("Enter your email address first, then click Forgot password.");
      return;
    }
    try {
      setIsLoading(true);
      setError("");
      setSuccess("");
      const supabase = createClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (resetError) {
        setError(resetError.message);
      } else {
        setError("");
        setSuccess("Password reset email sent. Check your inbox for the secure reset link.");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
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
                <Label>Choose app</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    onClick={() => setAppChoice("dashboard")}
                    disabled={isLoading}
                    variant={appChoice === "dashboard" ? "default" : "outline"}
                    className="w-full"
                  >
                    Dashboard
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setAppChoice("app")}
                    disabled={isLoading}
                    variant={appChoice === "app" ? "default" : "outline"}
                    className="w-full"
                  >
                    Mobile App
                  </Button>
                </div>
              </div>

              {/* Email field — shared between both modes */}
              <div>
                <Label htmlFor="email" required error={Boolean(emailError)}>
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailError("");
                  }}
                  placeholder="you@company.com"
                  error={Boolean(emailError)}
                  errorMessage={emailError}
                  required
                  disabled={isLoading}
                />
              </div>

              {loginMode === "password" ? (
                /* Password mode */
                <form onSubmit={handleEmailSignIn} className="space-y-3">
                  <div>
                    <Label htmlFor="password" required error={Boolean(passwordError)}>
                      Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          setPasswordError("");
                        }}
                        placeholder="••••••••"
                        required
                        disabled={isLoading}
                        error={Boolean(passwordError)}
                        errorMessage={passwordError}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-4 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        tabIndex={-1}
                        aria-label={showPassword ? "Hide password" : "Show password"}
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
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full"
                    loading={isLoading}
                  >
                    Sign in with password
                  </Button>
                </form>
              ) : (
                /* Magic link mode */
                <Button
                  type="button"
                  onClick={handleMagicLink}
                  disabled={isLoading || !email}
                  className="w-full"
                >
                  {isLoading ? <Loader className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                  Send magic link
                </Button>
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
              <Button
                type="button"
                onClick={() => { setLoginMode(loginMode === "password" ? "magic" : "password"); setError(""); setSuccess(""); }}
                disabled={isLoading}
                variant="outline"
                className="w-full"
              >
                <Mail className="h-4 w-4" />
                {loginMode === "password" ? "Sign in with magic link instead" : "Sign in with password instead"}
              </Button>
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
