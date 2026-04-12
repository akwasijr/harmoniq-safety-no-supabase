"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCompanyParam } from "@/hooks/use-company-param";
import {
  ClipboardCheck, Plus, Trash2, GripVertical, ArrowUp, ArrowDown,
  ChevronDown, Save, Send,
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
  { value: "yes_no_na", label: "Yes / No / N/A" },
  { value: "pass_fail", label: "Pass / Fail" },
  { value: "rating", label: "Rating (1-5)" },
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "photo", label: "Photo" },
  { value: "date", label: "Date" },
  { value: "signature", label: "Signature" },
  { value: "select", label: "Select" },
];

const RECURRENCE_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "once", label: "One-time" },
];

const CATEGORY_OPTIONS = [
  { value: "general", label: "General Safety" },
  { value: "fire_safety", label: "Fire Safety" },
  { value: "electrical", label: "Electrical" },
  { value: "housekeeping", label: "Housekeeping" },
  { value: "ppe", label: "PPE Compliance" },
  { value: "equipment", label: "Equipment Inspection" },
  { value: "environmental", label: "Environmental" },
  { value: "quality", label: "Quality Control" },
  { value: "food_safety", label: "Food Safety" },
  { value: "vehicle", label: "Vehicle / Fleet" },
  { value: "other", label: "Other" },
];

interface DraftItem {
  id: string;
  question: string;
  type: ChecklistItem["type"];
  required: boolean;
}

export default function NewChecklistPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const company = useCompanyParam();
  const { toast } = useToast();
  const { user } = useAuth();
  const { items: companies } = useCompanyStore();
  const { add: addTemplate } = useChecklistTemplatesStore();

  const companyId = (companies.find((c) => c.slug === company) || companies[0])?.id || user?.company_id || "";

  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [category, setCategory] = React.useState("general");
  const [recurrence, setRecurrence] = React.useState("daily");
  const [items, setItems] = React.useState<DraftItem[]>([
    { id: crypto.randomUUID(), question: "", type: "yes_no_na", required: true },
  ]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const addItem = () => {
    setItems((prev) => [...prev, { id: crypto.randomUUID(), question: "", type: "yes_no_na", required: true }]);
  };

  const updateItem = (id: string, field: keyof DraftItem, value: string | boolean) => {
    setItems((prev) => prev.map((item) => item.id === id ? { ...item, [field]: value } : item));
  };

  const removeItem = (id: string) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const moveItem = (idx: number, dir: -1 | 1) => {
    setItems((prev) => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const handleSave = (activate: boolean) => {
    if (!name.trim()) { toast("Please enter a checklist name"); return; }
    const validItems = items.filter((i) => i.question.trim());
    if (validItems.length === 0) { toast("Add at least one checklist item"); return; }

    setIsSubmitting(true);
    const now = new Date().toISOString();
    const template: ChecklistTemplate = {
      id: crypto.randomUUID(),
      company_id: companyId,
      name: name.trim(),
      description: description.trim() || null,
      category,
      assignment: "all",
      recurrence: recurrence as ChecklistTemplate["recurrence"],
      publish_status: activate ? "published" : "draft",
      is_active: activate,
      items: validItems.map((item, idx) => ({
        id: item.id,
        question: item.question.trim(),
        type: item.type,
        required: item.required,
        order: idx + 1,
      })),
      created_at: now,
      updated_at: now,
    };
    addTemplate(template);
    toast(activate ? "Checklist created and pushed to field app" : "Checklist saved as draft", "success");
    router.push(`/${company}/dashboard/checklists/${template.id}`);
    setIsSubmitting(false);
  };

  return (
    <RoleGuard requiredPermission="checklists.create_templates">
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Create Checklist Template</h1>
            <p className="text-sm text-muted-foreground">Build a checklist with inspection items that workers complete in the field.</p>
          </div>
          <Link href={`/${company}/dashboard/checklists/my-templates`}>
            <Button variant="outline">Back to Templates</Button>
          </Link>
        </div>

        {/* Details */}
        <Card>
          <CardHeader><CardTitle>Checklist Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cl-name">Checklist Name *</Label>
              <Input id="cl-name" placeholder="e.g. Daily Fire Safety Walkthrough" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cl-desc">Description</Label>
              <Textarea id="cl-desc" placeholder="What does this checklist cover? When should it be used?" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cl-category">Category</Label>
                <div className="relative">
                  <select id="cl-category" value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm appearance-none pr-8">
                    {CATEGORY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cl-recurrence">Frequency</Label>
                <div className="relative">
                  <select id="cl-recurrence" value={recurrence} onChange={(e) => setRecurrence(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm appearance-none pr-8">
                    {RECURRENCE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Items */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Checklist Items ({items.length})</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">Each item is a question or checkpoint that workers answer in the field.</p>
              </div>
              <Button size="sm" variant="outline" className="gap-2" onClick={addItem}>
                <Plus className="h-4 w-4" />Add Item
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.map((item, idx) => (
              <div key={item.id} className="rounded-lg border p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <span className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 mt-1">{idx + 1}</span>
                  <div className="flex-1 space-y-3">
                    <Input
                      placeholder="Enter question or instruction..."
                      value={item.question}
                      onChange={(e) => updateItem(item.id, "question", e.target.value)}
                    />
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="relative">
                        <select
                          value={item.type}
                          onChange={(e) => updateItem(item.id, "type", e.target.value)}
                          className="rounded-md border bg-background px-2.5 py-1.5 text-xs appearance-none pr-7"
                        >
                          {ITEM_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
                      </div>
                      <button
                        onClick={() => updateItem(item.id, "required", !item.required)}
                        className={cn("text-xs px-2 py-1 rounded border transition-colors", item.required ? "bg-primary/10 border-primary/30 text-primary" : "text-muted-foreground border-muted")}
                      >
                        {item.required ? "Required" : "Optional"}
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <button onClick={() => moveItem(idx, -1)} disabled={idx === 0} className="p-1 rounded hover:bg-muted disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5" /></button>
                    <button onClick={() => moveItem(idx, 1)} disabled={idx === items.length - 1} className="p-1 rounded hover:bg-muted disabled:opacity-30"><ArrowDown className="h-3.5 w-3.5" /></button>
                    <button onClick={() => removeItem(item.id)} disabled={items.length <= 1} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-destructive disabled:opacity-30"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              </div>
            ))}
            <Button variant="ghost" className="w-full gap-2 border-2 border-dashed text-muted-foreground hover:text-foreground" onClick={addItem}>
              <Plus className="h-4 w-4" />Add Another Item
            </Button>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Link href={`/${company}/dashboard/checklists/my-templates`}>
            <Button variant="outline">{t("common.cancel")}</Button>
          </Link>
          <Button variant="outline" className="gap-2" onClick={() => handleSave(false)} disabled={isSubmitting}>
            <Save className="h-4 w-4" />Save as Draft
          </Button>
          <Button className="gap-2 bg-green-600 hover:bg-green-700 text-white" onClick={() => handleSave(true)} disabled={isSubmitting}>
            <Send className="h-4 w-4" />Save & Push to Field App
          </Button>
        </div>
      </div>
    </RoleGuard>
  );
}
