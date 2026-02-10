"use client";

import * as React from "react";
import { useRouter, useParams, notFound } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Trash2,
  Users,
  UserPlus,
  UserMinus,
  Edit,
  Info,
  Settings,
  Crown,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DetailTabs, Tab } from "@/components/ui/detail-tabs";
import { useTeamsStore } from "@/stores/teams-store";
import { useUsersStore } from "@/stores/users-store";
import { useToast } from "@/components/ui/toast";
import { useTranslation } from "@/i18n";

const tabs: Tab[] = [
  { id: "overview", label: "Overview", icon: Info },
  { id: "members", label: "Members", icon: Users },
  { id: "settings", label: "Settings", icon: Settings, variant: "danger" },
];

export default function TeamDetailPage() {
  const router = useRouter();
  const routeParams = useParams();
  const company = routeParams.company as string;
  const teamId = routeParams.teamId as string;
  const [activeTab, setActiveTab] = React.useState("overview");
  const [isEditing, setIsEditing] = React.useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = React.useState(false);
  const { t, formatDate, formatNumber } = useTranslation();

  const { toast } = useToast();
  const { items: teams, update: updateTeam, remove: removeTeam } = useTeamsStore();
  const { items: users, update: updateUser } = useUsersStore();
  const baseTeam = teams.find((t) => t.id === teamId);

  // Team not found — trigger Next.js not-found boundary
  if (!baseTeam) {
    notFound();
  }
  
  // Editable team state
  const [editedTeam, setEditedTeam] = React.useState({
    name: baseTeam.name,
    description: baseTeam.description || "",
    color: baseTeam.color,
  });

  React.useEffect(() => {
    setEditedTeam({
      name: baseTeam.name,
      description: baseTeam.description || "",
      color: baseTeam.color,
    });
  }, [baseTeam]);

  const team = isEditing ? { ...baseTeam, ...editedTeam } : baseTeam;

  // Get team members
  const teamMembers = users.filter(u => u.team_ids?.includes(teamId));
  
  // Get team leader
  const teamLeader = team.leader_id ? users.find(u => u.id === team.leader_id) : null;

  // Get users not in this team for add member modal
  const availableUsers = users.filter(u => !u.team_ids?.includes(teamId));

  const handleSave = () => {
    updateTeam(baseTeam.id, {
      name: editedTeam.name,
      description: editedTeam.description || null,
      color: editedTeam.color,
      updated_at: new Date().toISOString(),
    });
    toast("Team updated successfully");
    setIsEditing(false);
  };

  const handleDelete = () => {
    teamMembers.forEach((member) => {
      updateUser(member.id, {
        team_ids: member.team_ids?.filter((id) => id !== teamId),
        updated_at: new Date().toISOString(),
      });
    });
    removeTeam(baseTeam.id);
    toast("Team deleted", "info");
    setShowDeleteConfirm(false);
    router.push(`/${company}/dashboard/users?tab=teams`);
  };

  const handleRemoveMember = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;
    updateUser(user.id, {
      team_ids: user.team_ids?.filter((id) => id !== teamId),
      updated_at: new Date().toISOString(),
    });
    const nextMemberIds = (team.member_ids || []).filter((id) => id !== userId);
    updateTeam(baseTeam.id, {
      member_ids: nextMemberIds,
      member_count: nextMemberIds.length,
      updated_at: new Date().toISOString(),
    });
    toast("Member removed", "info");
  };

  const handleAddMember = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;
    updateUser(user.id, {
      team_ids: Array.from(new Set([...(user.team_ids || []), teamId])),
      updated_at: new Date().toISOString(),
    });
    const nextMemberIds = Array.from(new Set([...(team.member_ids || []), userId]));
    updateTeam(baseTeam.id, {
      member_ids: nextMemberIds,
      member_count: nextMemberIds.length,
      updated_at: new Date().toISOString(),
    });
    setShowAddMemberModal(false);
    toast("Member added");
  };

  const handleSetLeader = (userId: string) => {
    updateTeam(baseTeam.id, {
      leader_id: userId,
      updated_at: new Date().toISOString(),
    });
    toast("Team leader updated");
  };

  if (!teamId) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/${company}/dashboard/users`)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div
              className="h-12 w-12 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: team.color + "20" }}
            >
              <Users className="h-6 w-6" style={{ color: team.color }} />
            </div>
            <div>
              {isEditing ? (
                <Input
                  value={editedTeam.name}
                  onChange={(e) => setEditedTeam({ ...editedTeam, name: e.target.value })}
                  className="text-xl font-semibold h-auto py-1"
                />
              ) : (
                <h1 className="text-2xl font-semibold">{team.name}</h1>
              )}
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-muted-foreground">{formatNumber(teamMembers.length)} {teamMembers.length !== 1 ? t("users.members") : t("users.member")}</span>
                <span className="text-sm text-muted-foreground">{team.status}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)}>{t("common.cancel")}</Button>
              <Button className="gap-2" onClick={handleSave}>
                <Save className="h-4 w-4" /> {t("common.save")}
              </Button>
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

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("users.teamInformation")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-muted-foreground">{t("users.teamDescription")}</Label>
                  {isEditing ? (
                    <Input
                      value={editedTeam.description}
                      onChange={(e) => setEditedTeam({ ...editedTeam, description: e.target.value })}
                      placeholder="Team description..."
                      className="mt-1"
                    />
                  ) : (
                    <p className="mt-1">{team.description || t("users.noDescription")}</p>
                  )}
                </div>
                <div>
                  <Label className="text-muted-foreground">{t("users.teamColor")}</Label>
                  {isEditing ? (
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="color"
                        title="Team color"
                        aria-label="Team color"
                        value={editedTeam.color}
                        onChange={(e) => setEditedTeam({ ...editedTeam, color: e.target.value })}
                        className="h-10 w-20 rounded border cursor-pointer"
                      />
                      <span className="text-sm text-muted-foreground">{editedTeam.color}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mt-1">
                      <div
                        className="h-6 w-6 rounded"
                        style={{ backgroundColor: team.color }}
                      />
                      <span className="text-sm">{team.color}</span>
                    </div>
                  )}
                </div>
                <div>
                  <Label className="text-muted-foreground">{t("users.teamLeader")}</Label>
                  <div className="mt-1">
                    {teamLeader ? (
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                          {teamLeader.first_name[0]}{teamLeader.last_name[0]}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{teamLeader.full_name}</p>
                          <p className="text-xs text-muted-foreground">{teamLeader.email}</p>
                        </div>
                        <Crown className="h-4 w-4 text-yellow-500 ml-2" />
                      </div>
                    ) : (
                      <p className="text-muted-foreground">{t("users.noLeaderAssigned")}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">{t("users.recentMembers")}</CardTitle>
                <Button size="sm" variant="outline" onClick={() => setActiveTab("members")}>
                  {t("common.viewAll")}
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {teamMembers.slice(0, 5).map((member) => (
                    <div key={member.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                          {member.first_name[0]}{member.last_name[0]}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{member.full_name}</p>
                          <p className="text-xs text-muted-foreground">{member.role}</p>
                        </div>
                      </div>
                      {member.id === team.leader_id && (
                        <Crown className="h-4 w-4 text-yellow-500" />
                      )}
                    </div>
                  ))}
                  {teamMembers.length === 0 && (
                    <p className="text-muted-foreground text-sm">{t("users.noMembersInTeam")}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("users.quickStats")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("users.totalMembers")}</span>
                  <span className="font-semibold">{teamMembers.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("users.admins")}</span>
                  <span className="font-semibold">
                    {teamMembers.filter(m => m.role === "company_admin").length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("users.managers")}</span>
                  <span className="font-semibold">
                    {teamMembers.filter(m => m.role === "manager").length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("users.employees")}</span>
                  <span className="font-semibold">
                    {teamMembers.filter(m => m.role === "employee").length}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("users.created")}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">
                  {formatDate(team.created_at, { year: "numeric", month: "long", day: "numeric" })}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Members Tab */}
      {activeTab === "members" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t("users.members")} ({formatNumber(teamMembers.length)})</h2>
            <Button size="sm" className="gap-2" onClick={() => setShowAddMemberModal(true)}>
              <UserPlus className="h-4 w-4" /> Add Member
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {teamMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                        {member.first_name[0]}{member.last_name[0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{member.full_name}</p>
                          {member.id === team.leader_id && (
                            <Badge variant="secondary" className="gap-1">
                              <Crown className="h-3 w-3" /> {t("users.leader")}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="capitalize">{member.role}</Badge>
                      {member.id !== team.leader_id && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSetLeader(member.id)}
                            title="Make team leader"
                          >
                            <Crown className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleRemoveMember(member.id)}
                          >
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
                {teamMembers.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>{t("users.noMembersYet")}</p>
                    <Button size="sm" className="mt-4 gap-2" onClick={() => setShowAddMemberModal(true)}>
                      <UserPlus className="h-4 w-4" /> Add First Member
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === "settings" && (
        <div className="max-w-2xl space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-destructive">{t("users.dangerZone")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{t("users.deactivateTeam")}</p>
                  <p className="text-sm text-muted-foreground">{t("users.deactivateTeamDesc")}</p>
                </div>
                <Button variant="outline">{t("users.deactivate")}</Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{t("users.deleteTeam")}</p>
                  <p className="text-sm text-muted-foreground">{t("users.deleteTeamDesc")}</p>
                </div>
                <Button
                  variant="destructive"
                  className="gap-2"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMemberModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowAddMemberModal(false)}>
          <div className="relative z-50 w-full max-w-lg rounded-lg bg-background p-6 shadow-xl mx-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{t("users.addTeamMember")}</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowAddMemberModal(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            <div className="space-y-2">
              {availableUsers.length > 0 ? (
                availableUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleAddMember(user.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 text-left transition-colors"
                  >
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                      {user.first_name[0]}{user.last_name[0]}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{user.full_name}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                    <Badge variant="outline" className="capitalize">{user.role}</Badge>
                  </button>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  {t("users.allUsersAlreadyMembers")}
                </p>
              )}
            </div>
          </div>
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
                <h2 className="text-lg font-semibold">{t("users.deleteTeam")}</h2>
                <p className="text-sm text-muted-foreground">{t("users.cannotBeUndone")}</p>
              </div>
            </div>
            
            <p className="text-sm mb-4">
              Are you sure you want to delete <strong>{team.name}</strong>?
              {teamMembers.length > 0 && (
                <span className="block mt-2 text-amber-600">
                  Warning: This team has {teamMembers.length} member(s) who will be removed from the team.
                </span>
              )}
            </p>
            
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowDeleteConfirm(false)}>
                {t("common.cancel")}
              </Button>
              <Button variant="destructive" className="flex-1" onClick={handleDelete}>
                {t("users.deleteTeam")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
