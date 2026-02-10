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
  ppeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
  },
  ppeItem: {
    width: "25%",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
});

interface Hazard {
  step: string;
  hazard: string;
  severity: number;
  probability: number;
  riskScore: number;
  controls: string;
}

interface JHAData {
  // Job Information
  jobTitle: string;
  department: string;
  location: string;
  analysisDate: string;
  analystName: string;
  reviewedBy?: string;
  approvalDate?: string;
  
  // Hazards
  hazards: Hazard[];
  
  // PPE
  ppeRequired: string[];
  
  // Additional
  additionalNotes?: string;
  
  // Company Info
  companyName: string;
  companyLogo?: string;
}

const PPE_OPTIONS = [
  "Safety Glasses",
  "Hard Hat",
  "Steel-Toe Boots",
  "Hearing Protection",
  "Gloves",
  "Face Shield",
  "Respirator",
  "High-Vis Vest",
  "Fall Protection",
  "Chemical Suit",
];

export function JHAPdfDocument({ data }: { data: JHAData }) {
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
              <Text style={styles.title}>Job Hazard Analysis (JHA)</Text>
              <Text style={styles.subtitle}>
                OSHA-Compliant Workplace Safety Assessment
              </Text>
            </View>
            <View style={styles.logoContainer}>
              <Text style={styles.formNumber}>OSHA JHA Form</Text>
            </View>
          </View>
        </View>

        {/* Job Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Job Information</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Job/Task Title:</Text>
            <Text style={styles.value}>{data.jobTitle}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Department:</Text>
            <Text style={styles.value}>{data.department}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Location:</Text>
            <Text style={styles.value}>{data.location}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Analysis Date:</Text>
            <Text style={styles.value}>{data.analysisDate}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Prepared By:</Text>
            <Text style={styles.value}>{data.analystName}</Text>
          </View>
        </View>

        {/* Hazard Analysis Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Hazard Analysis</Text>
          <View style={styles.table}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCell, { flex: 2 }]}>Task Step</Text>
              <Text style={[styles.tableCell, { flex: 2 }]}>Potential Hazards</Text>
              <Text style={styles.tableCellSmall}>S</Text>
              <Text style={styles.tableCellSmall}>P</Text>
              <Text style={styles.tableCellSmall}>Risk</Text>
              <Text style={[styles.tableCell, { flex: 2 }]}>Controls</Text>
            </View>
            
            {/* Table Rows */}
            {data.hazards.map((hazard, index) => {
              const riskLevel = getRiskLevel(hazard.riskScore);
              return (
                <View 
                  key={index} 
                  style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}
                >
                  <Text style={[styles.tableCell, { flex: 2 }]}>{hazard.step}</Text>
                  <Text style={[styles.tableCell, { flex: 2 }]}>{hazard.hazard}</Text>
                  <Text style={styles.tableCellSmall}>{hazard.severity}</Text>
                  <Text style={styles.tableCellSmall}>{hazard.probability}</Text>
                  <View style={styles.tableCellSmall}>
                    <Text style={[
                      styles.riskBadge,
                      { backgroundColor: getRiskColor(riskLevel) }
                    ]}>
                      {hazard.riskScore}
                    </Text>
                  </View>
                  <Text style={[styles.tableCell, { flex: 2 }]}>{hazard.controls}</Text>
                </View>
              );
            })}
          </View>
          <Text style={{ fontSize: 8, color: "#666666", marginTop: 4 }}>
            S = Severity (1-5), P = Probability (1-5), Risk = S × P
          </Text>
        </View>

        {/* PPE Requirements */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Required Personal Protective Equipment (PPE)</Text>
          <View style={styles.ppeGrid}>
            {PPE_OPTIONS.map((ppe) => {
              const isRequired = data.ppeRequired.includes(ppe);
              return (
                <View key={ppe} style={styles.ppeItem}>
                  <View style={isRequired ? styles.checkboxChecked : styles.checkbox} />
                  <Text style={{ fontSize: 9 }}>{ppe}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Additional Notes */}
        {data.additionalNotes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>4. Additional Notes & Recommendations</Text>
            <Text style={{ lineHeight: 1.5 }}>{data.additionalNotes}</Text>
          </View>
        )}

        {/* Signatures */}
        <View style={styles.signatureSection}>
          <Text style={[styles.sectionTitle, { backgroundColor: "transparent", padding: 0 }]}>
            Signatures & Approval
          </Text>
          <View style={styles.signatureRow}>
            <View style={styles.signatureBlock}>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureLabel}>Prepared By: {data.analystName}</Text>
              <Text style={styles.signatureLabel}>Date: {data.analysisDate}</Text>
            </View>
            <View style={styles.signatureBlock}>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureLabel}>Reviewed By: {data.reviewedBy || "________________"}</Text>
              <Text style={styles.signatureLabel}>Date: {data.approvalDate || "________________"}</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Generated: {today}</Text>
          <Text>Harmoniq Safety • Job Hazard Analysis</Text>
          <Text>Page 1 of 1</Text>
        </View>
      </Page>
    </Document>
  );
}
