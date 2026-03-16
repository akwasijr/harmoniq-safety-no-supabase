"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { validatePassword } from "@/lib/validation";

type ResetState = "loading" | "ready" | "success" | "invalid";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const [state, setState] = React.useState<ResetState>("loading");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState("");
  const [passwordError, setPasswordError] = React.useState("");
  const [confirmPasswordError, setConfirmPasswordError] = React.useState("");

  React.useEffect(() => {
    let active = true;
    const supabase = createClient();

    const initialError = searchParams.get("error_description") || searchParams.get("error");
    if (initialError) {
      setError(initialError);
      setState("invalid");
      return () => {
        active = false;
      };
    }

    const checkSession = async (attempt = 0) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!active) return;
      if (session?.user) {
        setState("ready");
        return;
      }

      const hasRecoveryHash = typeof window !== "undefined" && window.location.hash.includes("access_token=");
      if (hasRecoveryHash && attempt < 2) {
        window.setTimeout(() => {
          void checkSession(attempt + 1);
        }, 350);
        return;
      }

      setState("invalid");
    };

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if ((event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") && session?.user) {
        setState("ready");
      }
    });

    const timer = window.setTimeout(() => {
      void checkSession();
    }, 350);

    return () => {
      active = false;
      window.clearTimeout(timer);
      data.subscription.unsubscribe();
    };
  }, [searchParams]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setPasswordError("");
    setConfirmPasswordError("");

    const passwordCheck = validatePassword(password);
    if (!passwordCheck.valid) {
      setPasswordError(passwordCheck.reason || "Enter a stronger password.");
      return;
    }

    if (password !== confirmPassword) {
      setConfirmPasswordError("Passwords do not match.");
      return;
    }

    try {
      setIsSubmitting(true);
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      await supabase.auth.signOut();
      setState("success");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <LockKeyhole className="h-6 w-6 text-primary" aria-hidden="true" />
            </div>
            <CardTitle className="text-xl">Reset your password</CardTitle>
            <CardDescription>
              Create a new password for your Harmoniq account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {state === "loading" ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden="true" />
              </div>
            ) : null}

            {state === "invalid" ? (
              <div className="space-y-4 text-center">
                <p className="text-sm text-muted-foreground">
                  {error || "This password reset link is invalid or has expired. Request a new link from the login page."}
                </p>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/login">Go to login</Link>
                </Button>
              </div>
            ) : null}

            {state === "ready" ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error ? (
                  <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
                    {error}
                  </div>
                ) : null}

                <div>
                  <Label htmlFor="reset-password" required error={Boolean(passwordError)}>
                    New password
                  </Label>
                  <div className="relative">
                    <Input
                      id="reset-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setPasswordError("");
                      }}
                      placeholder="At least 12 characters"
                      autoComplete="new-password"
                      required
                      error={Boolean(passwordError)}
                      errorMessage={passwordError}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      className="absolute right-3 top-4 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="reset-password-confirm" required error={Boolean(confirmPasswordError)}>
                    Confirm password
                  </Label>
                  <Input
                    id="reset-password-confirm"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setConfirmPasswordError("");
                    }}
                    autoComplete="new-password"
                    required
                    error={Boolean(confirmPasswordError)}
                    errorMessage={confirmPasswordError}
                  />
                </div>

                <Button type="submit" className="w-full" loading={isSubmitting}>
                  Save new password
                </Button>
              </form>
            ) : null}

            {state === "success" ? (
              <div className="space-y-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Your password has been updated. You can now sign in with your new credentials.
                </p>
                <Button asChild className="w-full">
                  <Link href="/login">Back to login</Link>
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden="true" />
        </div>
      }
    >
      <ResetPasswordContent />
    </React.Suspense>
  );
}
