import { redirect } from "next/navigation";

/**
 * /admin — server-side redirect to login in platform mode.
 * HTTP 307 redirect, no client JavaScript needed.
 */
export default function AdminLoginPage() {
  redirect("/login?mode=platform");
}
