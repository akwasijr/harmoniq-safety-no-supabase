"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useCompanyParam } from "@/hooks/use-company-param";
import {
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  Users,
  UserCheck,
  UserCog,
  Eye,
  UsersRound,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KPICard } from "@/components/ui/kpi-card";
import { SearchFilterBar } from "@/components/ui/search-filter-bar";
import { useFilterOptions } from "@/components/ui/filter-panel";
import { RoleGuard } from "@/components/auth/role-guard";
import { useCompanyData } from "@/hooks/use-company-data";
import { LoadingPage } from "@/components/ui/loading";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/i18n";
import { PAGINATION } from "@/lib/constants";
import { addUserToTeam } from "@/lib/assignment-utils";

const ITEMS_PER_PAGE = PAGINATION.DEFAULT_PAGE_SIZE;

interface Invitation {
  id: string;
  email: string;
  role: string;
  expires_at: string;
  accepted_at: string | null;
  token: string;
  company_id: string;
  invite_url?: string | null;
  company_name?: string | null;
}

// Tab type
type TabType = "users" | "invitations" | "teams";

export default function UsersPage() {
  const { t, formatDate, formatNumber } = useTranslation();
  const router = useRouter();
  const company = useCompanyParam();
  const [activeTab, setActiveTab] = React.useState<TabType>("users");
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [showAddTeamModal, setShowAddTeamModal] = React.useState(false);
  const [isInviting, setIsInviting] = React.useState(false);
  const [inviteLinkUrl, setInviteLinkUrl] = React.useState<string | null>(null);
  const [invitations, setInvitations] = React.useState<Invitation[]>([]);
  const [isInvitesLoading, setIsInvitesLoading] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [dateRange, setDateRange] = React.useState("all_time");

  // User Filters
  const [roleFilter, setRoleFilter] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [departmentFilter, setDepartmentFilter] = React.useState("");
  const [teamFilter, setTeamFilter] = React.useState("");

  // New user form
  const [newUser, setNewUser] = React.useState({
    first_name: "",
    last_name: "",
    email: "",
    role: "employee",
    department: "",
    team_ids: [] as string[],
  });

  // New team form
  const [newTeam, setNewTeam] = React.useState({
    name: "",
    description: "",
    color: "#2563eb",
    leader_id: "",
  });

  const { toast } = useToast();
  const filterOptions = useFilterOptions();
  const { companyId, users, teams, stores } = useCompanyData();
  const { isLoading, add: addUser } = stores.users;
  const { add: addTeam, update: updateTeam } = stores.teams;

  const fetchInvitations = React.useCallback(async () => {
    try {
      setIsInvitesLoading(true);
      const res = await fetch("/api/invitations");
      const data = await res.json();
      if (res.ok) {
        setInvitations((data.invitations || []).filter((invite: Invitation) => invite.company_id === companyId));
      }
    } catch {
      setInvitations([]);
    } finally {
      setIsInvitesLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  // Get unique departments
  const departments = Array.from(new Set(users.map(u => u.department).filter((d): d is string => d !== null && d !== undefined)));
  const departmentOptions = departments.map((d) => ({ value: d, label: d }));

  // Team options for filters
  const teamOptions = teams.map((t) => ({ value: t.id, label: t.name }));

  // Filter users
  const filteredUsers = users.filter((user) => {
    const matchesSearch = searchQuery === "" || 
      user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.employee_id?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesRole = roleFilter === "" || user.role === roleFilter;
    const matchesStatus = statusFilter === "" || user.status === statusFilter;
    const matchesDepartment = departmentFilter === "" || user.department === departmentFilter;
    const matchesTeam = teamFilter === "" || user.team_ids.includes(teamFilter);
    return matchesSearch && matchesRole && matchesStatus && matchesDepartment && matchesTeam;
  });

  // Filter teams
  const filteredTeams = teams.filter((team) => {
    const matchesSearch = searchQuery === "" || 
      team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (team.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesStatus = statusFilter === "" || team.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Pagination for users
  const totalPages = activeTab === "users" 
    ? Math.ceil(filteredUsers.length / ITEMS_PER_PAGE)
    : Math.ceil(filteredTeams.length / ITEMS_PER_PAGE);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );
  const paginatedTeams = filteredTeams.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const roleCounts = {
    admin: users.filter((u) => u.role === "company_admin").length,
    manager: users.filter((u) => u.role === "manager").length,
    employee: users.filter((u) => u.role === "employee").length,
  };

  const teamCounts = {
    total: teams.length,
    active: teams.filter((t) => t.status === "active").length,
    totalMembers: teams.reduce((acc, t) => acc + t.member_count, 0),
  };

  const userFilters = [
    {
      id: "role",
      label: "All roles",
      options: filterOptions.userRole,
      value: roleFilter,
      onChange: (v: string) => { setRoleFilter(v); setCurrentPage(1); },
    },
    {
      id: "status",
      label: "All statuses",
      options: filterOptions.userStatus,
      value: statusFilter,
      onChange: (v: string) => { setStatusFilter(v); setCurrentPage(1); },
    },
    {
      id: "department",
      label: "All departments",
      options: departmentOptions,
      value: departmentFilter,
      onChange: (v: string) => { setDepartmentFilter(v); setCurrentPage(1); },
    },
    {
      id: "team",
      label: "All teams",
      options: teamOptions,
      value: teamFilter,
      onChange: (v: string) => { setTeamFilter(v); setCurrentPage(1); },
    },
  ];

  const teamFilters = [
    {
      id: "status",
      label: "All statuses",
      options: [
        { value: "active", label: "Active" },
        { value: "inactive", label: "Inactive" },
      ],
      value: statusFilter,
      onChange: (v: string) => { setStatusFilter(v); setCurrentPage(1); },
    },
  ];

  const handleAddUser = async () => {
    try {
      setIsInviting(true);
      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newUser.email,
          role: newUser.role,
          company_id: companyId || "",
          first_name: newUser.first_name,
          last_name: newUser.last_name,
          department: newUser.department,
          team_ids: newUser.team_ids,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast(data.error || "Failed to create invitation");
        return;
      }

      if (data.user) {
        addUser(data.user);
        newUser.team_ids.forEach((teamId) => {
          const team = teams.find((item) => item.id === teamId);
          if (!team) return;
          updateTeam(team.id, {
            member_ids: addUserToTeam(team, data.user.id),
            updated_at: new Date().toISOString(),
          });
        });
      }

      if (data.email_sent) {
        toast("Invitation email sent.");
      } else if (data.invitation?.invite_url) {
        const inviteUrl = data.invitation.invite_url;
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(inviteUrl);
        }
        // Show the invite link dialog so it can be copied/shared
        setInviteLinkUrl(inviteUrl);
        toast("Invitation created. Link copied to clipboard.");
      } else {
        toast("Invitation created.");
      }

      setShowAddModal(false);
      fetchInvitations();
      setNewUser({ first_name: "", last_name: "", email: "", role: "employee", department: "", team_ids: [] });
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Failed to create invitation");
    } finally {
      setIsInviting(false);
    }
  };

  const pendingInvitations = invitations.filter((invitation) => !invitation.accepted_at);

  const handleCopyInvite = async (inviteUrl?: string | null) => {
    if (!inviteUrl) {
      toast("Invite link not available.");
      return;
    }
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(inviteUrl);
        toast("Invite link copied to clipboard.");
      } else {
        toast(`Invite link: ${inviteUrl}`);
      }
    } catch {
      toast(`Invite link: ${inviteUrl}`);
    }
  };

  const handleAddTeam = () => {
    const newId = `team_new_${Date.now()}`;
    const newTeamData = {
      id: newId,
      company_id: companyId || "",
      name: newTeam.name,
      description: newTeam.description || null,
      color: newTeam.color,
      leader_id: newTeam.leader_id || null,
      member_ids: [],
      member_count: 0,
      status: "active" as const,
      permissions: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    addTeam(newTeamData);
    setShowAddTeamModal(false);
    setNewTeam({ name: "", description: "", color: "#2563eb", leader_id: "" });
    toast("Team created successfully");
  };

  // Helper to get user by ID
  const getUserById = (id: string) => users.find(u => u.id === id);

  // Helper to get team names for a user
  const getTeamNames = (teamIds?: string[]) => {
    if (!teamIds || teamIds.length === 0) return [];
    return teamIds.map(id => teams.find(t => t.id === id)?.name).filter(Boolean);
  };

  if (isLoading) {
    return <LoadingPage />;
  }

  return (
    <RoleGuard anyPermission={["users.view", "users.create", "users.edit"]}>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">{t("users.title")}</h1>
        <Button 
          size="sm" 
          className="gap-2" 
          onClick={() => {
            if (activeTab === "users" || activeTab === "invitations") setShowAddModal(true);
            else setShowAddTeamModal(true);
          }}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          {activeTab === "teams" ? t("users.buttons.createTeam") : t("users.buttons.addUser")}
        </Button>
      </div>

      {/* Tabs */}
      <div className="border-b overflow-x-auto">
        <div className="flex gap-4 min-w-max">
          <button
            onClick={() => { setActiveTab("users"); setCurrentPage(1); setSearchQuery(""); setStatusFilter(""); }}
            className={cn(
              "flex items-center gap-2 py-3 px-1 text-sm font-medium transition-colors relative whitespace-nowrap",
              activeTab === "users"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Users className="h-4 w-4 shrink-0" />
            <span className="truncate">{t("users.tabs.users")}</span>
            {activeTab === "users" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
          <button
            onClick={() => { setActiveTab("invitations"); setCurrentPage(1); setSearchQuery(""); setStatusFilter(""); fetchInvitations(); }}
            className={cn(
              "flex items-center gap-2 py-3 px-1 text-sm font-medium transition-colors relative whitespace-nowrap",
              activeTab === "invitations"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Mail className="h-4 w-4 shrink-0" />
            <span className="truncate">Invitations</span>
            {pendingInvitations.length > 0 && (
              <span className="ml-1 bg-primary/10 text-primary text-[10px] px-1.5 py-0.5 rounded-full">{pendingInvitations.length}</span>
            )}
            {activeTab === "invitations" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
          <button
            onClick={() => { setActiveTab("teams"); setCurrentPage(1); setSearchQuery(""); setStatusFilter(""); }}
            className={cn(
              "flex items-center gap-2 py-3 px-1 text-sm font-medium transition-colors relative whitespace-nowrap",
              activeTab === "teams"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <UsersRound className="h-4 w-4 shrink-0" />
            <span className="truncate">{t("users.tabs.teams")}</span>
            {activeTab === "teams" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        </div>
      </div>

      {/* Users Tab Content */}
      {activeTab === "users" && (
        <>
          {/* Role summary - clickable for filtering */}
          <div className="grid gap-4 sm:grid-cols-3">
            <KPICard
              title={t("users.admins")}
              value={roleCounts.admin}
              icon={UserCog}
              onClick={() => { setRoleFilter(roleFilter === "company_admin" ? "" : "company_admin"); setCurrentPage(1); }}
              active={roleFilter === "company_admin"}
            />
            <KPICard
              title={t("users.managers")}
              value={roleCounts.manager}
              icon={UserCheck}
              onClick={() => { setRoleFilter(roleFilter === "manager" ? "" : "manager"); setCurrentPage(1); }}
              active={roleFilter === "manager"}
            />
            <KPICard
              title={t("users.employees")}
          value={roleCounts.employee}
          icon={Users}
          onClick={() => { setRoleFilter(roleFilter === "employee" ? "" : "employee"); setCurrentPage(1); }}
          active={roleFilter === "employee"}
        />
      </div>

      {/* Search and filters */}
      <SearchFilterBar
        searchQuery={searchQuery}
        onSearchChange={(value) => { setSearchQuery(value); setCurrentPage(1); }}
        searchPlaceholder={t("users.searchByNameEmailId")}
        filters={userFilters}
        dateRange={dateRange}
        onDateRangeChange={(value) => { setDateRange(value); setCurrentPage(1); }}
        showDateRange={false}
      />

      {/* Users table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{t("users.userCount", { count: filteredUsers.length })}</CardTitle>
            <p className="text-sm text-muted-foreground">{t("users.page", { current: currentPage, total: totalPages || 1 })}</p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-3 font-medium">User</th>
                  <th className="pb-3 font-medium">{t("users.labels.role")}</th>
                  <th className="hidden pb-3 font-medium md:table-cell">{t("users.labels.department")}</th>
                  <th className="hidden pb-3 font-medium lg:table-cell">{t("users.labels.lastActive")}</th>
                  <th className="pb-3 font-medium">{t("users.labels.status")}</th>
                  <th className="pb-3 font-medium w-10"></th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">{t("users.noUsersFound")}</td>
                  </tr>
                ) : (
                  paginatedUsers.map((user) => {
                    const initials = user.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
                    return (
                      <tr 
                        key={user.id} 
                        onClick={() => router.push(`/${company}/dashboard/users/${user.id}`)}
                        className="border-b last:border-0 cursor-pointer hover:bg-muted/50 transition-colors group"
                      >
                        <td className="py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                              {initials}
                            </div>
                            <div>
                              <p className="font-medium">{user.full_name}</p>
                              <p className="text-xs text-muted-foreground">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 capitalize text-xs">{user.role.replace("_", " ")}</td>
                        <td className="hidden py-3 md:table-cell text-xs text-muted-foreground">
                          {user.department || "—"}
                        </td>
                        <td className="hidden py-3 lg:table-cell text-xs text-muted-foreground">
                          {user.last_login_at ? formatDate(user.last_login_at) : t("users.never")}
                        </td>
                        <td className="py-3">
                          <Badge variant={user.status === "active" ? "success" : "secondary"} className="text-xs">
                            {user.status}
                          </Badge>
                        </td>
                        <td className="py-3">
                          <Eye className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t mt-4">
              <p className="text-sm text-muted-foreground">
                {t("users.showing", { from: ((currentPage - 1) * ITEMS_PER_PAGE) + 1, to: Math.min(currentPage * ITEMS_PER_PAGE, filteredUsers.length), total: filteredUsers.length })}
              </p>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {(() => {
                  const pages: (number | "...")[] = totalPages <= 7
                    ? Array.from({ length: totalPages }, (_, i) => i + 1)
                    : (() => {
                        const p: (number | "...")[] = [1];
                        if (currentPage > 3) p.push("...");
                        for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) p.push(i);
                        if (currentPage < totalPages - 2) p.push("...");
                        p.push(totalPages);
                        return p;
                      })();
                  return pages.map((p, idx) =>
                    p === "..." ? (
                      <span key={`ellipsis-${idx}`} className="px-2 text-sm text-muted-foreground">…</span>
                    ) : (
                      <Button key={p} variant={currentPage === p ? "default" : "outline"} size="sm" onClick={() => setCurrentPage(p as number)}>
                        {p}
                      </Button>
                    )
                  );
                })()}
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowAddModal(false)}>
          <div className="relative z-50 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto rounded-lg bg-background p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold">{t("users.addNewUser")}</h2>
                <p className="text-sm text-muted-foreground">{t("users.inviteTeamMember")}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowAddModal(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="first_name">{t("users.labels.firstName")} *</Label>
                  <Input id="first_name" value={newUser.first_name} onChange={(e) => setNewUser({ ...newUser, first_name: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="last_name">{t("users.labels.lastName")} *</Label>
                  <Input id="last_name" value={newUser.last_name} onChange={(e) => setNewUser({ ...newUser, last_name: e.target.value })} className="mt-1" />
                </div>
              </div>
              <div>
                <Label htmlFor="email">{t("users.labels.email")} *</Label>
                <Input id="email" type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="role">{t("users.labels.role")} *</Label>
                <select id="role" title="Select role" aria-label="Select role" value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })} className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="employee">{t("users.roles.employee")}</option>
                  <option value="manager">{t("users.roles.manager")}</option>
                  <option value="company_admin">{t("users.roles.companyAdmin")}</option>
                </select>
              </div>
              <div>
                <Label htmlFor="department">{t("users.labels.department")}</Label>
                <Input id="department" value={newUser.department} onChange={(e) => setNewUser({ ...newUser, department: e.target.value })} placeholder={t("users.placeholders.department")} className="mt-1" />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowAddModal(false)}>{t("common.cancel")}</Button>
              <Button
                onClick={handleAddUser}
                disabled={!newUser.first_name || !newUser.last_name || !newUser.email || isInviting}
              >
                {t("users.buttons.addUser")}
              </Button>
            </div>
          </div>
        </div>
      )}
        </>
      )}

      {/* Invitations Tab Content */}
      {activeTab === "invitations" && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Pending Invitations</CardTitle>
              <Button variant="outline" size="sm" onClick={fetchInvitations} disabled={isInvitesLoading}>
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isInvitesLoading ? (
              <p className="text-sm text-muted-foreground">Loading invitations...</p>
            ) : pendingInvitations.length === 0 ? (
              <div className="text-center py-8">
                <Mail className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-sm font-medium text-muted-foreground">No pending invitations</p>
                <p className="text-xs text-muted-foreground mt-1">Invite a user from the Users tab to see pending invitations here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-3 font-medium">Email</th>
                      <th className="pb-3 font-medium">Role</th>
                      <th className="pb-3 font-medium">Expires</th>
                      <th className="pb-3 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingInvitations.map((invitation) => (
                      <tr key={invitation.id} className="border-b last:border-0">
                        <td className="py-3">{invitation.email}</td>
                        <td className="py-3 capitalize text-xs">{invitation.role?.replace("_", " ")}</td>
                        <td className="py-3 text-xs text-muted-foreground">
                          {invitation.expires_at ? formatDate(invitation.expires_at) : "—"}
                        </td>
                        <td className="py-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCopyInvite(invitation.invite_url)}
                          >
                            Copy link
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Teams Tab Content */}
      {activeTab === "teams" && (
        <>
          {/* Team summary */}
          <div className="grid gap-4 sm:grid-cols-3">
            <KPICard
              title={t("users.totalTeams")}
              value={teamCounts.total}
              icon={UsersRound}
            />
            <KPICard
              title={t("users.activeTeams")}
              value={teamCounts.active}
              icon={UserCheck}
            />
            <KPICard
              title={t("users.totalMembers")}
              value={teamCounts.totalMembers}
              icon={Users}
            />
          </div>

          {/* Search and filters */}
          <SearchFilterBar
            searchQuery={searchQuery}
            onSearchChange={(value) => { setSearchQuery(value); setCurrentPage(1); }}
            searchPlaceholder={t("users.placeholders.searchTeams")}
            filters={teamFilters}
            dateRange={dateRange}
            onDateRangeChange={(value) => { setDateRange(value); setCurrentPage(1); }}
            showDateRange={false}
          />

          {/* Teams table */}
          <div className="rounded-md border">
            {paginatedTeams.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                {t("users.noTeamsFound")}
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">{t("teams.table.team") || "Team"}</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">{t("teams.table.leader") || "Leader"}</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">{t("teams.table.members") || "Members"}</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">{t("teams.table.status") || "Status"}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTeams.map((team) => {
                    const leader = team.leader_id ? getUserById(team.leader_id) : null;
                    return (
                      <tr
                        key={team.id}
                        className="border-b cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => router.push(`/${company}/dashboard/users/teams/${team.id}`)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div
                              className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-medium"
                              style={{ backgroundColor: team.color || '#6366f1' }}
                            >
                              {team.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{team.name}</p>
                              {team.description && <p className="text-xs text-muted-foreground line-clamp-1">{team.description}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">{leader?.full_name || "—"}</td>
                        <td className="px-4 py-3 text-sm">{formatNumber(team.member_count)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            team.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                          }`}>
                            {team.status || 'active'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {t("users.showing", { from: (currentPage - 1) * ITEMS_PER_PAGE + 1, to: Math.min(currentPage * ITEMS_PER_PAGE, filteredTeams.length), total: filteredTeams.length })}
              </p>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {(() => {
                  const pages: (number | "...")[] = totalPages <= 7
                    ? Array.from({ length: totalPages }, (_, i) => i + 1)
                    : (() => {
                        const p: (number | "...")[] = [1];
                        if (currentPage > 3) p.push("...");
                        for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) p.push(i);
                        if (currentPage < totalPages - 2) p.push("...");
                        p.push(totalPages);
                        return p;
                      })();
                  return pages.map((p, idx) =>
                    p === "..." ? (
                      <span key={`ellipsis-${idx}`} className="px-2 text-sm text-muted-foreground">…</span>
                    ) : (
                      <Button key={p} variant={currentPage === p ? "default" : "outline"} size="sm" onClick={() => setCurrentPage(p as number)}>
                        {p}
                      </Button>
                    )
                  );
                })()}
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Add Team Modal */}
          {showAddTeamModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowAddTeamModal(false)}>
              <div className="relative z-50 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto rounded-lg bg-background p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-semibold">{t("users.createNewTeam")}</h2>
                    <p className="text-sm text-muted-foreground">{t("users.organizeUsers")}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setShowAddTeamModal(false)}>
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="team_name">{t("users.teamName")} *</Label>
                    <Input 
                      id="team_name" 
                      value={newTeam.name} 
                      onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })} 
                      placeholder={t("users.placeholders.teamName")}
                      className="mt-1" 
                    />
                  </div>
                  <div>
                    <Label htmlFor="team_description">{t("users.teamDescription")}</Label>
                    <Input 
                      id="team_description" 
                      value={newTeam.description} 
                      onChange={(e) => setNewTeam({ ...newTeam, description: e.target.value })} 
                      placeholder={t("users.placeholders.teamDescription")}
                      className="mt-1" 
                    />
                  </div>
                  <div>
                    <Label htmlFor="team_color">{t("users.teamColor")}</Label>
                    <div className="flex gap-2 mt-1">
                      <input 
                        type="color" 
                        id="team_color" 
                        title="Team color"
                        aria-label="Team color"
                        value={newTeam.color} 
                        onChange={(e) => setNewTeam({ ...newTeam, color: e.target.value })} 
                        className="h-10 w-14 rounded border cursor-pointer"
                      />
                      <Input 
                        value={newTeam.color} 
                        onChange={(e) => setNewTeam({ ...newTeam, color: e.target.value })} 
                        placeholder="#2563eb"
                        className="flex-1" 
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="team_leader">{t("users.teamLeader")}</Label>
                    <select 
                      id="team_leader" 
                      title="Select team leader"
                      aria-label="Select team leader"
                      value={newTeam.leader_id} 
                      onChange={(e) => setNewTeam({ ...newTeam, leader_id: e.target.value })} 
                      className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">{t("users.selectLeader")}</option>
                      {users.filter(u => u.role !== "employee").map((user) => (
                        <option key={user.id} value={user.id}>{user.full_name} - {user.role}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                  <Button variant="outline" onClick={() => setShowAddTeamModal(false)}>{t("common.cancel")}</Button>
                  <Button onClick={handleAddTeam} disabled={!newTeam.name}>{t("users.buttons.createTeam")}</Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>

      {/* Invite Link Dialog */}
      {inviteLinkUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setInviteLinkUrl(null)}>
          <div className="relative z-50 w-full max-w-lg mx-4 rounded-lg bg-background p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Invitation Link</h2>
              <Button variant="ghost" size="icon" onClick={() => setInviteLinkUrl(null)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Share this link with the invited user to complete their registration:
            </p>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={inviteLinkUrl}
                className="font-mono text-xs"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  if (navigator.clipboard?.writeText) {
                    await navigator.clipboard.writeText(inviteLinkUrl);
                    toast("Link copied to clipboard");
                  }
                }}
              >
                Copy
              </Button>
            </div>
            <div className="flex justify-end mt-4">
              <Button onClick={() => setInviteLinkUrl(null)}>Done</Button>
            </div>
          </div>
        </div>
      )}
    </RoleGuard>
  );
}
