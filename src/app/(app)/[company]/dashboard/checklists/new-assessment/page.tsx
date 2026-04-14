"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCompanyParam } from "@/hooks/use-company-param";
import {
  ShieldAlert, Plus, Trash2, ArrowUp, ArrowDown, ArrowRight, ArrowLeft,
  ChevronDown, Save, Send, Check, Clock, Shield,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useChecklistTemplatesStore } from "@/stores/checklists-store";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/hooks/use-auth";
import { useCompanyStore } from "@/stores/company-store";
import { useTranslation } from "@/i18n";
import { RoleGuard } from "@/components/auth/role-guard";
import type { ChecklistTemplate, ChecklistItem } from "@/types";

const ITEM_TYPES: { value: ChecklistItem["type"]; label: string }[] = [
  { value: "text", label: "Text (free-form)" },
  { value: "yes_no_na", label: "Yes / No / N/A" },
  { value: "pass_fail", label: "Pass / Fail" },
  { value: "rating", label: "Rating (1-5)" },
  { value: "number", label: "Number" },
  { value: "photo", label: "Photo" },
  { value: "select", label: "Select" },
];

const FREQUENCY_OPTIONS = [
  { value: "daily", label: "Per event (before each task)" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "once", label: "Quarterly" },
];

const RA_FIELD_ANATOMY: { question: string; type: ChecklistItem["type"]; required: boolean; group: string }[] = [
  { question: "Describe the task or activity being assessed", type: "text", required: true, group: "Hazard Identification" },
  { question: "Identify the hazards associated with this task", type: "text", required: true, group: "Hazard Identification" },
  { question: "Who might be harmed and how?", type: "text", required: true, group: "Hazard Identification" },
  { question: "Rate the severity of potential harm (1-5)", type: "rating", required: true, group: "Risk Evaluation" },
  { question: "Rate the likelihood of occurrence (1-5)", type: "rating", required: true, group: "Risk Evaluation" },
  { question: "Are existing control measures in place?", type: "yes_no_na", required: true, group: "Risk Evaluation" },
  { question: "Describe existing control measures", type: "text", required: false, group: "Risk Evaluation" },
  { question: "Is the current risk level acceptable?", type: "yes_no_na", required: true, group: "Risk Decision" },
  { question: "Describe additional control measures required", type: "text", required: false, group: "Control Measures" },
  { question: "Rate residual risk severity after controls (1-5)", type: "rating", required: true, group: "Control Measures" },
  { question: "Rate residual risk likelihood after controls (1-5)", type: "rating", required: true, group: "Control Measures" },
  { question: "Is the residual risk acceptable?", type: "yes_no_na", required: true, group: "Control Measures" },
  { question: "Responsible person for implementing controls", type: "text", required: true, group: "Sign-off" },
  { question: "Review date set for re-assessment", type: "yes_no_na", required: false, group: "Sign-off" },
];

interface DraftItem {
  id: string;
  question: string;
  type: ChecklistItem["type"];
  required: boolean;
  group?: string;
}

