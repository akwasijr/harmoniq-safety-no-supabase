"use client";

import * as React from "react";
import Link from "next/link";
import { useCompanyParam } from "@/hooks/use-company-param";
import { ClipboardCheck, Library, Plus, Search, ShieldAlert, Layers, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useCompanyData } from "@/hooks/use-company-data";
import { useAuth } from "@/hooks/use-auth";
import { useCompanyStore } from "@/stores/company-store";
import { useTranslation } from "@/i18n";
import { RoleGuard } from "@/components/auth/role-guard";
import { getTemplatePublishStatus } from "@/lib/template-activation";
import { WORK_ORDER_PROCEDURE_TEMPLATES } from "@/data/work-order-procedure-templates";
import { getBuiltInProcedureTemplates } from "@/data/procedure-templates";
import type { ChecklistTemplate } from "@/types";

type MainTab = "checklists" | "assessments" | "procedures";
type SubTab = "active" | "all" | "drafts";

const RISK_FORMS = [
  { id: "jha", name: "Job Hazard Analysis (JHA)", region: "US", regulation: "OSHA" },
  { id: "jsa", name: "Job Safety Analysis (JSA)", region: "US", regulation: "OSHA" },
  { id: "rie", name: "RI&E Assessment", region: "NL", regulation: "Arbowet Art. 5" },
  { id: "arbowet", name: "Arbowet Compliance Audit", region: "NL", regulation: "Arbowet" },
  { id: "sam", name: "SAM Assessment", region: "SE", regulation: "AFS 2001:1" },
  { id: "osa", name: "OSA Assessment", region: "SE", regulation: "AFS" },
];

function Toggle({ active, onChange }: { active: boolean; onChange: () => void }) {
  return (
    <button type="button" onClick={onChange} className={cn("relative inline-flex h-6 w-11 items-center rounded-full transition-colors", active ? "bg-primary" : "bg-muted")}>
      <span className={cn("inline-block h-4 w-4 transform rounded-full bg-white transition-transform", active ? "translate-x-6" : "translate-x-1")} />
    </button>
  );
}

