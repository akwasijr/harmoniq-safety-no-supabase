import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image as PdfImage,
  StyleSheet,
} from "@react-pdf/renderer";
import type {
  ChecklistItem,
  ChecklistResponse,
  ChecklistSubmission,
  Incident,
  RiskEvaluation,
} from "@/types";

// ── Shared styles ──────────────────────────────────────────────────────────────

const colors = {
  black: "#111827",
  darkGrey: "#374151",
  grey: "#6B7280",
  lightGrey: "#D1D5DB",
  veryLightGrey: "#F3F4F6",
  white: "#FFFFFF",
  green: "#16A34A",
  red: "#DC2626",
  amber: "#D97706",
  blue: "#2563EB",
};

const s = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: colors.black,
  },

  // Header
  header: {
    marginBottom: 20,
  },
  companyName: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: colors.black,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: colors.darkGrey,
    marginBottom: 6,
  },
  headerMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 4,
  },
  metaItem: {
    fontSize: 8,
    color: colors.grey,
  },
  headerDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGrey,
    marginTop: 8,
  },

  // Section
  sectionHeader: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: colors.darkGrey,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGrey,
    paddingBottom: 4,
    marginTop: 16,
    marginBottom: 8,
  },

  // Summary row
  summaryRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 12,
  },
  summaryBox: {
    flex: 1,
    padding: 8,
    backgroundColor: colors.veryLightGrey,
    borderRadius: 4,
  },
  summaryLabel: {
    fontSize: 7,
    color: colors.grey,
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
  },

  // Table
  tableHeader: {
    flexDirection: "row",
    backgroundColor: colors.veryLightGrey,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGrey,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: colors.lightGrey,
    paddingVertical: 5,
    paddingHorizontal: 6,
    minHeight: 20,
  },
  tableRowAlt: {
    backgroundColor: "#FAFAFA",
  },
  colNum: { width: 24 },
  colQuestion: { flex: 1 },
  colResult: { width: 52, textAlign: "center" as const },
  colNotes: { width: 90 },
  colPhotos: { width: 40, textAlign: "center" as const },
  thText: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: colors.grey,
    textTransform: "uppercase" as const,
  },

  // Detail rows
  detailRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  detailLabel: {
    width: 110,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: colors.grey,
  },
  detailValue: {
    flex: 1,
    fontSize: 9,
    color: colors.black,
  },

  // Badges
  badgePass: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: colors.green,
  },
  badgeFail: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: colors.red,
  },
  badgeNA: {
    fontSize: 8,
    color: colors.grey,
  },

  // Footer
  footer: {
    position: "absolute" as const,
    bottom: 24,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 0.5,
    borderTopColor: colors.lightGrey,
    paddingTop: 6,
  },
  footerText: {
    fontSize: 7,
    color: colors.grey,
  },

  // Misc
  paragraph: {
    fontSize: 9,
    lineHeight: 1.5,
    color: colors.darkGrey,
  },
  spacer: {
    height: 8,
  },
});

// ── Shared components ──────────────────────────────────────────────────────────

function PDFHeader({
  companyName,
  title,
  meta,
}: {
  companyName: string;
  title: string;
  meta: Array<{ label: string; value: string }>;
}) {
  return (
    <View style={s.header}>
      <Text style={s.companyName}>{companyName}</Text>
      <Text style={s.headerTitle}>{title}</Text>
      <View style={s.headerMeta}>
        {meta.map((m, i) => (
          <Text key={i} style={s.metaItem}>
            {m.label}: {m.value}
          </Text>
        ))}
      </View>
      <View style={s.headerDivider} />
    </View>
  );
}

