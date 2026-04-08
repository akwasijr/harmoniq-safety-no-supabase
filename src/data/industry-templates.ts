import type {
  Country,
  IndustryCode,
  IndustryTemplatePack,
  IndustryChecklistTemplate,
  IndustryChecklistItem,
} from "@/types";

// ==========================================
// HELPERS
// ==========================================

/** Build an i18n key for a template-level field (name, description, category) */
const k = (industry: string, template: string, field: string) =>
  `industry_templates.${industry}.${template}.${field}`;

/** Build an i18n key for a checklist item question */
const ki = (industry: string, template: string, item: string) =>
  `industry_templates.${industry}.${template}.items.${item}`;

/** Shorthand to build an IndustryChecklistItem */
const item = (
  industry: string,
  template: string,
  key: string,
  type: IndustryChecklistItem["type"],
  order: number,
  required = true,
): IndustryChecklistItem => ({
  key,
  question_key: ki(industry, template, key),
  type,
  required,
  order,
});

const US_CENTRIC_REGULATION_PATTERN =
  /\b(OSHA|MSHA|FDA|USDA|NFPA|FMCSA|FAA|TSA|CPSC|NIOSH|NERC|Joint Commission|Needlestick Safety Act|FMVSS|EM 385|State oil & gas commission|State fire codes|State education codes|State AED laws|state health dept|state DOT)\b/i;

const COUNTRY_INDUSTRY_REGULATION_OVERRIDES: Record<
  Exclude<Country, "US">,
  Record<IndustryCode, string>
> = {
  NL: {
    construction: "Arbowet / RI&E",
    manufacturing: "Arbowet / NEN 3140",
    oil_gas: "Arbowet / BRZO",
    healthcare: "Arbowet / Wkkgz",
    warehousing: "Arbowet / NEN 3140",
    mining: "Mijnbouwwet / Arbowet",
    food_beverage: "HACCP / NVWA",
    utilities: "Arbowet / NEN 3140",
    transportation: "Arbowet / ILT",
    education: "Arbowet / BHV-richtlijnen",
    airports: "Arbowet / ILT / EASA",
  },
  SE: {
    construction: "AFS / SAM",
    manufacturing: "AFS / SAM",
    oil_gas: "AFS / SAM",
    healthcare: "AFS / Patientsäkerhetslagen",
    warehousing: "AFS / SAM",
    mining: "AFS / SAM",
    food_beverage: "Livsmedelsverket / HACCP",
    utilities: "AFS / ESA",
    transportation: "AFS / Transportstyrelsen",
    education: "AFS / Skolverket",
    airports: "AFS / Transportstyrelsen / EASA",
  },
  GB: {
    construction: "HSE CDM 2015 / RIDDOR",
    manufacturing: "HSE PUWER / LOLER",
    oil_gas: "HSE COMAH / DSEAR",
    healthcare: "Health and Safety at Work Act / COSHH",
    warehousing: "HSE PUWER / LOLER",
    mining: "Mines Regulations 2014 / Quarries Regulations 1999",
    food_beverage: "HACCP / Food Safety Act 1990",
    utilities: "Electricity at Work Regulations / HSE GS38",
    transportation: "DVSA / Road Vehicles Regulations / Working Time",
    education: "Health and Safety at Work Act / DfE guidance",
    airports: "CAA / EASA / HSG65",
  },
  DE: {
    construction: "ArbSchG / BaustellV / BetrSichV",
    manufacturing: "ArbSchG / BetrSichV",
    oil_gas: "ArbSchG / BetrSichV / GefStoffV",
    healthcare: "ArbSchG / BioStoffV",
    warehousing: "ArbSchG / BetrSichV",
    mining: "ArbSchG / BBergG",
    food_beverage: "HACCP / LMHV",
    utilities: "ArbSchG / DGUV",
    transportation: "ArbSchG / StVO / BKrFQG",
    education: "ArbSchG / DGUV",
    airports: "ArbSchG / EASA / LuftSiG",
  },
  FR: {
    construction: "Code du travail / PPSPS",
    manufacturing: "Code du travail / DUERP",
    oil_gas: "Code du travail / ICPE",
    healthcare: "Code du travail / HAS",
    warehousing: "Code du travail / CACES",
    mining: "Code du travail / Code minier",
    food_beverage: "HACCP / Paquet Hygiène",
    utilities: "Code du travail / NF C 18-510",
    transportation: "Code du travail / Code des transports",
    education: "Code du travail / ERP",
    airports: "Code du travail / EASA / DGAC",
  },
  ES: {
    construction: "Ley 31/1995 / RD 1627/1997",
    manufacturing: "Ley 31/1995 / RD 1215/1997",
    oil_gas: "Ley 31/1995 / RD 681/2003",
    healthcare: "Ley 31/1995 / Bioseguridad",
    warehousing: "Ley 31/1995 / RD 1215/1997",
    mining: "Ley 31/1995 / Normas Básicas de Seguridad Minera",
    food_beverage: "APPCC / AESAN",
    utilities: "Ley 31/1995 / RD 614/2001",
    transportation: "Ley 31/1995 / LOTT",
    education: "Ley 31/1995 / Plan de Autoprotección",
    airports: "Ley 31/1995 / AESA / EASA",
  },
};

export function resolveTemplateRegulation(
  template: IndustryChecklistTemplate,
  country: Country,
): string {
  if (country === "US") return template.regulation;
  if (!US_CENTRIC_REGULATION_PATTERN.test(template.regulation)) {
    return template.regulation;
  }
  return COUNTRY_INDUSTRY_REGULATION_OVERRIDES[country][template.industry];
}

// ==========================================
// INDUSTRY METADATA (icons & brand colours)
// ==========================================

export const INDUSTRY_METADATA: Record<
  IndustryCode,
  { icon: string; color: string; label_key: string }
> = {
  construction:    { icon: "HardHat",        color: "#F59E0B", label_key: "industry_templates.construction.name" },
  manufacturing:   { icon: "Factory",        color: "#6366F1", label_key: "industry_templates.manufacturing.name" },
  oil_gas:         { icon: "Flame",          color: "#EF4444", label_key: "industry_templates.oil_gas.name" },
  healthcare:      { icon: "HeartPulse",     color: "#EC4899", label_key: "industry_templates.healthcare.name" },
  warehousing:     { icon: "Warehouse",      color: "#8B5CF6", label_key: "industry_templates.warehousing.name" },
  mining:          { icon: "Mountain",       color: "#78716C", label_key: "industry_templates.mining.name" },
  food_beverage:   { icon: "UtensilsCrossed", color: "#22C55E", label_key: "industry_templates.food_beverage.name" },
  utilities:       { icon: "Zap",            color: "#F97316", label_key: "industry_templates.utilities.name" },
  transportation:  { icon: "Truck",          color: "#3B82F6", label_key: "industry_templates.transportation.name" },
  education:       { icon: "GraduationCap",  color: "#14B8A6", label_key: "industry_templates.education.name" },
  airports:        { icon: "PlaneTakeoff",   color: "#0EA5E9", label_key: "industry_templates.airports.name" },
};

// ==========================================
// 1. CONSTRUCTION (25 templates)
// ==========================================

