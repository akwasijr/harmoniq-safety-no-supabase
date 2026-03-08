import { NextRequest, NextResponse } from "next/server";
import { createRateLimiter } from "@/lib/rate-limit";

const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET_KEY;

// 5 contact submissions per IP per 10 minutes
const contactLimiter = createRateLimiter({ limit: 5, windowMs: 600_000, prefix: "contact" });

interface ContactPayload {
  name: string;
  email: string;
  company: string;
  message: string;
  turnstileToken: string;
}

export async function POST(request: NextRequest) {
  try {
    const rl = contactLimiter.check(request);
    if (!rl.allowed) return rl.response;

    const body: ContactPayload = await request.json();
    const { name, email, message, company, turnstileToken } = body;

    // Basic validation
    if (!name || !email || !message) {
      return NextResponse.json({ error: "Name, email, and message are required" }, { status: 400 });
    }

    // Email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    // Verify Turnstile token if secret is configured
    if (TURNSTILE_SECRET && turnstileToken !== "no-captcha") {
      const verifyRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          secret: TURNSTILE_SECRET,
          response: turnstileToken,
        }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyData.success) {
        return NextResponse.json({ error: "CAPTCHA verification failed" }, { status: 403 });
      }
    }

    // Log the inquiry (replace with database insert when Supabase is connected)
    console.log("[Contact Inquiry]", {
      name,
      email,
      company: company || "N/A",
      message: message.substring(0, 500),
      timestamp: new Date().toISOString(),
      ip: request.headers.get("x-forwarded-for") || "unknown",
    });

    // TODO: Store in Supabase `inquiries` table
    // TODO: Send notification email to admin

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