function PDFFooter({ generatedAt }: { generatedAt: string }) {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerText}>Generated: {generatedAt}</Text>
      <Text
        style={s.footerText}
        render={({ pageNumber, totalPages }) =>
          `Page ${pageNumber} of ${totalPages}`
        }
      />
    </View>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function capitalize(str: string): string {
  return str
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function resultLabel(value: ChecklistResponse["value"]): {
  text: string;
  style: Record<string, string | number>;
} {
  if (value === true || value === "pass" || value === "yes")
    return { text: "Pass", style: s.badgePass };
  if (value === false || value === "fail" || value === "no")
    return { text: "Fail", style: s.badgeFail };
  if (value === "na" || value === "n/a")
    return { text: "N/A", style: s.badgeNA };
  if (value === null || value === undefined || value === "")
    return { text: "—", style: s.badgeNA };
  return { text: String(value), style: { fontSize: 8, color: colors.darkGrey } };
}

// ── 1. Checklist PDF ───────────────────────────────────────────────────────────

export interface ChecklistPDFProps {
  companyName: string;
  templateName: string;
  submission: {
    responses: ChecklistResponse[];
    submitted_at: string | null;
    submitter_name: string;
    general_comments?: string | null;
  };
  items: ChecklistItem[];
}

export function ChecklistPDF({
  companyName,
  templateName,
  submission,
  items,
}: ChecklistPDFProps) {
  const responses = submission.responses || [];
  const passCount = responses.filter(
    (r) => r.value === true || r.value === "pass" || r.value === "yes"
  ).length;
  const failCount = responses.filter(
    (r) => r.value === false || r.value === "fail" || r.value === "no"
  ).length;
  const naCount = responses.filter(
    (r) => r.value === "na" || r.value === "n/a"
  ).length;
  const applicable = responses.length - naCount;
  const pct = applicable > 0 ? Math.round((passCount / applicable) * 100) : 100;
  const generatedAt = fmtDateTime(new Date());

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <PDFHeader
          companyName={companyName}
          title={templateName}
          meta={[
            { label: "Date", value: fmtDateTime(submission.submitted_at) },
            { label: "Submitted by", value: submission.submitter_name },
          ]}
        />

        {/* Score summary */}
        <Text style={s.sectionHeader}>Score Summary</Text>
        <View style={s.summaryRow}>
          <View style={s.summaryBox}>
            <Text style={s.summaryLabel}>Compliance</Text>
            <Text style={[s.summaryValue, { color: pct >= 80 ? colors.green : pct >= 50 ? colors.amber : colors.red }]}>
              {pct}%
            </Text>
          </View>
          <View style={s.summaryBox}>
            <Text style={s.summaryLabel}>Passed</Text>
            <Text style={[s.summaryValue, { color: colors.green }]}>{passCount}</Text>
          </View>
          <View style={s.summaryBox}>
            <Text style={s.summaryLabel}>Failed</Text>
            <Text style={[s.summaryValue, { color: failCount > 0 ? colors.red : colors.darkGrey }]}>{failCount}</Text>
          </View>
          <View style={s.summaryBox}>
            <Text style={s.summaryLabel}>Total Items</Text>
            <Text style={s.summaryValue}>{responses.length}</Text>
          </View>
        </View>

        {/* Items table */}
        <Text style={s.sectionHeader}>Checklist Items</Text>
        <View style={s.tableHeader}>
          <Text style={[s.thText, s.colNum]}>#</Text>
          <Text style={[s.thText, s.colQuestion]}>Question</Text>
          <Text style={[s.thText, s.colResult]}>Result</Text>
          <Text style={[s.thText, s.colNotes]}>Notes</Text>
          <Text style={[s.thText, s.colPhotos]}>Photos</Text>
        </View>
        {items
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((item, idx) => {
            const response = responses.find((r) => r.item_id === item.id);
            const result = response
              ? resultLabel(response.value)
              : { text: "—", style: s.badgeNA };
            const photoCount = response?.photo_urls?.length ?? 0;

            return (
              <View
                key={item.id}
                style={[s.tableRow, idx % 2 === 1 ? s.tableRowAlt : {}]}
                wrap={false}
              >
                <Text style={s.colNum}>{idx + 1}</Text>
                <Text style={s.colQuestion}>{item.question}</Text>
                <Text style={[s.colResult, result.style]}>{result.text}</Text>
                <Text style={s.colNotes}>
                  {response?.comment || "—"}
                </Text>
                <Text style={s.colPhotos}>
                  {photoCount > 0 ? `${photoCount}` : "—"}
                </Text>
              </View>
            );
          })}

        {/* General comments */}
        {submission.general_comments && (
          <>
            <Text style={s.sectionHeader}>General Comments</Text>
            <Text style={s.paragraph}>{submission.general_comments}</Text>
          </>
        )}

        <PDFFooter generatedAt={generatedAt} />
      </Page>
    </Document>
  );
}

