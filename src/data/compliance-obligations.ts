import type { ComplianceObligation, Country } from "@/types";

const now = "2024-01-01T00:00:00Z";

function nextDue(frequency: ComplianceObligation["frequency"]): string {
  const d = new Date();
  switch (frequency) {
    case "daily":
      d.setDate(d.getDate() + 1);
      break;
    case "weekly":
      d.setDate(d.getDate() + 7);
      break;
    case "monthly":
      d.setMonth(d.getMonth() + 1);
      break;
    case "quarterly":
      d.setMonth(d.getMonth() + 3);
      break;
    case "annual":
      d.setFullYear(d.getFullYear() + 1);
      break;
    case "one_time":
      d.setMonth(d.getMonth() + 6);
      break;
    default:
      d.setFullYear(d.getFullYear() + 1);
  }
  return d.toISOString().split("T")[0];
}

function obligation(
  id: string,
  title: string,
  regulation: string,
  country: Country,
  category: ComplianceObligation["category"],
  frequency: ComplianceObligation["frequency"],
  evidenceType: ComplianceObligation["evidence_type"] = "manual",
  description: string | null = null,
): ComplianceObligation {
  return {
    id: `builtin_${id}`,
    company_id: "__built_in__",
    title,
    description,
    regulation,
    country,
    category,
    frequency,
    custom_frequency_days: null,
    next_due_date: nextDue(frequency),
    last_completed_date: null,
    owner_id: null,
    evidence_type: evidenceType,
    auto_evidence_source: null,
    status: "not_started",
    is_builtin: true,
    is_active: true,
    created_at: now,
    updated_at: now,
  };
}

// ── United States (OSHA) ──
const US: ComplianceObligation[] = [
  obligation("osha_300_log", "OSHA 300 Log", "OSHA 29 CFR 1904", "US", "incident_reporting", "annual", "auto", "Maintain log of work-related injuries and illnesses"),
  obligation("osha_300a_posting", "OSHA 300A Posting", "OSHA 29 CFR 1904.32", "US", "incident_reporting", "annual", "manual", "Post annual summary of injuries and illnesses (Feb 1 – Apr 30)"),
  obligation("hazcom_program", "Hazard Communication Program", "OSHA 29 CFR 1910.1200", "US", "general", "annual", "document", "Review and update hazard communication program and SDS library"),
  obligation("emergency_action_plan", "Emergency Action Plan Review", "OSHA 29 CFR 1910.38", "US", "general", "annual", "document", "Review and update emergency action plan"),
  obligation("fire_extinguisher_inspection", "Fire Extinguisher Inspection", "OSHA 29 CFR 1910.157", "US", "inspection", "monthly", "manual", "Monthly visual inspection of all fire extinguishers"),
  obligation("ppe_hazard_assessment", "PPE Hazard Assessment", "OSHA 29 CFR 1910.132", "US", "risk_assessment", "annual", "document", "Assess workplace hazards and determine required PPE"),
];

// ── Netherlands (Arbowet) ──
const NL: ComplianceObligation[] = [
  obligation("rie_completion", "RI&E Completion", "Arbowet Art. 5", "NL", "risk_assessment", "annual", "document", "Complete and update Risk Inventory & Evaluation"),
  obligation("plan_van_aanpak", "Plan van Aanpak", "Arbowet Art. 5", "NL", "general", "annual", "document", "Create and review action plan based on RI&E findings"),
  obligation("bhv_organisation", "BHV Organisation", "Arbowet Art. 15", "NL", "training", "annual", "manual", "Ensure sufficient trained emergency responders (BHV)"),
  obligation("preventiemedewerker", "Preventiemedewerker Appointment", "Arbowet Art. 13", "NL", "general", "one_time", "document", "Appoint prevention officer(s) within the organisation"),
  obligation("arbodienst_contract", "Arbodienst Contract", "Arbowet Art. 14", "NL", "general", "annual", "document", "Maintain contract with occupational health service"),
];

// ── Sweden (AFS) ──
const SE: ComplianceObligation[] = [
  obligation("sam_documentation", "SAM Documentation", "AFS 2001:1", "SE", "risk_assessment", "annual", "document", "Document systematic work environment management (SAM)"),
  obligation("risk_assessment_update_se", "Risk Assessment Update", "AFS 2001:1", "SE", "risk_assessment", "annual", "document", "Update workplace risk assessments"),
  obligation("employee_consultation", "Employee Consultation", "AFS 2001:1", "SE", "general", "quarterly", "manual", "Consult employees on health & safety matters"),
  obligation("workplace_inspection_schedule", "Workplace Inspection Schedule", "AFS 2001:1", "SE", "inspection", "quarterly", "manual", "Schedule and conduct workplace inspections"),
];

// ── United Kingdom (HSE) ──
const GB: ComplianceObligation[] = [
  obligation("hs_policy", "Health & Safety Policy", "HSWA 1974", "GB", "general", "annual", "document", "Review and update written health & safety policy"),
  obligation("risk_assessment_review_gb", "Risk Assessment Review", "MHSW 1999", "GB", "risk_assessment", "annual", "document", "Review all workplace risk assessments"),
  obligation("coshh_assessments", "COSHH Assessments", "COSHH 2002", "GB", "risk_assessment", "annual", "document", "Review COSHH assessments for hazardous substances"),
  obligation("fire_risk_assessment", "Fire Risk Assessment", "Fire Safety Order 2005", "GB", "risk_assessment", "annual", "document", "Review and update fire risk assessment"),
];

// ── Germany (ArbSchG) ──
const DE: ComplianceObligation[] = [
  obligation("gefaehrdungsbeurteilung", "Gefährdungsbeurteilung", "ArbSchG §5", "DE", "risk_assessment", "annual", "document", "Conduct and update workplace hazard assessment"),
  obligation("arbeitsschutzausschuss", "Arbeitsschutzausschuss", "ASiG §11", "DE", "general", "quarterly", "manual", "Convene occupational safety committee meeting"),
  obligation("unterweisung_records", "Unterweisung Records", "ArbSchG §12", "DE", "training", "annual", "manual", "Document employee safety instruction records"),
];

// ── France (Code du travail) ──
const FR: ComplianceObligation[] = [
  obligation("duerp", "DUERP", "Code du travail R4121-1", "FR", "risk_assessment", "annual", "document", "Update Document Unique d'Évaluation des Risques Professionnels"),
  obligation("formation_securite", "Formation Sécurité Records", "Code du travail L4141-2", "FR", "training", "annual", "manual", "Maintain safety training records for all employees"),
];

// ── Spain (Ley 31/1995) ──
const ES: ComplianceObligation[] = [
  obligation("plan_prevencion", "Plan de Prevención", "Ley 31/1995 Art. 16", "ES", "general", "annual", "document", "Review and update occupational risk prevention plan"),
  obligation("evaluacion_riesgos", "Evaluación de Riesgos", "Ley 31/1995 Art. 16", "ES", "risk_assessment", "annual", "document", "Conduct and update workplace risk evaluation"),
];

/**
 * Returns all built-in compliance obligations across all supported countries.
 */
export function getBuiltInObligations(): ComplianceObligation[] {
  return [...US, ...NL, ...SE, ...GB, ...DE, ...FR, ...ES];
}