const constructionTemplates: IndustryChecklistTemplate[] = [
  // 1-1  Job Hazard Analysis
  {
    id: "construction_jha",
    industry: "construction",
    name_key: k("construction", "jha", "name"),
    description_key: k("construction", "jha", "description"),
    category: "hazard_analysis",
    regulation: "OSHA 29 CFR 1926",
    frequency: "per_event",
    tags: ["jha", "risk_assessment", "hazard"],
    items: [
      item("construction", "jha", "task_description", "text", 1),
      item("construction", "jha", "step_sequence", "yes_no_na", 2),
      item("construction", "jha", "hazards_per_step", "yes_no_na", 3),
      item("construction", "jha", "risk_severity", "rating", 4),
      item("construction", "jha", "risk_probability", "rating", 5),
      item("construction", "jha", "control_measures", "text", 6),
      item("construction", "jha", "ppe_required", "yes_no_na", 7),
      item("construction", "jha", "responsible_person", "text", 8),
      item("construction", "jha", "workers_briefed", "yes_no_na", 9, false),
      item("construction", "jha", "sign_off", "yes_no_na", 10, false),
    ],
  },

  // 1-2  Fall Protection Audit
  {
    id: "construction_fall_protection",
    industry: "construction",
    name_key: k("construction", "fall_protection", "name"),
    description_key: k("construction", "fall_protection", "description"),
    category: "fall_protection",
    regulation: "OSHA 1926.501-503",
    frequency: "daily",
    tags: ["fall_protection", "harness", "guardrail"],
    items: [
      item("construction", "fall_protection", "guardrail_integrity", "pass_fail", 1),
      item("construction", "fall_protection", "harness_webbing", "pass_fail", 2),
      item("construction", "fall_protection", "harness_d_ring", "pass_fail", 3),
      item("construction", "fall_protection", "harness_stitching", "pass_fail", 4),
      item("construction", "fall_protection", "anchor_point_rating", "yes_no_na", 5),
      item("construction", "fall_protection", "safety_net_condition", "pass_fail", 6),
      item("construction", "fall_protection", "hole_covers_secured", "yes_no_na", 7, false),
      item("construction", "fall_protection", "ladder_tie_off", "pass_fail", 8, false),
    ],
  },

  // 1-3  Scaffold Inspection
  {
    id: "construction_scaffold",
    industry: "construction",
    name_key: k("construction", "scaffold", "name"),
    description_key: k("construction", "scaffold", "description"),
    category: "scaffold",
    regulation: "OSHA 1926.451",
    frequency: "per_shift",
    tags: ["scaffold", "inspection", "working_at_height"],
    items: [
      item("construction", "scaffold", "base_plate_mudsill", "yes_no_na", 1),
      item("construction", "scaffold", "cross_bracing", "pass_fail", 2),
      item("construction", "scaffold", "planking_complete", "yes_no_na", 3),
      item("construction", "scaffold", "guardrails_height", "yes_no_na", 4),
      item("construction", "scaffold", "toe_boards", "pass_fail", 5),
      item("construction", "scaffold", "access_ladder", "pass_fail", 6),
      item("construction", "scaffold", "load_capacity_posted", "pass_fail", 7, false),
      item("construction", "scaffold", "weather_damage", "yes_no_na", 8, false),
    ],
  },

  // 1-4  Toolbox Talk Record
  {
    id: "construction_toolbox_talk",
    industry: "construction",
    name_key: k("construction", "toolbox_talk", "name"),
    description_key: k("construction", "toolbox_talk", "description"),
    category: "training",
    regulation: "Best practice",
    frequency: "daily",
    tags: ["toolbox_talk", "training", "communication"],
    items: [
      item("construction", "toolbox_talk", "topic_covered", "text", 1),
      item("construction", "toolbox_talk", "presenter_name", "text", 2),
      item("construction", "toolbox_talk", "attendee_count", "number", 3),
      item("construction", "toolbox_talk", "attendees_signed", "yes_no_na", 4),
      item("construction", "toolbox_talk", "questions_raised", "yes_no_na", 5, false),
      item("construction", "toolbox_talk", "follow_up_actions", "text", 6, false),
    ],
  },

  // 1-5  Excavation / Trenching
  {
    id: "construction_excavation",
    industry: "construction",
    name_key: k("construction", "excavation", "name"),
    description_key: k("construction", "excavation", "description"),
    category: "excavation",
    regulation: "OSHA 1926.651-652",
    frequency: "daily",
    tags: ["excavation", "trenching", "shoring"],
    items: [
      item("construction", "excavation", "soil_classification", "text", 1),
      item("construction", "excavation", "shoring_adequate", "pass_fail", 2),
      item("construction", "excavation", "spoil_pile_distance", "pass_fail", 3),
      item("construction", "excavation", "water_accumulation", "yes_no_na", 4),
      item("construction", "excavation", "atmospheric_testing", "pass_fail", 5),
      item("construction", "excavation", "egress_points", "pass_fail", 6, false),
      item("construction", "excavation", "utilities_marked", "yes_no_na", 7, false),
    ],
  },

  // 1-6  Crane / Hoist Pre-Op
  {
    id: "construction_crane",
    industry: "construction",
    name_key: k("construction", "crane", "name"),
    description_key: k("construction", "crane", "description"),
    category: "heavy_equipment",
    regulation: "OSHA 1926.1400",
    frequency: "per_event",
    tags: ["crane", "hoist", "rigging"],
    items: [
      item("construction", "crane", "wire_rope_condition", "pass_fail", 1),
      item("construction", "crane", "hook_latch", "pass_fail", 2),
      item("construction", "crane", "outriggers_deployed", "pass_fail", 3),
      item("construction", "crane", "load_chart_available", "pass_fail", 4),
      item("construction", "crane", "swing_radius", "yes_no_na", 5),
      item("construction", "crane", "operator_certification", "pass_fail", 6, false),
      item("construction", "crane", "pre_lift_meeting", "yes_no_na", 7, false),
    ],
  },

  // 1-7  EM 385 Activity Hazard Analysis (AHA)
  {
    id: "construction_aha_em385",
    industry: "construction",
    name_key: k("construction", "aha_em385", "name"),
    description_key: k("construction", "aha_em385", "description"),
    category: "hazard_analysis",
    regulation: "EM 385-1-1 §01.A.13",
    frequency: "per_event",
    tags: ["aha", "em385", "hazard_analysis", "usace"],
    items: [
      item("construction", "aha_em385", "work_activity_defined", "yes_no_na", 1),
      item("construction", "aha_em385", "hazards_identified", "yes_no_na", 2),
      item("construction", "aha_em385", "severity_probability_assessed", "yes_no_na", 3),
      item("construction", "aha_em385", "controls_listed", "yes_no_na", 4),
      item("construction", "aha_em385", "responsible_person_assigned", "yes_no_na", 5),
      item("construction", "aha_em385", "ppe_requirements", "yes_no_na", 6),
      item("construction", "aha_em385", "training_verified", "yes_no_na", 7),
      item("construction", "aha_em385", "emergency_procedures", "yes_no_na", 8),
      item("construction", "aha_em385", "supervisor_approval", "yes_no_na", 9),
      item("construction", "aha_em385", "crew_briefed", "yes_no_na", 10),
    ],
  },

  // 1-8  EM 385 Daily Safety & Health Inspection
  {
    id: "construction_daily_em385",
    industry: "construction",
    name_key: k("construction", "daily_em385", "name"),
    description_key: k("construction", "daily_em385", "description"),
    category: "site_inspection",
    regulation: "EM 385-1-1 §01.A.14",
    frequency: "daily",
    tags: ["daily_inspection", "em385", "site_safety", "usace"],
    items: [
      item("construction", "daily_em385", "housekeeping", "pass_fail", 1),
      item("construction", "daily_em385", "ppe_compliance", "pass_fail", 2),
      item("construction", "daily_em385", "barricades_signage", "yes_no_na", 3),
      item("construction", "daily_em385", "electrical_safety", "pass_fail", 4),
      item("construction", "daily_em385", "fire_protection", "pass_fail", 5),
      item("construction", "daily_em385", "first_aid_available", "yes_no_na", 6),
      item("construction", "daily_em385", "emergency_info_posted", "yes_no_na", 7),
      item("construction", "daily_em385", "fall_protection", "pass_fail", 8),
      item("construction", "daily_em385", "excavation_protection", "pass_fail", 9),
      item("construction", "daily_em385", "scaffolding_condition", "pass_fail", 10),
      item("construction", "daily_em385", "vehicle_equipment", "pass_fail", 11),
      item("construction", "daily_em385", "environmental_controls", "yes_no_na", 12),
    ],
  },

  // 1-9  EM 385 Crane Critical Lift Plan
  {
    id: "construction_crane_em385",
    industry: "construction",
    name_key: k("construction", "crane_em385", "name"),
    description_key: k("construction", "crane_em385", "description"),
    category: "equipment",
    regulation: "EM 385-1-1 §16",
    frequency: "per_event",
    tags: ["crane", "critical_lift", "em385", "rigging", "usace"],
    items: [
      item("construction", "crane_em385", "crane_capacity_verified", "yes_no_na", 1),
      item("construction", "crane_em385", "load_weight_calculated", "yes_no_na", 2),
      item("construction", "crane_em385", "rigging_inspected", "pass_fail", 3),
      item("construction", "crane_em385", "ground_conditions", "pass_fail", 4),
      item("construction", "crane_em385", "swing_radius_clear", "yes_no_na", 5),
      item("construction", "crane_em385", "signal_person_designated", "yes_no_na", 6),
      item("construction", "crane_em385", "lift_plan_reviewed", "yes_no_na", 7),
      item("construction", "crane_em385", "weather_conditions", "yes_no_na", 8),
      item("construction", "crane_em385", "communication_established", "yes_no_na", 9),
      item("construction", "crane_em385", "competent_person_present", "yes_no_na", 10),
    ],
  },

  // 1-10 EM 385 Confined Space Entry
  {
    id: "construction_confined_em385",
    industry: "construction",
    name_key: k("construction", "confined_em385", "name"),
    description_key: k("construction", "confined_em385", "description"),
    category: "confined_space",
    regulation: "EM 385-1-1 §06.H",
    frequency: "per_event",
    tags: ["confined_space", "em385", "permit_required", "usace"],
    items: [
      item("construction", "confined_em385", "atmosphere_tested", "pass_fail", 1),
      item("construction", "confined_em385", "ventilation_adequate", "pass_fail", 2),
      item("construction", "confined_em385", "rescue_plan_in_place", "yes_no_na", 3),
      item("construction", "confined_em385", "entrant_attendant_supervisor", "yes_no_na", 4),
      item("construction", "confined_em385", "communication_system", "yes_no_na", 5),
      item("construction", "confined_em385", "lockout_completed", "yes_no_na", 6),
      item("construction", "confined_em385", "emergency_services_notified", "yes_no_na", 7),
      item("construction", "confined_em385", "continuous_monitoring", "yes_no_na", 8),
      item("construction", "confined_em385", "entry_log_maintained", "yes_no_na", 9),
      item("construction", "confined_em385", "permit_signed", "yes_no_na", 10),
    ],
  },

  // 1-11 EM 385 Fall Protection Plan
  {
    id: "construction_fall_em385",
    industry: "construction",
    name_key: k("construction", "fall_em385", "name"),
    description_key: k("construction", "fall_em385", "description"),
    category: "fall_protection",
    regulation: "EM 385-1-1 §21",
    frequency: "weekly",
    tags: ["fall_protection", "em385", "pfas", "guardrail", "usace"],
    items: [
      item("construction", "fall_em385", "leading_edges_identified", "yes_no_na", 1),
      item("construction", "fall_em385", "guardrails_installed", "pass_fail", 2),
      item("construction", "fall_em385", "pfas_inspected", "pass_fail", 3),
      item("construction", "fall_em385", "anchorage_points_rated", "yes_no_na", 4),
      item("construction", "fall_em385", "rescue_plan", "yes_no_na", 5),
      item("construction", "fall_em385", "controlled_access_zones", "yes_no_na", 6),
      item("construction", "fall_em385", "safety_nets", "pass_fail", 7),
      item("construction", "fall_em385", "warning_lines", "yes_no_na", 8),
      item("construction", "fall_em385", "hole_covers_secured", "pass_fail", 9),
      item("construction", "fall_em385", "training_current", "yes_no_na", 10),
    ],
  },

  // 1-12 EM 385 Excavation Safety
  {
    id: "construction_excavation_em385",
    industry: "construction",
    name_key: k("construction", "excavation_em385", "name"),
    description_key: k("construction", "excavation_em385", "description"),
    category: "excavation",
    regulation: "EM 385-1-1 §25",
    frequency: "daily",
    tags: ["excavation", "em385", "shoring", "trenching", "usace"],
    items: [
      item("construction", "excavation_em385", "soil_classified", "yes_no_na", 1),
      item("construction", "excavation_em385", "shoring_sloping_adequate", "pass_fail", 2),
      item("construction", "excavation_em385", "spoil_pile_distance", "pass_fail", 3),
      item("construction", "excavation_em385", "access_egress_provided", "pass_fail", 4),
      item("construction", "excavation_em385", "utilities_located", "yes_no_na", 5),
      item("construction", "excavation_em385", "atmosphere_tested", "pass_fail", 6),
      item("construction", "excavation_em385", "water_control", "yes_no_na", 7),
      item("construction", "excavation_em385", "adjacent_structures_stable", "yes_no_na", 8),
      item("construction", "excavation_em385", "competent_person_assigned", "yes_no_na", 9),
      item("construction", "excavation_em385", "daily_inspection_documented", "yes_no_na", 10),
    ],
  },

  // 1-13 Marine Terminal Safety
  {
    id: "construction_marine_terminal",
    industry: "construction",
    name_key: k("construction", "marine_terminal", "name"),
    description_key: k("construction", "marine_terminal", "description"),
    category: "maritime",
    regulation: "OSHA 1917/1918",
    frequency: "daily",
    tags: ["maritime", "marine_terminal", "longshoring", "port"],
    items: [
      item("construction", "marine_terminal", "walking_surfaces", "pass_fail", 1),
      item("construction", "marine_terminal", "edge_protection", "pass_fail", 2),
      item("construction", "marine_terminal", "cargo_handling_equipment", "pass_fail", 3),
      item("construction", "marine_terminal", "lighting_adequate", "yes_no_na", 4),
      item("construction", "marine_terminal", "emergency_equipment", "yes_no_na", 5),
      item("construction", "marine_terminal", "vessel_access", "pass_fail", 6),
      item("construction", "marine_terminal", "hazcom_compliance", "yes_no_na", 7),
      item("construction", "marine_terminal", "ppe_in_use", "pass_fail", 8),
    ],
  },

  // 1-14 Shipyard Competent Person Inspection
  {
    id: "construction_shipyard",
    industry: "construction",
    name_key: k("construction", "shipyard", "name"),
    description_key: k("construction", "shipyard", "description"),
    category: "maritime",
    regulation: "OSHA 1915.135",
    frequency: "daily",
    tags: ["shipyard", "maritime", "competent_person", "hot_work"],
    items: [
      item("construction", "shipyard", "fire_watch_posted", "yes_no_na", 1),
      item("construction", "shipyard", "hot_work_permit", "yes_no_na", 2),
      item("construction", "shipyard", "confined_space_tested", "pass_fail", 3),
      item("construction", "shipyard", "scaffolding_inspected", "pass_fail", 4),
      item("construction", "shipyard", "fall_protection_in_place", "pass_fail", 5),
      item("construction", "shipyard", "electrical_safety", "pass_fail", 6),
      item("construction", "shipyard", "ventilation_adequate", "pass_fail", 7),
      item("construction", "shipyard", "housekeeping", "pass_fail", 8),
    ],
  },

  // 1-NL-1  LMRA (Laatste Minuut Risico Analyse)
  {
    id: "construction_lmra",
    industry: "construction",
    name_key: k("construction", "lmra", "name"),
    description_key: k("construction", "lmra", "description"),
    category: "hazard_analysis",
    regulation: "Arbowet Art. 5 / LMRA",
    frequency: "per_shift",
    tags: ["lmra", "risico_analyse", "laatste_minuut", "nl"],
    items: [
      item("construction", "lmra", "taak_begrepen", "yes_no_na", 1),
      item("construction", "lmra", "gevaren_geidentificeerd", "yes_no_na", 2),
      item("construction", "lmra", "pbm_correct", "yes_no_na", 3),
      item("construction", "lmra", "gereedschap_geinspecteerd", "pass_fail", 4),
      item("construction", "lmra", "werkplek_veilig", "yes_no_na", 5),
      item("construction", "lmra", "nooduitgang_bekend", "yes_no_na", 6),
      item("construction", "lmra", "collega_geinformeerd", "yes_no_na", 7),
      item("construction", "lmra", "stopwerk_bevoegdheid_begrepen", "yes_no_na", 8),
    ],
  },

  // 1-NL-2  Toolbox Meeting (NL)
  {
    id: "construction_toolbox_nl",
    industry: "construction",
    name_key: k("construction", "toolbox_nl", "name"),
    description_key: k("construction", "toolbox_nl", "description"),
    category: "training",
    regulation: "Arbowet Art. 8",
    frequency: "weekly",
    tags: ["toolbox", "voorlichting", "training", "nl"],
    items: [
      item("construction", "toolbox_nl", "onderwerp_gekozen", "yes_no_na", 1),
      item("construction", "toolbox_nl", "alle_medewerkers_aanwezig", "yes_no_na", 2),
      item("construction", "toolbox_nl", "gevaren_van_de_week_besproken", "yes_no_na", 3),
      item("construction", "toolbox_nl", "pbm_herinneringen", "yes_no_na", 4),
      item("construction", "toolbox_nl", "bijna_incidenten_besproken", "yes_no_na", 5),
      item("construction", "toolbox_nl", "vragen_behandeld", "yes_no_na", 6),
      item("construction", "toolbox_nl", "presentielijst_ingevuld", "yes_no_na", 7),
      item("construction", "toolbox_nl", "vervolgacties_genoteerd", "text", 8),
    ],
  },

  // 1-NL-3  Werkvergunning (Work Permit Check)
  {
    id: "construction_werkvergunning",
    industry: "construction",
    name_key: k("construction", "werkvergunning", "name"),
    description_key: k("construction", "werkvergunning", "description"),
    category: "permits",
    regulation: "Arbowet / BRZO",
    frequency: "per_event",
    tags: ["werkvergunning", "vergunning", "permits", "nl"],
    items: [
      item("construction", "werkvergunning", "werkvergunning_afgegeven", "yes_no_na", 1),
      item("construction", "werkvergunning", "werkomvang_duidelijk", "yes_no_na", 2),
      item("construction", "werkvergunning", "gevaren_geidentificeerd", "yes_no_na", 3),
      item("construction", "werkvergunning", "beheersmaatregelen_getroffen", "yes_no_na", 4),
      item("construction", "werkvergunning", "gasvrij_verklaring", "yes_no_na", 5, false),
      item("construction", "werkvergunning", "brandwacht_geregeld", "yes_no_na", 6),
      item("construction", "werkvergunning", "besloten_ruimte_vergunning", "yes_no_na", 7, false),
      item("construction", "werkvergunning", "isolatie_bevestigd", "yes_no_na", 8),
      item("construction", "werkvergunning", "noodprocedures_doorgenomen", "yes_no_na", 9),
      item("construction", "werkvergunning", "leidinggevende_getekend", "yes_no_na", 10),
    ],
  },

  // 1-NL-4  VCA Audit (Contractor Safety)
  {
    id: "construction_vca",
    industry: "construction",
    name_key: k("construction", "vca", "name"),
    description_key: k("construction", "vca", "description"),
    category: "audit",
    regulation: "VCA 2017/6.0",
    frequency: "quarterly",
    tags: ["vca", "aannemers", "audit", "nl"],
    items: [
      item("construction", "vca", "vca_certificaat_geldig", "yes_no_na", 1),
      item("construction", "vca", "toolboxmeetings_gehouden", "yes_no_na", 2),
      item("construction", "vca", "incidentregistratie_bijgewerkt", "yes_no_na", 3),
      item("construction", "vca", "pbm_naleving", "pass_fail", 4),
      item("construction", "vca", "risico_inventarisaties_actueel", "yes_no_na", 5),
      item("construction", "vca", "deskundig_toezicht", "yes_no_na", 6),
      item("construction", "vca", "opleidingsregistratie_compleet", "yes_no_na", 7),
      item("construction", "vca", "onderaannemer_naleving", "yes_no_na", 8),
      item("construction", "vca", "werkvergunningen_gebruikt", "yes_no_na", 9),
      item("construction", "vca", "veiligheidsobservaties_gedocumenteerd", "yes_no_na", 10),
    ],
  },

  // 1-SE-1  Skyddsrond (Safety Inspection Round)
  {
    id: "construction_skyddsrond",
    industry: "construction",
    name_key: k("construction", "skyddsrond", "name"),
    description_key: k("construction", "skyddsrond", "description"),
    category: "site_inspection",
    regulation: "AFS 2001:1",
    frequency: "monthly",
    tags: ["skyddsrond", "safety_inspection", "arbetsmiljo", "se"],
    items: [
      item("construction", "skyddsrond", "arbetsmiljo_general", "yes_no_na", 1),
      item("construction", "skyddsrond", "ventilation", "yes_no_na", 2),
      item("construction", "skyddsrond", "belysning", "yes_no_na", 3),
      item("construction", "skyddsrond", "buller", "yes_no_na", 4),
      item("construction", "skyddsrond", "kemikalier", "yes_no_na", 5),
      item("construction", "skyddsrond", "ergonomi", "yes_no_na", 6),
      item("construction", "skyddsrond", "maskiner", "pass_fail", 7),
      item("construction", "skyddsrond", "el_sakerhet", "pass_fail", 8),
      item("construction", "skyddsrond", "brand", "yes_no_na", 9),
      item("construction", "skyddsrond", "ordning", "yes_no_na", 10),
    ],
  },

  // 1-SE-2  Arbete på hög höjd
  {
    id: "construction_height_se",
    industry: "construction",
    name_key: k("construction", "height_se", "name"),
    description_key: k("construction", "height_se", "description"),
    category: "fall_protection",
    regulation: "AFS 2003:6",
    frequency: "per_event",
    tags: ["height", "fall_protection", "hog_hojd", "se"],
    items: [
      item("construction", "height_se", "work_plan_created", "yes_no_na", 1),
      item("construction", "height_se", "fall_protection_in_place", "pass_fail", 2),
      item("construction", "height_se", "equipment_inspected", "pass_fail", 3),
      item("construction", "height_se", "rescue_plan", "yes_no_na", 4),
      item("construction", "height_se", "workers_trained", "yes_no_na", 5),
      item("construction", "height_se", "weather_checked", "yes_no_na", 6),
      item("construction", "height_se", "barriers_installed", "pass_fail", 7),
      item("construction", "height_se", "supervisor_present", "yes_no_na", 8),
    ],
  },

  // 1-GB-1  CDM Pre-Construction Phase Plan
  {
    id: "construction_cdm",
    industry: "construction",
    name_key: k("construction", "cdm", "name"),
    description_key: k("construction", "cdm", "description"),
    category: "planning",
    regulation: "CDM 2015",
    frequency: "per_event",
    tags: ["cdm", "pre_construction", "phase_plan", "gb"],
    items: [
      item("construction", "cdm", "project_description", "text", 1),
      item("construction", "cdm", "client_duties", "yes_no_na", 2),
      item("construction", "cdm", "principal_designer_appointed", "yes_no_na", 3),
      item("construction", "cdm", "site_rules", "yes_no_na", 4),
      item("construction", "cdm", "risk_management_approach", "text", 5),
      item("construction", "cdm", "welfare_arrangements", "yes_no_na", 6),
      item("construction", "cdm", "emergency_procedures", "yes_no_na", 7),
      item("construction", "cdm", "health_hazards", "yes_no_na", 8),
      item("construction", "cdm", "environmental_considerations", "yes_no_na", 9),
      item("construction", "cdm", "design_risk_register", "yes_no_na", 10),
    ],
  },

  // 1-GB-2  RIDDOR Incident Assessment
  {
    id: "construction_riddor",
    industry: "construction",
    name_key: k("construction", "riddor", "name"),
    description_key: k("construction", "riddor", "description"),
    category: "incident",
    regulation: "RIDDOR 2013",
    frequency: "per_event",
    tags: ["riddor", "incident", "reporting", "gb"],
    items: [
      item("construction", "riddor", "incident_type_classified", "text", 1),
      item("construction", "riddor", "over_7_day_injury", "yes_no_na", 2),
      item("construction", "riddor", "specified_injury", "yes_no_na", 3),
      item("construction", "riddor", "dangerous_occurrence", "yes_no_na", 4),
      item("construction", "riddor", "occupational_disease", "yes_no_na", 5),
      item("construction", "riddor", "hse_notification_required", "yes_no_na", 6),
      item("construction", "riddor", "investigation_started", "yes_no_na", 7),
      item("construction", "riddor", "corrective_actions", "text", 8),
    ],
  },

  // 1-GB-3  LOLER Lifting Equipment
  {
    id: "construction_loler",
    industry: "construction",
    name_key: k("construction", "loler", "name"),
    description_key: k("construction", "loler", "description"),
    category: "equipment",
    regulation: "LOLER 1998",
    frequency: "monthly",
    tags: ["loler", "lifting", "equipment", "gb"],
    items: [
      item("construction", "loler", "lifting_plan", "yes_no_na", 1),
      item("construction", "loler", "equipment_inspected", "pass_fail", 2),
      item("construction", "loler", "swl_marked", "pass_fail", 3),
      item("construction", "loler", "thorough_examination_in_date", "yes_no_na", 4),
      item("construction", "loler", "accessories_checked", "pass_fail", 5),
      item("construction", "loler", "competent_person", "yes_no_na", 6),
      item("construction", "loler", "ground_conditions", "yes_no_na", 7),
      item("construction", "loler", "exclusion_zone", "yes_no_na", 8),
      item("construction", "loler", "communication_plan", "yes_no_na", 9),
      item("construction", "loler", "records_filed", "yes_no_na", 10),
    ],
  },

  // 1-GB-4  Permit to Work
  {
    id: "construction_ptw_uk",
    industry: "construction",
    name_key: k("construction", "ptw_uk", "name"),
    description_key: k("construction", "ptw_uk", "description"),
    category: "permits",
    regulation: "HSE HSG250",
    frequency: "per_event",
    tags: ["permit_to_work", "ptw", "hot_work", "gb"],
    items: [
      item("construction", "ptw_uk", "work_scope_defined", "text", 1),
      item("construction", "ptw_uk", "hazards_identified", "yes_no_na", 2),
      item("construction", "ptw_uk", "precautions_specified", "yes_no_na", 3),
      item("construction", "ptw_uk", "isolations_confirmed", "yes_no_na", 4),
      item("construction", "ptw_uk", "gas_test_if_needed", "yes_no_na", 5),
      item("construction", "ptw_uk", "competent_person_authorized", "yes_no_na", 6),
      item("construction", "ptw_uk", "time_validity", "text", 7),
      item("construction", "ptw_uk", "communication_plan", "yes_no_na", 8),
      item("construction", "ptw_uk", "emergency_procedures", "yes_no_na", 9),
      item("construction", "ptw_uk", "permit_closed_out", "yes_no_na", 10),
    ],
  },

  // 1-GB-5  RAMS (Risk Assessment & Method Statement)
  {
    id: "construction_rams",
    industry: "construction",
    name_key: k("construction", "rams", "name"),
    description_key: k("construction", "rams", "description"),
    category: "planning",
    regulation: "CDM 2015 / HSE",
    frequency: "per_event",
    tags: ["rams", "risk_assessment", "method_statement", "gb"],
    items: [
      item("construction", "rams", "task_sequence", "text", 1),
      item("construction", "rams", "hazards_per_step", "yes_no_na", 2),
      item("construction", "rams", "risk_rating", "rating", 3),
      item("construction", "rams", "control_measures", "text", 4),
      item("construction", "rams", "ppe_requirements", "yes_no_na", 5),
      item("construction", "rams", "competence_requirements", "yes_no_na", 6),
      item("construction", "rams", "plant_equipment", "yes_no_na", 7),
      item("construction", "rams", "emergency_procedures", "yes_no_na", 8),
      item("construction", "rams", "environmental_controls", "yes_no_na", 9),
      item("construction", "rams", "review_approval", "yes_no_na", 10),
    ],
  },
];

