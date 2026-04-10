import type { MetadataRoute } from "next";
import { buildSiteUrl, getSiteUrl } from "@/lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const pages: { path: string; freq: "weekly" | "monthly" | "yearly"; priority: number }[] = [
    { path: "/", freq: "weekly", priority: 1.0 },
    { path: "/contact", freq: "monthly", priority: 0.8 },
    { path: "/login", freq: "monthly", priority: 0.6 },
    { path: "/privacy", freq: "yearly", priority: 0.3 },
    { path: "/terms", freq: "yearly", priority: 0.3 },
    { path: "/gdpr", freq: "yearly", priority: 0.3 },
    { path: "/cookies", freq: "yearly", priority: 0.3 },
  ];

  // Generate entries with hreflang alternates for each locale
  return pages.map((page) => ({
    url: page.path === "/" ? getSiteUrl() : buildSiteUrl(page.path),
    lastModified: now,
    changeFrequency: page.freq,
    priority: page.priority,
    alternates: {
      languages: {
        "en-US": page.path === "/" ? getSiteUrl() : buildSiteUrl(page.path),
        "nl-NL": buildSiteUrl(`${page.path}${page.path === "/" ? "" : ""}?lang=nl`),
        "sv-SE": buildSiteUrl(`${page.path}${page.path === "/" ? "" : ""}?lang=sv`),
      },
    },
  }));
}
