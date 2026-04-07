import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createRateLimiter } from "@/lib/rate-limit";
import { isValidUUID } from "@/lib/validation";

const passwordResetLimiter = createRateLimiter({ limit: 5, windowMs: 600_000, prefix: "password-reset" });

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const rl = passwordResetLimiter.check(request);
    if (!rl.allowed) return rl.response;

    const { userId } = await params;

    if (!isValidUUID(userId)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("users")
      .select("role, company_id")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || !["super_admin", "company_admin"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: targetUser, error: targetUserError } = await supabase
      .from("users")
      .select("id, email, company_id, full_name")
      .eq("id", userId)
      .maybeSingle();

    if (targetUserError || !targetUser) {
      return NextResponse.json({ error: "User not found or inaccessible" }, { status: 404 });
    }

    // company_admin can only reset passwords for users in their own company
    if (profile.role === "company_admin" && targetUser.company_id !== profile.company_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;
    const { error } = await supabase.auth.resetPasswordForEmail(targetUser.email, {
      redirectTo: `${siteUrl}/reset-password`,
    });

    if (error) {
      console.error("[PlatformUsers] Failed to send password reset:", error.message);
      return NextResponse.json(
        { error: "Failed to send password reset" },
        { status: 500 },
      );
    }

    const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const { error: auditError } = await supabase.from("audit_logs").insert({
      company_id: targetUser.company_id,
      user_id: user.id,
      action: "platform_password_reset_sent",
      resource: "platform_users",
      details: {
        target_user_id: targetUser.id,
        target_user_email: targetUser.email,
        target_user_name: targetUser.full_name,
      },
      ip_address: ipAddress,
      created_at: new Date().toISOString(),
    });

    if (auditError) {
      console.error("[PlatformUsers] Failed to write password reset audit log:", auditError.message);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[PlatformUsers] Password reset request failed:", error);
    return NextResponse.json({ error: "Failed to send password reset" }, { status: 500 });
  }
}
