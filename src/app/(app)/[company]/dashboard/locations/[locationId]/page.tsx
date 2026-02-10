"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import { useTranslation } from "@/i18n";

export default function LocationDetailPage() {
  const router = useRouter();
  const routeParams = useParams();
  const { t } = useTranslation();
  const company = routeParams.company as string;
  const locationId = routeParams.locationId as string;

  React.useEffect(() => {
    if (company && locationId) {
      router.replace(`/${company}/dashboard/locations?selected=${locationId}`);
    }
  }, [company, locationId, router]);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <p className="text-muted-foreground">{t("locations.redirecting")}</p>
    </div>
  );
}
