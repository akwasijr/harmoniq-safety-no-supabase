import type {
  Country,
  IndustryCode,
  IndustryChecklistTemplate,
  IndustryChecklistItem,
} from "@/types";

// ==========================================
// HELPERS
// ==========================================
const k = (industry: string, template: string, field: string) =>
  `risk_assessment_templates.${industry}.${template}.${field}`;

const ki = (industry: string, template: string, item: string) =>
  `risk_assessment_templates.${industry}.${template}.items.${item}`;

const item = (
  industry: string, template: string, key: string,
  type: IndustryChecklistItem["type"], order: number, required = true,
): IndustryChecklistItem => ({
  key, question_key: ki(industry, template, key), type, required, order,
});

// Standard risk assessment items reused across templates
const stdItems = (industry: string, tpl: string, startOrder = 1): IndustryChecklistItem[] => [
  item(industry, tpl, "hazard_description", "text", startOrder, true),
  item(industry, tpl, "persons_at_risk", "text", startOrder + 1, true),
  item(industry, tpl, "existing_controls", "yes_no_na", startOrder + 2, true),
  item(industry, tpl, "severity_rating", "rating", startOrder + 3, true),
  item(industry, tpl, "probability_rating", "rating", startOrder + 4, true),
  item(industry, tpl, "risk_acceptable", "yes_no_na", startOrder + 5, true),
  item(industry, tpl, "additional_controls", "text", startOrder + 6, false),
  item(industry, tpl, "residual_risk_acceptable", "yes_no_na", startOrder + 7, true),
];

// ==========================================
// COUNTRY REGULATION OVERRIDES
// ==========================================
const US_CENTRIC_PATTERN = /\b(OSHA|MSHA|FDA|NFPA|FAA|TSA)\b/i;

const COUNTRY_RA_REGULATION_OVERRIDES: Record<
  Exclude<Country, "US">,
  Record<IndustryCode, string>
> = {
  NL: {
    construction: "Arbowet / RI&E", manufacturing: "Arbowet / NEN 3140", oil_gas: "Arbowet / BRZO",
    healthcare: "Arbowet / Wkkgz", warehousing: "Arbowet / RI&E", mining: "Mijnbouwwet / Arbowet",
    food_beverage: "HACCP / NVWA", utilities: "Arbowet / NEN 3140", transportation: "Arbowet / ILT",
    education: "Arbowet / BHV", airports: "Arbowet / ILT / EASA",
  },
  SE: {
    construction: "AFS / SAM", manufacturing: "AFS / SAM", oil_gas: "AFS / SAM",
    healthcare: "AFS / SAM", warehousing: "AFS / SAM", mining: "AFS / SAM",
    food_beverage: "AFS / Livsmedelsverket", utilities: "AFS / SAM", transportation: "AFS / SAM",
    education: "AFS / SAM", airports: "AFS / Transportstyrelsen",
  },
  GB: {
    construction: "HSE CDM 2015", manufacturing: "HSE PUWER / COSHH", oil_gas: "HSE COMAH",
    healthcare: "HSE / CQC", warehousing: "HSE LOLER / PUWER", mining: "HSE Mines Regulations",
    food_beverage: "FSA / HACCP", utilities: "HSE Electricity at Work", transportation: "HSE / DVSA",
    education: "HSE / DfE", airports: "HSE / CAA",
  },
  DE: {
    construction: "ArbSchG / BaustellV", manufacturing: "ArbSchG / BetrSichV", oil_gas: "ArbSchG / GefStoffV",
    healthcare: "ArbSchG / BioStoffV", warehousing: "ArbSchG / BetrSichV", mining: "BBergG / ABBergV",
    food_beverage: "LMHV / HACCP", utilities: "ArbSchG / DGUV", transportation: "ArbSchG / StVO",
    education: "ArbSchG / DGUV", airports: "ArbSchG / LuftSiG",
  },
  FR: {
    construction: "Code du travail / R4532", manufacturing: "Code du travail / DUER", oil_gas: "Code du travail / Seveso",
    healthcare: "Code du travail / ARS", warehousing: "Code du travail / DUER", mining: "Code minier / DUER",
    food_beverage: "HACCP / DGCCRF", utilities: "Code du travail / DUER", transportation: "Code du travail / DUER",
    education: "Code du travail / DUER", airports: "Code du travail / DGAC",
  },
  ES: {
    construction: "LPRL / RD 1627/1997", manufacturing: "LPRL / RD 486/1997", oil_gas: "LPRL / RD 840/2015",
    healthcare: "LPRL / RD 664/1997", warehousing: "LPRL / RD 486/1997", mining: "LPRL / RD 863/1985",
    food_beverage: "HACCP / AESAN", utilities: "LPRL / RD 614/2001", transportation: "LPRL / RD 1215/1997",
    education: "LPRL / RD 486/1997", airports: "LPRL / AESA",
  },
};

