"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Wrench,
  Info,
  ListChecks,
  FileText,
  Settings,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  User,
  MapPin,
  Calendar,
  Plus,
  Trash2,
  GripVertical,
  Copy,
  Eye,
  Download,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DetailTabs, Tab } from "@/components/ui/detail-tabs";
import { BarChart } from "@/components/charts";
import { useTranslation } from "@/i18n";

// Mock inspection template data
const mockInspectionTemplates: Record<string, {
  id: string;
  name: string;
  category: string;
  description: string;
  checkpoints: { id: string; text: string; type: string; required: boolean; category?: string }[];
  usedCount: number;
  lastUpdated: string;
}> = {
  "it1": {
    id: "it1",
    name: "Heavy Machinery Inspection",
    category: "machinery",
    description: "Comprehensive check for forklifts, cranes, and industrial equipment",
    usedCount: 145,
    lastUpdated: "2024-01-20",
    checkpoints: [
      { id: "1", text: "Check hydraulic fluid levels", type: "pass_fail", required: true, category: "Fluids" },
      { id: "2", text: "Inspect hydraulic hoses for leaks", type: "pass_fail", required: true, category: "Fluids" },
      { id: "3", text: "Test service brakes", type: "pass_fail", required: true, category: "Brakes" },
      { id: "4", text: "Test parking brake", type: "pass_fail", required: true, category: "Brakes" },
      { id: "5", text: "Check steering mechanism", type: "pass_fail", required: true, category: "Controls" },
      { id: "6", text: "Test horn/warning devices", type: "pass_fail", required: true, category: "Safety" },
      { id: "7", text: "Check mirrors and visibility", type: "pass_fail", required: true, category: "Safety" },
      { id: "8", text: "Inspect tires/wheels condition", type: "pass_fail", required: true, category: "Wheels" },
      { id: "9", text: "Test lights (front, rear, warning)", type: "pass_fail", required: true, category: "Electrical" },
      { id: "10", text: "Check backup alarm", type: "pass_fail", required: true, category: "Safety" },
      { id: "11", text: "Inspect forks/attachment condition", type: "pass_fail", required: true, category: "Attachments" },
      { id: "12", text: "Check overhead guard integrity", type: "pass_fail", required: true, category: "Structure" },
      { id: "13", text: "Verify load capacity plate visible", type: "pass_fail", required: true, category: "Documentation" },
      { id: "14", text: "Test seatbelt functionality", type: "pass_fail", required: true, category: "Safety" },
      { id: "15", text: "Check fire extinguisher present", type: "pass_fail", required: true, category: "Safety" },
      { id: "16", text: "Inspect engine oil level", type: "pass_fail", required: true, category: "Fluids" },
      { id: "17", text: "Check coolant level", type: "pass_fail", required: true, category: "Fluids" },
      { id: "18", text: "Test all controls operate smoothly", type: "pass_fail", required: true, category: "Controls" },
      { id: "19", text: "Check for unusual noises", type: "yes_no", required: true, category: "General" },
      { id: "20", text: "Verify operator manual available", type: "pass_fail", required: false, category: "Documentation" },
      { id: "21", text: "Check fuel level", type: "text", required: false, category: "Fluids" },
      { id: "22", text: "Record hour meter reading", type: "text", required: true, category: "Documentation" },
      { id: "23", text: "Note any damage or defects", type: "textarea", required: false, category: "General" },
      { id: "24", text: "Upload photos of issues (if any)", type: "photo", required: false, category: "Documentation" },
    ],
  },
  "it2": {
    id: "it2",
    name: "Vehicle Pre-Trip Inspection",
    category: "vehicle",
    description: "DOT-compliant pre-trip inspection for commercial vehicles",
    usedCount: 256,
    lastUpdated: "2024-01-22",
    checkpoints: [
      { id: "1", text: "Check engine oil level", type: "pass_fail", required: true },
      { id: "2", text: "Inspect coolant level", type: "pass_fail", required: true },
      { id: "3", text: "Check brake fluid", type: "pass_fail", required: true },
      { id: "4", text: "Test all lights", type: "pass_fail", required: true },
      { id: "5", text: "Check tire pressure and condition", type: "pass_fail", required: true },
      { id: "6", text: "Test brakes", type: "pass_fail", required: true },
      { id: "7", text: "Check mirrors", type: "pass_fail", required: true },
      { id: "8", text: "Test horn", type: "pass_fail", required: true },
      { id: "9", text: "Check windshield wipers", type: "pass_fail", required: true },
      { id: "10", text: "Verify fire extinguisher", type: "pass_fail", required: true },
      { id: "11", text: "Check first aid kit", type: "pass_fail", required: true },
      { id: "12", text: "Inspect cargo securement", type: "pass_fail", required: true },
      { id: "13", text: "Record odometer reading", type: "text", required: true },
      { id: "14", text: "Note any defects", type: "textarea", required: false },
    ],
  },
  "it3": {
    id: "it3",
    name: "Fire Safety Equipment Check",
    category: "fire_safety",
    description: "Extinguishers, alarms, sprinklers, and emergency lighting",
    usedCount: 189,
    lastUpdated: "2024-01-18",
    checkpoints: [
      { id: "1", text: "Fire extinguisher present and accessible", type: "pass_fail", required: true },
      { id: "2", text: "Pressure gauge in green zone", type: "pass_fail", required: true },
      { id: "3", text: "Safety pin and seal intact", type: "pass_fail", required: true },
      { id: "4", text: "No visible damage or corrosion", type: "pass_fail", required: true },
      { id: "5", text: "Inspection tag current", type: "pass_fail", required: true },
      { id: "6", text: "Mounting bracket secure", type: "pass_fail", required: true },
      { id: "7", text: "Emergency exit signs illuminated", type: "pass_fail", required: true },
      { id: "8", text: "Emergency lights functional", type: "pass_fail", required: true },
      { id: "9", text: "Fire alarm test (monthly)", type: "pass_fail", required: false },
      { id: "10", text: "Record inspection date", type: "date", required: true },
    ],
  },
  "it4": {
    id: "it4",
    name: "PPE Inspection",
    category: "ppe",
    description: "Personal protective equipment condition and availability check",
    usedCount: 234,
    lastUpdated: "2024-01-25",
    checkpoints: [
      { id: "1", text: "Hard hats available and in good condition", type: "pass_fail", required: true, category: "Head Protection" },
      { id: "2", text: "No cracks, dents, or damage to shells", type: "pass_fail", required: true, category: "Head Protection" },
      { id: "3", text: "Suspension systems intact", type: "pass_fail", required: true, category: "Head Protection" },
      { id: "4", text: "Safety glasses available and clean", type: "pass_fail", required: true, category: "Eye Protection" },
      { id: "5", text: "No scratches obstructing vision", type: "pass_fail", required: true, category: "Eye Protection" },
      { id: "6", text: "Face shields in good condition", type: "pass_fail", required: false, category: "Eye Protection" },
      { id: "7", text: "Hearing protection available", type: "pass_fail", required: true, category: "Hearing Protection" },
      { id: "8", text: "Ear plugs/muffs clean and functional", type: "pass_fail", required: true, category: "Hearing Protection" },
      { id: "9", text: "Safety gloves available by type", type: "pass_fail", required: true, category: "Hand Protection" },
      { id: "10", text: "No tears, holes, or chemical degradation", type: "pass_fail", required: true, category: "Hand Protection" },
      { id: "11", text: "Safety boots available", type: "pass_fail", required: true, category: "Foot Protection" },
      { id: "12", text: "Steel toe caps undamaged", type: "pass_fail", required: true, category: "Foot Protection" },
      { id: "13", text: "Non-slip soles intact", type: "pass_fail", required: true, category: "Foot Protection" },
      { id: "14", text: "High-visibility vests available", type: "pass_fail", required: true, category: "Visibility" },
      { id: "15", text: "Reflective strips intact", type: "pass_fail", required: true, category: "Visibility" },
      { id: "16", text: "PPE storage area clean and organized", type: "pass_fail", required: true, category: "Storage" },
    ],
  },
  "it5": {
    id: "it5",
    name: "Electrical Equipment Inspection",
    category: "electrical",
    description: "Portable electrical tools and fixed electrical installation checks",
    usedCount: 98,
    lastUpdated: "2024-01-22",
    checkpoints: [
      { id: "1", text: "Power cords free of damage or fraying", type: "pass_fail", required: true, category: "Cables & Cords" },
      { id: "2", text: "Plugs secure and no exposed wires", type: "pass_fail", required: true, category: "Cables & Cords" },
      { id: "3", text: "Ground prongs intact (3-prong plugs)", type: "pass_fail", required: true, category: "Cables & Cords" },
      { id: "4", text: "Extension cords properly rated", type: "pass_fail", required: true, category: "Cables & Cords" },
      { id: "5", text: "No daisy-chaining of extension cords", type: "pass_fail", required: true, category: "Cables & Cords" },
      { id: "6", text: "GFCI outlets functional", type: "pass_fail", required: true, category: "Outlets & Panels" },
      { id: "7", text: "Outlet covers in place", type: "pass_fail", required: true, category: "Outlets & Panels" },
      { id: "8", text: "Electrical panels accessible (3ft clearance)", type: "pass_fail", required: true, category: "Outlets & Panels" },
      { id: "9", text: "Panel doors closed and latched", type: "pass_fail", required: true, category: "Outlets & Panels" },
      { id: "10", text: "Circuit breakers labeled", type: "pass_fail", required: true, category: "Outlets & Panels" },
      { id: "11", text: "Power tools have valid PAT test date", type: "pass_fail", required: true, category: "Portable Tools" },
      { id: "12", text: "Tool housings undamaged", type: "pass_fail", required: true, category: "Portable Tools" },
      { id: "13", text: "Switches functioning properly", type: "pass_fail", required: true, category: "Portable Tools" },
      { id: "14", text: "Guards and safety features intact", type: "pass_fail", required: true, category: "Portable Tools" },
      { id: "15", text: "Record last PAT test date", type: "date", required: true, category: "Documentation" },
    ],
  },
  "it6": {
    id: "it6",
    name: "Scaffolding Inspection",
    category: "scaffolding",
    description: "Scaffold structure and safety compliance before use",
    usedCount: 67,
    lastUpdated: "2024-01-19",
    checkpoints: [
      { id: "1", text: "Scaffold erected by competent person", type: "yes_no", required: true, category: "Erection" },
      { id: "2", text: "Valid scaffold tag displayed", type: "pass_fail", required: true, category: "Erection" },
      { id: "3", text: "Base plates/mud sills properly installed", type: "pass_fail", required: true, category: "Base & Foundation" },
      { id: "4", text: "Base on firm, level ground", type: "pass_fail", required: true, category: "Base & Foundation" },
      { id: "5", text: "Screw jacks properly extended", type: "pass_fail", required: true, category: "Base & Foundation" },
      { id: "6", text: "All braces in place", type: "pass_fail", required: true, category: "Structure" },
      { id: "7", text: "Connections secure (no missing pins/clips)", type: "pass_fail", required: true, category: "Structure" },
      { id: "8", text: "Vertical members plumb", type: "pass_fail", required: true, category: "Structure" },
      { id: "9", text: "Planks properly secured", type: "pass_fail", required: true, category: "Platforms" },
      { id: "10", text: "Platforms fully decked", type: "pass_fail", required: true, category: "Platforms" },
      { id: "11", text: "No excessive gaps between planks", type: "pass_fail", required: true, category: "Platforms" },
      { id: "12", text: "Top rail at 42 inches (±3)", type: "pass_fail", required: true, category: "Guardrails" },
      { id: "13", text: "Mid rail installed", type: "pass_fail", required: true, category: "Guardrails" },
      { id: "14", text: "Toe boards in place", type: "pass_fail", required: true, category: "Guardrails" },
      { id: "15", text: "Safe access ladder provided", type: "pass_fail", required: true, category: "Access" },
      { id: "16", text: "Ladder secured and extends 3ft above platform", type: "pass_fail", required: true, category: "Access" },
      { id: "17", text: "Scaffold ties to structure (if over 26ft)", type: "pass_fail", required: false, category: "Tie-Offs" },
      { id: "18", text: "Clearance from electrical lines (min 10ft)", type: "pass_fail", required: true, category: "Electrical" },
    ],
  },
};