// ── 2. Risk Assessment PDF ─────────────────────────────────────────────────────

export interface RiskAssessmentPDFProps {
  companyName: string;
  formType: string;
  evaluation: {
    responses: Record<string, unknown>;
    country: string;
    location?: string;
    submitted_at: string;
    submitter_name: string;
    status: string;
    reviewed_by?: string | null;
    reviewed_at?: string | null;
  };
}

export function RiskAssessmentPDF({
  companyName,
  formType,
  evaluation,
}: RiskAssessmentPDFProps) {
  const generatedAt = fmtDateTime(new Date());
  const responses = evaluation.responses || {};
  const entries = Object.entries(responses);

  // Count risk levels if responses contain a risk_level field
  let highCount = 0;
  let mediumCount = 0;
  let lowCount = 0;
  for (const [, val] of entries) {
    if (val && typeof val === "object" && "risk_level" in (val as Record<string, unknown>)) {
      const level = String((val as Record<string, unknown>).risk_level).toLowerCase();
      if (level === "high" || level === "critical") highCount++;
      else if (level === "medium") mediumCount++;
      else if (level === "low") lowCount++;
    }
  }
  const hasRiskSummary = highCount + mediumCount + lowCount > 0;

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <PDFHeader
          companyName={companyName}
          title={`Risk Assessment — ${formType.toUpperCase()}`}
          meta={[
            { label: "Date", value: fmtDateTime(evaluation.submitted_at) },
            { label: "Assessor", value: evaluation.submitter_name },
            { label: "Country", value: evaluation.country },
            ...(evaluation.location
              ? [{ label: "Location", value: evaluation.location }]
              : []),
            { label: "Status", value: capitalize(evaluation.status) },
          ]}
        />

        {/* Risk summary */}
        {hasRiskSummary && (
          <>
            <Text style={s.sectionHeader}>Risk Summary</Text>
            <View style={s.summaryRow}>
              <View style={s.summaryBox}>
                <Text style={s.summaryLabel}>High / Critical</Text>
                <Text style={[s.summaryValue, { color: highCount > 0 ? colors.red : colors.darkGrey }]}>{highCount}</Text>
              </View>
              <View style={s.summaryBox}>
                <Text style={s.summaryLabel}>Medium</Text>
                <Text style={[s.summaryValue, { color: mediumCount > 0 ? colors.amber : colors.darkGrey }]}>{mediumCount}</Text>
              </View>
              <View style={s.summaryBox}>
                <Text style={s.summaryLabel}>Low</Text>
                <Text style={[s.summaryValue, { color: colors.green }]}>{lowCount}</Text>
              </View>
            </View>
          </>
        )}

        {/* Reviewer info */}
        {evaluation.reviewed_by && (
          <>
            <Text style={s.sectionHeader}>Review</Text>
            <View style={s.detailRow}>
              <Text style={s.detailLabel}>Reviewed by</Text>
              <Text style={s.detailValue}>{evaluation.reviewed_by}</Text>
            </View>
            {evaluation.reviewed_at && (
              <View style={s.detailRow}>
                <Text style={s.detailLabel}>Reviewed on</Text>
                <Text style={s.detailValue}>{fmtDateTime(evaluation.reviewed_at)}</Text>
              </View>
            )}
          </>
        )}

        {/* Responses */}
        <Text style={s.sectionHeader}>Responses</Text>
        {entries.length === 0 ? (
          <Text style={s.paragraph}>No responses recorded.</Text>
        ) : (
          entries.map(([key, val], idx) => {
            const label = capitalize(key);
            let displayValue: string;
            if (val === null || val === undefined) {
              displayValue = "—";
            } else if (typeof val === "object") {
              displayValue = JSON.stringify(val, null, 2);
            } else {
              displayValue = String(val);
            }
            return (
              <View
                key={key}
                style={[s.tableRow, idx % 2 === 1 ? s.tableRowAlt : {}]}
                wrap={false}
              >
                <Text style={{ width: 140, fontSize: 8, fontFamily: "Helvetica-Bold", color: colors.grey }}>
                  {label}
                </Text>
                <Text style={{ flex: 1, fontSize: 8, color: colors.darkGrey }}>
                  {displayValue}
                </Text>
              </View>
            );
          })
        )}

        <PDFFooter generatedAt={generatedAt} />
      </Page>
    </Document>
  );
}

