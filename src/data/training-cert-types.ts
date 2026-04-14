import type { TrainingCertificationType, Country } from "@/types";

const now = "2024-01-01T00:00:00Z";

function cert(
  id: string,
  name: string,
  category: TrainingCertificationType["category"],
  country_specific: Country | null,
  regulation_ref: string | null,
  default_validity_days: number | null,
  renewal_required: boolean,
): TrainingCertificationType {
  return {
    id: `builtin_${id}`,
    company_id: "__built_in__",
    name,
    category,
    country_specific,
    regulation_ref,
    default_validity_days,
    renewal_required,
    is_builtin: true,
    is_active: true,
    created_at: now,
    updated_at: now,
  };
}

// ── Universal (no country restriction) ──

const UNIVERSAL: TrainingCertificationType[] = [
  cert("first_aid", "First Aid", "safety", null, null, 730, true),
  cert("fire_warden", "Fire Warden", "safety", null, null, 365, true),
  cert("manual_handling", "Manual Handling", "safety", null, null, 730, true),
  cert("working_at_height", "Working at Height", "safety", null, null, 365, true),
  cert("loto_isolation", "LOTO / Isolation", "safety", null, null, 365, true),
];

// ── United States ──

const US: TrainingCertificationType[] = [
  cert("osha_10", "OSHA 10-Hour General Industry", "regulatory", "US", "OSHA 29 CFR 1910", null, false),
  cert("osha_30", "OSHA 30-Hour Construction", "regulatory", "US", "OSHA 29 CFR 1926", null, false),
  cert("forklift_osha", "Forklift Operator — OSHA 1910.178", "equipment", "US", "OSHA 1910.178", 1095, true),
  cert("confined_space", "Confined Space Entry", "safety", "US", "OSHA 1910.146", 365, true),
  cert("hazmat_awareness", "HazMat Awareness", "safety", "US", "OSHA 1910.120", 365, true),
];

// ── Netherlands ──

const NL: TrainingCertificationType[] = [
  cert("vca_basis", "VCA Basis", "regulatory", "NL", "VCA checklist", 3650, true),
  cert("vca_vol", "VCA Vol", "regulatory", "NL", "VCA checklist", 3650, true),
  cert("bhv", "BHV — Bedrijfshulpverlener", "safety", "NL", "Arbowet art. 15", 365, true),
  cert("heftruck_tcvt", "Heftruck — TCVT", "equipment", "NL", "TCVT W3", 1825, true),
];

// ── Sweden ──

const SE: TrainingCertificationType[] = [
  cert("bam", "BAM — Byggarbetsmiljösamordnare", "regulatory", "SE", "AFS 1999:3", null, false),
  cert("heta_arbeten", "Heta Arbeten — Hot Work Certificate", "safety", "SE", "SBF 506:1", 1825, true),
  cert("truckkorkort", "Truckkörkort A/B", "equipment", "SE", "AFS 2006:5", 1825, true),
];

// ── United Kingdom ──

const GB: TrainingCertificationType[] = [
  cert("iosh_managing_safely", "IOSH Managing Safely", "regulatory", "GB", "IOSH", 1095, true),
  cert("nebosh_gc", "NEBOSH General Certificate", "regulatory", "GB", "NEBOSH", null, false),
  cert("cscs_card", "CSCS Card", "regulatory", "GB", "CSCS", 1825, true),
  cert("pasma", "PASMA", "equipment", "GB", "PASMA", 1825, true),
];

// ── Germany ──

const DE: TrainingCertificationType[] = [
  cert("ersthelfer", "Ersthelfer — First Aider", "safety", "DE", "DGUV Vorschrift 1", 730, true),
  cert("brandschutzhelfer", "Brandschutzhelfer", "safety", "DE", "ASR A2.2", 730, true),
  cert("staplerschein", "Staplerführerschein — Forklift", "equipment", "DE", "DGUV Grundsatz 308-001", 365, true),
];

// ── France ──

const FR: TrainingCertificationType[] = [
  cert("sst", "SST — Sauveteur Secouriste", "safety", "FR", "Code du travail R4224-15", 730, true),
  cert("caces", "CACES — Equipment Operation", "equipment", "FR", "R489 / R482", 1825, true),
];

// ── Spain ──

const ES: TrainingCertificationType[] = [
  cert("prl_basico", "PRL Básico — Basic OHS", "regulatory", "ES", "Ley 31/1995", null, false),
  cert("carretillero", "Carretillero — Forklift", "equipment", "ES", "RD 1215/1997", 1825, true),
];

/**
 * Returns all built-in certification types across all supported countries.
 */
export function getBuiltInCertTypes(): TrainingCertificationType[] {
  return [...UNIVERSAL, ...US, ...NL, ...SE, ...GB, ...DE, ...FR, ...ES];
}
