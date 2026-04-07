"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useCompanyParam } from "@/hooks/use-company-param";
import { useRiskEvaluationsStore } from "@/stores/risk-evaluations-store";
import { useLocationsStore } from "@/stores/locations-store";
import { useUsersStore } from "@/stores/users-store";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "@/i18n";
import {
  ArrowLeft, ShieldCheck, MapPin, Calendar, User, FileText,
  HardHat, AlertTriangle, CheckCircle, XCircle, Minus, Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingPage } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";

/* ─── Helpers ──────────────────────────────────────────── */

/** camelCase/snake_case → "Title Case Label" */
function humanLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyData = Record<string, any>;
/* eslint-enable @typescript-eslint/no-explicit-any */

function getRiskLevel(score: number) {
  if (score === 0) return { text: "Not Assessed", variant: "secondary" as const };
  if (score <= 5) return { text: "Low", variant: "success" as const };
  if (score <= 11) return { text: "Medium", variant: "warning" as const };
  return { text: "High", variant: "destructive" as const };
}

function getRIERiskPriority(score: number) {
  if (score <= 3) return { text: "Low", variant: "success" as const };
  if (score <= 9) return { text: "Medium", variant: "warning" as const };
  return { text: "High", variant: "destructive" as const };
}

function complianceVariant(status: string | null) {
  switch (status) {
    case "compliant": case "pass": return "success" as const;
    case "non_compliant": case "fail": return "destructive" as const;
    case "partial": return "warning" as const;
    default: return "secondary" as const;
  }
}

function complianceLabel(status: string | null) {
  switch (status) {
    case "compliant": return "Compliant";
    case "non_compliant": return "Non-Compliant";
    case "partial": return "Partial";
    case "pass": return "Pass";
    case "fail": return "Fail";
    case "na": return "N/A";
    default: return "Not Assessed";
  }
}

function InfoRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm font-medium text-right">{value}</span>
    </div>
  );
}

/* ─── Form-type-specific renderers ─────────────────────── */

