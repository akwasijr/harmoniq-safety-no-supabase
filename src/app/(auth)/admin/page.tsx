"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Loader, Eye, EyeOff, Shield } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { saveToStorage } from "@/lib/local-storage";

const ADMIN_ENTRY_STORAGE_KEY = "harmoniq_admin_entry";
const ADMIN_ENTRY_COOKIE = "harmoniq_admin_entry";
const PLATFORM_SLUGS =
  (process.env.NEXT_PUBLIC_PLATFORM_SLUGS || "platform,admin,superadmin")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
// Supabase .not("col","in","(val1,val2)") requires NO quotes around values
const PLATFORM_SLUGS_LIST = `(${PLATFORM_SLUGS.join(",")})`;

export default function AdminLoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
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
            if (c?.slug && !PLATFORM_SLUGS.includes(c.slug.toLowerCase()) && !c.slug.toLowerCase().includes("platform")) return c.slug;
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
        saveToStorage("harmoniq_auth_profile", profile || { role: "super_admin", company_id: "" });
        if (typeof window !== "undefined") {
          window.localStorage.setItem(ADMIN_ENTRY_STORAGE_KEY, "true");
          document.cookie = `${ADMIN_ENTRY_COOKIE}=true; path=/; max-age=3600; samesite=lax`;
        }
        window.location.href = `/${slug}/dashboard/platform/analytics`;
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

      saveToStorage("harmoniq_auth_profile", profile);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(ADMIN_ENTRY_STORAGE_KEY, "true");
        document.cookie = `${ADMIN_ENTRY_COOKIE}=true; path=/; max-age=3600; samesite=lax`;
      }
      const slug = await fetchSlug(profile.company_id);
      // Super admins go to platform portal; company admins go to regular dashboard
      if (profile.role === "super_admin") {
        window.location.href = `/${slug}/dashboard/platform/analytics`;
      } else {
        window.location.href = `/${slug}/dashboard`;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("abort")) {
        // Abort errors are non-fatal during navigation — ignore
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
                <label htmlFor="email" className="block text-sm font-medium mb-1">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@harmoniq.safety"
                  required
                  disabled={isLoading}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                />
              </div>

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

              <button
                type="submit"
                disabled={isLoading}
                className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
              >
                {isLoading ? <Loader className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                Sign in as Administrator
              </button>
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
