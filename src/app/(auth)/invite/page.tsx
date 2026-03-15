"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Shield, Loader, UserPlus, AlertCircle, Clock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useTranslation } from "@/i18n";

interface InvitationData {
  email: string;
  role: string;
  company_id: string;
  company_name: string;
}

type InviteState =
  | { status: "loading" }
  | { status: "valid"; invitation: InvitationData }
  | { status: "expired" }
  | { status: "invalid" }
  | { status: "already_accepted" };

export default function InvitePageWrapper() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Loader className="h-8 w-8 animate-spin text-muted-foreground" /></div>}>
      <InvitePageContent />
    </Suspense>
  );
}

function InvitePageContent() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [state, setState] = useState<InviteState>({ status: "loading" });

  useEffect(() => {
    if (!token) {
      setState({ status: "invalid" });
      return;
    }

    async function validateToken() {
      try {
        const res = await fetch(`/api/invitations/validate?token=${encodeURIComponent(token!)}`);
        const data = await res.json();

        if (res.ok && data.valid) {
          setState({ status: "valid", invitation: data.invitation });
        } else if (res.status === 404) {
          // Could be expired, already accepted, or truly invalid
          const errorMsg = (data.error || "").toLowerCase();
          if (errorMsg.includes("expired")) {
            setState({ status: "expired" });
          } else {
            // The validate endpoint filters out accepted_at != null,
            // so a 404 on a real token likely means expired or accepted
            setState({ status: "expired" });
          }
        } else {
          setState({ status: "invalid" });
        }
      } catch {
        setState({ status: "invalid" });
      }
    }

    validateToken();
  }, [token]);

  const handleAccept = () => {
    if (token) {
      router.push(`/signup?invite_token=${encodeURIComponent(token)}`);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex items-center justify-center gap-2">
          <Shield className="h-8 w-8" aria-hidden="true" />
          <span className="text-2xl font-semibold">Harmoniq Safety</span>
        </div>

        <Card>
          {state.status === "loading" && (
            <>
              <CardHeader className="text-center">
                <CardTitle className="text-xl">{t("invite.title")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center gap-3 py-8">
                  <Loader className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden="true" />
                  <p className="text-sm text-muted-foreground">{t("invite.loading")}</p>
                </div>
              </CardContent>
            </>
          )}

          {state.status === "valid" && (
            <>
              <CardHeader className="text-center">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <UserPlus className="h-6 w-6 text-primary" aria-hidden="true" />
                </div>
                <CardTitle className="text-xl">
                  {t("invite.joinCompany", { company: state.invitation.company_name })}
                </CardTitle>
                <CardDescription>{t("invite.title")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("auth.email")}</span>
                    <span className="font-medium">{state.invitation.email}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("invite.role")}</span>
                    <span className="font-medium capitalize">{state.invitation.role.replace("_", " ")}</span>
                  </div>
                </div>

                <Button onClick={handleAccept} className="w-full gap-2">
                  <UserPlus className="h-4 w-4" aria-hidden="true" />
                  {t("invite.accept")}
                </Button>

                <p className="text-center text-xs text-muted-foreground">
                  {t("auth.alreadyHaveAccount")}{" "}
                  <Link href="/login" className="text-primary hover:underline">
                    {t("auth.logIn")}
                  </Link>
                </p>
              </CardContent>
            </>
          )}

          {state.status === "expired" && (
            <>
              <CardHeader className="text-center">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-warning/10">
                  <Clock className="h-6 w-6 text-warning" aria-hidden="true" />
                </div>
                <CardTitle className="text-xl">{t("invite.expired")}</CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <p className="text-sm text-muted-foreground">
                  {t("invite.expiredDescription")}
                </p>
                <Link href="/login">
                  <Button variant="outline" className="w-full">
                    {t("forgotPassword.backToLogin")}
                  </Button>
                </Link>
              </CardContent>
            </>
          )}

          {state.status === "invalid" && (
            <>
              <CardHeader className="text-center">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                  <AlertCircle className="h-6 w-6 text-destructive" aria-hidden="true" />
                </div>
                <CardTitle className="text-xl">{t("invite.invalid")}</CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <p className="text-sm text-muted-foreground">
                  {t("invite.invalidDescription")}
                </p>
                <Link href="/login">
                  <Button variant="outline" className="w-full">
                    {t("forgotPassword.backToLogin")}
                  </Button>
                </Link>
              </CardContent>
            </>
          )}

          {state.status === "already_accepted" && (
            <>
              <CardHeader className="text-center">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
                  <CheckCircle2 className="h-6 w-6 text-success" aria-hidden="true" />
                </div>
                <CardTitle className="text-xl">{t("invite.alreadyAccepted")}</CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <p className="text-sm text-muted-foreground">
                  {t("invite.alreadyAcceptedDescription")}
                </p>
                <Link href="/login">
                  <Button className="w-full">
                    {t("auth.signIn")}
                  </Button>
                </Link>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
