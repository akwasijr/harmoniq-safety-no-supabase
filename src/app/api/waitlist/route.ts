import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { createRateLimiter } from "@/lib/rate-limit";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 5 waitlist signups per IP per 10 minutes
const waitlistLimiter = createRateLimiter({ limit: 5, windowMs: 600_000, prefix: "waitlist" });

export async function POST(request: Request) {
  try {
    const rl = waitlistLimiter.check(request as NextRequest);
    if (!rl.allowed) return rl.response;

    const body = await request.json();
    const { email } = body as { email?: string };

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { success: false, message: "Email is required." },
        { status: 400 },
      );
    }

    const trimmed = email.trim().toLowerCase();

    if (!EMAIL_REGEX.test(trimmed)) {
      return NextResponse.json(
        { success: false, message: "Please enter a valid email address." },
        { status: 400 },
      );
    }

    // Mock mode: just acknowledge the signup.
    // In production, persist to a database or mailing-list provider.
    return NextResponse.json({
      success: true,
      message: "You're on the list!",
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