function MyTemplatesContent() {
  const company = useCompanyParam();
  const { t } = useTranslation();
  const { currentCompany } = useAuth();
  const { update: updateCompany } = useCompanyStore();
  const { checklistTemplates: templates, procedureTemplates, stores } = useCompanyData();
  const { update: updateTemplate, remove: removeTemplate } = stores.checklistTemplates;
  const { update: updateProcedure } = stores.procedureTemplates;

  const [mainTab, setMainTab] = React.useState<MainTab>("checklists");
  const [subTab, setSubTab] = React.useState<SubTab>("active");
  const [searchQuery, setSearchQuery] = React.useState("");

  // Reset sub-tab when main tab changes
  React.useEffect(() => { setSubTab("active"); setSearchQuery(""); }, [mainTab]);

  const isPublished = (tpl: ChecklistTemplate) => getTemplatePublishStatus(tpl) === "published";
  const isDraft = (tpl: ChecklistTemplate) => getTemplatePublishStatus(tpl) === "draft";
  const togglePublish = (tpl: ChecklistTemplate) => {
    const next = isPublished(tpl) ? "draft" : "published";
    updateTemplate(tpl.id, { publish_status: next, is_active: next === "published" });
  };

  const activeChecklists = templates.filter(isPublished);
  const draftChecklists = templates.filter(isDraft);
  const filteredChecklists = templates.filter((tpl) => !searchQuery || tpl.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const hiddenTypes = currentCompany?.hidden_assessment_types || [];

  const builtInProcs = getBuiltInProcedureTemplates().filter((p) => !p.industry || p.industry === currentCompany?.industry);
  const allProcedures = [...procedureTemplates, ...builtInProcs.filter((b) => !procedureTemplates.some((p) => p.id === b.id))];
  const activeProcedures = allProcedures.filter((p) => p.is_active);

  // Main tabs config
  const mainTabs: { id: MainTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "checklists", label: "Checklists", icon: ClipboardCheck },
    { id: "assessments", label: "Assessments", icon: ShieldAlert },
    { id: "procedures", label: "Procedures", icon: Layers },
  ];

  const subTabs: { id: SubTab; label: string }[] = [
    { id: "active", label: "Active for Field App" },
    { id: "all", label: "All Templates" },
    { id: "drafts", label: "Drafts" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Template Library</h1>
        <div className="flex gap-2">
          {mainTab === "checklists" && (
            <>
              <Link href={`/${company}/dashboard/checklists/new`}><Button size="sm" className="gap-2"><Plus className="h-4 w-4" />New Template</Button></Link>
              <Link href={`/${company}/dashboard/checklists/templates`}><Button size="sm" variant="outline" className="gap-2"><Upload className="h-4 w-4" />Import</Button></Link>
              <Link href={`/${company}/dashboard/checklists/templates`}><Button size="sm" variant="outline" className="gap-2"><Library className="h-4 w-4" />Industry Library</Button></Link>
            </>
          )}
        </div>
      </div>

      {/* ══ Main Tabs (underline style) ══ */}
      <div className="border-b">
        <div className="flex gap-6">
          {mainTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setMainTab(tab.id)}
              className={cn(
                "flex items-center gap-2 pb-3 text-sm font-medium transition-colors relative",
                mainTab === tab.id ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
              {mainTab === tab.id && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground" />}
            </button>
          ))}
        </div>
      </div>

      {/* ══ Sub Tabs ══ */}
      <div className="flex gap-2">
        {subTabs.map((tab) => (
          <Button key={tab.id} variant={subTab === tab.id ? "default" : "outline"} size="sm" onClick={() => { setSubTab(tab.id); setSearchQuery(""); }}>
            {tab.label}
          </Button>
        ))}
      </div>

      {/* ════════════════ CHECKLISTS ════════════════ */}
      {mainTab === "checklists" && subTab === "active" && (
        <Card>
          <CardContent className="pt-6 space-y-2">
            {activeChecklists.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No checklists active for the field app. Go to All Templates to activate.</p>
            ) : activeChecklists.map((tpl) => (
              <div key={tpl.id} className="flex items-center justify-between py-2 px-1">
                <div><p className="text-sm font-medium">{tpl.name}</p><p className="text-xs text-muted-foreground">{tpl.items.length} items</p></div>
                <Toggle active onChange={() => togglePublish(tpl)} />
              </div>
            ))}
            {WORK_ORDER_PROCEDURE_TEMPLATES.length > 0 && (
              <>
                <div className="border-t pt-3 mt-3"><p className="text-xs font-medium text-muted-foreground mb-2">Work Order Procedures (auto-assigned)</p></div>
                {WORK_ORDER_PROCEDURE_TEMPLATES.map((tpl) => (
                  <div key={tpl.id} className="flex items-center justify-between py-2 px-1">
                    <div><p className="text-sm font-medium">{tpl.name}</p><p className="text-xs text-muted-foreground">{tpl.items.length} steps</p></div>
                    <Badge variant="success" className="text-[10px]">Auto</Badge>
                  </div>
                ))}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {mainTab === "checklists" && subTab === "all" && (
        <div className="space-y-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search templates..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
          </div>
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Template</th>
                  <th className="px-4 py-3 font-medium hidden md:table-cell">Items</th>
                  <th className="px-4 py-3 font-medium hidden lg:table-cell">Source</th>
                  <th className="px-4 py-3 font-medium w-20">Active</th>
                  <th className="px-4 py-3 w-10"></th>
                </tr></thead>
                <tbody>
                  {filteredChecklists.map((tpl) => (
                    <tr key={tpl.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="px-4 py-3">
                        <Link href={`/${company}/dashboard/checklists/${tpl.id}`} className="hover:underline">
                          <p className="font-medium">{tpl.name}</p>
                          {tpl.description && <p className="text-xs text-muted-foreground line-clamp-1">{tpl.description}</p>}
                        </Link>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{tpl.items.length} items</td>
                      <td className="px-4 py-3 hidden lg:table-cell"><Badge variant="outline" className="text-[10px]">{tpl.source_template_id ? "Industry" : "Custom"}</Badge></td>
                      <td className="px-4 py-3"><Toggle active={isPublished(tpl)} onChange={() => togglePublish(tpl)} /></td>
                      <td className="px-4 py-3"><button onClick={() => { if (confirm("Delete this template?")) removeTemplate(tpl.id); }} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button></td>
                    </tr>
                  ))}
                  {filteredChecklists.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No templates found</td></tr>}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}

      {mainTab === "checklists" && subTab === "drafts" && (
        <Card>
          <CardContent className="pt-6 space-y-2">
            {draftChecklists.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No draft templates. Drafts are templates being worked on but not yet activated.</p>
            ) : draftChecklists.map((tpl) => (
              <div key={tpl.id} className="flex items-center justify-between py-2 px-1">
                <Link href={`/${company}/dashboard/checklists/${tpl.id}`} className="hover:underline flex-1">
                  <p className="text-sm font-medium">{tpl.name}</p>
                  <p className="text-xs text-muted-foreground">{tpl.items.length} items</p>
                </Link>
                <div className="flex items-center gap-2">
                  <Badge variant="warning" className="text-[10px]">Draft</Badge>
                  <Button size="sm" variant="outline" onClick={() => togglePublish(tpl)}>Activate</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ════════════════ ASSESSMENTS ════════════════ */}
      {mainTab === "assessments" && subTab === "active" && (
        <Card>
          <CardContent className="pt-6 space-y-2">
            <p className="text-xs text-muted-foreground mb-3">Active risk assessment forms available to workers.</p>
            {RISK_FORMS.filter((f) => !hiddenTypes.includes(f.id)).length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No assessment forms active. Go to All Templates to activate.</p>
            ) : RISK_FORMS.filter((f) => !hiddenTypes.includes(f.id)).map((form) => (
              <div key={form.id} className="flex items-center justify-between py-2 px-1">
                <div><p className="text-sm font-medium">{form.name}</p><p className="text-xs text-muted-foreground">{form.region} \u00b7 {form.regulation}</p></div>
                <Toggle active onChange={() => {
                  if (!currentCompany) return;
                  updateCompany(currentCompany.id, { hidden_assessment_types: [...(currentCompany.hidden_assessment_types || []), form.id] });
                }} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {mainTab === "assessments" && subTab === "all" && (
        <Card>
          <CardContent className="pt-6 space-y-2">
            <p className="text-xs text-muted-foreground mb-3">Toggle forms to make them available for workers.</p>
            {RISK_FORMS.map((form) => {
              const isActive = !hiddenTypes.includes(form.id);
              return (
                <div key={form.id} className="flex items-center justify-between rounded-lg border px-4 py-3">
                  <div><p className="text-sm font-medium">{form.name}</p><p className="text-xs text-muted-foreground">{form.region} \u00b7 {form.regulation}</p></div>
                  <Toggle active={isActive} onChange={() => {
                    if (!currentCompany) return;
                    const hidden = currentCompany.hidden_assessment_types || [];
                    const updated = isActive ? [...hidden, form.id] : hidden.filter((id) => id !== form.id);
                    updateCompany(currentCompany.id, { hidden_assessment_types: updated });
                  }} />
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {mainTab === "assessments" && subTab === "drafts" && (
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground py-6 text-center">Risk assessment forms are pre-built. Custom assessment templates coming soon.</p></CardContent></Card>
      )}

      {/* ════════════════ PROCEDURES ════════════════ */}
      {mainTab === "procedures" && subTab === "active" && (
        <Card>
          <CardContent className="pt-6 space-y-2">
            {activeProcedures.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No procedures active.</p>
            ) : activeProcedures.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2 px-1">
                <div><p className="text-sm font-medium">{p.name}</p><p className="text-xs text-muted-foreground">{p.steps.length} steps \u00b7 {p.recurrence.replace(/_/g, " ")}</p></div>
                <Toggle active onChange={() => updateProcedure(p.id, { is_active: false })} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {mainTab === "procedures" && subTab === "all" && (
        <div className="space-y-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search procedures..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
          </div>
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Procedure</th>
                  <th className="px-4 py-3 font-medium hidden md:table-cell">Steps</th>
                  <th className="px-4 py-3 font-medium hidden lg:table-cell">Industry</th>
                  <th className="px-4 py-3 font-medium w-20">Active</th>
                </tr></thead>
                <tbody>
                  {allProcedures.filter((p) => !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase())).map((p) => (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="px-4 py-3"><p className="font-medium">{p.name}</p>{p.description && <p className="text-xs text-muted-foreground line-clamp-1">{p.description}</p>}</td>
                      <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{p.steps.length}</td>
                      <td className="px-4 py-3 hidden lg:table-cell">{p.industry ? <Badge variant="outline" className="text-[10px]">{p.industry}</Badge> : <span className="text-muted-foreground">\u2014</span>}</td>
                      <td className="px-4 py-3"><Toggle active={p.is_active} onChange={() => updateProcedure(p.id, { is_active: !p.is_active })} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}

      {mainTab === "procedures" && subTab === "drafts" && (
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground py-6 text-center">No draft procedures.</p></CardContent></Card>
      )}
    </div>
  );
}

export default function MyTemplatesPage() {
  return (
    <RoleGuard requiredPermission="checklists.view">
      <React.Suspense fallback={<div className="flex min-h-[400px] items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}>
        <MyTemplatesContent />
      </React.Suspense>
    </RoleGuard>
  );
}
