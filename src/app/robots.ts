import type { MetadataRoute } from "next";
import { buildSiteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/*/dashboard/",
          "/*/app/",
          "/api/",
          "/auth/",
          "/_next/",
        ],
      },
      {
        userAgent: "GPTBot",
        disallow: ["/"],
      },
    ],
    sitemap: buildSiteUrl("/sitemap.xml"),
    host: buildSiteUrl("/"),
  };
}
