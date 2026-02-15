"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCompanyParam } from "@/hooks/use-company-param";
import { ClipboardCheck } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useChecklistTemplatesStore } from "@/stores/checklists-store";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/hooks/use-auth";
import { useCompanyStore } from "@/stores/company-store";
import type { ChecklistTemplate } from "@/types";
import { useTranslation } from "@/i18n";

export default function NewChecklistPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const company = useCompanyParam();
  const [name, setName] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { add: addTemplate } = useChecklistTemplatesStore();
  const { toast } = useToast();
  const { user } = useAuth();
  const { items: companies } = useCompanyStore();

  const companyId =
    (companies.find((c) => c.slug === company) || companies[0])?.id ||
    user?.company_id ||
    "";

  const handleSave = () => {
    if (!name.trim()) return;
    setIsSubmitting(true);
    const now = new Date().toISOString();
    const template: ChecklistTemplate = {
      id: crypto.randomUUID(),
      company_id: companyId,
      name: name.trim(),
      description: null,
      category: "general",
      assignment: "all",
      recurrence: "daily",
      items: [
        {
          id: crypto.randomUUID(),
          question: "Checklist item 1",
          type: "yes_no_na",
          required: true,
          order: 1,
        },
      ],
      is_active: true,
      created_at: now,
      updated_at: now,
    };
    addTemplate(template);
    toast("Checklist template created");
    router.push(`/${company}/dashboard/checklists/${template.id}`);
    setIsSubmitting(false);
  };

  const isValid = name.trim().length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="heading-2">Create checklist</h1>
          <p className="text-sm text-muted-foreground">
            Give your checklist a name to get started.
          </p>
        </div>
        <Link href={`/${company}/dashboard/checklists`}>
          <Button variant="outline">Back to checklists</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Checklist basics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="Daily forklift inspection"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Link href={`/${company}/dashboard/checklists`}>
              <Button variant="outline">{t("common.cancel")}</Button>
            </Link>
            <Button className="gap-2" onClick={handleSave} disabled={!isValid || isSubmitting}>
              <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
              {isSubmitting ? t("common.loading") : t("common.save")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
