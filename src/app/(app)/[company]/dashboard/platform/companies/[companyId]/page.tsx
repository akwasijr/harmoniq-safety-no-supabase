"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DetailTabs, TabItem } from "@/components/ui/detail-tabs";
import { RoleGuard } from "@/components/auth/role-guard";
import { useToast } from "@/components/ui/toast";
import { useCompanyStore } from "@/stores/company-store";
import { useUsersStore } from "@/stores/users-store";
import { useIncidentsStore } from "@/stores/incidents-store";
import type { Company } from "@/types";
import { useTranslation } from "@/i18n";

export default function PlatformCompanyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { items: companies, isLoading, getById: getCompany, update: updateCompany } = useCompanyStore();
  const { items: users } = useUsersStore();
  const { items: incidents } = useIncidentsStore();
  const company = params.company as string;
  const companyId = params.companyId as string;
  const { t, formatDate } = useTranslation();

  const targetCompany = getCompany(companyId) ?? companies.find((item) => item.slug === companyId);
  const [editedCompany, setEditedCompany] = React.useState<Company | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    if (targetCompany) {
      setEditedCompany((prev) => (prev?.id === targetCompany.id ? prev : targetCompany));
    }
  }, [targetCompany]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!targetCompany || !editedCompany) {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      );
    }
    return (
      <RoleGuard requireSuperAdmin>
        <div className="py-12 text-center">
          <p className="text-muted-foreground">Company not found</p>
          <Link href={`/${company}/dashboard/platform/companies`}>
            <Button variant="link">Back to companies</Button>
          </Link>
        </div>
      </RoleGuard>
    );
  }

  const companyUsers = users.filter((u) => u.company_id === targetCompany.id);
  const companyIncidents = incidents.filter((i) => i.company_id === targetCompany.id);
  const openIncidents = companyIncidents.filter(
    (i) => i.status === "new" || i.status === "in_progress"
  );

  const tabs: TabItem[] = [
    { id: "overview", label: "Overview" },
    { id: "users", label: `Users (${companyUsers.length})` },
    { id: "billing", label: "Billing" },
    { id: "settings", label: "Settings" },
  ];

  return (
    <RoleGuard requireSuperAdmin>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <Link
              href={`/${company}/dashboard/platform/companies`}
              className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("common.back")}
            </Link>
            <div className="flex items-center gap-3">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-lg text-white text-xl font-medium"
                style={{ backgroundColor: editedCompany.primary_color }}
              >
                {editedCompany.name.charAt(0)}
              </div>
              <div>
                <h1 className="heading-2">{editedCompany.name}</h1>
                <p className="text-sm text-muted-foreground">
                  {targetCompany.country} · {targetCompany.tier}
                </p>
              </div>
            </div>
          </div>
          <span className="text-sm text-muted-foreground capitalize">{targetCompany.status}</span>
        </div>

        {/* Tabs */}
        <DetailTabs tabs={tabs} defaultTab="overview">
          {(activeTab) => (
            <>
              {activeTab === "overview" && (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Users</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{companyUsers.length}</div>
                      <p className="text-xs text-muted-foreground">
                        of {targetCompany.seat_limit} seats
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Open Incidents</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{openIncidents.length}</div>
                      <p className="text-xs text-muted-foreground">
                        {companyIncidents.length} total
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Created</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-lg font-medium">
                        {formatDate(new Date(targetCompany.created_at))}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">{t("companies.plan")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-lg font-medium capitalize">{targetCompany.tier}</div>
                      <p className="text-xs text-muted-foreground">
                        {targetCompany.seat_limit} seats
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeTab === "users" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Company Users</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {companyUsers.map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center justify-between rounded-lg border p-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
                              {user.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                            </div>
                            <div>
                              <p className="font-medium">{user.full_name}</p>
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{user.role}</Badge>
                            <Badge variant={user.status === "active" ? "success" : "secondary"}>
                              {user.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                      {companyUsers.length === 0 && (
                        <p className="py-4 text-center text-muted-foreground">No users found</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeTab === "billing" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Billing Information</CardTitle>
                    <CardDescription>Subscription and payment details</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <Label>Current Plan</Label>
                        <p className="text-lg font-medium capitalize">{targetCompany.tier}</p>
                      </div>
                      <div>
                        <Label>Seat Limit</Label>
                        <p className="text-lg font-medium">{targetCompany.seat_limit}</p>
                      </div>
                      <div>
                        <Label>Currency</Label>
                        <p className="text-lg font-medium">{targetCompany.currency}</p>
                      </div>
                      <div>
                        <Label>Status</Label>
                        <p className="text-lg font-medium capitalize">{targetCompany.status}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeTab === "settings" && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Company Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label>{t("companies.companyName")}</Label>
                        <Input
                          value={editedCompany.name}
                          onChange={(e) =>
                            setEditedCompany({ ...editedCompany, name: e.target.value })
                          }
                          className="mt-1"
                        />
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <Label>{t("companies.primaryColor")}</Label>
                          <div className="mt-1 flex items-center gap-2">
                            <input
                              type="color"
                              value={editedCompany.primary_color}
                              onChange={(e) =>
                                setEditedCompany({ ...editedCompany, primary_color: e.target.value })
                              }
                              className="h-10 w-20 cursor-pointer rounded border"
                            />
                            <Input
                              value={editedCompany.primary_color}
                              onChange={(e) =>
                                setEditedCompany({ ...editedCompany, primary_color: e.target.value })
                              }
                              className="flex-1"
                            />
                          </div>
                        </div>
                        <div>
                          <Label>{t("companies.secondaryColor")}</Label>
                          <div className="mt-1 flex items-center gap-2">
                            <input
                              type="color"
                              value={editedCompany.secondary_color}
                              onChange={(e) =>
                                setEditedCompany({ ...editedCompany, secondary_color: e.target.value })
                              }
                              className="h-10 w-20 cursor-pointer rounded border"
                            />
                            <Input
                              value={editedCompany.secondary_color}
                              onChange={(e) =>
                                setEditedCompany({ ...editedCompany, secondary_color: e.target.value })
                              }
                              className="flex-1"
                            />
                          </div>
                        </div>
                      </div>
                      <Button className="gap-2" onClick={async () => {
                        setIsSaving(true);
                        await new Promise((r) => setTimeout(r, 800));
                        updateCompany(targetCompany.id, {
                          name: editedCompany.name,
                          primary_color: editedCompany.primary_color,
                          secondary_color: editedCompany.secondary_color,
                        });
                        setIsSaving(false);
                        toast("Company settings saved successfully");
                      }} disabled={isSaving}>
                        <Save className="h-4 w-4" />
                        {isSaving ? "Saving..." : t("common.save")}
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="border-destructive">
                    <CardHeader>
                      <CardTitle className="text-destructive">Danger Zone</CardTitle>
                      <CardDescription>Suspending a company will immediately disable access for all its users.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button variant="destructive" className="gap-2" onClick={() => {
                        const confirmed = window.confirm(
                          `Are you sure you want to suspend "${targetCompany.name}"? All users will lose access immediately.`
                        );
                        if (!confirmed) return;
                        const newStatus = targetCompany.status === "suspended" ? "active" : "suspended";
                        updateCompany(companyId, { status: newStatus, updated_at: new Date().toISOString() });
                        toast(
                          newStatus === "suspended"
                            ? "Company has been suspended"
                            : "Company has been reactivated",
                          "info"
                        );
                        router.push(`/${company}/dashboard/platform/companies`);
                      }}>
                        <Trash2 className="h-4 w-4" />
                        {targetCompany.status === "suspended" ? "Reactivate Company" : "Suspend Company"}
                      </Button>
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
