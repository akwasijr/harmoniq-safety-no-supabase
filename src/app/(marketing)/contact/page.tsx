"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Send, CheckCircle, AlertCircle, Shield } from "lucide-react";

interface ContactFormProps {
  translations: {
    heading: string;
    subheading: string;
    name: string;
    email: string;
    company: string;
    message: string;
    submit: string;
    success: string;
    error: string;
  };
  turnstileSiteKey: string | null;
}

export default function ContactPage() {
  return (
    <ContactFormWrapper />
  );
}

function ContactFormWrapper() {
  // Read locale from cookie for translations
  const [translations, setTranslations] = React.useState({
    heading: "Get in Touch",
    subheading: "Have a question? We'd love to hear from you.",
    name: "Full Name",
    email: "Email Address",
    company: "Company Name",
    message: "Your Message",
    submit: "Send Message",
    success: "Thank you! We'll get back to you shortly.",
    error: "Something went wrong. Please try again.",
  });

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="mx-auto max-w-3xl px-6 pt-12">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>
      </div>

      {/* Form */}
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-600/20">
            <Send className="h-6 w-6 text-violet-400" />
          </div>
          <h1 className="text-3xl font-bold">{translations.heading}</h1>
          <p className="mt-2 text-zinc-400">{translations.subheading}</p>
        </div>

        <ContactForm translations={translations} turnstileSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || null} />
      </div>
    </div>
  );
}

function ContactForm({ translations: t, turnstileSiteKey }: ContactFormProps) {
  const [status, setStatus] = React.useState<"idle" | "loading" | "success" | "error">("idle");
  const [formData, setFormData] = React.useState({
    name: "",
    email: "",
    company: "",
    message: "",
  });
  const [turnstileToken, setTurnstileToken] = React.useState<string | null>(null);
  const turnstileRef = React.useRef<HTMLDivElement>(null);

  // Load Turnstile script if site key is provided
  React.useEffect(() => {
    if (!turnstileSiteKey) return;
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    script.onload = () => {
      if (turnstileRef.current && window.turnstile) {
        window.turnstile.render(turnstileRef.current, {
          sitekey: turnstileSiteKey,
          theme: "dark",
          callback: (token: string) => setTurnstileToken(token),
        });
      }
    };

    return () => {
      document.head.removeChild(script);
    };
  }, [turnstileSiteKey]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          turnstileToken: turnstileToken || "no-captcha",
        }),
      });

      if (res.ok) {
        setStatus("success");
        setFormData({ name: "", email: "", company: "", message: "" });
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className="rounded-2xl border border-green-500/20 bg-green-500/10 p-8 text-center">
        <CheckCircle className="mx-auto h-12 w-12 text-green-400" />
        <p className="mt-4 text-lg font-medium text-green-300">{t.success}</p>
        <button
          onClick={() => setStatus("idle")}
          className="mt-6 rounded-full bg-white/10 px-6 py-2 text-sm transition hover:bg-white/20"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {status === "error" && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {t.error}
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-300">{t.name} *</label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-zinc-500 transition focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
            placeholder="Jane Smith"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-300">{t.email} *</label>
          <input
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData((f) => ({ ...f, email: e.target.value }))}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-zinc-500 transition focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
            placeholder="jane@company.com"
          />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-zinc-300">{t.company}</label>
        <input
          type="text"
          value={formData.company}
          onChange={(e) => setFormData((f) => ({ ...f, company: e.target.value }))}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-zinc-500 transition focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
          placeholder="Your Company"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-zinc-300">{t.message} *</label>
        <textarea
          required
          rows={5}
          value={formData.message}
          onChange={(e) => setFormData((f) => ({ ...f, message: e.target.value }))}
          className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-zinc-500 transition focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
          placeholder="Tell us about your safety management needs..."
        />
      </div>

      {/* Turnstile CAPTCHA widget */}
      {turnstileSiteKey && <div ref={turnstileRef} className="flex justify-center" />}

      {/* Fallback honeypot if no Turnstile key */}
      {!turnstileSiteKey && (
        <div className="flex items-center gap-2 rounded-xl bg-white/5 px-4 py-3 text-xs text-zinc-500">
          <Shield className="h-4 w-4" />
          Protected by spam detection
        </div>
      )}

      <button
        type="submit"
        disabled={status === "loading"}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-6 py-3 font-medium text-white transition hover:bg-violet-500 disabled:opacity-50"
      >
        {status === "loading" ? (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        ) : (
          <>
            <Send className="h-4 w-4" />
            {t.submit}
          </>
        )}
      </button>
    </form>
  );
}

// Extend Window for Turnstile
declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, options: { sitekey: string; theme: string; callback: (token: string) => void }) => void;
    };
  }
}
