"use client";

import * as React from "react";
import {
  Plus,
  Package,
  Search,
  X,
  AlertTriangle,
  Edit,
  Trash2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingPage } from "@/components/ui/loading";
import { NoDataEmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { KPICard } from "@/components/ui/kpi-card";
import { usePartsStore } from "@/stores/parts-store";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/components/ui/toast";
import type { Part } from "@/types";
import { useTranslation } from "@/i18n";
import { RoleGuard } from "@/components/auth/role-guard";

export default function PartsPage() {
  const { t, formatNumber } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const { items: parts, add, update, remove, isLoading } = usePartsStore();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [showCreate, setShowCreate] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [currentPage, setCurrentPage] = React.useState(1);
  const ITEMS_PER_PAGE = 10;
  const [form, setForm] = React.useState({
    name: "",
    part_number: "",
    unit_cost: "",
    quantity_in_stock: "",
    minimum_stock: "",
    supplier: "",
  });

  const filtered = parts.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.part_number.toLowerCase().includes(q);
  });

  const totalParts = parts.length;
  const totalValue = parts.reduce((sum, p) => sum + p.unit_cost * p.quantity_in_stock, 0);
  const lowStockCount = parts.filter((p) => p.quantity_in_stock <= p.minimum_stock).length;

  const handleCreate = () => {
    if (!form.name.trim() || !form.part_number.trim()) return;
    const part: Part = {
      id: `part_${Date.now()}`,
      company_id: user?.company_id || "",
      name: form.name.trim(),
      part_number: form.part_number.trim(),
      unit_cost: parseFloat(form.unit_cost) || 0,
      quantity_in_stock: parseInt(form.quantity_in_stock) || 0,
      minimum_stock: parseInt(form.minimum_stock) || 0,
      supplier: form.supplier.trim() || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    add(part);
    toast("Part added to inventory");
    setShowCreate(false);
    setForm({ name: "", part_number: "", unit_cost: "", quantity_in_stock: "", minimum_stock: "", supplier: "" });
  };

  if (isLoading && parts.length === 0) {
    return <LoadingPage />;
  }

  return (
    <RoleGuard requiredPermission="work_orders.view">
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Parts Inventory</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <KPICard title={t("parts.title")} value={totalParts} icon={Package} />
        <KPICard title={t("parts.labels.inventoryValue")} value={`$${formatNumber(totalValue)}`} icon={Package} />
        <KPICard title={t("parts.labels.lowStock")} value={lowStockCount} icon={AlertTriangle} />
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder={t("parts.placeholders.searchParts")} className="pl-10" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} />
      </div>

      {filtered.length === 0 ? (
        <NoDataEmptyState
          entityName="parts"
          onAdd={() => setShowCreate(true)}
          addLabel={t("parts.addPart")}
        />
      ) : (
        <>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">{t("parts.title")}</CardTitle>
            <Button size="sm" className="gap-2" onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4" /> {t("parts.addPart")}
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead className="bg-muted/40">
                  <tr className="text-left">
                    <th className="px-4 py-3 font-medium">{t("parts.labels.partName")}</th>
                    <th className="px-4 py-3 font-medium">{t("parts.labels.supplier")}</th>
                    <th className="px-4 py-3 font-medium">{t("parts.labels.unitCost")}</th>
                    <th className="px-4 py-3 font-medium">{t("parts.labels.inStock")}</th>
                    <th className="px-4 py-3 font-medium">{t("parts.labels.minimumStock")}</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Value</th>
                    <th className="px-4 py-3 font-medium sr-only">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((part) => {
                    const isLow = part.quantity_in_stock <= part.minimum_stock;
                    const inventoryValue = part.quantity_in_stock * part.unit_cost;
                    return (
                      <tr key={part.id} className="align-top hover:bg-muted/50">
                        <td className="px-4 py-3">
                          <div className="font-medium">{part.name}</div>
                          <div className="font-mono text-xs text-muted-foreground">{part.part_number}</div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{part.supplier || "—"}</td>
                        <td className="px-4 py-3">${part.unit_cost.toFixed(2)}</td>
                        <td className="px-4 py-3">{formatNumber(part.quantity_in_stock)}</td>
                        <td className="px-4 py-3">{formatNumber(part.minimum_stock)}</td>
                        <td className="px-4 py-3">
                          <Badge variant={isLow ? "warning" : "secondary"}>
                            {isLow ? t("parts.labels.lowStock") : "In stock"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">${formatNumber(inventoryValue)}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              aria-label="Delete part"
                              onClick={() => {
                                remove(part.id);
                                toast("Part removed");
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
          {filtered.length > ITEMS_PER_PAGE && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length}
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}>Previous</Button>
                <Button size="sm" variant="outline" disabled={currentPage * ITEMS_PER_PAGE >= filtered.length} onClick={() => setCurrentPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </Card>
        </>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t("parts.addPart")}</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setShowCreate(false)}><X className="h-4 w-4" /></Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>{t("parts.labels.partName")}</Label>
                <Input className="mt-1" placeholder={t("parts.placeholders.partName")} value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <Label>{t("parts.labels.partNumber")}</Label>
                <Input className="mt-1" placeholder={t("parts.placeholders.partNumber")} value={form.part_number} onChange={(e) => setForm(p => ({ ...p, part_number: e.target.value }))} />
              </div>
              <div className="grid gap-4 grid-cols-2">
                <div>
                  <Label>{t("parts.labels.unitCost")}</Label>
                  <Input type="number" min="0" step="0.01" className="mt-1" value={form.unit_cost} onChange={(e) => setForm(p => ({ ...p, unit_cost: e.target.value }))} />
                </div>
                <div>
                  <Label>{t("parts.labels.qtyInStock")}</Label>
                  <Input type="number" min="0" className="mt-1" value={form.quantity_in_stock} onChange={(e) => setForm(p => ({ ...p, quantity_in_stock: e.target.value }))} />
                </div>
              </div>
              <div className="grid gap-4 grid-cols-2">
                <div>
                  <Label>{t("parts.labels.minimumStock")}</Label>
                  <Input type="number" min="0" className="mt-1" value={form.minimum_stock} onChange={(e) => setForm(p => ({ ...p, minimum_stock: e.target.value }))} />
                </div>
                <div>
                  <Label>{t("parts.labels.supplier")}</Label>
                  <Input className="mt-1" placeholder={t("parts.placeholders.supplier")} value={form.supplier} onChange={(e) => setForm(p => ({ ...p, supplier: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowCreate(false)}>{t("common.cancel")}</Button>
                <Button onClick={handleCreate} disabled={!form.name.trim() || !form.part_number.trim()}>
                  <Plus className="h-4 w-4 mr-1" /> {t("parts.buttons.addPart")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
    </RoleGuard>
  );
}