function JHARenderer({ data }: { data: AnyData }) {
  const steps = (data.jobSteps || []) as AnyData[];
  const ppe = (data.ppeRequired || []) as string[];

  return (
    <div className="space-y-4">
      {/* Admin info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Job Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-0 divide-y">
          <InfoRow label="Job Title" value={String(data.jobTitle || "")} />
          <InfoRow label="Department" value={String(data.department || "")} />
          <InfoRow label="Supervisor" value={String(data.supervisor || "")} />
          <InfoRow label="Date" value={String(data.date || "")} />
          {data.jobDescription ? (
            <div className="py-2">
              <p className="text-sm text-muted-foreground mb-1">Job Description</p>
              <p className="text-sm">{String(data.jobDescription)}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Job Steps */}
      {steps.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Job Steps &amp; Hazards ({steps.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {steps.map((step, i) => {
              const sev = Number(step.severity || 0);
              const prob = Number(step.probability || 0);
              const score = sev * prob;
              const risk = getRiskLevel(score);
              return (
                <div key={i} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">
                      Step {i + 1}
                    </span>
                    <Badge variant={risk.variant} className="text-[10px]">
                      Risk: {risk.text}
                    </Badge>
                  </div>
                  {step.description && (
                    <p className="text-sm font-medium">{String(step.description)}</p>
                  )}
                  {step.hazardDescription && (
                    <div>
                      <p className="text-xs text-muted-foreground">Hazard</p>
                      <p className="text-sm">{String(step.hazardDescription)}</p>
                    </div>
                  )}
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>Severity: <strong className="text-foreground">{sev || "–"}</strong></span>
                    <span>Probability: <strong className="text-foreground">{prob || "–"}</strong></span>
                  </div>
                  {step.existingControls && (
                    <div>
                      <p className="text-xs text-muted-foreground">Existing Controls</p>
                      <p className="text-sm">{String(step.existingControls)}</p>
                    </div>
                  )}
                  {step.recommendedControls && (
                    <div>
                      <p className="text-xs text-muted-foreground">Recommended Controls</p>
                      <p className="text-sm">{String(step.recommendedControls)}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* PPE */}
      {ppe.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4" />
              PPE Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {ppe.map((item) => (
                <Badge key={item} variant="outline" className="gap-1.5 py-1">
                  <HardHat className="h-3 w-3" />
                  {item}
                </Badge>
              ))}
            </div>
            {data.otherPPE && (
              <p className="text-sm text-muted-foreground mt-2">Other: {String(data.otherPPE)}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Training & Notes */}
      {(data.trainingRequired || data.specialPrecautions || data.additionalNotes) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Training &amp; Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.trainingRequired && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Training Required</p>
                <p className="text-sm">{String(data.trainingRequired)}</p>
              </div>
            )}
            {data.specialPrecautions && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Special Precautions</p>
                <p className="text-sm">{String(data.specialPrecautions)}</p>
              </div>
            )}
            {data.additionalNotes && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Additional Notes</p>
                <p className="text-sm">{String(data.additionalNotes)}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function JSARenderer({ data }: { data: AnyData }) {
  const items = (data.checklistItems || {}) as Record<string, AnyData>;
  const itemEntries = Object.entries(items);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Job Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-0 divide-y">
          <InfoRow label="Job Description" value={String(data.jobDescription || "")} />
          <InfoRow label="Location" value={String(data.location || "")} />
          <InfoRow label="Crew Leader" value={String(data.crewLeader || "")} />
          <InfoRow label="Crew Members" value={String(data.crewMembers || "")} />
          <InfoRow label="Date" value={String(data.date || "")} />
          <InfoRow label="Time" value={String(data.time || "")} />
        </CardContent>
      </Card>

      {itemEntries.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Safety Checklist ({itemEntries.length} items)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {itemEntries.map(([key, item]) => {
              const status = String(item.status || "");
              return (
                <div key={key} className="flex items-center gap-3 rounded-lg border p-2.5">
                  {status === "pass" ? (
                    <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                  ) : status === "fail" ? (
                    <XCircle className="h-4 w-4 text-red-600 shrink-0" />
                  ) : (
                    <Minus className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{humanLabel(key)}</p>
                    {item.notes && (
                      <p className="text-xs text-muted-foreground">{String(item.notes)}</p>
                    )}
                  </div>
                  <Badge variant={complianceVariant(status)} className="text-[10px] shrink-0">
                    {complianceLabel(status)}
                  </Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {(data.identifiedHazards || data.controlMeasures || data.stopsWorkConditions) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Hazards &amp; Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.identifiedHazards && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Identified Hazards</p>
                <p className="text-sm">{String(data.identifiedHazards)}</p>
              </div>
            )}
            {data.controlMeasures && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Control Measures</p>
                <p className="text-sm">{String(data.controlMeasures)}</p>
              </div>
            )}
            {data.stopsWorkConditions && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Stop-Work Conditions</p>
                <p className="text-sm">{String(data.stopsWorkConditions)}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function RIERenderer({ data }: { data: AnyData }) {
  const risks = (data.risks || []) as AnyData[];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Company Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-0 divide-y">
          <InfoRow label="Company" value={String(data.companyName || "")} />
          <InfoRow label="KVK Number" value={String(data.kvkNumber || "")} />
          <InfoRow label="Sector" value={String(data.sector || "")} />
          <InfoRow label="Employees" value={String(data.employeeCount || "")} />
          <InfoRow label="Assessor" value={String(data.assessor || "")} />
          <InfoRow label="Date" value={String(data.assessmentDate || "")} />
        </CardContent>
      </Card>

      {(data.workplaceDescription || data.activities) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Workplace</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.workplaceDescription && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Description</p>
                <p className="text-sm">{String(data.workplaceDescription)}</p>
              </div>
            )}
            {data.activities && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Activities</p>
                <p className="text-sm">{String(data.activities)}</p>
              </div>
            )}
            <InfoRow label="Working Hours" value={String(data.workingHours || "")} />
            <InfoRow label="Special Groups" value={String(data.specialGroups || "")} />
          </CardContent>
        </Card>
      )}

      {risks.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Risk Inventory ({risks.length} items)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {risks.map((risk, i) => {
              const sev = Number(risk.severity || 0);
              const prob = Number(risk.probability || 0);
              const exp = Number(risk.exposure || 0);
              const score = sev * prob * exp;
              const level = getRIERiskPriority(score);
              return (
                <div key={i} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">Risk {i + 1}</span>
                    <Badge variant={level.variant} className="text-[10px]">
                      Priority: {level.text}
                    </Badge>
                  </div>
                  {risk.description && <p className="text-sm">{String(risk.description)}</p>}
                  <div className="flex gap-3 text-xs text-muted-foreground flex-wrap">
                    <span>Severity: <strong className="text-foreground">{sev || "–"}</strong>/3</span>
                    <span>Probability: <strong className="text-foreground">{prob || "–"}</strong>/3</span>
                    <span>Exposure: <strong className="text-foreground">{exp || "–"}</strong>/3</span>
                    <span>Score: <strong className="text-foreground">{score || "–"}</strong></span>
                  </div>
                  {risk.measures && (
                    <div>
                      <p className="text-xs text-muted-foreground">Measures</p>
                      <p className="text-sm">{String(risk.measures)}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {(data.generalMeasures || data.additionalNotes) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Action Plan &amp; Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.generalMeasures && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">General Measures</p>
                <p className="text-sm">{String(data.generalMeasures)}</p>
              </div>
            )}
            {data.additionalNotes && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Notes</p>
                <p className="text-sm">{String(data.additionalNotes)}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SAMRenderer({ data }: { data: AnyData }) {
  const risks = (data.risks || []) as AnyData[];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Organization</CardTitle>
        </CardHeader>
        <CardContent className="space-y-0 divide-y">
          <InfoRow label="Organization" value={String(data.organizationName || "")} />
          <InfoRow label="Department" value={String(data.department || "")} />
          <InfoRow label="Workplace" value={String(data.workplace || "")} />
          <InfoRow label="Assessor" value={String(data.assessor || "")} />
          <InfoRow label="Participants" value={String(data.participants || "")} />
          <InfoRow label="Date" value={String(data.assessmentDate || "")} />
        </CardContent>
      </Card>

      {risks.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Risks Identified ({risks.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {risks.map((risk, i) => {
              const sev = Number(risk.severity || 0);
              const prob = Number(risk.probability || 0);
              const score = sev * prob;
              const level = getRiskLevel(score);
              return (
                <div key={i} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">Risk {i + 1}</span>
                    <Badge variant={level.variant} className="text-[10px]">{level.text}</Badge>
                  </div>
                  {risk.description && <p className="text-sm">{String(risk.description)}</p>}
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>Severity: <strong className="text-foreground">{sev || "–"}</strong>/4</span>
                    <span>Probability: <strong className="text-foreground">{prob || "–"}</strong>/4</span>
                  </div>
                  {risk.currentMeasures && (
                    <div>
                      <p className="text-xs text-muted-foreground">Current Measures</p>
                      <p className="text-sm">{String(risk.currentMeasures)}</p>
                    </div>
                  )}
                  {risk.additionalMeasures && (
                    <div>
                      <p className="text-xs text-muted-foreground">Additional Measures</p>
                      <p className="text-sm">{String(risk.additionalMeasures)}</p>
                    </div>
                  )}
                  {risk.responsible && (
                    <InfoRow label="Responsible" value={String(risk.responsible)} />
                  )}
                  {risk.deadline && (
                    <InfoRow label="Deadline" value={String(risk.deadline)} />
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {(data.generalMeasures || data.followUpDate || data.signedBy) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Follow-Up</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.generalMeasures && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">General Measures</p>
                <p className="text-sm">{String(data.generalMeasures)}</p>
              </div>
            )}
            <InfoRow label="Follow-Up Date" value={String(data.followUpDate || "")} />
            <InfoRow label="Signed By" value={String(data.signedBy || "")} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function OSARenderer({ data }: { data: AnyData }) {
  const items = (data.responses || {}) as Record<string, AnyData>;
  const itemEntries = Object.entries(items);
  const priorities = (data.priorityAreas || []) as string[];

  const ratingLabels: Record<number, string> = {
    1: "Strongly Disagree", 2: "Disagree", 3: "Neutral", 4: "Agree", 5: "Strongly Agree",
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Respondent Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-0 divide-y">
          <InfoRow label="Organization" value={String(data.organizationName || "")} />
          <InfoRow label="Department" value={String(data.department || "")} />
          <InfoRow label="Respondent" value={String(data.respondent || "")} />
          <InfoRow label="Role" value={String(data.role || "")} />
          <InfoRow label="Date" value={String(data.assessmentDate || "")} />
        </CardContent>
      </Card>

      {itemEntries.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Responses ({itemEntries.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {itemEntries.map(([key, item]) => {
              const rating = Number(item.rating || 0);
              const concern = Boolean(item.concern);
              return (
                <div key={key} className="rounded-lg border p-2.5 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm">{humanLabel(key)}</p>
                    <div className="flex items-center gap-1 shrink-0">
                      {concern && (
                        <Badge variant="destructive" className="text-[10px]">Concern</Badge>
                      )}
                      <Badge variant={rating >= 4 ? "success" : rating >= 3 ? "warning" : "secondary"} className="text-[10px]">
                        {rating}/5
                      </Badge>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{ratingLabels[rating] || "Not Rated"}</p>
                  {item.notes && <p className="text-xs text-muted-foreground italic">{String(item.notes)}</p>}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {(data.overallConcerns || data.suggestions || priorities.length > 0) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Overall Assessment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.overallConcerns && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Overall Concerns</p>
                <p className="text-sm">{String(data.overallConcerns)}</p>
              </div>
            )}
            {data.suggestions && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Suggestions</p>
                <p className="text-sm">{String(data.suggestions)}</p>
              </div>
            )}
            {priorities.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Priority Areas</p>
                <div className="flex flex-wrap gap-1.5">
                  {priorities.map((p) => (
                    <Badge key={p} variant="outline">{humanLabel(p)}</Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ArbowetRenderer({ data }: { data: AnyData }) {
  const items = (data.items || {}) as Record<string, AnyData>;
  const itemEntries = Object.entries(items);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Audit Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-0 divide-y">
          <InfoRow label="Company" value={String(data.companyName || "")} />
          <InfoRow label="Auditor" value={String(data.auditor || "")} />
          <InfoRow label="Audit Date" value={String(data.auditDate || "")} />
        </CardContent>
      </Card>

      {itemEntries.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Compliance Items ({itemEntries.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {itemEntries.map(([key, item]) => {
              const status = String(item.status || "");
              return (
                <div key={key} className="rounded-lg border p-2.5 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm">{humanLabel(key)}</p>
                    <Badge variant={complianceVariant(status)} className="text-[10px] shrink-0">
                      {complianceLabel(status)}
                    </Badge>
                  </div>
                  {item.evidence && (
                    <p className="text-xs text-muted-foreground">Evidence: {String(item.evidence)}</p>
                  )}
                  {item.actionNeeded && (
                    <p className="text-xs text-red-600 dark:text-red-400">Action: {String(item.actionNeeded)}</p>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {(data.overallAssessment || data.priorityActions || data.nextAuditDate) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.overallAssessment && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Overall Assessment</p>
                <p className="text-sm">{String(data.overallAssessment)}</p>
              </div>
            )}
            {data.priorityActions && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Priority Actions</p>
                <p className="text-sm">{String(data.priorityActions)}</p>
              </div>
            )}
            <InfoRow label="Next Audit" value={String(data.nextAuditDate || "")} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/** Generic fallback for unknown form types */
function GenericRenderer({ data }: { data: AnyData }) {
  const skip = new Set(["id", "submitter_id", "company_id"]);
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Assessment Responses</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 divide-y">
          {Object.entries(data)
            .filter(([k, v]) => !skip.has(k) && v !== null && v !== undefined && v !== "")
            .map(([key, value]) => {
              const label = humanLabel(key);
              if (Array.isArray(value)) {
                if (value.length === 0) return null;
                if (value.every((v) => typeof v === "string")) {
                  return (
                    <div key={key} className="py-2">
                      <p className="text-xs text-muted-foreground mb-1">{label}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {value.map((v, i) => <Badge key={i} variant="outline">{String(v)}</Badge>)}
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={key} className="py-2 space-y-2">
                    <p className="text-xs text-muted-foreground">{label} ({value.length})</p>
                    {value.map((item, i) => (
                      <div key={i} className="rounded-lg border bg-muted/20 p-3 space-y-1">
                        {typeof item === "object" && item !== null ? (
                          Object.entries(item as AnyData)
                            .filter(([, v]) => v !== null && v !== undefined && v !== "")
                            .map(([k, v]) => (
                              <div key={k} className="flex justify-between gap-2">
                                <span className="text-xs text-muted-foreground">{humanLabel(k)}</span>
                                <span className="text-xs font-medium text-right">{String(v)}</span>
                              </div>
                            ))
                        ) : (
                          <p className="text-sm">{String(item)}</p>
                        )}
                      </div>
                    ))}
                  </div>
                );
              }
              if (typeof value === "boolean") {
                return (
                  <div key={key} className="flex items-center justify-between py-2">
                    <span className="text-sm text-muted-foreground">{label}</span>
                    <Badge variant={value ? "success" : "secondary"}>{value ? "Yes" : "No"}</Badge>
                  </div>
                );
              }
              if (typeof value === "object" && value !== null) {
                const entries = Object.entries(value as AnyData)
                  .filter(([, v]) => v !== null && v !== undefined && v !== "");
                if (entries.length === 0) return null;
                return (
                  <div key={key} className="py-2 space-y-1">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <div className="rounded-lg border p-3 space-y-1">
                      {entries.map(([k, v]) => (
                        <div key={k} className="flex justify-between gap-2">
                          <span className="text-xs text-muted-foreground">{humanLabel(k)}</span>
                          <span className="text-xs font-medium text-right">{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }
              return <InfoRow key={key} label={label} value={String(value)} />;
            })}
        </div>
      </CardContent>
    </Card>
  );
}

export default function RiskAssessmentViewPage() {
  const params = useParams();
  const router = useRouter();
  const company = useCompanyParam();
  const { user } = useAuth();
  const { formatDate } = useTranslation();
  const { items: evaluations, isLoading } = useRiskEvaluationsStore();
  const { items: locations } = useLocationsStore();
  const { items: users } = useUsersStore();

  const rawId = params.evaluationId;
  const id = typeof rawId === "string" ? rawId : Array.isArray(rawId) ? rawId[0] : "";

  const evaluation = evaluations.find((e) => e.id === id);

  if (!evaluation && !isLoading) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="Assessment not found"
        description="This risk assessment may have been removed."
        action={
          <Link href={`/${company}/app/risk-assessment`}>
            <Button variant="outline">Back to Assessments</Button>
          </Link>
        }
      />
    );
  }

  if (!evaluation) return <LoadingPage />;

  if (evaluation.company_id && user?.company_id && evaluation.company_id !== user.company_id) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="Assessment not found"
        description="This risk assessment may have been removed."
        action={
          <Link href={`/${company}/app/risk-assessment`}>
            <Button variant="outline">Back to Assessments</Button>
          </Link>
        }
      />
    );
  }

  const location = locations.find((l) => l.id === evaluation.location_id);
  const reviewerName = evaluation.reviewed_by
    ? users.find((candidate) => candidate.id === evaluation.reviewed_by)?.full_name || "Reviewer"
    : null;
  const responses = (evaluation.responses || {}) as AnyData;

  const assessmentLabels: Record<string, string> = {
    RIE: "RI&E Assessment",
    JHA: "Job Hazard Analysis",
    JSA: "Job Safety Analysis",
    SAM: "SAM Assessment",
    OSA: "OSA Assessment",
    ARBOWET: "Arbowet Compliance",
    AFS: "AFS Risk Evaluation",
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header — not sticky, app nav is already sticky */}
      <div className="border-b bg-background">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()} aria-label="Go back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-base truncate">
              {assessmentLabels[evaluation.form_type] || evaluation.form_type}
            </h1>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Overview Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Status:</span>
              <Badge
                variant={
                  evaluation.status === "submitted"
                    ? "warning"
                    : evaluation.status === "reviewed"
                      ? "success"
                      : "secondary"
                }
                className="text-[10px]"
              >
                {evaluation.status === "submitted"
                  ? "Submitted — Awaiting Review"
                  : evaluation.status === "reviewed"
                    ? "Reviewed"
                    : evaluation.status === "draft"
                      ? "Draft"
                      : evaluation.status}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Type:</span>
              <span className="font-medium">
                {assessmentLabels[evaluation.form_type] || evaluation.form_type}
              </span>
            </div>
            {evaluation.submitted_at && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Submitted:</span>
                <span className="font-medium">
                  {formatDate(new Date(evaluation.submitted_at), {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            )}
            {location && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Location:</span>
                <span className="font-medium">{location.name}</span>
              </div>
            )}
            {reviewerName && (
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Reviewed by:</span>
                <span className="font-medium">{reviewerName}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Form-type-specific response rendering */}
        {evaluation.form_type === "JHA" && <JHARenderer data={responses} />}
        {evaluation.form_type === "JSA" && <JSARenderer data={responses} />}
        {evaluation.form_type === "RIE" && <RIERenderer data={responses} />}
        {evaluation.form_type === "SAM" && <SAMRenderer data={responses} />}
        {evaluation.form_type === "OSA" && <OSARenderer data={responses} />}
        {evaluation.form_type === "ARBOWET" && <ArbowetRenderer data={responses} />}
        {!["JHA", "JSA", "RIE", "SAM", "OSA", "ARBOWET"].includes(evaluation.form_type) && (
          <GenericRenderer data={responses} />
        )}
      </div>
    </div>
  );
}
