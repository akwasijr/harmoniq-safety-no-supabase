"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Lock } from "lucide-react";
import { useTranslation } from "@/i18n";

export default function SignupPage() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-[420px]">
        <div className="mb-6 flex flex-col items-center gap-2">
          <Image src="/favicon.svg" alt="Harmoniq Logo" width={40} height={40} className="h-10 w-10" />
          <span className="text-lg font-semibold">Harmoniq Safety</span>
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
        </div>

        <div className="mt-5 rounded-lg border bg-muted/30 py-3 text-center text-sm text-muted-foreground">
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
