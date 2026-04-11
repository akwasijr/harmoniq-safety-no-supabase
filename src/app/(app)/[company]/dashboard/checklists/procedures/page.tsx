"use client";

import * as React from "react";
import Link from "next/link";
import { useCompanyParam } from "@/hooks/use-company-param";
import {
  ClipboardCheck,
  Library,
  FileText,
  Plus,
  Search,
  ChevronUp,
  ChevronDown,
  Trash2,
  X,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useCompanyData } from "@/hooks/use-company-data";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "@/i18n";
import { RoleGuard } from "@/components/auth/role-guard";
import { getBuiltInProcedureTemplates } from "@/data/procedure-templates";
import type { ProcedureTemplate, ProcedureStep, ProcedureRecurrence } from "@/types";

const RECURRENCE_LABELS: Record<ProcedureRecurrence, string> = {
  per_event: "Per Event",
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  annual: "Annual",
};

function ProcedureTemplatesContent() {
  const company = useCompanyParam();
  const { t } = useTranslation();
  const { currentCompany } = useAuth();
  const { procedureTemplates, checklistTemplates, stores } = useCompanyData();
  const { add: addProcedure, update: updateProcedure } = stores.procedureTemplates;

  const [searchQuery, setSearchQuery] = React.useState("");
  const [showCreateModal, setShowCreateModal] = React.useState(false);

  // Merge built-in (filtered by company industry) with custom templates
  const companyIndustry = currentCompany?.industry;
  const companyIndustries = currentCompany?.industries || [];
  const allIndustries = new Set<string>([
    ...(companyIndustry ? [companyIndustry] : []),
    ...companyIndustries,
  ]);

  const builtInTemplates = getBuiltInProcedureTemplates().filter(
    (tpl) => !tpl.industry || allIndustries.has(tpl.industry)
  );

  const allTemplates = React.useMemo(() => {
    const customTemplates = procedureTemplates.filter(
      (tpl) => !tpl.is_builtin
    );
    const builtInIds = new Set(builtInTemplates.map((b) => b.id));
    return [
      ...builtInTemplates,
      ...customTemplates.filter((c) => !builtInIds.has(c.id)),
    ];
  }, [procedureTemplates, builtInTemplates]);

  const filteredTemplates = allTemplates.filter((tpl) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      tpl.name.toLowerCase().includes(q) ||
      (tpl.description || "").toLowerCase().includes(q) ||
      (tpl.industry || "").toLowerCase().includes(q)
    );
  });

  const handleToggleActive = (tpl: ProcedureTemplate) => {
    updateProcedure(tpl.id, {
      is_active: !tpl.is_active,
      updated_at: new Date().toISOString(),
    });
  };

  // ── Create Modal State ──
  const [newName, setNewName] = React.useState("");
  const [newDescription, setNewDescription] = React.useState("");
  const [newRecurrence, setNewRecurrence] = React.useState<ProcedureRecurrence>("per_event");
  const [newSteps, setNewSteps] = React.useState<ProcedureStep[]>([]);

  const resetForm = () => {
    setNewName("");
    setNewDescription("");
    setNewRecurrence("per_event");
    setNewSteps([]);
  };

  const publishedChecklistTemplates = checklistTemplates.filter(
    (t) =>
      t.publish_status === "published" || t.is_active
  );

  const addStep = () => {
    const order = newSteps.length + 1;
    setNewSteps([
      ...newSteps,
      {
        id: `step_custom_${Date.now()}_${order}`,
        order,
        type: "checklist",
        template_id: "",
        template_name: "",
        required: true,
      },
    ]);
  };

  const updateStep = (index: number, updates: Partial<ProcedureStep>) => {
    setNewSteps((prev) =>
      prev.map((s, i) => (i === index ? { ...s, ...updates } : s))
    );
  };

  const removeStep = (index: number) => {
    setNewSteps((prev) =>
      prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, order: i + 1 }))
    );
  };

  const moveStep = (index: number, direction: "up" | "down") => {
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= newSteps.length) return;
    setNewSteps((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next.map((s, i) => ({ ...s, order: i + 1 }));
    });
  };

  const handleCreate = () => {
    if (!newName.trim() || newSteps.length === 0) return;
    const now = new Date().toISOString();
    const template: ProcedureTemplate = {
      id: `proc_custom_${Date.now()}`,
      company_id: currentCompany?.id || "",
      name: newName.trim(),
      description: newDescription.trim() || null,
      industry: companyIndustry || null,
      steps: newSteps,
      recurrence: newRecurrence,
      is_builtin: false,
      is_active: true,
      created_at: now,
      updated_at: now,
    };
    addProcedure(template);
    resetForm();
    setShowCreateModal(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">
          {t("industry_templates._ui.myTemplates")}
        </h1>
        <Button size="sm" className="gap-2" onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4" />
          New Procedure
        </Button>
      </div>

      {/* Top-level Tabs */}
      <div className="border-b">
        <div className="flex gap-4">
          <Link
            href={`/${company}/dashboard/checklists/my-templates`}
            className="flex items-center gap-2 py-3 px-1 text-sm font-medium transition-colors relative whitespace-nowrap text-muted-foreground hover:text-foreground"
          >
            <ClipboardCheck className="h-4 w-4 shrink-0" />
            {t("industry_templates._ui.myTemplates")}
          </Link>
          <Link
            href={`/${company}/dashboard/checklists/templates`}
            className="flex items-center gap-2 py-3 px-1 text-sm font-medium transition-colors relative whitespace-nowrap text-muted-foreground hover:text-foreground"
          >
            <Library className="h-4 w-4 shrink-0" />
            {t("industry_templates._ui.templateLibrary")}
          </Link>
          <button
            className={cn(
              "flex items-center gap-2 py-3 px-1 text-sm font-medium transition-colors relative whitespace-nowrap",
              "text-primary"
            )}
          >
            <FileText className="h-4 w-4 shrink-0" />
            Procedure Templates
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search procedures..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Template List */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="p-4 font-medium">Procedure</th>
                  <th className="p-4 font-medium">Steps</th>
                  <th className="p-4 font-medium hidden sm:table-cell">Industry</th>
                  <th className="p-4 font-medium hidden md:table-cell">Recurrence</th>
                  <th className="p-4 font-medium text-right">Active</th>
                </tr>
              </thead>
              <tbody>
                {filteredTemplates.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-muted-foreground">
                      <Layers className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">No procedure templates found.</p>
                    </td>
                  </tr>
                ) : (
                  filteredTemplates.map((tpl) => (
                    <tr
                      key={tpl.id}
                      className="border-b last:border-0 hover:bg-muted/50 transition-colors"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                            <Layers className="h-4 w-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{tpl.name}</p>
                            {tpl.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1">{tpl.description}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge variant="outline" className="text-xs">
                          {tpl.steps.length} step{tpl.steps.length !== 1 ? "s" : ""}
                        </Badge>
                      </td>
                      <td className="p-4 hidden sm:table-cell">
                        {tpl.industry ? (
                          <Badge variant="info" className="text-xs">
                            {tpl.industry.replace(/_/g, " ")}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="p-4 hidden md:table-cell">
                        <Badge variant="secondary" className="text-xs">
                          {RECURRENCE_LABELS[tpl.recurrence]}
                        </Badge>
                      </td>
                      <td className="p-4 text-right">
                        <Switch
                          checked={tpl.is_active}
                          onCheckedChange={() => handleToggleActive(tpl)}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Create Procedure Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => { setShowCreateModal(false); resetForm(); }}
        >
          <div
            className="bg-background rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b p-4">
              <h2 className="text-lg font-semibold">New Procedure</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => { setShowCreateModal(false); resetForm(); }}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Body */}
            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              {/* Name */}
              <div className="space-y-1.5">
                <label htmlFor="proc-name" className="text-sm font-medium">
                  Name
                </label>
                <Input
                  id="proc-name"
                  placeholder="e.g. Hot Work Procedure"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label htmlFor="proc-desc" className="text-sm font-medium">
                  Description
                </label>
                <Textarea
                  id="proc-desc"
                  placeholder="Describe what this procedure covers..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Recurrence */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Recurrence</label>
                <Select value={newRecurrence} onValueChange={(v) => setNewRecurrence(v as ProcedureRecurrence)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select recurrence" />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(RECURRENCE_LABELS) as [ProcedureRecurrence, string][]).map(
                      ([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Steps */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">
                    Steps ({newSteps.length})
                  </label>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={addStep}>
                    <Plus className="h-3.5 w-3.5" />
                    Add Step
                  </Button>
                </div>

                {newSteps.length === 0 && (
                  <div className="rounded-lg border border-dashed p-6 text-center">
                    <Layers className="h-6 w-6 mx-auto mb-2 text-muted-foreground opacity-50" />
                    <p className="text-sm text-muted-foreground">
                      No steps added yet. Add checklist or risk assessment steps to build this procedure.
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  {newSteps.map((step, idx) => (
                    <div
                      key={step.id}
                      className="flex items-start gap-2 rounded-lg border p-3 bg-muted/30"
                    >
                      {/* Order number */}
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary shrink-0 mt-1">
                        {idx + 1}
                      </span>

                      <div className="flex-1 space-y-2 min-w-0">
                        {/* Type select */}
                        <Select
                          value={step.type}
                          onValueChange={(v) =>
                            updateStep(idx, {
                              type: v as "checklist" | "risk_assessment",
                              template_id: "",
                              template_name: "",
                            })
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Step type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="checklist">Checklist</SelectItem>
                            <SelectItem value="risk_assessment">Risk Assessment</SelectItem>
                          </SelectContent>
                        </Select>

                        {/* Template select */}
                        <Select
                          value={step.template_id}
                          onValueChange={(v) => {
                            const tpl = publishedChecklistTemplates.find((t) => t.id === v);
                            updateStep(idx, {
                              template_id: v,
                              template_name: tpl?.name || v,
                            });
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a template" />
                          </SelectTrigger>
                          <SelectContent>
                            {publishedChecklistTemplates.length === 0 ? (
                              <SelectItem value="__none__" disabled>
                                No published templates
                              </SelectItem>
                            ) : (
                              publishedChecklistTemplates.map((tpl) => (
                                <SelectItem key={tpl.id} value={tpl.id}>
                                  {tpl.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-0.5 shrink-0">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => moveStep(idx, "up")}
                          className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                          title="Move up"
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === newSteps.length - 1}
                          onClick={() => moveStep(idx, "down")}
                          className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                          title="Move down"
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeStep(idx)}
                          className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors"
                          title="Remove step"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t p-4 flex items-center justify-end gap-2 bg-muted/30">
              <Button variant="outline" onClick={() => { setShowCreateModal(false); resetForm(); }}>
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!newName.trim() || newSteps.length === 0}
              >
                Create Procedure
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProcedureTemplatesPage() {
  return (
    <RoleGuard requiredPermission="checklists.view">
      <ProcedureTemplatesContent />
    </RoleGuard>
  );
}