// ==========================================
// 2. MANUFACTURING (25 templates)
// ==========================================

const manufacturingTemplates: IndustryChecklistTemplate[] = [
  // 2-1  Lockout/Tagout Verification
  {
    id: "manufacturing_loto",
    industry: "manufacturing",
    name_key: k("manufacturing", "loto", "name"),
    description_key: k("manufacturing", "loto", "description"),
    category: "energy_control",
    regulation: "OSHA 1910.147",
    frequency: "per_event",
    tags: ["loto", "lockout_tagout", "energy_isolation"],
    items: [
      item("manufacturing", "loto", "machine_identified", "yes_no_na", 1),
      item("manufacturing", "loto", "energy_sources_listed", "yes_no_na", 2),
      item("manufacturing", "loto", "isolation_devices", "yes_no_na", 3),
      item("manufacturing", "loto", "stored_energy_released", "pass_fail", 4),
      item("manufacturing", "loto", "verification_attempted", "yes_no_na", 5),
      item("manufacturing", "loto", "authorized_employee", "yes_no_na", 6),
      item("manufacturing", "loto", "group_lockout", "yes_no_na", 7, false),
      item("manufacturing", "loto", "tags_attached", "yes_no_na", 8, false),
    ],
  },

  // 2-2  Machine Guarding
  {
    id: "manufacturing_machine_guarding",
    industry: "manufacturing",
    name_key: k("manufacturing", "machine_guarding", "name"),
    description_key: k("manufacturing", "machine_guarding", "description"),
    category: "machine_safety",
    regulation: "OSHA 1910.211-219",
    frequency: "weekly",
    tags: ["machine_guarding", "interlocks", "e_stop"],
    items: [
      item("manufacturing", "machine_guarding", "point_of_operation", "yes_no_na", 1),
      item("manufacturing", "machine_guarding", "interlock_functioning", "pass_fail", 2),
      item("manufacturing", "machine_guarding", "emergency_stop", "yes_no_na", 3),
      item("manufacturing", "machine_guarding", "light_curtain", "yes_no_na", 4),
      item("manufacturing", "machine_guarding", "guard_mounting", "yes_no_na", 5),
      item("manufacturing", "machine_guarding", "no_bypass", "yes_no_na", 6, false),
      item("manufacturing", "machine_guarding", "warning_labels", "yes_no_na", 7, false),
    ],
  },

  // 2-3  Ergonomic Assessment
  {
    id: "manufacturing_ergonomic",
    industry: "manufacturing",
    name_key: k("manufacturing", "ergonomic", "name"),
    description_key: k("manufacturing", "ergonomic", "description"),
    category: "ergonomics",
    regulation: "OSHA General Duty / NIOSH",
    frequency: "quarterly",
    tags: ["ergonomics", "repetitive_motion", "workstation"],
    items: [
      item("manufacturing", "ergonomic", "repetitive_motion", "yes_no_na", 1),
      item("manufacturing", "ergonomic", "force_requirements", "rating", 2),
      item("manufacturing", "ergonomic", "awkward_postures", "yes_no_na", 3),
      item("manufacturing", "ergonomic", "workstation_height", "pass_fail", 4),
      item("manufacturing", "ergonomic", "tool_grip", "yes_no_na", 5),
      item("manufacturing", "ergonomic", "rest_breaks", "yes_no_na", 6, false),
      item("manufacturing", "ergonomic", "modifications", "yes_no_na", 7, false),
    ],
  },

  // 2-4  Forklift Daily Pre-Use
  {
    id: "manufacturing_forklift",
    industry: "manufacturing",
    name_key: k("manufacturing", "forklift", "name"),
    description_key: k("manufacturing", "forklift", "description"),
    category: "mobile_equipment",
    regulation: "OSHA 1910.178",
    frequency: "per_shift",
    tags: ["forklift", "pre_use", "powered_industrial_truck"],
    items: [
      item("manufacturing", "forklift", "tires_wheels", "yes_no_na", 1),
      item("manufacturing", "forklift", "forks_condition", "pass_fail", 2),
      item("manufacturing", "forklift", "hydraulic_lines", "yes_no_na", 3),
      item("manufacturing", "forklift", "mast_chains", "pass_fail", 4),
      item("manufacturing", "forklift", "horn_working", "yes_no_na", 5),
      item("manufacturing", "forklift", "lights_working", "yes_no_na", 6),
      item("manufacturing", "forklift", "backup_alarm", "pass_fail", 7),
      item("manufacturing", "forklift", "seatbelt", "pass_fail", 8),
      item("manufacturing", "forklift", "brakes_tested", "yes_no_na", 9),
      item("manufacturing", "forklift", "steering", "yes_no_na", 10),
      item("manufacturing", "forklift", "battery_fuel", "pass_fail", 11, false),
      item("manufacturing", "forklift", "fire_extinguisher", "pass_fail", 12, false),
    ],
  },

  // 2-5  Chemical Spill Readiness
  {
    id: "manufacturing_chemical_spill",
    industry: "manufacturing",
    name_key: k("manufacturing", "chemical_spill", "name"),
    description_key: k("manufacturing", "chemical_spill", "description"),
    category: "hazmat",
    regulation: "OSHA 1910.120 / 1910.1200",
    frequency: "monthly",
    tags: ["chemical_spill", "hazmat", "emergency_preparedness"],
    items: [
      item("manufacturing", "chemical_spill", "spill_kit_location", "pass_fail", 1),
      item("manufacturing", "chemical_spill", "spill_kit_contents", "pass_fail", 2),
      item("manufacturing", "chemical_spill", "sds_binder", "yes_no_na", 3),
      item("manufacturing", "chemical_spill", "eyewash_tested", "yes_no_na", 4),
      item("manufacturing", "chemical_spill", "shower_tested", "yes_no_na", 5),
      item("manufacturing", "chemical_spill", "ppe_available", "pass_fail", 6),
      item("manufacturing", "chemical_spill", "emergency_contacts", "yes_no_na", 7, false),
      item("manufacturing", "chemical_spill", "evacuation_route", "yes_no_na", 8, false),
    ],
  },

  // 2-6  Production Floor Safety Walk
  {
    id: "manufacturing_safety_walk",
    industry: "manufacturing",
    name_key: k("manufacturing", "safety_walk", "name"),
    description_key: k("manufacturing", "safety_walk", "description"),
    category: "general_safety",
    regulation: "Best practice",
    frequency: "daily",
    tags: ["safety_walk", "housekeeping", "compliance"],
    items: [
      item("manufacturing", "safety_walk", "aisles_clear", "pass_fail", 1),
      item("manufacturing", "safety_walk", "ppe_compliance", "pass_fail", 2),
      item("manufacturing", "safety_walk", "housekeeping", "pass_fail", 3),
      item("manufacturing", "safety_walk", "emergency_exits", "yes_no_na", 4),
      item("manufacturing", "safety_walk", "fire_extinguishers", "pass_fail", 5),
      item("manufacturing", "safety_walk", "noise_levels", "yes_no_na", 6),
      item("manufacturing", "safety_walk", "first_aid_kit", "yes_no_na", 7, false),
      item("manufacturing", "safety_walk", "general_observations", "yes_no_na", 8, false),
    ],
  },

  // 2-7  Process Hazard Analysis (PHA) Review
  {
    id: "manufacturing_pha",
    industry: "manufacturing",
    name_key: k("manufacturing", "pha", "name"),
    description_key: k("manufacturing", "pha", "description"),
    category: "process_safety",
    regulation: "OSHA 1910.119(e)",
    frequency: "per_event",
    tags: ["psm", "pha", "process_hazard", "chemical"],
    items: [
      item("manufacturing", "pha", "process_description_current", "yes_no_na", 1),
      item("manufacturing", "pha", "hazards_identified", "yes_no_na", 2),
      item("manufacturing", "pha", "previous_incidents_reviewed", "yes_no_na", 3),
      item("manufacturing", "pha", "engineering_controls", "yes_no_na", 4),
      item("manufacturing", "pha", "administrative_controls", "yes_no_na", 5),
      item("manufacturing", "pha", "consequences_analyzed", "yes_no_na", 6),
      item("manufacturing", "pha", "safeguards_adequate", "yes_no_na", 7),
      item("manufacturing", "pha", "human_factors_considered", "yes_no_na", 8),
      item("manufacturing", "pha", "recommendations_documented", "yes_no_na", 9),
      item("manufacturing", "pha", "team_qualifications_verified", "yes_no_na", 10),
    ],
  },

  // 2-8  Management of Change (MOC)
  {
    id: "manufacturing_moc",
    industry: "manufacturing",
    name_key: k("manufacturing", "moc", "name"),
    description_key: k("manufacturing", "moc", "description"),
    category: "process_safety",
    regulation: "OSHA 1910.119(l)",
    frequency: "per_event",
    tags: ["psm", "moc", "management_of_change", "chemical"],
    items: [
      item("manufacturing", "moc", "change_description", "yes_no_na", 1),
      item("manufacturing", "moc", "technical_basis", "yes_no_na", 2),
      item("manufacturing", "moc", "safety_impact_assessed", "yes_no_na", 3),
      item("manufacturing", "moc", "operating_procedures_updated", "yes_no_na", 4),
      item("manufacturing", "moc", "training_completed", "yes_no_na", 5),
      item("manufacturing", "moc", "pre_startup_review", "yes_no_na", 6),
      item("manufacturing", "moc", "authorization_obtained", "yes_no_na", 7),
      item("manufacturing", "moc", "affected_personnel_notified", "yes_no_na", 8),
    ],
  },

  // 2-9  Pre-Startup Safety Review (PSSR)
  {
    id: "manufacturing_pssr",
    industry: "manufacturing",
    name_key: k("manufacturing", "pssr", "name"),
    description_key: k("manufacturing", "pssr", "description"),
    category: "process_safety",
    regulation: "OSHA 1910.119(i)",
    frequency: "per_event",
    tags: ["psm", "pssr", "pre_startup", "chemical"],
    items: [
      item("manufacturing", "pssr", "construction_meets_specs", "yes_no_na", 1),
      item("manufacturing", "pssr", "safety_systems_functional", "pass_fail", 2),
      item("manufacturing", "pssr", "procedures_in_place", "yes_no_na", 3),
      item("manufacturing", "pssr", "pha_recommendations_resolved", "yes_no_na", 4),
      item("manufacturing", "pssr", "training_completed", "yes_no_na", 5),
      item("manufacturing", "pssr", "emergency_procedures_ready", "yes_no_na", 6),
      item("manufacturing", "pssr", "moc_requirements_met", "yes_no_na", 7),
      item("manufacturing", "pssr", "environmental_permits", "yes_no_na", 8),
      item("manufacturing", "pssr", "process_safety_info_updated", "yes_no_na", 9),
      item("manufacturing", "pssr", "management_authorization", "yes_no_na", 10),
    ],
  },

  // 2-10 Arc Flash Risk Assessment
  {
    id: "manufacturing_arc_flash",
    industry: "manufacturing",
    name_key: k("manufacturing", "arc_flash", "name"),
    description_key: k("manufacturing", "arc_flash", "description"),
    category: "electrical_safety",
    regulation: "NFPA 70E / OSHA 1910.269",
    frequency: "per_event",
    tags: ["arc_flash", "nfpa_70e", "electrical", "ppe"],
    items: [
      item("manufacturing", "arc_flash", "incident_energy_calculated", "yes_no_na", 1),
      item("manufacturing", "arc_flash", "arc_flash_labels_posted", "pass_fail", 2),
      item("manufacturing", "arc_flash", "ppe_category_determined", "yes_no_na", 3),
      item("manufacturing", "arc_flash", "approach_boundaries_marked", "yes_no_na", 4),
      item("manufacturing", "arc_flash", "energized_work_permit", "yes_no_na", 5),
      item("manufacturing", "arc_flash", "qualified_personnel_verified", "yes_no_na", 6),
      item("manufacturing", "arc_flash", "de_energization_feasible", "yes_no_na", 7),
      item("manufacturing", "arc_flash", "protective_equipment_available", "pass_fail", 8),
      item("manufacturing", "arc_flash", "emergency_procedures", "yes_no_na", 9),
      item("manufacturing", "arc_flash", "documentation_complete", "yes_no_na", 10),
    ],
  },

  // 2-11 Electrical Safety Program Audit
  {
    id: "manufacturing_electrical_audit",
    industry: "manufacturing",
    name_key: k("manufacturing", "electrical_audit", "name"),
    description_key: k("manufacturing", "electrical_audit", "description"),
    category: "electrical_safety",
    regulation: "NFPA 70E §110.3",
    frequency: "monthly",
    tags: ["electrical_safety", "nfpa_70e", "audit", "program"],
    items: [
      item("manufacturing", "electrical_audit", "written_program_current", "yes_no_na", 1),
      item("manufacturing", "electrical_audit", "training_records", "pass_fail", 2),
      item("manufacturing", "electrical_audit", "ppe_inspection_records", "pass_fail", 3),
      item("manufacturing", "electrical_audit", "energized_work_permits", "yes_no_na", 4),
      item("manufacturing", "electrical_audit", "lockout_tagout_procedures", "pass_fail", 5),
      item("manufacturing", "electrical_audit", "arc_flash_study_current", "yes_no_na", 6),
      item("manufacturing", "electrical_audit", "equipment_labeling", "pass_fail", 7),
      item("manufacturing", "electrical_audit", "incident_investigation", "yes_no_na", 8),
      item("manufacturing", "electrical_audit", "contractor_compliance", "yes_no_na", 9),
      item("manufacturing", "electrical_audit", "program_audit_documented", "yes_no_na", 10),
    ],
  },

  // 2-NL-1  BHV Oefening (Emergency Drill)
  {
    id: "manufacturing_bhv_drill",
    industry: "manufacturing",
    name_key: k("manufacturing", "bhv_drill", "name"),
    description_key: k("manufacturing", "bhv_drill", "description"),
    category: "emergency",
    regulation: "Arbowet Art. 15",
    frequency: "quarterly",
    tags: ["bhv", "ontruiming", "oefening", "noodplan", "nl"],
    items: [
      item("manufacturing", "bhv_drill", "alarmsysteem_getest", "pass_fail", 1),
      item("manufacturing", "bhv_drill", "vluchtroute_vrij", "pass_fail", 2),
      item("manufacturing", "bhv_drill", "verzamelplaats_bereikbaar", "yes_no_na", 3),
      item("manufacturing", "bhv_drill", "bhv_team_aanwezig", "yes_no_na", 4),
      item("manufacturing", "bhv_drill", "ehbo_koffer_compleet", "pass_fail", 5),
      item("manufacturing", "bhv_drill", "aed_operationeel", "pass_fail", 6),
      item("manufacturing", "bhv_drill", "communicatie_werkend", "pass_fail", 7),
      item("manufacturing", "bhv_drill", "brandblussers_gecontroleerd", "pass_fail", 8),
      item("manufacturing", "bhv_drill", "bezoekers_geregistreerd", "yes_no_na", 9),
      item("manufacturing", "bhv_drill", "oefentijd_genoteerd", "number", 10),
    ],
  },

  // 2-NL-2  BHV Middelen Inspectie (Emergency Equipment)
  {
    id: "manufacturing_bhv_equipment",
    industry: "manufacturing",
    name_key: k("manufacturing", "bhv_equipment", "name"),
    description_key: k("manufacturing", "bhv_equipment", "description"),
    category: "emergency",
    regulation: "Arbowet Art. 15",
    frequency: "monthly",
    tags: ["bhv", "middelen", "inspectie", "nooduitrusting", "nl"],
    items: [
      item("manufacturing", "bhv_equipment", "aed_batterij_pads", "pass_fail", 1),
      item("manufacturing", "bhv_equipment", "ehbo_koffers_gevuld", "pass_fail", 2),
      item("manufacturing", "bhv_equipment", "brandblussers_binnen_datum", "pass_fail", 3),
      item("manufacturing", "bhv_equipment", "noodverlichting", "pass_fail", 4),
      item("manufacturing", "bhv_equipment", "blusdekens", "pass_fail", 5),
      item("manufacturing", "bhv_equipment", "oogdouches", "pass_fail", 6),
      item("manufacturing", "bhv_equipment", "brancard_beschikbaar", "yes_no_na", 7),
      item("manufacturing", "bhv_equipment", "noodnummers_opgehangen", "yes_no_na", 8),
      item("manufacturing", "bhv_equipment", "ontruimingsplattegronden_actueel", "yes_no_na", 9),
      item("manufacturing", "bhv_equipment", "pbm_voorraad_aangevuld", "yes_no_na", 10),
    ],
  },

  // 2-NL-3  NEN 3140 Elektrische Veiligheid (Electrical Safety)
  {
    id: "manufacturing_nen3140",
    industry: "manufacturing",
    name_key: k("manufacturing", "nen3140", "name"),
    description_key: k("manufacturing", "nen3140", "description"),
    category: "electrical",
    regulation: "NEN 3140",
    frequency: "monthly",
    tags: ["nen3140", "elektrisch", "veiligheid", "installatie", "nl"],
    items: [
      item("manufacturing", "nen3140", "schakelpanelen_bereikbaar", "yes_no_na", 1),
      item("manufacturing", "nen3140", "waarschuwingsborden_aanwezig", "yes_no_na", 2),
      item("manufacturing", "nen3140", "vergrendeling_materiaal_beschikbaar", "yes_no_na", 3),
      item("manufacturing", "nen3140", "isolatiegereedschap_geinspecteerd", "pass_fail", 4),
      item("manufacturing", "nen3140", "aardlekbeveiliging_getest", "pass_fail", 5),
      item("manufacturing", "nen3140", "kabelconditie", "pass_fail", 6),
      item("manufacturing", "nen3140", "verlengsnoeren_geinspecteerd", "pass_fail", 7),
      item("manufacturing", "nen3140", "vakbekwaam_persoon_aangewezen", "yes_no_na", 8),
      item("manufacturing", "nen3140", "werkvergunning_elektrisch", "yes_no_na", 9),
      item("manufacturing", "nen3140", "documentatie_actueel", "yes_no_na", 10),
    ],
  },

  // 2-NL-4  Plan van Aanpak Review (RI&E Action Plan)
  {
    id: "manufacturing_pva",
    industry: "manufacturing",
    name_key: k("manufacturing", "pva", "name"),
    description_key: k("manufacturing", "pva", "description"),
    category: "management",
    regulation: "Arbowet Art. 5",
    frequency: "quarterly",
    tags: ["pva", "plan_van_aanpak", "rie", "management", "nl"],
    items: [
      item("manufacturing", "pva", "acties_uit_rie_opgesomd", "yes_no_na", 1),
      item("manufacturing", "pva", "prioriteiten_toegekend", "yes_no_na", 2),
      item("manufacturing", "pva", "deadlines_vastgesteld", "yes_no_na", 3),
      item("manufacturing", "pva", "verantwoordelijken_aangewezen", "yes_no_na", 4),
      item("manufacturing", "pva", "budget_toegewezen", "yes_no_na", 5),
      item("manufacturing", "pva", "voortgang_bijgehouden", "yes_no_na", 6),
      item("manufacturing", "pva", "achterstallige_items_aangepakt", "yes_no_na", 7),
      item("manufacturing", "pva", "volgende_reviewdatum_gepland", "yes_no_na", 8),
    ],
  },

  // 2-SE-1  Riskbedömning inför ändring
  {
    id: "manufacturing_risk_change_se",
    industry: "manufacturing",
    name_key: k("manufacturing", "risk_change_se", "name"),
    description_key: k("manufacturing", "risk_change_se", "description"),
    category: "hazard_analysis",
    regulation: "AFS 2001:1 §8",
    frequency: "per_event",
    tags: ["risk_assessment", "change_management", "riskbedomning", "se"],
    items: [
      item("manufacturing", "risk_change_se", "change_described", "text", 1),
      item("manufacturing", "risk_change_se", "affected_workers_identified", "yes_no_na", 2),
      item("manufacturing", "risk_change_se", "new_hazards_assessed", "yes_no_na", 3),
      item("manufacturing", "risk_change_se", "controls_planned", "yes_no_na", 4),
      item("manufacturing", "risk_change_se", "training_needed", "yes_no_na", 5),
      item("manufacturing", "risk_change_se", "timeline_set", "yes_no_na", 6),
      item("manufacturing", "risk_change_se", "responsible_person", "text", 7),
      item("manufacturing", "risk_change_se", "follow_up_date", "text", 8),
    ],
  },

  // 2-SE-2  Kemisk Riskbedömning
  {
    id: "manufacturing_chemical_se",
    industry: "manufacturing",
    name_key: k("manufacturing", "chemical_se", "name"),
    description_key: k("manufacturing", "chemical_se", "description"),
    category: "chemical",
    regulation: "AFS 2011:19",
    frequency: "per_event",
    tags: ["chemical", "kemisk", "riskbedomning", "se"],
    items: [
      item("manufacturing", "chemical_se", "substances_listed", "yes_no_na", 1),
      item("manufacturing", "chemical_se", "safety_data_sheets_available", "yes_no_na", 2),
      item("manufacturing", "chemical_se", "exposure_assessed", "yes_no_na", 3),
      item("manufacturing", "chemical_se", "ventilation_adequate", "yes_no_na", 4),
      item("manufacturing", "chemical_se", "ppe_specified", "yes_no_na", 5),
      item("manufacturing", "chemical_se", "storage_correct", "yes_no_na", 6),
      item("manufacturing", "chemical_se", "spill_procedures", "yes_no_na", 7),
      item("manufacturing", "chemical_se", "health_surveillance", "yes_no_na", 8),
      item("manufacturing", "chemical_se", "substitution_considered", "yes_no_na", 9),
      item("manufacturing", "chemical_se", "documentation_complete", "yes_no_na", 10),
    ],
  },

  // 2-SE-3  Buller & Vibrationer
  {
    id: "manufacturing_noise_se",
    industry: "manufacturing",
    name_key: k("manufacturing", "noise_se", "name"),
    description_key: k("manufacturing", "noise_se", "description"),
    category: "physical",
    regulation: "AFS 2005:16",
    frequency: "quarterly",
    tags: ["noise", "vibration", "buller", "vibrationer", "se"],
    items: [
      item("manufacturing", "noise_se", "noise_levels_measured", "yes_no_na", 1),
      item("manufacturing", "noise_se", "exposure_limits_checked", "yes_no_na", 2),
      item("manufacturing", "noise_se", "hearing_protection_provided", "yes_no_na", 3),
      item("manufacturing", "noise_se", "vibration_tools_identified", "yes_no_na", 4),
      item("manufacturing", "noise_se", "exposure_time_logged", "yes_no_na", 5),
      item("manufacturing", "noise_se", "health_checks_scheduled", "yes_no_na", 6),
      item("manufacturing", "noise_se", "warning_signs_posted", "yes_no_na", 7),
      item("manufacturing", "noise_se", "action_plan_if_exceeded", "yes_no_na", 8),
    ],
  },

  // 2-SE-4  Ergonomisk Riskbedömning
  {
    id: "manufacturing_ergonomics_se",
    industry: "manufacturing",
    name_key: k("manufacturing", "ergonomics_se", "name"),
    description_key: k("manufacturing", "ergonomics_se", "description"),
    category: "ergonomics",
    regulation: "AFS 2012:2",
    frequency: "quarterly",
    tags: ["ergonomics", "ergonomi", "workstation", "se"],
    items: [
      item("manufacturing", "ergonomics_se", "workstation_assessed", "yes_no_na", 1),
      item("manufacturing", "ergonomics_se", "repetitive_tasks_identified", "yes_no_na", 2),
      item("manufacturing", "ergonomics_se", "lifting_analyzed", "yes_no_na", 3),
      item("manufacturing", "ergonomics_se", "screen_work_evaluated", "yes_no_na", 4),
      item("manufacturing", "ergonomics_se", "breaks_scheduled", "yes_no_na", 5),
      item("manufacturing", "ergonomics_se", "adjustment_options", "yes_no_na", 6),
      item("manufacturing", "ergonomics_se", "training_provided", "yes_no_na", 7),
      item("manufacturing", "ergonomics_se", "follow_up_planned", "yes_no_na", 8),
    ],
  },

  // 2-SE-5  Brandskyddsrond
  {
    id: "manufacturing_fire_se",
    industry: "manufacturing",
    name_key: k("manufacturing", "fire_se", "name"),
    description_key: k("manufacturing", "fire_se", "description"),
    category: "fire_safety",
    regulation: "LSO 2003:778",
    frequency: "monthly",
    tags: ["fire", "brand", "brandskyddsrond", "se"],
    items: [
      item("manufacturing", "fire_se", "fire_exits_clear", "pass_fail", 1),
      item("manufacturing", "fire_se", "extinguishers_inspected", "pass_fail", 2),
      item("manufacturing", "fire_se", "alarm_tested", "yes_no_na", 3),
      item("manufacturing", "fire_se", "evacuation_plan_posted", "yes_no_na", 4),
      item("manufacturing", "fire_se", "flammable_storage_correct", "yes_no_na", 5),
      item("manufacturing", "fire_se", "electrical_panels_clear", "yes_no_na", 6),
      item("manufacturing", "fire_se", "smoking_areas_defined", "yes_no_na", 7),
      item("manufacturing", "fire_se", "fire_doors_functional", "pass_fail", 8),
      item("manufacturing", "fire_se", "sprinklers_checked", "pass_fail", 9),
      item("manufacturing", "fire_se", "fire_warden_appointed", "yes_no_na", 10),
    ],
  },

  // 2-SE-6  Introduktion nyanställd
  {
    id: "manufacturing_induction_se",
    industry: "manufacturing",
    name_key: k("manufacturing", "induction_se", "name"),
    description_key: k("manufacturing", "induction_se", "description"),
    category: "training",
    regulation: "AFS 2001:1",
    frequency: "per_event",
    tags: ["induction", "introduktion", "nyantalld", "training", "se"],
    items: [
      item("manufacturing", "induction_se", "safety_policy_explained", "yes_no_na", 1),
      item("manufacturing", "induction_se", "emergency_exits_shown", "yes_no_na", 2),
      item("manufacturing", "induction_se", "fire_equipment_demonstrated", "yes_no_na", 3),
      item("manufacturing", "induction_se", "first_aid_location", "yes_no_na", 4),
      item("manufacturing", "induction_se", "ppe_issued", "yes_no_na", 5),
      item("manufacturing", "induction_se", "hazards_explained", "yes_no_na", 6),
      item("manufacturing", "induction_se", "reporting_procedures", "yes_no_na", 7),
      item("manufacturing", "induction_se", "safety_contacts", "yes_no_na", 8),
      item("manufacturing", "induction_se", "signed_acknowledgment", "yes_no_na", 9),
      item("manufacturing", "induction_se", "follow_up_scheduled", "yes_no_na", 10),
    ],
  },

  // 2-GB-1  COSHH Assessment
  {
    id: "manufacturing_coshh",
    industry: "manufacturing",
    name_key: k("manufacturing", "coshh", "name"),
    description_key: k("manufacturing", "coshh", "description"),
    category: "chemical",
    regulation: "COSHH Regulations 2002",
    frequency: "per_event",
    tags: ["coshh", "chemical", "hazardous_substances", "gb"],
    items: [
      item("manufacturing", "coshh", "substances_identified", "yes_no_na", 1),
      item("manufacturing", "coshh", "hazards_assessed", "yes_no_na", 2),
      item("manufacturing", "coshh", "exposure_routes", "text", 3),
      item("manufacturing", "coshh", "who_exposed", "text", 4),
      item("manufacturing", "coshh", "control_measures", "yes_no_na", 5),
      item("manufacturing", "coshh", "ppe_required", "yes_no_na", 6),
      item("manufacturing", "coshh", "health_surveillance", "yes_no_na", 7),
      item("manufacturing", "coshh", "emergency_procedures", "yes_no_na", 8),
      item("manufacturing", "coshh", "training_provided", "yes_no_na", 9),
      item("manufacturing", "coshh", "review_date_set", "yes_no_na", 10),
    ],
  },

  // 2-GB-2  DSE Assessment (Display Screen Equipment)
  {
    id: "manufacturing_dse",
    industry: "manufacturing",
    name_key: k("manufacturing", "dse", "name"),
    description_key: k("manufacturing", "dse", "description"),
    category: "ergonomics",
    regulation: "DSE Regulations 1992",
    frequency: "per_event",
    tags: ["dse", "display_screen", "workstation", "ergonomics", "gb"],
    items: [
      item("manufacturing", "dse", "screen_position", "yes_no_na", 1),
      item("manufacturing", "dse", "chair_adjustable", "yes_no_na", 2),
      item("manufacturing", "dse", "desk_height", "yes_no_na", 3),
      item("manufacturing", "dse", "keyboard_placement", "yes_no_na", 4),
      item("manufacturing", "dse", "mouse_position", "yes_no_na", 5),
      item("manufacturing", "dse", "lighting_adequate", "yes_no_na", 6),
      item("manufacturing", "dse", "glare_minimized", "yes_no_na", 7),
      item("manufacturing", "dse", "breaks_scheduled", "yes_no_na", 8),
      item("manufacturing", "dse", "eye_test_offered", "yes_no_na", 9),
      item("manufacturing", "dse", "workstation_diagram", "yes_no_na", 10),
    ],
  },

  // 2-GB-3  PUWER Equipment Inspection
  {
    id: "manufacturing_puwer",
    industry: "manufacturing",
    name_key: k("manufacturing", "puwer", "name"),
    description_key: k("manufacturing", "puwer", "description"),
    category: "equipment",
    regulation: "PUWER 1998",
    frequency: "monthly",
    tags: ["puwer", "equipment", "inspection", "gb"],
    items: [
      item("manufacturing", "puwer", "equipment_suitable", "yes_no_na", 1),
      item("manufacturing", "puwer", "guards_in_place", "pass_fail", 2),
      item("manufacturing", "puwer", "controls_accessible", "yes_no_na", 3),
      item("manufacturing", "puwer", "emergency_stop_functional", "pass_fail", 4),
      item("manufacturing", "puwer", "maintenance_current", "yes_no_na", 5),
      item("manufacturing", "puwer", "operators_trained", "yes_no_na", 6),
      item("manufacturing", "puwer", "risk_assessment_done", "yes_no_na", 7),
      item("manufacturing", "puwer", "defects_reported", "yes_no_na", 8),
      item("manufacturing", "puwer", "records_maintained", "yes_no_na", 9),
      item("manufacturing", "puwer", "inspection_date", "text", 10),
    ],
  },

  // 2-GB-4  Fire Risk Assessment (UK)
  {
    id: "manufacturing_fire_uk",
    industry: "manufacturing",
    name_key: k("manufacturing", "fire_uk", "name"),
    description_key: k("manufacturing", "fire_uk", "description"),
    category: "fire_safety",
    regulation: "Fire Safety Order 2005",
    frequency: "quarterly",
    tags: ["fire", "fire_risk", "fire_safety_order", "gb"],
    items: [
      item("manufacturing", "fire_uk", "fire_hazards_identified", "yes_no_na", 1),
      item("manufacturing", "fire_uk", "persons_at_risk", "yes_no_na", 2),
      item("manufacturing", "fire_uk", "fire_detection_adequate", "yes_no_na", 3),
      item("manufacturing", "fire_uk", "escape_routes_clear", "pass_fail", 4),
      item("manufacturing", "fire_uk", "fire_fighting_equipment", "pass_fail", 5),
      item("manufacturing", "fire_uk", "emergency_plan", "yes_no_na", 6),
      item("manufacturing", "fire_uk", "staff_trained", "yes_no_na", 7),
      item("manufacturing", "fire_uk", "records_maintained", "yes_no_na", 8),
      item("manufacturing", "fire_uk", "review_date", "text", 9),
      item("manufacturing", "fire_uk", "responsible_person", "text", 10),
    ],
  },
];

