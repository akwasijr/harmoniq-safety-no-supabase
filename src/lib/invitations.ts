import type { CompanyRole, UserRole } from "@/types";

export const INVITABLE_ROLES = ["company_admin", "manager", "safety_officer", "employee", "viewer"] as const satisfies readonly CompanyRole[];

export const INVITE_TOKEN_PATTERN = /^[a-f0-9]{64}$/i;

export function isInvitableRole(role: string): role is CompanyRole {
  return (INVITABLE_ROLES as readonly string[]).includes(role);
}

export function canInviteRole(inviterRole: UserRole, invitedRole: string): invitedRole is CompanyRole {
  if (!isInvitableRole(invitedRole)) {
    return false;
  }

  return inviterRole === "super_admin" || inviterRole === "company_admin";
}
