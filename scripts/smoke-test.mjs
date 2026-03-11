#!/usr/bin/env node

const rawBaseUrl = process.argv[2] || process.env.SITE_URL;

if (!rawBaseUrl) {
  console.error("Usage: npm run smoke:test -- https://your-site.example");
  process.exit(1);
}

const baseUrl = rawBaseUrl.replace(/\/+$/, "");

const checks = [
  { path: "/api/health", method: "GET", expectedStatus: 200, label: "health GET" },
  { path: "/api/health", method: "HEAD", expectedStatus: 200, label: "health HEAD" },
  { path: "/", method: "GET", expectedStatus: 200, label: "home" },
  { path: "/login", method: "GET", expectedStatus: 200, label: "login" },
  { path: "/reset-password", method: "GET", expectedStatus: 200, label: "reset password" },
  { path: "/contact", method: "GET", expectedStatus: 200, label: "contact" },
  { path: "/privacy", method: "GET", expectedStatus: 200, label: "privacy" },
  { path: "/terms", method: "GET", expectedStatus: 200, label: "terms" },
  { path: "/gdpr", method: "GET", expectedStatus: 200, label: "gdpr" },
  { path: "/cookies", method: "GET", expectedStatus: 200, label: "cookies" },
  { path: "/robots.txt", method: "GET", expectedStatus: 200, label: "robots" },
  { path: "/sitemap.xml", method: "GET", expectedStatus: 200, label: "sitemap" },
];

let hasFailure = false;

for (const check of checks) {
  const url = `${baseUrl}${check.path}`;

  try {
    const response = await fetch(url, {
      method: check.method,
      redirect: "manual",
      headers: check.method === "GET" ? { Accept: "text/html,application/json,application/xml;q=0.9,*/*;q=0.8" } : undefined,
    });

    if (response.status !== check.expectedStatus) {
      hasFailure = true;
      const location = response.headers.get("location");
      const locationNote = location ? ` -> ${location}` : "";
      console.error(`FAIL ${check.label}: expected ${check.expectedStatus}, got ${response.status} (${url}${locationNote})`);
      continue;
    }

    console.log(`PASS ${check.label}: ${response.status} (${url})`);
  } catch (error) {
    hasFailure = true;
    const message = error instanceof Error ? error.message : String(error);
    console.error(`FAIL ${check.label}: ${message} (${url})`);
  }
}

process.exit(hasFailure ? 1 : 0);
