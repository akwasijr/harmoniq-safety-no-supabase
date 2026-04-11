import type { ProcedureTemplate, ProcedureStep } from "@/types";

const now = "2024-01-01T00:00:00Z";

function step(
  id: string,
  order: number,
  type: ProcedureStep["type"],
  template_id: string,
  template_name: string,
  required = true,
): ProcedureStep {
  return { id, order, type, template_id, template_name, required };
}

// ── Construction ──

const craneLiftProcedure: ProcedureTemplate = {
  id: "proc_crane_lift",
  company_id: "__built_in__",
  name: "Crane Lift Procedure",
  description: "Standard multi-step procedure for safe crane lifting operations, from hazard analysis through equipment checks.",
  industry: "construction",
  recurrence: "per_event",
  is_builtin: true,
  is_active: true,
  steps: [
    step("step_crane_jha", 1, "risk_assessment", "construction_jha", "Job Hazard Analysis (JHA)"),
    step("step_crane_lifting_plan", 2, "checklist", "construction_lifting_plan", "Lifting Plan Checklist"),
    step("step_crane_equipment", 3, "checklist", "construction_equipment_inspection", "Equipment Inspection"),
    step("step_crane_ground", 4, "checklist", "construction_ground_conditions", "Ground Conditions Check"),
  ],
  created_at: now,
  updated_at: now,
};

const confinedSpaceEntry: ProcedureTemplate = {
  id: "proc_confined_space",
  company_id: "__built_in__",
  name: "Confined Space Entry",
  description: "Complete confined space entry procedure including risk assessment, gas testing, rescue plan, and entry permit.",
  industry: "construction",
  recurrence: "per_event",
  is_builtin: true,
  is_active: true,
  steps: [
    step("step_confined_ra", 1, "risk_assessment", "construction_confined_ra", "Risk Assessment"),
    step("step_confined_gas", 2, "checklist", "construction_gas_testing", "Gas Testing Checklist"),
    step("step_confined_rescue", 3, "checklist", "construction_rescue_plan", "Rescue Plan Checklist"),
    step("step_confined_permit", 4, "checklist", "construction_entry_permit", "Entry Permit Checklist"),
  ],
  created_at: now,
  updated_at: now,
};

// ── Manufacturing ──

const machineChangeoverLOTO: ProcedureTemplate = {
  id: "proc_machine_loto",
  company_id: "__built_in__",
  name: "Machine Changeover (LOTO)",
  description: "Lockout/Tagout procedure for machine changeover including risk assessment, isolation, energy verification, and safety guard checks.",
  industry: "manufacturing",
  recurrence: "per_event",
  is_builtin: true,
  is_active: true,
  steps: [
    step("step_loto_ra", 1, "risk_assessment", "manufacturing_loto_ra", "LOTO Risk Assessment"),
    step("step_loto_isolation", 2, "checklist", "manufacturing_isolation", "Isolation Checklist"),
    step("step_loto_energy", 3, "checklist", "manufacturing_energy_verification", "Energy Verification"),
    step("step_loto_guards", 4, "checklist", "manufacturing_safety_guards", "Safety Guard Check"),
  ],
  created_at: now,
  updated_at: now,
};

const monthlySafetyInspection: ProcedureTemplate = {
  id: "proc_monthly_safety",
  company_id: "__built_in__",
  name: "Monthly Safety Inspection",
  description: "Comprehensive monthly safety inspection covering fire safety, emergency equipment, PPE compliance, and housekeeping.",
  industry: "manufacturing",
  recurrence: "monthly",
  is_builtin: true,
  is_active: true,
  steps: [
    step("step_monthly_fire", 1, "checklist", "manufacturing_fire_safety", "Fire Safety Checklist"),
    step("step_monthly_emergency", 2, "checklist", "manufacturing_emergency_equipment", "Emergency Equipment Check"),
    step("step_monthly_ppe", 3, "checklist", "manufacturing_ppe_compliance", "PPE Compliance Audit"),
    step("step_monthly_housekeeping", 4, "checklist", "manufacturing_housekeeping", "Housekeeping Inspection"),
  ],
  created_at: now,
  updated_at: now,
};