export function resolveRARegulation(
  template: IndustryChecklistTemplate,
  country: Country,
): string {
  if (country === "US") return template.regulation;
  const overrides = COUNTRY_RA_REGULATION_OVERRIDES[country];
  if (overrides?.[template.industry]) {
    if (US_CENTRIC_PATTERN.test(template.regulation)) {
      return overrides[template.industry];
    }
  }
  return template.regulation;
}

// ==========================================
// CONSTRUCTION RISK ASSESSMENTS
// ==========================================
const constructionRA: IndustryChecklistTemplate[] = [
  {
    id: "ra_construction_jha", industry: "construction",
    name_key: k("construction", "jha", "name"), description_key: k("construction", "jha", "description"),
    category: "hazard_analysis", regulation: "OSHA 29 CFR 1926", frequency: "per_event",
    tags: ["jha", "hazard", "risk"], items: stdItems("construction", "jha"),
  },
  {
    id: "ra_construction_fall_risk", industry: "construction",
    name_key: k("construction", "fall_risk", "name"), description_key: k("construction", "fall_risk", "description"),
    category: "fall_protection", regulation: "OSHA 29 CFR 1926.501", frequency: "per_event",
    tags: ["fall", "height", "protection"], items: [
      item("construction", "fall_risk", "work_at_height", "yes_no_na", 1),
      item("construction", "fall_risk", "fall_distance", "number", 2),
      item("construction", "fall_risk", "edge_protection", "yes_no_na", 3),
      item("construction", "fall_risk", "harness_available", "yes_no_na", 4),
      item("construction", "fall_risk", "anchor_points", "yes_no_na", 5),
      item("construction", "fall_risk", "rescue_plan", "yes_no_na", 6),
      item("construction", "fall_risk", "severity_rating", "rating", 7),
      item("construction", "fall_risk", "probability_rating", "rating", 8),
      item("construction", "fall_risk", "controls_adequate", "yes_no_na", 9),
    ],
  },
  {
    id: "ra_construction_excavation", industry: "construction",
    name_key: k("construction", "excavation", "name"), description_key: k("construction", "excavation", "description"),
    category: "excavation", regulation: "OSHA 29 CFR 1926.650", frequency: "per_event",
    tags: ["excavation", "trench", "collapse"], items: stdItems("construction", "excavation"),
  },
  {
    id: "ra_construction_hot_work", industry: "construction",
    name_key: k("construction", "hot_work", "name"), description_key: k("construction", "hot_work", "description"),
    category: "hot_work", regulation: "OSHA 29 CFR 1926.352", frequency: "per_event",
    tags: ["welding", "hot_work", "fire"], items: stdItems("construction", "hot_work"),
  },
  {
    id: "ra_construction_confined_space", industry: "construction",
    name_key: k("construction", "confined_space", "name"), description_key: k("construction", "confined_space", "description"),
    category: "confined_space", regulation: "OSHA 29 CFR 1926.1200", frequency: "per_event",
    tags: ["confined", "entry", "atmosphere"], items: stdItems("construction", "confined_space"),
  },
  {
    id: "ra_construction_crane_lift", industry: "construction",
    name_key: k("construction", "crane_lift", "name"), description_key: k("construction", "crane_lift", "description"),
    category: "lifting", regulation: "OSHA 29 CFR 1926.1400", frequency: "per_event",
    tags: ["crane", "lift", "rigging"], items: stdItems("construction", "crane_lift"),
  },
  {
    id: "ra_construction_electrical", industry: "construction",
    name_key: k("construction", "electrical", "name"), description_key: k("construction", "electrical", "description"),
    category: "electrical", regulation: "OSHA 29 CFR 1926.400", frequency: "per_event",
    tags: ["electrical", "arc_flash", "lockout"], items: stdItems("construction", "electrical"),
  },
  {
    id: "ra_construction_demolition", industry: "construction",
    name_key: k("construction", "demolition", "name"), description_key: k("construction", "demolition", "description"),
    category: "demolition", regulation: "OSHA 29 CFR 1926.850", frequency: "per_event",
    tags: ["demolition", "structural", "asbestos"], items: stdItems("construction", "demolition"),
  },
];

