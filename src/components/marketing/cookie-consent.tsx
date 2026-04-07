"use client";

import * as React from "react";
import { X } from "lucide-react";
import type { PlatformPrivacySettings } from "@/lib/platform-privacy-settings";

export interface CookieConsent {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
}

interface CookieConsentBannerProps {
  settings: PlatformPrivacySettings;
  translations: {
    title: string;
    description: string;
    accept_all: string;
    reject_all: string;
    customize: string;
    necessary: string;
    necessary_desc: string;
    analytics: string;
    analytics_desc: string;
    marketing: string;
    marketing_desc: string;
    save_preferences: string;
  };
}

const CONSENT_COOKIE = "harmoniq_consent";

function getConsentFromCookie(): CookieConsent | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`${CONSENT_COOKIE}=([^;]+)`));
  if (!match) return null;
  try {
    return JSON.parse(decodeURIComponent(match[1]));
  } catch {
    return null;
  }
}

function setConsentCookie(consent: CookieConsent) {
  const value = encodeURIComponent(JSON.stringify(consent));
  document.cookie = `${CONSENT_COOKIE}=${value}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ${
        checked ? "bg-emerald-500" : "bg-zinc-700"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transform transition-transform duration-200 mt-0.5 ${
          checked ? "translate-x-[22px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

export function CookieConsentBanner({ settings, translations: t }: CookieConsentBannerProps) {
  const [visible, setVisible] = React.useState(false);
  const [showPreferences, setShowPreferences] = React.useState(false);
  const [preferences, setPreferences] = React.useState<CookieConsent>({
    necessary: true,
    analytics: false,
    marketing: false,
  });

  React.useEffect(() => {
    const existing = getConsentFromCookie();
    if (existing) {
      setPreferences(existing);
      return;
    }

    if (settings.cookieConsent) {
      setVisible(true);
    }
  }, [settings.cookieConsent]);

  const save = (consent: CookieConsent) => {
    setConsentCookie(consent);
    setVisible(false);
    setShowPreferences(false);
    window.dispatchEvent(new CustomEvent("harmoniq:consent", { detail: consent }));
    // Log consent for GDPR audit trail
    fetch("/api/consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(consent),
    }).catch(() => {});
  };

  const handleAcceptAll = () => save({ necessary: true, analytics: true, marketing: true });
  const handleRejectAll = () => save({ necessary: true, analytics: false, marketing: false });
  const handleSavePreferences = () => save({ ...preferences, necessary: true });

  if (!settings.cookieConsent || !visible) return null;

  // Preferences panel (full-screen overlay)
  if (showPreferences) {
    return (
      <div className="fixed inset-0 z-[100] bg-zinc-950/95 backdrop-blur-sm">
        <div className="mx-auto max-w-lg px-6 py-10">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-semibold text-white">{t.title}</h2>
            <button
              onClick={() => setShowPreferences(false)}
              className="text-zinc-500 hover:text-white transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <p className="text-sm text-zinc-400 mb-8">
            {t.description}
          </p>

          <div className="space-y-3">
            {/* Necessary */}
            <div className="flex items-center justify-between rounded-xl bg-white/5 border border-white/5 px-5 py-4">
              <div>
                <span className="text-sm font-medium text-white">{t.necessary}</span>
                <p className="text-xs text-zinc-500 mt-0.5">{t.necessary_desc}</p>
              </div>
              <span className="text-xs text-zinc-500">Always on</span>
            </div>

            {/* Analytics */}
            <div className="flex items-center justify-between rounded-xl bg-white/5 border border-white/5 px-5 py-4">
              <div>
                <span className="text-sm font-medium text-white">{t.analytics}</span>
                <p className="text-xs text-zinc-500 mt-0.5">{t.analytics_desc}</p>
              </div>
              <Toggle
                checked={preferences.analytics}
                onChange={(v) => setPreferences((p) => ({ ...p, analytics: v }))}
              />
            </div>

            {/* Marketing */}
            <div className="flex items-center justify-between rounded-xl bg-white/5 border border-white/5 px-5 py-4">
              <div>
                <span className="text-sm font-medium text-white">{t.marketing}</span>
                <p className="text-xs text-zinc-500 mt-0.5">{t.marketing_desc}</p>
              </div>
              <Toggle
                checked={preferences.marketing}
                onChange={(v) => setPreferences((p) => ({ ...p, marketing: v }))}
              />
            </div>
          </div>

            <div className="flex items-center gap-4 mt-8">
              <button
                onClick={handleSavePreferences}
                className="rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-black hover:bg-zinc-200 transition-colors"
              >
                {t.save_preferences}
              </button>
              <button
                onClick={() => setShowPreferences(false)}
                className="text-sm font-semibold text-white hover:text-zinc-300 transition-colors"
              >
                Cancel
              </button>
            </div>
            <div className="mt-6 flex flex-wrap gap-4 text-xs text-zinc-400">
              <a href={settings.privacyUrl} className="hover:text-white transition-colors">
                Privacy policy
              </a>
              <a href={settings.cookieUrl} className="hover:text-white transition-colors">
                Cookie policy
              </a>
            </div>
          </div>
        </div>
      );
  }

  // Minimal banner
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-2rem)] max-w-xl">
        <div className="rounded-2xl border border-white/10 bg-zinc-900/90 backdrop-blur-xl px-6 py-5">
          <p className="text-sm text-zinc-400 leading-relaxed">
            {t.description}
          </p>
          <div className="flex items-center gap-5 mt-4">
            <button
              onClick={handleAcceptAll}
              className="text-sm font-semibold text-white hover:text-zinc-300 transition-colors"
            >
              {t.accept_all}
            </button>
            <button
              onClick={handleRejectAll}
              className="text-sm font-medium text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              {t.reject_all}
            </button>
            <button
              onClick={() => setShowPreferences(true)}
              className="text-sm font-medium text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              {t.customize}
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-zinc-500">
            <a href={settings.privacyUrl} className="hover:text-zinc-300 transition-colors">
              Privacy policy
            </a>
            <a href={settings.cookieUrl} className="hover:text-zinc-300 transition-colors">
              Cookie policy
            </a>
          </div>
        </div>
      </div>
  );
}
