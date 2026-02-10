"use client";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import { sharedStyles } from "./shared-styles";

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
  articleBox: {
    borderWidth: 1,
    borderColor: "#e5e5e5",
    marginBottom: 10,
    borderRadius: 4,
  },
  articleHeader: {
    backgroundColor: "#f5f5f5",
    padding: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  articleTitle: {
    fontWeight: "bold",
    fontSize: 10,
  },
  articleContent: {
    padding: 10,
  },
  complianceItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  itemLabel: {
    flex: 3,
    fontSize: 9,
  },
  statusBadge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 4,
    fontSize: 8,
    fontWeight: "bold",
    textAlign: "center",
  },
  statusCompliant: {
    backgroundColor: "#dcfce7",
    color: "#166534",
  },
  statusPartial: {
    backgroundColor: "#fef9c3",
    color: "#854d0e",
  },
  statusNonCompliant: {
    backgroundColor: "#fee2e2",
    color: "#991b1b",
  },
  statusNA: {
    backgroundColor: "#f3f4f6",
    color: "#6b7280",
  },
  scoreCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    justifyContent: "center",
    alignItems: "center",
  },
  scoreText: {
    fontSize: 18,
    fontWeight: "bold",
  },
});

interface ComplianceItem {
  id: string;
  label: string;
  status: "compliant" | "partial" | "non_compliant" | "na";
  evidence?: string;
  actionNeeded?: string;
}

interface Article {
  id: string;
  title: string;
  description: string;
  items: ComplianceItem[];
}

interface ArbowetData {
  // Company Info
  companyName: string;
  companyLogo?: string;
  auditor: string;
  auditDate: string;
  
  // Articles
  articles: Article[];
  
  // Summary
  complianceScore: number;
  compliantCount: number;
  partialCount: number;
  nonCompliantCount: number;
  naCount: number;
  
  // Overall
  overallAssessment: string;
  priorityActions: string;
  nextAuditDate?: string;
}

function getStatusStyle(status: string) {
  switch (status) {
    case "compliant": return styles.statusCompliant;
    case "partial": return styles.statusPartial;
    case "non_compliant": return styles.statusNonCompliant;
    default: return styles.statusNA;
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case "compliant": return "✓ Compliant";
    case "partial": return "~ Partial";
    case "non_compliant": return "✗ Non-Compliant";
    default: return "N/A";
  }
}

