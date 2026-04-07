"use client";

import * as React from "react";
import {
  Save,
  Shield,
  Database,
  Mail,
  Bell,
  Clock,
  Languages,
  CreditCard,
  Info,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DetailTabs, type Tab } from "@/components/ui/detail-tabs";
import { RoleGuard } from "@/components/auth/role-guard";
import { useToast } from "@/components/ui/toast";
import { COUNTRY_OPTIONS } from "@/lib/country-config";
import {
  DEFAULT_PLATFORM_ADMIN_SETTINGS,
  type PlatformAdminSettings,
} from "@/lib/platform-admin-settings";
import { useCompanyStore } from "@/stores/company-store";
import { useTranslation } from "@/i18n";

const COUNTRY_LANGUAGE_LABELS: Record<string, string> = {
  US: "English",
  GB: "English",
  NL: "Dutch + English",
  SE: "Swedish + English",
  DE: "German + English",
  FR: "French + English",
  ES: "Spanish + English",
};

const COUNTRY_FORM_SUMMARIES: Record<string, string[]> = {
  US: ["JHA", "JSA", "OSHA template library"],
  GB: ["HSE mappings", "RIDDOR / COSHH / PUWER templates"],
  NL: ["RI&E", "Arbowet Compliance"],
  SE: ["SAM", "OSA / AFS Assessment"],
  DE: ["ArbSchG mappings", "DGUV / BetrSichV templates"],
  FR: ["DUERP mappings", "Code du travail templates"],
  ES: ["PRL mappings", "Ley 31/1995 templates"],
};