// ── 3. Incident Report PDF ─────────────────────────────────────────────────────

export interface IncidentReportPDFProps {
  companyName: string;
  incident: {
    title: string;
    type: string;
    severity: string;
    priority?: string;
    status: string;
    incident_date: string;
    incident_time?: string;
    location?: string;
    location_description?: string | null;
    building?: string | null;
    floor?: string | null;
    zone?: string | null;
    room?: string | null;
    description: string;
    reference_number: string;
    reporter_name: string;
    corrective_actions?: Array<{
      title: string;
      status: string;
      dueDate?: string;
    }>;
    media_urls?: string[];
    active_hazard?: boolean;
    lost_time?: boolean;
    lost_time_amount?: number | null;
    created_at?: string;
  };
}

export function IncidentReportPDF({
  companyName,
  incident,
}: IncidentReportPDFProps) {
  const generatedAt = fmtDateTime(new Date());
  const locationParts = [
    incident.building,
    incident.floor ? `Floor ${incident.floor}` : null,
    incident.zone,
    incident.room ? `Room ${incident.room}` : null,
  ].filter(Boolean);

  const severityColor =
    incident.severity === "critical" || incident.severity === "high"
      ? colors.red
      : incident.severity === "medium"
        ? colors.amber
        : colors.green;

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <PDFHeader
          companyName={companyName}
          title="Incident Report"
          meta={[
            { label: "Reference", value: incident.reference_number },
            { label: "Date", value: `${fmtDate(incident.incident_date)}${incident.incident_time ? ` at ${incident.incident_time}` : ""}` },
            { label: "Reported by", value: incident.reporter_name },
          ]}
        />

        {/* Classification */}
        <Text style={s.sectionHeader}>Classification</Text>
        <View style={s.detailRow}>
          <Text style={s.detailLabel}>Type</Text>
          <Text style={s.detailValue}>{capitalize(incident.type)}</Text>
        </View>
        <View style={s.detailRow}>
          <Text style={s.detailLabel}>Severity</Text>
          <Text style={[s.detailValue, { color: severityColor, fontFamily: "Helvetica-Bold" }]}>
            {capitalize(incident.severity)}
          </Text>
        </View>
        {incident.priority && (
          <View style={s.detailRow}>
            <Text style={s.detailLabel}>Priority</Text>
            <Text style={s.detailValue}>{capitalize(incident.priority)}</Text>
          </View>
        )}
        <View style={s.detailRow}>
          <Text style={s.detailLabel}>Status</Text>
          <Text style={s.detailValue}>{capitalize(incident.status)}</Text>
        </View>

        {/* Flags */}
        {(incident.active_hazard || incident.lost_time) && (
          <>
            <View style={s.spacer} />
            {incident.active_hazard && (
              <View style={s.detailRow}>
                <Text style={s.detailLabel}>Active Hazard</Text>
                <Text style={[s.detailValue, { color: colors.red, fontFamily: "Helvetica-Bold" }]}>Yes</Text>
              </View>
            )}
            {incident.lost_time && (
              <View style={s.detailRow}>
                <Text style={s.detailLabel}>Lost Time</Text>
                <Text style={[s.detailValue, { color: colors.amber, fontFamily: "Helvetica-Bold" }]}>
                  Yes{incident.lost_time_amount ? ` (${incident.lost_time_amount}h)` : ""}
                </Text>
              </View>
            )}
          </>
        )}

        {/* Location */}
        <Text style={s.sectionHeader}>Location</Text>
        <View style={s.detailRow}>
          <Text style={s.detailLabel}>Site / Location</Text>
          <Text style={s.detailValue}>{incident.location || "Not specified"}</Text>
        </View>
        {locationParts.length > 0 && (
          <View style={s.detailRow}>
            <Text style={s.detailLabel}>Specific Area</Text>
            <Text style={s.detailValue}>{locationParts.join(" · ")}</Text>
          </View>
        )}
        {incident.location_description && (
          <View style={s.detailRow}>
            <Text style={s.detailLabel}>Description</Text>
            <Text style={s.detailValue}>{incident.location_description}</Text>
          </View>
        )}

        {/* Incident Details */}
        <Text style={s.sectionHeader}>Description</Text>
        <Text style={s.paragraph}>
          <Text style={{ fontFamily: "Helvetica-Bold" }}>{incident.title}</Text>
          {"\n\n"}
          {incident.description || "No description provided."}
        </Text>

        {/* Photos */}
        {incident.media_urls && incident.media_urls.length > 0 && (
          <>
            <Text style={s.sectionHeader}>Photos ({incident.media_urls.length})</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {incident.media_urls.filter((url) => url.startsWith("data:image")).slice(0, 6).map((url, idx) => (
                <PdfImage key={idx} src={url} style={{ width: 150, height: 120, objectFit: "cover", borderRadius: 4 }} />
              ))}
            </View>
          </>
        )}

        {/* Corrective Actions */}
        {incident.corrective_actions && incident.corrective_actions.length > 0 && (
          <>
            <Text style={s.sectionHeader}>
              Corrective Actions ({incident.corrective_actions.length})
            </Text>
            {incident.corrective_actions.map((action, idx) => (
              <View
                key={idx}
                style={[s.tableRow, idx % 2 === 1 ? s.tableRowAlt : {}]}
                wrap={false}
              >
                <Text style={{ width: 20, fontSize: 8, color: colors.grey }}>{idx + 1}</Text>
                <Text style={{ flex: 1, fontSize: 8, color: colors.darkGrey }}>{action.title}</Text>
                <Text
                  style={{
                    width: 60,
                    fontSize: 8,
                    textAlign: "center" as const,
                    color: action.status === "completed" ? colors.green : colors.amber,
                    fontFamily: "Helvetica-Bold",
                  }}
                >
                  {capitalize(action.status)}
                </Text>
                <Text style={{ width: 60, fontSize: 7, color: colors.grey, textAlign: "right" as const }}>
                  {action.dueDate ? fmtDate(action.dueDate) : "—"}
                </Text>
              </View>
            ))}
          </>
        )}

        <PDFFooter generatedAt={generatedAt} />
      </Page>
    </Document>
  );
}