// ==========================================
// MANUFACTURING RISK ASSESSMENTS
// ==========================================
const manufacturingRA: IndustryChecklistTemplate[] = [
  {
    id: "ra_manufacturing_machine_guarding", industry: "manufacturing",
    name_key: k("manufacturing", "machine_guarding", "name"), description_key: k("manufacturing", "machine_guarding", "description"),
    category: "machinery", regulation: "OSHA 29 CFR 1910.212", frequency: "monthly",
    tags: ["machine", "guarding", "nip_point"], items: stdItems("manufacturing", "machine_guarding"),
  },
  {
    id: "ra_manufacturing_chemical", industry: "manufacturing",
    name_key: k("manufacturing", "chemical", "name"), description_key: k("manufacturing", "chemical", "description"),
    category: "chemical", regulation: "OSHA 29 CFR 1910.1200", frequency: "per_event",
    tags: ["chemical", "hazcom", "sds"], items: stdItems("manufacturing", "chemical"),
  },
  {
    id: "ra_manufacturing_ergonomic", industry: "manufacturing",
    name_key: k("manufacturing", "ergonomic", "name"), description_key: k("manufacturing", "ergonomic", "description"),
    category: "ergonomic", regulation: "OSHA General Duty Clause", frequency: "quarterly",
    tags: ["ergonomic", "msd", "repetitive"], items: stdItems("manufacturing", "ergonomic"),
  },
  {
    id: "ra_manufacturing_noise", industry: "manufacturing",
    name_key: k("manufacturing", "noise", "name"), description_key: k("manufacturing", "noise", "description"),
    category: "noise", regulation: "OSHA 29 CFR 1910.95", frequency: "quarterly",
    tags: ["noise", "hearing", "exposure"], items: stdItems("manufacturing", "noise"),
  },
  {
    id: "ra_manufacturing_loto", industry: "manufacturing",
    name_key: k("manufacturing", "loto", "name"), description_key: k("manufacturing", "loto", "description"),
    category: "lockout_tagout", regulation: "OSHA 29 CFR 1910.147", frequency: "per_event",
    tags: ["loto", "lockout", "energy"], items: stdItems("manufacturing", "loto"),
  },
  {
    id: "ra_manufacturing_forklift", industry: "manufacturing",
    name_key: k("manufacturing", "forklift", "name"), description_key: k("manufacturing", "forklift", "description"),
    category: "vehicles", regulation: "OSHA 29 CFR 1910.178", frequency: "monthly",
    tags: ["forklift", "pit", "pedestrian"], items: stdItems("manufacturing", "forklift"),
  },
  {
    id: "ra_manufacturing_fire", industry: "manufacturing",
    name_key: k("manufacturing", "fire", "name"), description_key: k("manufacturing", "fire", "description"),
    category: "fire", regulation: "OSHA 29 CFR 1910.155 / NFPA", frequency: "quarterly",
    tags: ["fire", "evacuation", "extinguisher"], items: stdItems("manufacturing", "fire"),
  },
];

