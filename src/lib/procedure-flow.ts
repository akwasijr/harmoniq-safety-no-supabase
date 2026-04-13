import type { ProcedureStep, ProcedureSubmission } from "@/types";

const PROCEDURE_STEP_TEMPLATE_ALIASES: Record<string, string> = {
  construction_lifting_plan: "construction_crane_em385",
  construction_equipment_inspection: "construction_crane",
  construction_ground_conditions: "construction_crane_em385",
  construction_gas_testing: "construction_confined_em385",
  construction_rescue_plan: "construction_confined_em385",
  construction_entry_permit: "construction_confined_em385",
  manufacturing_isolation: "manufacturing_loto",
  manufacturing_energy_verification: "manufacturing_loto",
  manufacturing_safety_guards: "manufacturing_machine_guarding",
  manufacturing_emergency_equipment: "manufacturing_bhv_equipment",
  manufacturing_ppe_compliance: "manufacturing_safety_walk",
  manufacturing_housekeeping: "manufacturing_safety_walk",
  oil_gas_loto: "oil_gas_ptw",
  oil_gas_pressure_test: "oil_gas_well_site",
  warehousing_structural: "warehousing_rack",
  warehousing_load_capacity: "warehousing_rack",
  warehousing_signage: "warehousing_rack",
  warehousing_first_aid: "warehousing_fire_extinguisher",
  marine_mooring_equipment: "construction_marine_terminal",
  marine_safety_equipment: "construction_shipyard",
  marine_comms_check: "construction_shipyard",
};

export function resolveProcedureStepTemplateId(templateId: string): string {
  return PROCEDURE_STEP_TEMPLATE_ALIASES[templateId] ?? templateId;
}

export function buildProcedureStepFillHref(options: {
  company: string;
  step?: ProcedureStep | null;
  checklistTemplates?: unknown[];
  procedureSubmissionId?: string | null;
}): string | null {
  const { company, step, procedureSubmissionId } = options;

  if (!step) return null;

  // Always use the resolved built-in template ID for the fill URL.
  // The fill page handles activation and store persistence itself.
  const fillTemplateId = resolveProcedureStepTemplateId(step.template_id);

  const params = new URLSearchParams();
  if (procedureSubmissionId) {
    params.set("procedureSubmissionId", procedureSubmissionId);
    params.set("procedureStepId", step.id);
  }

  const query = params.toString();
  return `/${company}/dashboard/checklists/fill/${fillTemplateId}${query ? `?${query}` : ""}`;
}

export function createProcedureSubmissionId(): string {
  return `proc_sub_${crypto.randomUUID()}`;
}

export function buildProcedureSubmissionHref(company: string, submissionId: string): string {
  return `/${company}/dashboard/checklists/procedures/${submissionId}`;
}

export function completeProcedureStep(
  submission: ProcedureSubmission,
  stepId: string,
  linkedSubmissionId: string,
  completedAt: string,
): ProcedureSubmission {
  const stepIndex = submission.step_submissions.findIndex((stepSubmission) => stepSubmission.step_id === stepId);
  if (stepIndex === -1) return submission;

  const nextStepSubmissions = submission.step_submissions.map((stepSubmission, index) => {
    if (index === stepIndex) {
      return {
        ...stepSubmission,
        submission_id: linkedSubmissionId,
        status: "completed" as const,
        completed_at: completedAt,
      };
    }

    if (index === stepIndex + 1 && stepSubmission.status === "pending") {
      return {
        ...stepSubmission,
        status: "in_progress" as const,
      };
    }

    return stepSubmission;
  });

  const nextStepIndex = nextStepSubmissions.findIndex((stepSubmission) => stepSubmission.status !== "completed" && stepSubmission.status !== "skipped");

  if (nextStepIndex === -1) {
    return {
      ...submission,
      status: "completed",
      current_step: submission.step_submissions.length,
      step_submissions: nextStepSubmissions,
      completed_at: completedAt,
      updated_at: completedAt,
    };
  }

  return {
    ...submission,
    status: "in_progress",
    current_step: nextStepIndex + 1,
    step_submissions: nextStepSubmissions,
    updated_at: completedAt,
  };
}
