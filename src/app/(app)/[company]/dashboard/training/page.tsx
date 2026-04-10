"use client";

import * as React from "react";
import {
  Plus,
  Users,
  ShieldCheck,
  Clock,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  X,
  Pencil,
  Trash2,
  Award,
  BookOpen,
  LayoutGrid,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KPICard } from "@/components/ui/kpi-card";
import { SortableTh, sortData, type SortDirection } from "@/components/ui/sortable-th";
import { SearchFilterBar } from "@/components/ui/search-filter-bar";
import { useCompanyData } from "@/hooks/use-company-data";
import { LoadingPage } from "@/components/ui/loading";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "@/i18n";
import { RoleGuard } from "@/components/auth/role-guard";
import { PAGINATION } from "@/lib/constants";
import { getUserDisplayName } from "@/lib/status-utils";
import { getBuiltInCertTypes } from "@/data/training-cert-types";
import type { WorkerCertification, TrainingAssignment, TrainingCertificationType } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ITEMS_PER_PAGE = PAGINATION.DEFAULT_PAGE_SIZE;

type SubTab = "certifications" | "training" | "compliance";

const CERT_STATUS_BADGE: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
  valid: { variant: "default", label: "Valid" },
  expiring: { variant: "outline", label: "Expiring Soon" },
  expired: { variant: "destructive", label: "Expired" },
  revoked: { variant: "secondary", label: "Revoked" },
};

const ASSIGNMENT_STATUS_BADGE: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
  assigned: { variant: "secondary", label: "Assigned" },
  in_progress: { variant: "outline", label: "In Progress" },
  completed: { variant: "default", label: "Completed" },
  overdue: { variant: "destructive", label: "Overdue" },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function computeCertStatus(cert: Pick<WorkerCertification, "expiry_date" | "status">): "valid" | "expiring" | "expired" {
  if (cert.status === "revoked") return "expired";
  if (!cert.expiry_date) return "valid";
  const now = new Date();
  const expiry = new Date(cert.expiry_date);
  if (expiry < now) return "expired";
  const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  if (expiry < thirtyDays) return "expiring";
  return "valid";
}

function computeAssignmentStatus(a: Pick<TrainingAssignment, "status" | "due_date">): TrainingAssignment["status"] {
  if (a.status === "completed") return "completed";
  if (a.due_date && new Date(a.due_date) < new Date()) return "overdue";
  return a.status;
}

// ---------------------------------------------------------------------------
// Pagination component (shared)
// ---------------------------------------------------------------------------

