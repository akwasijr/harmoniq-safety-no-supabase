"use client";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import { sharedStyles, getRiskLevel, getRiskColor } from "./shared-styles";

const styles = StyleSheet.create({
  ...sharedStyles,
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  logoContainer: {
    width: 80,
    height: 40,
  },
  logoImage: {
    maxWidth: 80,
    maxHeight: 40,
    objectFit: "contain",
  },
  headerText: {
    flex: 1,
    textAlign: "center",
  },
  companyName: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 2,
  },
  formNumber: {
    fontSize: 8,
    color: "#999999",
  },
  regulationBadge: {
    fontSize: 8,
    backgroundColor: "#dbeafe",
    color: "#1e40af",
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 4,
    alignSelf: "center",
    marginTop: 4,
  },
  ratingBar: {
    flexDirection: "row",
    marginTop: 4,
  },
  ratingBlock: {
    width: 30,
    height: 20,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 2,
  },
  ratingBlockFilled: {
    backgroundColor: "#1a1a1a",
  },
  ratingText: {
    fontSize: 8,
    color: "#ffffff",
  },
  factorCard: {
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 4,
    marginBottom: 8,
    padding: 10,
  },
  factorHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  factorTitle: {
    fontWeight: "bold",
    fontSize: 10,
  },
  factorRating: {
    flexDirection: "row",
    alignItems: "center",
  },
  questionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
  },
});

interface OrganizationalFactor {
  factor: string;
  rating: number; // 1-5
  notes?: string;
}

interface SocialFactor {
  factor: string;
  value: boolean | number;
  notes?: string;
}

interface Risk {
  description: string;
  severity: number;
  probability: number;
  riskScore: number;
  level: "low" | "medium" | "high";
}

interface Action {
  action: string;
  responsible: string;
  deadline: string;
  followUp: string;
}

interface SAMData {
  // Company Information
  companyName: string;
  companyLogo?: string;
  workplace: string;
  department: string;
  assessmentDate: string;
  assessorName: string;
  
  // Organizational Factors (AFS 2015:4)
  organizationalFactors: OrganizationalFactor[];
  
  // Social Factors
  socialFactors: SocialFactor[];
  
  // Identified Risks
  risks: Risk[];
  
  // Action Plan
  actions: Action[];
  
  // Approval
  approvedBy?: string;
  approvalDate?: string;
  nextReviewDate?: string;
}

