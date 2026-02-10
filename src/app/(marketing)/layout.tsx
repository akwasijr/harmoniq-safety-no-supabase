import { cookies } from "next/headers";
import { getMarketingTranslations, type MarketingLocale } from "@/i18n/marketing";
import { CookieConsentBanner } from "@/components/marketing/cookie-consent";
import { AnalyticsTracker } from "@/components/marketing/analytics-tracker";

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const locale = (cookieStore.get("harmoniq_locale")?.value || "en") as MarketingLocale;
  const t = getMarketingTranslations(locale);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Harmoniq Safety",
    applicationCategory: "BusinessApplication",
    description: "Workplace safety and asset management platform for industrial organizations",
    operatingSystem: "Web",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    author: { "@type": "Organization", name: "Harmoniq Safety" },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
      <AnalyticsTracker />
      <CookieConsentBanner
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
