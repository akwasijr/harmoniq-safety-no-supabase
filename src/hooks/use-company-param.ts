"use client";

import { useParams } from "next/navigation";

/**
 * Shared hook to get the company slug from the URL.
 * Replaces the fragile Promise-based params pattern used across app pages.
 * Returns the company slug string directly (synchronous, no empty-string flash).
 */
export function useCompanyParam(): string {
  const params = useParams();
  return (params.company as string) || "";
}
