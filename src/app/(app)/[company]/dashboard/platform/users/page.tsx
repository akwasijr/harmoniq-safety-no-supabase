"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Search,
  Plus,
  UserCog,
  MoreHorizontal,
  Shield,
  X,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RoleGuard } from "@/components/auth/role-guard";
import { useToast } from "@/components/ui/toast";
import { mockUsers, DEFAULT_COMPANY_ID } from "@/mocks/data";
import type { User } from "@/types";
import { useTranslation } from "@/i18n";

// Only show users that are super_admins (platform-level users)
const getPlatformUsers = () =>
  mockUsers.filter((u) => u.role === "super_admin");

export default function PlatformUsersPage() {
  const params = useParams();
  const router = useRouter();
  const company = params.company as string;

  const [searchQuery, setSearchQuery] = React.useState("");
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [platformUsers, setPlatformUsers] = React.useState(getPlatformUsers);
  const [openMenuId, setOpenMenuId] = React.useState<string | null>(null);
  const { toast } = useToast();
  const { t, formatDate } = useTranslation();

  // New user form state
  const [formData, setFormData] = React.useState({
    first_name: "",
    last_name: "",
    email: "",
    job_title: "",
  });

  const filteredUsers = React.useMemo(() => {
    if (!searchQuery.trim()) return platformUsers;
    const query = searchQuery.toLowerCase();
    return platformUsers.filter(
      (u) =>
        u.full_name.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query)
    );
  }, [platformUsers, searchQuery]);

  const handleCloseModal = () => {
    setShowAddModal(false);
    setFormData({ first_name: "", last_name: "", email: "", job_title: "" });
  };

  const handleSubmit = async () => {
    if (!formData.first_name || !formData.last_name || !formData.email) return;
    setIsSubmitting(true);

    // Simulate API delay
    await new Promise((r) => setTimeout(r, 800));

    const newUser: User = {
      id: `user_sa_${Date.now()}`,
      company_id: DEFAULT_COMPANY_ID,
      email: formData.email,
      first_name: formData.first_name,
      middle_name: null,
      last_name: formData.last_name,
      full_name: `${formData.first_name} ${formData.last_name}`,
      role: "super_admin",
      user_type: "internal",
      account_type: "admin",
      gender: null,
      department: "Platform",
      job_title: formData.job_title || "Platform Administrator",
      employee_id: null,
      status: "active",
      language: "en",
      theme: "system",
      two_factor_enabled: false,
      last_login_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      team_ids: [],
      location_id: null,
    };

    setPlatformUsers((prev) => [...prev, newUser]);
    setIsSubmitting(false);
    handleCloseModal();
    toast(`Admin "${newUser.full_name}" created successfully`);
  };

  return (
    <RoleGuard requireSuperAdmin>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="heading-2">{t("users.title")}</h1>
          </div>
          <Button className="gap-2" onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4" />
            {t("users.buttons.addUser")}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Admins
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{platformUsers.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {platformUsers.filter((u) => u.status === "active").length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                2FA Enabled
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {platformUsers.filter((u) => u.two_factor_enabled).length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("users.placeholders.searchUsers")}
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Users Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      {t("users.labels.email")}
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      {t("users.labels.role")}
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      {t("users.labels.status")}
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      2FA
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Last Login
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() =>
                        router.push(
                          `/${company}/dashboard/platform/users/${user.id}`
                        )
                      }
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                            {user.first_name.charAt(0)}
                            {user.last_name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium">{user.full_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {user.job_title || "Platform Admin"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {user.email}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className="gap-1">
                          <Shield className="h-3 w-3" />
                          Super Admin
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            user.status === "active" ? "success" : "secondary"
                          }
                        >
                          {user.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            user.two_factor_enabled
                              ? "success"
                              : "destructive"
                          }
                        >
                          {user.two_factor_enabled ? "Enabled" : "Disabled"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {user.last_login_at
                          ? formatDate(user.last_login_at)
                          : "Never"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="relative">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(openMenuId === user.id ? null : user.id);
                            }}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                          {openMenuId === user.id && (
                            <div className="absolute right-0 top-full z-10 mt-1 w-40 rounded-md border bg-background shadow-lg">
                              <button
                                className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuId(null);
                                  router.push(`/${company}/dashboard/platform/users/${user.id}`);
                                }}
                              >
                                View Details
                              </button>
                              <button
                                className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuId(null);
                                  setPlatformUsers((prev) =>
                                    prev.map((u) =>
                                      u.id === user.id
                                        ? { ...u, status: u.status === "active" ? "inactive" : "active" }
                                        : u
                                    )
                                  );
                                  toast(
                                    user.status === "active"
                                      ? `${user.full_name} deactivated`
                                      : `${user.full_name} activated`,
                                    "info"
                                  );
                                }}
                              >
                                {user.status === "active" ? "Deactivate" : "Activate"}
                              </button>
                              <button
                                className="w-full px-3 py-2 text-left text-sm text-destructive hover:bg-muted transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuId(null);
                                  setPlatformUsers((prev) => prev.filter((u) => u.id !== user.id));
                                  toast(`${user.full_name} has been removed`, "info");
                                }}
                              >
                                {t("common.delete")}
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredUsers.length === 0 && (
              <div className="py-12 text-center text-muted-foreground">
                {searchQuery
                  ? `No platform users matching "${searchQuery}"`
                  : "No platform users found"}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Platform Admin Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-background shadow-lg">
            <div className="flex items-center justify-between border-b p-4">
              <div className="flex items-center gap-2">
                <UserCog className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold">{t("users.addUser")}</h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCloseModal}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-4 p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first_name">{t("users.labels.firstName")}</Label>
                  <Input
                    id="first_name"
                    className="mt-1"
                    placeholder="John"
                    value={formData.first_name}
                    onChange={(e) =>
                      setFormData({ ...formData, first_name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="last_name">{t("users.labels.lastName")}</Label>
                  <Input
                    id="last_name"
                    className="mt-1"
                    placeholder="Doe"
                    value={formData.last_name}
                    onChange={(e) =>
                      setFormData({ ...formData, last_name: e.target.value })
                    }
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="email">{t("users.labels.email")}</Label>
                <Input
                  id="email"
                  type="email"
                  className="mt-1"
                  placeholder="user@company.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  An invitation will be sent to this email
                </p>
              </div>
              <div>
                <Label htmlFor="job_title">Job Title</Label>
                <Input
                  id="job_title"
                  className="mt-1"
                  placeholder="Platform Administrator"
                  value={formData.job_title}
                  onChange={(e) =>
                    setFormData({ ...formData, job_title: e.target.value })
                  }
                />
              </div>
              <div className="rounded-lg border border-dashed bg-muted/30 p-3">
                <div className="flex items-center gap-2 text-sm">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Super Admin Role</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  This user will have full platform access including company
                  management, user management, and platform settings.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t p-4">
              <Button variant="outline" onClick={handleCloseModal}>
                {t("common.cancel")}
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={
                  isSubmitting ||
                  !formData.first_name ||
                  !formData.last_name ||
                  !formData.email
                }
              >
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create Admin
              </Button>
            </div>
          </div>
        </div>
      )}
    </RoleGuard>
  );
}
