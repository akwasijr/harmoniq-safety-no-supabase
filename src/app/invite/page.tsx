"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { Loader, CheckCircle, XCircle, Eye, EyeOff } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

type InviteState = "loading" | "valid" | "invalid" | "signing_up" | "success" | "error";

// SSO-capable email domains — users with these domains get OAuth buttons
const SSO_DOMAINS: Record<string, "google" | "azure"> = {
  "gmail.com": "google",
  "googlemail.com": "google",
  "outlook.com": "azure",
  "hotmail.com": "azure",
  "live.com": "azure",
  "msn.com": "azure",
};

function getEmailDomain(email: string): string {
  return email.split("@")[1]?.toLowerCase() || "";
}

function getSSOProvider(email: string): "google" | "azure" | null {
  return SSO_DOMAINS[getEmailDomain(email)] || null;
}

function InviteForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [state, setState] = React.useState<InviteState>("loading");
  const [error, setError] = React.useState("");
  const [inviteInfo, setInviteInfo] = React.useState<{
    email: string;
    role: string;
    company_name: string;
    company_id: string;
  } | null>(null);
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [authMode, setAuthMode] = React.useState<"password" | "sso">("password");

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
        // Auto-detect SSO capability
        const ssoProvider = getSSOProvider(data.invitation.email);
        if (ssoProvider) {
          setAuthMode("sso");
        }
        setState("valid");
      } catch {
        setState("invalid");
        setError("Failed to validate invitation.");
      }
    }

    validateToken();
  }, [token]);

  const ssoProvider = inviteInfo ? getSSOProvider(inviteInfo.email) : null;

  const completeInviteAcceptance = async (userId: string) => {
    const supabase = createClient();
    // Upsert profile with active status
    await supabase.from("users").upsert({
      id: userId,
      company_id: inviteInfo!.company_id || "",
      email: inviteInfo!.email.toLowerCase(),
      first_name: firstName || inviteInfo!.email.split("@")[0],
      last_name: lastName || "",
      full_name: `${firstName || inviteInfo!.email.split("@")[0]} ${lastName}`.trim(),
      role: inviteInfo!.role || "employee",
      user_type: "internal",
      account_type: "standard",
      status: "active",
      language: "en",
      theme: "system",
      two_factor_enabled: false,
      updated_at: new Date().toISOString(),
    });

    // Mark invitation as accepted
    await supabase
      .from("invitations")
      .update({ accepted_at: new Date().toISOString() })
      .eq("token", token);

    // Get company slug for redirect
    const { data: company } = await supabase
      .from("companies")
      .select("slug")
      .eq("id", inviteInfo!.company_id)
      .single();

    const slug = company?.slug || "harmoniq";
    const role = inviteInfo!.role || "employee";
    return role === "employee" ? `/${slug}/app` : `/${slug}/dashboard`;
  };

  const handleSSOSignIn = async (provider: "google" | "azure") => {
    try {
      setState("signing_up");
      setError("");

      // Store invite token in sessionStorage so auth callback can pick it up
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem("harmoniq_invite_token", token!);
        window.sessionStorage.setItem("harmoniq_invite_data", JSON.stringify(inviteInfo));
      }

      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback?invite_token=${token}`,
        },
      });

      if (authError) {
        const msg = authError.message.toLowerCase();
        if (msg.includes("unsupported provider") || msg.includes("oauth secret")) {
          setError(`${provider === "google" ? "Google" : "Microsoft"} sign-in is not configured. Please use password instead.`);
          setAuthMode("password");
        } else {
          setError(authError.message);
        }
        setState("valid");
      }
    } catch (err: any) {
      setError(err.message);
      setState("valid");
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstName || !lastName) {
      setError("Please enter your first and last name.");
      return;
    }
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
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: inviteInfo!.email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            first_name: firstName,
            last_name: lastName,
            invite_token: token,
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setState("valid");
        return;
      }

      // Try to sign in immediately
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: inviteInfo!.email,
        password,
      });

      if (signInError) {
        // Email confirmation may be required
        setState("success");
        return;
      }

      const userId = signInData.user?.id || signUpData.user?.id;
      if (!userId) {
        setState("success");
        return;
      }

      const dest = await completeInviteAcceptance(userId);
      window.location.href = dest;
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
              <div className="space-y-4">
                {error && (
                  <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
                    {error}
                  </div>
                )}

                {/* Email display */}
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input
                    type="email"
                    value={inviteInfo?.email || ""}
                    disabled
                    className="w-full rounded-md border border-input bg-muted px-3 py-2 text-sm opacity-60"
                  />
                </div>

                {/* SSO option */}
                {ssoProvider && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleSSOSignIn(ssoProvider)}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                    >
                      {ssoProvider === "google" ? (
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                      ) : (
                        <svg className="h-4 w-4" viewBox="0 0 21 21" fill="currentColor"><rect x="1" y="1" width="9" height="9" fill="#f25022"/><rect x="11" y="1" width="9" height="9" fill="#7fba00"/><rect x="1" y="11" width="9" height="9" fill="#00a4ef"/><rect x="11" y="11" width="9" height="9" fill="#ffb900"/></svg>
                      )}
                      Continue with {ssoProvider === "google" ? "Google" : "Microsoft"}
                    </button>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-card px-2 text-muted-foreground">Or set a password</span>
                      </div>
                    </div>
                  </>
                )}

                {/* Password form */}
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium mb-1">First name</label>
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Last name</label>
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium mb-1">Password</label>
                    <div className="relative">
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="At least 8 characters"
                        required
                        minLength={8}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                  <div>
                    <label htmlFor="confirm" className="block text-sm font-medium mb-1">Confirm password</label>
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
                    Create account
                  </button>
                </form>
              </div>
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
