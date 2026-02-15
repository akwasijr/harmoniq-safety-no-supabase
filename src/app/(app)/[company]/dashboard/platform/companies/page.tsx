"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Plus,
  Search,
  Users,
  AlertTriangle,
  X,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RoleGuard } from "@/components/auth/role-guard";
import { useToast } from "@/components/ui/toast";
import { useCompanyStore } from "@/stores/company-store";
import { useUsersStore } from "@/stores/users-store";
import { useIncidentsStore } from "@/stores/incidents-store";
import { cn } from "@/lib/utils";
import { LOCALE_CONFIGS, SUPPORTED_LOCALES } from "@/i18n";
import type { SupportedLocale } from "@/i18n";
import type { Company, Country, Language, SubscriptionTier, Currency, UIStyle } from "@/types";
import { useTranslation } from "@/i18n";

const SUPPORTED_COUNTRIES = [
  { code: "US", name: "United States", currency: "USD", defaultLocale: "en" as SupportedLocale },
  { code: "NL", name: "Netherlands", currency: "EUR", defaultLocale: "nl" as SupportedLocale },
  { code: "SE", name: "Sweden", currency: "SEK", defaultLocale: "sv" as SupportedLocale },
];

const PRICING_TIERS = [
  { value: "trial", label: "Trial", seats: 5, description: "60-day free trial" },
  { value: "starter", label: "Starter", seats: 10, description: "1-10 seats" },
  { value: "professional", label: "Professional", seats: 50, description: "11-50 seats" },
  { value: "enterprise", label: "Enterprise", seats: 200, description: "51-200 seats" },
  { value: "custom", label: "Custom", seats: 999, description: "200+ seats" },
];

