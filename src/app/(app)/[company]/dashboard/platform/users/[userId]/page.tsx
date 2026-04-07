"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { LoadingPage } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";
import {
  ArrowLeft,
  Globe,
  Shield,
  Calendar,
  Clock,
  Key,
  Save,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { DetailTabs, TabItem } from "@/components/ui/detail-tabs";
import { RoleGuard } from "@/components/auth/role-guard";
import { useToast } from "@/components/ui/toast";
import { useUsersStore } from "@/stores/users-store";
import type { User } from "@/types";
import { logPlatformAuditEvent } from "@/lib/platform-audit-client";
import { useTranslation } from "@/i18n";

interface PlatformAuditLogEntry {
  id: string;
  user_id: string;
  action: string;
  resource: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

export default function PlatformUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const company = params.company as string;
  const userId = params.userId as string;
  const { items: users, isLoading, update: updateUser, remove: removeUser } = useUsersStore();
  const { t, formatDate } = useTranslation();

  const user = users.find((u) => u.id === userId);
  const [editedUser, setEditedUser] = React.useState<User | null>(user || null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [activityLogs, setActivityLogs] = React.useState<PlatformAuditLogEntry[]>([]);
  const [activityLoading, setActivityLoading] = React.useState(true);

  React.useEffect(() => {
    if (user) {
      setEditedUser(user);
    }
  }, [user]);

  const loadActivity = React.useCallback(async () => {
    setActivityLoading(true);
    try {
      const response = await fetch(`/api/platform/audit-logs?userId=${userId}&limit=20`, {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error("Failed to load activity");
      }
      const data = (await response.json()) as { logs?: PlatformAuditLogEntry[] };
      setActivityLogs(data.logs ?? []);
    } catch {
      setActivityLogs([]);
    } finally {
      setActivityLoading(false);
    }
  }, [userId]);

  React.useEffect(() => {
    void loadActivity();
  }, [loadActivity]);

  if (isLoading && users.length === 0) {
    return <LoadingPage />;
  }

  if (!user || !editedUser) {
    return (
      <RoleGuard requireSuperAdmin>
        <EmptyState
          title="Platform user not found"
          description="The requested platform user could not be found."
          action={
            <Link href={`/${company}/dashboard/platform/users`}>
              <Button variant="link" className="mt-2">
                {t("common.back")} to platform users
              </Button>
            </Link>
          }
        />
      </RoleGuard>
    );
  }

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (editedUser) {
        updateUser(editedUser.id, editedUser);
        await logPlatformAuditEvent({
          action: "platform_admin_updated",
          resource: "platform_users",
          companyId: editedUser.company_id,
          details: {
            target_user_id: editedUser.id,
            target_user_email: editedUser.email,
          },
        });
        toast("User details saved successfully", "success");
        await loadActivity();
      }
    } finally {
      setIsSaving(false);
    }
  };

  const roleLabel = user.role === "super_admin" ? "Super Admin" : "Company Admin";
  const latestSecurityEvent = activityLogs[0] ?? null;

  const tabs: TabItem[] = [
    { id: "overview", label: t("users.information") },
    { id: "activity", label: t("users.activity") },
    { id: "security", label: t("users.security") },
    { id: "settings", label: "Settings" },
  ];

  return (
    <RoleGuard requireSuperAdmin>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <Link
            href={`/${company}/dashboard/platform/users`}
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("common.back")} to platform users
          </Link>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Globe className="h-4 w-4" />
            Platform Admin
          </div>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground">
                {(user.first_name || "").charAt(0)}
                {(user.last_name || "").charAt(0)}
              </div>
              <div>
                <h1 className="heading-2">{user.full_name}</h1>
                <p className="text-sm text-muted-foreground">
                  {user.email} · {user.job_title || "Platform Administrator"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{user.status}</span>
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Shield className="h-3 w-3" />
                {roleLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <DetailTabs tabs={tabs}>
          {(activeTab) => (
            <>
              {/* Overview Tab */}
              {activeTab === "overview" && (
                <div className="grid gap-6 lg:grid-cols-2">
                  {/* Personal Info */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">
                        {t("users.personalInformation")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>{t("users.labels.firstName")}</Label>
                          <Input
                            className="mt-1"
                            value={editedUser.first_name}
                            onChange={(e) =>
                              setEditedUser({
                                ...editedUser,
                                first_name: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div>
                          <Label>{t("users.labels.lastName")}</Label>
                          <Input
                            className="mt-1"
                            value={editedUser.last_name}
                            onChange={(e) =>
                              setEditedUser({
                                ...editedUser,
                                last_name: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                      <div>
                        <Label>{t("users.labels.email")}</Label>
                        <Input
                          className="mt-1"
                          type="email"
                          value={editedUser.email}
                          onChange={(e) =>
                            setEditedUser({
                              ...editedUser,
                              email: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label>Job Title</Label>
                        <Input
                          className="mt-1"
                          value={editedUser.job_title || ""}
                          onChange={(e) =>
                            setEditedUser({
                              ...editedUser,
                              job_title: e.target.value,
                            })
                          }
                        />
                      </div>
                      <Button
                        className="gap-2"
                        onClick={handleSave}
                        disabled={isSaving}
                      >
                        <Save className="h-4 w-4" />
                        {isSaving ? "Saving..." : t("common.save")}
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Account Info */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">
                        Account Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between rounded-lg border p-3">
                        <div className="flex items-center gap-3">
                          <Shield className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{t("users.labels.role")}</p>
                            <p className="text-xs text-muted-foreground">
                              {roleLabel}
                            </p>
                          </div>
                        </div>
                        <span className="text-sm text-muted-foreground">Platform Level</span>
                      </div>
                      <div className="flex items-center justify-between rounded-lg border p-3">
                        <div className="flex items-center gap-3">
                          <Key className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">
                              {t("users.twoFactorAuth")}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {user.two_factor_enabled
                                ? t("users.enabled")
                                : "Not enabled"}
                            </p>
                          </div>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {user.two_factor_enabled ? "On" : "Off"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between rounded-lg border p-3">
                        <div className="flex items-center gap-3">
                          <Calendar className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">Created</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(user.created_at)}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between rounded-lg border p-3">
                        <div className="flex items-center gap-3">
                          <Clock className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{t("users.labels.lastActive")}</p>
                            <p className="text-xs text-muted-foreground">
                              {user.last_login_at
                                ? formatDate(user.last_login_at)
                                : "Never"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Activity Tab */}
              {activeTab === "activity" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Activity Log</CardTitle>
                    <CardDescription>
                      Recent actions performed by this administrator
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {activityLoading ? (
                        <p className="text-sm text-muted-foreground">Loading activity...</p>
                      ) : activityLogs.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No recorded activity for this administrator yet.
                        </p>
                      ) : (
                        activityLogs.map((activity) => (
                        <div
                          key={activity.id}
                          className="flex items-start justify-between border-b pb-3 last:border-0"
                        >
                          <div>
                            <p className="text-sm font-medium">
                              {activity.action.replace(/_/g, " ")}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {activity.ip_address ? `IP: ${activity.ip_address}` : "No IP captured"}
                            </p>
                          </div>
                          <p className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDate(activity.created_at)}
                          </p>
                        </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Security Tab */}
              {activeTab === "security" && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">
                        {t("users.twoFactorAuth")}
                      </CardTitle>
                      <CardDescription>
                        {t("users.twoFactorDesc")}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{t("users.enable2FA")}</p>
                          <p className="text-xs text-muted-foreground">
                            Require TOTP verification on login
                          </p>
                        </div>
                        <Switch
                          checked={editedUser.two_factor_enabled}
                          onCheckedChange={(value) => {
                            if (!editedUser) return;
                            const nextUser = { ...editedUser, two_factor_enabled: value };
                            setEditedUser(nextUser);
                            updateUser(nextUser.id, { two_factor_enabled: value });
                            void logPlatformAuditEvent({
                              action: value ? "platform_admin_2fa_enabled" : "platform_admin_2fa_disabled",
                              resource: "platform_users",
                              companyId: nextUser.company_id,
                              details: {
                                target_user_id: nextUser.id,
                                target_user_email: nextUser.email,
                              },
                            }).then(() => loadActivity());
                            toast(value ? "2FA enabled" : "2FA disabled");
                          }}
                        />
                      </div>
                      <div className="rounded-lg border border-dashed bg-muted/30 p-3 text-sm text-muted-foreground">
                        Two-factor authentication adds an extra layer of security to this account.
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">
                        Password Management
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Button
                        variant="outline"
                        onClick={async () => {
                          try {
                            const response = await fetch(`/api/platform/users/${user.id}/password-reset`, {
                              method: "POST",
                            });
                            const data = (await response.json()) as { error?: string };
                            if (!response.ok) {
                              throw new Error(data.error || "Failed to send password reset");
                            }
                            toast("Password reset email sent", "success");
                            await loadActivity();
                          } catch (error) {
                            toast(
                              error instanceof Error ? error.message : "Failed to send password reset",
                              "error",
                            );
                          }
                        }}
                      >
                        {t("users.resetPassword")}
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        Sends a password reset email to the user
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">
                        {t("users.activeSessions")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <p className="text-sm font-medium">Last sign in</p>
                          <p className="text-xs text-muted-foreground">
                            {user.last_login_at ? formatDate(user.last_login_at) : "No login recorded"}
                          </p>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {user.last_login_at ? "Recorded" : "Pending"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <p className="text-sm font-medium">Latest security event</p>
                          <p className="text-xs text-muted-foreground">
                            {latestSecurityEvent
                              ? `${latestSecurityEvent.action.replace(/_/g, " ")}${latestSecurityEvent.ip_address ? ` · ${latestSecurityEvent.ip_address}` : ""}`
                              : "No security events recorded yet"}
                          </p>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {latestSecurityEvent ? formatDate(latestSecurityEvent.created_at) : "--"}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Settings Tab */}
              {activeTab === "settings" && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">
                        Account Status
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Active</p>
                          <p className="text-xs text-muted-foreground">
                            {t("users.deactivateUserDesc")}
                          </p>
                        </div>
                        <Switch
                          checked={editedUser.status === "active"}
                          onCheckedChange={(checked) => {
                            const newStatus = checked ? "active" : "inactive";
                            setEditedUser({ ...editedUser, status: newStatus });
                            updateUser(user.id, { status: newStatus, updated_at: new Date().toISOString() });
                            void logPlatformAuditEvent({
                              action: checked ? "platform_admin_activated" : "platform_admin_deactivated",
                              resource: "platform_users",
                              companyId: editedUser.company_id,
                              details: { target_user_id: user.id, target_user_email: user.email },
                            }).then(() => loadActivity());
                            toast(checked ? "User activated" : "User deactivated", "info");
                          }}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-destructive/50">
                    <CardHeader>
                      <CardTitle className="text-base text-destructive">
                        {t("users.dangerZone")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{t("users.deleteUser")}</p>
                          <p className="text-xs text-muted-foreground">
                            Permanently remove this platform admin. This cannot
                            be undone.
                          </p>
                        </div>
                        <Button variant="destructive" size="sm" className="gap-2" onClick={() => {
                          const confirmed = window.confirm(
                            `Are you sure you want to delete "${user.full_name}"? This cannot be undone.`
                          );
                          if (!confirmed) return;
                          removeUser(user.id);
                          void logPlatformAuditEvent({
                            action: "platform_admin_deleted",
                            resource: "platform_users",
                            companyId: user.company_id,
                            details: { target_user_id: user.id, target_user_email: user.email },
                          });
                          toast("User account deleted", "info");
                          router.push(`/${company}/dashboard/platform/users`);
                        }}>
                          <Trash2 className="h-4 w-4" />
                          {t("common.delete")}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </>
          )}
        </DetailTabs>
      </div>
    </RoleGuard>
  );
}
