import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createRateLimiter } from "@/lib/rate-limit";
import { hasSupabasePublicEnv } from "@/lib/supabase/public-env";
import { sanitizeText, isValidEmail } from "@/lib/validation";

const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET_KEY;
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const MIN_CONTACT_FORM_FILL_MS = 1_500;

// 5 contact submissions per IP per 10 minutes
const contactLimiter = createRateLimiter({ limit: 5, windowMs: 600_000, prefix: "contact" });

interface ContactPayload {
  name: string;
  email: string;
  company: string;
  message: string;
  website?: string;
  startedAt?: number;
  turnstileToken: string;
}

function isContactPayload(value: unknown): value is Partial<ContactPayload> {
  return typeof value === "object" && value !== null;
}

export async function POST(request: NextRequest) {
  try {
    const rl = contactLimiter.check(request);
    if (!rl.allowed) return rl.response;

    const rawBody = await request.json();
    if (!isContactPayload(rawBody)) {
      return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
    }

    const name = sanitizeText(rawBody.name, 100);
    const email = sanitizeText(rawBody.email, 254).toLowerCase();
    const message = sanitizeText(rawBody.message, 2000);
    const company = sanitizeText(rawBody.company || "", 200);
    const website = sanitizeText(typeof rawBody.website === "string" ? rawBody.website : "", 200);
    const startedAt = typeof rawBody.startedAt === "number" && Number.isFinite(rawBody.startedAt) ? rawBody.startedAt : null;
    const turnstileToken = typeof rawBody.turnstileToken === "string" ? rawBody.turnstileToken : "";

    if (!name || !email || !message) {
      return NextResponse.json({ error: "Name, email, and message are required" }, { status: 400 });
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    if (!TURNSTILE_SECRET) {
      if (website) {
        console.warn("Rejected contact submission via honeypot field.");
        return NextResponse.json({ error: "Invalid submission" }, { status: 400 });
      }

      if (!startedAt || Date.now() - startedAt < MIN_CONTACT_FORM_FILL_MS) {
        console.warn("Rejected contact submission due to invalid form timing.");
        return NextResponse.json({ error: "Invalid submission" }, { status: 400 });
      }
    }

    if (TURNSTILE_SECRET && (!TURNSTILE_SITE_KEY || !turnstileToken || turnstileToken === "no-captcha")) {
      return NextResponse.json({ error: "CAPTCHA verification required" }, { status: 403 });
    }

    // Verify Turnstile token if secret is configured
    if (TURNSTILE_SECRET) {
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

    if (!hasSupabasePublicEnv()) {
      console.error("Contact inquiry persistence unavailable: missing Supabase public environment variables.");
      return NextResponse.json(
        { error: "We cannot accept messages right now. Please try again later." },
        { status: 503 }
      );
    }

    const supabase = await createClient();
    const { error: insertError } = await supabase.from("inquiries").insert({
      name,
      email,
      company: company || null,
      message,
    });

    if (insertError) {
      console.error("Failed to persist contact inquiry:", insertError);
      return NextResponse.json(
        { error: "We could not save your message right now. Please try again later." },
        { status: 503 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unexpected contact submission failure:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