// ==========================================
// OIL & GAS RISK ASSESSMENTS
// ==========================================
const oilGasRA: IndustryChecklistTemplate[] = [
  {
    id: "ra_oil_gas_well_control", industry: "oil_gas",
    name_key: k("oil_gas", "well_control", "name"), description_key: k("oil_gas", "well_control", "description"),
    category: "well_control", regulation: "OSHA 29 CFR 1910.119", frequency: "per_event",
    tags: ["well", "blowout", "bop"], items: stdItems("oil_gas", "well_control"),
  },
  {
    id: "ra_oil_gas_h2s", industry: "oil_gas",
    name_key: k("oil_gas", "h2s", "name"), description_key: k("oil_gas", "h2s", "description"),
    category: "toxic_gas", regulation: "OSHA 29 CFR 1910.1000", frequency: "per_shift",
    tags: ["h2s", "toxic", "gas_detection"], items: stdItems("oil_gas", "h2s"),
  },
  {
    id: "ra_oil_gas_ptw", industry: "oil_gas",
    name_key: k("oil_gas", "ptw", "name"), description_key: k("oil_gas", "ptw", "description"),
    category: "permit_to_work", regulation: "OSHA 29 CFR 1910.119", frequency: "per_event",
    tags: ["permit", "ptw", "authorization"], items: stdItems("oil_gas", "ptw"),
  },
  {
    id: "ra_oil_gas_pipeline", industry: "oil_gas",
    name_key: k("oil_gas", "pipeline", "name"), description_key: k("oil_gas", "pipeline", "description"),
    category: "pipeline", regulation: "OSHA / PHMSA 49 CFR 195", frequency: "monthly",
    tags: ["pipeline", "integrity", "corrosion"], items: stdItems("oil_gas", "pipeline"),
  },
  {
    id: "ra_oil_gas_rig_move", industry: "oil_gas",
    name_key: k("oil_gas", "rig_move", "name"), description_key: k("oil_gas", "rig_move", "description"),
    category: "rig_operations", regulation: "OSHA 29 CFR 1910.119", frequency: "per_event",
    tags: ["rig", "move", "transport"], items: stdItems("oil_gas", "rig_move"),
  },
  {
    id: "ra_oil_gas_drilling", industry: "oil_gas",
    name_key: k("oil_gas", "drilling", "name"), description_key: k("oil_gas", "drilling", "description"),
    category: "drilling", regulation: "OSHA 29 CFR 1910.119", frequency: "per_event",
    tags: ["drilling", "operations", "wellbore"], items: stdItems("oil_gas", "drilling"),
  },
];

// ==========================================
// HEALTHCARE RISK ASSESSMENTS
// ==========================================
const healthcareRA: IndustryChecklistTemplate[] = [
  {
    id: "ra_healthcare_patient_handling", industry: "healthcare",
    name_key: k("healthcare", "patient_handling", "name"), description_key: k("healthcare", "patient_handling", "description"),
    category: "manual_handling", regulation: "OSHA General Duty / Needlestick Safety Act", frequency: "per_event",
    tags: ["patient", "lifting", "msd"], items: stdItems("healthcare", "patient_handling"),
  },
  {
    id: "ra_healthcare_sharps", industry: "healthcare",
    name_key: k("healthcare", "sharps", "name"), description_key: k("healthcare", "sharps", "description"),
    category: "sharps", regulation: "OSHA 29 CFR 1910.1030", frequency: "monthly",
    tags: ["sharps", "needlestick", "bloodborne"], items: stdItems("healthcare", "sharps"),
  },
  {
    id: "ra_healthcare_infection", industry: "healthcare",
    name_key: k("healthcare", "infection", "name"), description_key: k("healthcare", "infection", "description"),
    category: "infection_control", regulation: "OSHA 29 CFR 1910.1030", frequency: "monthly",
    tags: ["infection", "ppe", "isolation"], items: stdItems("healthcare", "infection"),
  },
  {
    id: "ra_healthcare_medication", industry: "healthcare",
    name_key: k("healthcare", "medication", "name"), description_key: k("healthcare", "medication", "description"),
    category: "medication", regulation: "Joint Commission / OSHA", frequency: "monthly",
    tags: ["medication", "dispensing", "error"], items: stdItems("healthcare", "medication"),
  },
  {
    id: "ra_healthcare_violence", industry: "healthcare",
    name_key: k("healthcare", "violence", "name"), description_key: k("healthcare", "violence", "description"),
    category: "violence", regulation: "OSHA General Duty Clause", frequency: "quarterly",
    tags: ["violence", "aggression", "security"], items: stdItems("healthcare", "violence"),
  },
  {
    id: "ra_healthcare_radiation", industry: "healthcare",
    name_key: k("healthcare", "radiation", "name"), description_key: k("healthcare", "radiation", "description"),
    category: "radiation", regulation: "OSHA 29 CFR 1910.1096", frequency: "monthly",
    tags: ["radiation", "x-ray", "dosimetry"], items: stdItems("healthcare", "radiation"),
  },
];

