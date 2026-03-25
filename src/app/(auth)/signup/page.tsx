"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Lock } from "lucide-react";
import { useTranslation } from "@/i18n";

export default function SignupPage() {
  const { t } = useTranslation();
  const [email, setEmail] = React.useState("");
  const [status, setStatus] = React.useState<"idle" | "loading" | "success" | "error">("idle");

  const handleWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (res.ok) {
        if (typeof window !== "undefined") {
          const existing = JSON.parse(localStorage.getItem("harmoniq_waitlist") || "[]");
          existing.push({ email: email.trim(), timestamp: new Date().toISOString() });
          localStorage.setItem("harmoniq_waitlist", JSON.stringify(existing));
        }
        setStatus("success");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4" style={{ background: 'white' }}>
      <div aria-hidden="true" style={{ position: 'fixed', inset: 0, overflow: 'hidden', zIndex: 0, pointerEvents: 'none' }}>
        <div style={{
          position: 'absolute', top: '-15%', right: '-8%', width: '45%', height: '80%',
          background: 'linear-gradient(160deg, hsla(200,90%,78%,0.5), hsla(240,75%,68%,0.45), hsla(265,70%,55%,0.5), hsla(280,65%,48%,0.45), hsla(210,85%,75%,0.4))',
          backgroundSize: '300% 300%',
          filter: 'blur(40px)',
          borderRadius: '40% 60% 50% 50%',
          animation: 'auth-flow 8s ease-in-out infinite, auth-morph 12s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', top: '5%', right: '-2%', width: '30%', height: '60%',
          background: 'linear-gradient(170deg, hsla(195,90%,80%,0.45), hsla(230,80%,72%,0.4), hsla(260,65%,58%,0.45), hsla(195,85%,78%,0.35))',
          backgroundSize: '300% 300%',
          filter: 'blur(35px)',
          borderRadius: '50% 40% 55% 45%',
          animation: 'auth-flow 6s ease-in-out infinite reverse, auth-morph 10s ease-in-out infinite reverse',
          animationDelay: '-3s',
        }} />
        <div style={{
          position: 'absolute', top: '-8%', right: '3%', width: '22%', height: '50%',
          background: 'linear-gradient(150deg, hsla(210,95%,82%,0.4), hsla(255,70%,65%,0.35), hsla(275,60%,50%,0.3), hsla(210,90%,78%,0.35))',
          backgroundSize: '300% 300%',
          filter: 'blur(30px)',
          borderRadius: '45% 55% 40% 60%',
          animation: 'auth-flow 10s ease-in-out infinite, auth-morph 14s ease-in-out infinite',
          animationDelay: '-6s',
        }} />
      </div>
      <div className="relative z-10 w-full max-w-[420px]">
        <div className="mb-6 flex flex-col items-center gap-2">
          <Image src="/favicon.svg" alt="Harmoniq Logo" width={40} height={40} className="h-10 w-10" />
          <span className="text-lg font-semibold">Harmoniq</span>
        </div>

        <div className="rounded-xl border bg-background p-8 shadow-sm text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-6 w-6 text-primary" />
          </div>

          <h1 className="text-2xl font-bold tracking-tight mb-2">
            {t("auth.signupUnavailable") || "Sign up is not yet available"}
          </h1>

          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            {t("auth.signupUnavailableDesc") || "Harmoniq Safety is currently in private access. To get started, please contact your company administrator or reach out to our team for an invitation."}
          </p>

          <Link
            href="/contact"
            className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            {t("auth.contactUs") || "Contact us"}
          </Link>

          <div className="mt-6 pt-6 border-t border-border">
            {status === "success" ? (
              <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                You&apos;re on the list! We&apos;ll notify you when spots open.
              </p>
            ) : (
              <>
                <p className="text-xs text-muted-foreground mb-3">
                  Or join the waitlist and we&apos;ll notify you when spots open.
                </p>
                <form onSubmit={handleWaitlist} className="flex gap-2">
                  <input
                    type="email"
                    required
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex-1 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <button
                    type="submit"
                    disabled={status === "loading"}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {status === "loading" ? "..." : "Join"}
                  </button>
                </form>
                {status === "error" && (
                  <p className="mt-2 text-xs text-red-500">Something went wrong. Try again.</p>
                )}
              </>
            )}
          </div>
        </div>

        <div className="mt-5 rounded-lg border border-border bg-card/60 dark:bg-white/5 py-3 text-center text-sm text-muted-foreground">
          {t("auth.alreadyHaveAccount") || "Already have an account?"}{" "}
          <Link href="/login" className="font-semibold text-primary hover:text-primary/80 transition-colors">
            {t("auth.signIn") || "Sign in"}
          </Link>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          <Link href="/" className="hover:text-foreground transition-colors">
            {t("auth.backToHome")}
          </Link>
        </p>
      </div>
    </div>
  );
}
