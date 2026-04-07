// Deployed at: 1770751895
"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Mail, Loader, Eye, EyeOff, Lock, LayoutDashboard, HardHat, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { loadFromStorage, saveToStorage } from "@/lib/local-storage";
import { setClientCookie } from "@/lib/client-cookies";
import { type AppChoice, buildCompanyDestination, buildPlatformAnalyticsDestination } from "@/lib/navigation";
import { getPlatformSlugFilterList, isPlatformSlug } from "@/lib/platform-config";
import { useTranslation } from "@/i18n";
import { mockLogin, IS_MOCK_MODE } from "@/hooks/use-auth";
import { DEFAULT_COMPANY_SLUG } from "@/mocks/data";

const APP_CHOICE_STORAGE_KEY = "harmoniq_app_choice";
const APP_CHOICE_COOKIE = "harmoniq_app_choice";
const PLATFORM_ENTRY_KEY = "harmoniq_platform_entry";
const SELECTED_COMPANY_STORAGE_KEY = "harmoniq_selected_company";
const LOGIN_ATTEMPTS_KEY = "harmoniq_login_attempts";
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

interface LoginAttemptData {
  count: number;
  lockedUntil: number | null;
}

function getLoginAttempts(): LoginAttemptData {
  try {
    const raw = sessionStorage.getItem(LOGIN_ATTEMPTS_KEY);
    if (!raw) return { count: 0, lockedUntil: null };
    return JSON.parse(raw);
  } catch {
    return { count: 0, lockedUntil: null };
  }
}

function setLoginAttempts(data: LoginAttemptData) {
  sessionStorage.setItem(LOGIN_ATTEMPTS_KEY, JSON.stringify(data));
}

function clearLoginAttempts() {
  sessionStorage.removeItem(LOGIN_ATTEMPTS_KEY);
}

