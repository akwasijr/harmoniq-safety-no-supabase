"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  ShieldAlert,
  FileCheck,
  AlertTriangle,
  CheckCircle,
  User,
  MapPin,
  Calendar,
  Lock,
  Download,
  Clock,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DetailTabs, Tab } from "@/components/ui/detail-tabs";
import { getCurrentCompany } from "@/mocks/data";
import { useTranslation } from "@/i18n";
import { useRiskEvaluationsStore } from "@/stores/risk-evaluations-store";
import { useUsersStore } from "@/stores/users-store";
import { useLocationsStore } from "@/stores/locations-store";
import { useToast } from "@/components/ui/toast";

// Dynamic import for PDF export (client-side only)
const PdfExportButton = dynamic(
  () => import("@/components/pdf/pdf-export-button").then(mod => mod.PdfExportButton),
  { ssr: false, loading: () => <Button variant="outline" disabled><Download className="h-4 w-4 mr-2" />Loading...</Button> }
);

// Get current company for PDF export
const currentCompany = getCurrentCompany();

// Mock data for templates
const mockRiskTemplates: Record<string, {
  id: string;
  name: string;
  type: string;
  description: string;
  locked: boolean;
  sections: { name: string; description: string; fields: { label: string; type: string; required: boolean }[] }[];
}> = {
  "jha": {
    id: "jha",
    name: "Job Hazard Analysis (JHA)",
    
    type: "JHA",
    description: "OSHA-compliant step-by-step task analysis with hazard identification and control hierarchy",
    locked: true,
    sections: [
      {
        name: "Job Information",
        description: "Basic information about the job being analyzed",
        fields: [
          { label: "Job/Task Title", type: "text", required: true },
          { label: "Department", type: "select", required: true },
          { label: "Location", type: "location", required: true },
          { label: "Date of Analysis", type: "date", required: true },
          { label: "Analyst Name", type: "text", required: true },
        ],
      },
      {
        name: "Task Breakdown",
        description: "Break down the job into individual steps",
        fields: [
          { label: "Step Number", type: "number", required: true },
          { label: "Step Description", type: "textarea", required: true },
          { label: "Potential Hazards", type: "multi-select", required: true },
          { label: "Hazard Description", type: "textarea", required: false },
        ],
      },
      {
        name: "Risk Assessment",
        description: "Evaluate severity and probability",
        fields: [
          { label: "Severity (1-5)", type: "rating", required: true },
          { label: "Probability (1-5)", type: "rating", required: true },
          { label: "Risk Score", type: "calculated", required: true },
          { label: "Risk Level", type: "calculated", required: true },
        ],
      },
      {
        name: "Control Measures",
        description: "Define controls using the hierarchy",
        fields: [
          { label: "Elimination Controls", type: "textarea", required: false },
          { label: "Substitution Controls", type: "textarea", required: false },
          { label: "Engineering Controls", type: "textarea", required: false },
          { label: "Administrative Controls", type: "textarea", required: false },
          { label: "PPE Required", type: "multi-select", required: true },
        ],
      },
      {
        name: "Approval",
        description: "Supervisor review and approval",
        fields: [
          { label: "Reviewed By", type: "text", required: true },
          { label: "Supervisor Signature", type: "signature", required: true },
          { label: "Approval Date", type: "date", required: true },
        ],
      },
    ],
  },
  "rie": {
    id: "rie",
    name: "RI&E Assessment",
    
    type: "RIE",
    description: "Risico-Inventarisatie en -Evaluatie (Risk Inventory & Evaluation) per Arbowet",
    locked: true,
    sections: [
      {
        name: "Bedrijfsgegevens (Company Information)",
        description: "Basic company and assessment information",
        fields: [
          { label: "Bedrijfsnaam", type: "text", required: true },
          { label: "Afdeling", type: "text", required: true },
          { label: "Locatie", type: "location", required: true },
          { label: "Datum beoordeling", type: "date", required: true },
          { label: "Beoordelaar", type: "text", required: true },
        ],
      },
      {
        name: "Risico-identificatie (Risk Identification)",
        description: "Identify workplace risks by category",
        fields: [
          { label: "Fysieke risico's", type: "checklist", required: true },
          { label: "Chemische risico's", type: "checklist", required: true },
          { label: "Biologische risico's", type: "checklist", required: true },
          { label: "Ergonomische risico's", type: "checklist", required: true },
          { label: "Psychosociale risico's", type: "checklist", required: true },
        ],
      },
      {
        name: "Risico-evaluatie (Risk Evaluation)",
        description: "Evaluate each identified risk",
        fields: [
          { label: "Ernst (Severity 1-5)", type: "rating", required: true },
          { label: "Waarschijnlijkheid (Probability 1-5)", type: "rating", required: true },
          { label: "Blootstelling (Exposure)", type: "select", required: true },
          { label: "Risicoscore", type: "calculated", required: true },
          { label: "Prioriteit", type: "calculated", required: true },
        ],
      },
      {
        name: "Beheersmaatregelen (Control Measures)",
        description: "Define actions to control risks",
        fields: [
          { label: "Huidige maatregelen", type: "textarea", required: true },
          { label: "Aanvullende maatregelen", type: "textarea", required: true },
          { label: "Verantwoordelijke", type: "text", required: true },
          { label: "Deadline", type: "date", required: true },
        ],
      },
      {
        name: "Plan van Aanpak (Action Plan)",
        description: "Document the action plan",
        fields: [
          { label: "Actie", type: "textarea", required: true },
          { label: "Prioriteit", type: "select", required: true },
          { label: "Status", type: "select", required: true },
          { label: "Evaluatiedatum", type: "date", required: true },
        ],
      },
      {
        name: "Ondertekening (Signature)",
        description: "Management approval",
        fields: [
          { label: "Goedgekeurd door", type: "text", required: true },
          { label: "Handtekening", type: "signature", required: true },
          { label: "Datum", type: "date", required: true },
        ],
      },
    ],
  },
  "sam": {
    id: "sam",
    name: "SAM Assessment",
    
    type: "SAM",
    description: "Systematiskt Arbetsmiljöarbete (Systematic Work Environment Management)",
    locked: true,
    sections: [
      {
        name: "Grundinformation (Basic Information)",
        description: "Company and assessment details",
        fields: [
          { label: "Företagsnamn", type: "text", required: true },
          { label: "Avdelning", type: "text", required: true },
          { label: "Plats", type: "location", required: true },
          { label: "Datum", type: "date", required: true },
          { label: "Ansvarig", type: "text", required: true },
        ],
      },
      {
        name: "Fysisk Arbetsmiljö (Physical Environment)",
        description: "Physical work environment risks",
        fields: [
          { label: "Buller (Noise)", type: "rating", required: true },
          { label: "Belysning (Lighting)", type: "rating", required: true },
          { label: "Temperatur", type: "rating", required: true },
          { label: "Ergonomi", type: "rating", required: true },
          { label: "Maskiner och utrustning", type: "checklist", required: true },
        ],
      },
      {
        name: "Psykosocial Arbetsmiljö (Psychosocial Environment)",
        description: "Psychosocial work environment assessment",
        fields: [
          { label: "Arbetsbelastning (Workload)", type: "rating", required: true },
          { label: "Kontroll över arbetet", type: "rating", required: true },
          { label: "Socialt stöd", type: "rating", required: true },
          { label: "Arbetstider", type: "rating", required: true },
          { label: "Kränkande särbehandling", type: "yes_no", required: true },
        ],
      },
      {
        name: "Riskbedömning (Risk Assessment)",
        description: "Evaluate identified risks",
        fields: [
          { label: "Allvarlighetsgrad (Severity 1-5)", type: "rating", required: true },
          { label: "Sannolikhet (Probability 1-5)", type: "rating", required: true },
          { label: "Riskpoäng", type: "calculated", required: true },
          { label: "Risknivå", type: "calculated", required: true },
        ],
      },
      {
        name: "Åtgärder (Actions)",
        description: "Control measures and actions",
        fields: [
          { label: "Befintliga åtgärder", type: "textarea", required: true },
          { label: "Nya åtgärder", type: "textarea", required: true },
          { label: "Ansvarig person", type: "text", required: true },
          { label: "Deadline", type: "date", required: true },
        ],
      },
      {
        name: "Uppföljning (Follow-up)",
        description: "Review and follow-up plan",
        fields: [
          { label: "Uppföljningsdatum", type: "date", required: true },
          { label: "Utvärdering av åtgärder", type: "textarea", required: false },
          { label: "Nästa granskning", type: "date", required: true },
        ],
      },
      {
        name: "Godkännande (Approval)",
        description: "Management sign-off",
        fields: [
          { label: "Godkänd av", type: "text", required: true },
          { label: "Signatur", type: "signature", required: true },
          { label: "Datum", type: "date", required: true },
        ],
      },
    ],
  },
  "jsa": {
    id: "jsa",
    name: "Job Safety Analysis (JSA)",
    
    type: "JSA",
    description: "Task-based safety analysis for specific job roles and activities",
    locked: true,
    sections: [
      {
        name: "Job Information",
        description: "Details about the job and analysis",
        fields: [
          { label: "Job/Task Title", type: "text", required: true },
          { label: "Department", type: "select", required: true },
          { label: "Location", type: "location", required: true },
          { label: "Analysis Date", type: "date", required: true },
          { label: "Prepared By", type: "text", required: true },
        ],
      },
      {
        name: "Sequence of Basic Job Steps",
        description: "List each step in the sequence performed",
        fields: [
          { label: "Step Number", type: "number", required: true },
          { label: "Basic Job Step", type: "textarea", required: true },
        ],
      },
      {
        name: "Potential Hazards",
        description: "Identify hazards for each step",
        fields: [
          { label: "Hazard Type", type: "multi-select", required: true },
          { label: "Hazard Description", type: "textarea", required: true },
          { label: "Severity (1-5)", type: "rating", required: true },
          { label: "Probability (1-5)", type: "rating", required: true },
        ],
      },
      {
        name: "Recommended Actions",
        description: "Actions to eliminate or reduce hazards",
        fields: [
          { label: "Recommended Action", type: "textarea", required: true },
          { label: "Responsible Person", type: "text", required: true },
          { label: "Completion Date", type: "date", required: true },
          { label: "PPE Required", type: "multi-select", required: true },
        ],
      },
    ],
  },
  "arbowet": {
    id: "arbowet",
    name: "Arbowet Compliance Audit",
    
    type: "ARBOWET",
    description: "Dutch Working Conditions Act compliance check (Articles 3, 5, 8, 13, 14)",
    locked: true,
    sections: [
      {
        name: "Algemene Gegevens (General Information)",
        description: "Company and assessment details",
        fields: [
          { label: "Bedrijfsnaam", type: "text", required: true },
          { label: "Vestigingsadres", type: "text", required: true },
          { label: "Datum controle", type: "date", required: true },
          { label: "Controleur", type: "text", required: true },
        ],
      },
      {
        name: "Arbowet Artikelen",
        description: "Compliance with specific Arbowet articles",
        fields: [
          { label: "Art. 3 - Arbobeleid", type: "checklist", required: true },
          { label: "Art. 5 - RI&E aanwezig", type: "yes_no", required: true },
          { label: "Art. 8 - Voorlichting gegeven", type: "yes_no", required: true },
          { label: "Art. 13 - BHV geregeld", type: "yes_no", required: true },
          { label: "Art. 14 - Arbodienst ingeschakeld", type: "yes_no", required: true },
        ],
      },
      {
        name: "Bevindingen (Findings)",
        description: "Document compliance gaps",
        fields: [
          { label: "Geconstateerde tekortkomingen", type: "textarea", required: true },
          { label: "Ernst van afwijking", type: "rating", required: true },
          { label: "Vereiste actie", type: "textarea", required: true },
          { label: "Deadline", type: "date", required: true },
        ],
      },
      {
        name: "Conclusie (Conclusion)",
        description: "Overall compliance assessment",
        fields: [
          { label: "Algemene beoordeling", type: "select", required: true },
          { label: "Opmerkingen", type: "textarea", required: false },
          { label: "Handtekening controleur", type: "signature", required: true },
        ],
      },
    ],
  },
  "osa": {
    id: "osa",
    name: "OSA - Psykosocial Riskbedömning",
    
    type: "OSA",
    description: "Organisatorisk och Social Arbetsmiljö per AFS 2015:4",
    locked: true,
    sections: [
      {
        name: "Grundinformation",
        description: "Basic assessment information",
        fields: [
          { label: "Företag", type: "text", required: true },
          { label: "Arbetsplats", type: "text", required: true },
          { label: "Datum", type: "date", required: true },
          { label: "Utförare", type: "text", required: true },
        ],
      },
      {
        name: "Organisatorisk Arbetsmiljö",
        description: "Organizational work environment (AFS 2015:4)",
        fields: [
          { label: "Arbetsbelastning", type: "rating", required: true },
          { label: "Arbetstid", type: "rating", required: true },
          { label: "Krav och resurser balans", type: "rating", required: true },
          { label: "Möjlighet till återhämtning", type: "rating", required: true },
        ],
      },
      {
        name: "Social Arbetsmiljö",
        description: "Social work environment factors",
        fields: [
          { label: "Socialt stöd från kollegor", type: "rating", required: true },
          { label: "Socialt stöd från chef", type: "rating", required: true },
          { label: "Förekomst av kränkande särbehandling", type: "yes_no", required: true },
          { label: "Konflikter på arbetsplatsen", type: "yes_no", required: true },
        ],
      },
      {
        name: "Riskbedömning",
        description: "Risk evaluation",
        fields: [
          { label: "Identifierade risker", type: "textarea", required: true },
          { label: "Allvarlighetsgrad (1-5)", type: "rating", required: true },
          { label: "Sannolikhet (1-5)", type: "rating", required: true },
          { label: "Risknivå", type: "calculated", required: true },
        ],
      },
      {
        name: "Åtgärdsplan",
        description: "Action plan",
        fields: [
          { label: "Planerade åtgärder", type: "textarea", required: true },
          { label: "Ansvarig", type: "text", required: true },
          { label: "Deadline", type: "date", required: true },
          { label: "Uppföljning", type: "date", required: true },
        ],
      },
    ],
  },
};

