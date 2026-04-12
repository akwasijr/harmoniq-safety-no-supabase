import type {
  ChecklistTemplate,
  ChecklistItem,
  IndustryChecklistTemplate,
  IndustryChecklistItem,
  Country,
} from "@/types";
import { resolveTemplateRegulation } from "@/data/industry-templates";

/**
 * Resolve an industry template into a company-owned ChecklistTemplate.
 *
 * All i18n keys are resolved to plain text at activation time using the
 * provided `t()` function (which should use the company's language).
 * After activation the template has no dependency on i18n keys.
 */
export function activateIndustryTemplate(
  industryTemplate: IndustryChecklistTemplate,
  companyId: string,
  companyCountry: Country,
  t: (key: string) => string,
): ChecklistTemplate {
  const now = new Date().toISOString();

  const items: ChecklistItem[] = industryTemplate.items.map(
    (item: IndustryChecklistItem) => ({
      id: crypto.randomUUID(),
      question: t(item.question_key),
      type: item.type as ChecklistItem["type"],
      required: item.required,
      order: item.order,
    }),
  );

  // Map industry frequency to the closest recurrence value
  const recurrenceMap: Record<string, ChecklistTemplate["recurrence"]> = {
    daily: "daily",
    weekly: "weekly",
    monthly: "monthly",
    quarterly: "monthly",
    per_event: "once",
    per_shift: "daily",
    continuous: "daily",
  };

  return {
    id: crypto.randomUUID(),
    company_id: companyId,
    name: t(industryTemplate.name_key),
    description: t(industryTemplate.description_key),
    category: industryTemplate.category,
    assignment: "all",
    recurrence: recurrenceMap[industryTemplate.frequency] ?? "daily",
    items,
    source_template_id: industryTemplate.id,
    regulation: resolveTemplateRegulation(industryTemplate, companyCountry),
    tags: [...industryTemplate.tags],
    publish_status: "draft",
    is_active: true,
    created_at: now,
    updated_at: now,
  };
}

export function cloneChecklistTemplate(
  template: ChecklistTemplate,
  options?: {
    nameSuffix?: string;
  },
): ChecklistTemplate {
  const now = new Date().toISOString();
  const nameSuffix = options?.nameSuffix ?? " (Copy)";

  return {
    ...template,
    id: crypto.randomUUID(),
    name: `${template.name}${nameSuffix}`,
    items: template.items.map((item) => ({
      ...item,
      id: crypto.randomUUID(),
    })),
    publish_status: "draft",
    is_active: false,
    created_at: now,
    updated_at: now,
  };
}

/**
 * Check whether a specific industry template has already been activated
 * for a company (by matching source_template_id).
 */
export function isTemplateActivated(
  industryTemplateId: string,
  companyTemplates: ChecklistTemplate[],
): boolean {
  return companyTemplates.some(
    (t) => t.source_template_id === industryTemplateId,
  );
}

/**
 * Get the company template that was activated from a given industry template.
 */
export function getActivatedTemplate(
  industryTemplateId: string,
  companyTemplates: ChecklistTemplate[],
): ChecklistTemplate | undefined {
  return companyTemplates.find(
    (t) => t.source_template_id === industryTemplateId,
  );
}

/**
 * Resolve a template's effective publish status.
 * Missing publish_status is treated as draft so templates do not leak into the
 * field app unless publication was made explicit.
 */
export function getTemplatePublishStatus(
  template: Pick<ChecklistTemplate, "publish_status" | "is_active">,
): "draft" | "published" | "archived" {
  if (template.publish_status) return template.publish_status;
  return "draft";
}

/**
 * Check if a template should be visible in the mobile field app.
 * Only explicitly published templates, or legacy active templates, should surface.
 */
export function isVisibleToFieldApp(template: ChecklistTemplate): boolean {
  if (template.is_active === false) return false;
  return getTemplatePublishStatus(template) === "published";
}
