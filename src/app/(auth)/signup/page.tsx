"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Building2, Loader } from "lucide-react";

export default function SignupPage() {
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [formData, setFormData] = React.useState({
    company_name: "",
    country: "US",
  });

  const handleOAuthSignUp = async (provider: "google" | "azure") => {
    try {
      setIsLoading(true);
      setError("");
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/signup-callback`,
        },
      });
      if (authError) {
        setError(`OAuth error: ${authError.message}`);
        setIsLoading(false);
      }
    } catch (err: any) {
      setError(`Error: ${err.message}`);
      setIsLoading(false);
    }
  };

  const handleCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setError("User not authenticated");
        setIsLoading(false);
        return;
      }

      // Create company
      const { data: company, error: companyError } = await supabase
        .from("companies")
        .insert([{
          name: formData.company_name,
          slug: formData.company_name.toLowerCase().replace(/\s+/g, "-"),
          country: formData.country,
          language: "en",
          status: "active",
          tier: "starter",
          seat_limit: 10,
          currency: formData.country === "US" ? "USD" : formData.country === "SE" ? "SEK" : "EUR",
        }])
        .select()
        .single();

      if (companyError) {
        setError(companyError.message);
        setIsLoading(false);
        return;
      }

      // Create admin user
      const { error: userError } = await supabase
        .from("users")
        .insert([{
          id: user.id,
          company_id: company.id,
          email: user.email,
          first_name: user.user_metadata?.given_name || "Admin",
          last_name: user.user_metadata?.family_name || "User",
          role: "super_admin",
          status: "active",
          email_verified_at: new Date().toISOString(),
          oauth_provider: "google",
          oauth_id: user.id,
        }]);

      if (userError) {
        setError(userError.message);
        setIsLoading(false);
        return;
      }

      // Redirect to dashboard
      window.location.href = `/${company.slug}/dashboard`;
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md">
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

        <div className="rounded-lg border bg-white p-8 shadow-sm">
          <h1 className="text-center text-xl font-semibold mb-2">Create your account</h1>
          <p className="text-center text-sm text-gray-600 mb-6">Sign up with your corporate account</p>

          {error && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={() => handleOAuthSignUp("google")}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              {isLoading ? (
                <Loader className="h-4 w-4 animate-spin" />
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              )}
              Sign up with Google
            </button>

            <button
              onClick={() => handleOAuthSignUp("azure")}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              {isLoading ? (
                <Loader className="h-4 w-4 animate-spin" />
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zm12.6 0H12.6V0H24v11.4z"/>
                </svg>
              )}
              Sign up with Microsoft
            </button>
          </div>

          <p className="text-center text-sm text-gray-600 mt-6">
            Already have an account? <Link href="/login" className="font-semibold hover:underline">Log in</Link>
          </p>
        </div>

        <p className="mt-6 text-center text-sm text-gray-600">
          <Link href="/" className="hover:underline">← Back to home</Link>
        </p>
      </div>
    </div>
  );
}