// ==========================================
// 3. OIL & GAS (8 templates)
// ==========================================

const oilGasTemplates: IndustryChecklistTemplate[] = [
  // 3-1  Permit-to-Work
  {
    id: "oil_gas_ptw",
    industry: "oil_gas",
    name_key: k("oil_gas", "ptw", "name"),
    description_key: k("oil_gas", "ptw", "description"),
    category: "permit_to_work",
    regulation: "API RP 2001 / OSHA 1910.146",
    frequency: "per_event",
    tags: ["permit_to_work", "high_risk", "authorization"],
    items: [
      item("oil_gas", "ptw", "work_description", "text", 1),
      item("oil_gas", "ptw", "hazards_identified", "text", 2),
      item("oil_gas", "ptw", "gas_test_results", "text", 3),
      item("oil_gas", "ptw", "isolation_verified", "pass_fail", 4),
      item("oil_gas", "ptw", "ppe_specified", "yes_no_na", 5),
      item("oil_gas", "ptw", "emergency_procedures", "yes_no_na", 6),
      item("oil_gas", "ptw", "time_validity", "yes_no_na", 7, false),
      item("oil_gas", "ptw", "supervisor_authorization", "yes_no_na", 8, false),
    ],
  },

  // 3-2  Confined Space Entry
  {
    id: "oil_gas_confined_space",
    industry: "oil_gas",
    name_key: k("oil_gas", "confined_space", "name"),
    description_key: k("oil_gas", "confined_space", "description"),
    category: "confined_space",
    regulation: "OSHA 1910.146",
    frequency: "per_event",
    tags: ["confined_space", "atmospheric_testing", "rescue"],
    items: [
      item("oil_gas", "confined_space", "atmospheric_o2", "yes_no_na", 1),
      item("oil_gas", "confined_space", "atmospheric_lel", "yes_no_na", 2),
      item("oil_gas", "confined_space", "atmospheric_h2s", "yes_no_na", 3),
      item("oil_gas", "confined_space", "atmospheric_co", "yes_no_na", 4),
      item("oil_gas", "confined_space", "ventilation_setup", "yes_no_na", 5),
      item("oil_gas", "confined_space", "rescue_plan", "yes_no_na", 6),
      item("oil_gas", "confined_space", "attendant_assigned", "yes_no_na", 7),
      item("oil_gas", "confined_space", "communication_method", "text", 8),
      item("oil_gas", "confined_space", "entry_permit_signed", "yes_no_na", 9, false),
      item("oil_gas", "confined_space", "continuous_monitoring", "yes_no_na", 10, false),
    ],
  },

  // 3-3  H2S Safety Check
  {
    id: "oil_gas_h2s",
    industry: "oil_gas",
    name_key: k("oil_gas", "h2s", "name"),
    description_key: k("oil_gas", "h2s", "description"),
    category: "toxic_gas",
    regulation: "OSHA 1910.1000 / API RP 49",
    frequency: "per_shift",
    tags: ["h2s", "toxic_gas", "personal_monitor"],
    items: [
      item("oil_gas", "h2s", "personal_monitor", "yes_no_na", 1),
      item("oil_gas", "h2s", "wind_sock", "yes_no_na", 2),
      item("oil_gas", "h2s", "muster_points", "yes_no_na", 3),
      item("oil_gas", "h2s", "scba_staged", "pass_fail", 4),
      item("oil_gas", "h2s", "buddy_system", "yes_no_na", 5),
      item("oil_gas", "h2s", "h2s_training", "yes_no_na", 6, false),
      item("oil_gas", "h2s", "alarm_threshold", "yes_no_na", 7, false),
    ],
  },

  // 3-4  Hot Work Permit
  {
    id: "oil_gas_hot_work",
    industry: "oil_gas",
    name_key: k("oil_gas", "hot_work", "name"),
    description_key: k("oil_gas", "hot_work", "description"),
    category: "hot_work",
    regulation: "OSHA 1910.252 / API 2009",
    frequency: "per_event",
    tags: ["hot_work", "welding", "fire_prevention"],
    items: [
      item("oil_gas", "hot_work", "fire_watch", "yes_no_na", 1),
      item("oil_gas", "hot_work", "radius_cleared", "yes_no_na", 2),
      item("oil_gas", "hot_work", "fire_extinguisher", "yes_no_na", 3),
      item("oil_gas", "hot_work", "gas_test_lel", "yes_no_na", 4),
      item("oil_gas", "hot_work", "ventilation", "yes_no_na", 5),
      item("oil_gas", "hot_work", "post_work_watch", "yes_no_na", 6, false),
      item("oil_gas", "hot_work", "hot_work_area", "yes_no_na", 7, false),
    ],
  },

  // 3-5  Well Site Inspection
  {
    id: "oil_gas_well_site",
    industry: "oil_gas",
    name_key: k("oil_gas", "well_site", "name"),
    description_key: k("oil_gas", "well_site", "description"),
    category: "well_site",
    regulation: "State oil & gas commission",
    frequency: "daily",
    tags: ["well_site", "bop", "flowline"],
    items: [
      item("oil_gas", "well_site", "bop_function", "yes_no_na", 1),
      item("oil_gas", "well_site", "flowline_integrity", "pass_fail", 2),
      item("oil_gas", "well_site", "tank_levels", "number", 3),
      item("oil_gas", "well_site", "containment_integrity", "yes_no_na", 4),
      item("oil_gas", "well_site", "flare_operation", "pass_fail", 5),
      item("oil_gas", "well_site", "road_conditions", "rating", 6),
      item("oil_gas", "well_site", "signage_visible", "yes_no_na", 7, false),
      item("oil_gas", "well_site", "emergency_equipment", "pass_fail", 8, false),
    ],
  },

  // 3-6  Contractor Orientation
  {
    id: "oil_gas_contractor",
    industry: "oil_gas",
    name_key: k("oil_gas", "contractor", "name"),
    description_key: k("oil_gas", "contractor", "description"),
    category: "contractor_management",
    regulation: "OSHA multi-employer policy",
    frequency: "per_event",
    tags: ["contractor", "orientation", "induction"],
    items: [
      item("oil_gas", "contractor", "safety_induction", "yes_no_na", 1),
      item("oil_gas", "contractor", "site_hazards", "yes_no_na", 2),
      item("oil_gas", "contractor", "emergency_procedures", "yes_no_na", 3),
      item("oil_gas", "contractor", "ppe_verified", "pass_fail", 4),
      item("oil_gas", "contractor", "work_permit", "yes_no_na", 5, false),
      item("oil_gas", "contractor", "insurance_docs", "yes_no_na", 6, false),
    ],
  },

  // 3-NL-1  BRZO/Seveso Inspectie
  {
    id: "oil_gas_brzo",
    industry: "oil_gas",
    name_key: k("oil_gas", "brzo", "name"),
    description_key: k("oil_gas", "brzo", "description"),
    category: "major_hazards",
    regulation: "BRZO 2015 / Seveso III",
    frequency: "monthly",
    tags: ["brzo", "seveso", "zwaar_ongeval", "veiligheidsrapport", "nl"],
    items: [
      item("oil_gas", "brzo", "veiligheidsrapport_actueel", "yes_no_na", 1),
      item("oil_gas", "brzo", "noodplan_getest", "yes_no_na", 2),
      item("oil_gas", "brzo", "zwaar_ongeval_scenarios_beoordeeld", "yes_no_na", 3),
      item("oil_gas", "brzo", "veiligheidsbeheerssysteem_audit", "yes_no_na", 4),
      item("oil_gas", "brzo", "procesveiligheid_indicatoren_bijgehouden", "yes_no_na", 5),
      item("oil_gas", "brzo", "onderhoud_veiligheidskritieke_apparatuur", "pass_fail", 6),
      item("oil_gas", "brzo", "wijzigingsbeheer_toegepast", "yes_no_na", 7),
      item("oil_gas", "brzo", "bevoegd_gezag_geinformeerd", "yes_no_na", 8),
      item("oil_gas", "brzo", "domino_effecten_beoordeeld", "yes_no_na", 9),
      item("oil_gas", "brzo", "publieksinformatie_verplichtingen_voldaan", "yes_no_na", 10),
    ],
  },

  // 3-NL-2  ARIE (Aanvullende RI&E)
  {
    id: "oil_gas_arie",
    industry: "oil_gas",
    name_key: k("oil_gas", "arie", "name"),
    description_key: k("oil_gas", "arie", "description"),
    category: "hazard_analysis",
    regulation: "Arbowet Art. 2a / ARIE",
    frequency: "per_event",
    tags: ["arie", "aanvullende_rie", "gevaarlijke_stoffen", "nl"],
    items: [
      item("oil_gas", "arie", "gevaarlijke_stoffen_geidentificeerd", "yes_no_na", 1),
      item("oil_gas", "arie", "blootstellingslimieten_beoordeeld", "yes_no_na", 2),
      item("oil_gas", "arie", "beheersmaatregelen_geevalueerd", "yes_no_na", 3),
      item("oil_gas", "arie", "noodscenarios_gedefinieerd", "yes_no_na", 4),
      item("oil_gas", "arie", "gezondheidsmonitoring_werknemers", "yes_no_na", 5),
      item("oil_gas", "arie", "pbm_geschiktheid", "pass_fail", 6),
      item("oil_gas", "arie", "opslagcondities", "pass_fail", 7),
      item("oil_gas", "arie", "afvalverwerking", "yes_no_na", 8),
      item("oil_gas", "arie", "ventilatie_voldoende", "pass_fail", 9),
      item("oil_gas", "arie", "documentatie_compleet", "yes_no_na", 10),
    ],
  },
];

