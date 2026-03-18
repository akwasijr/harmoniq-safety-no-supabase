"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCompanyParam } from "@/hooks/use-company-param";

export default function TasksPage() {
  const router = useRouter();
  const company = useCompanyParam();

  useEffect(() => {
    router.replace(`/${company}/app/checklists?tab=tasks`);
  }, [router, company]);

  return null;
}
