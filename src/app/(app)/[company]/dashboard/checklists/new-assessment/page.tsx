"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCompanyParam } from "@/hooks/use-company-param";
import { ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useChecklistTemplatesStore } from "@/stores/checklists-store";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/hooks/use-auth";
import { useCompanyStore } from "@/stores/company-store";
import { useTranslation } from "@/i18n";
import { RoleGuard } from "@/components/auth/role-guard";
import type { ChecklistTemplate } from "@/types";

export default function NewAssessmentPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const company = useCompanyParam();
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
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
      description: description.trim() || null,
      category: "risk_assessment",
      assignment: "all",
      recurrence: "daily",
      publish_status: "draft",
      items: [
        {
          id: crypto.randomUUID(),
          question: "Describe the hazard or task being assessed",
          type: "text",
          required: true,
          order: 1,
        },
        {
          id: crypto.randomUUID(),
          question: "Identify persons at risk",
          type: "text",
          required: true,
          order: 2,
        },
        {
          id: crypto.randomUUID(),
          question: "Are existing controls adequate?",
          type: "yes_no_na",
          required: true,
          order: 3,
        },
        {
          id: crypto.randomUUID(),
          question: "Rate the severity of potential harm (1-5)",
          type: "rating",
          required: true,
          order: 4,
        },
        {
          id: crypto.randomUUID(),
          question: "Rate the probability of occurrence (1-5)",
          type: "rating",
          required: true,
          order: 5,
        },
        {
          id: crypto.randomUUID(),
          question: "Is the risk level acceptable?",
          type: "yes_no_na",
          required: true,
          order: 6,
        },
        {
          id: crypto.randomUUID(),
          question: "Describe additional control measures required",
          type: "text",
          required: false,
          order: 7,
        },
        {
          id: crypto.randomUUID(),
          question: "Is the residual risk acceptable after controls?",
          type: "yes_no_na",
          required: true,
          order: 8,
        },
      ],
      is_active: false,
      created_at: now,
      updated_at: now,
    };
    addTemplate(template);
    toast("Risk assessment template created");
    router.push(`/${company}/dashboard/checklists/${template.id}`);
    setIsSubmitting(false);
  };

  return (
    <RoleGuard requiredPermission="checklists.create_templates">
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Create Risk Assessment</h1>
            <p className="text-sm text-muted-foreground">
              Create a custom risk assessment template with hazard identification, severity/probability ratings, and control measures.
            </p>
          </div>
          <Link href={`/${company}/dashboard/checklists/my-templates`}>
            <Button variant="outline">Back to Templates</Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Assessment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Assessment Name</Label>
              <Input
                id="name"
                placeholder="e.g. Working at Height Risk Assessment"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="Brief description of what this assessment covers..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              A standard risk assessment template will be created with 8 items covering hazard description, risk ratings, and controls. You can customize all items after creation.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Link href={`/${company}/dashboard/checklists/my-templates`}>
                <Button variant="outline">{t("common.cancel")}</Button>
              </Link>
              <Button className="gap-2" onClick={handleSave} disabled={!name.trim() || isSubmitting}>
                <ShieldAlert className="h-4 w-4" aria-hidden="true" />
                {isSubmitting ? t("common.loading") : "Create Assessment"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </RoleGuard>
  );
}
