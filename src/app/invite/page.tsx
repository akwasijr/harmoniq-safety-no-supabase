"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { Loader, CheckCircle, XCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

type InviteState = "loading" | "valid" | "invalid" | "signing_up" | "success" | "error";

function InviteForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [state, setState] = React.useState<InviteState>("loading");
  const [error, setError] = React.useState("");
  const [inviteInfo, setInviteInfo] = React.useState<{
    email: string;
    role: string;
    company_name: string;
  } | null>(null);
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");

  // Validate token on mount
  React.useEffect(() => {
    if (!token) {
      setState("invalid");
      setError("No invitation token provided.");
      return;
    }

    async function validateToken() {
      try {
        const res = await fetch(`/api/invitations/validate?token=${token}`);
        const data = await res.json();

        if (!res.ok || !data.valid) {
          setState("invalid");
          setError(data.error || "Invalid or expired invitation.");
          return;
        }

        setInviteInfo(data.invitation);
        setState("valid");
      } catch {
        setState("invalid");
        setError("Failed to validate invitation.");
      }
    }

    validateToken();
  }, [token]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setState("signing_up");
      setError("");

      const supabase = createClient();

      // Create the auth user
      const { error: signUpError } = await supabase.auth.signUp({
        email: inviteInfo!.email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setState("valid");
        return;
      }

      // Sign in immediately (email is pre-confirmed via invitation flow)
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: inviteInfo!.email,
        password,
      });

      if (signInError) {
        // Might need email confirmation — show success anyway
        setState("success");
        return;
      }

      // Redirect through callback to create profile
      window.location.href = "/auth/callback?source=email";
    } catch (err: any) {
      setError(err.message);
      setState("valid");
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center justify-center gap-3">
          <Image src="/favicon.svg" alt="Harmoniq Logo" width={48} height={48} className="h-12 w-12" />
          <span className="text-2xl font-semibold">Harmoniq Safety</span>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">
              {state === "loading" && "Verifying invitation..."}
              {state === "valid" && "You're invited!"}
              {state === "signing_up" && "Creating your account..."}
              {state === "success" && "Account created!"}
              {state === "invalid" && "Invalid invitation"}
              {state === "error" && "Something went wrong"}
            </CardTitle>
            {inviteInfo && state === "valid" && (
              <CardDescription>
                You've been invited to join <strong>{inviteInfo.company_name}</strong> as a{" "}
                <strong>{inviteInfo.role.replace("_", " ")}</strong>.
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {state === "loading" && (
              <div className="flex justify-center py-8">
                <Loader className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}

            {state === "invalid" && (
              <div className="flex flex-col items-center gap-4 py-4">
                <XCircle className="h-12 w-12 text-red-500" />
                <p className="text-sm text-muted-foreground text-center">{error}</p>
                <a href="/login" className="text-sm text-primary hover:underline">Go to login</a>
              </div>
            )}

            {state === "valid" && (
              <form onSubmit={handleSignUp} className="space-y-4">
                {error && (
                  <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
                    {error}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input
                    type="email"
                    value={inviteInfo?.email || ""}
                    disabled
                    className="w-full rounded-md border border-input bg-muted px-3 py-2 text-sm opacity-60"
                  />
                </div>
                <div>
                  <label htmlFor="password" className="block text-sm font-medium mb-1">Password</label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    required
                    minLength={8}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
                <div>
                  <label htmlFor="confirm" className="block text-sm font-medium mb-1">Confirm Password</label>
                  <input
                    id="confirm"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    required
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Create Account
                </button>
              </form>
            )}

            {state === "signing_up" && (
              <div className="flex justify-center py-8">
                <Loader className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}

            {state === "success" && (
              <div className="flex flex-col items-center gap-4 py-4">
                <CheckCircle className="h-12 w-12 text-green-500" />
                <p className="text-sm text-muted-foreground text-center">
                  Your account has been created. Check your email to verify, then sign in.
                </p>
                <a href="/login" className="text-sm text-primary hover:underline">Go to login</a>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function InvitePage() {
  return (
    <React.Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    }>
      <InviteForm />
    </React.Suspense>
  );
}
