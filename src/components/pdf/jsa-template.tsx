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
  checklistCategory: {
    borderWidth: 1,
    borderColor: "#e5e5e5",
    marginBottom: 8,
    borderRadius: 4,
  },
  categoryHeader: {
    backgroundColor: "#f5f5f5",
    padding: 8,
    fontWeight: "bold",
    fontSize: 10,
  },
  checklistItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  itemLabel: {
    flex: 3,
    fontSize: 9,
  },
  itemStatus: {
    width: 50,
    textAlign: "center",
    fontSize: 9,
    fontWeight: "bold",
  },
  statusPass: {
    color: "#16a34a",
  },
  statusFail: {
    color: "#dc2626",
  },
  statusNA: {
    color: "#6b7280",
  },
  crewSection: {
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 4,
    padding: 10,
    marginBottom: 10,
  },
});

interface ChecklistItem {
  id: string;
  label: string;
  status: "pass" | "fail" | "na" | null;
  notes?: string;
}

interface ChecklistCategory {
  id: string;
  title: string;
  items: ChecklistItem[];
}

interface JSAData {
  // Job Details
  companyName: string;
  companyLogo?: string;
  date: string;
  time: string;
  jobDescription: string;
  location: string;
  crewLeader: string;
  crewMembers: string[];
  
  // Checklist
  categories: ChecklistCategory[];
  
  // Hazards & Controls
  identifiedHazards: string;
  controlMeasures: string;
  stopWorkConditions: string;
  
  // Summary
  passCount: number;
  failCount: number;
  naCount: number;
}

export function JSAPdfDocument({ data }: { data: JSAData }) {
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
              <Text style={styles.title}>Job Safety Analysis (JSA)</Text>
              <Text style={styles.subtitle}>
                Daily Pre-Work Safety Checklist
              </Text>
            </View>
            <View style={styles.logoContainer}>
              <Text style={styles.formNumber}>OSHA Daily JSA</Text>
            </View>
          </View>
        </View>

        {/* Job Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Job Details</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Date/Time:</Text>
            <Text style={styles.value}>{data.date} {data.time}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Location:</Text>
            <Text style={styles.value}>{data.location}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Task Description:</Text>
            <Text style={styles.value}>{data.jobDescription}</Text>
          </View>
        </View>

        {/* Crew Information */}
        <View style={styles.crewSection}>
          <View style={styles.row}>
            <Text style={styles.label}>Crew Leader:</Text>
            <Text style={styles.value}>{data.crewLeader}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Crew Members:</Text>
            <Text style={styles.value}>{data.crewMembers.join(", ")}</Text>
          </View>
        </View>

        {/* Pre-Work Checklist */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Pre-Work Safety Checklist</Text>
          
          {data.categories.map((category) => (
            <View key={category.id} style={styles.checklistCategory}>
              <Text style={styles.categoryHeader}>{category.title}</Text>
              {category.items.map((item, index) => (
                <View key={item.id} style={styles.checklistItem}>
                  <Text style={styles.itemLabel}>{item.label}</Text>
                  <Text style={[
                    styles.itemStatus,
                    item.status === "pass" ? styles.statusPass :
                    item.status === "fail" ? styles.statusFail :
                    styles.statusNA
                  ]}>
                    {item.status === "pass" ? "✓ PASS" :
                     item.status === "fail" ? "✗ FAIL" :
                     item.status === "na" ? "N/A" : "—"}
                  </Text>
                </View>
              ))}
            </View>
          ))}

          {/* Summary */}
          <View style={{ flexDirection: "row", justifyContent: "space-around", marginTop: 10, padding: 10, backgroundColor: "#f5f5f5", borderRadius: 4 }}>
            <View style={{ alignItems: "center" }}>
              <Text style={{ fontSize: 18, fontWeight: "bold", color: "#16a34a" }}>{data.passCount}</Text>
              <Text style={{ fontSize: 8 }}>Pass</Text>
            </View>
            <View style={{ alignItems: "center" }}>
              <Text style={{ fontSize: 18, fontWeight: "bold", color: "#dc2626" }}>{data.failCount}</Text>
              <Text style={{ fontSize: 8 }}>Fail</Text>
            </View>
            <View style={{ alignItems: "center" }}>
              <Text style={{ fontSize: 18, fontWeight: "bold", color: "#6b7280" }}>{data.naCount}</Text>
              <Text style={{ fontSize: 8 }}>N/A</Text>
            </View>
          </View>
        </View>

        {/* Hazards & Controls */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Identified Hazards & Controls</Text>
          <View style={{ marginBottom: 8 }}>
            <Text style={{ fontSize: 9, fontWeight: "bold", marginBottom: 2 }}>Identified Hazards:</Text>
            <Text style={{ fontSize: 9, lineHeight: 1.4 }}>{data.identifiedHazards || "None identified"}</Text>
          </View>
          <View style={{ marginBottom: 8 }}>
            <Text style={{ fontSize: 9, fontWeight: "bold", marginBottom: 2 }}>Control Measures:</Text>
            <Text style={{ fontSize: 9, lineHeight: 1.4 }}>{data.controlMeasures || "Standard controls in place"}</Text>
          </View>
          <View style={{ backgroundColor: "#fef2f2", padding: 8, borderRadius: 4 }}>
            <Text style={{ fontSize: 9, fontWeight: "bold", marginBottom: 2, color: "#991b1b" }}>Stop Work Conditions:</Text>
            <Text style={{ fontSize: 9, lineHeight: 1.4, color: "#991b1b" }}>{data.stopWorkConditions || "If conditions change, stop and reassess"}</Text>
          </View>
        </View>

        {/* Crew Acknowledgment */}
        <View style={styles.signatureSection}>
          <Text style={[styles.sectionTitle, { backgroundColor: "transparent", padding: 0 }]}>
            Crew Acknowledgment
          </Text>
          <Text style={{ fontSize: 9, marginBottom: 12, lineHeight: 1.4 }}>
            All crew members have participated in this JSA briefing, understand the hazards 
            and control measures, and are prepared to perform the work safely.
          </Text>
          <View style={styles.signatureRow}>
            <View style={styles.signatureBlock}>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureLabel}>Crew Leader: {data.crewLeader}</Text>
              <Text style={styles.signatureLabel}>Date: {data.date}</Text>
            </View>
            <View style={styles.signatureBlock}>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureLabel}>Supervisor Review</Text>
              <Text style={styles.signatureLabel}>Date: ________________</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Generated: {today}</Text>
          <Text>Harmoniq Safety • Job Safety Analysis</Text>
          <Text>Page 1 of 1</Text>
        </View>
      </Page>
    </Document>
  );
}