// Mock submission data - keyed by submission ID with form-specific fields
const mockSubmissions: Record<string, {
  id: string;
  templateId: string;
  template: string;
  type: string;
  location: string;
  department: string;
  date: string;
  time?: string;
  status: string;
  submittedBy: string;
  reviewedBy: string;
  riskLevel: string;
  riskScore: number;
  hazards: { step: string; hazard: string; severity: number; probability: number; riskScore: number; controls: string }[];
  ppeRequired: string[];
  comments: string;
  // JSA specific
  jobDescription?: string;
  crewLeader?: string;
  crewMembers?: string[];
  checklistCategories?: { id: string; title: string; items: { id: string; label: string; status: "pass" | "fail" | "na" | null; notes?: string }[] }[];
  identifiedHazards?: string;
  controlMeasures?: string;
  stopWorkConditions?: string;
  // RIE specific
  risks?: { category: string; identified: boolean; description?: string; severity: number; probability: number; exposure: string; riskScore: number; priority: "high" | "medium" | "low"; currentMeasures: string; additionalMeasures: string; responsible: string; deadline: string }[];
  actionPlan?: { action: string; priority: "high" | "medium" | "low"; responsible: string; deadline: string; status: string }[];
  // ARBOWET specific
  articles?: { id: string; title: string; description: string; items: { id: string; label: string; status: "compliant" | "partial" | "non_compliant" | "na"; evidence?: string; actionNeeded?: string }[] }[];
  complianceScore?: number;
  overallAssessment?: string;
  priorityActions?: string;
  nextAuditDate?: string;
  // SAM specific
  organizationalFactors?: { factor: string; rating: number; notes?: string }[];
  socialFactors?: { factor: string; value: boolean | number; notes?: string }[];
  // OSA specific
  sections?: { id: string; title: string; icon: string; questions: { id: string; label: string; rating: number; concern: boolean; notes?: string }[]; average: number }[];
  overallConcerns?: string;
  suggestions?: string;
  concernCount?: number;
  lowRatingCount?: number;
}> = {
  "ra1": {
    id: "ra1",
    templateId: "jha",
    template: "Job Hazard Analysis (JHA)",
    type: "JHA",
    location: "Warehouse A",
    department: "Logistics",
    date: "2024-01-28",
    status: "completed",
    submittedBy: "John Doe",
    reviewedBy: "Sarah Wilson",
    riskLevel: "medium",
    riskScore: 9,
    hazards: [
      { step: "Loading heavy materials", hazard: "Back injury from lifting", severity: 3, probability: 3, riskScore: 9, controls: "Use lifting equipment, proper technique training" },
      { step: "Operating forklift", hazard: "Collision with pedestrians", severity: 4, probability: 2, riskScore: 8, controls: "Designated pathways, warning lights, mirrors" },
      { step: "Stacking pallets", hazard: "Falling objects", severity: 4, probability: 2, riskScore: 8, controls: "Proper stacking technique, hard hats required" },
    ],
    ppeRequired: ["Hard Hat", "Safety Glasses", "Steel-toe Boots", "High-visibility Vest"],
    comments: "All workers trained on proper lifting techniques. Forklift routes clearly marked.",
  },
  "ra2": {
    id: "ra2",
    templateId: "rie",
    template: "RI&E Assessment",
    type: "RIE",
    location: "Amsterdam Office",
    department: "Kantoor",
    date: "2024-01-27",
    status: "in_progress",
    submittedBy: "Jan van Berg",
    reviewedBy: "Pending",
    riskLevel: "high",
    riskScore: 16,
    hazards: [
      { step: "Werkplek ergonomie", hazard: "RSI door beeldschermwerk", severity: 3, probability: 4, riskScore: 12, controls: "Ergonomische werkplekken, regelmatige pauzes" },
      { step: "Psychosociale belasting", hazard: "Werkdruk en stress", severity: 4, probability: 4, riskScore: 16, controls: "Werkdrukbeleid, gesprekken met leidinggevende" },
      { step: "Binnenklimaat", hazard: "Slechte ventilatie", severity: 2, probability: 3, riskScore: 6, controls: "Klimaatbeheersing verbeteren" },
    ],
    ppeRequired: [],
    comments: "RI&E voor kantooromgeving. Focus op ergonomie en psychosociale arbeidsbelasting.",
    risks: [
      { category: "Ergonomische risico's", identified: true, description: "Beeldschermwerk risico's - RSI klachten", severity: 3, probability: 3, exposure: "Dagelijks", riskScore: 18, priority: "high", currentMeasures: "Verstelbare bureaus beschikbaar", additionalMeasures: "Ergonomie training, pauze-software", responsible: "HR Manager", deadline: "2024-03-01" },
      { category: "Psychosociale risico's", identified: true, description: "Hoge werkdruk en stress", severity: 3, probability: 3, exposure: "Dagelijks", riskScore: 18, priority: "high", currentMeasures: "Jaarlijks medewerkerstevredenheidsonderzoek", additionalMeasures: "Werkdrukbeleid opstellen, coaching", responsible: "Directeur", deadline: "2024-02-15" },
      { category: "Fysieke risico's", identified: true, description: "Klimaat - onvoldoende ventilatie", severity: 2, probability: 2, exposure: "Dagelijks", riskScore: 8, priority: "low", currentMeasures: "Airconditioning aanwezig", additionalMeasures: "CO2-meters plaatsen, onderhoud HVAC", responsible: "Facility Manager", deadline: "2024-04-01" },
    ],
    actionPlan: [
      { action: "Ergonomie training voor alle medewerkers", priority: "high", responsible: "HR Manager", deadline: "2024-03-01", status: "In behandeling" },
      { action: "Werkdrukbeleid ontwikkelen en communiceren", priority: "high", responsible: "Directeur", deadline: "2024-02-15", status: "Niet gestart" },
      { action: "CO2-meters installeren op alle verdiepingen", priority: "medium", responsible: "Facility Manager", deadline: "2024-04-01", status: "Niet gestart" },
    ],
  },
  "ra3": {
    id: "ra3",
    templateId: "sam",
    template: "SAM Assessment",
    type: "SAM",
    location: "Stockholm Plant",
    department: "Produktion",
    date: "2024-01-25",
    status: "completed",
    submittedBy: "Erik Lindqvist",
    reviewedBy: "Anna Karlsson",
    riskLevel: "low",
    riskScore: 4,
    hazards: [
      { step: "Maskinarbete", hazard: "Klämrisk vid pressar", severity: 4, probability: 1, riskScore: 4, controls: "Skyddsgaller, tvåhandsmanövrering" },
      { step: "Materialhantering", hazard: "Tunga lyft", severity: 2, probability: 2, riskScore: 4, controls: "Lyfthjälpmedel, utbildning i lyftteknik" },
    ],
    ppeRequired: ["Skyddsglasögon", "Skyddsskor", "Hörselskydd"],
    comments: "Systematisk genomgång av arbetsmiljön genomförd. Alla åtgärder implementerade.",
    organizationalFactors: [
      { factor: "Arbetsbelastning (Workload)", rating: 4, notes: "Balanserad arbetsbelastning" },
      { factor: "Arbetstider (Working hours)", rating: 5, notes: "Regelbundna arbetstider, ingen övertid" },
      { factor: "Inflytande (Control)", rating: 4, notes: "God möjlighet att påverka arbetet" },
      { factor: "Kommunikation (Communication)", rating: 4, notes: "Tydlig kommunikation från ledning" },
    ],
    socialFactors: [
      { factor: "Stöd från kollegor", value: 5, notes: "Bra samarbete i teamet" },
      { factor: "Stöd från chef", value: 4, notes: "Tillgänglig och stödjande" },
      { factor: "Kränkande särbehandling", value: false, notes: "Inga rapporterade fall" },
    ],
    actionPlan: [
      { action: "Fortsätt med regelbundna teamträffar", priority: "low", responsible: "Teamledare", deadline: "2024-06-01", status: "Pågående" },
      { action: "Uppdatera lyftutrustning", priority: "medium", responsible: "Produktionschef", deadline: "2024-04-15", status: "Planerad" },
    ],
  },
  "ra4": {
    id: "ra4",
    templateId: "jsa",
    template: "Job Safety Analysis (JSA)",
    type: "JSA",
    location: "Production Floor",
    department: "Manufacturing",
    date: "2024-01-24",
    time: "07:30",
    status: "completed",
    submittedBy: "Sarah Wilson",
    reviewedBy: "Mike Thompson",
    riskLevel: "low",
    riskScore: 3,
    hazards: [
      { step: "Machine startup", hazard: "Unexpected activation", severity: 3, probability: 1, riskScore: 3, controls: "Lockout/tagout procedures" },
      { step: "Quality inspection", hazard: "Sharp edges on parts", severity: 2, probability: 1, riskScore: 2, controls: "Cut-resistant gloves required" },
    ],
    ppeRequired: ["Safety Glasses", "Cut-resistant Gloves", "Steel-toe Boots"],
    comments: "Daily pre-shift safety briefing completed. All team members signed off.",
    jobDescription: "CNC machine operation and quality inspection of machined parts",
    crewLeader: "Sarah Wilson",
    crewMembers: ["John Smith", "Maria Garcia", "James Brown", "Lisa Chen"],
    checklistCategories: [
      { id: "environment", title: "Work Environment", items: [
        { id: "env1", label: "Area clean and free of debris", status: "pass", notes: "" },
        { id: "env2", label: "Adequate lighting", status: "pass", notes: "" },
        { id: "env3", label: "Ventilation adequate", status: "pass", notes: "" },
        { id: "env4", label: "Emergency exits clear", status: "pass", notes: "" },
      ]},
      { id: "equipment", title: "Equipment Safety", items: [
        { id: "eq1", label: "Machine guards in place", status: "pass", notes: "" },
        { id: "eq2", label: "Emergency stops functional", status: "pass", notes: "Tested all 3 e-stops" },
        { id: "eq3", label: "Lockout/tagout available", status: "pass", notes: "" },
        { id: "eq4", label: "Tools in good condition", status: "pass", notes: "" },
      ]},
      { id: "ppe", title: "Personal Protective Equipment", items: [
        { id: "ppe1", label: "Safety glasses worn", status: "pass", notes: "" },
        { id: "ppe2", label: "Steel-toe boots worn", status: "pass", notes: "" },
        { id: "ppe3", label: "Gloves available", status: "pass", notes: "" },
        { id: "ppe4", label: "Hearing protection if needed", status: "na", notes: "Noise below 85dB" },
      ]},
    ],
    identifiedHazards: "Sharp edges on freshly machined parts, pinch points near machine door",
    controlMeasures: "Cut-resistant gloves required when handling parts. Keep hands clear of closing machine door.",
    stopWorkConditions: "Unusual machine noise, missing guards, spilled coolant, damaged electrical cords",
  },
  "ra5": {
    id: "ra5",
    templateId: "osa",
    template: "OSA - Psykosocial Riskbedömning",
    type: "OSA",
    location: "Malmö Warehouse",
    department: "Lager",
    date: "2024-01-22",
    status: "completed",
    submittedBy: "Anna Svensson",
    reviewedBy: "Lars Eriksson",
    riskLevel: "medium",
    riskScore: 8,
    hazards: [
      { step: "Arbetsbelastning", hazard: "Hög arbetsbelastning under högsäsong", severity: 3, probability: 3, riskScore: 9, controls: "Extra bemanning, tydlig prioritering" },
      { step: "Arbetstider", hazard: "Oregelbundna skift", severity: 2, probability: 3, riskScore: 6, controls: "Schemaläggning i god tid, vila mellan skift" },
      { step: "Socialt stöd", hazard: "Isolerat arbete", severity: 2, probability: 2, riskScore: 4, controls: "Regelbundna teamträffar, mentorskap" },
    ],
    ppeRequired: [],
    comments: "Organisatorisk och social arbetsmiljöbedömning. Fokus på psykosociala faktorer.",
    sections: [
      { id: "workload", title: "Arbetsbelastning", icon: "📊", questions: [
        { id: "wl1", label: "Rimlig arbetsbelastning?", rating: 3, concern: true, notes: "Hög belastning under säsong" },
        { id: "wl2", label: "Krav och resurser i balans?", rating: 3, concern: true, notes: "" },
        { id: "wl3", label: "Möjlighet att påverka arbetet?", rating: 4, concern: false, notes: "" },
        { id: "wl4", label: "Tydliga arbetsuppgifter?", rating: 4, concern: false, notes: "" },
        { id: "wl5", label: "Möjlighet till återhämtning?", rating: 3, concern: true, notes: "Korta raster" },
      ], average: 3.4 },
      { id: "workhours", title: "Arbetstider", icon: "⏰", questions: [
        { id: "wh1", label: "Hälsosamma arbetstider?", rating: 3, concern: true, notes: "" },
        { id: "wh2", label: "Schemaläggs i god tid?", rating: 4, concern: false, notes: "" },
        { id: "wh3", label: "Möjlighet att ta raster?", rating: 3, concern: true, notes: "" },
        { id: "wh4", label: "Tillräcklig vila mellan skift?", rating: 4, concern: false, notes: "" },
      ], average: 3.5 },
      { id: "support", title: "Socialt stöd", icon: "👥", questions: [
        { id: "ss1", label: "Stöd från kollegor", rating: 4, concern: false, notes: "" },
        { id: "ss2", label: "Stöd från chef", rating: 4, concern: false, notes: "" },
        { id: "ss3", label: "Fungerar kommunikationen?", rating: 4, concern: false, notes: "" },
        { id: "ss4", label: "Positivt socialt klimat?", rating: 4, concern: false, notes: "" },
      ], average: 4.0 },
      { id: "harassment", title: "Kränkande särbehandling", icon: "⚠️", questions: [
        { id: "kr1", label: "Förekommer kränkningar?", rating: 5, concern: false, notes: "Nej" },
        { id: "kr2", label: "Finns rutiner för hantering?", rating: 5, concern: false, notes: "Ja" },
      ], average: 5.0 },
    ],
    overallConcerns: "Hög arbetsbelastning under högsäsong och behov av bättre pausplanering.",
    suggestions: "1. Planera in extra bemanning under högsäsong\n2. Se över rastschema\n3. Fortsätt med regelbundna teamträffar",
    concernCount: 5,
    lowRatingCount: 4,
  },
  "ra6": {
    id: "ra6",
    templateId: "arbowet",
    template: "Arbowet Compliance Audit",
    type: "ARBOWET",
    location: "Rotterdam Factory",
    department: "Productie",
    date: "2024-01-20",
    status: "completed",
    submittedBy: "Pieter de Jong",
    reviewedBy: "Maria Bakker",
    riskLevel: "high",
    riskScore: 15,
    hazards: [
      { step: "Art. 5 - RI&E", hazard: "RI&E niet actueel", severity: 5, probability: 3, riskScore: 15, controls: "RI&E bijwerken binnen 3 maanden" },
      { step: "Art. 8 - Voorlichting", hazard: "Onvoldoende veiligheidsinstructies", severity: 3, probability: 3, riskScore: 9, controls: "Trainingsschema opstellen" },
      { step: "Art. 13 - BHV", hazard: "Te weinig BHV'ers", severity: 4, probability: 2, riskScore: 8, controls: "Extra BHV-opleidingen plannen" },
    ],
    ppeRequired: ["Veiligheidshelm", "Veiligheidsschoenen", "Gehoorbescherming"],
    comments: "Arbowet compliance controle. Verbeterpunten geïdentificeerd voor artikelen 5, 8 en 13.",
    articles: [
      { id: "art3", title: "Artikel 3 - Arbobeleid", description: "Arbeidsomstandighedenbeleid", items: [
        { id: "3a", label: "Arbobeleid aanwezig en gedocumenteerd", status: "compliant", evidence: "Beleidsdocument v2024" },
        { id: "3b", label: "Beleid gecommuniceerd naar medewerkers", status: "compliant", evidence: "Intranet + posters" },
        { id: "3c", label: "Beleid wordt regelmatig geëvalueerd", status: "partial", actionNeeded: "Jaarlijkse evaluatie plannen" },
      ]},
      { id: "art5", title: "Artikel 5 - RI&E", description: "Risico-inventarisatie en -evaluatie", items: [
        { id: "5a", label: "RI&E is uitgevoerd", status: "compliant", evidence: "RI&E rapport 2023" },
        { id: "5b", label: "RI&E is actueel (< 1 jaar)", status: "non_compliant", actionNeeded: "RI&E updaten - laatste update 18 maanden geleden" },
        { id: "5c", label: "Plan van Aanpak opgesteld", status: "partial", actionNeeded: "PvA actualiseren" },
        { id: "5d", label: "PvA wordt gevolgd", status: "partial", actionNeeded: "Voortgangsrapportage opzetten" },
      ]},
      { id: "art8", title: "Artikel 8 - Voorlichting en onderricht", description: "Voorlichting en instructie werknemers", items: [
        { id: "8a", label: "Medewerkers geïnformeerd over risico's", status: "partial", actionNeeded: "Toolboxmeetings structureren" },
        { id: "8b", label: "Werkinstructies beschikbaar", status: "non_compliant", actionNeeded: "Werkinstructies opstellen voor alle taken" },
        { id: "8c", label: "Trainingen verzorgd en gedocumenteerd", status: "partial", evidence: "Enkele trainingen gegeven", actionNeeded: "Trainingsmatrix opstellen" },
      ]},
      { id: "art13", title: "Artikel 13 - BHV", description: "Bedrijfshulpverlening", items: [
        { id: "13a", label: "BHV-organisatie opgezet", status: "compliant", evidence: "BHV-plan aanwezig" },
        { id: "13b", label: "Voldoende BHV'ers aanwezig", status: "non_compliant", actionNeeded: "Minimaal 2 extra BHV'ers opleiden" },
        { id: "13c", label: "BHV-materiaal beschikbaar en gecontroleerd", status: "compliant", evidence: "Laatste controle: 15-01-2024" },
        { id: "13d", label: "Ontruimingsoefening gehouden", status: "partial", actionNeeded: "Oefening plannen voor Q1" },
      ]},
      { id: "art14", title: "Artikel 14 - Arbodienst", description: "Deskundige bijstand", items: [
        { id: "14a", label: "Contract met arbodienst", status: "compliant", evidence: "Contract ArboNed" },
        { id: "14b", label: "Bedrijfsarts toegankelijk", status: "compliant", evidence: "Spreekuur 2x/maand" },
        { id: "14c", label: "Basiscontract aanwezig", status: "compliant", evidence: "Basiscontract 2024" },
      ]},
    ],
    complianceScore: 62,
    overallAssessment: "De organisatie voldoet gedeeltelijk aan de Arbowet-vereisten. Er zijn significante verbeterpunten geïdentificeerd, met name rondom de actualiteit van de RI&E en de voorlichting aan medewerkers.",
    priorityActions: "1. RI&E actualiseren (binnen 3 maanden)\n2. Werkinstructies opstellen voor alle taken\n3. Extra BHV'ers opleiden (minimaal 2)\n4. Trainingsmatrix opstellen en implementeren",
    nextAuditDate: "2024-07-20",
  },
};

