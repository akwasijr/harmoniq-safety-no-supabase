"use client";

import * as React from "react";

export interface CookieConsent {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
}

interface CookieConsentBannerProps {
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
  // 1 year expiry
  document.cookie = `${CONSENT_COOKIE}=${value}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}

export function CookieConsentBanner({ translations: t }: CookieConsentBannerProps) {
  const [visible, setVisible] = React.useState(false);
  const [showDetails, setShowDetails] = React.useState(false);
  const [preferences, setPreferences] = React.useState<CookieConsent>({
    necessary: true,
    analytics: false,
    marketing: false,
  });

  React.useEffect(() => {
    const existing = getConsentFromCookie();
    if (!existing) {
      setVisible(true);
    }
  }, []);

  const handleAcceptAll = () => {
    const consent: CookieConsent = { necessary: true, analytics: true, marketing: true };
    setConsentCookie(consent);
    setVisible(false);
    window.dispatchEvent(new CustomEvent("harmoniq:consent", { detail: consent }));
  };

  const handleRejectAll = () => {
    const consent: CookieConsent = { necessary: true, analytics: false, marketing: false };
    setConsentCookie(consent);
    setVisible(false);
    window.dispatchEvent(new CustomEvent("harmoniq:consent", { detail: consent }));
  };

  const handleSavePreferences = () => {
    const consent = { ...preferences, necessary: true };
    setConsentCookie(consent);
    setVisible(false);
    window.dispatchEvent(new CustomEvent("harmoniq:consent", { detail: consent }));
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] p-4 sm:p-6">
      <div className="mx-auto max-w-2xl rounded-2xl border border-white/10 bg-zinc-900/95 p-6 shadow-2xl backdrop-blur-xl">
        <h3 className="text-lg font-semibold text-white">{t.title}</h3>
        <p className="mt-2 text-sm text-zinc-400">{t.description}</p>

        {showDetails && (
          <div className="mt-4 space-y-3">
            {/* Necessary — always on */}
            <label className="flex items-center justify-between rounded-lg bg-white/5 px-4 py-3">
              <div>
                <span className="text-sm font-medium text-white">{t.necessary}</span>
                <p className="text-xs text-zinc-500">{t.necessary_desc}</p>
              </div>
              <input type="checkbox" checked disabled className="h-4 w-4 accent-violet-500" />
            </label>
            {/* Analytics */}
            <label className="flex cursor-pointer items-center justify-between rounded-lg bg-white/5 px-4 py-3">
              <div>
                <span className="text-sm font-medium text-white">{t.analytics}</span>
                <p className="text-xs text-zinc-500">{t.analytics_desc}</p>
              </div>
              <input
                type="checkbox"
                checked={preferences.analytics}
                onChange={(e) => setPreferences((p) => ({ ...p, analytics: e.target.checked }))}
                className="h-4 w-4 accent-violet-500"
              />
            </label>
            {/* Marketing */}
            <label className="flex cursor-pointer items-center justify-between rounded-lg bg-white/5 px-4 py-3">
              <div>
                <span className="text-sm font-medium text-white">{t.marketing}</span>
                <p className="text-xs text-zinc-500">{t.marketing_desc}</p>
              </div>
              <input
                type="checkbox"
                checked={preferences.marketing}
                onChange={(e) => setPreferences((p) => ({ ...p, marketing: e.target.checked }))}
                className="h-4 w-4 accent-violet-500"
              />
            </label>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-3">
          {showDetails ? (
            <button
              onClick={handleSavePreferences}
              className="rounded-full bg-violet-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-violet-500"
            >
              {t.save_preferences}
            </button>
          ) : (
            <button
              onClick={() => setShowDetails(true)}
              className="rounded-full border border-white/20 px-5 py-2 text-sm font-medium text-white transition hover:bg-white/10"
            >
              {t.customize}
            </button>
          )}
          <button
            onClick={handleRejectAll}
            className="rounded-full border border-white/20 px-5 py-2 text-sm font-medium text-white transition hover:bg-white/10"
          >
            {t.reject_all}
          </button>
          <button
            onClick={handleAcceptAll}
            className="rounded-full bg-violet-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-violet-500"
          >
            {t.accept_all}
          </button>
        </div>
      </div>
    </div>
  );
}