// ==========================================
// 4. HEALTHCARE (6 templates)
// ==========================================

const healthcareTemplates: IndustryChecklistTemplate[] = [
  // 4-1  Infection Control Round
  {
    id: "healthcare_infection_control",
    industry: "healthcare",
    name_key: k("healthcare", "infection_control", "name"),
    description_key: k("healthcare", "infection_control", "description"),
    category: "infection_control",
    regulation: "OSHA 1910.1030 / CDC",
    frequency: "daily",
    tags: ["infection_control", "hand_hygiene", "ppe"],
    items: [
      item("healthcare", "infection_control", "hand_hygiene_stations", "yes_no_na", 1),
      item("healthcare", "infection_control", "ppe_supply", "yes_no_na", 2),
      item("healthcare", "infection_control", "isolation_signage", "yes_no_na", 3),
      item("healthcare", "infection_control", "sharps_containers", "yes_no_na", 4),
      item("healthcare", "infection_control", "surface_disinfection", "yes_no_na", 5, false),
      item("healthcare", "infection_control", "patient_placement", "yes_no_na", 6, false),
    ],
  },

  // 4-2  Sharps Disposal Audit
  {
    id: "healthcare_sharps",
    industry: "healthcare",
    name_key: k("healthcare", "sharps", "name"),
    description_key: k("healthcare", "sharps", "description"),
    category: "sharps_safety",
    regulation: "OSHA 1910.1030 / Needlestick Safety Act",
    frequency: "weekly",
    tags: ["sharps", "needlestick", "bloodborne_pathogens"],
    items: [
      item("healthcare", "sharps", "container_fill_level", "pass_fail", 1),
      item("healthcare", "sharps", "mounting_secure", "pass_fail", 2),
      item("healthcare", "sharps", "no_protruding_items", "pass_fail", 3),
      item("healthcare", "sharps", "label_visible", "pass_fail", 4),
      item("healthcare", "sharps", "replacements_available", "pass_fail", 5),
      item("healthcare", "sharps", "disposal_log", "yes_no_na", 6, false),
      item("healthcare", "sharps", "needle_free_systems", "yes_no_na", 7, false),
    ],
  },

  // 4-3  Patient Safety Round
  {
    id: "healthcare_patient_safety",
    industry: "healthcare",
    name_key: k("healthcare", "patient_safety", "name"),
    description_key: k("healthcare", "patient_safety", "description"),
    category: "patient_safety",
    regulation: "Joint Commission NPSG",
    frequency: "per_shift",
    tags: ["patient_safety", "fall_risk", "medication"],
    items: [
      item("healthcare", "patient_safety", "bed_rails", "yes_no_na", 1),
      item("healthcare", "patient_safety", "call_bell", "yes_no_na", 2),
      item("healthcare", "patient_safety", "fall_risk", "yes_no_na", 3),
      item("healthcare", "patient_safety", "medication_verification", "yes_no_na", 4),
      item("healthcare", "patient_safety", "id_band", "yes_no_na", 5),
      item("healthcare", "patient_safety", "allergies_documented", "yes_no_na", 6, false),
      item("healthcare", "patient_safety", "care_plan", "yes_no_na", 7, false),
    ],
  },

  // 4-4  Emergency Equipment Check
  {
    id: "healthcare_emergency_equip",
    industry: "healthcare",
    name_key: k("healthcare", "emergency_equip", "name"),
    description_key: k("healthcare", "emergency_equip", "description"),
    category: "emergency_equipment",
    regulation: "Joint Commission / state codes",
    frequency: "daily",
    tags: ["crash_cart", "defibrillator", "emergency"],
    items: [
      item("healthcare", "emergency_equip", "crash_cart_sealed", "pass_fail", 1),
      item("healthcare", "emergency_equip", "defibrillator", "yes_no_na", 2),
      item("healthcare", "emergency_equip", "suction_working", "pass_fail", 3),
      item("healthcare", "emergency_equip", "o2_supply", "yes_no_na", 4),
      item("healthcare", "emergency_equip", "emergency_meds", "yes_no_na", 5, false),
      item("healthcare", "emergency_equip", "resuscitation_bag", "yes_no_na", 6, false),
    ],
  },

  // 4-5  Hand Hygiene Observation
  {
    id: "healthcare_hand_hygiene",
    industry: "healthcare",
    name_key: k("healthcare", "hand_hygiene", "name"),
    description_key: k("healthcare", "hand_hygiene", "description"),
    category: "infection_control",
    regulation: "WHO 5 Moments / CDC",
    frequency: "continuous",
    tags: ["hand_hygiene", "who_5_moments", "observation"],
    items: [
      item("healthcare", "hand_hygiene", "before_patient", "yes_no_na", 1),
      item("healthcare", "hand_hygiene", "after_patient", "yes_no_na", 2),
      item("healthcare", "hand_hygiene", "after_surroundings", "yes_no_na", 3),
      item("healthcare", "hand_hygiene", "before_clean_procedure", "yes_no_na", 4),
      item("healthcare", "hand_hygiene", "after_body_fluid", "yes_no_na", 5),
      item("healthcare", "hand_hygiene", "technique_correct", "yes_no_na", 6, false),
      item("healthcare", "hand_hygiene", "compliance_notes", "yes_no_na", 7, false),
    ],
  },

  // 4-6  Fire/Life Safety Walk
  {
    id: "healthcare_fire_life",
    industry: "healthcare",
    name_key: k("healthcare", "fire_life", "name"),
    description_key: k("healthcare", "fire_life", "description"),
    category: "fire_safety",
    regulation: "NFPA 101 / Joint Commission EC",
    frequency: "monthly",
    tags: ["fire_safety", "life_safety", "evacuation"],
    items: [
      item("healthcare", "fire_life", "exit_signs", "yes_no_na", 1),
      item("healthcare", "fire_life", "fire_doors", "yes_no_na", 2),
      item("healthcare", "fire_life", "corridors_clear", "pass_fail", 3),
      item("healthcare", "fire_life", "extinguishers", "yes_no_na", 4),
      item("healthcare", "fire_life", "smoke_detectors", "yes_no_na", 5, false),
      item("healthcare", "fire_life", "evacuation_plan", "yes_no_na", 6, false),
    ],
  },
];