const submissionTabs: Tab[] = [
  { id: "hazards", label: "Hazards & Risks", icon: AlertTriangle },
  { id: "controls", label: "Controls", icon: ShieldAlert },
];

// Helper to get readable form type name
function getFormTypeName(formType: string): string {
  const names: Record<string, string> = {
    jha: "Job Hazard Analysis (JHA)",
    jsa: "Job Safety Analysis (JSA)",
    rie: "RI&E Assessment",
    arbowet: "Arbowet Compliance Audit",
    sam: "SAM Assessment",
    osa: "OSA Assessment",
  };
  return names[formType.toLowerCase()] || formType;
}

export default function RiskAssessmentDetailPage() {
  const router = useRouter();
  const routeParams = useParams();
  const company = routeParams.company as string;
  const assessmentId = routeParams.assessmentId as string;
  const { t, formatDate } = useTranslation();
  const [activeTab, setActiveTab] = React.useState("hazards");
  const [reviewNotes, setReviewNotes] = React.useState("");
  const { toast } = useToast();

  // Connect to stores
  const { items: riskEvaluations, isLoading, update: updateRiskEvaluation } = useRiskEvaluationsStore();
  const { items: users } = useUsersStore();
  const { items: locations } = useLocationsStore();

  // Check if this is a template or submission view
  // Template IDs are: jha, jsa, rie, arbowet, sam, osa
  // Submission IDs start with "ra" (e.g., ra1, ra2) or could be from the store
  const templateIds = ["jha", "jsa", "rie", "arbowet", "sam", "osa"];
  const isTemplate = templateIds.includes(assessmentId);

  // Try to find the submission in the store first, then fall back to mock data
  const storeEvaluation = riskEvaluations.find(re => re.id === assessmentId);
  
  // Get the submission if viewing a submission
  const submission = !isTemplate ? (storeEvaluation ? {
    id: storeEvaluation.id,
    templateId: storeEvaluation.form_type.toLowerCase(),
    template: getFormTypeName(storeEvaluation.form_type),
    type: storeEvaluation.form_type.toUpperCase(),
    location: locations.find(l => l.id === storeEvaluation.location_id)?.name || "Unknown",
    department: "—",
    date: storeEvaluation.submitted_at.split("T")[0],
    time: storeEvaluation.submitted_at.split("T")[1]?.substring(0, 5) || "",
    status: storeEvaluation.status === "reviewed" ? "completed" : storeEvaluation.status === "submitted" ? "in_progress" : "draft",
    submittedBy: users.find(u => u.id === storeEvaluation.submitter_id)?.full_name || "Unknown",
    reviewedBy: storeEvaluation.reviewed_by ? users.find(u => u.id === storeEvaluation.reviewed_by)?.full_name || "Reviewer" : "Pending",
    riskLevel: "medium" as const,
    riskScore: 0,
    hazards: [] as { step: string; hazard: string; severity: number; probability: number; riskScore: number; controls: string }[],
    ppeRequired: [] as string[],
    comments: "",
    responses: storeEvaluation.responses,
    _storeData: storeEvaluation, // Keep reference to store data
  } : mockSubmissions[assessmentId]) : null;
  
  // Get the template - either directly for template view, or via submission's templateId
  const template = isTemplate 
    ? mockRiskTemplates[assessmentId] 
    : (submission ? mockRiskTemplates[submission.templateId] : null);

  // Get all submissions for this template (for template view)
  const templateSubmissions = isTemplate 
    ? Object.values(mockSubmissions).filter(sub => sub.templateId === assessmentId)
    : [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Template not found</p>
      </div>
    );
  }

  if (!isTemplate && !submission) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Submission not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push(`/${company}/dashboard/checklists?tab=risk-assessment`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold">{template.name}</h1>
              {template.locked && (
                <span className="text-sm text-muted-foreground inline-flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  Standard
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {template.description}
            </p>
            {submission && (
              <div className="flex items-center gap-4 mt-2">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {submission.location}
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <User className="h-3 w-3" /> {submission.submittedBy}
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> {formatDate(submission.date)}
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {submission && (
            <PdfExportButton
              data={{
                id: submission.id,
                templateId: submission.templateId,
                templateType: submission.type as "JHA" | "JSA" | "RIE" | "ARBOWET" | "SAM" | "OSA",
                companyName: currentCompany.name,
                location: submission.location,
                department: submission.department,
                date: submission.date,
                time: "time" in submission ? (submission.time as string) : undefined,
                submittedBy: submission.submittedBy,
                reviewedBy: typeof submission.reviewedBy === "string" ? submission.reviewedBy : undefined,
                hazards: submission.hazards,
                ppeRequired: submission.ppeRequired,
                additionalNotes: submission.comments,
                // These optional fields only exist on mock submissions, not store data
                jobDescription: "jobDescription" in submission ? (submission.jobDescription as string) : undefined,
                crewLeader: "crewLeader" in submission ? (submission.crewLeader as string) : undefined,
                crewMembers: "crewMembers" in submission ? (submission.crewMembers as string[]) : undefined,
                checklistCategories: "checklistCategories" in submission ? submission.checklistCategories : undefined,
                identifiedHazards: "identifiedHazards" in submission ? submission.identifiedHazards : undefined,
                controlMeasures: "controlMeasures" in submission ? submission.controlMeasures : undefined,
                stopWorkConditions: "stopWorkConditions" in submission ? submission.stopWorkConditions : undefined,
                risks: "risks" in submission ? submission.risks : undefined,
                actionPlan: "actionPlan" in submission ? submission.actionPlan : undefined,
                articles: "articles" in submission ? submission.articles : undefined,
                complianceScore: "complianceScore" in submission ? (submission.complianceScore as number) : undefined,
                overallAssessment: "overallAssessment" in submission ? (submission.overallAssessment as string) : undefined,
                priorityActions: "priorityActions" in submission ? (submission.priorityActions as string) : undefined,
                nextAuditDate: "nextAuditDate" in submission ? (submission.nextAuditDate as string) : undefined,
                organizationalFactors: "organizationalFactors" in submission ? submission.organizationalFactors : undefined,
                socialFactors: "socialFactors" in submission ? submission.socialFactors : undefined,
                sections: "sections" in submission ? submission.sections : undefined,
                overallConcerns: "overallConcerns" in submission ? (submission.overallConcerns as string) : undefined,
                suggestions: "suggestions" in submission ? (submission.suggestions as string) : undefined,
                concernCount: "concernCount" in submission ? (submission.concernCount as number) : undefined,
                lowRatingCount: "lowRatingCount" in submission ? (submission.lowRatingCount as number) : undefined,
              }}
            />
          )}
          {/* Approval buttons for submitted assessments from store */}
          {submission && "_storeData" in submission && submission._storeData && submission._storeData.status === "submitted" && (
            <>
              <Button 
                variant="outline" 
                className="gap-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => {
                  if ("_storeData" in submission && submission._storeData) {
                    updateRiskEvaluation(submission._storeData.id, {
                      status: "draft", // Send back for revision
                    });
                    toast("Assessment returned for revision.", "info");
                  }
                }}
              >
                <XCircle className="h-4 w-4" /> Request Revision
              </Button>
              <Button 
                className="gap-2"
                onClick={() => {
                  if ("_storeData" in submission && submission._storeData) {
                    updateRiskEvaluation(submission._storeData.id, {
                      status: "reviewed",
                      reviewed_by: "current-user", // In production: get from auth
                      reviewed_at: new Date().toISOString(),
                    });
                    toast("Assessment approved successfully.", "success");
                  }
                }}
              >
                <CheckCircle className="h-4 w-4" /> Approve
              </Button>
            </>
          )}
          {/* Show reviewed badge for already reviewed assessments */}
          {submission && "_storeData" in submission && submission._storeData && submission._storeData.status === "reviewed" && (
            <Badge variant="success" className="gap-1 py-1.5 px-3">
              <CheckCircle className="h-3 w-3" /> Approved
            </Badge>
          )}
          {isTemplate && (
            <Button className="gap-2">
              <FileCheck className="h-4 w-4" /> Start Assessment
            </Button>
          )}
        </div>
      </div>

      {/* Submission Status Card */}
      {submission && (
        <Card className={submission.riskLevel === "high" ? "border-destructive/50" : submission.riskLevel === "medium" ? "border-warning/50" : "border-success/50"}>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-full ${submission.riskLevel === "high" ? "bg-destructive/10" : submission.riskLevel === "medium" ? "bg-warning/10" : "bg-success/10"}`}>
                  <ShieldAlert className={`h-6 w-6 ${submission.riskLevel === "high" ? "text-destructive" : submission.riskLevel === "medium" ? "text-warning" : "text-success"}`} />
                </div>
                <div>
                  <p className="font-medium">Risk Assessment Result</p>
                  <p className="text-sm text-muted-foreground">{submission.hazards.length} hazards identified</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-2xl font-bold">{submission.riskScore}</p>
                  <p className="text-xs text-muted-foreground">Risk Score</p>
                </div>
                <span className="text-sm font-medium text-muted-foreground">
                  {submission.riskLevel.toUpperCase()} RISK
                </span>
                <span className="text-sm text-muted-foreground">
                  {submission.status === "completed" ? t("checklists.labels.completed") : submission.status === "in_progress" ? t("checklists.labels.inProgress") : t("checklists.labels.pending")}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs - Only for submissions */}
      {submission && (
        <DetailTabs 
          tabs={submissionTabs} 
          activeTab={activeTab} 
          onTabChange={setActiveTab} 
        />
      )}

      {/* Template View - Form Structure (no submissions list here, they're in main list) */}
      {isTemplate && (
        <div className="space-y-4">
          {template.sections.map((section, sectionIdx) => (
            <Card key={sectionIdx}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                    {sectionIdx + 1}
                  </span>
                  <div>
                    <CardTitle className="text-base">{section.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{section.description}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {section.fields.map((field, fieldIdx) => (
                    <div key={fieldIdx} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground">{fieldIdx + 1}.</span>
                        <span className="font-medium">{field.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs capitalize">{field.type.replace("_", " ")}</Badge>
                        {field.required && <Badge variant="secondary" className="text-xs">Required</Badge>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Submission View - Hazards */}
      {submission && activeTab === "hazards" && (
        <div className="space-y-4">
          {submission.hazards.map((hazard, idx) => (
            <Card key={idx} className={hazard.riskScore >= 12 ? "border-destructive/50" : hazard.riskScore >= 6 ? "border-warning/50" : ""}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-medium">
                      {idx + 1}
                    </span>
                    <div>
                      <CardTitle className="text-base">{hazard.step}</CardTitle>
                      <p className="text-sm text-muted-foreground">{hazard.hazard}</p>
                    </div>
                  </div>
                  <Badge variant={hazard.riskScore >= 12 ? "destructive" : hazard.riskScore >= 6 ? "warning" : "success"} className="text-lg px-4 py-1">
                    {hazard.riskScore}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-3 mb-4">
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <p className="text-xs text-muted-foreground">{t("incidents.labels.severity")}</p>
                    <p className="text-xl font-bold">{hazard.severity}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <p className="text-xs text-muted-foreground">Probability</p>
                    <p className="text-xl font-bold">{hazard.probability}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <p className="text-xs text-muted-foreground">Risk Score</p>
                    <p className="text-xl font-bold">{hazard.severity} × {hazard.probability} = {hazard.riskScore}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Control Measures</p>
                  <p className="mt-1">{hazard.controls}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Submission View - Controls */}
      {submission && activeTab === "controls" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Control Measures Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {submission.hazards.map((hazard, idx) => (
                  <div key={idx} className="p-4 rounded-lg border">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium">{hazard.step}</p>
                      <Badge variant={hazard.riskScore >= 12 ? "destructive" : hazard.riskScore >= 6 ? "warning" : "success"}>
                        Risk: {hazard.riskScore}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{hazard.controls}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Required PPE</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {submission.ppeRequired.map((ppe, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 rounded-lg border">
                    <CheckCircle className="h-5 w-5 text-success" />
                    <span>{ppe}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
