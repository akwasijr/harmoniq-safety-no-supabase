"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import type { Company } from "@/types";

import { SettingsToggle } from "./settings-toggle";
import type {
  SettingsCopyProps,
  SettingsState,
  UpdateSettingProps,
} from "./settings-types";

interface NotificationsSettingsSectionProps
  extends SettingsCopyProps, UpdateSettingProps {
  settings: SettingsState;
}

export function NotificationsSettingsSection({
  settings,
  t,
  updateSetting,
}: NotificationsSettingsSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("settings.notifications")}</CardTitle>
        <CardDescription>
          {t("settings.configureNotifications")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        <div className="divide-y">
          <div className="flex items-center justify-between py-4">
            <div>
              <p className="font-medium">{t("settings.criticalAlerts")}</p>
              <p className="text-sm text-muted-foreground">
                {t("settings.criticalAlertsDesc")}
              </p>
            </div>
            <SettingsToggle
              checked={settings.notifCriticalAlerts}
              onChange={(value) => updateSetting("notifCriticalAlerts", value)}
              label="Critical incident alerts"
            />
          </div>
          <div className="flex items-center justify-between py-4">
            <div>
              <p className="font-medium">{t("settings.newIncidentReports")}</p>
              <p className="text-sm text-muted-foreground">
                {t("settings.newIncidentReportsDesc")}
              </p>
            </div>
            <SettingsToggle
              checked={settings.notifNewIncidents}
              onChange={(value) => updateSetting("notifNewIncidents", value)}
              label="New incident reports"
            />
          </div>
          <div className="flex items-center justify-between py-4">
            <div>
              <p className="font-medium">{t("settings.dailyDigest")}</p>
              <p className="text-sm text-muted-foreground">
                {t("settings.dailyDigestDesc")}
              </p>
            </div>
            <SettingsToggle
              checked={settings.notifDailyDigest}
              onChange={(value) => updateSetting("notifDailyDigest", value)}
              label="Daily digest"
            />
          </div>
          <div className="flex items-center justify-between py-4">
            <div>
              <p className="font-medium">{t("settings.checklistReminders")}</p>
              <p className="text-sm text-muted-foreground">
                {t("settings.checklistRemindersDesc")}
              </p>
            </div>
            <SettingsToggle
              checked={settings.notifChecklistReminders}
              onChange={(value) =>
                updateSetting("notifChecklistReminders", value)
              }
              label="Checklist reminders"
            />
          </div>
          <div className="flex items-center justify-between py-4">
            <div>
              <p className="font-medium">{t("settings.maintenanceAlerts")}</p>
              <p className="text-sm text-muted-foreground">
                {t("settings.maintenanceAlertsDesc")}
              </p>
            </div>
            <SettingsToggle
              checked={settings.notifMaintenanceAlerts}
              onChange={(value) =>
                updateSetting("notifMaintenanceAlerts", value)
              }
              label="Maintenance alerts"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface SecuritySettingsSectionProps
  extends SettingsCopyProps, UpdateSettingProps {
  settings: SettingsState;
}

export function SecuritySettingsSection({
  settings,
  t,
  updateSetting,
}: SecuritySettingsSectionProps) {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t("settings.authentication")}</CardTitle>
          <CardDescription>{t("settings.configureAuth")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          <div className="divide-y">
            <div className="flex items-center justify-between py-4">
              <div>
                <p className="font-medium">{t("settings.twoFactor")}</p>
                <p className="text-sm text-muted-foreground">
                  {t("settings.twoFactorDesc")}
                </p>
              </div>
              <SettingsToggle
                checked={settings.twoFactorEnabled}
                onChange={(value) => updateSetting("twoFactorEnabled", value)}
                label="Two-factor authentication"
              />
            </div>
            <div className="flex items-center justify-between py-4">
              <div>
                <p className="font-medium">{t("settings.sso")}</p>
                <p className="text-sm text-muted-foreground">
                  {t("settings.ssoDesc")}
                </p>
              </div>
              <SettingsToggle
                checked={settings.ssoEnabled}
                onChange={(value) => updateSetting("ssoEnabled", value)}
                label="Single Sign-On"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.sessionAndPassword")}</CardTitle>
          <CardDescription>{t("settings.sessionPasswordDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="session-timeout">
                {t("settings.sessionTimeout")}
              </Label>
              <select
                id="session-timeout"
                title="Select session timeout"
                aria-label="Select session timeout"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={settings.sessionTimeout}
                onChange={(event) =>
                  updateSetting("sessionTimeout", event.target.value)
                }
              >
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="60">1 hour</option>
                <option value="120">2 hours</option>
                <option value="480">8 hours</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password-policy">
                {t("settings.passwordPolicy")}
              </Label>
              <select
                id="password-policy"
                title="Select password policy"
                aria-label="Select password policy"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={settings.passwordPolicy}
                onChange={(event) =>
                  updateSetting("passwordPolicy", event.target.value)
                }
              >
                <option value="basic">Basic (8+ characters)</option>
                <option value="standard">Standard (8+ with number)</option>
                <option value="strong">Strong (12+ with special chars)</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

interface BillingSettingsSectionProps extends SettingsCopyProps {
  activeCompany: Company;
}

const INVOICES = [
  { date: "Feb 1, 2026", amount: "$299.00", status: "Paid" },
  { date: "Jan 1, 2026", amount: "$299.00", status: "Paid" },
  { date: "Dec 1, 2025", amount: "$299.00", status: "Paid" },
];

export function BillingSettingsSection({
  activeCompany,
  t,
}: BillingSettingsSectionProps) {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t("settings.currentPlan")}</CardTitle>
          <CardDescription>{t("settings.subscriptionDetails")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-lg font-semibold capitalize">
                    {activeCompany.tier} Plan
                  </p>
                  <Badge variant="default">{t("settings.active")}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {activeCompany.seat_limit} seats •{" "}
                  {activeCompany.tier === "professional"
                    ? "$299"
                    : activeCompany.tier === "enterprise"
                      ? "$999"
                      : "$99"}
                  /month
                </p>
              </div>
              <Button variant="outline">{t("settings.changePlan")}</Button>
            </div>
          </div>

          <div className="space-y-3">
            <p className="font-medium">{t("settings.usage")}</p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{t("settings.activeUsers")}</span>
                <span>32 / {activeCompany.seat_limit}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{
                    width: `${Math.min((32 / activeCompany.seat_limit) * 100, 100)}%`,
                  }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{t("settings.storageUsed")}</span>
                <span>2.4 GB / 10 GB</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full w-[24%] rounded-full bg-primary" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.paymentMethod")}</CardTitle>
          <CardDescription>{t("settings.managePayment")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-14 items-center justify-center rounded bg-muted font-mono text-xs">
                VISA
              </div>
              <div>
                <p className="font-medium">•••• •••• •••• 4242</p>
                <p className="text-sm text-muted-foreground">Expires 12/2027</p>
              </div>
            </div>
            <Button variant="outline" size="sm">
              {t("settings.update")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.billingHistory")}</CardTitle>
          <CardDescription>{t("settings.viewInvoices")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {INVOICES.map((invoice, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-3"
              >
                <div>
                  <p className="font-medium">{invoice.date}</p>
                  <p className="text-sm text-muted-foreground">
                    Professional Plan
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-medium">{invoice.amount}</span>
                  <Badge variant="success" className="text-xs">
                    {invoice.status}
                  </Badge>
                  <Button variant="ghost" size="sm">
                    Download
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