// Mock inspection submission
const mockInspectionSubmission = {
  id: "ins1",
  templateId: "it1",
  template: "Heavy Machinery Inspection",
  asset: "Forklift FL-001",
  assetId: "asset1",
  location: "Warehouse A",
  date: "2024-01-28",
  time: "08:30 AM",
  status: "passed",
  inspector: "John Doe",
  nextDue: "2024-02-28",
  results: [
    { checkpointId: "1", result: "pass", notes: "" },
    { checkpointId: "2", result: "pass", notes: "" },
    { checkpointId: "3", result: "pass", notes: "" },
    { checkpointId: "4", result: "pass", notes: "" },
    { checkpointId: "5", result: "pass", notes: "" },
    { checkpointId: "6", result: "pass", notes: "" },
    { checkpointId: "7", result: "pass", notes: "" },
    { checkpointId: "8", result: "pass", notes: "Minor wear on front left tire - monitor" },
    { checkpointId: "9", result: "pass", notes: "" },
    { checkpointId: "10", result: "pass", notes: "" },
    { checkpointId: "11", result: "pass", notes: "" },
    { checkpointId: "12", result: "pass", notes: "" },
    { checkpointId: "13", result: "pass", notes: "" },
    { checkpointId: "14", result: "pass", notes: "" },
    { checkpointId: "15", result: "pass", notes: "" },
    { checkpointId: "16", result: "pass", notes: "" },
    { checkpointId: "17", result: "pass", notes: "" },
    { checkpointId: "18", result: "pass", notes: "" },
    { checkpointId: "19", result: "no", notes: "" },
    { checkpointId: "20", result: "pass", notes: "" },
    { checkpointId: "21", result: "75%", notes: "" },
    { checkpointId: "22", result: "4,523 hrs", notes: "" },
    { checkpointId: "23", result: "Minor cosmetic scratches on body panels", notes: "" },
    { checkpointId: "24", result: "N/A", notes: "" },
  ],
  issues: 0,
  generalNotes: "Equipment in good working condition. Recommend monitoring tire wear.",
};