export default function NewAssessmentPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const company = useCompanyParam();
  const { toast } = useToast();
  const { user } = useAuth();
  const { items: companies } = useCompanyStore();
  const { add: addTemplate, update: updateTemplate } = useChecklistTemplatesStore();

  const companyId = (companies.find((c) => c.slug === company) || companies[0])?.id || user?.company_id || "";

  const [step, setStep] = React.useState<1 | 2 | 3>(1);
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [regulation, setRegulation] = React.useState("");
  const [frequency, setFrequency] = React.useState("daily");
  const [useStandardFields, setUseStandardFields] = React.useState(false);
  const [items, setItems] = React.useState<DraftItem[]>([
    { id: crypto.randomUUID(), question: "", type: "text", required: true },
  ]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const draftIdRef = React.useRef<string | null>(null);
  const [draftSaved, setDraftSaved] = React.useState(false);

  const saveDraftToStore = React.useCallback(() => {
    const now = new Date().toISOString();
    const validItems = items.filter((i) => i.question.trim());
    const templateItems = (validItems.length > 0 ? validItems : [{ id: crypto.randomUUID(), question: "Hazard description", type: "text" as const, required: true }])
      .map((item, idx) => ({ id: item.id, question: item.question.trim() || `Field ${idx + 1}`, type: item.type, required: item.required, order: idx + 1 }));

    if (!draftIdRef.current) {
      draftIdRef.current = crypto.randomUUID();
      setDraftSaved(true);
      addTemplate({
        id: draftIdRef.current, company_id: companyId, name: name.trim() || "Untitled Assessment",
        description: description.trim() || null, category: "risk_assessment", assignment: "all",
        recurrence: frequency as ChecklistTemplate["recurrence"], regulation: regulation.trim() || undefined,
        publish_status: "draft", is_active: false, items: templateItems, created_at: now, updated_at: now,
      });
    } else {
      updateTemplate(draftIdRef.current, {
        name: name.trim() || "Untitled Assessment", description: description.trim() || null,
        recurrence: frequency as ChecklistTemplate["recurrence"], regulation: regulation.trim() || undefined,
        items: templateItems, updated_at: now,
      });
    }
  }, [name, description, regulation, frequency, items, companyId, addTemplate, updateTemplate]);

  React.useEffect(() => {
    if (step !== 2) return;
    const interval = setInterval(saveDraftToStore, 10_000);
    return () => clearInterval(interval);
  }, [step, saveDraftToStore]);

  const goToStep2 = () => {
    if (!name.trim()) { toast("Please enter an assessment name"); return; }
    saveDraftToStore();
    setStep(2);
  };

  const loadStandardFields = () => {
    setItems(RA_FIELD_ANATOMY.map((f) => ({ id: crypto.randomUUID(), question: f.question, type: f.type, required: f.required, group: f.group })));
    setUseStandardFields(true);
  };

  const startBlank = () => {
    setItems([{ id: crypto.randomUUID(), question: "", type: "text", required: true }]);
    setUseStandardFields(false);
  };

  const addItem = (group?: string) => setItems((prev) => [...prev, { id: crypto.randomUUID(), question: "", type: "text", required: true, group }]);

  const addSectionHeader = () => {
    setItems((prev) => [...prev, { id: crypto.randomUUID(), question: "", type: "text", required: true, group: "New Section" }]);
  };

  const updateItem = (id: string, field: keyof DraftItem, value: string | boolean) => {
    setItems((prev) => prev.map((item) => item.id === id ? { ...item, [field]: value } : item));
  };

  const updateSectionName = (oldName: string, newName: string) => {
    setItems((prev) => prev.map((item) => item.group === oldName ? { ...item, group: newName } : item));
  };

  const removeItem = (id: string) => { if (items.length > 1) setItems((prev) => prev.filter((item) => item.id !== id)); };

  const moveItem = (idx: number, dir: -1 | 1) => {
    setItems((prev) => {
      const next = [...prev]; const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]]; return next;
    });
  };

  const handleSave = (activate: boolean) => {
    const validItems = items.filter((i) => i.question.trim());
    if (validItems.length === 0) { toast("Add at least one assessment field"); return; }
    setIsSubmitting(true);
    const now = new Date().toISOString();
    const id = draftIdRef.current || crypto.randomUUID();

    if (draftIdRef.current) {
      updateTemplate(draftIdRef.current, {
        name: name.trim(), description: description.trim() || null, regulation: regulation.trim() || undefined,
        recurrence: frequency as ChecklistTemplate["recurrence"],
        publish_status: activate ? "published" : "draft", is_active: activate,
        items: validItems.map((item, idx) => ({ id: item.id, question: item.question.trim(), type: item.type, required: item.required, order: idx + 1 })),
        updated_at: now,
      });
    } else {
      addTemplate({
        id, company_id: companyId, name: name.trim(), description: description.trim() || null,
        category: "risk_assessment", assignment: "all", regulation: regulation.trim() || undefined,
        recurrence: frequency as ChecklistTemplate["recurrence"],
        publish_status: activate ? "published" : "draft", is_active: activate,
        items: validItems.map((item, idx) => ({ id: item.id, question: item.question.trim(), type: item.type, required: item.required, order: idx + 1 })),
        created_at: now, updated_at: now,
      });
    }
    toast(activate ? "Assessment created and pushed to field app" : "Assessment saved as draft", "success");
    router.push(`/${company}/dashboard/checklists/${id}`);
    setIsSubmitting(false);
  };

  // Group headers for standard fields
  const getGroupLabel = (idx: number): string | null => {
    const item = items[idx];
    if (!item?.group) return null;
    if (idx === 0) return item.group;
    if (item.group !== items[idx - 1]?.group) return item.group;
    return null;
  };

  const step1Valid = name.trim().length > 0;

  return (
    <RoleGuard requiredPermission="checklists.create_templates">
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Create Risk Assessment Template</h1>
            <p className="text-sm text-muted-foreground">Build a risk assessment with hazard identification, severity/probability ratings, and control measures.</p>
          </div>
          <Link href={`/${company}/dashboard/checklists/my-templates`}>
            <Button variant="outline">Back to Templates</Button>
          </Link>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={() => setStep(1)} className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors", step === 1 ? "bg-primary text-primary-foreground" : step > 1 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-muted text-muted-foreground")}>
            {step > 1 ? <Check className="h-4 w-4" /> : <span className="w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs font-bold">1</span>}
            Details
          </button>
          <div className="h-px w-6 bg-border" />
          <button onClick={() => step > 1 ? setStep(2) : undefined} className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors", step === 2 ? "bg-primary text-primary-foreground" : step > 2 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-muted text-muted-foreground")}>
            {step > 2 ? <Check className="h-4 w-4" /> : <span className="w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs font-bold">2</span>}
            Fields ({items.filter((i) => i.question.trim()).length})
          </button>
          <div className="h-px w-6 bg-border" />
          <div className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors", step === 3 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
            <span className="w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs font-bold">3</span>
            Preview
          </div>
          {step >= 2 && draftSaved && <span className="ml-auto text-xs text-muted-foreground">Auto-saving draft...</span>}
        </div>

        {/* STEP 1 */}
        {step === 1 && (
          <>
            <Card>
              <CardHeader><CardTitle>Assessment Details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="ra-name">Assessment Name *</Label>
                  <Input id="ra-name" placeholder="e.g. Working at Height Risk Assessment" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ra-desc">Description</Label>
                  <Textarea id="ra-desc" placeholder="What hazards does this assessment cover?" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="ra-regulation">Applicable Regulation</Label>
                    <Input id="ra-regulation" placeholder="e.g. OSHA 29 CFR 1926.501" value={regulation} onChange={(e) => setRegulation(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ra-freq">Frequency</Label>
                    <div className="relative">
                      <select id="ra-freq" value={frequency} onChange={(e) => setFrequency(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm appearance-none pr-8">
                        {FREQUENCY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <div className="flex justify-end">
              <Button className="gap-2" onClick={goToStep2} disabled={!step1Valid}>
                Next: Assessment Fields <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <>
            {/* Template selector — blank first */}
            <div className="flex items-center gap-3">
              <Button size="sm" variant={!useStandardFields ? "default" : "outline"} onClick={startBlank}>
                Start from Blank
              </Button>
              <Button size="sm" variant={useStandardFields ? "default" : "outline"} onClick={loadStandardFields}>
                Load Standard RA Fields ({RA_FIELD_ANATOMY.length})
              </Button>
            </div>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Assessment Fields ({items.length})</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      {useStandardFields ? "Standard fields: Hazard Identification → Risk Evaluation → Controls → Sign-off. Edit section names and fields as needed." : "Add fields and section headers to organize your assessment."}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="gap-2" onClick={addSectionHeader}>
                      <Plus className="h-4 w-4" />Add Section
                    </Button>
                    <Button size="sm" variant="outline" className="gap-2" onClick={() => addItem()}>
                      <Plus className="h-4 w-4" />Add Field
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {items.map((item, idx) => {
                  const groupLabel = getGroupLabel(idx);
                  return (
                    <React.Fragment key={item.id}>
                      {groupLabel && (
                        <div className="flex items-center gap-2 pt-4 pb-1">
                          <div className="h-px flex-1 bg-border" />
                          <input
                            type="text"
                            value={groupLabel}
                            onChange={(e) => updateSectionName(groupLabel, e.target.value)}
                            className="text-sm font-semibold text-muted-foreground bg-transparent border-none text-center outline-none focus:text-foreground min-w-[80px] max-w-[200px]"
                            placeholder="Section name"
                          />
                          <div className="h-px flex-1 bg-border" />
                        </div>
                      )}
                      <div className="rounded-lg border p-3">
                        <div className="flex items-start gap-3">
                          <span className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 mt-1">{idx + 1}</span>
                          <div className="flex-1 space-y-2">
                            <Input placeholder="Enter question or instruction..." value={item.question} onChange={(e) => updateItem(item.id, "question", e.target.value)} />
                            <div className="flex items-center gap-4 flex-wrap">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs text-muted-foreground">Expected response:</span>
                                <div className="relative">
                                  <select value={item.type} onChange={(e) => updateItem(item.id, "type", e.target.value)} className="rounded-md border bg-background px-2.5 py-1.5 text-xs appearance-none pr-7">
                                    {ITEM_TYPES.map((tp) => <option key={tp.value} value={tp.value}>{tp.label}</option>)}
                                  </select>
                                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
                                </div>
                              </div>
                              <label className="flex items-center gap-2 cursor-pointer select-none">
                                <span className="text-xs text-muted-foreground">Required field?</span>
                                <button
                                  type="button"
                                  role="switch"
                                  aria-checked={item.required}
                                  onClick={() => updateItem(item.id, "required", !item.required)}
                                  className={cn("relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent transition-colors", item.required ? "bg-primary" : "bg-input")}
                                >
                                  <span className={cn("pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition-transform", item.required ? "translate-x-5" : "translate-x-0.5")} />
                                </button>
                              </label>
                            </div>
                          </div>
                          <div className="flex flex-col gap-1 shrink-0">
                            <button type="button" onClick={() => moveItem(idx, -1)} disabled={idx === 0} className="p-1 rounded hover:bg-muted disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5" /></button>
                            <button type="button" onClick={() => moveItem(idx, 1)} disabled={idx === items.length - 1} className="p-1 rounded hover:bg-muted disabled:opacity-30"><ArrowDown className="h-3.5 w-3.5" /></button>
                            <button type="button" onClick={() => removeItem(item.id)} disabled={items.length <= 1} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-destructive disabled:opacity-30"><Trash2 className="h-3.5 w-3.5" /></button>
                          </div>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}
                <Button variant="ghost" className="w-full gap-2 border-2 border-dashed text-muted-foreground hover:text-foreground" onClick={() => addItem()}>
                  <Plus className="h-4 w-4" />Add Another Field
                </Button>
              </CardContent>
            </Card>

            <div className="flex items-center gap-3">
              <Button variant="outline" className="gap-2" onClick={() => setStep(1)}>
                <ArrowLeft className="h-4 w-4" />Back to Details
              </Button>
              <div className="flex-1" />
              <Button className="gap-2" onClick={() => { saveDraftToStore(); setStep(3); }} disabled={items.filter((i) => i.question.trim()).length === 0}>
                Next: Preview <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}

        {/* STEP 3: Preview */}
        {step === 3 && (
          <>
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold">{name || "Untitled Assessment"}</h2>
                  <Badge variant="outline" className="text-xs">Risk Assessment</Badge>
                </div>
                {description && <p className="text-sm text-muted-foreground">{description}</p>}
                <div className="flex items-center gap-3 text-sm">
                  {regulation && <Badge variant="outline" className="text-xs gap-1.5 px-2.5 py-1"><Shield className="h-3 w-3" />{regulation}</Badge>}
                  <Badge variant="secondary" className="text-xs gap-1.5 px-2.5 py-1"><Clock className="h-3 w-3" />{FREQUENCY_OPTIONS.find((o) => o.value === frequency)?.label || frequency}</Badge>
                  <span className="text-muted-foreground">{items.filter((i) => i.question.trim()).length} fields</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Assessment Fields</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {items.filter((i) => i.question.trim()).map((item, idx) => (
                  <div key={item.id} className="flex items-start gap-3 text-sm py-2">
                    <span className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">{idx + 1}</span>
                    <div className="flex-1">
                      <p className="font-medium">{item.question}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">{ITEM_TYPES.find((t) => t.value === item.type)?.label || item.type}</Badge>
                        {item.required && <Badge variant="secondary" className="text-xs">Required</Badge>}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="flex items-center gap-3">
              <Button variant="outline" className="gap-2" onClick={() => setStep(2)}>
                <ArrowLeft className="h-4 w-4" />Back to Fields
              </Button>
              <div className="flex-1" />
              <Button variant="outline" className="gap-2" onClick={() => handleSave(false)} disabled={isSubmitting}>
                <Save className="h-4 w-4" />Save as Draft
              </Button>
              <Button className="gap-2 bg-green-600 hover:bg-green-700 text-white" onClick={() => handleSave(true)} disabled={isSubmitting}>
                <Send className="h-4 w-4" />Save & Push to Field App
              </Button>
            </div>
          </>
        )}
      </div>
    </RoleGuard>
  );
}