export default function PlatformCompaniesPage() {
  const params = useParams();
  const router = useRouter();
  const company = params.company as string;
  const { t } = useTranslation();
  
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const { items: companies, add: addCompany } = useCompanyStore();
  const { items: users, add: addUser } = useUsersStore();
  const { items: incidents } = useIncidentsStore();
  const { toast } = useToast();

  // Form state for Add Company modal
  const [newCompanyName, setNewCompanyName] = React.useState("");
  const [newCompanyCountry, setNewCompanyCountry] = React.useState(SUPPORTED_COUNTRIES[0].code);
  const [newCompanyTier, setNewCompanyTier] = React.useState(PRICING_TIERS[0].value);
  const [newCompanyEmail, setNewCompanyEmail] = React.useState("");
  const [newAppName, setNewAppName] = React.useState("");
  const [newLanguage, setNewLanguage] = React.useState<SupportedLocale>("en");
  const [newPrimaryColor, setNewPrimaryColor] = React.useState("#2563eb");
  const [newSecondaryColor, setNewSecondaryColor] = React.useState("#1e40af");
  const [newUiStyle, setNewUiStyle] = React.useState<UIStyle>("rounded");
  const [formStep, setFormStep] = React.useState<"general" | "localization" | "branding">("general");

  // Auto-set language + currency when country changes
  React.useEffect(() => {
    const country = SUPPORTED_COUNTRIES.find((c) => c.code === newCompanyCountry);
    if (country) {
      setNewLanguage(country.defaultLocale);
    }
  }, [newCompanyCountry]);

  const filteredCompanies = React.useMemo(() => {
    if (!searchQuery.trim()) return companies;
    const query = searchQuery.toLowerCase();
    return companies.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.country.toLowerCase().includes(query)
    );
  }, [companies, searchQuery]);

  // Stats per company
  const getCompanyStats = (companyId: string) => {
    const companyUsers = users.filter((u) => u.company_id === companyId);
    const companyIncidents = incidents.filter((i) => i.company_id === companyId);
    const openIncidents = companyIncidents.filter(
      (i) => i.status === "new" || i.status === "in_progress"
    );
    return { userCount: companyUsers.length, incidentCount: openIncidents.length };
  };

  return (
    <RoleGuard requireSuperAdmin>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="heading-2">{t("companies.allCompanies")}</h1>
          </div>
          <Button className="gap-2" onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4" />
            {t("companies.addCompany")}
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("companies.searchCompanies")}
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Companies Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredCompanies.map((comp) => {
            const stats = getCompanyStats(comp.id);
            return (
              <Card
                key={comp.id}
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => router.push(`/${company}/dashboard/platform/companies/${comp.id}`)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-lg text-white font-medium"
                        style={{ backgroundColor: comp.primary_color }}
                      >
                        {comp.name.charAt(0)}
                      </div>
                      <div>
                        <CardTitle className="text-base">{comp.name}</CardTitle>
                        <p className="text-xs text-muted-foreground">{comp.country}</p>
                      </div>
                    </div>
                    <Badge
                      variant={
                        comp.status === "active"
                          ? "success"
                          : comp.status === "trial"
                          ? "secondary"
                          : "destructive"
                      }
                    >
                      {comp.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {stats.userCount} {t("companies.users")}
                    </div>
                    {stats.incidentCount > 0 && (
                      <div className="flex items-center gap-1 text-orange-600">
                        <AlertTriangle className="h-4 w-4" />
                        {stats.incidentCount} {t("companies.open")}
                      </div>
                    )}
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {comp.tier} · {comp.seat_limit} {t("companies.seats")}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredCompanies.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            {t("companies.noCompaniesFound", { query: searchQuery })}
          </div>
        )}
      </div>

      {/* Add Company Modal — multi-step */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-lg bg-background shadow-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b p-4">
              <div>
                <h2 className="text-lg font-semibold">{t("companies.addCompany")}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formStep === "general" ? `Step 1 of 3 — ${t("companies.general")}` : formStep === "localization" ? `Step 2 of 3 — ${t("companies.localization")}` : `Step 3 of 3 — ${t("companies.branding")}`}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => { setShowAddModal(false); setFormStep("general"); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Step tabs */}
            <div className="flex border-b">
              {(["general", "localization", "branding"] as const).map((step, i) => (
                <button
                  key={step}
                  onClick={() => setFormStep(step)}
                  className={cn(
                    "flex-1 py-2.5 text-xs font-medium capitalize transition-colors border-b-2",
                    formStep === step
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  {i + 1}. {step === "general" ? t("companies.general") : step === "localization" ? t("companies.localization") : t("companies.branding")}
                </button>
              ))}
            </div>

            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              {/* Step 1: General */}
              {formStep === "general" && (
                <>
                  <div>
                    <Label>{t("companies.companyName")} <span className="text-destructive">*</span></Label>
                    <Input placeholder={t("companies.companyNamePlaceholder")} className="mt-1" value={newCompanyName} onChange={(e) => setNewCompanyName(e.target.value)} />
                  </div>
                  <div>
                    <Label>{t("companies.country")} <span className="text-destructive">*</span></Label>
                    <select title="Country" className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" value={newCompanyCountry} onChange={(e) => setNewCompanyCountry(e.target.value)}>
                      {SUPPORTED_COUNTRIES.map((c) => (
                        <option key={c.code} value={c.code}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>{t("companies.plan")}</Label>
                    <select title="Plan" className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" value={newCompanyTier} onChange={(e) => setNewCompanyTier(e.target.value)}>
                      {PRICING_TIERS.map((tier) => (
                        <option key={tier.value} value={tier.value}>{tier.label} — {tier.description}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>{t("companies.adminEmail")}</Label>
                    <Input type="email" placeholder={t("companies.adminEmailPlaceholder")} className="mt-1" value={newCompanyEmail} onChange={(e) => setNewCompanyEmail(e.target.value)} />
                    <p className="text-xs text-muted-foreground mt-1">An admin account will be created with this email.</p>
                  </div>
                </>
              )}

              {/* Step 2: Localization */}
              {formStep === "localization" && (
                <>
                  <div>
                    <Label>{t("companies.defaultLanguage")}</Label>
                    <select
                      title="Default Language"
                      className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                      value={newLanguage}
                      onChange={(e) => setNewLanguage(e.target.value as SupportedLocale)}
                    >
                      {SUPPORTED_LOCALES.map((loc) => (
                        <option key={loc.code} value={loc.code}>
                          {loc.flag} {loc.name} ({loc.englishName})
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Auto-set from country. This will be the default UI language for all new users. Employees can override from their profile.
                    </p>
                  </div>
                  <div className="rounded-lg border p-3 bg-muted/30 space-y-2">
                    <p className="text-xs font-medium">Auto-configured from country:</p>
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <div>Currency: <span className="font-medium text-foreground">{SUPPORTED_COUNTRIES.find((c) => c.code === newCompanyCountry)?.currency || "USD"}</span></div>
                      <div>Date format: <span className="font-medium text-foreground">{LOCALE_CONFIGS[newLanguage]?.dateLocale || "en-US"}</span></div>
                      <div>Number format: <span className="font-medium text-foreground">{new Intl.NumberFormat(LOCALE_CONFIGS[newLanguage]?.numberLocale || "en-US").format(1234.56)}</span></div>
                      <div>Direction: <span className="font-medium text-foreground">LTR</span></div>
                    </div>
                  </div>
                  <div>
                    <Label>{t("companies.appName")}</Label>
                    <Input
                      placeholder={newCompanyName || t("companies.appNamePlaceholder")}
                      className="mt-1"
                      value={newAppName}
                      onChange={(e) => setNewAppName(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      The name employees see in the app header. Leave empty to use the company name.
                    </p>
                  </div>
                </>
              )}

              {/* Step 3: Branding */}
              {formStep === "branding" && (
                <>
                  <div>
                    <Label>{t("companies.primaryColor")}</Label>
                    <div className="flex items-center gap-3 mt-1">
                      <input
                        type="color"
                        title="Primary Color"
                        value={newPrimaryColor}
                        onChange={(e) => setNewPrimaryColor(e.target.value)}
                        className="h-10 w-14 rounded border cursor-pointer"
                      />
                      <Input
                        value={newPrimaryColor}
                        onChange={(e) => setNewPrimaryColor(e.target.value)}
                        className="font-mono text-sm flex-1"
                        placeholder="#2563eb"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>{t("companies.secondaryColor")}</Label>
                    <div className="flex items-center gap-3 mt-1">
                      <input
                        type="color"
                        title="Secondary Color"
                        value={newSecondaryColor}
                        onChange={(e) => setNewSecondaryColor(e.target.value)}
                        className="h-10 w-14 rounded border cursor-pointer"
                      />
                      <Input
                        value={newSecondaryColor}
                        onChange={(e) => setNewSecondaryColor(e.target.value)}
                        className="font-mono text-sm flex-1"
                        placeholder="#1e40af"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>{t("companies.uiStyle")}</Label>
                    <div className="flex gap-3 mt-1">
                      {(["rounded", "square"] as const).map((style) => (
                        <button
                          key={style}
                          onClick={() => setNewUiStyle(style)}
                          className={cn(
                            "flex-1 p-3 border text-sm font-medium capitalize transition-colors",
                            style === "rounded" ? "rounded-xl" : "rounded-none",
                            newUiStyle === style
                              ? "border-primary bg-primary/5 text-primary"
                              : "border-muted hover:border-foreground/20"
                          )}
                        >
                          {style === "rounded" ? t("companies.rounded") : t("companies.square")}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label>Logo</Label>
                    <div className="mt-1 flex items-center justify-center h-24 rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20 cursor-pointer hover:border-muted-foreground/50 transition-colors">
                      <div className="text-center">
                        <Upload className="h-6 w-6 text-muted-foreground mx-auto" />
                        <p className="text-xs text-muted-foreground mt-1">Upload logo (coming soon)</p>
                      </div>
                    </div>
                  </div>
                  {/* Live preview */}
                  <div className="rounded-lg border p-3">
                    <p className="text-xs font-medium mb-2">Preview</p>
                    <div className="flex items-center gap-3">
                      <div
                        className={cn("flex h-10 w-10 items-center justify-center text-white font-semibold text-sm", newUiStyle === "rounded" ? "rounded-lg" : "rounded-none")}
                        style={{ backgroundColor: newPrimaryColor }}
                      >
                        {(newAppName || newCompanyName || "A").charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-sm" style={{ color: newPrimaryColor }}>{newAppName || newCompanyName || "Company Name"}</p>
                        <p className="text-xs text-muted-foreground">{LOCALE_CONFIGS[newLanguage]?.flag} {LOCALE_CONFIGS[newLanguage]?.name} · {SUPPORTED_COUNTRIES.find((c) => c.code === newCompanyCountry)?.currency}</p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-between gap-2 border-t p-4">
              <div>
                {formStep !== "general" && (
                  <Button variant="outline" onClick={() => setFormStep(formStep === "branding" ? "localization" : "general")}>
                    Back
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setShowAddModal(false); setFormStep("general"); }}>{t("common.cancel")}</Button>
                {formStep !== "branding" ? (
                  <Button onClick={() => setFormStep(formStep === "general" ? "localization" : "branding")}>
                    Next
                  </Button>
                ) : (
                  <Button onClick={() => {
                    if (!newCompanyName.trim()) {
                      toast(t("companies.enterCompanyName"), "error");
                      setFormStep("general");
                      return;
                    }
                    const selectedCountry = SUPPORTED_COUNTRIES.find((c) => c.code === newCompanyCountry)!;
                    const selectedTier = PRICING_TIERS.find((tier) => tier.value === newCompanyTier)!;
                    const newCompany: Company = {
                      id: `company-${Date.now()}`,
                      name: newCompanyName.trim(),
                      slug: newCompanyName.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
                      app_name: newAppName.trim() || null,
                      country: selectedCountry.code as Country,
                      language: newLanguage as Language,
                      currency: selectedCountry.currency as Currency,
                      tier: selectedTier.value as SubscriptionTier,
                      seat_limit: selectedTier.seats,
                      status: "trial",
                      primary_color: newPrimaryColor,
                      secondary_color: newSecondaryColor,
                      font_family: "Inter",
                      ui_style: newUiStyle,
                      logo_url: null,
                      hero_image_url: null,
                      trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
                      created_at: new Date().toISOString(),
                      updated_at: new Date().toISOString(),
                    };
                    addCompany(newCompany);
                    // Create admin user for the new company if email provided
                    if (newCompanyEmail.trim()) {
                      addUser({
                        id: `user_${Date.now()}`,
                        company_id: newCompany.id,
                        email: newCompanyEmail.trim(),
                        first_name: "Admin",
                        middle_name: null,
                        last_name: newCompanyName.trim(),
                        full_name: `Admin ${newCompanyName.trim()}`,
                        role: "company_admin",
                        user_type: "internal",
                        account_type: "admin",
                        gender: null,
                        department: null,
                        job_title: "Administrator",
                        employee_id: newCompanyEmail.trim().split("@")[0],
                        status: "active",
                        location_id: null,
                        language: newLanguage as Language,
                        theme: "system",
                        two_factor_enabled: false,
                        last_login_at: null,
                        team_ids: [],
                        custom_permissions: [],
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                      });
                    }
                    setShowAddModal(false);
                    setFormStep("general");
                    setNewCompanyName("");
                    setNewCompanyEmail("");
                    setNewAppName("");
                    setNewCompanyCountry(SUPPORTED_COUNTRIES[0].code);
                    setNewCompanyTier(PRICING_TIERS[0].value);
                    setNewLanguage("en");
                    setNewPrimaryColor("#2563eb");
                    setNewSecondaryColor("#1e40af");
                    setNewUiStyle("rounded");
                    toast(t("companies.companyCreated", { name: newCompany.name }));
                  }}>{t("companies.createCompany")}</Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </RoleGuard>
  );
}
