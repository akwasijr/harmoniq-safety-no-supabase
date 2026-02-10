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
    backgroundColor: "#dbeafe",
    color: "#1e40af",
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 4,
    alignSelf: "center",
    marginTop: 4,
  },
  sectionCard: {
    borderWidth: 1,
    borderColor: "#e5e5e5",
    marginBottom: 12,
    borderRadius: 4,
  },
  sectionHeader: {
    backgroundColor: "#f5f5f5",
    padding: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionName: {
    fontWeight: "bold",
    fontSize: 11,
  },
  questionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
  },
  questionLabel: {
    flex: 3,
    fontSize: 9,
  },
  ratingContainer: {
    flexDirection: "row",
    width: 120,
    justifyContent: "flex-end",
  },
  ratingBlock: {
    width: 20,
    height: 16,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    marginLeft: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  ratingFilled: {
    backgroundColor: "#1a1a1a",
  },
  concernFlag: {
    backgroundColor: "#fef2f2",
    color: "#991b1b",
    fontSize: 8,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    marginLeft: 8,
  },
  averageScore: {
    fontSize: 14,
    fontWeight: "bold",
  },
  scoreBar: {
    height: 8,
    backgroundColor: "#e5e5e5",
    borderRadius: 4,
    marginTop: 4,
    overflow: "hidden",
  },
  scoreBarFill: {
    height: "100%",
    borderRadius: 4,
  },
});

interface QuestionResponse {
  id: string;
  label: string;
  rating: number; // 1-5
  concern: boolean;
  notes?: string;
}

interface Section {
  id: string;
  title: string;
  icon: string;
  questions: QuestionResponse[];
  average: number;
}

interface OSAData {
  // Organization Info
  companyName: string;
  companyLogo?: string;
  department: string;
  assessmentDate: string;
  respondent?: string;
  role?: string;
  
  // Sections
  sections: Section[];
  
  // Summary
  overallConcerns: string;
  suggestions: string;
  concernCount: number;
  lowRatingCount: number;
}

function RatingBar({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <View style={styles.ratingContainer}>
      {Array.from({ length: max }, (_, i) => (
        <View 
          key={i} 
          style={[
            styles.ratingBlock,
            i < rating ? styles.ratingFilled : {}
          ]}
        >
          <Text style={{ fontSize: 7, color: i < rating ? "#ffffff" : "#999999" }}>
            {i + 1}
          </Text>
        </View>
      ))}
    </View>
  );
}

function getScoreColor(score: number): string {
  if (score >= 4) return "#16a34a";
  if (score >= 3) return "#ca8a04";
  return "#dc2626";
}

