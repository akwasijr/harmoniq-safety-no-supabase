import { StyleSheet } from "@react-pdf/renderer";

// Shared styles for all PDF templates
export const sharedStyles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    backgroundColor: "#ffffff",
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: "#1a1a1a",
    paddingBottom: 15,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
    color: "#1a1a1a",
  },
  subtitle: {
    fontSize: 11,
    color: "#666666",
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 8,
    backgroundColor: "#f5f5f5",
    padding: 6,
    color: "#1a1a1a",
  },
  row: {
    flexDirection: "row",
    marginBottom: 4,
  },
  label: {
    width: 120,
    fontWeight: "bold",
    color: "#666666",
  },
  value: {
    flex: 1,
    color: "#1a1a1a",
  },
  table: {
    marginTop: 8,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#1a1a1a",
    color: "#ffffff",
    padding: 8,
    fontWeight: "bold",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
    padding: 8,
    minHeight: 30,
  },
  tableRowAlt: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
    padding: 8,
    minHeight: 30,
    backgroundColor: "#fafafa",
  },
  tableCell: {
    flex: 1,
    paddingRight: 8,
  },
  tableCellSmall: {
    width: 60,
    textAlign: "center",
  },
  riskBadge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    fontSize: 9,
    fontWeight: "bold",
    textAlign: "center",
  },
  riskLow: {
    backgroundColor: "#dcfce7",
    color: "#166534",
  },
  riskMedium: {
    backgroundColor: "#fef9c3",
    color: "#854d0e",
  },
  riskHigh: {
    backgroundColor: "#fee2e2",
    color: "#991b1b",
  },
  signatureSection: {
    marginTop: 30,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#e5e5e5",
  },
  signatureRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  signatureBlock: {
    width: "45%",
  },
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a1a",
    marginBottom: 4,
    height: 40,
  },
  signatureLabel: {
    fontSize: 9,
    color: "#666666",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: "#999999",
    borderTopWidth: 1,
    borderTopColor: "#e5e5e5",
    paddingTop: 10,
  },
  checkbox: {
    width: 12,
    height: 12,
    borderWidth: 1,
    borderColor: "#1a1a1a",
    marginRight: 8,
  },
  checkboxChecked: {
    width: 12,
    height: 12,
    backgroundColor: "#1a1a1a",
    marginRight: 8,
  },
  flexRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  riskMatrix: {
    marginTop: 10,
    marginBottom: 10,
  },
  matrixRow: {
    flexDirection: "row",
  },
  matrixCell: {
    width: 40,
    height: 30,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    justifyContent: "center",
    alignItems: "center",
  },
  matrixLabel: {
    width: 80,
    height: 30,
    justifyContent: "center",
    paddingRight: 8,
    textAlign: "right",
    fontSize: 8,
  },
});

// Risk level calculation
export function getRiskLevel(score: number): "low" | "medium" | "high" {
  if (score <= 5) return "low";
  if (score <= 11) return "medium";
  return "high";
}

export function getRiskColor(level: "low" | "medium" | "high") {
  switch (level) {
    case "low":
      return "#dcfce7";
    case "medium":
      return "#fef9c3";
    case "high":
      return "#fee2e2";
  }
}