export function ArbowetPdfDocument({ data }: { data: ArbowetData }) {
  const today = new Date().toLocaleDateString();
  const scoreColor = data.complianceScore >= 80 ? "#16a34a" : 
                     data.complianceScore >= 50 ? "#ca8a04" : "#dc2626";

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
              <Text style={styles.title}>Arbowet Compliance Audit</Text>
              <Text style={styles.subtitle}>
                Dutch Working Conditions Act Compliance Check
              </Text>
              <Text style={styles.regulationBadge}>Arbeidsomstandighedenwet</Text>
            </View>
            <View style={styles.logoContainer}>
              <Text style={styles.formNumber}>Arbowet Audit</Text>
            </View>
          </View>
        </View>

        {/* Audit Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Audit Information</Text>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <View style={{ flex: 1 }}>
              <View style={styles.row}>
                <Text style={styles.label}>Bedrijf:</Text>
                <Text style={styles.value}>{data.companyName}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Auditor:</Text>
                <Text style={styles.value}>{data.auditor}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Datum:</Text>
                <Text style={styles.value}>{data.auditDate}</Text>
              </View>
            </View>
            {/* Compliance Score Circle */}
            <View style={{ alignItems: "center", paddingLeft: 20 }}>
              <View style={[styles.scoreCircle, { borderColor: scoreColor }]}>
                <Text style={[styles.scoreText, { color: scoreColor }]}>{data.complianceScore}%</Text>
              </View>
              <Text style={{ fontSize: 8, marginTop: 4, color: scoreColor }}>Compliance</Text>
            </View>
          </View>
        </View>

        {/* Compliance Summary */}
        <View style={{ flexDirection: "row", justifyContent: "space-around", marginBottom: 15, padding: 10, backgroundColor: "#f5f5f5", borderRadius: 4 }}>
          <View style={{ alignItems: "center" }}>
            <Text style={{ fontSize: 16, fontWeight: "bold", color: "#16a34a" }}>{data.compliantCount}</Text>
            <Text style={{ fontSize: 8 }}>Compliant</Text>
          </View>
          <View style={{ alignItems: "center" }}>
            <Text style={{ fontSize: 16, fontWeight: "bold", color: "#ca8a04" }}>{data.partialCount}</Text>
            <Text style={{ fontSize: 8 }}>Partial</Text>
          </View>
          <View style={{ alignItems: "center" }}>
            <Text style={{ fontSize: 16, fontWeight: "bold", color: "#dc2626" }}>{data.nonCompliantCount}</Text>
            <Text style={{ fontSize: 8 }}>Non-Compliant</Text>
          </View>
          <View style={{ alignItems: "center" }}>
            <Text style={{ fontSize: 16, fontWeight: "bold", color: "#6b7280" }}>{data.naCount}</Text>
            <Text style={{ fontSize: 8 }}>N/A</Text>
          </View>
        </View>

        {/* Articles */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Compliance Check by Article</Text>
          
          {data.articles.map((article) => {
            const articleCompliant = article.items.filter(i => i.status === "compliant").length;
            const articleTotal = article.items.filter(i => i.status !== "na").length;
            
            return (
              <View key={article.id} style={styles.articleBox}>
                <View style={styles.articleHeader}>
                  <View>
                    <Text style={styles.articleTitle}>{article.title}</Text>
                    <Text style={{ fontSize: 8, color: "#666666" }}>{article.description}</Text>
                  </View>
                  <Text style={{ fontSize: 9 }}>{articleCompliant}/{articleTotal}</Text>
                </View>
                <View style={styles.articleContent}>
                  {article.items.map((item) => (
                    <View key={item.id} style={styles.complianceItem}>
                      <Text style={styles.itemLabel}>{item.label}</Text>
                      <Text style={[styles.statusBadge, getStatusStyle(item.status)]}>
                        {getStatusLabel(item.status)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            );
          })}
        </View>

        {/* Non-Compliant Items */}
        {data.nonCompliantCount > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3. Non-Compliant Items - Action Required</Text>
            {data.articles.flatMap(article => 
              article.items
                .filter(item => item.status === "non_compliant")
                .map(item => (
                  <View key={item.id} style={{ backgroundColor: "#fef2f2", padding: 8, marginBottom: 6, borderRadius: 4 }}>
                    <Text style={{ fontSize: 9, fontWeight: "bold", color: "#991b1b" }}>{item.label}</Text>
                    {item.actionNeeded && (
                      <Text style={{ fontSize: 8, color: "#991b1b", marginTop: 4 }}>→ {item.actionNeeded}</Text>
                    )}
                  </View>
                ))
            )}
          </View>
        )}

        {/* Overall Assessment */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Overall Assessment</Text>
          <Text style={{ fontSize: 9, lineHeight: 1.4 }}>{data.overallAssessment}</Text>
          {data.priorityActions && (
            <View style={{ marginTop: 10 }}>
              <Text style={{ fontSize: 9, fontWeight: "bold", marginBottom: 4 }}>Priority Actions:</Text>
              <Text style={{ fontSize: 9, lineHeight: 1.4 }}>{data.priorityActions}</Text>
            </View>
          )}
        </View>

        {/* Signatures */}
        <View style={styles.signatureSection}>
          <Text style={[styles.sectionTitle, { backgroundColor: "transparent", padding: 0 }]}>
            Ondertekening (Signatures)
          </Text>
          <View style={styles.signatureRow}>
            <View style={styles.signatureBlock}>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureLabel}>Auditor: {data.auditor}</Text>
              <Text style={styles.signatureLabel}>Datum: {data.auditDate}</Text>
            </View>
            <View style={styles.signatureBlock}>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureLabel}>Management Approval</Text>
              <Text style={styles.signatureLabel}>Datum: ________________</Text>
            </View>
          </View>
          {data.nextAuditDate && (
            <View style={{ marginTop: 12 }}>
              <Text style={styles.signatureLabel}>
                Volgende audit: {data.nextAuditDate}
              </Text>
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Gegenereerd: {today}</Text>
          <Text>Harmoniq Safety • Arbowet Audit</Text>
          <Text>Pagina 1 van 1</Text>
        </View>
      </Page>
    </Document>
  );
}
