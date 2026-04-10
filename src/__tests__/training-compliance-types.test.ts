import { describe, it, expect } from "vitest";
import type {
  TrainingCertificationType, WorkerCertification, TrainingAssignment,
  ComplianceObligation, ComplianceEvidence, ComplianceDocument,
  PermitToWork, WasteLog, SpillRecord,
} from "@/types";

describe("Training & Compliance Types", () => {
  it("TrainingCertificationType has correct shape", () => {
    const cert: TrainingCertificationType = {
      id: "test", company_id: "c1", name: "Test Cert", category: "safety",
      country_specific: "US", regulation_ref: "OSHA", default_validity_days: 365,
      renewal_required: true, is_builtin: false, is_active: true,
      created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z",
    };
    expect(cert.id).toBe("test");
    expect(cert.category).toBe("safety");
  });

  it("WorkerCertification has correct shape", () => {
    const wc: WorkerCertification = {
      id: "test", company_id: "c1", user_id: "u1", certification_type_id: "ct1",
      certificate_number: "ABC123", issuer: "Red Cross", issued_date: "2024-01-01",
      expiry_date: "2025-01-01", status: "valid", document_url: null, notes: null,
      verified_by: null, verified_at: null,
      created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z",
    };
    expect(wc.status).toBe("valid");
  });

  it("TrainingAssignment has correct shape", () => {
    const ta: TrainingAssignment = {
      id: "test", company_id: "c1", course_name: "Safety 101",
      description: null, user_id: "u1", assigned_by: "u2",
      linked_certification_type_id: null, due_date: "2025-03-01",
      status: "assigned", completed_at: null, notes: null,
      created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z",
    };
    expect(ta.status).toBe("assigned");
    expect(ta.course_name).toBe("Safety 101");
  });

  it("ComplianceObligation has correct shape", () => {
    const co: ComplianceObligation = {
      id: "test", company_id: "c1", title: "OSHA 300", description: null,
      regulation: "OSHA 29 CFR 1904", country: "US", category: "incident_reporting",
      frequency: "annual", custom_frequency_days: null, next_due_date: "2025-01-01",
      last_completed_date: null, owner_id: null, evidence_type: "auto",
      auto_evidence_source: "incidents", status: "not_started",
      is_builtin: true, is_active: true,
      created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z",
    };
    expect(co.country).toBe("US");
    expect(co.frequency).toBe("annual");
  });

  it("ComplianceEvidence has correct shape", () => {
    const ce: ComplianceEvidence = {
      id: "test", company_id: "c1", obligation_id: "o1",
      period_start: "2024-01-01", period_end: "2024-12-31",
      source_type: "incident", source_id: "inc-1",
      document_url: null, notes: null, submitted_by: "u1",
      status: "pending_review", reviewed_by: null, reviewed_at: null,
      created_at: "2024-01-01T00:00:00Z",
    };
    expect(ce.status).toBe("pending_review");
    expect(ce.source_type).toBe("incident");
  });

  it("ComplianceDocument has correct shape", () => {
    const cd: ComplianceDocument = {
      id: "test", company_id: "c1", title: "Safety Policy",
      category: "policy", document_url: "https://example.com/doc.pdf",
      version: "1.0", status: "current", review_date: "2025-06-01",
      owner_id: "u1", tags: ["safety", "policy"],
      applicable_countries: ["US", "GB"],
      created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z",
    };
    expect(cd.category).toBe("policy");
    expect(cd.tags).toHaveLength(2);
  });

  it("PermitToWork has correct shape", () => {
    const p: PermitToWork = {
      id: "test", company_id: "c1", permit_number: "PTW-001", type: "hot_work",
      title: "Welding Permit", description: null, location_id: null, asset_id: null,
      requested_by: "u1", approved_by: null, approved_at: null,
      start_time: "2024-01-01T08:00:00Z", end_time: "2024-01-01T16:00:00Z",
      status: "draft", precautions: ["Fire extinguisher nearby"], isolation_refs: [],
      workers: ["u1", "u2"], notes: null, closed_by: null, closed_at: null,
      created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z",
    };
    expect(p.type).toBe("hot_work");
    expect(p.workers).toHaveLength(2);
  });

  it("WasteLog has correct shape", () => {
    const w: WasteLog = {
      id: "test", company_id: "c1", waste_type: "Oil", category: "hazardous",
      volume: 50, unit: "liters", disposal_method: "Licensed contractor",
      contractor: "WasteCo", location_id: null, date: "2024-01-15",
      notes: null, recorded_by: "u1",
      created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z",
    };
    expect(w.category).toBe("hazardous");
    expect(w.volume).toBe(50);
  });

  it("SpillRecord has correct shape", () => {
    const s: SpillRecord = {
      id: "test", company_id: "c1", material: "Diesel", volume: 10, unit: "liters",
      severity: "minor", location_id: null, location_description: "Loading dock",
      containment_action: "Absorbent pads applied", incident_id: null,
      date: "2024-01-15", reported_by: "u1", status: "contained", notes: null,
      created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z",
    };
    expect(s.severity).toBe("minor");
    expect(s.status).toBe("contained");
  });
});