// ==========================================
// WAREHOUSING RISK ASSESSMENTS
// ==========================================
const warehousingRA: IndustryChecklistTemplate[] = [
  {
    id: "ra_warehousing_manual_handling", industry: "warehousing",
    name_key: k("warehousing", "manual_handling", "name"), description_key: k("warehousing", "manual_handling", "description"),
    category: "manual_handling", regulation: "OSHA 29 CFR 1910.176", frequency: "quarterly",
    tags: ["manual", "lifting", "back_injury"], items: stdItems("warehousing", "manual_handling"),
  },
  {
    id: "ra_warehousing_racking", industry: "warehousing",
    name_key: k("warehousing", "racking", "name"), description_key: k("warehousing", "racking", "description"),
    category: "racking", regulation: "OSHA 29 CFR 1910.176", frequency: "quarterly",
    tags: ["racking", "storage", "collapse"], items: stdItems("warehousing", "racking"),
  },
  {
    id: "ra_warehousing_loading_dock", industry: "warehousing",
    name_key: k("warehousing", "loading_dock", "name"), description_key: k("warehousing", "loading_dock", "description"),
    category: "loading", regulation: "OSHA 29 CFR 1910.176", frequency: "monthly",
    tags: ["loading", "dock", "trailer"], items: stdItems("warehousing", "loading_dock"),
  },
  {
    id: "ra_warehousing_forklift", industry: "warehousing",
    name_key: k("warehousing", "forklift", "name"), description_key: k("warehousing", "forklift", "description"),
    category: "vehicles", regulation: "OSHA 29 CFR 1910.178", frequency: "monthly",
    tags: ["forklift", "pedestrian", "traffic"], items: stdItems("warehousing", "forklift"),
  },
  {
    id: "ra_warehousing_fire", industry: "warehousing",
    name_key: k("warehousing", "fire", "name"), description_key: k("warehousing", "fire", "description"),
    category: "fire", regulation: "OSHA / NFPA", frequency: "quarterly",
    tags: ["fire", "sprinkler", "evacuation"], items: stdItems("warehousing", "fire"),
  },
];

// ==========================================
// MINING RISK ASSESSMENTS
// ==========================================
const miningRA: IndustryChecklistTemplate[] = [
  {
    id: "ra_mining_ground_control", industry: "mining",
    name_key: k("mining", "ground_control", "name"), description_key: k("mining", "ground_control", "description"),
    category: "ground_control", regulation: "MSHA 30 CFR 57", frequency: "per_shift",
    tags: ["ground", "roof", "support"], items: stdItems("mining", "ground_control"),
  },
  {
    id: "ra_mining_ventilation", industry: "mining",
    name_key: k("mining", "ventilation", "name"), description_key: k("mining", "ventilation", "description"),
    category: "ventilation", regulation: "MSHA 30 CFR 57.8", frequency: "per_shift",
    tags: ["ventilation", "air", "methane"], items: stdItems("mining", "ventilation"),
  },
  {
    id: "ra_mining_blasting", industry: "mining",
    name_key: k("mining", "blasting", "name"), description_key: k("mining", "blasting", "description"),
    category: "blasting", regulation: "MSHA 30 CFR 56.6", frequency: "per_event",
    tags: ["blasting", "explosive", "detonation"], items: stdItems("mining", "blasting"),
  },
  {
    id: "ra_mining_electrical", industry: "mining",
    name_key: k("mining", "electrical", "name"), description_key: k("mining", "electrical", "description"),
    category: "electrical", regulation: "MSHA 30 CFR 57.12", frequency: "monthly",
    tags: ["electrical", "underground", "arc_flash"], items: stdItems("mining", "electrical"),
  },
  {
    id: "ra_mining_mobile_equipment", industry: "mining",
    name_key: k("mining", "mobile_equipment", "name"), description_key: k("mining", "mobile_equipment", "description"),
    category: "vehicles", regulation: "MSHA 30 CFR 56.14", frequency: "per_shift",
    tags: ["mobile", "haul_truck", "dump"], items: stdItems("mining", "mobile_equipment"),
  },
  {
    id: "ra_mining_dust", industry: "mining",
    name_key: k("mining", "dust", "name"), description_key: k("mining", "dust", "description"),
    category: "health", regulation: "MSHA 30 CFR 72", frequency: "monthly",
    tags: ["dust", "silica", "respirable"], items: stdItems("mining", "dust"),
  },
];

