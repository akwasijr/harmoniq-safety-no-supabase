"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCompanyParam } from "@/hooks/use-company-param";
import { useAuth } from "@/hooks/use-auth";
import { LoadingPage } from "@/components/ui/loading";

export default function TasksPage() {
  const router = useRouter();
  const company = useCompanyParam();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      router.replace(`/${company}/app/checklists?tab=tasks`);
    }
  }, [router, company, user]);

  if (!user) {
    return <LoadingPage />;
  }

  return null;
}
