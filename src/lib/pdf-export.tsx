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

  // ── Professional document styles ──────────────────────────────────────────

  proHeaderContainer: {
    marginBottom: 20,
  },
  proCompanyName: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: "#1E40AF",
    marginBottom: 2,
  },
  proDocTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#1F2937",
    letterSpacing: 1,
    marginBottom: 6,
  },
  accentBar: {
    height: 2,
    backgroundColor: "#1E40AF",
    marginBottom: 12,
  },
  metaGrid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
  },
  metaGridCell: {
    width: "50%" as unknown as number,
    paddingVertical: 3,
    paddingRight: 8,
    flexDirection: "row" as const,
  },
  metaGridLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#6B7280",
    width: 80,
  },
  metaGridValue: {
    fontSize: 9,
    color: "#111827",
    flex: 1,
  },

  proSummaryRow: {
    flexDirection: "row" as const,
    gap: 10,
    marginBottom: 16,
  },
  proSummaryCard: {
    flex: 1,
    padding: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 4,
    backgroundColor: "#F9FAFB",
  },
  proSummaryLabel: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#6B7280",
    textTransform: "uppercase" as const,
    marginBottom: 4,
  },
  proSummaryValue: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
  },

  proTableHeader: {
    flexDirection: "row" as const,
    backgroundColor: "#1F2937",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  proThText: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#FFFFFF",
    textTransform: "uppercase" as const,
  },
  proTableRow: {
    flexDirection: "row" as const,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E7EB",
    minHeight: 22,
  },
  proTableRowAlt: {
    backgroundColor: "#F9FAFB",
  },

  proSectionHeader: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#1E40AF",
    marginTop: 18,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },

  signatureSection: {
    marginTop: 32,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingTop: 16,
  },
  signatureRow: {
    flexDirection: "row" as const,
    gap: 40,
  },
  signatureCol: {
    flex: 1,
  },
  signatureTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#1F2937",
    marginBottom: 8,
  },
  signatureName: {
    fontSize: 9,
    color: "#374151",
    marginBottom: 16,
  },
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: "#374151",
    marginBottom: 4,
    height: 20,
  },
  signatureLabel: {
    fontSize: 7,
    color: "#6B7280",
    marginBottom: 12,
  },

  proFooter: {
    position: "absolute" as const,
    bottom: 24,
    left: 40,
    right: 40,
    borderTopWidth: 0.5,
    borderTopColor: "#D1D5DB",
    paddingTop: 6,
  },
  proFooterRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    marginBottom: 4,
  },
  proFooterText: {
    fontSize: 7,
    color: "#6B7280",
  },
  confidentialText: {
    fontSize: 6,
    color: "#9CA3AF",
    textAlign: "center" as const,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 2,
  },

  hazardCard: {
    marginBottom: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 4,
    backgroundColor: "#FAFAFA",
  },
  hazardCardHeader: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: 6,
  },
  hazardStepName: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#1F2937",
    flex: 1,
  },
  hazardDetail: {
    fontSize: 8,
    color: "#6B7280",
    marginBottom: 3,
  },
  hazardControls: {
    fontSize: 9,
    color: "#374151",
    marginTop: 4,
    lineHeight: 1.4,
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
  const submittedDate = submission.submitted_at
    ? new Date(submission.submitted_at)
    : new Date();
  const refNumber = `SCR-${submittedDate.toISOString().slice(0, 10).replace(/-/g, "")}`;

  return (
    <Document>
      <Page size="A4" style={[s.page, { paddingBottom: 64 }]}>
        {/* Professional Header */}
        <View style={s.proHeaderContainer}>
          <Text style={s.proCompanyName}>{companyName}</Text>
          <Text style={s.proDocTitle}>SAFETY CHECKLIST REPORT</Text>
          <View style={s.accentBar} />
          <View style={s.metaGrid}>
            <View style={s.metaGridCell}>
              <Text style={s.metaGridLabel}>Reference:</Text>
              <Text style={s.metaGridValue}>{refNumber}</Text>
            </View>
            <View style={s.metaGridCell}>
              <Text style={s.metaGridLabel}>Date:</Text>
              <Text style={s.metaGridValue}>{fmtDateTime(submission.submitted_at)}</Text>
            </View>
            <View style={s.metaGridCell}>
              <Text style={s.metaGridLabel}>Submitted by:</Text>
              <Text style={s.metaGridValue}>{submission.submitter_name}</Text>
            </View>
            <View style={s.metaGridCell}>
              <Text style={s.metaGridLabel}>Template:</Text>
              <Text style={s.metaGridValue}>{templateName}</Text>
            </View>
          </View>
        </View>

        {/* Score Summary */}
        <Text style={s.proSectionHeader}>Score Summary</Text>
        <View style={s.proSummaryRow}>
          <View style={s.proSummaryCard}>
            <Text style={s.proSummaryLabel}>Compliance</Text>
            <Text
              style={[
                s.proSummaryValue,
                { color: pct >= 80 ? colors.green : pct >= 50 ? colors.amber : colors.red },
              ]}
            >
              {pct}%
            </Text>
          </View>
          <View style={s.proSummaryCard}>
            <Text style={s.proSummaryLabel}>Passed</Text>
            <Text style={[s.proSummaryValue, { color: colors.green }]}>{passCount}</Text>
          </View>
          <View style={s.proSummaryCard}>
            <Text style={s.proSummaryLabel}>Failed</Text>
            <Text
              style={[
                s.proSummaryValue,
                { color: failCount > 0 ? colors.red : colors.darkGrey },
              ]}
            >
              {failCount}
            </Text>
          </View>
          <View style={s.proSummaryCard}>
            <Text style={s.proSummaryLabel}>Total Items</Text>
            <Text style={s.proSummaryValue}>{responses.length}</Text>
          </View>
        </View>

        {/* Items Table */}
        <Text style={s.proSectionHeader}>Checklist Items</Text>
        <View style={s.proTableHeader}>
          <Text style={[s.proThText, { width: 28 }]}>#</Text>
          <Text style={[s.proThText, { flex: 1 }]}>Question / Item</Text>
          <Text style={[s.proThText, { width: 52, textAlign: "center" as const }]}>Result</Text>
          <Text style={[s.proThText, { width: 100 }]}>Notes</Text>
        </View>
        {items
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((item, idx) => {
            const response = responses.find((r) => r.item_id === item.id);
            const result = response
              ? resultLabel(response.value)
              : { text: "—", style: s.badgeNA };

            return (
              <View
                key={item.id}
                style={[s.proTableRow, idx % 2 === 1 ? s.proTableRowAlt : {}]}
                wrap={false}
              >
                <Text style={{ width: 28, fontSize: 8, color: colors.grey }}>{idx + 1}</Text>
                <Text style={{ flex: 1, fontSize: 9, color: colors.black }}>{item.question}</Text>
                <Text
                  style={[
                    { width: 52, textAlign: "center" as const, fontSize: 8, fontFamily: "Helvetica-Bold" },
                    result.style,
                  ]}
                >
                  {result.text}
                </Text>
                <Text style={{ width: 100, fontSize: 8, color: colors.darkGrey }}>
                  {response?.comment || "—"}
                </Text>
              </View>
            );
          })}

        {/* General Comments */}
        {submission.general_comments && (
          <>
            <Text style={s.proSectionHeader}>General Comments</Text>
            <Text style={s.paragraph}>{submission.general_comments}</Text>
          </>
        )}

        {/* Signature Block */}
        <View style={s.signatureSection} wrap={false}>
          <View style={s.signatureRow}>
            <View style={s.signatureCol}>
              <Text style={s.signatureTitle}>Completed by</Text>
              <Text style={s.signatureName}>{submission.submitter_name}</Text>
              <View style={s.signatureLine} />
              <Text style={s.signatureLabel}>Signature</Text>
              <View style={s.signatureLine} />
              <Text style={s.signatureLabel}>Date</Text>
            </View>
            <View style={s.signatureCol}>
              <Text style={s.signatureTitle}>Reviewed by</Text>
              <Text style={s.signatureName}>{" "}</Text>
              <View style={s.signatureLine} />
              <Text style={s.signatureLabel}>Signature</Text>
              <View style={s.signatureLine} />
              <Text style={s.signatureLabel}>Date</Text>
            </View>
          </View>
        </View>

        {/* Professional Footer */}
        <View style={s.proFooter} fixed>
          <View style={s.proFooterRow}>
            <Text style={s.proFooterText}>Generated: {generatedAt}</Text>
            <Text
              style={s.proFooterText}
              render={({ pageNumber, totalPages }) =>
                `Page ${pageNumber} of ${totalPages}`
              }
            />
          </View>
          <Text style={s.confidentialText}>CONFIDENTIAL</Text>
        </View>
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

// ── Risk Assessment Responses PDF ────────────────────────────────────────────

export interface RiskAssessmentResponsesPDFProps {
  companyName: string;
  templateName: string;
  formType: string;
  submittedBy: string;
  location: string;
  date: string;
  responses: Array<{ key: string; label: string; value: string; isYes: boolean; isNo: boolean }>;
  hazards: Array<{ step: string; hazard: string; severity: number; probability: number; riskScore: number; controls: string }>;
}

export function RiskAssessmentResponsesPDF({
  companyName,
  templateName,
  formType,
  submittedBy,
  location,
  date,
  responses,
  hazards,
}: RiskAssessmentResponsesPDFProps) {
  const generatedAt = fmtDateTime(new Date());
  const refDate = (() => {
    try {
      const d = new Date(date);
      return isNaN(d.getTime())
        ? new Date().toISOString().slice(0, 10).replace(/-/g, "")
        : d.toISOString().slice(0, 10).replace(/-/g, "");
    } catch {
      return new Date().toISOString().slice(0, 10).replace(/-/g, "");
    }
  })();
  const refNumber = `RAR-${refDate}`;

  const getRiskColor = (score: number): string => {
    if (score >= 16) return "#DC2626";
    if (score >= 10) return "#EA580C";
    if (score >= 5) return "#D97706";
    return "#16A34A";
  };

  const getRiskBgColor = (score: number): string => {
    if (score >= 16) return "#FEE2E2";
    if (score >= 10) return "#FFEDD5";
    if (score >= 5) return "#FEF3C7";
    return "#DCFCE7";
  };

  const getRiskLevel = (score: number): string => {
    if (score >= 16) return "Critical";
    if (score >= 10) return "High";
    if (score >= 5) return "Medium";
    return "Low";
  };

  return (
    <Document>
      <Page size="A4" style={[s.page, { paddingBottom: 64 }]}>
        {/* Professional Header */}
        <View style={s.proHeaderContainer}>
          <Text style={s.proCompanyName}>{companyName}</Text>
          <Text style={s.proDocTitle}>RISK ASSESSMENT REPORT</Text>
          <View style={s.accentBar} />
          <View style={s.metaGrid}>
            <View style={s.metaGridCell}>
              <Text style={s.metaGridLabel}>Reference:</Text>
              <Text style={s.metaGridValue}>{refNumber}</Text>
            </View>
            <View style={s.metaGridCell}>
              <Text style={s.metaGridLabel}>Date:</Text>
              <Text style={s.metaGridValue}>{date}</Text>
            </View>
            <View style={s.metaGridCell}>
              <Text style={s.metaGridLabel}>Assessor:</Text>
              <Text style={s.metaGridValue}>{submittedBy}</Text>
            </View>
            <View style={s.metaGridCell}>
              <Text style={s.metaGridLabel}>Location:</Text>
              <Text style={s.metaGridValue}>{location}</Text>
            </View>
            <View style={s.metaGridCell}>
              <Text style={s.metaGridLabel}>Assessment:</Text>
              <Text style={s.metaGridValue}>{templateName}</Text>
            </View>
            <View style={s.metaGridCell}>
              <Text style={s.metaGridLabel}>Type:</Text>
              <Text style={s.metaGridValue}>{formType}</Text>
            </View>
          </View>
        </View>

        {/* Responses Table */}
        {responses.length > 0 && (
          <>
            <Text style={s.proSectionHeader}>Assessment Responses</Text>
            <View style={s.proTableHeader}>
              <Text style={[s.proThText, { width: 28 }]}>#</Text>
              <Text style={[s.proThText, { flex: 1 }]}>Question / Item</Text>
              <Text style={[s.proThText, { width: 60, textAlign: "center" as const }]}>
                Response
              </Text>
            </View>
            {responses.map((r, idx) => (
              <View
                key={idx}
                style={[s.proTableRow, idx % 2 === 1 ? s.proTableRowAlt : {}]}
                wrap={false}
              >
                <Text style={{ width: 28, fontSize: 8, color: colors.grey }}>{idx + 1}</Text>
                <Text style={{ flex: 1, fontSize: 9, color: colors.black }}>{r.label}</Text>
                <Text
                  style={{
                    width: 60,
                    textAlign: "center" as const,
                    fontSize: 8,
                    fontFamily: "Helvetica-Bold",
                    color: r.isYes ? colors.green : r.isNo ? colors.red : colors.darkGrey,
                  }}
                >
                  {r.value}
                </Text>
              </View>
            ))}
          </>
        )}

        {/* Hazards & Controls */}
        {hazards.length > 0 && (
          <>
            <Text style={s.proSectionHeader}>Hazards &amp; Controls</Text>
            {hazards.map((h, idx) => (
              <View key={idx} style={s.hazardCard} wrap={false}>
                <View style={s.hazardCardHeader}>
                  <Text style={s.hazardStepName}>{h.step}</Text>
                  <View
                    style={{
                      paddingVertical: 2,
                      paddingHorizontal: 8,
                      borderRadius: 10,
                      backgroundColor: getRiskBgColor(h.riskScore),
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 8,
                        fontFamily: "Helvetica-Bold",
                        color: getRiskColor(h.riskScore),
                      }}
                    >
                      {getRiskLevel(h.riskScore)} ({h.riskScore})
                    </Text>
                  </View>
                </View>
                {h.hazard && (
                  <Text style={s.hazardDetail}>
                    <Text style={{ fontFamily: "Helvetica-Bold" }}>Hazard: </Text>
                    {h.hazard}
                  </Text>
                )}
                <View style={{ flexDirection: "row" as const, gap: 16, marginBottom: 4 }}>
                  <Text style={s.hazardDetail}>
                    <Text style={{ fontFamily: "Helvetica-Bold" }}>Severity: </Text>
                    {h.severity}/5
                  </Text>
                  <Text style={s.hazardDetail}>
                    <Text style={{ fontFamily: "Helvetica-Bold" }}>Likelihood: </Text>
                    {h.probability}/5
                  </Text>
                </View>
                <Text style={s.hazardControls}>
                  <Text style={{ fontFamily: "Helvetica-Bold", color: colors.grey, fontSize: 8 }}>
                    Control Measures:{" "}
                  </Text>
                  {h.controls || "None specified"}
                </Text>
              </View>
            ))}
          </>
        )}

        {/* Signature Block */}
        <View style={s.signatureSection} wrap={false}>
          <View style={s.signatureRow}>
            <View style={s.signatureCol}>
              <Text style={s.signatureTitle}>Completed by</Text>
              <Text style={s.signatureName}>{submittedBy}</Text>
              <View style={s.signatureLine} />
              <Text style={s.signatureLabel}>Signature</Text>
              <View style={s.signatureLine} />
              <Text style={s.signatureLabel}>Date</Text>
            </View>
            <View style={s.signatureCol}>
              <Text style={s.signatureTitle}>Reviewed by</Text>
              <Text style={s.signatureName}>{" "}</Text>
              <View style={s.signatureLine} />
              <Text style={s.signatureLabel}>Signature</Text>
              <View style={s.signatureLine} />
              <Text style={s.signatureLabel}>Date</Text>
            </View>
          </View>
        </View>

        {/* Professional Footer */}
        <View style={s.proFooter} fixed>
          <View style={s.proFooterRow}>
            <Text style={s.proFooterText}>Generated: {generatedAt}</Text>
            <Text
              style={s.proFooterText}
              render={({ pageNumber, totalPages }) =>
                `Page ${pageNumber} of ${totalPages}`
              }
            />
          </View>
          <Text style={s.confidentialText}>CONFIDENTIAL</Text>
        </View>
      </Page>
    </Document>
  );
}

// ── 6. Analytics Report PDF ─────────────────────────────────────────────────────

export interface AnalyticsReportPDFProps {
  companyName: string;
  dateRange: string;
  kpis: {
    ltir: string;
    trir: string;
    severityRate: string;
    avgResolutionHours: number;
    complianceRate: number;
    totalIncidents: number;
    lostTimeIncidents: number;
    totalLostDays: number;
    totalHoursWorked: number;
    rateLabel: string;
  };
  incidents: Array<{
    reference: string;
    title: string;
    type: string;
    severity: string;
    status: string;
    date: string;
    lostTime: boolean;
    lostHours: number;
    location: string;
  }>;
  incidentsByType: Array<{ name: string; value: number }>;
}

export function AnalyticsReportPDF({
  companyName,
  dateRange,
  kpis,
  incidents,
  incidentsByType,
}: AnalyticsReportPDFProps) {
  const generatedAt = fmtDateTime(new Date());
  const periodLabel = dateRange.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <Text style={{ fontSize: 18, fontFamily: "Helvetica-Bold", color: "#1E40AF" }}>{companyName}</Text>
          <Text style={{ fontSize: 13, fontFamily: "Helvetica-Bold", color: "#374151", marginTop: 2, letterSpacing: 0.5 }}>
            SAFETY ANALYTICS REPORT
          </Text>
          <View style={{ height: 2, backgroundColor: "#1E40AF", marginTop: 6, marginBottom: 6 }} />
          <View style={s.headerMeta}>
            <Text style={s.metaItem}>Period: {periodLabel}</Text>
            <Text style={s.metaItem}>Generated: {generatedAt}</Text>
            <Text style={s.metaItem}>Total Hours Worked: {kpis.totalHoursWorked.toLocaleString()}</Text>
          </View>
        </View>

        {/* KPI Summary */}
        <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold", color: "#1F2937", marginBottom: 8 }}>Key Safety Metrics</Text>
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
          {[
            { label: "LTIR / LTIFR", value: kpis.ltir, sub: kpis.rateLabel },
            { label: "TRIR", value: kpis.trir, sub: kpis.rateLabel },
            { label: "Severity Rate", value: kpis.severityRate, sub: `${kpis.totalLostDays} lost days` },
            { label: "Compliance", value: `${kpis.complianceRate}%`, sub: "resolved / total" },
            { label: "Avg Resolution", value: kpis.avgResolutionHours ? `${kpis.avgResolutionHours}h` : "—", sub: "hours" },
          ].map((kpi, idx) => (
            <View key={idx} style={{ flex: 1, padding: 8, borderWidth: 0.5, borderColor: "#D1D5DB", borderRadius: 4, backgroundColor: "#F9FAFB" }}>
              <Text style={{ fontSize: 7, color: "#6B7280", marginBottom: 2 }}>{kpi.label}</Text>
              <Text style={{ fontSize: 16, fontFamily: "Helvetica-Bold", color: "#111827" }}>{kpi.value}</Text>
              <Text style={{ fontSize: 6, color: "#9CA3AF" }}>{kpi.sub}</Text>
            </View>
          ))}
        </View>

        {/* Incident Summary */}
        <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold", color: "#1F2937", marginBottom: 6 }}>Incident Summary</Text>
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
          <View style={{ flex: 1, padding: 8, backgroundColor: "#F9FAFB", borderRadius: 4 }}>
            <Text style={{ fontSize: 7, color: "#6B7280" }}>Total Incidents</Text>
            <Text style={{ fontSize: 18, fontFamily: "Helvetica-Bold" }}>{kpis.totalIncidents}</Text>
          </View>
          <View style={{ flex: 1, padding: 8, backgroundColor: "#FEF2F2", borderRadius: 4 }}>
            <Text style={{ fontSize: 7, color: "#6B7280" }}>Lost Time Incidents</Text>
            <Text style={{ fontSize: 18, fontFamily: "Helvetica-Bold", color: "#DC2626" }}>{kpis.lostTimeIncidents}</Text>
          </View>
          <View style={{ flex: 1, padding: 8, backgroundColor: "#F0FDF4", borderRadius: 4 }}>
            <Text style={{ fontSize: 7, color: "#6B7280" }}>Non-Lost-Time</Text>
            <Text style={{ fontSize: 18, fontFamily: "Helvetica-Bold", color: "#16A34A" }}>{kpis.totalIncidents - kpis.lostTimeIncidents}</Text>
          </View>
        </View>

        {/* Incidents by Type */}
        {incidentsByType.length > 0 && (
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold", color: "#1F2937", marginBottom: 6 }}>Incidents by Type</Text>
            {incidentsByType.map((item, idx) => (
              <View key={idx} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, paddingHorizontal: 6, backgroundColor: idx % 2 === 0 ? "#F9FAFB" : "#FFFFFF", borderBottomWidth: 0.5, borderBottomColor: "#E5E7EB" }}>
                <Text style={{ fontSize: 9 }}>{item.name}</Text>
                <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold" }}>{item.value}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Incident Details Table */}
        <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold", color: "#1F2937", marginBottom: 6 }}>Incident Register</Text>
        <View style={{ backgroundColor: "#1F2937", flexDirection: "row", paddingVertical: 5, paddingHorizontal: 6, borderRadius: 2 }}>
          <Text style={{ width: 55, fontSize: 7, fontFamily: "Helvetica-Bold", color: "#FFFFFF" }}>REF</Text>
          <Text style={{ flex: 1, fontSize: 7, fontFamily: "Helvetica-Bold", color: "#FFFFFF" }}>TITLE</Text>
          <Text style={{ width: 55, fontSize: 7, fontFamily: "Helvetica-Bold", color: "#FFFFFF" }}>TYPE</Text>
          <Text style={{ width: 45, fontSize: 7, fontFamily: "Helvetica-Bold", color: "#FFFFFF" }}>SEVERITY</Text>
          <Text style={{ width: 45, fontSize: 7, fontFamily: "Helvetica-Bold", color: "#FFFFFF" }}>STATUS</Text>
          <Text style={{ width: 30, fontSize: 7, fontFamily: "Helvetica-Bold", color: "#FFFFFF", textAlign: "center" }}>LTI</Text>
          <Text style={{ width: 55, fontSize: 7, fontFamily: "Helvetica-Bold", color: "#FFFFFF" }}>DATE</Text>
        </View>
        {incidents.slice(0, 50).map((inc, idx) => (
          <View key={idx} style={{ flexDirection: "row", paddingVertical: 4, paddingHorizontal: 6, backgroundColor: idx % 2 === 0 ? "#F9FAFB" : "#FFFFFF", borderBottomWidth: 0.5, borderBottomColor: "#E5E7EB" }} wrap={false}>
            <Text style={{ width: 55, fontSize: 8 }}>{inc.reference}</Text>
            <Text style={{ flex: 1, fontSize: 8 }}>{inc.title}</Text>
            <Text style={{ width: 55, fontSize: 8 }}>{capitalize(inc.type)}</Text>
            <Text style={{ width: 45, fontSize: 8, color: inc.severity === "critical" || inc.severity === "high" ? "#DC2626" : inc.severity === "medium" ? "#D97706" : "#6B7280" }}>{capitalize(inc.severity)}</Text>
            <Text style={{ width: 45, fontSize: 8 }}>{capitalize(inc.status)}</Text>
            <Text style={{ width: 30, fontSize: 8, textAlign: "center", fontFamily: "Helvetica-Bold", color: inc.lostTime ? "#DC2626" : "#16A34A" }}>{inc.lostTime ? "Yes" : "No"}</Text>
            <Text style={{ width: 55, fontSize: 8 }}>{fmtDate(inc.date)}</Text>
          </View>
        ))}
        {incidents.length > 50 && (
          <Text style={{ fontSize: 8, color: "#6B7280", marginTop: 4, textAlign: "center" }}>
            Showing 50 of {incidents.length} incidents
          </Text>
        )}

        {/* Signature Block */}
        <View style={{ marginTop: 30, flexDirection: "row", gap: 40 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: "#374151", marginBottom: 4 }}>Prepared by</Text>
            <View style={{ borderBottomWidth: 0.5, borderBottomColor: "#9CA3AF", marginBottom: 4, height: 20 }} />
            <Text style={{ fontSize: 7, color: "#6B7280" }}>Name & Signature</Text>
            <View style={{ borderBottomWidth: 0.5, borderBottomColor: "#9CA3AF", marginTop: 8, marginBottom: 4, height: 14 }} />
            <Text style={{ fontSize: 7, color: "#6B7280" }}>Date</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: "#374151", marginBottom: 4 }}>Reviewed by</Text>
            <View style={{ borderBottomWidth: 0.5, borderBottomColor: "#9CA3AF", marginBottom: 4, height: 20 }} />
            <Text style={{ fontSize: 7, color: "#6B7280" }}>Name & Signature</Text>
            <View style={{ borderBottomWidth: 0.5, borderBottomColor: "#9CA3AF", marginTop: 8, marginBottom: 4, height: 14 }} />
            <Text style={{ fontSize: 7, color: "#6B7280" }}>Date</Text>
          </View>
        </View>

        <PDFFooter generatedAt={generatedAt} />
      </Page>
    </Document>
  );
}

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
