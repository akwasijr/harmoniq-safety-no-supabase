import type { Team, User } from "@/types";

function normalizeIdList(ids?: string[] | null): string[] {
  return Array.from(
    new Set(
      (ids ?? []).filter((id): id is string => typeof id === "string" && id.trim().length > 0),
    ),
  );
}

export function getUserTeamIds(user?: Pick<User, "team_ids"> | null): string[] {
  return normalizeIdList(user?.team_ids);
}

export function normalizeUser(user: User): User {
  return {
    ...user,
    team_ids: getUserTeamIds(user),
  };
}

export function normalizeUserUpdates(updates: Partial<User>): Partial<User> {
  if (!("team_ids" in updates)) return updates;

  return {
    ...updates,
    team_ids: normalizeIdList(updates.team_ids),
  };
}

export function normalizeTeam(team: Team): Team {
  const member_ids = normalizeIdList(team.member_ids);
  return {
    ...team,
    member_ids,
    member_count: member_ids.length,
  };
}

export function normalizeTeamUpdates(updates: Partial<Team>): Partial<Team> {
  if (!("member_ids" in updates)) return updates;

  const member_ids = normalizeIdList(updates.member_ids);
  return {
    ...updates,
    member_ids,
    member_count: member_ids.length,
  };
}

export function addTeamToUser(user: Pick<User, "team_ids">, teamId: string): string[] {
  return normalizeIdList([...getUserTeamIds(user), teamId]);
}

export function removeTeamFromUser(user: Pick<User, "team_ids">, teamId: string): string[] {
  return getUserTeamIds(user).filter((id) => id !== teamId);
}

export function addUserToTeam(team: Pick<Team, "member_ids">, userId: string): string[] {
  return normalizeIdList([...(team.member_ids ?? []), userId]);
}

export function removeUserFromTeam(team: Pick<Team, "member_ids">, userId: string): string[] {
  return normalizeIdList(team.member_ids).filter((id) => id !== userId);
}

export function isAssignedToUserOrTeam(
  assignment: {
    assigned_to?: string | null;
    assigned_to_team_id?: string | null;
    assigned_groups?: string[] | null;
  },
  user?: Pick<User, "id" | "team_ids"> | null,
): boolean {
  if (!user) return false;

  const teamIds = getUserTeamIds(user);
  if (assignment.assigned_to === user.id) return true;
  if (assignment.assigned_to_team_id && teamIds.includes(assignment.assigned_to_team_id)) return true;

  return normalizeIdList(assignment.assigned_groups).some((groupId) => teamIds.includes(groupId));
}

