"use client";

import { useEffect } from "react";
import { useTranslation } from "@/i18n";
import { useRouter } from "next/navigation";
import { useCompanyParam } from "@/hooks/use-company-param";

/**
 * Legacy /app/tasks page — redirects to the Safety tab (/app/checklists).
 * The tasks content is now embedded in the Safety tab.
 */
export default function TasksPage() {
  const router = useRouter();
  const company = useCompanyParam();

  useEffect(() => {
    router.replace(`/${company}/app/checklists`);
  }, [router, company]);

  return null;
}
