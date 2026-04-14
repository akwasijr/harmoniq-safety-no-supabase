-- Migration: Create tables for new modules (Training, Compliance, Permits, Environment, Procedures)
-- These tables are needed by the new stores that were added to the application.

-- ══════════════════════════════════════════════════════════════
-- Training & Competency
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS training_cert_types (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  country_specific TEXT,
  regulation_ref TEXT,
  default_validity_days INTEGER,
  renewal_required BOOLEAN NOT NULL DEFAULT true,
  is_builtin BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS worker_certifications (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  certification_type_id TEXT NOT NULL,
  certificate_number TEXT,
  issuer TEXT,
  issued_date TEXT NOT NULL,
  expiry_date TEXT,
  status TEXT NOT NULL DEFAULT 'valid',
  document_url TEXT,
  notes TEXT,
  verified_by TEXT,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS training_assignments (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  course_name TEXT NOT NULL,
  description TEXT,
  user_id TEXT NOT NULL,
  assigned_by TEXT NOT NULL,
  linked_certification_type_id TEXT,
  due_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'assigned',
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════════════════════
-- Compliance
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS compliance_obligations (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  regulation TEXT NOT NULL,
  country TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  frequency TEXT NOT NULL DEFAULT 'annual',
  custom_frequency_days INTEGER,
  next_due_date TEXT NOT NULL,
  last_completed_date TEXT,
  owner_id TEXT,
  evidence_type TEXT NOT NULL DEFAULT 'manual',
  auto_evidence_source TEXT,
  status TEXT NOT NULL DEFAULT 'not_started',
  is_builtin BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS compliance_evidence (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  obligation_id TEXT NOT NULL,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_id TEXT,
  document_url TEXT,
  notes TEXT,
  submitted_by TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_review',
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS compliance_documents (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  document_url TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT '1.0',
  status TEXT NOT NULL DEFAULT 'draft',
  review_date TEXT,
  owner_id TEXT,
  tags TEXT[] DEFAULT '{}',
  applicable_countries TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════════════════════
-- Permits to Work
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS permits (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  permit_number TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'other',
  title TEXT NOT NULL,
  description TEXT,
  location_id TEXT,
  asset_id TEXT,
  requested_by TEXT NOT NULL,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  precautions TEXT[] DEFAULT '{}',
  isolation_refs TEXT[] DEFAULT '{}',
  workers TEXT[] DEFAULT '{}',
  notes TEXT,
  closed_by TEXT,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════════════════════
-- Environment
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS waste_logs (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  waste_type TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'non_hazardous',
  volume NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'kg',
  disposal_method TEXT NOT NULL,
  contractor TEXT,
  location_id TEXT,
  date TEXT NOT NULL,
  notes TEXT,
  recorded_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS spill_records (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  material TEXT NOT NULL,
  volume NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'liters',
  severity TEXT NOT NULL DEFAULT 'minor',
  location_id TEXT,
  location_description TEXT,
  containment_action TEXT NOT NULL,
  incident_id TEXT,
  date TEXT NOT NULL,
  reported_by TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════════════════════
-- Procedures
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS procedure_templates (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  industry TEXT,
  steps JSONB NOT NULL DEFAULT '[]',
  recurrence TEXT NOT NULL DEFAULT 'per_event',
  is_builtin BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS procedure_submissions (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  procedure_template_id TEXT NOT NULL,
  submitter_id TEXT NOT NULL,
  location_id TEXT,
  status TEXT NOT NULL DEFAULT 'in_progress',
  current_step INTEGER NOT NULL DEFAULT 0,
  step_submissions JSONB NOT NULL DEFAULT '[]',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  next_due_date TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════════════════════
-- Indexes for performance
-- ══════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_worker_certs_company ON worker_certifications(company_id);
CREATE INDEX IF NOT EXISTS idx_worker_certs_user ON worker_certifications(user_id);
CREATE INDEX IF NOT EXISTS idx_training_assignments_company ON training_assignments(company_id);
CREATE INDEX IF NOT EXISTS idx_training_assignments_user ON training_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_compliance_obligations_company ON compliance_obligations(company_id);
CREATE INDEX IF NOT EXISTS idx_compliance_evidence_company ON compliance_evidence(company_id);
CREATE INDEX IF NOT EXISTS idx_compliance_documents_company ON compliance_documents(company_id);
CREATE INDEX IF NOT EXISTS idx_permits_company ON permits(company_id);
CREATE INDEX IF NOT EXISTS idx_waste_logs_company ON waste_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_spill_records_company ON spill_records(company_id);
CREATE INDEX IF NOT EXISTS idx_procedure_templates_company ON procedure_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_procedure_submissions_company ON procedure_submissions(company_id);

-- ══════════════════════════════════════════════════════════════
-- RLS Policies (same pattern as existing tables)
-- ══════════════════════════════════════════════════════════════

ALTER TABLE training_cert_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_obligations ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE permits ENABLE ROW LEVEL SECURITY;
ALTER TABLE waste_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE spill_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE procedure_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE procedure_submissions ENABLE ROW LEVEL SECURITY;
