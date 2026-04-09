import { cookies } from "next/headers";
import { getMarketingTranslations, type MarketingLocale } from "@/i18n/marketing";
import { CookieConsentBanner } from "@/components/marketing/cookie-consent";
import { AnalyticsTracker } from "@/components/marketing/analytics-tracker";
import { getPublicPlatformPrivacySettings } from "@/lib/platform-privacy-settings-server";
import { MarketingI18nWrapper } from "@/components/marketing/i18n-wrapper";

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const locale = (cookieStore.get("harmoniq_locale")?.value || "en") as MarketingLocale;
  const t = getMarketingTranslations(locale);
  const privacySettings = await getPublicPlatformPrivacySettings();

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Harmoniq Safety",
      applicationCategory: "BusinessApplication",
      applicationSubCategory: "Environment, Health & Safety",
      description: "All-in-one EHS platform: report incidents, run safety inspections, manage assets, and track compliance. OSHA, Arbowet, ISO 45001 ready.",
      operatingSystem: "Web, iOS, Android",
      url: "https://harmoniqsafety.com",
      availableLanguage: ["English", "Dutch", "Swedish"],
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD", availability: "https://schema.org/InStock" },
      author: { "@type": "Organization", name: "Harmoniq Safety", url: "https://harmoniqsafety.com" },
      featureList: "Incident Reporting, Safety Inspections, Asset Management, Risk Assessments, Work Orders, Compliance Tracking, Offline Mobile App, Analytics Dashboards",
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Harmoniq Safety",
      url: "https://harmoniqsafety.com",
      logo: "https://harmoniqsafety.com/logo-black.svg",
      sameAs: [],
      contactPoint: { "@type": "ContactPoint", contactType: "customer service", availableLanguage: ["English", "Dutch", "Swedish"] },
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Harmoniq Safety",
      url: "https://harmoniqsafety.com",
      inLanguage: ["en-US", "nl-NL", "sv-SE"],
      potentialAction: {
        "@type": "SearchAction",
        target: "https://harmoniqsafety.com/?q={search_term_string}",
        "query-input": "required name=search_term_string",
      },
    },
  ];

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: t("faq_section.q1"),
        acceptedAnswer: { "@type": "Answer", text: t("faq_section.a1") },
      },
      {
        "@type": "Question",
        name: t("faq_section.q2"),
        acceptedAnswer: { "@type": "Answer", text: t("faq_section.a2") },
      },
      {
        "@type": "Question",
        name: t("faq_section.q3"),
        acceptedAnswer: { "@type": "Answer", text: t("faq_section.a3") },
      },
      {
        "@type": "Question",
        name: t("faq_section.q4"),
        acceptedAnswer: { "@type": "Answer", text: t("faq_section.a4") },
      },
    ],
  };

  return (
    <>
      <style>{`html { background-color: #000; }`}</style>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <MarketingI18nWrapper>
        {children}
      </MarketingI18nWrapper>
      <AnalyticsTracker settings={privacySettings} />
      <CookieConsentBanner
        settings={privacySettings}
        translations={{
          title: t("cookie.title"),
          description: t("cookie.description"),
          accept_all: t("cookie.accept_all"),
          reject_all: t("cookie.reject_all"),
          customize: t("cookie.customize"),
          necessary: t("cookie.necessary"),
          necessary_desc: t("cookie.necessary_desc"),
          analytics: t("cookie.analytics"),
          analytics_desc: t("cookie.analytics_desc"),
          marketing: t("cookie.marketing"),
          marketing_desc: t("cookie.marketing_desc"),
          save_preferences: t("cookie.save_preferences"),
        }}
      />
    </>
  );
}
