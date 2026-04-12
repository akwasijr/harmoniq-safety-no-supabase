"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCompanyParam } from "@/hooks/use-company-param";
import {
  Layers, Plus, Trash2, GripVertical, ShieldAlert, ClipboardCheck,
  ChevronDown, ArrowUp, ArrowDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useCompanyData } from "@/hooks/use-company-data";
import { useAuth } from "@/hooks/use-auth";
import { useCompanyStore } from "@/stores/company-store";
import { useToast } from "@/components/ui/toast";
import { useTranslation } from "@/i18n";
import { RoleGuard } from "@/components/auth/role-guard";
import { getTemplatePublishStatus } from "@/lib/template-activation";
import type { ProcedureStep, ProcedureRecurrence } from "@/types";

const RECURRENCE_OPTIONS: { value: ProcedureRecurrence; label: string }[] = [
  { value: "per_event", label: "Per event (triggered manually)" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annual", label: "Annually" },
];

interface DraftStep {
  id: string;
  type: "checklist" | "risk_assessment";
  template_id: string;
  template_name: string;
  required: boolean;
}

export default function NewProcedurePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const company = useCompanyParam();
  const { toast } = useToast();
  const { user } = useAuth();
  const { items: companies } = useCompanyStore();
  const { checklistTemplates, stores } = useCompanyData();
  const { add: addProcedure } = stores.procedureTemplates;

  const companyId =
    (companies.find((c) => c.slug === company) || companies[0])?.id ||
    user?.company_id ||
    "";

  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [recurrence, setRecurrence] = React.useState<ProcedureRecurrence>("per_event");
  const [steps, setSteps] = React.useState<DraftStep[]>([]);
  const [showStepPicker, setShowStepPicker] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Available templates split by category
  const publishedTemplates = React.useMemo(() => {
    return checklistTemplates.filter((t) => getTemplatePublishStatus(t) === "published");
  }, [checklistTemplates]);

  const checklistOptions = React.useMemo(
    () => publishedTemplates.filter((t) => t.category !== "risk_assessment"),
    [publishedTemplates],
  );
  const assessmentOptions = React.useMemo(
    () => publishedTemplates.filter((t) => t.category === "risk_assessment"),
    [publishedTemplates],
  );

  const addStep = (templateId: string, templateName: string, type: "checklist" | "risk_assessment") => {
    setSteps((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type,
        template_id: templateId,
        template_name: templateName,
        required: true,
      },
    ]);
    setShowStepPicker(false);
  };

  const removeStep = (id: string) => setSteps((prev) => prev.filter((s) => s.id !== id));

  const moveStep = (idx: number, dir: -1 | 1) => {
    setSteps((prev) => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const toggleRequired = (id: string) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, required: !s.required } : s)));
  };

  const handleSave = () => {
    if (!name.trim() || steps.length === 0) return;
    setIsSubmitting(true);
    const now = new Date().toISOString();
    const procedureSteps: ProcedureStep[] = steps.map((s, idx) => ({
      id: s.id,
      order: idx + 1,
      type: s.type,
      template_id: s.template_id,
      template_name: s.template_name,
      required: s.required,
    }));

    addProcedure({
      id: crypto.randomUUID(),
      company_id: companyId,
      name: name.trim(),
      description: description.trim() || null,
      industry: null,
      steps: procedureSteps,
      recurrence,
      is_builtin: false,
      is_active: false,
      created_at: now,
      updated_at: now,
    });

    toast("Procedure created as draft");
    router.push(`/${company}/dashboard/checklists/my-templates`);
    setIsSubmitting(false);
  };

  const isValid = name.trim().length > 0 && steps.length > 0;

  return (
    <RoleGuard requiredPermission="checklists.create_templates">
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Create Procedure</h1>
            <p className="text-sm text-muted-foreground">
              Build a multi-step procedure combining risk assessments and checklists.
            </p>
          </div>
          <Link href={`/${company}/dashboard/checklists/my-templates`}>
            <Button variant="outline">Back to Templates</Button>
          </Link>
        </div>

        {/* Basics */}
        <Card>
          <CardHeader><CardTitle>Procedure Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="proc-name">Procedure Name</Label>
              <Input id="proc-name" placeholder="e.g. Confined Space Entry Procedure" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="proc-desc">Description (optional)</Label>
              <Textarea id="proc-desc" placeholder="Describe what this procedure covers..." value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="proc-recurrence">How often should this procedure be performed?</Label>
              <div className="relative">
                <select
                  id="proc-recurrence"
                  value={recurrence}
                  onChange={(e) => setRecurrence(e.target.value as ProcedureRecurrence)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm appearance-none pr-8"
                >
                  {RECURRENCE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Steps */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Steps ({steps.length})</CardTitle>
              <Button size="sm" variant="outline" className="gap-2" onClick={() => setShowStepPicker(true)}>
                <Plus className="h-4 w-4" />Add Step
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {steps.length === 0 ? (
              <div className="text-center py-8">
                <Layers className="h-10 w-10 text-muted-foreground/40 mx-auto" />
                <p className="mt-3 text-sm text-muted-foreground">No steps yet. Add risk assessments and checklists to build your procedure.</p>
                <Button size="sm" className="mt-4 gap-2" onClick={() => setShowStepPicker(true)}>
                  <Plus className="h-4 w-4" />Add First Step
                </Button>
              </div>
            ) : (
              steps.map((step, idx) => (
                <div key={step.id} className="flex items-center gap-3 rounded-lg border p-3">
                  <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold bg-muted text-muted-foreground">{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{step.template_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs",
                          step.type === "risk_assessment"
                            ? "text-orange-600 border-orange-300 dark:text-orange-400 dark:border-orange-700"
                            : "text-blue-600 border-blue-300 dark:text-blue-400 dark:border-blue-700",
                        )}
                      >
                        {step.type === "risk_assessment" ? "Risk Assessment" : "Checklist"}
                      </Badge>
                      <button onClick={() => toggleRequired(step.id)} className="text-xs text-muted-foreground hover:text-foreground">
                        {step.required ? "Required" : "Optional"}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => moveStep(idx, -1)} disabled={idx === 0} className="p-1 rounded hover:bg-muted disabled:opacity-30" aria-label="Move up">
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => moveStep(idx, 1)} disabled={idx === steps.length - 1} className="p-1 rounded hover:bg-muted disabled:opacity-30" aria-label="Move down">
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => removeStep(step.id)} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-destructive" aria-label="Remove">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Save */}
        <div className="flex justify-end gap-3">
          <Link href={`/${company}/dashboard/checklists/my-templates`}>
            <Button variant="outline">{t("common.cancel")}</Button>
          </Link>
          <Button className="gap-2" onClick={handleSave} disabled={!isValid || isSubmitting}>
            <Layers className="h-4 w-4" aria-hidden="true" />
            {isSubmitting ? t("common.loading") : "Create Procedure"}
          </Button>
        </div>

        {/* Step Picker Modal */}
        {showStepPicker && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowStepPicker(false)}>
            <div className="relative w-full max-w-lg mx-4 max-h-[70vh] overflow-y-auto rounded-lg bg-background p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-lg font-semibold mb-4">Add Step</h2>
              <p className="text-sm text-muted-foreground mb-4">Choose a published checklist or risk assessment to add as a step.</p>

              {assessmentOptions.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-2">
                    <ShieldAlert className="h-3.5 w-3.5 text-orange-500" />Risk Assessments
                  </p>
                  <div className="space-y-1">
                    {assessmentOptions.map((tpl) => (
                      <button
                        key={tpl.id}
                        onClick={() => addStep(tpl.id, tpl.name, "risk_assessment")}
                        className="w-full flex items-center gap-3 rounded-md px-3 py-2.5 text-sm hover:bg-muted text-left transition-colors"
                      >
                        <ShieldAlert className="h-4 w-4 text-orange-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{tpl.name}</p>
                          <p className="text-xs text-muted-foreground">{tpl.items.length} items</p>
                        </div>
                        <Badge variant="outline" className="text-xs text-orange-600 border-orange-300 dark:text-orange-400">RA</Badge>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {checklistOptions.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-2">
                    <ClipboardCheck className="h-3.5 w-3.5 text-blue-500" />Checklists
                  </p>
                  <div className="space-y-1">
                    {checklistOptions.map((tpl) => (
                      <button
                        key={tpl.id}
                        onClick={() => addStep(tpl.id, tpl.name, "checklist")}
                        className="w-full flex items-center gap-3 rounded-md px-3 py-2.5 text-sm hover:bg-muted text-left transition-colors"
                      >
                        <ClipboardCheck className="h-4 w-4 text-blue-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{tpl.name}</p>
                          <p className="text-xs text-muted-foreground">{tpl.items.length} items</p>
                        </div>
                        <Badge variant="outline" className="text-xs text-blue-600 border-blue-300 dark:text-blue-400">CL</Badge>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {checklistOptions.length === 0 && assessmentOptions.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">No published templates available. Push checklist or risk assessment templates to the field app first, then add them as procedure steps.</p>
                </div>
              )}

              <div className="mt-4 flex justify-end">
                <Button variant="outline" onClick={() => setShowStepPicker(false)}>Cancel</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
