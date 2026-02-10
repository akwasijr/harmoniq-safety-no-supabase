"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Trash2,
  User,
  Mail,
  Shield,
  Calendar,
  Clock,
  Edit,
  Key,
  Info,
  Activity,
  Settings,
  Building,
  Briefcase,
  BadgeCheck,
  Check,
  X as XIcon,
  MapPin,
  Monitor,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DetailTabs, Tab } from "@/components/ui/detail-tabs";
import { useUsersStore } from "@/stores/users-store";
import { useLocationsStore } from "@/stores/locations-store";
import { useToast } from "@/components/ui/toast";
import { ROLE_PERMISSIONS, type Permission } from "@/types";
import { useTranslation } from "@/i18n";

const tabs: Tab[] = [
  { id: "info", label: "Information", icon: Info },
  { id: "activity", label: "Activity", icon: Activity },
  { id: "permissions", label: "Permissions", icon: Shield },
  { id: "settings", label: "Settings", icon: Settings, variant: "danger" },
];

export default function UserDetailPage() {
  const router = useRouter();
  const routeParams = useParams();
  const company = routeParams.company as string;
  const userId = routeParams.userId as string;
  const [isEditing, setIsEditing] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("info");
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const { t, formatDate, formatNumber } = useTranslation();

  const { toast } = useToast();
  const { items: users, update: updateUser, remove: removeUser } = useUsersStore();
  const { items: locations } = useLocationsStore();
  const baseUser = users.find((u) => u.id === userId);
  
  // Get user's assigned location
  const userLocation = baseUser?.location_id 
    ? locations.find(l => l.id === baseUser.location_id)
    : null;
  
  // Editable user state
  const [editedUser, setEditedUser] = React.useState({
    first_name: baseUser?.first_name || "",
    last_name: baseUser?.last_name || "",
    email: baseUser?.email || "",
    department: baseUser?.department || "",
    job_title: baseUser?.job_title || "",
    phone: "",
    location_id: baseUser?.location_id || "",
  });
  
  // Update edited user when base user changes
  React.useEffect(() => {
    if (!baseUser) return;
    setEditedUser({
      first_name: baseUser.first_name,
      last_name: baseUser.last_name,
      email: baseUser.email,
      department: baseUser.department || "",
      job_title: baseUser.job_title || "",
      phone: "",
      location_id: baseUser.location_id || "",
    });
  }, [baseUser]);
  
  if (!baseUser) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">{t("users.userNotFound")}</p>
      </div>
    );
  }

  // Use edited values when editing, otherwise use base user
  const user = isEditing ? { ...baseUser, ...editedUser } : baseUser;
  
  const handleSave = () => {
    if (!baseUser) return;
    updateUser(baseUser.id, {
      first_name: editedUser.first_name,
      last_name: editedUser.last_name,
      email: editedUser.email,
      department: editedUser.department || null,
      job_title: editedUser.job_title || null,
      location_id: editedUser.location_id || null,
      full_name: `${editedUser.first_name} ${editedUser.last_name}`,
      updated_at: new Date().toISOString(),
    });
    toast("User updated successfully");
    setIsEditing(false);
  };
  
  const handleDelete = () => {
    if (!baseUser) return;
    removeUser(baseUser.id);
    toast("User deleted", "info");
    setShowDeleteConfirm(false);
    router.push(`/${company}/dashboard/users`);
  };
  
  const handleDeactivate = () => {
    if (!baseUser) return;
    updateUser(baseUser.id, {
      status: baseUser.status === "active" ? "inactive" : "active",
      updated_at: new Date().toISOString(),
    });
    toast(
      baseUser.status === "active" ? "User deactivated" : "User activated",
      "info"
    );
  };

  const recentActivity = [
    { id: "a1", action: "Submitted incident report", date: "2024-01-28 14:30" },
    { id: "a2", action: "Completed safety checklist", date: "2024-01-28 09:15" },
    { id: "a3", action: "Updated profile", date: "2024-01-27 16:45" },
    { id: "a4", action: "Viewed training document", date: "2024-01-27 10:00" },
    { id: "a5", action: "Logged in", date: "2024-01-27 09:00" },
  ];

  // Get permissions from role
  const rolePermissions = ROLE_PERMISSIONS[baseUser.role] || [];
  const customPermissions = baseUser.custom_permissions || [];
  
  // Permission categories for display
  const permissionCategories = [
    {
      name: "Incidents",
      permissions: [
        { id: "incidents.view_own", label: "View own incidents" },
        { id: "incidents.view_team", label: "View team incidents" },
        { id: "incidents.view_all", label: "View all incidents" },
        { id: "incidents.create", label: "Create incidents" },
        { id: "incidents.edit_own", label: "Edit own incidents" },
        { id: "incidents.edit_all", label: "Edit all incidents" },
        { id: "incidents.delete", label: "Delete incidents" },
        { id: "incidents.assign", label: "Assign investigations" },
      ] as { id: Permission; label: string }[],
    },
    {
      name: "Checklists & Assessments",
      permissions: [
        { id: "checklists.view", label: "View checklists" },
        { id: "checklists.complete", label: "Complete checklists" },
        { id: "checklists.create_templates", label: "Create templates" },
        { id: "checklists.manage", label: "Manage checklists" },
      ] as { id: Permission; label: string }[],
    },
    {
      name: "Reports & Analytics",
      permissions: [
        { id: "reports.view_own", label: "View own reports" },
        { id: "reports.view_team", label: "View team reports" },
        { id: "reports.view_all", label: "View all reports" },
        { id: "reports.export", label: "Export data" },
      ] as { id: Permission; label: string }[],
    },
    {
      name: "User Management",
      permissions: [
        { id: "users.view", label: "View users" },
        { id: "users.create", label: "Create users" },
        { id: "users.edit", label: "Edit users" },
        { id: "users.delete", label: "Delete users" },
        { id: "users.manage_roles", label: "Manage roles" },
      ] as { id: Permission; label: string }[],
    },
    {
      name: "Settings",
      permissions: [
        { id: "settings.view", label: "View settings" },
        { id: "settings.edit", label: "Edit settings" },
        { id: "settings.billing", label: "Manage billing" },
      ] as { id: Permission; label: string }[],
    },
  ];
  
  const hasPermission = (permId: Permission) => {
    return rolePermissions.includes(permId) || customPermissions.includes(permId);
  };

  if (!baseUser || !user) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">{t("users.userNotFound")}</p>
      </div>
    );
  }

  const roleColor = user.role === "company_admin" ? "destructive" : user.role === "manager" ? "warning" : "secondary";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push(`/${company}/dashboard/users`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground">
            {user.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold">{user.full_name}</h1>
              <span className="text-sm text-muted-foreground capitalize">{user.role.replace("_", " ")}</span>
              <span className="text-sm text-muted-foreground">{user.status}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{user.email} • {user.department || t("users.noDepartment")}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)}>{t("common.cancel")}</Button>
              <Button className="gap-2" onClick={handleSave}><Save className="h-4 w-4" /> {t("common.save")}</Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)} className="gap-2">
              <Edit className="h-4 w-4" /> {t("common.edit")}
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <DetailTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Tab Content */}
      {activeTab === "info" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("users.personalInformation")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">{t("users.fullName")}</p>
                      {isEditing ? (
                        <Input defaultValue={user.full_name} className="mt-1 h-8" />
                      ) : (
                        <p className="font-medium">{user.full_name}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">{t("users.labels.email")}</p>
                      {isEditing ? (
                        <Input defaultValue={user.email} className="mt-1 h-8" />
                      ) : (
                        <p className="font-medium">{user.email}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Building className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">{t("users.labels.department")}</p>
                      {isEditing ? (
                        <Input defaultValue={user.department || ""} className="mt-1 h-8" />
                      ) : (
                        <p className="font-medium">{user.department || "—"}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">{t("users.assignedLocationLabel")}</p>
                      {isEditing ? (
                        <select 
                          title="Select assigned location"
                          aria-label="Select assigned location"
                          className="w-full mt-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm h-8"
                          value={editedUser.location_id}
                          onChange={(e) => setEditedUser({ ...editedUser, location_id: e.target.value })}
                        >
                          <option value="">{t("users.noLocationAssigned")}</option>
                          {locations.map(loc => (
                            <option key={loc.id} value={loc.id}>
                              {loc.name} ({loc.type})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <p className="font-medium">{userLocation?.name || t("users.notAssigned")}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Briefcase className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">{t("users.jobTitle")}</p>
                      {isEditing ? (
                        <Input defaultValue={user.job_title || ""} className="mt-1 h-8" />
                      ) : (
                        <p className="font-medium">{user.job_title || "—"}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <BadgeCheck className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">{t("users.labels.employeeId")}</p>
                      <p className="font-medium">{user.employee_id || "—"}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">{t("users.memberSince")}</p>
                      <p className="font-medium">{formatDate(user.created_at)}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("users.statistics")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">{t("users.incidentsReported")}</span>
                  <span className="font-medium">12</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">{t("users.checklistsCompleted")}</span>
                  <span className="font-medium">48</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">{t("users.trainingCompletion")}</span>
                  <span className="font-medium text-success">95%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">{t("users.lastLogin")}</span>
                  <span className="font-medium">
                    {user.last_login_at ? formatDate(user.last_login_at) : t("users.never")}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("users.quickActions")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full gap-2">
                  <Key className="h-4 w-4" /> {t("users.resetPassword")}
                </Button>
                <Button variant="outline" className="w-full gap-2">
                  <Mail className="h-4 w-4" /> {t("users.sendMessage")}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === "activity" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("users.activityLog")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{activity.action}</p>
                    <p className="text-sm text-muted-foreground">{activity.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "permissions" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("users.labels.role")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label>{t("users.currentRole")}</Label>
                  <select 
                    title="Select role"
                    aria-label="Select role"
                    className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    defaultValue={user.role}
                  >
                    <option value="employee">Employee</option>
                    <option value="manager">Manager</option>
                    <option value="company_admin">Company Admin</option>
                  </select>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t("users.roleDescription")}
                </p>
                <div className="p-3 rounded-lg bg-muted/50 text-sm">
                  <p className="font-medium mb-1">{t("users.roleSummary")}</p>
                  <p className="text-muted-foreground">
                    {user.role === "employee" && t("users.employeeDesc")}
                    {user.role === "manager" && t("users.managerDesc")}
                    {user.role === "company_admin" && t("users.adminDesc")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {permissionCategories.map((category) => (
            <Card key={category.name}>
              <CardHeader>
                <CardTitle className="text-base">{category.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2">
                  {category.permissions.map((perm) => {
                    const granted = hasPermission(perm.id);
                    return (
                      <div key={perm.id} className="flex items-center gap-3">
                        <div className={`flex h-5 w-5 items-center justify-center rounded ${granted ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground"}`}>
                          {granted ? <Check className="h-3 w-3" /> : <XIcon className="h-3 w-3" />}
                        </div>
                        <span className={`text-sm ${granted ? "" : "text-muted-foreground"}`}>
                          {perm.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {activeTab === "settings" && (
        <div className="space-y-6">
          {/* Security Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4" />
                {t("users.security")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Two-Factor Authentication */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{t("users.twoFactorAuth")}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("users.twoFactorDesc")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {baseUser.two_factor_enabled ? (
                    <>
                      <span className="text-sm text-muted-foreground">{t("users.enabled")}</span>
                      <Button variant="outline" size="sm">{t("users.disable")}</Button>
                    </>
                  ) : (
                    <Button size="sm">{t("users.enable2FA")}</Button>
                  )}
                </div>
              </div>
              
              {/* Password */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{t("users.password")}</p>
                    <p className="text-sm text-muted-foreground">
                      Last changed: Never
                    </p>
                  </div>
                  <Button variant="outline" size="sm">{t("users.changePassword")}</Button>
                </div>
              </div>
              
              {/* Active Sessions */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="font-medium">{t("users.activeSessions")}</p>
                    <p className="text-sm text-muted-foreground">
                      {t("users.activeSessionsDesc")}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" className="text-destructive">
                    {t("users.revokeAll")}
                  </Button>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                        <Monitor className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">MacBook Pro - Chrome</p>
                        <p className="text-xs text-muted-foreground">Houston, TX • Current session</p>
                      </div>
                    </div>
                    <span className="text-sm text-muted-foreground">{t("users.current")}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                        <Smartphone className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">iPhone 15 - Safari</p>
                        <p className="text-xs text-muted-foreground">Houston, TX • 2 hours ago</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="text-destructive">{t("users.revoke")}</Button>
                  </div>
                </div>
              </div>
              
              {/* Login History */}
              <div className="border-t pt-4">
                <p className="font-medium mb-3">{t("users.recentLoginHistory")}</p>
                <div className="space-y-2">
                  {[
                    { date: "Today, 9:00 AM", location: "Houston, TX", device: "Chrome on MacOS", status: "success" },
                    { date: "Yesterday, 2:30 PM", location: "Houston, TX", device: "Safari on iPhone", status: "success" },
                    { date: "Jan 25, 8:45 AM", location: "Houston, TX", device: "Chrome on MacOS", status: "success" },
                    { date: "Jan 24, 6:00 PM", location: "Unknown", device: "Unknown", status: "failed" },
                  ].map((login, i) => (
                    <div key={i} className="flex items-center justify-between text-sm py-2">
                      <div>
                        <span className="font-medium">{login.date}</span>
                        <span className="text-muted-foreground"> • {login.device}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-xs">{login.location}</span>
                        {login.status === "success" ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <XIcon className="h-4 w-4 text-destructive" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("users.accountSettings")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>{t("users.labels.status")}</Label>
                <select title="Select status" aria-label="Select status" className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div>
                <Label>Notification Preferences</Label>
                <select title="Select notification preferences" aria-label="Select notification preferences" className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="all">All notifications</option>
                  <option value="important">Important only</option>
                  <option value="none">None</option>
                </select>
              </div>
              <Button>{t("users.saveSettings")}</Button>
            </CardContent>
          </Card>

          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-base text-destructive">{t("users.dangerZone")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{t("users.deactivateUser")}</p>
                  <p className="text-sm text-muted-foreground">{t("users.deactivateUserDesc")}</p>
                </div>
                <Button variant="outline" onClick={handleDeactivate}>{t("users.deactivate")}</Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{t("users.deleteUser")}</p>
                  <p className="text-sm text-muted-foreground">{t("users.deleteUserDesc")}</p>
                </div>
                <Button variant="destructive" className="gap-2" onClick={() => setShowDeleteConfirm(true)}>
                  <Trash2 className="h-4 w-4" /> Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowDeleteConfirm(false)}>
          <div className="relative z-50 w-full max-w-md rounded-lg bg-background p-6 shadow-xl mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-full bg-destructive/10 p-3">
                <Trash2 className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">{t("users.deleteUser")}</h2>
                <p className="text-sm text-muted-foreground">{t("users.cannotBeUndone")}</p>
              </div>
            </div>
            
            <p className="text-sm mb-4">
              Are you sure you want to delete <strong>{user.full_name}</strong>? 
              All their data will be permanently removed.
            </p>
            
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowDeleteConfirm(false)}>
                {t("common.cancel")}
              </Button>
              <Button variant="destructive" className="flex-1" onClick={handleDelete}>
                {t("users.deleteUser")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