const templateTabs: Tab[] = [
  { id: "details", label: "Details", icon: Info },
  { id: "checkpoints", label: "Checkpoints", icon: ListChecks },
  { id: "submissions", label: "Submissions", icon: FileText },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "settings", label: "Settings", icon: Settings, variant: "danger" },
];

const submissionTabs: Tab[] = [
  { id: "overview", label: "Overview", icon: Info },
  { id: "results", label: "Inspection Results", icon: ListChecks },
];

export default function InspectionDetailPage() {
  const router = useRouter();
  const routeParams = useParams();
  const company = routeParams.company as string;
  const inspectionId = routeParams.inspectionId as string;
  const { t, formatDate } = useTranslation();
  const [activeTab, setActiveTab] = React.useState("details");
  const [isEditing, setIsEditing] = React.useState(false);

  // Determine if viewing template or submission
  const isTemplate = inspectionId.startsWith("it");
  const template = isTemplate 
    ? mockInspectionTemplates[inspectionId] 
    : mockInspectionTemplates[mockInspectionSubmission.templateId];
  const submission = !isTemplate ? mockInspectionSubmission : null;

  if (!template) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Template not found</p>
      </div>
    );
  }

  const inspectionTrend = React.useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
    const total = template.usedCount ?? 0;
    const base = Math.floor(total / months.length);
    const remainder = total % months.length;
    return months.map((name, index) => ({
      name,
      inspections: base + (index < remainder ? 1 : 0),
    }));
  }, [template.usedCount]);

  // Group checkpoints by category
  const groupedCheckpoints = template.checkpoints.reduce((acc, checkpoint) => {
    const cat = checkpoint.category || "General";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(checkpoint);
    return acc;
  }, {} as Record<string, typeof template.checkpoints>);

  const passCount = submission?.results.filter(r => r.result === "pass" || r.result === "yes").length || 0;
  const failCount = submission?.results.filter(r => r.result === "fail" || r.result === "no").length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push(`/${company}/dashboard/checklists?tab=inspection`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold">{isTemplate ? template.name : submission?.asset}</h1>
              {submission && (
                <span className="text-sm text-muted-foreground">
                  {submission.status}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {isTemplate ? (
                <>
                  {template.checkpoints.length} checkpoints • {template.usedCount} inspections completed
                </>
              ) : (
                <>
                  {template.name} • {submission?.location} • {submission?.date ? formatDate(submission.date) : ""}
                </>
              )}
            </p>
            {submission && (
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" /> {submission.inspector}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {submission.time}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Next due: {formatDate(submission.nextDue)}
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {submission && (
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" /> Export
            </Button>
          )}
          {isTemplate && (
            <>
              <Button variant="outline" className="gap-2">
                <Copy className="h-4 w-4" /> Duplicate
              </Button>
              <Button variant="outline" className="gap-2">
                <Eye className="h-4 w-4" /> Preview
              </Button>
              {isEditing ? (
                <>
                  <Button variant="outline" onClick={() => setIsEditing(false)}>{t("common.cancel")}</Button>
                  <Button>{t("common.save")}</Button>
                </>
              ) : (
                <Button onClick={() => setIsEditing(true)}>{t("common.edit")}</Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Submission Result Summary */}
      {submission && (
        <Card className={submission.status === "passed" ? "border-success/50 bg-success/5" : "border-destructive/50 bg-destructive/5"}>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-full ${submission.status === "passed" ? "bg-success/10" : "bg-destructive/10"}`}>
                  {submission.status === "passed" ? (
                    <CheckCircle className="h-6 w-6 text-success" />
                  ) : (
                    <XCircle className="h-6 w-6 text-destructive" />
                  )}
                </div>
                <div>
                  <p className="font-medium">Inspection {submission.status === "passed" ? "Passed" : "Failed"}</p>
                  <p className="text-sm text-muted-foreground">
                    {passCount} passed, {failCount} failed, {submission.results.length - passCount - failCount} other
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-success">{passCount}</p>
                  <p className="text-xs text-muted-foreground">Passed</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-destructive">{failCount}</p>
                  <p className="text-xs text-muted-foreground">Failed</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{submission.issues}</p>
                  <p className="text-xs text-muted-foreground">Issues</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <DetailTabs 
        tabs={isTemplate ? templateTabs : submissionTabs} 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
      />

      {/* Template - Details Tab */}
      {isTemplate && activeTab === "details" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Template Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">{t("incidents.labels.description")}</p>
                  <p className="mt-1">{template.description}</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Category</p>
                    <span className="text-sm text-muted-foreground mt-1 capitalize">{template.category.replace("_", " ")}</span>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Checkpoints</p>
                    <p className="font-medium">{template.checkpoints.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Times Used</p>
                    <p className="font-medium">{template.usedCount}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Last Updated</p>
                    <p className="font-medium">{formatDate(template.lastUpdated)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Checkpoint Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2">
                  {Object.entries(groupedCheckpoints).map(([category, items]) => (
                    <div key={category} className="flex items-center justify-between p-3 rounded-lg border">
                      <span className="font-medium">{category}</span>
                      <Badge variant="secondary">{items.length}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="bg-muted/30">
              <CardContent className="pt-6 text-center">
                <div className="p-4 rounded-full bg-primary/10 w-fit mx-auto mb-4">
                  <Wrench className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold text-lg">Start Inspection</h3>
                <p className="text-sm text-muted-foreground mt-2 mb-4">
                  Begin a new inspection using this template
                </p>
                <Button className="w-full">Start Inspection</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Pass Rate</span>
                  <span className="font-medium">94%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Avg. Time</span>
                  <span className="font-medium">12 min</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">This Month</span>
                  <span className="font-medium">23</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Template - Checkpoints Tab */}
      {isTemplate && activeTab === "checkpoints" && (
        <div className="space-y-6">
          {Object.entries(groupedCheckpoints).map(([category, items]) => (
            <Card key={category}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">{category}</CardTitle>
                <span className="text-sm text-muted-foreground">{items.length} {t("checklists.labels.items")}</span>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {items.map((checkpoint, idx) => (
                    <div key={checkpoint.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 group">
                      {isEditing && <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />}
                      <span className="text-sm text-muted-foreground w-6">{idx + 1}.</span>
                      <div className="flex-1">
                        {isEditing ? (
                          <Input defaultValue={checkpoint.text} className="border-0 bg-transparent p-0 h-auto focus-visible:ring-0" />
                        ) : (
                          <span>{checkpoint.text}</span>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs capitalize">{checkpoint.type.replace("_", " ")}</Badge>
                      {checkpoint.required && <Badge variant="secondary" className="text-xs">Required</Badge>}
                      {isEditing && (
                        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                {isEditing && (
                  <Button variant="outline" className="w-full mt-4 gap-2">
                    <Plus className="h-4 w-4" /> Add Checkpoint
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Template - Submissions Tab */}
      {isTemplate && activeTab === "submissions" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Inspections</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-3 font-medium">Asset</th>
                  <th className="pb-3 font-medium">Inspector</th>
                  <th className="pb-3 font-medium">{t("incidents.labels.date")}</th>
                  <th className="pb-3 font-medium">Result</th>
                  <th className="pb-3 font-medium">Issues</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b last:border-0 hover:bg-muted/50 cursor-pointer">
                  <td className="py-3 font-medium">{mockInspectionSubmission.asset}</td>
                  <td className="py-3 text-muted-foreground">{mockInspectionSubmission.inspector}</td>
                  <td className="py-3 text-muted-foreground">{formatDate(mockInspectionSubmission.date)}</td>
                  <td className="py-3">
                    <Badge variant={mockInspectionSubmission.status === "passed" ? "success" : "destructive"}>
                      {mockInspectionSubmission.status}
                    </Badge>
                  </td>
                  <td className="py-3">{mockInspectionSubmission.issues}</td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Template - Analytics Tab */}
      {isTemplate && activeTab === "analytics" && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Total Inspections</p>
                <p className="text-2xl font-semibold">{template.usedCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Pass Rate</p>
                <p className="text-2xl font-semibold text-success">94%</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Avg. Completion Time</p>
                <p className="text-2xl font-semibold">12 min</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">This Week</p>
                <p className="text-2xl font-semibold">8</p>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Inspections Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              {inspectionTrend.some((point) => point.inspections > 0) ? (
                <BarChart data={inspectionTrend} dataKey="inspections" xAxisKey="name" height={180} />
              ) : (
                <div className="flex h-48 items-center justify-center text-muted-foreground">
                  <BarChart3 className="h-12 w-12" />
                  <p className="ml-4">No inspections recorded yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Template - Settings Tab */}
      {isTemplate && activeTab === "settings" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Template Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium" htmlFor="template-status">Status</label>
                <select id="template-status" title="Select status" aria-label="Select status" className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium" htmlFor="inspection-frequency">Inspection Frequency</label>
                <select id="inspection-frequency" title="Select inspection frequency" aria-label="Select inspection frequency" className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                </select>
              </div>
            </CardContent>
          </Card>

          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-base text-destructive">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Delete Template</p>
                  <p className="text-sm text-muted-foreground">Permanently delete this template</p>
                </div>
                <Button variant="destructive" className="gap-2">
                  <Trash2 className="h-4 w-4" /> {t("common.delete")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Submission - Overview Tab */}
      {submission && activeTab === "overview" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Inspection Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Asset</p>
                    <p className="font-medium flex items-center gap-2 mt-1">
                      <Wrench className="h-4 w-4" /> {submission.asset}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t("incidents.labels.location")}</p>
                    <p className="font-medium flex items-center gap-2 mt-1">
                      <MapPin className="h-4 w-4" /> {submission.location}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Date & Time</p>
                    <p className="font-medium flex items-center gap-2 mt-1">
                      <Calendar className="h-4 w-4" /> {formatDate(submission.date)} at {submission.time}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Inspector</p>
                    <p className="font-medium flex items-center gap-2 mt-1">
                      <User className="h-4 w-4" /> {submission.inspector}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Template Used</p>
                    <p className="font-medium">{submission.template}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Next Due</p>
                    <p className="font-medium flex items-center gap-2 mt-1">
                      <Clock className="h-4 w-4" /> {formatDate(submission.nextDue)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">General Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p>{submission.generalNotes}</p>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Result Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-success" /> Passed
                  </span>
                  <span className="font-medium">{passCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-destructive" /> Failed
                  </span>
                  <span className="font-medium">{failCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-warning" /> Issues Noted
                  </span>
                  <span className="font-medium">{submission.issues}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Submission - Results Tab */}
      {submission && activeTab === "results" && (
        <div className="space-y-6">
          {Object.entries(groupedCheckpoints).map(([category, items]) => (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="text-base">{category}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {items.map((checkpoint) => {
                    const result = submission.results.find(r => r.checkpointId === checkpoint.id);
                    const isPassed = result?.result === "pass" || result?.result === "yes";
                    const isFailed = result?.result === "fail" || result?.result === "no";
                    return (
                      <div key={checkpoint.id} className="flex items-start gap-3 p-3 rounded-lg border">
                        <div className="mt-0.5">
                          {isPassed ? (
                            <CheckCircle className="h-5 w-5 text-success" />
                          ) : isFailed ? (
                            <XCircle className="h-5 w-5 text-destructive" />
                          ) : (
                            <div className="h-5 w-5 rounded-full border-2 border-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{checkpoint.text}</p>
                          {result?.notes && (
                            <p className="text-sm text-muted-foreground mt-1">{result.notes}</p>
                          )}
                          {!isPassed && !isFailed && result?.result && (
                            <p className="text-sm font-medium mt-1">{result.result}</p>
                          )}
                        </div>
                        <Badge variant={isPassed ? "success" : isFailed ? "destructive" : "outline"} className="capitalize">
                          {result?.result || "N/A"}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