function RatingDisplay({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <View style={styles.ratingBar}>
      {Array.from({ length: max }, (_, i) => (
        <View 
          key={i} 
          style={[
            styles.ratingBlock,
            i < rating ? styles.ratingBlockFilled : {}
          ]}
        >
          <Text style={[
            { fontSize: 8 },
            i < rating ? { color: "#ffffff" } : { color: "#999999" }
          ]}>
            {i + 1}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function SAMPdfDocument({ data }: { data: SAMData }) {
  const today = new Date().toLocaleDateString();

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header with Logo */}
        <View style={styles.header}>
          <View style={styles.headerContainer}>
            {data.companyLogo ? (
              <View style={styles.logoContainer}>
                <Image src={data.companyLogo} style={styles.logoImage} />
              </View>
            ) : (
              <View style={styles.logoContainer} />
            )}
            <View style={styles.headerText}>
              <Text style={styles.companyName}>{data.companyName}</Text>
              <Text style={styles.title}>Systematiskt Arbetsmiljöarbete (SAM)</Text>
              <Text style={styles.subtitle}>
                Systematic Work Environment Management • AFS 2023:1 Compliant
              </Text>
              <Text style={styles.regulationBadge}>Arbetsmiljöverket</Text>
            </View>
            <View style={styles.logoContainer}>
              <Text style={styles.formNumber}>SAM Formulär</Text>
            </View>
          </View>
        </View>

        {/* Workplace Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Arbetsplats Information (Workplace Info)</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Företag:</Text>
            <Text style={styles.value}>{data.companyName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Arbetsplats:</Text>
            <Text style={styles.value}>{data.workplace}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Avdelning:</Text>
            <Text style={styles.value}>{data.department}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Datum:</Text>
            <Text style={styles.value}>{data.assessmentDate}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Utförare:</Text>
            <Text style={styles.value}>{data.assessorName}</Text>
          </View>
        </View>

        {/* Organizational Work Environment (AFS 2015:4) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Organisatorisk Arbetsmiljö (AFS 2015:4)</Text>
          {data.organizationalFactors.map((factor, index) => (
            <View key={index} style={styles.factorCard}>
              <View style={styles.factorHeader}>
                <Text style={styles.factorTitle}>{factor.factor}</Text>
                <View style={styles.factorRating}>
                  <RatingDisplay rating={factor.rating} />
                </View>
              </View>
              {factor.notes && (
                <Text style={{ fontSize: 9, color: "#666666" }}>{factor.notes}</Text>
              )}
            </View>
          ))}
        </View>

        {/* Social Work Environment */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Social Arbetsmiljö</Text>
          {data.socialFactors.map((factor, index) => (
            <View key={index} style={styles.questionRow}>
              <Text style={{ flex: 3, fontSize: 10 }}>{factor.factor}</Text>
              <Text style={{ width: 60, textAlign: "center", fontSize: 10 }}>
                {typeof factor.value === "boolean" 
                  ? (factor.value ? "Ja" : "Nej")
                  : `${factor.value}/5`
                }
              </Text>
            </View>
          ))}
        </View>

        {/* Risk Assessment */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Riskbedömning (Risk Assessment)</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCell, { flex: 3 }]}>Identifierade risker</Text>
              <Text style={styles.tableCellSmall}>S</Text>
              <Text style={styles.tableCellSmall}>P</Text>
              <Text style={styles.tableCellSmall}>Risk</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>Nivå</Text>
            </View>
            {data.risks.map((risk, index) => (
              <View 
                key={index} 
                style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}
              >
                <Text style={[styles.tableCell, { flex: 3 }]}>{risk.description}</Text>
                <Text style={styles.tableCellSmall}>{risk.severity}</Text>
                <Text style={styles.tableCellSmall}>{risk.probability}</Text>
                <Text style={styles.tableCellSmall}>{risk.riskScore}</Text>
                <View style={[styles.tableCell, { flex: 1 }]}>
                  <Text style={[
                    styles.riskBadge,
                    { backgroundColor: getRiskColor(risk.level) }
                  ]}>
                    {risk.level === "low" ? "Låg" : risk.level === "medium" ? "Medel" : "Hög"}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Action Plan */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Åtgärdsplan (Action Plan)</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCell, { flex: 3 }]}>Planerade åtgärder</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>Ansvarig</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>Deadline</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>Uppföljning</Text>
            </View>
            {data.actions.map((action, index) => (
              <View 
                key={index} 
                style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}
              >
                <Text style={[styles.tableCell, { flex: 3 }]}>{action.action}</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>{action.responsible}</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>{action.deadline}</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>{action.followUp}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Signatures */}
        <View style={styles.signatureSection}>
          <Text style={[styles.sectionTitle, { backgroundColor: "transparent", padding: 0 }]}>
            Godkännande (Approval)
          </Text>
          <View style={styles.signatureRow}>
            <View style={styles.signatureBlock}>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureLabel}>Utförare: {data.assessorName}</Text>
              <Text style={styles.signatureLabel}>Datum: {data.assessmentDate}</Text>
            </View>
            <View style={styles.signatureBlock}>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureLabel}>Godkänd av: {data.approvedBy || "________________"}</Text>
              <Text style={styles.signatureLabel}>Datum: {data.approvalDate || "________________"}</Text>
            </View>
          </View>
          <View style={{ marginTop: 16 }}>
            <Text style={styles.signatureLabel}>
              Nästa granskning: {data.nextReviewDate || "________________"}
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Genererad: {today}</Text>
          <Text>Harmoniq Safety • SAM Assessment</Text>
          <Text>Sida 1 av 1</Text>
        </View>
      </Page>
    </Document>
  );
}
