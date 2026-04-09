"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useCompanyStore } from "@/stores/company-store";
import { useCompanyParam } from "@/hooks/use-company-param";
import { useToast } from "@/components/ui/toast";
import type { Company } from "@/types";

export function IncidentSettingsSection() {
  const company = useCompanyParam();
  const { items: companies, update } = useCompanyStore();
  const currentCompany = companies.find((c) => c.slug === company);
  const { toast } = useToast();

  const [newTypeName, setNewTypeName] = React.useState("");
  const [newFieldLabel, setNewFieldLabel] = React.useState("");
  const [newFieldType, setNewFieldType] = React.useState<"text" | "number" | "select" | "date" | "toggle">("text");

  if (!currentCompany) return null;

  const customTypes = currentCompany.custom_incident_types || [];
  const customFields = currentCompany.custom_incident_fields || [];
  const anonymousEnabled = currentCompany.allow_anonymous_reporting !== false;

  const save = (updates: Partial<Company>) => {
    update(currentCompany.id, { ...updates, updated_at: new Date().toISOString() });
    toast("Settings saved");
  };

  const addType = () => {
    if (!newTypeName.trim()) return;
    const newType = {
      id: `custom_type_${Date.now()}`,
      name: newTypeName.trim(),
      is_active: true,
    };
    save({ custom_incident_types: [...customTypes, newType] });
    setNewTypeName("");
  };

  const removeType = (id: string) => {
    save({ custom_incident_types: customTypes.map((t) => t.id === id ? { ...t, is_active: false } : t) });
  };

  const addField = () => {
    if (!newFieldLabel.trim()) return;
    const newField = {
      id: `custom_field_${Date.now()}`,
      label: newFieldLabel.trim(),
      type: newFieldType,
      required: false,
      order: customFields.length + 1,
    };
    save({ custom_incident_fields: [...customFields, newField] });
    setNewFieldLabel("");
    setNewFieldType("text");
  };

  const removeField = (id: string) => {
    save({ custom_incident_fields: customFields.filter((f) => f.id !== id) });
  };

  return (
    <div className="space-y-6">
      {/* Anonymous reporting */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Anonymous reporting</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Allow field workers to report incidents anonymously</p>
            <button
              type="button"
              onClick={() => save({ allow_anonymous_reporting: !anonymousEnabled })}
              className={`h-6 w-10 rounded-full transition-colors ${anonymousEnabled ? "bg-primary" : "bg-muted"}`}
            >
              <div className={`h-5 w-5 rounded-full bg-white shadow transition-transform ${anonymousEnabled ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Custom incident types */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Custom incident types</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {["injury", "near_miss", "equipment_failure", "environmental", "fire", "security", "spill", "hazard", "property_damage", "other"].map((t) => (
              <Badge key={t} variant="secondary" className="text-xs">{t.replace(/_/g, " ")}</Badge>
            ))}
            {customTypes.filter((t) => t.is_active).map((t) => (
              <div key={t.id} className="flex items-center gap-1">
                <Badge variant="info" className="text-xs">{t.name}</Badge>
                <button type="button" className="text-muted-foreground hover:text-destructive" onClick={() => removeType(t.id)}>
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="New type name"
              value={newTypeName}
              onChange={(e) => setNewTypeName(e.target.value)}
              className="h-8 text-sm"
              maxLength={40}
              onKeyDown={(e) => e.key === "Enter" && addType()}
            />
            <Button size="sm" variant="outline" className="shrink-0 gap-1" onClick={addType} disabled={!newTypeName.trim()}>
              <Plus className="h-3.5 w-3.5" /> Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Custom fields */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Custom fields</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {customFields.length > 0 ? (
            <div className="space-y-2">
              {customFields.map((field) => (
                <div key={field.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">{field.label}</p>
                    <p className="text-xs text-muted-foreground capitalize">{field.type}</p>
                  </div>
                  <button type="button" className="text-muted-foreground hover:text-destructive" onClick={() => removeField(field.id)}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No custom fields configured</p>
          )}
          {customFields.length < 20 && (
            <div className="flex gap-2">
              <Input
                placeholder="Field label"
                value={newFieldLabel}
                onChange={(e) => setNewFieldLabel(e.target.value)}
                className="h-8 text-sm flex-1"
                maxLength={60}
                onKeyDown={(e) => e.key === "Enter" && addField()}
              />
              <select
                className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                value={newFieldType}
                onChange={(e) => setNewFieldType(e.target.value as typeof newFieldType)}
              >
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="select">Select</option>
                <option value="date">Date</option>
                <option value="toggle">Toggle</option>
              </select>
              <Button size="sm" variant="outline" className="shrink-0 gap-1" onClick={addField} disabled={!newFieldLabel.trim()}>
                <Plus className="h-3.5 w-3.5" /> Add
              </Button>
            </div>
          )}
          {customFields.length >= 20 && (
            <p className="text-xs text-muted-foreground">Maximum 20 custom fields reached</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