// ==========================================
// 5. WAREHOUSING (7 templates)
// ==========================================

const warehousingTemplates: IndustryChecklistTemplate[] = [
  // 5-1  Forklift Pre-Shift
  {
    id: "warehousing_forklift",
    industry: "warehousing",
    name_key: k("warehousing", "forklift", "name"),
    description_key: k("warehousing", "forklift", "description"),
    category: "mobile_equipment",
    regulation: "OSHA 1910.178",
    frequency: "per_shift",
    tags: ["forklift", "pre_shift", "powered_industrial_truck"],
    items: [
      item("warehousing", "forklift", "tires_wheels", "yes_no_na", 1),
      item("warehousing", "forklift", "forks_condition", "pass_fail", 2),
      item("warehousing", "forklift", "hydraulic_lines", "yes_no_na", 3),
      item("warehousing", "forklift", "mast_chains", "pass_fail", 4),
      item("warehousing", "forklift", "horn_working", "yes_no_na", 5),
      item("warehousing", "forklift", "lights_working", "yes_no_na", 6),
      item("warehousing", "forklift", "backup_alarm", "pass_fail", 7),
      item("warehousing", "forklift", "seatbelt", "pass_fail", 8),
      item("warehousing", "forklift", "brakes_tested", "yes_no_na", 9),
      item("warehousing", "forklift", "steering", "yes_no_na", 10),
      item("warehousing", "forklift", "battery_fuel", "pass_fail", 11),
      item("warehousing", "forklift", "fire_extinguisher", "pass_fail", 12, false),
      item("warehousing", "forklift", "operator_cert", "yes_no_na", 13, false),
    ],
  },

  // 5-2  Dock Safety Check
  {
    id: "warehousing_dock",
    industry: "warehousing",
    name_key: k("warehousing", "dock", "name"),
    description_key: k("warehousing", "dock", "description"),
    category: "dock_safety",
    regulation: "OSHA 1910.26 / 1910.178",
    frequency: "per_event",
    tags: ["dock", "loading", "trailer"],
    items: [
      item("warehousing", "dock", "dock_plate", "yes_no_na", 1),
      item("warehousing", "dock", "wheel_chocks", "yes_no_na", 2),
      item("warehousing", "dock", "trailer_secured", "pass_fail", 3),
      item("warehousing", "dock", "dock_leveler", "yes_no_na", 4),
      item("warehousing", "dock", "lighting", "yes_no_na", 5, false),
      item("warehousing", "dock", "gap_check", "yes_no_na", 6, false),
    ],
  },

  // 5-3  Fire Extinguisher Monthly
  {
    id: "warehousing_fire_extinguisher",
    industry: "warehousing",
    name_key: k("warehousing", "fire_extinguisher", "name"),
    description_key: k("warehousing", "fire_extinguisher", "description"),
    category: "fire_safety",
    regulation: "OSHA 1910.157 / NFPA 10",
    frequency: "monthly",
    tags: ["fire_extinguisher", "fire_safety", "inspection"],
    items: [
      item("warehousing", "fire_extinguisher", "accessible", "yes_no_na", 1),
      item("warehousing", "fire_extinguisher", "charge_gauge", "yes_no_na", 2),
      item("warehousing", "fire_extinguisher", "pin_seal", "yes_no_na", 3),
      item("warehousing", "fire_extinguisher", "no_damage", "yes_no_na", 4),
      item("warehousing", "fire_extinguisher", "mounting_height", "yes_no_na", 5),
      item("warehousing", "fire_extinguisher", "inspection_tag", "yes_no_na", 6, false),
      item("warehousing", "fire_extinguisher", "correct_type", "yes_no_na", 7, false),
    ],
  },

  // 5-4  Rack Integrity Audit
  {
    id: "warehousing_rack",
    industry: "warehousing",
    name_key: k("warehousing", "rack", "name"),
    description_key: k("warehousing", "rack", "description"),
    category: "storage",
    regulation: "ANSI/RMI MH16.1",
    frequency: "quarterly",
    tags: ["rack", "storage", "structural_integrity"],
    items: [
      item("warehousing", "rack", "upright_damage", "pass_fail", 1),
      item("warehousing", "rack", "beam_connectors", "yes_no_na", 2),
      item("warehousing", "rack", "base_plate", "yes_no_na", 3),
      item("warehousing", "rack", "load_capacity", "yes_no_na", 4),
      item("warehousing", "rack", "overloading", "yes_no_na", 5, false),
      item("warehousing", "rack", "wire_decking", "yes_no_na", 6, false),
    ],
  },

  // 5-5  Pedestrian Safety Zone
  {
    id: "warehousing_pedestrian",
    industry: "warehousing",
    name_key: k("warehousing", "pedestrian", "name"),
    description_key: k("warehousing", "pedestrian", "description"),
    category: "pedestrian_safety",
    regulation: "Best practice / OSHA General Duty",
    frequency: "weekly",
    tags: ["pedestrian", "traffic_management", "floor_markings"],
    items: [
      item("warehousing", "pedestrian", "floor_markings", "yes_no_na", 1),
      item("warehousing", "pedestrian", "barriers_intact", "yes_no_na", 2),
      item("warehousing", "pedestrian", "blind_corner_mirrors", "yes_no_na", 3),
      item("warehousing", "pedestrian", "speed_limit_signs", "pass_fail", 4),
      item("warehousing", "pedestrian", "pedestrian_crossings", "yes_no_na", 5, false),
      item("warehousing", "pedestrian", "separate_paths", "yes_no_na", 6, false),
    ],
  },

  // 5-6  Receiving Dock Safety Walk
  {
    id: "warehousing_receiving",
    industry: "warehousing",
    name_key: k("warehousing", "receiving", "name"),
    description_key: k("warehousing", "receiving", "description"),
    category: "general_safety",
    regulation: "Best practice",
    frequency: "daily",
    tags: ["receiving", "housekeeping", "ergonomics"],
    items: [
      item("warehousing", "receiving", "spills_cleaned", "pass_fail", 1),
      item("warehousing", "receiving", "slip_hazards", "yes_no_na", 2),
      item("warehousing", "receiving", "lighting_working", "yes_no_na", 3),
      item("warehousing", "receiving", "ppe_compliance", "pass_fail", 4),
      item("warehousing", "receiving", "box_cutter_safety", "pass_fail", 5, false),
      item("warehousing", "receiving", "ergonomic_lifting", "yes_no_na", 6, false),
    ],
  },

  // 5-GB-1  Manual Handling Assessment
  {
    id: "warehousing_manual_handling",
    industry: "warehousing",
    name_key: k("warehousing", "manual_handling", "name"),
    description_key: k("warehousing", "manual_handling", "description"),
    category: "ergonomics",
    regulation: "MHOR 1992",
    frequency: "quarterly",
    tags: ["manual_handling", "ergonomics", "lifting", "gb"],
    items: [
      item("warehousing", "manual_handling", "task_analyzed", "yes_no_na", 1),
      item("warehousing", "manual_handling", "load_weight", "text", 2),
      item("warehousing", "manual_handling", "distance_carried", "text", 3),
      item("warehousing", "manual_handling", "posture_required", "yes_no_na", 4),
      item("warehousing", "manual_handling", "frequency", "text", 5),
      item("warehousing", "manual_handling", "environmental_factors", "yes_no_na", 6),
      item("warehousing", "manual_handling", "individual_capability", "yes_no_na", 7),
      item("warehousing", "manual_handling", "mechanical_aids_available", "yes_no_na", 8),
      item("warehousing", "manual_handling", "training_provided", "yes_no_na", 9),
      item("warehousing", "manual_handling", "risk_rating", "rating", 10),
    ],
  },
];

// ==========================================
// 6. MINING (6 templates)
// ==========================================

const miningTemplates: IndustryChecklistTemplate[] = [
  // 6-1  Pre-Shift Strata Assessment
  {
    id: "mining_strata",
    industry: "mining",
    name_key: k("mining", "strata", "name"),
    description_key: k("mining", "strata", "description"),
    category: "ground_control",
    regulation: "MSHA 30 CFR Part 75",
    frequency: "per_shift",
    tags: ["strata", "roof_condition", "ground_control"],
    items: [
      item("mining", "strata", "roof_condition", "rating", 1),
      item("mining", "strata", "rib_stability", "pass_fail", 2),
      item("mining", "strata", "pillar_condition", "pass_fail", 3),
      item("mining", "strata", "scaling_needed", "yes_no_na", 4),
      item("mining", "strata", "support_installation", "pass_fail", 5),
      item("mining", "strata", "geological_changes", "yes_no_na", 6, false),
      item("mining", "strata", "water_ingress", "yes_no_na", 7, false),
    ],
  },

  // 6-2  Ventilation System Check
  {
    id: "mining_ventilation",
    industry: "mining",
    name_key: k("mining", "ventilation", "name"),
    description_key: k("mining", "ventilation", "description"),
    category: "ventilation",
    regulation: "MSHA 30 CFR 75.300",
    frequency: "per_shift",
    tags: ["ventilation", "methane", "air_quality"],
    items: [
      item("mining", "ventilation", "fan_operation", "pass_fail", 1),
      item("mining", "ventilation", "air_velocity", "yes_no_na", 2),
      item("mining", "ventilation", "methane_levels", "yes_no_na", 3),
      item("mining", "ventilation", "co_levels", "yes_no_na", 4),
      item("mining", "ventilation", "dust_levels", "yes_no_na", 5),
      item("mining", "ventilation", "ventilation_controls", "yes_no_na", 6, false),
      item("mining", "ventilation", "air_direction", "yes_no_na", 7, false),
    ],
  },

  // 6-3  Blast Area Safety
  {
    id: "mining_blast",
    industry: "mining",
    name_key: k("mining", "blast", "name"),
    description_key: k("mining", "blast", "description"),
    category: "blasting",
    regulation: "MSHA 30 CFR 75.1300",
    frequency: "per_event",
    tags: ["blasting", "explosives", "clearance"],
    items: [
      item("mining", "blast", "personnel_cleared", "yes_no_na", 1),
      item("mining", "blast", "guard_posts", "yes_no_na", 2),
      item("mining", "blast", "warning_signals", "yes_no_na", 3),
      item("mining", "blast", "blast_pattern", "yes_no_na", 4),
      item("mining", "blast", "misfire_check", "yes_no_na", 5),
      item("mining", "blast", "reentry_time", "yes_no_na", 6, false),
      item("mining", "blast", "post_blast_ventilation", "pass_fail", 7, false),
    ],
  },

  // 6-4  PPE Compliance Check
  {
    id: "mining_ppe",
    industry: "mining",
    name_key: k("mining", "ppe", "name"),
    description_key: k("mining", "ppe", "description"),
    category: "ppe",
    regulation: "MSHA 30 CFR 75.1700",
    frequency: "daily",
    tags: ["ppe", "personal_protective_equipment", "compliance"],
    items: [
      item("mining", "ppe", "hard_hat", "pass_fail", 1),
      item("mining", "ppe", "safety_glasses", "pass_fail", 2),
      item("mining", "ppe", "steel_toe_boots", "pass_fail", 3),
      item("mining", "ppe", "hearing_protection", "pass_fail", 4),
      item("mining", "ppe", "reflective_vest", "pass_fail", 5),
      item("mining", "ppe", "self_rescuer", "yes_no_na", 6),
      item("mining", "ppe", "cap_lamp", "yes_no_na", 7, false),
      item("mining", "ppe", "gloves", "pass_fail", 8, false),
    ],
  },

  // 6-5  Mobile Equipment Pre-Op
  {
    id: "mining_mobile_equip",
    industry: "mining",
    name_key: k("mining", "mobile_equip", "name"),
    description_key: k("mining", "mobile_equip", "description"),
    category: "mobile_equipment",
    regulation: "MSHA 30 CFR 75.1900",
    frequency: "per_shift",
    tags: ["mobile_equipment", "haul_truck", "pre_op"],
    items: [
      item("mining", "mobile_equip", "brakes", "pass_fail", 1),
      item("mining", "mobile_equip", "steering", "pass_fail", 2),
      item("mining", "mobile_equip", "lights", "pass_fail", 3),
      item("mining", "mobile_equip", "horn", "pass_fail", 4),
      item("mining", "mobile_equip", "backup_alarm", "pass_fail", 5),
      item("mining", "mobile_equip", "fire_suppression", "pass_fail", 6),
      item("mining", "mobile_equip", "seatbelt", "pass_fail", 7),
      item("mining", "mobile_equip", "tires", "yes_no_na", 8),
      item("mining", "mobile_equip", "hydraulics", "pass_fail", 9),
      item("mining", "mobile_equip", "rollover_protection", "yes_no_na", 10, false),
      item("mining", "mobile_equip", "operator_cert", "yes_no_na", 11, false),
    ],
  },

  // 6-6  Emergency Escape Drill
  {
    id: "mining_emergency_escape",
    industry: "mining",
    name_key: k("mining", "emergency_escape", "name"),
    description_key: k("mining", "emergency_escape", "description"),
    category: "emergency_preparedness",
    regulation: "MSHA 30 CFR 75.1500",
    frequency: "quarterly",
    tags: ["emergency_escape", "drill", "rescue"],
    items: [
      item("mining", "emergency_escape", "all_workers", "yes_no_na", 1),
      item("mining", "emergency_escape", "primary_exit", "yes_no_na", 2),
      item("mining", "emergency_escape", "secondary_exit", "yes_no_na", 3),
      item("mining", "emergency_escape", "self_rescuer_donning", "yes_no_na", 4),
      item("mining", "emergency_escape", "refuge_chamber", "yes_no_na", 5),
      item("mining", "emergency_escape", "communication_check", "pass_fail", 6, false),
      item("mining", "emergency_escape", "evacuation_time", "yes_no_na", 7, false),
    ],
  },
];

// ==========================================
// 7. FOOD & BEVERAGE (6 templates)
// ==========================================