function LoginForm() {
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [emailError, setEmailError] = React.useState("");
  const [passwordError, setPasswordError] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [loginMode, setLoginMode] = React.useState<"password" | "magic">("password");
  const [lockoutRemaining, setLockoutRemaining] = React.useState(0);
  const [failedAttempts, setFailedAttempts] = React.useState(0);
  const [isMobile, setIsMobile] = React.useState(false);
  const [hasMounted, setHasMounted] = React.useState(false);
  const isPlatformMode = searchParams.get("mode") === "platform";
  const [appChoice, setAppChoice] = React.useState<AppChoice>(isPlatformMode ? "platform" : "dashboard");

  React.useEffect(() => {
    const mobile = window.innerWidth < 768;
    setIsMobile(mobile);
    if (isPlatformMode) {
      setAppChoice("platform");
    } else {
      const stored = window.localStorage.getItem(APP_CHOICE_STORAGE_KEY);
      setAppChoice(mobile ? "app" : (stored === "app" || stored === "dashboard" ? stored as AppChoice : "dashboard"));
    }
    setHasMounted(true);

    const onResize = () => {
      const m = window.innerWidth < 768;
      setIsMobile(m);
      if (m) setAppChoice("app");
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  React.useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam) {
      setError(errorParam);
    }
  }, [searchParams]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    // Persist app choice
    window.localStorage.setItem(APP_CHOICE_STORAGE_KEY, appChoice);
    setClientCookie(APP_CHOICE_COOKIE, appChoice, 60 * 60 * 24 * 30);
  }, [appChoice]);

  // Supabase .not("col","in","(val1,val2)") requires NO quotes around values
  const PLATFORM_SLUGS_LIST = getPlatformSlugFilterList();

  // Check lockout state on mount and run countdown timer
  React.useEffect(() => {
    const checkLockout = () => {
      const attempts = getLoginAttempts();
      setFailedAttempts(attempts.count);
      if (attempts.lockedUntil && attempts.lockedUntil > Date.now()) {
        setLockoutRemaining(Math.ceil((attempts.lockedUntil - Date.now()) / 1000));
      } else if (attempts.lockedUntil && attempts.lockedUntil <= Date.now()) {
        clearLoginAttempts();
        setFailedAttempts(0);
        setLockoutRemaining(0);
      }
    };
    checkLockout();
    const interval = setInterval(() => {
      const attempts = getLoginAttempts();
      if (attempts.lockedUntil && attempts.lockedUntil > Date.now()) {
        setLockoutRemaining(Math.ceil((attempts.lockedUntil - Date.now()) / 1000));
      } else if (attempts.lockedUntil) {
        clearLoginAttempts();
        setFailedAttempts(0);
        setLockoutRemaining(0);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const isLockedOut = lockoutRemaining > 0;
  const attemptsRemaining = MAX_ATTEMPTS - failedAttempts;

  const recordFailedAttempt = () => {
    const attempts = getLoginAttempts();
    const newCount = attempts.count + 1;
    const lockedUntil = newCount >= MAX_ATTEMPTS ? Date.now() + LOCKOUT_DURATION_MS : null;
    setLoginAttempts({ count: newCount, lockedUntil });
    setFailedAttempts(newCount);
    if (lockedUntil) {
      setLockoutRemaining(Math.ceil(LOCKOUT_DURATION_MS / 1000));
    }
  };

  const getAllowedApps = (role: string): AppChoice[] => {
    if (role === "employee") return ["app"];
    if (role === "super_admin") return ["dashboard", "app", "platform"];
    if (role === "company_admin") return ["dashboard", "app", "platform"];
    if (role === "manager") return ["dashboard", "app"];
    return ["dashboard"];
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLockedOut) return;
    try {
      setIsLoading(true);
      setError("");
      setSuccess("");
      setEmailError("");
      setPasswordError("");

      // Mock mode: authenticate against local mock users (password: demo123)
      if (IS_MOCK_MODE) {
        if (password !== "demo123") {
          recordFailedAttempt();
          setPasswordError("Invalid password. Use 'demo123' for mock mode.");
          setIsLoading(false);
          return;
        }
        const mockUser = mockLogin(email);
        if (!mockUser) {
          setError("No mock user found with that email.");
          setIsLoading(false);
          return;
        }
        clearLoginAttempts();
        const allowedApps = getAllowedApps(mockUser.role);
        const dest = allowedApps.includes(appChoice) ? appChoice : allowedApps[0];
        if (dest === "platform") {
          window.localStorage.setItem(PLATFORM_ENTRY_KEY, "true");
          window.location.href = buildPlatformAnalyticsDestination(DEFAULT_COMPANY_SLUG);
          return;
        }
        window.localStorage.removeItem(PLATFORM_ENTRY_KEY);
        setClientCookie(APP_CHOICE_COOKIE, dest, 30);
        saveToStorage(APP_CHOICE_STORAGE_KEY, dest);
        const slug = DEFAULT_COMPANY_SLUG;
        window.location.href = buildCompanyDestination(slug, dest);
        return;
      }

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
          setError("Login timed out. The server may be starting up, please try again in a moment.");
          setIsLoading(false);
          return;
        }
        throw abortErr;
      }
      clearTimeout(timeout);

      const { error: authError, data } = authResult;

      if (authError) {
        if (authError.message.toLowerCase().includes("invalid login credentials")) {
          recordFailedAttempt();
          setPasswordError("Email or password is incorrect.");
        } else {
          setError(authError.message);
        }
        setIsLoading(false);
        return;
      }

      // Successful auth, clear lockout tracking
      clearLoginAttempts();
      setFailedAttempts(0);

        if (data.session) {
          await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          });
        }

      // Route based on user profile. Wrap in a 10s timeout to prevent infinite spinner
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
      let effectiveChoice = appChoice;
      if (!allowedApps.includes(appChoice)) {
        effectiveChoice = allowedApps[0];
      }

      // Route to platform admin (super_admin or company_admin)
      if (effectiveChoice === "platform") {
        window.localStorage.setItem(PLATFORM_ENTRY_KEY, "true");
        // Find a real tenant slug for the platform URL
        let platformSlug: string | undefined;
        if (profile.company_id) {
          const { data: userCompany } = await supabase
            .from("companies")
            .select("slug")
            .eq("id", profile.company_id)
            .single();
          if (userCompany?.slug && !isPlatformSlug(userCompany.slug)) {
            platformSlug = userCompany.slug;
          }
        }
        if (!platformSlug) {
          const { data: firstCompany } = await supabase
            .from("companies")
            .select("slug")
            .not("slug", "in", PLATFORM_SLUGS_LIST)
            .order("created_at", { ascending: true })
            .limit(1)
            .single();
          platformSlug = firstCompany?.slug || undefined;
        }
        window.location.href = buildPlatformAnalyticsDestination(platformSlug);
        return;
      }

      // Regular login — clear platform entry flag
      window.localStorage.removeItem(PLATFORM_ENTRY_KEY);

      // Dashboard or Field App — find the user's company
      let slug = "harmoniq";
      if (profile.role === "super_admin") {
        const { data: nonPlatform } = await supabase
          .from("companies")
          .select("id, slug")
          .not("slug", "in", PLATFORM_SLUGS_LIST)
          .order("created_at", { ascending: true })
          .limit(1)
          .single();
        slug = nonPlatform?.slug || "harmoniq";
        if (nonPlatform?.id) {
          saveToStorage(SELECTED_COMPANY_STORAGE_KEY, nonPlatform.id);
        }
      } else {
        // Non-super-admin: route to their own company
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
      }

      window.location.href = buildCompanyDestination(slug, effectiveChoice);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("abort")) return;
      setError(message.includes("timed out")
        ? "Connection timed out. The server may be starting up, please try again in a moment."
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
    <div className="relative flex min-h-screen items-center justify-center px-4 bg-black">
      {/* Animated gradient background */}
      <div aria-hidden="true" style={{ position: 'fixed', inset: 0, overflow: 'hidden', zIndex: 0, pointerEvents: 'none' }}>
        <div style={{
          position: 'absolute', top: '-15%', right: '-8%', width: '45%', height: '80%',
          background: 'linear-gradient(160deg, hsla(200,60%,40%,0.25), hsla(240,50%,35%,0.2), hsla(265,45%,30%,0.25), hsla(280,40%,25%,0.2), hsla(210,55%,38%,0.2))',
          backgroundSize: '300% 300%',
          filter: 'blur(60px)',
          borderRadius: '40% 60% 50% 50%',
          animation: 'auth-flow 8s ease-in-out infinite, auth-morph 12s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', top: '5%', right: '-2%', width: '30%', height: '60%',
          background: 'linear-gradient(170deg, hsla(195,55%,38%,0.2), hsla(230,50%,35%,0.18), hsla(260,40%,30%,0.22), hsla(195,50%,36%,0.15))',
          backgroundSize: '300% 300%',
          filter: 'blur(50px)',
          borderRadius: '50% 40% 55% 45%',
          animation: 'auth-flow 6s ease-in-out infinite reverse, auth-morph 10s ease-in-out infinite reverse',
          animationDelay: '-3s',
        }} />
        <div style={{
          position: 'absolute', top: '-8%', right: '3%', width: '22%', height: '50%',
          background: 'linear-gradient(150deg, hsla(210,60%,42%,0.18), hsla(255,45%,32%,0.15), hsla(275,35%,28%,0.12), hsla(210,55%,38%,0.15))',
          backgroundSize: '300% 300%',
          filter: 'blur(45px)',
          borderRadius: '45% 55% 40% 60%',
          animation: 'auth-flow 10s ease-in-out infinite, auth-morph 14s ease-in-out infinite',
          animationDelay: '-6s',
        }} />
      </div>
      <div className="relative z-10 w-full max-w-[420px]">
        <div className="mb-6 flex flex-col items-center gap-2">
          <Image src="/favicon.svg" alt="Harmoniq Logo" width={40} height={40} className="h-10 w-10" />
          <span className="text-lg font-semibold text-white">Harmoniq</span>
        </div>

        <div className="rounded-xl bg-zinc-900/70 backdrop-blur-xl p-8">
          {/* Header */}
          <h1 className="text-2xl font-bold tracking-tight mb-6 text-white">
            Welcome
          </h1>

          {/* Alerts */}
          {isLockedOut && (
            <div className="rounded-lg border border-red-800/50 bg-red-950/50 px-4 py-3 text-sm text-red-300 flex items-center gap-2 mb-4">
              <Lock className="h-4 w-4 flex-shrink-0" />
              <div>
                <p className="font-medium">{t("auth.accountLocked") || "Account temporarily locked"}</p>
                <p>{t("auth.tryAgainIn") || "Try again in"} {Math.ceil(lockoutRemaining / 60)} {t("auth.minutes") || "minutes"}</p>
              </div>
            </div>
          )}

          {!isLockedOut && failedAttempts >= 3 && attemptsRemaining > 0 && (
            <div className="rounded-lg border border-amber-800/50 bg-amber-950/50 px-4 py-3 text-sm text-amber-300 mb-4">
              {attemptsRemaining} {t("auth.attemptsRemaining") || "attempts remaining"}
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-800/50 bg-red-950/50 px-4 py-3 text-sm text-red-300 mb-4">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-lg border border-green-800/50 bg-green-950/50 px-4 py-3 text-sm text-green-300 mb-4">
              {success}
            </div>
          )}

          {/* Email */}
          <div className="mb-4">
            <Label htmlFor="email" required error={Boolean(emailError)} className="text-sm font-medium mb-1.5 text-zinc-300">
              {t("auth.email")}
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setEmailError(""); }}
              placeholder="you@company.com"
              error={Boolean(emailError)}
              errorMessage={emailError}
              required
              disabled={isLoading}
              className="h-11 rounded-lg !bg-zinc-800/50 !border-transparent text-white placeholder-zinc-500 focus:!bg-zinc-800/70 focus-visible:!ring-0 focus-visible:!ring-transparent !shadow-none"
            />
          </div>

          {loginMode === "password" ? (
            <form onSubmit={handleEmailSignIn} className="space-y-4">
              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label htmlFor="password" required error={Boolean(passwordError)} className="text-sm font-medium text-zinc-300">
                    {t("auth.password")}
                  </Label>
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-xs font-medium text-zinc-400 hover:text-white transition-colors"
                  >
                    {t("auth.forgotPassword")}
                  </button>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setPasswordError(""); }}
                    placeholder="••••••••"
                    required
                    disabled={isLoading}
                    error={Boolean(passwordError)}
                    errorMessage={passwordError}
                    className="h-11 rounded-lg !bg-zinc-800/50 !border-transparent text-white placeholder-zinc-500 focus:!bg-zinc-800/70 focus-visible:!ring-0 focus-visible:!ring-transparent !shadow-none pr-10 [&::-ms-reveal]:hidden [&::-webkit-credentials-auto-fill-button]:hidden"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-0 h-11 flex items-center text-zinc-500 hover:text-white transition-colors"
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* App chooser — hidden on mobile (auto-selects Field Worker), Platform only via /admin */}
              {hasMounted && !isMobile && !isPlatformMode && (
                <div role="radiogroup" aria-label={t("auth.chooseApp") || "Choose app"}>
                  <Label className="text-sm font-medium mb-1.5 text-zinc-300">{t("auth.chooseApp") || "Choose app"}</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      role="radio"
                      aria-checked={appChoice === "dashboard"}
                      onClick={() => setAppChoice("dashboard")}
                      disabled={isLoading}
                      className={`flex items-center justify-center gap-2 rounded-lg py-2 px-3 text-sm font-medium transition-colors ${appChoice === "dashboard" ? "bg-zinc-700 text-white" : "bg-zinc-800/30 text-zinc-400 hover:bg-zinc-800/50"}`}
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      {t("auth.dashboard")}
                    </button>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={appChoice === "app"}
                      onClick={() => setAppChoice("app")}
                      disabled={isLoading}
                      className={`flex items-center justify-center gap-2 rounded-lg py-2 px-3 text-sm font-medium transition-colors ${appChoice === "app" ? "bg-zinc-700 text-white" : "bg-zinc-800/30 text-zinc-400 hover:bg-zinc-800/50"}`}
                    >
                      <HardHat className="h-4 w-4" />
                      {t("auth.mobileApp")}
                    </button>
                  </div>
                </div>
              )}
              {/* Platform mode indicator (accessed via /admin) */}
              {hasMounted && isPlatformMode && (
                <div className="flex items-center gap-2 rounded-lg bg-zinc-800/40 px-4 py-2.5">
                  <Shield className="h-4 w-4 text-zinc-400" />
                  <span className="text-sm font-medium text-zinc-300">Platform Admin</span>
                </div>
              )}

              {/* Sign in button */}
              <Button
                type="submit"
                disabled={isLoading || isLockedOut}
                className="w-full h-11 rounded-lg text-sm font-semibold bg-violet-600 text-white hover:bg-violet-500 focus-visible:!ring-0 focus-visible:!ring-transparent !shadow-none"
              >
                {t("auth.signIn")}
              </Button>
            </form>
          ) : (
            <Button
              type="button"
              onClick={handleMagicLink}
              disabled={isLoading || !email}
              className="w-full h-11 rounded-lg text-sm font-semibold bg-violet-600 text-white hover:bg-violet-500 focus-visible:!ring-0 focus-visible:!ring-transparent !shadow-none"
            >
              {isLoading ? <Loader className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              {t("auth.sendMagicLink")}
            </Button>
          )}

        </div>

        {/* Footer */}
        <div className="mt-5 rounded-lg bg-zinc-900/40 py-3 text-center text-sm text-zinc-400">
          {"Don't have an account?"}{" "}
          <Link href="/signup" className="font-semibold text-white hover:text-zinc-300 transition-colors">
            Sign up for wait list
          </Link>
        </div>

        <p className="mt-4 text-center text-xs text-zinc-500">
          <Link href="/" className="hover:text-white transition-colors">
            {t("auth.backToHome")}
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
