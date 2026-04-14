"use client";

import * as React from "react";
import { flushSync } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Save,
  FileText,
  Upload,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useCompanyData } from "@/hooks/use-company-data";
import { useChecklistTemplatesStore } from "@/stores/checklists-store";
import { useCompanyParam } from "@/hooks/use-company-param";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "@/i18n";
import { useToast } from "@/components/ui/toast";
import { LoadingPage } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";
import { RoleGuard } from "@/components/auth/role-guard";
import { getDraft, saveDraft, deleteDraft } from "@/lib/draft-store";
import { generateId } from "@/lib/uuid";
import { LocationPicker, type LocationPickerValue } from "@/components/ui/location-picker";
import { WORK_ORDER_PROCEDURE_TEMPLATES } from "@/data/work-order-procedure-templates";
import { getTemplateById } from "@/data/industry-templates";
import { getRiskAssessmentTemplateById } from "@/data/risk-assessment-templates";
import { buildProcedureSubmissionHref, completeProcedureStep } from "@/lib/procedure-flow";
import { activateIndustryTemplate } from "@/lib/template-activation";
import type { ChecklistItem, ChecklistResponse, Country } from "@/types";

interface ItemResponse {
  value: string | number | boolean | null;
  comment: string;
}

function ChecklistFillContent({ templateId }: { templateId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const company = useCompanyParam();
  const { user, currentCompany, hasPermission } = useAuth();
  const canComplete = hasPermission("checklists.complete");
  const { t } = useTranslation();
  const { toast } = useToast();
  const { checklistTemplates, procedureSubmissions, locations, stores, companyId } = useCompanyData();
  
  // Use the store hook DIRECTLY to bypass any potential filtering
  const directStore = useChecklistTemplatesStore();
  
  const companyCountry = (currentCompany?.country as Country | undefined) || "US";
  const activatedTemplate = React.useMemo(
    () =>
      directStore.items.find((tpl) => tpl.source_template_id === templateId)
      || checklistTemplates.find((tpl) => tpl.source_template_id === templateId),
    [directStore.items, checklistTemplates, templateId],
  );

  const builtInTemplate = React.useMemo(() => {
    const industryTemplate = getTemplateById(templateId) || getRiskAssessmentTemplateById(templateId);

    if (!industryTemplate) return null;

    return activateIndustryTemplate(
      industryTemplate,
      companyId || user?.company_id || "__built_in__",
      companyCountry,
      t,
    );
  }, [templateId, companyId, user?.company_id, companyCountry, t]);

  React.useEffect(() => {
    if (!builtInTemplate || activatedTemplate) return;
    stores.checklistTemplates.add(builtInTemplate);
  }, [activatedTemplate, builtInTemplate, stores.checklistTemplates]);

  // Look up template from multiple sources:
  const template = directStore.items.find((tpl) => tpl.id === templateId)
    || checklistTemplates.find((tpl) => tpl.id === templateId)
    || activatedTemplate
    || WORK_ORDER_PROCEDURE_TEMPLATES.find((tpl) => tpl.id === templateId)
    || builtInTemplate;

  const [responses, setResponses] = React.useState<Record<string, ItemResponse>>({});
  const [generalComments, setGeneralComments] = React.useState("");
  const [locationValue, setLocationValue] = React.useState<LocationPickerValue>({
    locationId: "",
    manualText: "",
    gpsLat: null,
    gpsLng: null,
  });
  const [draftSavedAt, setDraftSavedAt] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const draftInitialized = React.useRef(false);
  const locationPreFilled = React.useRef(false);
  const procedureSubmissionId = searchParams.get("procedureSubmissionId");
  const procedureStepId = searchParams.get("procedureStepId");

  // Pre-fill location from user's assigned location (if no draft restores it)
  React.useEffect(() => {
    if (locationPreFilled.current || locationValue.locationId) return;
    locationPreFilled.current = true;
    if (user?.location_id && locations.some((l) => l.id === user.location_id)) {
      setLocationValue((prev) => ({ ...prev, locationId: user.location_id! }));
    }
  }, [user?.location_id, locations, locationValue.locationId]);

  // Restore draft on mount
  React.useEffect(() => {
    if (draftInitialized.current || !template) return;
    draftInitialized.current = true;
    const draft = getDraft(templateId);
    if (draft && draft.responses) {
      const saved = draft.responses as Record<string, ItemResponse & { generalComments?: string; locationId?: string }>;
      const restored: Record<string, ItemResponse> = {};
      for (const [key, val] of Object.entries(saved)) {
        if (key === "__meta") continue;
        if (val && typeof val === "object" && "value" in val) {
          restored[key] = { value: val.value ?? null, comment: val.comment || "" };
        }
      }
      setResponses(restored);
      const meta = saved.__meta as unknown as { generalComments?: string; locationId?: string } | undefined;
      if (meta?.generalComments) setGeneralComments(meta.generalComments);
      if (meta?.locationId) setLocationValue((prev) => ({ ...prev, locationId: meta.locationId! }));
      setDraftSavedAt(draft.updated_at);
    }
  }, [template, templateId]);

  // Auto-save draft every 10 seconds
  React.useEffect(() => {
    if (!template) return;
    const interval = setInterval(() => {
      const items = template.items || [];
      const answeredCount = items.filter((item) => {
        const r = responses[item.id];
        return r && r.value !== null && r.value !== undefined && r.value !== "";
      }).length;
      const progress = items.length > 0 ? Math.round((answeredCount / items.length) * 100) : 0;

      saveDraft({
        id: templateId,
        type: "checklist",
        template_id: templateId,
        template_name: template.name,
        responses: {
          ...responses,
          __meta: { generalComments, locationId: locationValue.locationId },
        } as Record<string, unknown>,
        progress,
        updated_at: new Date().toISOString(),
        created_at: getDraft(templateId)?.created_at || new Date().toISOString(),
      });
      setDraftSavedAt(new Date().toISOString());
    }, 10000);
    return () => clearInterval(interval);
  }, [template, templateId, responses, generalComments, locationValue]);

  // If store is loading AND template not yet found from any source, show loading
  if (directStore.isLoading && !template) {
    return <LoadingPage />;
  }

  if (!template) {
    return (
      <EmptyState
        icon={FileText}
        title={t("checklists.empty.noChecklists") || "Template not found"}
        description="This checklist template may have been removed or is unavailable."
        action={
          <Button variant="outline" onClick={() => router.back()}>
            {t("common.back") || "Go Back"}
          </Button>
        }
      />
    );
  }

  const items = template.items || [];
  const requiredItems = items.filter((item) => item.required);
  const answeredCount = items.filter((item) => {
    const r = responses[item.id];
    return r && r.value !== null && r.value !== undefined && r.value !== "";
  }).length;
  const requiredAnswered = requiredItems.filter((item) => {
    const r = responses[item.id];
    return r && r.value !== null && r.value !== undefined && r.value !== "";
  }).length;
  const progress = items.length > 0 ? Math.round((answeredCount / items.length) * 100) : 0;
  const allRequiredDone = requiredAnswered === requiredItems.length;

  const setItemResponse = (itemId: string, value: ItemResponse["value"]) => {
    setResponses((prev) => ({
      ...prev,
      [itemId]: { value, comment: prev[itemId]?.comment || "" },
    }));
  };

  const setItemComment = (itemId: string, comment: string) => {
    setResponses((prev) => ({
      ...prev,
      [itemId]: { value: prev[itemId]?.value ?? null, comment },
    }));
  };

  const toResponseValue = (val: ItemResponse["value"]): ChecklistResponse["value"] => {
    if (val === "yes" || val === "pass" || val === true) return true;
    if (val === "no" || val === "fail" || val === false) return false;
    if (val === "na" || val === null) return null;
    if (typeof val === "number") return val;
    if (typeof val === "string") {
      const parsed = Number(val);
      return Number.isNaN(parsed) ? val : parsed;
    }
    return null;
  };

  const handleSubmit = async () => {
    if (!allRequiredDone) {
      toast(t("checklists.validation.requiredFields") || "Please answer all required questions before submitting.");
      return;
    }

    setIsSubmitting(true);
    try {
      const checklistResponses: ChecklistResponse[] = items
        .filter((item) => responses[item.id]?.value !== undefined && responses[item.id]?.value !== null && responses[item.id]?.value !== "")
        .map((item) => ({
          item_id: item.id,
          value: toResponseValue(responses[item.id].value),
          comment: responses[item.id].comment || null,
          photo_urls: [],
        }));

      const checklistSubmissionId = generateId();
      const submittedAt = new Date().toISOString();
      const resolvedCompanyId = companyId || currentCompany?.id || user?.company_id;
      if (!resolvedCompanyId) {
        toast("Unable to submit — company not configured. Contact your admin.");
        setIsSubmitting(false);
        return;
      }

      // Build general_comments with GPS/manual location info
      const locationExtras: string[] = [];
      if (locationValue.gpsLat && locationValue.gpsLng) {
        locationExtras.push(`GPS: ${locationValue.gpsLat.toFixed(6)}, ${locationValue.gpsLng.toFixed(6)}`);
      }
      if (locationValue.manualText) {
        locationExtras.push(`Location: ${locationValue.manualText}`);
      }
      const mergedComments = [generalComments, ...locationExtras].filter(Boolean).join("\n").trim() || null;

      // flushSync ensures store updates are committed before any navigation
      flushSync(() => {
        stores.checklistSubmissions.add({
          id: checklistSubmissionId,
          company_id: resolvedCompanyId,
          template_id: template.id,
          submitter_id: user?.id || "",
          location_id: locationValue.locationId || null,
          responses: checklistResponses,
          general_comments: mergedComments,
          status: "submitted",
          submitted_at: submittedAt,
          created_at: submittedAt,
        });
      });

      deleteDraft(templateId);

      if (procedureSubmissionId && procedureStepId) {
        const procedureSubmission = procedureSubmissions.find((submission) => submission.id === procedureSubmissionId);
        const updatedProcedureSubmission = procedureSubmission
          ? completeProcedureStep(procedureSubmission, procedureStepId, checklistSubmissionId, submittedAt)
          : null;

        if (updatedProcedureSubmission) {
          flushSync(() => {
            stores.procedureSubmissions.update(updatedProcedureSubmission.id, updatedProcedureSubmission);
          });

          if (updatedProcedureSubmission.status === "completed") {
            toast("Procedure completed successfully!", "success");
            router.push(buildProcedureSubmissionHref(company, updatedProcedureSubmission.id));
            return;
          }

          toast("Step completed. Review the next procedure step.", "success");
          router.push(buildProcedureSubmissionHref(company, updatedProcedureSubmission.id));
          return;
        }
      }

      toast(t("checklists.success.submitted") || "Checklist submitted successfully!");
      router.push(`/${company}/dashboard/checklists`);
    } catch {
      toast(t("common.error") || "Failed to submit. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const draftTimeAgo = draftSavedAt ? getTimeAgo(draftSavedAt) : null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2"
          onClick={() => router.push(`/${company}/dashboard/checklists`)}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t("checklists.safetyTasks") || "Safety Tasks"}
        </Button>
        {draftSavedAt && (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Save className="h-3 w-3" aria-hidden="true" />
            {t("checklists.labels.draftSaved") || "Draft saved"} {draftTimeAgo}
          </span>
        )}
      </div>

      {/* Template header */}
      <div>
        <h1 className="text-xl font-semibold">{template.name}</h1>
        {template.description && (
          <p className="mt-1 text-sm text-muted-foreground">{template.description}</p>
        )}
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {t("checklists.labels.progress") || "Progress"}: {answeredCount}/{items.length}
          </span>
          <span className="font-medium">{progress}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-300",
              progress === 100
                ? "bg-green-500"
                : progress >= 50
                  ? "bg-primary"
                  : "bg-amber-500"
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Pre-filled context */}
      <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-xs text-muted-foreground">Submitted by</span>
            <p className="font-medium">{user?.full_name || "—"}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Date</span>
            <p className="font-medium">{new Date().toLocaleDateString()}</p>
          </div>
          {currentCompany?.name && (
            <div>
              <span className="text-xs text-muted-foreground">Company</span>
              <p className="font-medium">{currentCompany.name}</p>
            </div>
          )}
          {user?.department && (
            <div>
              <span className="text-xs text-muted-foreground">Department</span>
              <p className="font-medium">{user.department}</p>
            </div>
          )}
        </div>
      </div>

      {/* Location selector */}
      <div className="space-y-1.5">
        <LocationPicker
          locations={locations.map((l) => ({ id: l.id, name: l.name, address: l.address }))}
          value={locationValue}
          onChange={setLocationValue}
          label={t("checklists.labels.location") || "Location"}
        />
      </div>

      {/* Checklist items */}
      <div className="space-y-4">
        {items.map((item, idx) => (
          <ChecklistItemCard
            key={item.id}
            item={item}
            index={idx}
            response={responses[item.id] || { value: null, comment: "" }}
            onValueChange={(val) => setItemResponse(item.id, val)}
            onCommentChange={(c) => setItemComment(item.id, c)}
            t={t}
          />
        ))}
      </div>

      {/* General comments */}
      <div className="space-y-1.5">
        <Label htmlFor="general-comments">{t("checklists.labels.generalComments") || "General Comments"}</Label>
        <Textarea
          id="general-comments"
          placeholder={t("checklists.placeholders.generalComments") || "Add any overall comments..."}
          value={generalComments}
          onChange={(e) => setGeneralComments(e.target.value)}
          rows={3}
        />
      </div>

      {/* Submit */}
      <div className="flex items-center justify-between gap-4 border-t pt-6 pb-8">
        <p className="text-sm text-muted-foreground">
          {!canComplete
            ? (t("common.noPermission") || "You do not have permission to submit checklists.")
            : allRequiredDone
            ? (t("checklists.labels.readyToSubmit") || "All required items answered. Ready to submit.")
            : `${requiredItems.length - requiredAnswered} ${t("checklists.labels.requiredRemaining") || "required item(s) remaining"}`}
        </p>
        <Button
          size="lg"
          disabled={!canComplete || !allRequiredDone || isSubmitting}
          onClick={handleSubmit}
        >
          {isSubmitting
            ? (t("common.submitting") || "Submitting...")
            : (t("checklists.actions.submit") || "Submit Checklist")}
        </Button>
      </div>
    </div>
  );
}

// Individual checklist item card
function ChecklistItemCard({
  item,
  index,
  response,
  onValueChange,
  onCommentChange,
  t,
}: {
  item: ChecklistItem;
  index: number;
  response: ItemResponse;
  onValueChange: (val: ItemResponse["value"]) => void;
  onCommentChange: (comment: string) => void;
  t: (key: string) => string;
}) {
  const [showComment, setShowComment] = React.useState(!!response.comment);
  const effectiveType = item.type || (item.response_types?.[0]) || "yes_no_na";
  const isAnswered = response.value !== null && response.value !== undefined && response.value !== "";

  return (
    <Card className={cn(isAnswered && "ring-1 ring-primary/20")}>
      <CardContent className="p-4 space-y-3">
        {/* Question header */}
        <div className="flex items-start gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
            {index + 1}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium leading-snug">
              {item.question}
              {item.required && <span className="ml-1 text-destructive">*</span>}
            </p>
            {item.description && (
              <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>
            )}
          </div>
          {isAnswered && (
            <Badge variant="success" className="shrink-0 text-[10px]">
              <Check className="mr-0.5 h-3 w-3" aria-hidden="true" />
              {t("common.done") || "Done"}
            </Badge>
          )}
        </div>

        {/* Response input */}
        <div className="pl-9">
          <ItemInput
            item={item}
            type={effectiveType}
            value={response.value}
            onChange={onValueChange}
            t={t}
          />
        </div>

        {/* Comment toggle + input */}
        <div className="pl-9">
          {!showComment ? (
            <button
              type="button"
              onClick={() => setShowComment(true)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              + {t("checklists.labels.addComment") || "Add comment"}
            </button>
          ) : (
            <div className="space-y-1">
              <Label className="text-xs">{t("checklists.labels.comment") || "Comment"}</Label>
              <Textarea
                value={response.comment}
                onChange={(e) => onCommentChange(e.target.value)}
                placeholder={t("checklists.placeholders.comment") || "Add a note..."}
                rows={2}
                className="text-sm"
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Renders the appropriate input for each item type
function ItemInput({
  item,
  type,
  value,
  onChange,
  t,
}: {
  item: ChecklistItem;
  type: ChecklistItem["type"];
  value: ItemResponse["value"];
  onChange: (val: ItemResponse["value"]) => void;
  t: (key: string) => string;
}) {
  switch (type) {
    case "yes_no_na":
      return (
        <div className="flex flex-wrap gap-2">
          <ToggleButton
            label={t("checklists.options.yes") || "Yes"}
            active={value === "yes"}
            onClick={() => onChange(value === "yes" ? null : "yes")}
            variant="success"
          />
          <ToggleButton
            label={t("checklists.options.no") || "No"}
            active={value === "no"}
            onClick={() => onChange(value === "no" ? null : "no")}
            variant="destructive"
          />
          <ToggleButton
            label={t("checklists.options.na") || "N/A"}
            active={value === "na"}
            onClick={() => onChange(value === "na" ? null : "na")}
            variant="muted"
          />
        </div>
      );

    case "pass_fail":
      return (
        <div className="flex flex-wrap gap-2">
          <ToggleButton
            label={t("checklists.options.pass") || "Pass"}
            active={value === "pass"}
            onClick={() => onChange(value === "pass" ? null : "pass")}
            variant="success"
          />
          <ToggleButton
            label={t("checklists.options.fail") || "Fail"}
            active={value === "fail"}
            onClick={() => onChange(value === "fail" ? null : "fail")}
            variant="destructive"
          />
        </div>
      );

    case "rating": {
      const min = item.min_value ?? 1;
      const max = item.max_value ?? 5;
      const stars = Array.from({ length: max - min + 1 }, (_, i) => min + i);
      return (
        <div className="flex flex-wrap gap-1">
          {stars.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onChange(value === n ? null : n)}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-md border text-sm font-medium transition-colors",
                value === n
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input hover:bg-muted"
              )}
            >
              {n}
            </button>
          ))}
        </div>
      );
    }

    case "number":
      return (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={value !== null && value !== undefined ? String(value) : ""}
            onChange={(e) => {
              const v = e.target.value;
              onChange(v === "" ? null : Number(v));
            }}
            placeholder="0"
            min={item.min_value}
            max={item.max_value}
            className="max-w-[180px]"
          />
          {item.unit && (
            <span className="text-sm text-muted-foreground">{item.unit}</span>
          )}
        </div>
      );

    case "text":
      return (
        <Textarea
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value || null)}
          placeholder={t("checklists.placeholders.text") || "Enter your response..."}
          rows={2}
        />
      );

    case "date":
      return (
        <Input
          type="date"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value || null)}
          className="max-w-[200px]"
        />
      );

    case "select":
      return (
        <div className="relative">
          <select
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value || null)}
            className="w-full max-w-xs appearance-none rounded-md border bg-background px-3 py-2 pr-8 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">{t("checklists.placeholders.select") || "Select an option..."}</option>
            {(item.options || []).map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        </div>
      );

    case "photo":
      return (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2" disabled>
            <Upload className="h-4 w-4" aria-hidden="true" />
            {t("checklists.actions.uploadPhoto") || "Upload Photo"}
          </Button>
          <span className="text-xs text-muted-foreground">
            {t("checklists.labels.photoNotAvailable") || "Photo upload available in mobile app"}
          </span>
        </div>
      );

    case "signature":
      return (
        <Input
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value || null)}
          placeholder={t("checklists.placeholders.signature") || "Type your full name as signature"}
          className="max-w-sm"
        />
      );

    default:
      return (
        <Input
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value || null)}
          placeholder="Enter response..."
        />
      );
  }
}

