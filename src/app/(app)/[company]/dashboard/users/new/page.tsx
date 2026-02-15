"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCompanyParam } from "@/hooks/use-company-param";
import { UserPlus, Loader2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocationsStore } from "@/stores/locations-store";
import { useTeamsStore } from "@/stores/teams-store";
import { useUsersStore } from "@/stores/users-store";
import { useCompanyStore } from "@/stores/company-store";
import { useToast } from "@/components/ui/toast";
import type { CompanyRole, UserType, AccountType, Gender, Language, User } from "@/types";
import { useTranslation } from "@/i18n";

const ROLES: { value: CompanyRole; label: string }[] = [
  { value: "company_admin", label: "Company Admin" },
  { value: "manager", label: "Manager" },
  { value: "employee", label: "Employee" },
];

const USER_TYPES: { value: UserType; label: string }[] = [
  { value: "internal", label: "Internal Employee" },
  { value: "external", label: "External" },
  { value: "contractor", label: "Contractor" },
  { value: "visitor", label: "Visitor" },
];

const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: "standard", label: "Standard" },
  { value: "admin", label: "Admin" },
  { value: "safety_officer", label: "Safety Officer" },
  { value: "viewer", label: "Viewer" },
];

const GENDERS: { value: Gender; label: string }[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

const LANGUAGES: { value: Language; label: string }[] = [
  { value: "en", label: "English" },
  { value: "nl", label: "Dutch" },
  { value: "sv", label: "Swedish" },
];

export default function NewUserPage() {
  const router = useRouter();
  const company = useCompanyParam();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { toast } = useToast();
  const { items: companies } = useCompanyStore();
  const currentCompany = companies.find((c) => c.slug === company) || companies[0];
  const { items: locations } = useLocationsStore();
  const { items: teams } = useTeamsStore();
  const { add: addUser } = useUsersStore();
  const { t, formatDate, formatNumber } = useTranslation();

  // Form state matching User interface
  const [formData, setFormData] = React.useState({
    email: "",
    first_name: "",
    middle_name: "",
    last_name: "",
    role: "employee" as CompanyRole,
    user_type: "internal" as UserType,
    account_type: "standard" as AccountType,
    gender: "" as Gender | "",
    department: "",
    job_title: "",
    employee_id: "",
    location_id: "",
    team_ids: [] as string[],
    language: "en" as Language,
  });

  React.useEffect(() => {
    if (!currentCompany) return;
    setFormData((prev) => ({ ...prev, language: currentCompany.language as Language }));
  }, [currentCompany?.id]);

  const handleSubmit = async () => {
    setIsSubmitting(true);

    const now = new Date().toISOString();
    const newUser: User = {
      id: `user_${Date.now()}`,
      company_id: currentCompany?.id || "",
      email: formData.email,
      first_name: formData.first_name,
      middle_name: formData.middle_name || null,
      last_name: formData.last_name,
      full_name: [formData.first_name, formData.middle_name, formData.last_name]
        .filter(Boolean)
        .join(" "),
      role: formData.role,
      user_type: formData.user_type,
      account_type: formData.account_type,
      gender: formData.gender || null,
      department: formData.department || null,
      job_title: formData.job_title || null,
      employee_id: formData.employee_id || null,
      status: "active",
      location_id: formData.location_id || null,
      language: formData.language,
      theme: "system",
      two_factor_enabled: false,
      last_login_at: null,
      created_at: now,
      updated_at: now,
      team_ids: formData.team_ids,
    };
    addUser(newUser);
    toast("User created successfully");

    router.push(`/${company}/dashboard/users`);
  };

  const isValid = formData.email.trim() && formData.first_name.trim() && formData.last_name.trim();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="heading-2">{t("users.addUser")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("users.createInviteDesc")}
          </p>
        </div>
        <Link href={`/${company}/dashboard/users`}>
          <Button variant="outline">{t("users.backToUsers")}</Button>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column - Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>{t("users.personalInformation")}</CardTitle>
            <CardDescription>{t("users.basicDetails")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="first_name">{t("users.labels.firstName")} *</Label>
                <Input
                  id="first_name"
                  placeholder="Jane"
                  value={formData.first_name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, first_name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="middle_name">{t("users.middleName")}</Label>
                <Input
                  id="middle_name"
                  placeholder="M."
                  value={formData.middle_name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, middle_name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">{t("users.labels.lastName")} *</Label>
                <Input
                  id="last_name"
                  placeholder="Doe"
                  value={formData.last_name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, last_name: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t("users.labels.email")} *</Label>
              <Input
                id="email"
                type="email"
                placeholder="jane.doe@company.com"
                value={formData.email}
                onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("users.gender")}</Label>
                <Select
                  value={formData.gender}
                  onValueChange={(v) => setFormData((prev) => ({ ...prev, gender: v as Gender }))}
                >
                  <SelectTrigger><SelectValue placeholder={t("users.selectGender")} /></SelectTrigger>
                  <SelectContent>
                    {GENDERS.map((g) => (
                      <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("users.preferredLanguage")}</Label>
                <Select
                  value={formData.language}
                  onValueChange={(v) => setFormData((prev) => ({ ...prev, language: v as Language }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((l) => (
                      <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right Column - Work Details */}
        <Card>
          <CardHeader>
            <CardTitle>{t("users.workDetails")}</CardTitle>
            <CardDescription>{t("users.roleDeptLocation")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("users.labels.role")} *</Label>
                <Select
                  value={formData.role}
                  onValueChange={(v) => setFormData((prev) => ({ ...prev, role: v as CompanyRole }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("users.userType")}</Label>
                <Select
                  value={formData.user_type}
                  onValueChange={(v) => setFormData((prev) => ({ ...prev, user_type: v as UserType }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {USER_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t("users.accountType")}</Label>
              <Select
                value={formData.account_type}
                onValueChange={(v) => setFormData((prev) => ({ ...prev, account_type: v as AccountType }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPES.map((a) => (
                    <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="department">{t("users.labels.department")}</Label>
                <Input
                  id="department"
                  placeholder="Operations"
                  value={formData.department}
                  onChange={(e) => setFormData((prev) => ({ ...prev, department: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="job_title">{t("users.jobTitle")}</Label>
                <Input
                  id="job_title"
                  placeholder="Safety Officer"
                  value={formData.job_title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, job_title: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="employee_id">{t("users.labels.employeeId")}</Label>
              <Input
                id="employee_id"
                placeholder="EMP-001"
                value={formData.employee_id}
                onChange={(e) => setFormData((prev) => ({ ...prev, employee_id: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>{t("users.assignedLocation")}</Label>
              <Select
                value={formData.location_id}
                onValueChange={(v) => setFormData((prev) => ({ ...prev, location_id: v }))}
              >
                <SelectTrigger><SelectValue placeholder={t("users.selectLocation")} /></SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("users.teamAssignment")}</Label>
              <Select
                value={formData.team_ids[0] || ""}
                onValueChange={(v) => setFormData((prev) => ({ ...prev, team_ids: v ? [v] : [] }))}
              >
                <SelectTrigger><SelectValue placeholder={t("users.selectTeam")} /></SelectTrigger>
                <SelectContent>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{t("users.additionalTeamsLater")}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Link href={`/${company}/dashboard/users`}>
          <Button variant="outline" className="w-full sm:w-auto">{t("common.cancel")}</Button>
        </Link>
        <Button
          className="gap-2"
          disabled={!isValid || isSubmitting}
          onClick={handleSubmit}
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <UserPlus className="h-4 w-4" />
          )}
          {isSubmitting ? t("users.creating") : t("users.createAndSendInvite")}
        </Button>
      </div>
    </div>
  );
}