const foodBeverageTemplates: IndustryChecklistTemplate[] = [
  // 7-1  HACCP Inspection
  {
    id: "food_bev_haccp",
    industry: "food_beverage",
    name_key: k("food_beverage", "haccp", "name"),
    description_key: k("food_beverage", "haccp", "description"),
    category: "food_safety",
    regulation: "FDA 21 CFR Part 120 / USDA FSIS",
    frequency: "continuous",
    tags: ["haccp", "ccp", "food_safety"],
    items: [
      item("food_beverage", "haccp", "ccp_monitoring", "yes_no_na", 1),
      item("food_beverage", "haccp", "temp_receiving", "yes_no_na", 2),
      item("food_beverage", "haccp", "temp_storage", "yes_no_na", 3),
      item("food_beverage", "haccp", "temp_cooking", "yes_no_na", 4),
      item("food_beverage", "haccp", "temp_holding", "yes_no_na", 5),
      item("food_beverage", "haccp", "corrective_actions", "yes_no_na", 6),
      item("food_beverage", "haccp", "verification", "yes_no_na", 7, false),
      item("food_beverage", "haccp", "records_reviewed", "yes_no_na", 8, false),
    ],
  },

  // 7-2  Allergen Management Audit
  {
    id: "food_bev_allergen",
    industry: "food_beverage",
    name_key: k("food_beverage", "allergen", "name"),
    description_key: k("food_beverage", "allergen", "description"),
    category: "allergen_management",
    regulation: "FALCPA / EU FIC 1169/2011",
    frequency: "per_event",
    tags: ["allergen", "labeling", "cross_contamination"],
    items: [
      item("food_beverage", "allergen", "cleaning_verified", "yes_no_na", 1),
      item("food_beverage", "allergen", "label_accuracy", "pass_fail", 2),
      item("food_beverage", "allergen", "ingredient_segregation", "pass_fail", 3),
      item("food_beverage", "allergen", "shared_equipment", "yes_no_na", 4, false),
      item("food_beverage", "allergen", "staff_training", "yes_no_na", 5, false),
    ],
  },

  // 7-3  Cold Chain Temperature Log
  {
    id: "food_bev_cold_chain",
    industry: "food_beverage",
    name_key: k("food_beverage", "cold_chain", "name"),
    description_key: k("food_beverage", "cold_chain", "description"),
    category: "temperature_control",
    regulation: "FDA Food Code / FSMA",
    frequency: "continuous",
    tags: ["cold_chain", "temperature", "refrigeration"],
    items: [
      item("food_beverage", "cold_chain", "refrigerator_temps", "yes_no_na", 1),
      item("food_beverage", "cold_chain", "freezer_temps", "yes_no_na", 2),
      item("food_beverage", "cold_chain", "receiving_temps", "yes_no_na", 3),
      item("food_beverage", "cold_chain", "transport_temps", "yes_no_na", 4, false),
      item("food_beverage", "cold_chain", "deviation_response", "yes_no_na", 5, false),
    ],
  },

  // 7-4  Sanitation Audit
  {
    id: "food_bev_sanitation",
    industry: "food_beverage",
    name_key: k("food_beverage", "sanitation", "name"),
    description_key: k("food_beverage", "sanitation", "description"),
    category: "sanitation",
    regulation: "FDA 21 CFR 110 / GMP",
    frequency: "daily",
    tags: ["sanitation", "gmp", "cleaning"],
    items: [
      item("food_beverage", "sanitation", "food_contact_surfaces", "yes_no_na", 1),
      item("food_beverage", "sanitation", "floor_drains", "yes_no_na", 2),
      item("food_beverage", "sanitation", "pest_control", "yes_no_na", 3),
      item("food_beverage", "sanitation", "hand_wash_stations", "yes_no_na", 4, false),
      item("food_beverage", "sanitation", "chemical_storage", "yes_no_na", 5, false),
    ],
  },

  // 7-5  Employee Hygiene Check
  {
    id: "food_bev_hygiene",
    industry: "food_beverage",
    name_key: k("food_beverage", "hygiene", "name"),
    description_key: k("food_beverage", "hygiene", "description"),
    category: "employee_hygiene",
    regulation: "FDA Food Code",
    frequency: "per_shift",
    tags: ["hygiene", "uniform", "handwashing"],
    items: [
      item("food_beverage", "hygiene", "clean_uniform", "pass_fail", 1),
      item("food_beverage", "hygiene", "hair_restraint", "pass_fail", 2),
      item("food_beverage", "hygiene", "no_jewelry", "pass_fail", 3),
      item("food_beverage", "hygiene", "wounds_covered", "pass_fail", 4),
      item("food_beverage", "hygiene", "illness_reporting", "yes_no_na", 5),
      item("food_beverage", "hygiene", "handwashing", "yes_no_na", 6, false),
      item("food_beverage", "hygiene", "glove_use", "yes_no_na", 7, false),
    ],
  },

  // 7-6  Shipping/Receiving Inspection
  {
    id: "food_bev_shipping",
    industry: "food_beverage",
    name_key: k("food_beverage", "shipping", "name"),
    description_key: k("food_beverage", "shipping", "description"),
    category: "shipping_receiving",
    regulation: "FSMA Preventive Controls",
    frequency: "per_event",
    tags: ["shipping", "receiving", "traceability"],
    items: [
      item("food_beverage", "shipping", "vehicle_cleanliness", "pass_fail", 1),
      item("food_beverage", "shipping", "temperature_verified", "pass_fail", 2),
      item("food_beverage", "shipping", "packaging_integrity", "pass_fail", 3),
      item("food_beverage", "shipping", "date_codes", "yes_no_na", 4),
      item("food_beverage", "shipping", "rejected_items", "yes_no_na", 5, false),
      item("food_beverage", "shipping", "lot_traceability", "yes_no_na", 6, false),
    ],
  },
];

// ==========================================
// 8. UTILITIES (6 templates)
// ==========================================

const utilitiesTemplates: IndustryChecklistTemplate[] = [
  // 8-1  Arc Flash Compliance
  {
    id: "utilities_arc_flash",
    industry: "utilities",
    name_key: k("utilities", "arc_flash", "name"),
    description_key: k("utilities", "arc_flash", "description"),
    category: "electrical_safety",
    regulation: "NFPA 70E / OSHA 1910.269",
    frequency: "per_event",
    tags: ["arc_flash", "electrical", "ppe"],
    items: [
      item("utilities", "arc_flash", "incident_energy", "yes_no_na", 1),
      item("utilities", "arc_flash", "ppe_category", "yes_no_na", 2),
      item("utilities", "arc_flash", "approach_boundaries", "yes_no_na", 3),
      item("utilities", "arc_flash", "energized_permit", "yes_no_na", 4),
      item("utilities", "arc_flash", "buddy_system", "yes_no_na", 5, false),
      item("utilities", "arc_flash", "de_energize_eval", "yes_no_na", 6, false),
    ],
  },

  // 8-2  Substation Inspection
  {
    id: "utilities_substation",
    industry: "utilities",
    name_key: k("utilities", "substation", "name"),
    description_key: k("utilities", "substation", "description"),
    category: "substation",
    regulation: "NERC / OSHA 1910.269",
    frequency: "monthly",
    tags: ["substation", "transformer", "switchgear"],
    items: [
      item("utilities", "substation", "transformer_oil", "yes_no_na", 1),
      item("utilities", "substation", "breaker_operation", "yes_no_na", 2),
      item("utilities", "substation", "ground_grid", "yes_no_na", 3),
      item("utilities", "substation", "fence_security", "pass_fail", 4),
      item("utilities", "substation", "signage_visible", "yes_no_na", 5),
      item("utilities", "substation", "vegetation_clearance", "pass_fail", 6, false),
      item("utilities", "substation", "animal_guards", "yes_no_na", 7, false),
    ],
  },

  // 8-3  Vegetation Management Audit
  {
    id: "utilities_vegetation",
    industry: "utilities",
    name_key: k("utilities", "vegetation", "name"),
    description_key: k("utilities", "vegetation", "description"),
    category: "vegetation_management",
    regulation: "NERC FAC-003",
    frequency: "monthly",
    tags: ["vegetation", "right_of_way", "trimming"],
    items: [
      item("utilities", "vegetation", "row_clearance", "yes_no_na", 1),
      item("utilities", "vegetation", "trimming_completed", "yes_no_na", 2),
      item("utilities", "vegetation", "growth_assessment", "yes_no_na", 3),
      item("utilities", "vegetation", "herbicide_records", "yes_no_na", 4),
      item("utilities", "vegetation", "endangered_species", "yes_no_na", 5, false),
      item("utilities", "vegetation", "access_road", "yes_no_na", 6, false),
    ],
  },

  // 8-4  Line Clearance Audit
  {
    id: "utilities_line_clearance",
    industry: "utilities",
    name_key: k("utilities", "line_clearance", "name"),
    description_key: k("utilities", "line_clearance", "description"),
    category: "line_work",
    regulation: "OSHA 1910.269 / NESC",
    frequency: "per_event",
    tags: ["line_clearance", "isolation", "grounding"],
    items: [
      item("utilities", "line_clearance", "line_identified", "yes_no_na", 1),
      item("utilities", "line_clearance", "grounds_installed", "pass_fail", 2),
      item("utilities", "line_clearance", "approach_distance", "yes_no_na", 3),
      item("utilities", "line_clearance", "rubber_goods", "yes_no_na", 4, false),
      item("utilities", "line_clearance", "traffic_control", "yes_no_na", 5, false),
    ],
  },

  // 8-5  Switching Procedure
  {
    id: "utilities_switching",
    industry: "utilities",
    name_key: k("utilities", "switching", "name"),
    description_key: k("utilities", "switching", "description"),
    category: "switching",
    regulation: "OSHA 1910.269",
    frequency: "per_event",
    tags: ["switching", "isolation", "procedure"],
    items: [
      item("utilities", "switching", "procedure_printed", "yes_no_na", 1),
      item("utilities", "switching", "two_person_rule", "yes_no_na", 2),
      item("utilities", "switching", "isolation_verified", "yes_no_na", 3),
      item("utilities", "switching", "voltage_test", "yes_no_na", 4),
      item("utilities", "switching", "scada_notification", "yes_no_na", 5, false),
      item("utilities", "switching", "operating_log", "yes_no_na", 6, false),
    ],
  },

  // 8-6  Pole/Tower Climbing Safety
  {
    id: "utilities_pole_climbing",
    industry: "utilities",
    name_key: k("utilities", "pole_climbing", "name"),
    description_key: k("utilities", "pole_climbing", "description"),
    category: "climbing",
    regulation: "OSHA 1910.269 / ANSI A14",
    frequency: "per_event",
    tags: ["pole_climbing", "tower", "fall_protection"],
    items: [
      item("utilities", "pole_climbing", "fall_protection", "yes_no_na", 1),
      item("utilities", "pole_climbing", "climbing_equipment", "yes_no_na", 2),
      item("utilities", "pole_climbing", "pole_tested", "yes_no_na", 3),
      item("utilities", "pole_climbing", "structure_integrity", "pass_fail", 4),
      item("utilities", "pole_climbing", "rescue_device", "yes_no_na", 5, false),
      item("utilities", "pole_climbing", "communication", "yes_no_na", 6, false),
    ],
  },
];

// ==========================================
// 9. TRANSPORTATION (6 templates)
// ==========================================

const transportationTemplates: IndustryChecklistTemplate[] = [
  // 9-1  Pre-Trip Vehicle Inspection (DOT)
  {
    id: "transportation_pre_trip",
    industry: "transportation",
    name_key: k("transportation", "pre_trip", "name"),
    description_key: k("transportation", "pre_trip", "description"),
    category: "vehicle_inspection",
    regulation: "FMCSA 49 CFR 396.13",
    frequency: "per_event",
    tags: ["pre_trip", "dot", "vehicle_inspection"],
    items: [
      item("transportation", "pre_trip", "tires", "yes_no_na", 1),
      item("transportation", "pre_trip", "brakes_air", "yes_no_na", 2),
      item("transportation", "pre_trip", "lights_all", "yes_no_na", 3),
      item("transportation", "pre_trip", "mirrors", "pass_fail", 4),
      item("transportation", "pre_trip", "windshield", "yes_no_na", 5),
      item("transportation", "pre_trip", "horn", "pass_fail", 6),
      item("transportation", "pre_trip", "coupling_devices", "pass_fail", 7),
      item("transportation", "pre_trip", "cargo_securement", "pass_fail", 8, false),
      item("transportation", "pre_trip", "emergency_equipment", "pass_fail", 9, false),
    ],
  },

  // 9-2  Driver Safety Scorecard
  {
    id: "transportation_driver_scorecard",
    industry: "transportation",
    name_key: k("transportation", "driver_scorecard", "name"),
    description_key: k("transportation", "driver_scorecard", "description"),
    category: "driver_safety",
    regulation: "FMCSA CSA",
    frequency: "monthly",
    tags: ["driver_scorecard", "csa", "compliance"],
    items: [
      item("transportation", "driver_scorecard", "inspection_pass_rate", "rating", 1),
      item("transportation", "driver_scorecard", "incident_history", "number", 2),
      item("transportation", "driver_scorecard", "hos_compliance", "rating", 3),
      item("transportation", "driver_scorecard", "training_completion", "yes_no_na", 4),
      item("transportation", "driver_scorecard", "moving_violations", "number", 5, false),
      item("transportation", "driver_scorecard", "preventable_accidents", "number", 6, false),
    ],
  },

  // 9-3  Cargo Securement Check
  {
    id: "transportation_cargo",
    industry: "transportation",
    name_key: k("transportation", "cargo", "name"),
    description_key: k("transportation", "cargo", "description"),
    category: "cargo",
    regulation: "FMCSA 49 CFR 393.100",
    frequency: "per_event",
    tags: ["cargo", "securement", "tie_down"],
    items: [
      item("transportation", "cargo", "weight_limits", "yes_no_na", 1),
      item("transportation", "cargo", "tiedowns_rated", "yes_no_na", 2),
      item("transportation", "cargo", "header_board", "yes_no_na", 3),
      item("transportation", "cargo", "blocking_bracing", "pass_fail", 4),
      item("transportation", "cargo", "load_shift", "yes_no_na", 5, false),
      item("transportation", "cargo", "hazmat_placards", "yes_no_na", 6, false),
    ],
  },

  // 9-4  Hours of Service Compliance
  {
    id: "transportation_hos",
    industry: "transportation",
    name_key: k("transportation", "hos", "name"),
    description_key: k("transportation", "hos", "description"),
    category: "hours_of_service",
    regulation: "FMCSA 49 CFR Part 395",
    frequency: "daily",
    tags: ["hos", "eld", "driving_hours"],
    items: [
      item("transportation", "hos", "eld_functioning", "pass_fail", 1),
      item("transportation", "hos", "drive_time", "yes_no_na", 2),
      item("transportation", "hos", "rest_break", "yes_no_na", 3),
      item("transportation", "hos", "sleeper_berth", "yes_no_na", 4, false),
      item("transportation", "hos", "adverse_conditions", "yes_no_na", 5, false),
    ],
  },

  // 9-5  Hazmat Transport Checklist
  {
    id: "transportation_hazmat",
    industry: "transportation",
    name_key: k("transportation", "hazmat", "name"),
    description_key: k("transportation", "hazmat", "description"),
    category: "hazmat",
    regulation: "49 CFR Parts 171-180",
    frequency: "per_event",
    tags: ["hazmat", "dangerous_goods", "transport"],
    items: [
      item("transportation", "hazmat", "shipping_papers", "yes_no_na", 1),
      item("transportation", "hazmat", "placards_correct", "pass_fail", 2),
      item("transportation", "hazmat", "packaging_integrity", "pass_fail", 3),
      item("transportation", "hazmat", "compatibility", "yes_no_na", 4),
      item("transportation", "hazmat", "emergency_info", "yes_no_na", 5, false),
      item("transportation", "hazmat", "driver_endorsement", "yes_no_na", 6, false),
    ],
  },

  // 9-6  Post-Trip Inspection Report
  {
    id: "transportation_post_trip",
    industry: "transportation",
    name_key: k("transportation", "post_trip", "name"),
    description_key: k("transportation", "post_trip", "description"),
    category: "vehicle_inspection",
    regulation: "FMCSA 49 CFR 396.11",
    frequency: "per_event",
    tags: ["post_trip", "defect_report", "vehicle_condition"],
    items: [
      item("transportation", "post_trip", "defects_discovered", "text", 1),
      item("transportation", "post_trip", "brake_performance", "pass_fail", 2),
      item("transportation", "post_trip", "tire_condition", "pass_fail", 3),
      item("transportation", "post_trip", "fluid_leaks", "yes_no_na", 4),
      item("transportation", "post_trip", "body_damage", "yes_no_na", 5),
      item("transportation", "post_trip", "cargo_area", "yes_no_na", 6, false),
      item("transportation", "post_trip", "report_signed", "yes_no_na", 7, false),
    ],
  },
];

// ==========================================
// 10. EDUCATION (6 templates)
// ==========================================

