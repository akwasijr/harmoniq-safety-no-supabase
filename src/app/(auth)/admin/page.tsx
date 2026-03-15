"use client";

import * as React from "react";
import Link from "next/link";
import { Eye, EyeOff, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { clearClientCookie, setClientCookie } from "@/lib/client-cookies";
import { buildCompanyDestination, buildPlatformAnalyticsDestination } from "@/lib/navigation";
import { getPlatformSlugFilterList, isPlatformSlug } from "@/lib/platform-config";

const ADMIN_ENTRY_COOKIE = "harmoniq_admin_entry";
// Supabase .not("col","in","(val1,val2)") requires NO quotes around values
const PLATFORM_SLUGS_LIST = getPlatformSlugFilterList();

export default function AdminLoginPage() {
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [emailError, setEmailError] = React.useState("");
  const [passwordError, setPasswordError] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      setError("");
      setEmailError("");
      setPasswordError("");

      const supabase = createClient();
      const { error: authError, data } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

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

      const userId = data.user?.id;
      if (!userId) {
        setError("Login succeeded but no user returned.");
        setIsLoading(false);
        return;
      }

      const fetchProfile = async () => {
        try {
          return await supabase.from("users").select("role, company_id").eq("id", userId).single();
        } catch {
          await new Promise((r) => setTimeout(r, 1000));
          return await supabase.from("users").select("role, company_id").eq("id", userId).single();
        }
      };

      const fetchSlug = async (companyId?: string) => {
        try {
          if (companyId) {
            const { data: c } = await supabase.from("companies").select("slug").eq("id", companyId).single();
            if (c?.slug && !isPlatformSlug(c.slug)) return c.slug;
          }
          // Pick the first non-platform company
          const { data: c } = await supabase
            .from("companies")
            .select("slug")
            .not("slug", "in", PLATFORM_SLUGS_LIST)
            .order("created_at", { ascending: true })
            .limit(1)
            .single();
          return c?.slug || "harmoniq";
        } catch {
          return "harmoniq";
        }
      };

      const { data: profile } = await fetchProfile();

      // Demo fallback
      if (email.toLowerCase() === "demo@harmoniq.safety") {
        const slug = await fetchSlug(profile?.company_id);
        if (typeof window !== "undefined") {
          setClientCookie(ADMIN_ENTRY_COOKIE, "true", 60 * 60);
        }
        window.location.href = buildPlatformAnalyticsDestination(slug);
        return;
      }

      if (!profile) {
        setError("No user profile found. Contact your administrator.");
        setIsLoading(false);
        return;
      }

      if (profile.role !== "super_admin" && profile.role !== "company_admin") {
        await supabase.auth.signOut();
        setError("Access denied. This portal is for platform administrators only.");
        setIsLoading(false);
        return;
      }

      if (typeof window !== "undefined") {
        clearClientCookie(ADMIN_ENTRY_COOKIE);
        setClientCookie(ADMIN_ENTRY_COOKIE, "true", 60 * 60);
      }
      const slug = await fetchSlug(profile.company_id);
      // Super admins go to platform portal; company admins go to regular dashboard
      if (profile.role === "super_admin") {
        window.location.href = buildPlatformAnalyticsDestination(slug);
      } else {
        window.location.href = buildCompanyDestination(slug, "dashboard");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("abort")) {
        // Abort errors are non-fatal during navigation, ignore
        return;
      }
      setError(`Error: ${msg}`);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center justify-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Shield className="h-7 w-7 text-primary" />
          </div>
          <span className="text-2xl font-semibold">Harmoniq Admin</span>
          <span className="text-sm text-muted-foreground">Platform administration portal</span>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Admin Sign In</CardTitle>
            <CardDescription>
              Access restricted to platform administrators
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignIn} className="space-y-4">
              {error && (
                <div className="rounded-md border border-red-200 bg-white px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
                  {error}
                </div>
              )}

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
                  placeholder="admin@harmoniq.safety"
                  required
                  disabled={isLoading}
                  error={Boolean(emailError)}
                  errorMessage={emailError}
                />
              </div>

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

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full"
                loading={isLoading}
              >
                {!isLoading ? <Shield className="h-4 w-4" /> : null}
                Sign in as Administrator
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link href="/login" className="hover:text-foreground">
            ← Regular login
          </Link>
        </p>
      </div>
    </div>
  );
}