// ── Oil & Gas ──

const wellIntervention: ProcedureTemplate = {
  id: "proc_well_intervention",
  company_id: "__built_in__",
  name: "Well Intervention Procedure",
  description: "Multi-step well intervention procedure with risk assessment, permit-to-work, LOTO, and pressure testing.",
  industry: "oil_gas",
  recurrence: "per_event",
  is_builtin: true,
  is_active: true,
  steps: [
    step("step_well_ra", 1, "risk_assessment", "oil_gas_well_ra", "Risk Assessment"),
    step("step_well_ptw", 2, "checklist", "oil_gas_ptw", "PTW Checklist"),
    step("step_well_loto", 3, "checklist", "oil_gas_loto", "LOTO Checklist"),
    step("step_well_pressure", 4, "checklist", "oil_gas_pressure_test", "Pressure Test Checklist"),
  ],
  created_at: now,
  updated_at: now,
};

// ── Warehousing ──

const rackingInstallation: ProcedureTemplate = {
  id: "proc_racking_install",
  company_id: "__built_in__",
  name: "Racking Installation",
  description: "Procedure for safely installing warehouse racking including risk assessment, structural checks, load capacity, and signage.",
  industry: "warehousing",
  recurrence: "per_event",
  is_builtin: true,
  is_active: true,
  steps: [
    step("step_racking_ra", 1, "risk_assessment", "warehousing_racking_ra", "Risk Assessment"),
    step("step_racking_structural", 2, "checklist", "warehousing_structural", "Structural Checklist"),
    step("step_racking_load", 3, "checklist", "warehousing_load_capacity", "Load Capacity Check"),
    step("step_racking_signage", 4, "checklist", "warehousing_signage", "Signage Verification"),
  ],
  created_at: now,
  updated_at: now,
};

const dailyOpeningProcedure: ProcedureTemplate = {
  id: "proc_daily_opening",
  company_id: "__built_in__",
  name: "Daily Opening Procedure",
  description: "Daily warehouse opening procedure covering fire exits, forklift inspection, and first aid kit checks.",
  industry: "warehousing",
  recurrence: "daily",
  is_builtin: true,
  is_active: true,
  steps: [
    step("step_opening_fire", 1, "checklist", "warehousing_fire_exit", "Fire Exit Check"),
    step("step_opening_forklift", 2, "checklist", "warehousing_forklift", "Forklift Inspection"),
    step("step_opening_firstaid", 3, "checklist", "warehousing_first_aid", "First Aid Kit Check"),
  ],
  created_at: now,
  updated_at: now,
};

// ── Marine/Shipping ──

const vesselDockingProcedure: ProcedureTemplate = {
  id: "proc_vessel_docking",
  company_id: "__built_in__",
  name: "Vessel Docking Procedure",
  description: "Comprehensive vessel docking procedure from berth hazard analysis through safety and communication system checks.",
  industry: "marine",
  recurrence: "per_event",
  is_builtin: true,
  is_active: true,
  steps: [
    step("step_docking_berth", 1, "risk_assessment", "marine_berth_hazard", "Berth Hazard Analysis"),
    step("step_docking_mooring", 2, "checklist", "marine_mooring_equipment", "Mooring Equipment Inspection"),
    step("step_docking_safety", 3, "checklist", "marine_safety_equipment", "Safety Equipment Check"),
    step("step_docking_comms", 4, "checklist", "marine_comms_check", "Communication Systems Check"),
  ],
  created_at: now,
  updated_at: now,
};

const ALL_BUILT_IN_PROCEDURES: ProcedureTemplate[] = [
  craneLiftProcedure,
  confinedSpaceEntry,
  machineChangeoverLOTO,
  monthlySafetyInspection,
  wellIntervention,
  rackingInstallation,
  dailyOpeningProcedure,
  vesselDockingProcedure,
];

export function getBuiltInProcedureTemplates(): ProcedureTemplate[] {
  return ALL_BUILT_IN_PROCEDURES;
}