const educationTemplates: IndustryChecklistTemplate[] = [
  // 10-1  Playground Safety
  {
    id: "education_playground",
    industry: "education",
    name_key: k("education", "playground", "name"),
    description_key: k("education", "playground", "description"),
    category: "playground",
    regulation: "CPSC / ASTM F1487",
    frequency: "daily",
    tags: ["playground", "equipment", "children_safety"],
    items: [
      item("education", "playground", "equipment_integrity", "pass_fail", 1),
      item("education", "playground", "fall_zone_surfacing", "pass_fail", 2),
      item("education", "playground", "age_appropriate", "yes_no_na", 3),
      item("education", "playground", "entrapment_hazards", "yes_no_na", 4),
      item("education", "playground", "drain_covers", "yes_no_na", 5, false),
      item("education", "playground", "general_condition", "yes_no_na", 6, false),
    ],
  },

  // 10-2  Lab Safety Inspection
  {
    id: "education_lab",
    industry: "education",
    name_key: k("education", "lab", "name"),
    description_key: k("education", "lab", "description"),
    category: "lab_safety",
    regulation: "OSHA 1910.1450 / NFPA 45",
    frequency: "daily",
    tags: ["lab_safety", "chemical", "eyewash"],
    items: [
      item("education", "lab", "eyewash_tested", "yes_no_na", 1),
      item("education", "lab", "shower_tested", "yes_no_na", 2),
      item("education", "lab", "fume_hood", "yes_no_na", 3),
      item("education", "lab", "chemical_storage", "yes_no_na", 4),
      item("education", "lab", "sds_accessible", "pass_fail", 5),
      item("education", "lab", "ppe_available", "pass_fail", 6),
      item("education", "lab", "emergency_shutoffs", "yes_no_na", 7, false),
      item("education", "lab", "glassware_disposal", "yes_no_na", 8, false),
    ],
  },

  // 10-3  Emergency Drill Record
  {
    id: "education_emergency_drill",
    industry: "education",
    name_key: k("education", "emergency_drill", "name"),
    description_key: k("education", "emergency_drill", "description"),
    category: "emergency_preparedness",
    regulation: "State fire codes",
    frequency: "monthly",
    tags: ["emergency_drill", "evacuation", "fire_drill"],
    items: [
      item("education", "emergency_drill", "drill_type", "text", 1),
      item("education", "emergency_drill", "weather_conditions", "text", 2),
      item("education", "emergency_drill", "evacuation_time", "yes_no_na", 3),
      item("education", "emergency_drill", "headcount_reconciled", "yes_no_na", 4),
      item("education", "emergency_drill", "areas_of_delay", "text", 5),
      item("education", "emergency_drill", "communication_effectiveness", "yes_no_na", 6, false),
      item("education", "emergency_drill", "special_needs", "yes_no_na", 7, false),
    ],
  },

  // 10-4  Visitor Management Log
  {
    id: "education_visitor",
    industry: "education",
    name_key: k("education", "visitor", "name"),
    description_key: k("education", "visitor", "description"),
    category: "security",
    regulation: "State education codes",
    frequency: "continuous",
    tags: ["visitor", "security", "badge"],
    items: [
      item("education", "visitor", "visitor_id_checked", "yes_no_na", 1),
      item("education", "visitor", "purpose_of_visit", "text", 2),
      item("education", "visitor", "badge_issued", "yes_no_na", 3),
      item("education", "visitor", "escort_assigned", "yes_no_na", 4),
      item("education", "visitor", "sign_out_time", "yes_no_na", 5, false),
      item("education", "visitor", "restricted_areas", "yes_no_na", 6, false),
    ],
  },

  // 10-5  Building Safety Walk
  {
    id: "education_building",
    industry: "education",
    name_key: k("education", "building", "name"),
    description_key: k("education", "building", "description"),
    category: "building_safety",
    regulation: "NFPA 101 / state health dept",
    frequency: "weekly",
    tags: ["building", "fire_safety", "aed"],
    items: [
      item("education", "building", "exit_signs", "yes_no_na", 1),
      item("education", "building", "fire_extinguishers", "yes_no_na", 2),
      item("education", "building", "aed_checked", "yes_no_na", 3),
      item("education", "building", "stairwell_lighting", "pass_fail", 4),
      item("education", "building", "trip_hazards", "pass_fail", 5),
      item("education", "building", "hvac_functioning", "yes_no_na", 6, false),
      item("education", "building", "water_temperature", "yes_no_na", 7, false),
    ],
  },

  // 10-6  Bus / Transportation Safety
  {
    id: "education_bus",
    industry: "education",
    name_key: k("education", "bus", "name"),
    description_key: k("education", "bus", "description"),
    category: "transportation",
    regulation: "FMVSS / state DOT",
    frequency: "daily",
    tags: ["bus", "student_transport", "pre_trip"],
    items: [
      item("education", "bus", "pre_trip_inspection", "yes_no_na", 1),
      item("education", "bus", "first_aid_kit", "pass_fail", 2),
      item("education", "bus", "emergency_exits", "yes_no_na", 3),
      item("education", "bus", "communication_device", "pass_fail", 4),
      item("education", "bus", "student_count", "yes_no_na", 5, false),
      item("education", "bus", "wheelchair_lift", "yes_no_na", 6, false),
    ],
  },
];

// ==========================================
// 11. AIRPORTS (10 templates)
// ==========================================

// ---- Terminal Operations (4) ----

const airportsTerminalTemplates: IndustryChecklistTemplate[] = [
  // 11-1  Escalator / Elevator Safety
  {
    id: "airports_escalator",
    industry: "airports",
    name_key: k("airports", "escalator", "name"),
    description_key: k("airports", "escalator", "description"),
    category: "terminal_equipment",
    regulation: "ASME A17.1",
    frequency: "daily",
    tags: ["escalator", "elevator", "terminal"],
    items: [
      item("airports", "escalator", "emergency_stop", "yes_no_na", 1),
      item("airports", "escalator", "comb_plate", "yes_no_na", 2),
      item("airports", "escalator", "handrail_speed", "yes_no_na", 3),
      item("airports", "escalator", "step_demarcation", "yes_no_na", 4),
      item("airports", "escalator", "lighting", "yes_no_na", 5),
      item("airports", "escalator", "intercom", "yes_no_na", 6, false),
      item("airports", "escalator", "maintenance_log", "yes_no_na", 7, false),
    ],
  },

  // 11-2  Terminal Floor Hazard Walk
  {
    id: "airports_terminal_floor",
    industry: "airports",
    name_key: k("airports", "terminal_floor", "name"),
    description_key: k("airports", "terminal_floor", "description"),
    category: "terminal_safety",
    regulation: "OSHA General Duty / ADA",
    frequency: "per_shift",
    tags: ["terminal", "floor_hazard", "slip_trip"],
    items: [
      item("airports", "terminal_floor", "wet_floor_signage", "pass_fail", 1),
      item("airports", "terminal_floor", "spill_cleanup", "yes_no_na", 2),
      item("airports", "terminal_floor", "trip_hazards", "yes_no_na", 3),
      item("airports", "terminal_floor", "construction_barriers", "pass_fail", 4),
      item("airports", "terminal_floor", "lighting_functional", "yes_no_na", 5, false),
      item("airports", "terminal_floor", "crowd_flow", "yes_no_na", 6, false),
    ],
  },

  // 11-3  AED / First Aid Station
  {
    id: "airports_aed",
    industry: "airports",
    name_key: k("airports", "aed", "name"),
    description_key: k("airports", "aed", "description"),
    category: "medical_equipment",
    regulation: "State AED laws / FAA",
    frequency: "daily",
    tags: ["aed", "first_aid", "medical"],
    items: [
      item("airports", "aed", "aed_powered", "yes_no_na", 1),
      item("airports", "aed", "pads_not_expired", "pass_fail", 2),
      item("airports", "aed", "battery_charge", "yes_no_na", 3),
      item("airports", "aed", "first_aid_supplies", "yes_no_na", 4),
      item("airports", "aed", "location_signage", "yes_no_na", 5, false),
      item("airports", "aed", "trained_responder", "yes_no_na", 6, false),
    ],
  },

  // 11-4  Emergency Evacuation Readiness
  {
    id: "airports_emergency_evac",
    industry: "airports",
    name_key: k("airports", "emergency_evac", "name"),
    description_key: k("airports", "emergency_evac", "description"),
    category: "emergency_preparedness",
    regulation: "NFPA 101 / TSA",
    frequency: "monthly",
    tags: ["evacuation", "emergency", "terminal"],
    items: [
      item("airports", "emergency_evac", "exit_signage", "yes_no_na", 1),
      item("airports", "emergency_evac", "evacuation_routes", "yes_no_na", 2),
      item("airports", "emergency_evac", "pa_system", "yes_no_na", 3),
      item("airports", "emergency_evac", "assembly_points", "yes_no_na", 4),
      item("airports", "emergency_evac", "wheelchair_chairs", "yes_no_na", 5, false),
      item("airports", "emergency_evac", "staff_assignments", "yes_no_na", 6, false),
    ],
  },
];

// ---- Airside Operations (6) ----

const airportsAirsideTemplates: IndustryChecklistTemplate[] = [
  // 11-5  GSE Pre-Use
  {
    id: "airports_gse",
    industry: "airports",
    name_key: k("airports", "gse", "name"),
    description_key: k("airports", "gse", "description"),
    category: "ground_support_equipment",
    regulation: "OSHA 1910.178 / IATA AHM",
    frequency: "per_shift",
    tags: ["gse", "ground_support", "airside"],
    items: [
      item("airports", "gse", "belt_loader", "yes_no_na", 1),
      item("airports", "gse", "tug_brakes_lights", "pass_fail", 2),
      item("airports", "gse", "baggage_cart", "yes_no_na", 3),
      item("airports", "gse", "fuel_level", "pass_fail", 4),
      item("airports", "gse", "fire_extinguisher", "pass_fail", 5),
      item("airports", "gse", "backup_alarm", "pass_fail", 6),
      item("airports", "gse", "tire_condition", "pass_fail", 7, false),
      item("airports", "gse", "operator_cert", "yes_no_na", 8, false),
    ],
  },

  // 11-6  FOD Walk
  {
    id: "airports_fod",
    industry: "airports",
    name_key: k("airports", "fod", "name"),
    description_key: k("airports", "fod", "description"),
    category: "fod_management",
    regulation: "FAA AC 150/5210-24",
    frequency: "per_event",
    tags: ["fod", "foreign_object_debris", "ramp"],
    items: [
      item("airports", "fod", "ramp_clear", "yes_no_na", 1),
      item("airports", "fod", "tools_accounted", "yes_no_na", 2),
      item("airports", "fod", "loose_items", "yes_no_na", 3),
      item("airports", "fod", "fod_bins", "yes_no_na", 4),
      item("airports", "fod", "surface_condition", "rating", 5, false),
      item("airports", "fod", "debris_documented", "yes_no_na", 6, false),
    ],
  },

  // 11-7  Fueling Operation Safety
  {
    id: "airports_fueling",
    industry: "airports",
    name_key: k("airports", "fueling", "name"),
    description_key: k("airports", "fueling", "description"),
    category: "fueling",
    regulation: "NFPA 407 / API 1595",
    frequency: "per_event",
    tags: ["fueling", "bonding", "grounding"],
    items: [
      item("airports", "fueling", "bonding_grounding", "yes_no_na", 1),
      item("airports", "fueling", "dead_man_switch", "yes_no_na", 2),
      item("airports", "fueling", "spill_containment", "yes_no_na", 3),
      item("airports", "fueling", "fire_extinguisher", "yes_no_na", 4),
      item("airports", "fueling", "no_ignition_sources", "pass_fail", 5),
      item("airports", "fueling", "fuel_sample", "yes_no_na", 6, false),
      item("airports", "fueling", "quantity_verified", "yes_no_na", 7, false),
    ],
  },

  // 11-8  Baggage Handling System Audit
  {
    id: "airports_baggage",
    industry: "airports",
    name_key: k("airports", "baggage", "name"),
    description_key: k("airports", "baggage", "description"),
    category: "baggage_handling",
    regulation: "OSHA 1910.211-219",
    frequency: "weekly",
    tags: ["baggage", "conveyor", "ergonomics"],
    items: [
      item("airports", "baggage", "conveyor_guarding", "pass_fail", 1),
      item("airports", "baggage", "emergency_stops", "yes_no_na", 2),
      item("airports", "baggage", "pinch_points", "yes_no_na", 3),
      item("airports", "baggage", "lighting", "yes_no_na", 4),
      item("airports", "baggage", "maintenance_access", "yes_no_na", 5),
      item("airports", "baggage", "noise_levels", "yes_no_na", 6, false),
      item("airports", "baggage", "ergonomic_aids", "yes_no_na", 7, false),
    ],
  },

  // 11-9  Ramp Safety Zone Compliance
  {
    id: "airports_ramp",
    industry: "airports",
    name_key: k("airports", "ramp", "name"),
    description_key: k("airports", "ramp", "description"),
    category: "ramp_safety",
    regulation: "IATA AHM",
    frequency: "per_event",
    tags: ["ramp", "jet_blast", "marshalling"],
    items: [
      item("airports", "ramp", "jet_blast_zone", "yes_no_na", 1),
      item("airports", "ramp", "equipment_marshalling", "yes_no_na", 2),
      item("airports", "ramp", "vehicle_speed", "yes_no_na", 3),
      item("airports", "ramp", "wing_walker", "yes_no_na", 4),
      item("airports", "ramp", "hearing_protection", "yes_no_na", 5),
      item("airports", "ramp", "reflective_vests", "yes_no_na", 6, false),
      item("airports", "ramp", "headsets_tested", "pass_fail", 7, false),
    ],
  },

  // 11-10  Multi-Contractor Compliance Dashboard
  {
    id: "airports_contractor",
    industry: "airports",
    name_key: k("airports", "contractor", "name"),
    description_key: k("airports", "contractor", "description"),
    category: "contractor_management",
    regulation: "TSA 49 CFR 1542",
    frequency: "monthly",
    tags: ["contractor", "ground_handler", "compliance"],
    items: [
      item("airports", "contractor", "handler_training", "yes_no_na", 1),
      item("airports", "contractor", "security_badges", "yes_no_na", 2),
      item("airports", "contractor", "ramp_driving_auth", "pass_fail", 3),
      item("airports", "contractor", "incident_reports", "yes_no_na", 4),
      item("airports", "contractor", "audit_scores", "yes_no_na", 5, false),
      item("airports", "contractor", "corrective_actions", "yes_no_na", 6, false),
    ],
  },
];

// Combine all airport templates
const airportsTemplates: IndustryChecklistTemplate[] = [
  ...airportsTerminalTemplates,
  ...airportsAirsideTemplates,
];

// ==========================================
// ALL INDUSTRY TEMPLATE PACKS
// ==========================================

export const industryTemplatePacks: IndustryTemplatePack[] = [
  {
    industry: "construction",
    name_key: "industry_templates.construction.name",
    description_key: "industry_templates.construction.description",
    templates: constructionTemplates,
  },
  {
    industry: "manufacturing",
    name_key: "industry_templates.manufacturing.name",
    description_key: "industry_templates.manufacturing.description",
    templates: manufacturingTemplates,
  },
  {
    industry: "oil_gas",
    name_key: "industry_templates.oil_gas.name",
    description_key: "industry_templates.oil_gas.description",
    templates: oilGasTemplates,
  },
  {
    industry: "healthcare",
    name_key: "industry_templates.healthcare.name",
    description_key: "industry_templates.healthcare.description",
    templates: healthcareTemplates,
  },
  {
    industry: "warehousing",
    name_key: "industry_templates.warehousing.name",
    description_key: "industry_templates.warehousing.description",
    templates: warehousingTemplates,
  },
  {
    industry: "mining",
    name_key: "industry_templates.mining.name",
    description_key: "industry_templates.mining.description",
    templates: miningTemplates,
  },
  {
    industry: "food_beverage",
    name_key: "industry_templates.food_beverage.name",
    description_key: "industry_templates.food_beverage.description",
    templates: foodBeverageTemplates,
  },
  {
    industry: "utilities",
    name_key: "industry_templates.utilities.name",
    description_key: "industry_templates.utilities.description",
    templates: utilitiesTemplates,
  },
  {
    industry: "transportation",
    name_key: "industry_templates.transportation.name",
    description_key: "industry_templates.transportation.description",
    templates: transportationTemplates,
  },
  {
    industry: "education",
    name_key: "industry_templates.education.name",
    description_key: "industry_templates.education.description",
    templates: educationTemplates,
  },
  {
    industry: "airports",
    name_key: "industry_templates.airports.name",
    description_key: "industry_templates.airports.description",
    templates: airportsTemplates,
  },
];

// ==========================================
// LOOKUP HELPERS
// ==========================================

/** Get a full template pack for an industry */
export function getPackByIndustry(
  code: IndustryCode,
): IndustryTemplatePack | undefined {
  return industryTemplatePacks.find((p) => p.industry === code);
}

/** Get every template across all industries */
export function getAllTemplates(): IndustryChecklistTemplate[] {
  return industryTemplatePacks.flatMap((p) => p.templates);
}

/** Get templates for a single industry */
export function getTemplatesByIndustry(
  code: IndustryCode,
): IndustryChecklistTemplate[] {
  return getPackByIndustry(code)?.templates ?? [];
}

/** Find a single template by its unique id */
export function getTemplateById(
  id: string,
): IndustryChecklistTemplate | undefined {
  return getAllTemplates().find((t) => t.id === id);
}

/** Get all unique tags across every template */
export function getAllTags(): string[] {
  const tags = new Set<string>();
  for (const t of getAllTemplates()) {
    for (const tag of t.tags) {
      tags.add(tag);
    }
  }
  return Array.from(tags).sort();
}

/** Search templates by tag */
export function getTemplatesByTag(tag: string): IndustryChecklistTemplate[] {
  return getAllTemplates().filter((t) => t.tags.includes(tag));
}

/** Search templates by regulation keyword */
export function getTemplatesByRegulation(
  keyword: string,
): IndustryChecklistTemplate[] {
  const lower = keyword.toLowerCase();
  return getAllTemplates().filter((t) =>
    t.regulation.toLowerCase().includes(lower),
  );
}
