"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { EMAIL_TO_USER_ID, setActiveUserId, DEFAULT_COMPANY_SLUG, DEFAULT_USER_ID } from "@/mocks/data";

const isSupabaseConfigured =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDemo = searchParams.get("demo") === "true";
  
  const [showPassword, setShowPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");

  const [error, setError] = React.useState("");

  // Auto-redirect if demo mode
  React.useEffect(() => {
    if (isDemo) {
      router.push(`/${DEFAULT_COMPANY_SLUG}/app`);
    }
  }, [isDemo, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (isSupabaseConfigured) {
      // Real Supabase auth
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        setIsLoading(false);
        return;
      }

      if (data.user) {
        // Fetch user profile to determine redirect
        const { data: profile } = await supabase
          .from("users")
          .select("role, company_id")
          .eq("id", data.user.id)
          .single();

        // Get company slug for redirect
        const { data: company } = await supabase
          .from("companies")
          .select("slug")
          .eq("id", profile?.company_id)
          .single();

        const slug = company?.slug || "default";
        const isEmployeeRole = profile?.role === "employee";

        // Use window.location for full reload so AuthProvider reinitializes
        window.location.href = isEmployeeRole
          ? `/${slug}/app`
          : `/${slug}/dashboard`;
      }
    } else {
      // Mock auth fallback
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const userId = EMAIL_TO_USER_ID[email.toLowerCase()] || DEFAULT_USER_ID;
      setActiveUserId(userId);
      document.cookie = `harmoniq_auth=${userId}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;

      const companySlug = DEFAULT_COMPANY_SLUG;
      const isEmployeeEmail = !email.includes("@harmoniq.io") && !email.includes("super") && !email.includes("admin") && !email.includes("manager");
      window.location.href = isEmployeeEmail
        ? `/${companySlug}/app`
        : `/${companySlug}/dashboard`;
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
              Sign in to your account to continue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
                  {error}
                </div>
              )}
              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <div className="relative">
                  <Mail
                    className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@company.com"
                    className="pl-10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    href="/forgot-password"
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock
                    className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    className="pl-10 pr-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <Button type="submit" className="w-full" loading={isLoading}>
                Sign in
              </Button>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-card px-2 text-muted-foreground">
                    Or continue with
                  </span>
                </div>
              </div>

              {/* OAuth buttons */}
              <div className="grid grid-cols-2 gap-4">
                <Button type="button" variant="outline" disabled={isLoading}>
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Google
                </Button>
                <Button type="button" variant="outline" disabled={isLoading}>
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="currentColor"
                      d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zm12.6 0H12.6V0H24v11.4z"
                    />
                  </svg>
                  Microsoft
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Demo accounts hint */}
        <div className="mt-6 rounded-lg border bg-card p-4 text-sm">
          <p className="font-medium">Demo accounts:</p>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            <li>
              <code className="rounded bg-muted px-1">admin@harmoniq.io</code> → Dashboard (Platform Admin)
            </li>
            <li>
              <code className="rounded bg-muted px-1">admin@nexusmfg.com</code> → Company Dashboard
            </li>
            <li>
              <code className="rounded bg-muted px-1">worker@nexusmfg.com</code> → Employee App
            </li>
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">Any password works for demo</p>
        </div>

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