// ==========================================
// FOOD & BEVERAGE RISK ASSESSMENTS
// ==========================================
const foodBeverageRA: IndustryChecklistTemplate[] = [
  {
    id: "ra_food_haccp", industry: "food_beverage",
    name_key: k("food_beverage", "haccp", "name"), description_key: k("food_beverage", "haccp", "description"),
    category: "food_safety", regulation: "FDA FSMA / HACCP", frequency: "monthly",
    tags: ["haccp", "ccp", "hazard_analysis"], items: stdItems("food_beverage", "haccp"),
  },
  {
    id: "ra_food_allergen", industry: "food_beverage",
    name_key: k("food_beverage", "allergen", "name"), description_key: k("food_beverage", "allergen", "description"),
    category: "allergen", regulation: "FDA FSMA / FALCPA", frequency: "monthly",
    tags: ["allergen", "cross_contact", "labeling"], items: stdItems("food_beverage", "allergen"),
  },
  {
    id: "ra_food_cold_chain", industry: "food_beverage",
    name_key: k("food_beverage", "cold_chain", "name"), description_key: k("food_beverage", "cold_chain", "description"),
    category: "temperature", regulation: "FDA 21 CFR 117", frequency: "daily",
    tags: ["cold_chain", "temperature", "refrigeration"], items: stdItems("food_beverage", "cold_chain"),
  },
  {
    id: "ra_food_cleaning_chemical", industry: "food_beverage",
    name_key: k("food_beverage", "cleaning_chemical", "name"), description_key: k("food_beverage", "cleaning_chemical", "description"),
    category: "chemical", regulation: "OSHA 29 CFR 1910.1200 / FDA", frequency: "monthly",
    tags: ["cleaning", "chemical", "sanitizer"], items: stdItems("food_beverage", "cleaning_chemical"),
  },
  {
    id: "ra_food_machinery", industry: "food_beverage",
    name_key: k("food_beverage", "machinery", "name"), description_key: k("food_beverage", "machinery", "description"),
    category: "machinery", regulation: "OSHA 29 CFR 1910.212", frequency: "monthly",
    tags: ["machinery", "guarding", "conveyor"], items: stdItems("food_beverage", "machinery"),
  },
];

// ==========================================
// UTILITIES RISK ASSESSMENTS
// ==========================================
const utilitiesRA: IndustryChecklistTemplate[] = [
  {
    id: "ra_utilities_arc_flash", industry: "utilities",
    name_key: k("utilities", "arc_flash", "name"), description_key: k("utilities", "arc_flash", "description"),
    category: "electrical", regulation: "OSHA / NFPA 70E", frequency: "per_event",
    tags: ["arc_flash", "electrical", "ppe"], items: stdItems("utilities", "arc_flash"),
  },
  {
    id: "ra_utilities_line_work", industry: "utilities",
    name_key: k("utilities", "line_work", "name"), description_key: k("utilities", "line_work", "description"),
    category: "line_work", regulation: "OSHA 29 CFR 1910.269", frequency: "per_event",
    tags: ["line", "overhead", "voltage"], items: stdItems("utilities", "line_work"),
  },
  {
    id: "ra_utilities_gas_leak", industry: "utilities",
    name_key: k("utilities", "gas_leak", "name"), description_key: k("utilities", "gas_leak", "description"),
    category: "gas", regulation: "OSHA / PHMSA 49 CFR 192", frequency: "per_event",
    tags: ["gas", "leak", "excavation"], items: stdItems("utilities", "gas_leak"),
  },
  {
    id: "ra_utilities_confined_space", industry: "utilities",
    name_key: k("utilities", "confined_space", "name"), description_key: k("utilities", "confined_space", "description"),
    category: "confined_space", regulation: "OSHA 29 CFR 1910.146", frequency: "per_event",
    tags: ["confined", "manhole", "atmosphere"], items: stdItems("utilities", "confined_space"),
  },
  {
    id: "ra_utilities_working_height", industry: "utilities",
    name_key: k("utilities", "working_height", "name"), description_key: k("utilities", "working_height", "description"),
    category: "height", regulation: "OSHA 29 CFR 1910.28", frequency: "per_event",
    tags: ["height", "pole", "tower"], items: stdItems("utilities", "working_height"),
  },
];

