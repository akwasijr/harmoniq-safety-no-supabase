import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import {
  Geist,
  Geist_Mono,
  IBM_Plex_Sans,
  Inter,
  Manrope,
  Playfair_Display,
  Plus_Jakarta_Sans,
  Public_Sans,
  Source_Sans_3,
  Work_Sans,
} from "next/font/google";
import { ThemeProvider } from "@/components/shared/theme-provider";
import { RouteProgress } from "@/components/shared/route-progress";
import { validateEnv } from "@/lib/env";
import { getSiteUrl } from "@/lib/site-url";
import "./globals.css";

// Validate env vars once at startup (server-only, runs during module init)
validateEnv();

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
});

const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
});

const sourceSans3 = Source_Sans_3({
  variable: "--font-source-sans-3",
  subsets: ["latin"],
});

const workSans = Work_Sans({
  variable: "--font-work-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Harmoniq Safety — Workplace Safety & Asset Management Platform",
    template: "%s | Harmoniq Safety",
  },
  description:
    "All-in-one EHS platform: report incidents, run safety inspections, manage assets, track compliance. Built for construction, manufacturing, oil & gas, and more. OSHA, Arbowet, ISO 45001 ready.",
  keywords: [
    "workplace safety platform",
    "EHS software",
    "incident reporting software",
    "safety inspection app",
    "asset management system",
    "safety compliance software",
    "risk assessment tool",
    "OSHA compliance software",
    "Arbowet compliance",
    "ISO 45001 software",
    "maintenance management",
    "asset tracking",
    "safety checklist app",
    "construction safety software",
    "manufacturing safety",
    "oil gas safety management",
    "warehouse safety inspection",
    "mobile safety app",
    "offline safety inspection",
    "work order management",
    "CMMS software",
    "veiligheid software",
    "arbetsmiljö programvara",
  ],
  authors: [{ name: "Harmoniq Safety" }],
  creator: "Harmoniq Safety",
  publisher: "Harmoniq Safety",
  metadataBase: new URL(getSiteUrl()),
  category: "Business Software",
  classification: "Environment, Health & Safety Software",
  openGraph: {
    type: "website",
    locale: "en_US",
    alternateLocale: ["nl_NL", "sv_SE"],
    siteName: "Harmoniq Safety",
    title: "Harmoniq Safety — Workplace Safety & Asset Management Platform",
    description: "Report incidents, run inspections, track assets, and ensure compliance. All-in-one EHS platform for industrial organizations.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Harmoniq Safety — Workplace Safety & Asset Management Platform" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Harmoniq Safety — All-in-one EHS Platform",
    description: "Report incidents, run safety inspections, track assets & ensure compliance. OSHA, Arbowet, ISO 45001 ready.",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: "/",
    languages: {
      "en-US": "/",
      "nl-NL": "/?lang=nl",
      "sv-SE": "/?lang=sv",
      "x-default": "/",
    },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Harmoniq Safety",
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "32x32" },
    ],
    apple: [
      { url: "/favicon.svg" },
    ],
  },
  verification: {
    // Add your verification codes when available:
    // google: "your-google-verification-code",
    // yandex: "your-yandex-verification-code",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} ${inter.variable} ${ibmPlexSans.variable} ${manrope.variable} ${plusJakartaSans.variable} ${publicSans.variable} ${sourceSans3.variable} ${workSans.variable} font-sans antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <Suspense fallback={null}>
            <RouteProgress />
          </Suspense>
          <a href="#main-content" className="skip-link">
            Skip to main content
          </a>
          <main id="main-content">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