function Pagination({
  currentPage,
  totalPages,
  totalItems,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between pt-4 border-t mt-4">
      <p className="text-sm text-muted-foreground">
        Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{" "}
        {Math.min(currentPage * ITEMS_PER_PAGE, totalItems)} of {totalItems}
      </p>
      <div className="flex gap-1">
        <Button variant="outline" size="sm" onClick={() => onPageChange(Math.max(1, currentPage - 1))} disabled={currentPage === 1}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {(() => {
          const pages: (number | "...")[] =
            totalPages <= 7
              ? Array.from({ length: totalPages }, (_, i) => i + 1)
              : (() => {
                  const p: (number | "...")[] = [1];
                  if (currentPage > 3) p.push("...");
                  for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) p.push(i);
                  if (currentPage < totalPages - 2) p.push("...");
                  p.push(totalPages);
                  return p;
                })();
          return pages.map((p, idx) =>
            p === "..." ? (
              <span key={`ellipsis-${idx}`} className="px-2 text-sm text-muted-foreground">…</span>
            ) : (
              <Button key={p} variant={currentPage === p ? "default" : "outline"} size="sm" onClick={() => onPageChange(p as number)}>
                {p}
              </Button>
            ),
          );
        })()}
        <Button variant="outline" size="sm" onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function TrainingPage() {
  const { user, currentCompany } = useAuth();
  const { t, formatDate } = useTranslation();
  const { toast } = useToast();
  const {
    users,
    workerCertifications,
    trainingAssignments,
    trainingCertTypes: companyTypes,
    stores,
    companyId,
  } = useCompanyData();

  const certTypesStore = stores.trainingCertTypes;
  const workerCertsStore = stores.workerCertifications;
  const assignmentsStore = stores.trainingAssignments;

  // ── All cert types (built-in country-filtered + company custom) ──
  const allCertTypes = React.useMemo<TrainingCertificationType[]>(() => {
    const builtIn = getBuiltInCertTypes().filter(
      (ct) => !ct.country_specific || ct.country_specific === currentCompany?.country,
    );
    return [...builtIn, ...companyTypes];
  }, [companyTypes, currentCompany?.country]);

  const certTypeMap = React.useMemo(() => {
    const m = new Map<string, TrainingCertificationType>();
    allCertTypes.forEach((ct) => m.set(ct.id, ct));
    return m;
  }, [allCertTypes]);

  // ── Tab / page state ──
  const [activeTab, setActiveTab] = React.useState<SubTab>("certifications");
  const [currentPage, setCurrentPage] = React.useState(1);

  // ── Filters ──
  const [searchQuery, setSearchQuery] = React.useState("");
  const [certTypeFilter, setCertTypeFilter] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");

  // ── Sort ──
  const [sortKey, setSortKey] = React.useState<string | null>(null);
  const [sortDir, setSortDir] = React.useState<SortDirection>(null);

  // ── Modals ──
  const [showAddCert, setShowAddCert] = React.useState(false);
  const [showAssignTraining, setShowAssignTraining] = React.useState(false);
  const [editCertId, setEditCertId] = React.useState<string | null>(null);

  // Reset page on filter/tab changes
  React.useEffect(() => { setCurrentPage(1); }, [searchQuery, certTypeFilter, statusFilter, activeTab]);

  // ── Cert status enrichment ──
  const certsWithStatus = React.useMemo(
    () =>
      workerCertifications.map((c) => ({
        ...c,
        _status: c.status === "revoked" ? "revoked" as const : computeCertStatus(c),
      })),
    [workerCertifications],
  );

  // ── Assignment status enrichment ──
  const assignmentsWithStatus = React.useMemo(
    () =>
      trainingAssignments.map((a) => ({
        ...a,
        _status: computeAssignmentStatus(a),
      })),
    [trainingAssignments],
  );

  // ── KPI computations ──
  const kpis = React.useMemo(() => {
    const totalWorkers = users.length;

    // Compliance: for each user check all their certs are valid
    const userCertMap = new Map<string, string[]>();
    certsWithStatus.forEach((c) => {
      const arr = userCertMap.get(c.user_id) ?? [];
      arr.push(c._status);
      userCertMap.set(c.user_id, arr);
    });
    let compliantCount = 0;
    users.forEach((u) => {
      const statuses = userCertMap.get(u.id);
      if (statuses && statuses.length > 0 && statuses.every((s) => s === "valid")) {
        compliantCount++;
      }
    });
    const compliantPct = totalWorkers > 0 ? Math.round((compliantCount / totalWorkers) * 100) : 0;

    const expiringSoon = certsWithStatus.filter((c) => c._status === "expiring").length;

    const expiredCerts = certsWithStatus.filter((c) => c._status === "expired").length;
    const overdueAssignments = assignmentsWithStatus.filter((a) => a._status === "overdue").length;
    const overdue = expiredCerts + overdueAssignments;

    return { totalWorkers, compliantPct, compliantCount, expiringSoon, overdue };
  }, [users, certsWithStatus, assignmentsWithStatus]);

  // ── Certifications tab filtering ──
  const filteredCerts = React.useMemo(() => {
    let data = certsWithStatus;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      data = data.filter((c) => {
        const name = getUserDisplayName(c.user_id, users, "").toLowerCase();
        const typeName = (certTypeMap.get(c.certification_type_id)?.name ?? "").toLowerCase();
        return name.includes(q) || typeName.includes(q) || (c.certificate_number ?? "").toLowerCase().includes(q);
      });
    }
    if (certTypeFilter) data = data.filter((c) => c.certification_type_id === certTypeFilter);
    if (statusFilter) data = data.filter((c) => c._status === statusFilter);
    return data;
  }, [certsWithStatus, searchQuery, certTypeFilter, statusFilter, users, certTypeMap]);

  const sortedCerts = React.useMemo(
    () =>
      sortData(filteredCerts, sortKey, sortDir, (item, key) => {
        if (key === "worker") return getUserDisplayName(item.user_id, users, "");
        if (key === "certification") return certTypeMap.get(item.certification_type_id)?.name ?? "";
        if (key === "issued_date") return item.issued_date;
        if (key === "expiry_date") return item.expiry_date ?? "";
        if (key === "status") return item._status;
        return (item as Record<string, unknown>)[key] as string;
      }),
    [filteredCerts, sortKey, sortDir, users, certTypeMap],
  );

  const certTotalPages = Math.ceil(sortedCerts.length / ITEMS_PER_PAGE);
  const certPageData = sortedCerts.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // ── Training assignments tab filtering ──
  const filteredAssignments = React.useMemo(() => {
    let data = assignmentsWithStatus;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      data = data.filter((a) => {
        const name = getUserDisplayName(a.user_id, users, "").toLowerCase();
        return name.includes(q) || a.course_name.toLowerCase().includes(q);
      });
    }
    if (statusFilter) data = data.filter((a) => a._status === statusFilter);
    return data;
  }, [assignmentsWithStatus, searchQuery, statusFilter, users]);

  const sortedAssignments = React.useMemo(
    () =>
      sortData(filteredAssignments, sortKey, sortDir, (item, key) => {
        if (key === "worker") return getUserDisplayName(item.user_id, users, "");
        if (key === "course") return item.course_name;
        if (key === "due_date") return item.due_date;
        if (key === "status") return item._status;
        if (key === "assigned_by") return getUserDisplayName(item.assigned_by, users, "");
        return (item as Record<string, unknown>)[key] as string;
      }),
    [filteredAssignments, sortKey, sortDir, users],
  );

  const assignmentTotalPages = Math.ceil(sortedAssignments.length / ITEMS_PER_PAGE);
  const assignmentPageData = sortedAssignments.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // ── Sort handler ──
  const handleSort = React.useCallback((key: string, dir: SortDirection) => {
    setSortKey(dir ? key : null);
    setSortDir(dir);
  }, []);

  // ── Cert filter options ──
  const certTypeOptions = React.useMemo(
    () => allCertTypes.map((ct) => ({ value: ct.id, label: ct.name })),
    [allCertTypes],
  );

  // ── Filters for SearchFilterBar ──
  const certFilters = React.useMemo(
    () => [
      {
        id: "certType",
        label: "Certification Type",
        options: certTypeOptions,
        value: certTypeFilter,
        onChange: setCertTypeFilter,
      },
      {
        id: "status",
        label: "Status",
        options: [
          { value: "valid", label: "Valid" },
          { value: "expiring", label: "Expiring Soon" },
          { value: "expired", label: "Expired" },
          { value: "revoked", label: "Revoked" },
        ],
        value: statusFilter,
        onChange: setStatusFilter,
      },
    ],
    [certTypeOptions, certTypeFilter, statusFilter],
  );

  const assignmentFilters = React.useMemo(
    () => [
      {
        id: "status",
        label: "Status",
        options: [
          { value: "assigned", label: "Assigned" },
          { value: "in_progress", label: "In Progress" },
          { value: "completed", label: "Completed" },
          { value: "overdue", label: "Overdue" },
        ],
        value: statusFilter,
        onChange: setStatusFilter,
      },
    ],
    [statusFilter],
  );

  // ── Add Certification ──
  const [certForm, setCertForm] = React.useState({
    user_id: "",
    certification_type_id: "",
    certificate_number: "",
    issuer: "",
    issued_date: new Date().toISOString().split("T")[0],
    expiry_date: "",
    notes: "",
  });

  const resetCertForm = React.useCallback(() => {
    setCertForm({
      user_id: "",
      certification_type_id: "",
      certificate_number: "",
      issuer: "",
      issued_date: new Date().toISOString().split("T")[0],
      expiry_date: "",
      notes: "",
    });
    setEditCertId(null);
  }, []);

  // Auto-fill expiry based on cert type
  React.useEffect(() => {
    if (!certForm.certification_type_id || !certForm.issued_date) return;
    const ct = certTypeMap.get(certForm.certification_type_id);
    if (ct?.default_validity_days) {
      const issued = new Date(certForm.issued_date);
      const expiry = new Date(issued.getTime() + ct.default_validity_days * 24 * 60 * 60 * 1000);
      setCertForm((prev) => ({ ...prev, expiry_date: expiry.toISOString().split("T")[0] }));
    }
  }, [certForm.certification_type_id, certForm.issued_date, certTypeMap]);

  const handleSaveCert = React.useCallback(() => {
    if (!certForm.user_id || !certForm.certification_type_id || !certForm.issued_date) return;
    const now = new Date().toISOString();
    const expiryDate = certForm.expiry_date || null;

    const certData: WorkerCertification = {
      id: editCertId ?? crypto.randomUUID(),
      company_id: companyId ?? "",
      user_id: certForm.user_id,
      certification_type_id: certForm.certification_type_id,
      certificate_number: certForm.certificate_number || null,
      issuer: certForm.issuer || null,
      issued_date: certForm.issued_date,
      expiry_date: expiryDate,
      status: computeCertStatus({ expiry_date: expiryDate, status: "valid" }),
      document_url: null,
      notes: certForm.notes || null,
      verified_by: user?.id ?? null,
      verified_at: now,
      created_at: now,
      updated_at: now,
    };

    if (editCertId) {
      workerCertsStore.update(editCertId, { ...certData, updated_at: now });
      toast("Certification updated");
    } else {
      workerCertsStore.add(certData);
      toast("Certification added");
    }
    resetCertForm();
    setShowAddCert(false);
  }, [certForm, editCertId, companyId, user, workerCertsStore, toast, resetCertForm]);

  const handleEditCert = React.useCallback(
    (cert: WorkerCertification) => {
      setEditCertId(cert.id);
      setCertForm({
        user_id: cert.user_id,
        certification_type_id: cert.certification_type_id,
        certificate_number: cert.certificate_number ?? "",
        issuer: cert.issuer ?? "",
        issued_date: cert.issued_date,
        expiry_date: cert.expiry_date ?? "",
        notes: cert.notes ?? "",
      });
      setShowAddCert(true);
    },
    [],
  );

  const handleDeleteCert = React.useCallback(
    (id: string) => {
      workerCertsStore.remove(id);
      toast("Certification removed");
    },
    [workerCertsStore, toast],
  );

  // ── Assign Training ──
  const [assignForm, setAssignForm] = React.useState({
    user_id: "",
    course_name: "",
    description: "",
    linked_certification_type_id: "",
    due_date: "",
  });

  const resetAssignForm = React.useCallback(() => {
    setAssignForm({ user_id: "", course_name: "", description: "", linked_certification_type_id: "", due_date: "" });
  }, []);

  const handleSaveAssignment = React.useCallback(() => {
    if (!assignForm.user_id || !assignForm.course_name || !assignForm.due_date) return;
    const now = new Date().toISOString();

    const assignment: TrainingAssignment = {
      id: crypto.randomUUID(),
      company_id: companyId ?? "",
      course_name: assignForm.course_name,
      description: assignForm.description || null,
      user_id: assignForm.user_id,
      assigned_by: user?.id ?? "",
      linked_certification_type_id: assignForm.linked_certification_type_id || null,
      due_date: assignForm.due_date,
      status: "assigned",
      completed_at: null,
      notes: null,
      created_at: now,
      updated_at: now,
    };

    assignmentsStore.add(assignment);
    toast("Training assigned");
    resetAssignForm();
    setShowAssignTraining(false);
  }, [assignForm, companyId, user, assignmentsStore, toast, resetAssignForm]);

  // ── Loading ──
  if (workerCertsStore.isLoading || assignmentsStore.isLoading) {
    return <LoadingPage />;
  }

  // ── Render ──
  return (
    <RoleGuard allowedRoles={["company_admin", "manager", "super_admin"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Training &amp; Competency</h1>
            <p className="text-sm text-muted-foreground">Manage worker certifications, training assignments, and compliance</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => {
                resetCertForm();
                setShowAddCert(true);
              }}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add Certification
            </Button>
            <Button
              size="sm"
              className="gap-2"
              onClick={() => {
                resetAssignForm();
                setShowAssignTraining(true);
              }}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Assign Training
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KPICard title="Total Workers" value={kpis.totalWorkers} icon={Users} />
          <KPICard
            title="Compliant"
            value={`${kpis.compliantPct}%`}
            icon={ShieldCheck}
            description={`${kpis.compliantCount} of ${kpis.totalWorkers} workers`}
          />
          <KPICard
            title="Expiring Soon"
            value={kpis.expiringSoon}
            icon={Clock}
            className={kpis.expiringSoon > 0 ? "border-amber-500/50" : undefined}
            description="Within 30 days"
          />
          <KPICard
            title="Overdue"
            value={kpis.overdue}
            icon={AlertTriangle}
            className={kpis.overdue > 0 ? "border-destructive/50" : undefined}
            description="Expired certs + overdue training"
          />
        </div>

        {/* Sub Tabs */}
        <div className="border-b">
          <div className="flex gap-4">
            {([
              { key: "certifications" as const, label: "Certifications", icon: Award },
              { key: "training" as const, label: "Training", icon: BookOpen },
              { key: "compliance" as const, label: "Compliance Matrix", icon: LayoutGrid },
            ] as const).map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "flex items-center gap-2 py-3 px-1 text-sm font-medium transition-colors relative",
                    activeTab === tab.key ? "text-primary" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  <span>{tab.label}</span>
                  {activeTab === tab.key && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* ================================================================ */}
        {/* Certifications Tab                                               */}
        {/* ================================================================ */}
        {activeTab === "certifications" && (
          <>
            <SearchFilterBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              searchPlaceholder="Search by worker, certification..."
              filters={certFilters}
              showDateRange={false}
            />
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Worker Certifications ({filteredCerts.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-muted-foreground border-b">
                        <SortableTh sortKey="worker" currentSort={sortKey} currentDirection={sortDir} onSort={handleSort}>Worker</SortableTh>
                        <SortableTh sortKey="certification" currentSort={sortKey} currentDirection={sortDir} onSort={handleSort}>Certification</SortableTh>
                        <th className="pb-3 font-medium">Certificate #</th>
                        <SortableTh sortKey="issued_date" currentSort={sortKey} currentDirection={sortDir} onSort={handleSort}>Issued</SortableTh>
                        <SortableTh sortKey="expiry_date" currentSort={sortKey} currentDirection={sortDir} onSort={handleSort}>Expires</SortableTh>
                        <SortableTh sortKey="status" currentSort={sortKey} currentDirection={sortDir} onSort={handleSort}>Status</SortableTh>
                        <th className="pb-3 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {certPageData.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-muted-foreground">
                            No certifications found
                          </td>
                        </tr>
                      ) : (
                        certPageData.map((cert) => {
                          const workerUser = users.find((u) => u.id === cert.user_id);
                          const certType = certTypeMap.get(cert.certification_type_id);
                          const badge = CERT_STATUS_BADGE[cert._status] ?? CERT_STATUS_BADGE.valid;
                          return (
                            <tr key={cert.id} className="hover:bg-muted/50 transition-colors">
                              <td className="py-3 pr-4">
                                <div>
                                  <p className="font-medium">{workerUser?.full_name ?? "Unknown"}</p>
                                  {workerUser?.department && (
                                    <p className="text-xs text-muted-foreground">{workerUser.department}</p>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 pr-4">{certType?.name ?? "Unknown"}</td>
                              <td className="py-3 pr-4 text-muted-foreground">{cert.certificate_number ?? "—"}</td>
                              <td className="py-3 pr-4">{formatDate(cert.issued_date)}</td>
                              <td className="py-3 pr-4">{cert.expiry_date ? formatDate(cert.expiry_date) : "No expiry"}</td>
                              <td className="py-3 pr-4">
                                <Badge variant={badge.variant}>{badge.label}</Badge>
                              </td>
                              <td className="py-3 text-right">
                                <div className="flex justify-end gap-1">
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditCert(cert)}>
                                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                                    <span className="sr-only">Edit</span>
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDeleteCert(cert.id)}>
                                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                                    <span className="sr-only">Delete</span>
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
                <Pagination currentPage={currentPage} totalPages={certTotalPages} totalItems={filteredCerts.length} onPageChange={setCurrentPage} />
              </CardContent>
            </Card>
          </>
        )}

        {/* ================================================================ */}
        {/* Training Assignments Tab                                         */}
        {/* ================================================================ */}
        {activeTab === "training" && (
          <>
            <SearchFilterBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              searchPlaceholder="Search by worker, course..."
              filters={assignmentFilters}
              showDateRange={false}
            />
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Training Assignments ({filteredAssignments.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-muted-foreground border-b">
                        <SortableTh sortKey="worker" currentSort={sortKey} currentDirection={sortDir} onSort={handleSort}>Worker</SortableTh>
                        <SortableTh sortKey="course" currentSort={sortKey} currentDirection={sortDir} onSort={handleSort}>Course</SortableTh>
                        <SortableTh sortKey="due_date" currentSort={sortKey} currentDirection={sortDir} onSort={handleSort}>Due Date</SortableTh>
                        <SortableTh sortKey="status" currentSort={sortKey} currentDirection={sortDir} onSort={handleSort}>Status</SortableTh>
                        <SortableTh sortKey="assigned_by" currentSort={sortKey} currentDirection={sortDir} onSort={handleSort}>Assigned By</SortableTh>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {assignmentPageData.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-muted-foreground">
                            No training assignments found
                          </td>
                        </tr>
                      ) : (
                        assignmentPageData.map((a) => {
                          const badge = ASSIGNMENT_STATUS_BADGE[a._status] ?? ASSIGNMENT_STATUS_BADGE.assigned;
                          return (
                            <tr key={a.id} className="hover:bg-muted/50 transition-colors">
                              <td className="py-3 pr-4 font-medium">{getUserDisplayName(a.user_id, users)}</td>
                              <td className="py-3 pr-4">{a.course_name}</td>
                              <td className="py-3 pr-4">{formatDate(a.due_date)}</td>
                              <td className="py-3 pr-4">
                                <Badge variant={badge.variant}>{badge.label}</Badge>
                              </td>
                              <td className="py-3 pr-4 text-muted-foreground">{getUserDisplayName(a.assigned_by, users)}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
                <Pagination currentPage={currentPage} totalPages={assignmentTotalPages} totalItems={filteredAssignments.length} onPageChange={setCurrentPage} />
              </CardContent>
            </Card>
          </>
        )}

        {/* ================================================================ */}
        {/* Compliance Matrix Tab                                            */}
        {/* ================================================================ */}
        {activeTab === "compliance" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Compliance Matrix</CardTitle>
            </CardHeader>
            <CardContent>
              {users.length === 0 || allCertTypes.length === 0 ? (
                <p className="py-12 text-center text-muted-foreground">
                  No data to display. Add workers and certification types first.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-muted-foreground border-b">
                        <th className="pb-3 pr-4 font-medium sticky left-0 bg-card z-10 min-w-[160px]">Worker</th>
                        {allCertTypes.map((ct) => (
                          <th
                            key={ct.id}
                            className="pb-3 px-2 font-medium text-center min-w-[80px]"
                            title={ct.name}
                          >
                            <span className="block truncate max-w-[100px]">{ct.name}</span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {users.map((u) => (
                        <tr key={u.id} className="hover:bg-muted/50 transition-colors">
                          <td className="py-2 pr-4 font-medium sticky left-0 bg-card z-10">
                            <div>
                              <p>{u.full_name}</p>
                              {u.department && <p className="text-xs text-muted-foreground">{u.department}</p>}
                            </div>
                          </td>
                          {allCertTypes.map((ct) => {
                            const cert = certsWithStatus.find(
                              (c) => c.user_id === u.id && c.certification_type_id === ct.id,
                            );
                            let dotColor = "bg-muted-foreground/30";
                            let label = "Not required";
                            if (cert) {
                              if (cert._status === "valid") {
                                dotColor = "bg-green-500";
                                label = "Valid";
                              } else if (cert._status === "expiring") {
                                dotColor = "bg-amber-500";
                                label = "Expiring soon";
                              } else {
                                dotColor = "bg-red-500";
                                label = cert._status === "revoked" ? "Revoked" : "Expired";
                              }
                            }
                            return (
                              <td key={ct.id} className="py-2 px-2 text-center">
                                <span
                                  className={cn("inline-block h-3 w-3 rounded-full", dotColor)}
                                  title={`${ct.name}: ${label}`}
                                  aria-label={`${ct.name}: ${label}`}
                                />
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {/* Legend */}
              <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500" /> Valid</span>
                <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500" /> Expiring Soon</span>
                <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" /> Expired / Revoked</span>
                <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full bg-muted-foreground/30" /> Not Required</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ================================================================ */}
        {/* Add / Edit Certification Modal                                   */}
        {/* ================================================================ */}
        {showAddCert && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => { setShowAddCert(false); resetCertForm(); }}>
            <div
              className="relative z-50 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto rounded-lg bg-background p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold">{editCertId ? "Edit Certification" : "Add Certification"}</h2>
                  <p className="text-sm text-muted-foreground">Record a worker&apos;s certification details</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => { setShowAddCert(false); resetCertForm(); }}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="space-y-4">
                {/* Worker */}
                <div>
                  <Label htmlFor="cert-worker">Worker *</Label>
                  <select
                    id="cert-worker"
                    aria-label="Select worker"
                    value={certForm.user_id}
                    onChange={(e) => setCertForm((f) => ({ ...f, user_id: e.target.value }))}
                    className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select worker...</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.full_name}</option>
                    ))}
                  </select>
                </div>

                {/* Certification Type */}
                <div>
                  <Label htmlFor="cert-type">Certification Type *</Label>
                  <select
                    id="cert-type"
                    aria-label="Select certification type"
                    value={certForm.certification_type_id}
                    onChange={(e) => setCertForm((f) => ({ ...f, certification_type_id: e.target.value }))}
                    className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select certification type...</option>
                    {allCertTypes.map((ct) => (
                      <option key={ct.id} value={ct.id}>
                        {ct.name} {ct.is_builtin ? "(Built-in)" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Certificate Number */}
                <div>
                  <Label htmlFor="cert-number">Certificate Number</Label>
                  <Input
                    id="cert-number"
                    value={certForm.certificate_number}
                    onChange={(e) => setCertForm((f) => ({ ...f, certificate_number: e.target.value }))}
                    placeholder="e.g. CERT-2024-001"
                    className="mt-1"
                  />
                </div>

                {/* Issuer */}
                <div>
                  <Label htmlFor="cert-issuer">Issuer</Label>
                  <Input
                    id="cert-issuer"
                    value={certForm.issuer}
                    onChange={(e) => setCertForm((f) => ({ ...f, issuer: e.target.value }))}
                    placeholder="Issuing organization"
                    className="mt-1"
                  />
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="cert-issued">Issued Date *</Label>
                    <Input
                      id="cert-issued"
                      type="date"
                      value={certForm.issued_date}
                      onChange={(e) => setCertForm((f) => ({ ...f, issued_date: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cert-expiry">Expiry Date</Label>
                    <Input
                      id="cert-expiry"
                      type="date"
                      value={certForm.expiry_date}
                      onChange={(e) => setCertForm((f) => ({ ...f, expiry_date: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <Label htmlFor="cert-notes">Notes</Label>
                  <Textarea
                    id="cert-notes"
                    value={certForm.notes}
                    onChange={(e) => setCertForm((f) => ({ ...f, notes: e.target.value }))}
                    placeholder="Additional notes..."
                    rows={3}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                <Button variant="outline" onClick={() => { setShowAddCert(false); resetCertForm(); }}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveCert}
                  disabled={!certForm.user_id || !certForm.certification_type_id || !certForm.issued_date}
                >
                  {editCertId ? "Update Certification" : "Add Certification"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* Assign Training Modal                                            */}
        {/* ================================================================ */}
        {showAssignTraining && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => { setShowAssignTraining(false); resetAssignForm(); }}>
            <div
              className="relative z-50 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto rounded-lg bg-background p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold">Assign Training</h2>
                  <p className="text-sm text-muted-foreground">Create a new training assignment for a worker</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => { setShowAssignTraining(false); resetAssignForm(); }}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="space-y-4">
                {/* Worker */}
                <div>
                  <Label htmlFor="assign-worker">Worker *</Label>
                  <select
                    id="assign-worker"
                    aria-label="Select worker"
                    value={assignForm.user_id}
                    onChange={(e) => setAssignForm((f) => ({ ...f, user_id: e.target.value }))}
                    className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select worker...</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.full_name}</option>
                    ))}
                  </select>
                </div>

                {/* Course Name */}
                <div>
                  <Label htmlFor="assign-course">Course Name *</Label>
                  <Input
                    id="assign-course"
                    value={assignForm.course_name}
                    onChange={(e) => setAssignForm((f) => ({ ...f, course_name: e.target.value }))}
                    placeholder="e.g. Fire Safety Refresher"
                    className="mt-1"
                  />
                </div>

                {/* Description */}
                <div>
                  <Label htmlFor="assign-desc">Description</Label>
                  <Textarea
                    id="assign-desc"
                    value={assignForm.description}
                    onChange={(e) => setAssignForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Optional course description..."
                    rows={3}
                    className="mt-1"
                  />
                </div>

                {/* Linked Certification Type */}
                <div>
                  <Label htmlFor="assign-cert-type">Linked Certification Type</Label>
                  <select
                    id="assign-cert-type"
                    aria-label="Select linked certification type"
                    value={assignForm.linked_certification_type_id}
                    onChange={(e) => setAssignForm((f) => ({ ...f, linked_certification_type_id: e.target.value }))}
                    className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">None (optional)</option>
                    {allCertTypes.map((ct) => (
                      <option key={ct.id} value={ct.id}>{ct.name}</option>
                    ))}
                  </select>
                </div>

                {/* Due Date */}
                <div>
                  <Label htmlFor="assign-due">Due Date *</Label>
                  <Input
                    id="assign-due"
                    type="date"
                    value={assignForm.due_date}
                    onChange={(e) => setAssignForm((f) => ({ ...f, due_date: e.target.value }))}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                <Button variant="outline" onClick={() => { setShowAssignTraining(false); resetAssignForm(); }}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveAssignment}
                  disabled={!assignForm.user_id || !assignForm.course_name || !assignForm.due_date}
                >
                  Assign Training
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
