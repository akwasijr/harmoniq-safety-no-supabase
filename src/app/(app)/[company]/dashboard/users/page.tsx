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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KPICard } from "@/components/ui/kpi-card";
import { SearchFilterBar } from "@/components/ui/search-filter-bar";
import { commonFilterOptions } from "@/components/ui/filter-panel";
import { RoleGuard } from "@/components/auth/role-guard";
import { useUsersStore } from "@/stores/users-store";
import { useTeamsStore } from "@/stores/teams-store";
import { useCompanyStore } from "@/stores/company-store";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/i18n";
import { DEFAULT_COMPANY_ID } from "@/mocks/data";

const ITEMS_PER_PAGE = 10;

// Tab type
type TabType = "users" | "teams";

export default function UsersPage() {
  const { t, formatDate, formatNumber } = useTranslation();
  const router = useRouter();
  const company = useCompanyParam();
  const [activeTab, setActiveTab] = React.useState<TabType>("users");
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [showAddTeamModal, setShowAddTeamModal] = React.useState(false);
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
  const { items: companies } = useCompanyStore();
  const companyId = (companies.find((c) => c.slug === company) || companies[0])?.id || DEFAULT_COMPANY_ID;
  const { items: users, add: addUser } = useUsersStore();
  const { items: teams, add: addTeam } = useTeamsStore();

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
    const matchesTeam = teamFilter === "" || (user.team_ids?.includes(teamFilter) ?? false);
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
      options: commonFilterOptions.userRole,
      value: roleFilter,
      onChange: (v: string) => { setRoleFilter(v); setCurrentPage(1); },
    },
    {
      id: "status",
      label: "All statuses",
      options: commonFilterOptions.userStatus,
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

  const handleAddUser = () => {
    const newId = `user_new_${Date.now()}`;
    const newUserData = {
      id: newId,
      company_id: companyId,
      email: newUser.email,
      first_name: newUser.first_name,
      middle_name: null,
      last_name: newUser.last_name,
      full_name: `${newUser.first_name} ${newUser.last_name}`,
      role: newUser.role as "company_admin" | "manager" | "employee",
      user_type: "internal" as const,
      account_type: "standard" as const,
      gender: null,
      department: newUser.department || null,
      job_title: null,
      employee_id: `EMP${String(users.length + 1).padStart(3, '0')}`,
      status: "active" as const,
      location_id: null,
      language: "en" as const,
      theme: "system" as const,
      two_factor_enabled: false,
      last_login_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      team_ids: newUser.team_ids,
    };

    addUser(newUserData);
    setShowAddModal(false);
    setNewUser({ first_name: "", last_name: "", email: "", role: "employee", department: "", team_ids: [] });
    toast("User added successfully");
  };

  const handleAddTeam = () => {
    const newId = `team_new_${Date.now()}`;
    const newTeamData = {
      id: newId,
      company_id: companyId,
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

  return (
    <RoleGuard anyPermission={["users.view", "users.create", "users.edit"]}>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">{t("users.title")}</h1>
        <Button 
          size="sm" 
          className="gap-2" 
          onClick={() => activeTab === "users" ? setShowAddModal(true) : setShowAddTeamModal(true)}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          {activeTab === "users" ? t("users.buttons.addUser") : t("users.buttons.createTeam")}
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
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => (
                  <Button key={i + 1} variant={currentPage === i + 1 ? "default" : "outline"} size="sm" onClick={() => setCurrentPage(i + 1)}>
                    {i + 1}
                  </Button>
                ))}
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
                <Input id="department" value={newUser.department} onChange={(e) => setNewUser({ ...newUser, department: e.target.value })} placeholder="e.g., Operations, Safety" className="mt-1" />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowAddModal(false)}>{t("common.cancel")}</Button>
              <Button onClick={handleAddUser} disabled={!newUser.first_name || !newUser.last_name || !newUser.email}>{t("users.buttons.addUser")}</Button>
            </div>
          </div>
        </div>
      )}
        </>
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

          {/* Teams grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {paginatedTeams.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="py-8 text-center text-muted-foreground">
                  {t("users.noTeamsFound")}
                </CardContent>
              </Card>
            ) : (
              paginatedTeams.map((team) => {
                const leader = team.leader_id ? getUserById(team.leader_id) : null;
                return (
                  <Card 
                    key={team.id}
                    className="cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => router.push(`/${company}/dashboard/users/teams/${team.id}`)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div 
                            className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-semibold"
                            style={{ backgroundColor: team.color }}
                          >
                            {team.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <CardTitle className="text-base">{team.name}</CardTitle>
                            <p className="text-xs text-muted-foreground">{formatNumber(team.member_count)} {team.member_count !== 1 ? t("users.members") : t("users.member")}</p>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">{team.status}</span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {team.description || t("users.noDescription")}
                      </p>
                      {leader && (
                        <div className="flex items-center gap-2 text-sm">
                          <UserCog className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">{t("users.leader")}:</span>
                          <span>{leader.full_name}</span>
                        </div>
                      )}
                      {team.permissions && team.permissions.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {team.permissions.slice(0, 3).map((perm) => (
                            <span key={perm} className="text-xs text-muted-foreground">
                              {perm.replace(/_/g, " ")}
                            </span>
                          ))}
                          {team.permissions.length > 3 && (
                            <span className="text-xs text-muted-foreground">
                              +{team.permissions.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
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
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => (
                  <Button key={i + 1} variant={currentPage === i + 1 ? "default" : "outline"} size="sm" onClick={() => setCurrentPage(i + 1)}>
                    {i + 1}
                  </Button>
                ))}
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
                      placeholder="e.g., Safety Committee"
                      className="mt-1" 
                    />
                  </div>
                  <div>
                    <Label htmlFor="team_description">{t("users.teamDescription")}</Label>
                    <Input 
                      id="team_description" 
                      value={newTeam.description} 
                      onChange={(e) => setNewTeam({ ...newTeam, description: e.target.value })} 
                      placeholder="Brief description of team's purpose"
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
    </RoleGuard>
  );
}