// ── Work Order PDF ─────────────────────────────────────────────────────────────

export interface WorkOrderPDFProps {
  companyName: string;
  workOrder: {
    reference: string;
    title: string;
    description: string;
    type: string;
    priority: string;
    status: string;
    asset?: string;
    location?: string;
    assigned_to?: string;
    assigned_team?: string;
    due_date?: string | null;
    estimated_hours?: number | null;
    actual_hours?: number | null;
    parts_cost?: number | null;
    labor_cost?: number | null;
    declined_reason?: string | null;
    completed_at?: string | null;
    created_at: string;
    procedure_name?: string;
    procedure_steps?: number;
  };
}

export function WorkOrderPDF({ companyName, workOrder }: WorkOrderPDFProps) {
  const generatedAt = fmtDateTime(new Date());
  const totalCost = (workOrder.parts_cost || 0) + (workOrder.labor_cost || 0);
  const fields: Array<{ label: string; value: string }> = [
    { label: 'Reference', value: workOrder.reference },
    { label: 'Type', value: workOrder.type.replace(/_/g, ' ') },
    { label: 'Priority', value: workOrder.priority },
    { label: 'Status', value: workOrder.status.replace(/_/g, ' ') },
    { label: 'Asset', value: workOrder.asset || '—' },
    { label: 'Location', value: workOrder.location || '—' },
    { label: 'Assigned to', value: workOrder.assigned_to || 'Unassigned' },
    { label: 'Team', value: workOrder.assigned_team || '—' },
    { label: 'Due date', value: workOrder.due_date || '—' },
    { label: 'Estimated hours', value: workOrder.estimated_hours != null ? workOrder.estimated_hours + 'h' : '—' },
    { label: 'Actual hours', value: workOrder.actual_hours != null ? workOrder.actual_hours + 'h' : '—' },
  ];
  if (totalCost > 0) fields.push({ label: 'Total cost', value: '$' + totalCost.toFixed(2) });
  if (workOrder.procedure_name) fields.push({ label: 'Procedure', value: workOrder.procedure_name + ' (' + (workOrder.procedure_steps || 0) + ' steps)' });
  if (workOrder.declined_reason) fields.push({ label: 'Declined', value: workOrder.declined_reason });
  if (workOrder.completed_at) fields.push({ label: 'Completed', value: fmtDateTime(new Date(workOrder.completed_at)) });
  fields.push({ label: 'Created', value: fmtDateTime(new Date(workOrder.created_at)) });

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.companyName}>{companyName}</Text>
          <Text style={s.headerTitle}>Work Order Report</Text>
          <View style={s.headerMeta}>
            <Text style={s.metaItem}>{workOrder.reference}</Text>
            <Text style={s.metaItem}>Generated {generatedAt}</Text>
          </View>
          <View style={s.headerDivider} />
        </View>

        <Text style={s.sectionHeader}>Details</Text>
        <View style={s.summaryRow}>
          {fields.slice(0, 4).map((f) => (
            <View key={f.label} style={s.summaryBox}>
              <Text style={s.summaryLabel}>{f.label}</Text>
              <Text style={s.summaryValue}>{f.value}</Text>
            </View>
          ))}
        </View>

        {workOrder.description && (
          <>
            <Text style={s.sectionHeader}>Description</Text>
            <Text style={{ fontSize: 9, color: colors.darkGrey, lineHeight: 1.5 }}>{workOrder.description}</Text>
          </>
        )}

        <Text style={s.sectionHeader}>Assignment & Work Log</Text>
        {fields.slice(4).map((f) => (
          <View key={f.label} style={{ flexDirection: "row", marginBottom: 4 }}>
            <Text style={{ fontSize: 8, color: colors.grey, width: 100 }}>{f.label}</Text>
            <Text style={{ fontSize: 9, color: colors.black }}>{f.value}</Text>
          </View>
        ))}
      </Page>
    </Document>
  );
}


// ── Download helper ────────────────────────────────────────────────────────────

export async function downloadPDF(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  documentElement: React.ReactElement<any>,
  filename: string
) {
  const { pdf } = await import("@react-pdf/renderer");
  const blob = await pdf(documentElement).toBlob();
  const url = URL.createObjectURL(blob);
  const a = window.document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