// ==========================================
// TRANSPORTATION RISK ASSESSMENTS
// ==========================================
const transportationRA: IndustryChecklistTemplate[] = [
  {
    id: "ra_transport_driver_fatigue", industry: "transportation",
    name_key: k("transportation", "driver_fatigue", "name"), description_key: k("transportation", "driver_fatigue", "description"),
    category: "fatigue", regulation: "FMCSA 49 CFR 395", frequency: "daily",
    tags: ["fatigue", "hours", "driver"], items: stdItems("transportation", "driver_fatigue"),
  },
  {
    id: "ra_transport_vehicle", industry: "transportation",
    name_key: k("transportation", "vehicle", "name"), description_key: k("transportation", "vehicle", "description"),
    category: "vehicle", regulation: "FMCSA / OSHA", frequency: "per_event",
    tags: ["vehicle", "inspection", "roadworthy"], items: stdItems("transportation", "vehicle"),
  },
  {
    id: "ra_transport_loading", industry: "transportation",
    name_key: k("transportation", "loading", "name"), description_key: k("transportation", "loading", "description"),
    category: "loading", regulation: "FMCSA 49 CFR 393", frequency: "per_event",
    tags: ["loading", "cargo", "securement"], items: stdItems("transportation", "loading"),
  },
  {
    id: "ra_transport_hazmat", industry: "transportation",
    name_key: k("transportation", "hazmat", "name"), description_key: k("transportation", "hazmat", "description"),
    category: "hazmat", regulation: "FMCSA 49 CFR 172", frequency: "per_event",
    tags: ["hazmat", "dangerous_goods", "placards"], items: stdItems("transportation", "hazmat"),
  },
  {
    id: "ra_transport_route", industry: "transportation",
    name_key: k("transportation", "route", "name"), description_key: k("transportation", "route", "description"),
    category: "route", regulation: "FMCSA / OSHA", frequency: "per_event",
    tags: ["route", "journey", "weather"], items: stdItems("transportation", "route"),
  },
];

// ==========================================
// EDUCATION RISK ASSESSMENTS
// ==========================================
const educationRA: IndustryChecklistTemplate[] = [
  {
    id: "ra_education_lab_safety", industry: "education",
    name_key: k("education", "lab_safety", "name"), description_key: k("education", "lab_safety", "description"),
    category: "laboratory", regulation: "OSHA 29 CFR 1910.1450", frequency: "quarterly",
    tags: ["lab", "chemical", "science"], items: stdItems("education", "lab_safety"),
  },
  {
    id: "ra_education_field_trip", industry: "education",
    name_key: k("education", "field_trip", "name"), description_key: k("education", "field_trip", "description"),
    category: "field_trip", regulation: "State education codes", frequency: "per_event",
    tags: ["field_trip", "transport", "supervision"], items: stdItems("education", "field_trip"),
  },
  {
    id: "ra_education_playground", industry: "education",
    name_key: k("education", "playground", "name"), description_key: k("education", "playground", "description"),
    category: "playground", regulation: "CPSC / ASTM F1487", frequency: "monthly",
    tags: ["playground", "equipment", "surfacing"], items: stdItems("education", "playground"),
  },
  {
    id: "ra_education_chemical", industry: "education",
    name_key: k("education", "chemical", "name"), description_key: k("education", "chemical", "description"),
    category: "chemical", regulation: "OSHA 29 CFR 1910.1200", frequency: "quarterly",
    tags: ["chemical", "storage", "disposal"], items: stdItems("education", "chemical"),
  },
  {
    id: "ra_education_event", industry: "education",
    name_key: k("education", "event", "name"), description_key: k("education", "event", "description"),
    category: "events", regulation: "State fire codes / NFPA", frequency: "per_event",
    tags: ["event", "crowd", "evacuation"], items: stdItems("education", "event"),
  },
];