// Reusable toggle button for yes/no/na, pass/fail
function ToggleButton({
  label,
  active,
  onClick,
  variant,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  variant: "success" | "destructive" | "muted";
}) {
  const baseClass = "inline-flex items-center gap-1.5 rounded-md border px-4 py-2 text-sm font-medium transition-colors";
  const variants: Record<string, { active: string; inactive: string }> = {
    success: {
      active: "border-green-500 bg-green-500/10 text-green-700 dark:text-green-400",
      inactive: "border-input hover:bg-green-50 dark:hover:bg-green-900/10",
    },
    destructive: {
      active: "border-red-500 bg-red-500/10 text-red-700 dark:text-red-400",
      inactive: "border-input hover:bg-red-50 dark:hover:bg-red-900/10",
    },
    muted: {
      active: "border-gray-400 bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
      inactive: "border-input hover:bg-muted",
    },
  };

  const v = variants[variant];
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(baseClass, active ? v.active : v.inactive)}
    >
      {active && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
      {label}
    </button>
  );
}

function getTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const seconds = Math.floor((now - then) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function ChecklistFillPage({
  params,
}: {
  params: Promise<{ templateId: string; company: string }>;
}) {
  const { templateId } = React.use(params);
  return (
    <RoleGuard requiredPermission="checklists.complete">
      <React.Suspense fallback={<LoadingPage />}>
        <ChecklistFillContent templateId={templateId} />
      </React.Suspense>
    </RoleGuard>
  );
}