export default function PlatformSettingsPage() {
  const { toast } = useToast();
  const { items: companies } = useCompanyStore();
  const { t } = useTranslation();

  const [isSaving, setIsSaving] = React.useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState("general");

  const [settings, setSettings] = React.useState<PlatformAdminSettings>(
    DEFAULT_PLATFORM_ADMIN_SETTINGS,
  );

  React.useEffect(() => {
    let active = true;

    const loadSettings = async () => {
      setIsLoadingSettings(true);
      try {
        const response = await fetch("/api/platform/settings", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Failed to load platform settings");
        }

        const data = (await response.json()) as PlatformAdminSettings;
        if (active) {
          setSettings(data);
        }
      } catch {
        if (active) {
          setSettings(DEFAULT_PLATFORM_ADMIN_SETTINGS);
          toast("Could not load platform settings", "error");
        }
      } finally {
        if (active) {
          setIsLoadingSettings(false);
        }
      }
    };

    void loadSettings();

    return () => {
      active = false;
    };
  }, [toast]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/platform/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        throw new Error("Failed to save platform settings");
      }

      const data = (await response.json()) as PlatformAdminSettings;
      setSettings(data);
      toast("Platform settings saved successfully", "success");
    } catch {
      toast("Failed to save platform settings", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const tabs: Tab[] = [
    { id: "general", label: t("settings.tabs.general"), icon: Info },
    { id: "security", label: t("settings.tabs.security"), icon: Shield },
    { id: "email", label: "Email & Notifications", icon: Mail },
    { id: "billing", label: "Billing & Plans", icon: CreditCard },
    { id: "countries", label: "Countries", icon: Languages },
  ];

  return (
    <RoleGuard allowedRoles={["super_admin", "company_admin"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="heading-2">Platform Settings</h1>
          </div>
          <Button className="gap-2" onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4" />
            {isLoadingSettings ? "Loading..." : isSaving ? t("settings.saving") : "Save All Changes"}
          </Button>
        </div>

        {/* Platform Stats */}
        <div className="grid gap-4 sm:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Companies
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{companies.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Companies
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {companies.filter((c) => c.status === "active").length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Trial Companies
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {companies.filter((c) => c.status === "trial").length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Enabled Countries
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {settings.enabledCountries.length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <DetailTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Tab Content */}
        <div>
              {/* General Tab */}
              {activeTab === "general" && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">
                        Platform Identity
                      </CardTitle>
                      <CardDescription>
                        Basic platform information
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label>Platform Name</Label>
                        <Input
                          className="mt-1"
                          value={settings.platformName}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              platformName: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label>Support Email</Label>
                        <Input
                          className="mt-1"
                          type="email"
                          value={settings.supportEmail}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              supportEmail: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label>Support URL</Label>
                        <Input
                          className="mt-1"
                          value={settings.supportUrl}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              supportUrl: e.target.value,
                            })
                          }
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <Database className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <CardTitle className="text-base">
                            Data Retention
                          </CardTitle>
                          <CardDescription>
                            How long data is kept before archival
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label>Default Retention Period (years)</Label>
                        <Input
                          className="mt-1 w-32"
                          type="number"
                          min={1}
                          max={10}
                          value={settings.retentionYears}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              retentionYears: parseInt(e.target.value) || 5,
                            })
                          }
                        />
                        <p className="mt-1 text-xs text-muted-foreground">
                          OSHA requires minimum 5 years. Companies can override
                          (1-10 years).
                        </p>
                      </div>
                      <div className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <p className="text-sm font-medium">
                            Audit Log Retention
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Audit logs are retained indefinitely for compliance
                          </p>
                        </div>
                        <span className="text-sm text-muted-foreground">Indefinite</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">
                        Feature Flags
                      </CardTitle>
                      <CardDescription>
                        Toggle platform-wide features
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">
                            Allow Self-Signup
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Let companies sign up without manual approval
                          </p>
                        </div>
                        <Switch
                          checked={settings.allowSelfSignup}
                          onCheckedChange={(checked) =>
                            setSettings({
                              ...settings,
                              allowSelfSignup: checked,
                            })
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">
                            Maintenance Mode
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Show maintenance banner to all users
                          </p>
                        </div>
                        <Switch
                          checked={settings.maintenanceMode}
                          onCheckedChange={(checked) =>
                            setSettings({
                              ...settings,
                              maintenanceMode: checked,
                            })
                          }
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Security Tab */}
              {activeTab === "security" && (
                <div className="space-y-6">
                  {/* Demo Banner */}
                    <div
                      role="status"
                      className="rounded-xl border border-amber-400/70 bg-amber-100 px-4 py-4 text-amber-950 shadow-sm dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-50"
                    >
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-200 text-amber-950 dark:bg-amber-900/70 dark:text-amber-100">
                        <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <div className="space-y-1">
                        <p className="text-sm font-semibold tracking-tight text-amber-950 dark:text-amber-50">
                          Saved policy controls
                        </p>
                        <p className="text-sm leading-6 text-amber-950/90 dark:text-amber-100">
                          These settings now persist to the shared platform configuration. Authentication and
                          session enforcement should read from the same saved values when login policies are
                          applied.
                        </p>
                      </div>
                    </div>
                  </div>

                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <CardTitle className="text-base">
                            Session Configuration
                          </CardTitle>
                          <CardDescription>
                            Token expiry settings by role
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label>Super Admin Session (hours)</Label>
                        <Input
                          className="mt-1 w-32"
                          type="number"
                          min={1}
                          max={24}
                          value={settings.superAdminSessionHours}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              superAdminSessionHours:
                                parseInt(e.target.value) || 8,
                            })
                          }
                        />
                        <p className="mt-1 text-xs text-muted-foreground">
                          No auto-extension. Re-authentication required.
                        </p>
                      </div>
                      <div>
                        <Label>Admin/Manager Session (hours)</Label>
                        <Input
                          className="mt-1 w-32"
                          type="number"
                          min={1}
                          max={72}
                          value={settings.adminSessionHours}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              adminSessionHours:
                                parseInt(e.target.value) || 24,
                            })
                          }
                        />
                        <p className="mt-1 text-xs text-muted-foreground">
                          Extended on activity
                        </p>
                      </div>
                      <div>
                        <Label>Employee Session (days)</Label>
                        <Input
                          className="mt-1 w-32"
                          type="number"
                          min={1}
                          max={30}
                          value={settings.employeeSessionDays}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              employeeSessionDays:
                                parseInt(e.target.value) || 7,
                            })
                          }
                        />
                        <p className="mt-1 text-xs text-muted-foreground">
                          Extended on activity
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <CardTitle className="text-base">
                            Authentication Rules
                          </CardTitle>
                          <CardDescription>
                            Platform-wide security policies
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <p className="text-sm font-medium">
                            2FA Required for Super Admins
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Enforce two-factor authentication for platform administrators
                          </p>
                        </div>
                        <Switch
                          checked={settings.requireSuperAdmin2fa}
                          onCheckedChange={(value) =>
                            setSettings({ ...settings, requireSuperAdmin2fa: value })
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <p className="text-sm font-medium">
                            2FA Required for Company Admins
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Require 2FA for all company administrators
                          </p>
                        </div>
                        <Switch
                          checked={settings.requireAdmin2fa}
                          onCheckedChange={(value) =>
                            setSettings({ ...settings, requireAdmin2fa: value })
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <p className="text-sm font-medium">
                            Password Minimum Length
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Minimum 8 characters required
                          </p>
                        </div>
                        <span className="text-sm text-muted-foreground">8 chars</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Email & Notifications Tab */}
              {activeTab === "email" && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <Mail className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <CardTitle className="text-base">
                            Email Configuration
                          </CardTitle>
                          <CardDescription>
                            Outbound email settings
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <p className="text-sm font-medium">Provider</p>
                          <p className="text-xs text-muted-foreground">
                            {settings.emailProvider}
                          </p>
                        </div>
                        <span className="text-sm text-muted-foreground">Connected</span>
                      </div>
                      <div>
                        <Label>From Name</Label>
                        <Input
                          className="mt-1"
                          value={settings.fromName}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              fromName: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label>From Email</Label>
                        <Input
                          className="mt-1"
                          type="email"
                          value={settings.fromEmail}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              fromEmail: e.target.value,
                            })
                          }
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <Bell className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <CardTitle className="text-base">
                            Platform Notifications
                          </CardTitle>
                          <CardDescription>
                            Notifications sent to platform admins
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">
                            New Company Registered
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Alert when a new company signs up
                          </p>
                        </div>
                        <Switch
                          checked={settings.newCompanyNotification}
                          onCheckedChange={(checked) =>
                            setSettings({
                              ...settings,
                              newCompanyNotification: checked,
                            })
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">
                            Critical Incident Alerts
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Alert on critical incidents across all companies
                          </p>
                        </div>
                        <Switch
                          checked={settings.incidentAlertNotification}
                          onCheckedChange={(checked) =>
                            setSettings({
                              ...settings,
                              incidentAlertNotification: checked,
                            })
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Weekly Digest</p>
                          <p className="text-xs text-muted-foreground">
                            Summary of platform activity every Monday
                          </p>
                        </div>
                        <Switch
                          checked={settings.weeklyDigest}
                          onCheckedChange={(checked) =>
                            setSettings({
                              ...settings,
                              weeklyDigest: checked,
                            })
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">
                            Security Alerts
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Failed logins, suspicious activity
                          </p>
                        </div>
                        <Switch
                          checked={settings.securityAlerts}
                          onCheckedChange={(checked) =>
                            setSettings({
                              ...settings,
                              securityAlerts: checked,
                            })
                          }
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Billing & Plans Tab */}
              {activeTab === "billing" && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <CardTitle className="text-base">
                            Trial Configuration
                          </CardTitle>
                          <CardDescription>
                            Settings for new trial accounts
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label>Trial Duration (days)</Label>
                        <Input
                          className="mt-1 w-32"
                          type="number"
                          min={7}
                          max={90}
                          value={settings.trialDurationDays}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              trialDurationDays:
                                parseInt(e.target.value) || 14,
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label>Max Trial Seats</Label>
                        <Input
                          className="mt-1 w-32"
                          type="number"
                          min={1}
                          max={20}
                          value={settings.maxTrialSeats}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              maxTrialSeats: parseInt(e.target.value) || 5,
                            })
                          }
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Pricing Tiers</CardTitle>
                      <CardDescription>
                        Current subscription tiers available to companies
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {[
                          {
                            tier: "Starter",
                            seats: "1-10",
                            description: "Small teams, single location",
                          },
                          {
                            tier: "Professional",
                            seats: "11-50",
                            description: "Mid-size companies, multiple locations",
                          },
                          {
                            tier: "Enterprise",
                            seats: "51-200",
                            description: "Large organizations",
                          },
                          {
                            tier: "Custom",
                            seats: "200+",
                            description: "Enterprise with custom needs",
                          },
                        ].map((plan) => (
                          <div
                            key={plan.tier}
                            className="flex items-center justify-between rounded-lg border p-3"
                          >
                            <div>
                              <p className="text-sm font-medium">{plan.tier}</p>
                              <p className="text-xs text-muted-foreground">
                                {plan.description}
                              </p>
                            </div>
                            <span className="text-sm text-muted-foreground">{plan.seats} seats</span>
                          </div>
                        ))}
                      </div>
                      <p className="mt-3 text-xs text-muted-foreground">
                        Tier pricing and seats are configurable per company in
                        the company detail page.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Countries Tab */}
              {activeTab === "countries" && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <Languages className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <CardTitle className="text-base">
                            Supported Countries
                          </CardTitle>
                          <CardDescription>
                            Countries and languages available on the platform.
                            Risk evaluation forms are country-specific.
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {COUNTRY_OPTIONS.map((country) => {
                          const isEnabled =
                            settings.enabledCountries.includes(country.code);
                          return (
                            <div
                              key={country.code}
                              className="rounded-lg border p-4"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium">
                                    {country.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {COUNTRY_LANGUAGE_LABELS[country.code]} · {country.currency}
                                  </p>
                                </div>
                                <Switch
                                  checked={isEnabled}
                                  onCheckedChange={(checked) => {
                                    setSettings({
                                      ...settings,
                                      enabledCountries: checked
                                        ? [
                                            ...settings.enabledCountries,
                                            country.code,
                                          ]
                                        : settings.enabledCountries.filter(
                                            (c) => c !== country.code
                                          ),
                                    });
                                  }}
                                />
                              </div>
                              <div className="mt-2">
                                <span className="text-xs text-muted-foreground">
                                  {COUNTRY_FORM_SUMMARIES[country.code].join(", ")}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">
                        Default Currency
                      </CardTitle>
                      <CardDescription>
                        Fallback currency for new companies
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2">
                        {["USD", "EUR", "SEK", "GBP"].map((currency) => (
                          <Button
                            key={currency}
                            variant={
                              settings.defaultCurrency === currency
                                ? "default"
                                : "outline"
                            }
                            size="sm"
                            onClick={() =>
                              setSettings({
                                ...settings,
                                defaultCurrency: currency,
                              })
                            }
                          >
                            {currency}
                          </Button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
        </div>
      </div>
    </RoleGuard>
  );
}
