import { describe, expect, it } from "vitest";
import { INVITE_TOKEN_PATTERN, canInviteRole, isInvitableRole } from "@/lib/invitations";

describe("invitations helpers", () => {
  it("accepts only company-scoped invitable roles", () => {
    expect(isInvitableRole("company_admin")).toBe(true);
    expect(isInvitableRole("manager")).toBe(true);
    expect(isInvitableRole("employee")).toBe(true);
    expect(isInvitableRole("super_admin")).toBe(false);
    expect(isInvitableRole("worker")).toBe(false);
  });

  it("allows only admin inviters to assign invitable roles", () => {
    expect(canInviteRole("super_admin", "company_admin")).toBe(true);
    expect(canInviteRole("company_admin", "manager")).toBe(true);
    expect(canInviteRole("company_admin", "super_admin")).toBe(false);
    expect(canInviteRole("employee", "manager")).toBe(false);
  });

  it("requires the expected invite token format", () => {
    expect(INVITE_TOKEN_PATTERN.test("a".repeat(64))).toBe(true);
    expect(INVITE_TOKEN_PATTERN.test("short-token")).toBe(false);
    expect(INVITE_TOKEN_PATTERN.test("z".repeat(64))).toBe(false);
  });
});