export function OSAPdfDocument({ data }: { data: OSAData }) {
  const today = new Date().toLocaleDateString();
  
  // Calculate overall average
  const overallAverage = data.sections.length > 0
    ? data.sections.reduce((sum, s) => sum + s.average, 0) / data.sections.length
    : 0;

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
              <Text style={styles.title}>Organisatorisk och Social Arbetsmiljö (OSA)</Text>
              <Text style={styles.subtitle}>
                Psychosocial Work Environment Assessment • AFS 2015:4 Compliant
              </Text>
              <Text style={styles.regulationBadge}>Arbetsmiljöverket</Text>
            </View>
            <View style={styles.logoContainer}>
              <Text style={styles.formNumber}>OSA Formulär</Text>
            </View>
          </View>
        </View>

        {/* Assessment Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Bedömningsinformation</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Organisation:</Text>
            <Text style={styles.value}>{data.companyName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Avdelning:</Text>
            <Text style={styles.value}>{data.department}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Datum:</Text>
            <Text style={styles.value}>{data.assessmentDate}</Text>
          </View>
          {data.respondent && (
            <View style={styles.row}>
              <Text style={styles.label}>Respondent:</Text>
              <Text style={styles.value}>{data.respondent} {data.role ? `(${data.role})` : ""}</Text>
            </View>
          )}
        </View>

        {/* Overall Summary */}
        <View style={{ flexDirection: "row", justifyContent: "space-around", marginBottom: 15, padding: 12, backgroundColor: "#f5f5f5", borderRadius: 4 }}>
          <View style={{ alignItems: "center" }}>
            <Text style={[styles.averageScore, { color: getScoreColor(overallAverage) }]}>
              {overallAverage.toFixed(1)}
            </Text>
            <Text style={{ fontSize: 8 }}>Overall Average</Text>
          </View>
          <View style={{ alignItems: "center" }}>
            <Text style={[styles.averageScore, { color: data.concernCount > 0 ? "#dc2626" : "#16a34a" }]}>
              {data.concernCount}
            </Text>
            <Text style={{ fontSize: 8 }}>Concerns</Text>
          </View>
          <View style={{ alignItems: "center" }}>
            <Text style={[styles.averageScore, { color: data.lowRatingCount > 0 ? "#ca8a04" : "#16a34a" }]}>
              {data.lowRatingCount}
            </Text>
            <Text style={{ fontSize: 8 }}>Low Ratings</Text>
          </View>
        </View>

        {/* Section Results */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Bedömningsresultat per område</Text>
          
          {data.sections.map((section) => (
            <View key={section.id} style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Text style={{ fontSize: 14, marginRight: 8 }}>{section.icon}</Text>
                  <Text style={styles.sectionName}>{section.title}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={[styles.averageScore, { color: getScoreColor(section.average) }]}>
                    {section.average.toFixed(1)}/5
                  </Text>
                </View>
              </View>
              
              {/* Score bar */}
              <View style={{ paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "#fafafa" }}>
                <View style={styles.scoreBar}>
                  <View style={[
                    styles.scoreBarFill,
                    { 
                      width: `${(section.average / 5) * 100}%`,
                      backgroundColor: getScoreColor(section.average)
                    }
                  ]} />
                </View>
              </View>

              {/* Questions */}
              {section.questions.map((question) => (
                <View key={question.id} style={styles.questionRow}>
                  <View style={{ flex: 3, flexDirection: "row", alignItems: "center" }}>
                    <Text style={styles.questionLabel}>{question.label}</Text>
                    {question.concern && (
                      <Text style={styles.concernFlag}>⚠ Risk</Text>
                    )}
                  </View>
                  <RatingBar rating={question.rating} />
                </View>
              ))}
            </View>
          ))}
        </View>

        {/* Concerns & Suggestions */}
        {(data.overallConcerns || data.suggestions) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3. Övergripande kommentarer</Text>
            {data.overallConcerns && (
              <View style={{ marginBottom: 10 }}>
                <Text style={{ fontSize: 9, fontWeight: "bold", marginBottom: 4 }}>Bekymmer:</Text>
                <Text style={{ fontSize: 9, lineHeight: 1.4 }}>{data.overallConcerns}</Text>
              </View>
            )}
            {data.suggestions && (
              <View>
                <Text style={{ fontSize: 9, fontWeight: "bold", marginBottom: 4 }}>Förbättringsförslag:</Text>
                <Text style={{ fontSize: 9, lineHeight: 1.4 }}>{data.suggestions}</Text>
              </View>
            )}
          </View>
        )}

        {/* Rating Legend */}
        <View style={{ marginBottom: 15 }}>
          <Text style={{ fontSize: 8, color: "#666666" }}>
            Skala: 1 = Stämmer inte alls, 2 = Stämmer dåligt, 3 = Stämmer delvis, 4 = Stämmer ganska bra, 5 = Stämmer helt
          </Text>
        </View>

        {/* Signatures */}
        <View style={styles.signatureSection}>
          <Text style={[styles.sectionTitle, { backgroundColor: "transparent", padding: 0 }]}>
            Godkännande
          </Text>
          <View style={styles.signatureRow}>
            <View style={styles.signatureBlock}>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureLabel}>Respondent: {data.respondent || "________________"}</Text>
              <Text style={styles.signatureLabel}>Datum: {data.assessmentDate}</Text>
            </View>
            <View style={styles.signatureBlock}>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureLabel}>HR/Management Review</Text>
              <Text style={styles.signatureLabel}>Datum: ________________</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Genererad: {today}</Text>
          <Text>Harmoniq Safety • OSA Assessment</Text>
          <Text>Sida 1 av 1</Text>
        </View>
      </Page>
    </Document>
  );
}
