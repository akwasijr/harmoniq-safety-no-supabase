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
    backgroundColor: "#fee2e2",
    color: "#991b1b",
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 4,
    alignSelf: "center",
    marginTop: 4,
  },
  riskCategoryBox: {
    borderWidth: 1,
    borderColor: "#e5e5e5",
    marginBottom: 8,
    borderRadius: 4,
  },
  riskCategoryHeader: {
    backgroundColor: "#f5f5f5",
    padding: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  riskCategoryTitle: {
    fontWeight: "bold",
    fontSize: 10,
  },
  riskCategoryContent: {
    padding: 8,
  },
  priorityBadge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 4,
    fontSize: 8,
    fontWeight: "bold",
  },
});

interface RiskItem {
  category: string;
  identified: boolean;
  description?: string;
  severity: number;
  probability: number;
  exposure: string;
  riskScore: number;
  priority: "high" | "medium" | "low";
  currentMeasures: string;
  additionalMeasures: string;
  responsible: string;
  deadline: string;
}

interface RIEData {
  // Company Information
  companyName: string;
  companyLogo?: string;
  department: string;
  location: string;
  assessmentDate: string;
  assessorName: string;
  
  // Risk Categories
  risks: RiskItem[];
  
  // Action Plan
  actionPlan: {
    action: string;
    priority: "high" | "medium" | "low";
    responsible: string;
    deadline: string;
    status: string;
  }[];
  
  // Approval
  approvedBy?: string;
  approvalDate?: string;
  evaluationDate?: string;
}

const RISK_CATEGORIES = [
  { id: "physical", name: "Fysieke risico's", nameEn: "Physical risks" },
  { id: "chemical", name: "Chemische risico's", nameEn: "Chemical risks" },
  { id: "biological", name: "Biologische risico's", nameEn: "Biological risks" },
  { id: "ergonomic", name: "Ergonomische risico's", nameEn: "Ergonomic risks" },
  { id: "psychosocial", name: "Psychosociale risico's", nameEn: "Psychosocial risks" },
];

export function RIEPdfDocument({ data }: { data: RIEData }) {
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
              <Text style={styles.title}>Risico-Inventarisatie en -Evaluatie (RI&E)</Text>
              <Text style={styles.subtitle}>
                Risk Inventory & Evaluation • Arbowet Compliant
              </Text>
              <Text style={styles.regulationBadge}>Arbowet Art. 5</Text>
            </View>
            <View style={styles.logoContainer}>
              <Text style={styles.formNumber}>RI&E Formulier</Text>
            </View>
          </View>
        </View>

        {/* Company Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Bedrijfsgegevens (Company Information)</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Bedrijfsnaam:</Text>
            <Text style={styles.value}>{data.companyName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Afdeling:</Text>
            <Text style={styles.value}>{data.department}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Locatie:</Text>
            <Text style={styles.value}>{data.location}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Datum beoordeling:</Text>
            <Text style={styles.value}>{data.assessmentDate}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Beoordelaar:</Text>
            <Text style={styles.value}>{data.assessorName}</Text>
          </View>
        </View>

        {/* Risk Identification & Evaluation */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Risico-identificatie en -evaluatie</Text>
          
          {data.risks.map((risk, index) => {
            const riskLevel = getRiskLevel(risk.riskScore);
            return (
              <View key={index} style={styles.riskCategoryBox}>
                <View style={styles.riskCategoryHeader}>
                  <Text style={styles.riskCategoryTitle}>{risk.category}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Text style={{ fontSize: 8, marginRight: 8 }}>
                      Risk: {risk.riskScore}
                    </Text>
                    <Text style={[
                      styles.priorityBadge,
                      { backgroundColor: getRiskColor(risk.priority) }
                    ]}>
                      {risk.priority.toUpperCase()}
                    </Text>
                  </View>
                </View>
                <View style={styles.riskCategoryContent}>
                  <View style={styles.row}>
                    <Text style={[styles.label, { width: 150 }]}>Beschrijving:</Text>
                    <Text style={styles.value}>{risk.description || "N/A"}</Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={[styles.label, { width: 150 }]}>Ernst / Waarschijnlijkheid:</Text>
                    <Text style={styles.value}>{risk.severity} × {risk.probability} = {risk.riskScore}</Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={[styles.label, { width: 150 }]}>Huidige maatregelen:</Text>
                    <Text style={styles.value}>{risk.currentMeasures}</Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={[styles.label, { width: 150 }]}>Aanvullende maatregelen:</Text>
                    <Text style={styles.value}>{risk.additionalMeasures}</Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={[styles.label, { width: 150 }]}>Verantwoordelijke:</Text>
                    <Text style={styles.value}>{risk.responsible}</Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={[styles.label, { width: 150 }]}>Deadline:</Text>
                    <Text style={styles.value}>{risk.deadline}</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {/* Action Plan */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Plan van Aanpak (Action Plan)</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCell, { flex: 3 }]}>Actie</Text>
              <Text style={styles.tableCellSmall}>Prioriteit</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>Verantw.</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>Deadline</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>Status</Text>
            </View>
            {data.actionPlan.map((action, index) => (
              <View 
                key={index} 
                style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}
              >
                <Text style={[styles.tableCell, { flex: 3 }]}>{action.action}</Text>
                <View style={styles.tableCellSmall}>
                  <Text style={[
                    styles.priorityBadge,
                    { backgroundColor: getRiskColor(action.priority) }
                  ]}>
                    {action.priority}
                  </Text>
                </View>
                <Text style={[styles.tableCell, { flex: 1 }]}>{action.responsible}</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>{action.deadline}</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>{action.status}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Signatures */}
        <View style={styles.signatureSection}>
          <Text style={[styles.sectionTitle, { backgroundColor: "transparent", padding: 0 }]}>
            Ondertekening (Signatures)
          </Text>
          <View style={styles.signatureRow}>
            <View style={styles.signatureBlock}>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureLabel}>Beoordelaar: {data.assessorName}</Text>
              <Text style={styles.signatureLabel}>Datum: {data.assessmentDate}</Text>
            </View>
            <View style={styles.signatureBlock}>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureLabel}>Goedgekeurd door: {data.approvedBy || "________________"}</Text>
              <Text style={styles.signatureLabel}>Datum: {data.approvalDate || "________________"}</Text>
            </View>
          </View>
          <View style={{ marginTop: 16 }}>
            <Text style={styles.signatureLabel}>
              Volgende evaluatiedatum: {data.evaluationDate || "________________"}
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Gegenereerd: {today}</Text>
          <Text>Harmoniq Safety • RI&E Assessment</Text>
          <Text>Pagina 1 van 1</Text>
        </View>
      </Page>
    </Document>
  );
}
