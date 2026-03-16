"use client";

import * as React from "react";
import Link from "next/link";
import { Shield, Mail, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useTranslation } from "@/i18n";

const RATE_LIMIT_KEY = "harmoniq_forgot_pw_attempts";
const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

function isValidEmailFormat(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function checkRateLimit(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = sessionStorage.getItem(RATE_LIMIT_KEY);
    if (!raw) return true;
    const attempts: number[] = JSON.parse(raw);
    const now = Date.now();
    const recent = attempts.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);
    return recent.length < RATE_LIMIT_MAX;
  } catch {
    return true;
  }
}

function recordAttempt(): void {
  if (typeof window === "undefined") return;
  try {
    const raw = sessionStorage.getItem(RATE_LIMIT_KEY);
    const attempts: number[] = raw ? JSON.parse(raw) : [];
    const now = Date.now();
    const recent = attempts.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);
    recent.push(now);
    sessionStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(recent));
  } catch {
    // Silently fail if sessionStorage is unavailable
  }
}

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [error, setError] = React.useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!isValidEmailFormat(email)) {
      setError(t("validation.invalidEmail"));
      return;
    }

    if (!checkRateLimit()) {
      setError(t("forgotPassword.rateLimited"));
      return;
    }

    setIsLoading(true);
    recordAttempt();

    // Simulate API call, no-supabase version
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsLoading(false);
    setSubmitted(true);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex items-center justify-center gap-2">
          <Shield className="h-8 w-8" aria-hidden="true" />
          <span className="text-2xl font-semibold">Harmoniq</span>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">{t("forgotPassword.title")}</CardTitle>
            <CardDescription>
              {submitted
                ? t("forgotPassword.sent")
                : t("forgotPassword.description")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {submitted ? (
              <div className="space-y-4 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
                  <Mail className="h-6 w-6 text-success" aria-hidden="true" />
                </div>
                <p className="text-sm text-muted-foreground">
                  {t("forgotPassword.sentDescription")}
                </p>
                <Link href="/login">
                  <Button className="w-full gap-2">
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    {t("forgotPassword.backToLogin")}
                  </Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">{t("auth.email")}</Label>
                  <div className="relative">
                    <Mail
                      className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <Input
                      id="email"
                      type="email"
                      placeholder={t("auth.emailPlaceholder")}
                      className="pl-10"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (error) setError("");
                      }}
                      required
                      autoComplete="email"
                    />
                  </div>
                  {error && (
                    <p className="text-sm text-destructive">{error}</p>
                  )}
                </div>

                <Button type="submit" className="w-full" loading={isLoading}>
                  {t("forgotPassword.send")}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link href="/login" className="hover:text-foreground">
            {t("forgotPassword.backToLogin")}
          </Link>
        </p>
      </div>
    </div>
  );
}