// ==========================================
// AIRPORTS RISK ASSESSMENTS
// ==========================================
const airportsRA: IndustryChecklistTemplate[] = [
  {
    id: "ra_airports_ramp", industry: "airports",
    name_key: k("airports", "ramp", "name"), description_key: k("airports", "ramp", "description"),
    category: "ramp", regulation: "FAA / OSHA", frequency: "per_shift",
    tags: ["ramp", "ground_handling", "gse"], items: stdItems("airports", "ramp"),
  },
  {
    id: "ra_airports_fueling", industry: "airports",
    name_key: k("airports", "fueling", "name"), description_key: k("airports", "fueling", "description"),
    category: "fueling", regulation: "NFPA 407 / FAA", frequency: "per_event",
    tags: ["fueling", "spill", "static"], items: stdItems("airports", "fueling"),
  },
  {
    id: "ra_airports_jet_blast", industry: "airports",
    name_key: k("airports", "jet_blast", "name"), description_key: k("airports", "jet_blast", "description"),
    category: "jet_blast", regulation: "FAA AC 150/5210", frequency: "per_event",
    tags: ["jet_blast", "ingestion", "fod"], items: stdItems("airports", "jet_blast"),
  },
  {
    id: "ra_airports_terminal_evac", industry: "airports",
    name_key: k("airports", "terminal_evac", "name"), description_key: k("airports", "terminal_evac", "description"),
    category: "evacuation", regulation: "NFPA 101 / TSA", frequency: "quarterly",
    tags: ["evacuation", "terminal", "emergency"], items: stdItems("airports", "terminal_evac"),
  },
  {
    id: "ra_airports_ground_vehicle", industry: "airports",
    name_key: k("airports", "ground_vehicle", "name"), description_key: k("airports", "ground_vehicle", "description"),
    category: "vehicles", regulation: "FAA AC 150/5210 / OSHA", frequency: "per_shift",
    tags: ["vehicle", "airside", "driving"], items: stdItems("airports", "ground_vehicle"),
  },
  {
    id: "ra_airports_hazmat_cargo", industry: "airports",
    name_key: k("airports", "hazmat_cargo", "name"), description_key: k("airports", "hazmat_cargo", "description"),
    category: "hazmat", regulation: "FAA / IATA DGR", frequency: "per_event",
    tags: ["hazmat", "cargo", "dangerous_goods"], items: stdItems("airports", "hazmat_cargo"),
  },
];

// ==========================================
// ALL TEMPLATES
// ==========================================
const ALL_RA_TEMPLATES: IndustryChecklistTemplate[] = [
  ...constructionRA, ...manufacturingRA, ...oilGasRA, ...healthcareRA,
  ...warehousingRA, ...miningRA, ...foodBeverageRA, ...utilitiesRA,
  ...transportationRA, ...educationRA, ...airportsRA,
];

// ==========================================
// EXPORTED FUNCTIONS
// ==========================================
export function getAllRiskAssessmentTemplates(): IndustryChecklistTemplate[] {
  return ALL_RA_TEMPLATES;
}

export function getAllRiskAssessmentTemplatesForCountry(country: Country): IndustryChecklistTemplate[] {
  // Filter templates by country — US-centric regulations only show for US,
  // other countries get their own regulation overrides
  return ALL_RA_TEMPLATES.map((t) => ({
    ...t,
    regulation: resolveRARegulation(t, country),
  }));
}

export function getRiskAssessmentTemplatesByIndustry(
  industry: IndustryCode,
  country: Country,
): IndustryChecklistTemplate[] {
  return ALL_RA_TEMPLATES
    .filter((t) => t.industry === industry)
    .map((t) => ({
      ...t,
      regulation: resolveRARegulation(t, country),
    }));
}

export function getRiskAssessmentTemplateById(id: string): IndustryChecklistTemplate | undefined {
  return ALL_RA_TEMPLATES.find((t) => t.id === id);
}
