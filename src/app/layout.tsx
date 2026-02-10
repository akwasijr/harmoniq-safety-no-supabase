import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import { ThemeProvider } from "@/components/shared/theme-provider";
import "./globals.css";

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

export const metadata: Metadata = {
  title: {
    default: "Harmoniq Safety — Workplace Safety & Asset Management Platform",
    template: "%s | Harmoniq Safety",
  },
  description:
    "Report incidents, manage risks, track assets, and ensure compliance. All-in-one safety and asset management platform for industrial organizations.",
  keywords: [
    "workplace safety platform",
    "incident reporting software",
    "asset management",
    "safety compliance",
    "risk management",
    "OSHA compliance",
    "safety inspection",
    "maintenance management",
    "EHS software",
    "asset tracking",
  ],
  authors: [{ name: "Harmoniq Safety" }],
  creator: "Harmoniq Safety",
  publisher: "Harmoniq Safety",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://harmoniqsafety.com"),
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Harmoniq Safety",
    title: "Harmoniq Safety — Workplace Safety & Asset Management Platform",
    description: "Report incidents, manage risks, track assets, and ensure compliance — all in one platform.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Harmoniq Safety Platform" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Harmoniq Safety",
    description: "All-in-one workplace safety and asset management platform.",
    images: ["/og-image.png"],
  },
  alternates: {
    languages: {
      en: "/",
      sv: "/?lang=sv",
      nl: "/?lang=nl",
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
        className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} font-sans antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <a href="#main-content" className="skip-link">
            Skip to main content
          </a>
          <main id="main-content">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
