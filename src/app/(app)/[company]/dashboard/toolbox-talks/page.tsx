"use client";

import { Clock } from "lucide-react";
import { useTranslation } from "@/i18n";

export default function ComingSoonPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Clock className="h-8 w-8 text-muted-foreground" />
      </div>
      <h1 className="text-2xl font-semibold mb-2">Coming Soon</h1>
      <p className="text-muted-foreground max-w-md">
        This feature is currently under development and will be available in an upcoming release.
      </p>
    </div>
  );
}
