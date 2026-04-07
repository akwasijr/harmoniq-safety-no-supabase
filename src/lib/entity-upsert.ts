import { isValidUUID } from "@/lib/validation";
import { canAccessTable } from "@/lib/permissions";

export const allowedEntityUpsertTables = [
  "incidents",
  "assets",
  "tickets",
  "work_orders",
  "locations",
  "teams",
  "content",
  "checklist_templates",
  "checklist_submissions",
  "risk_evaluations",
  "parts",
  "corrective_actions",
  "asset_inspections",
  "meter_readings",
  "inspection_routes",
  "inspection_rounds",
  "notifications",
  "companies",
] as const;

export type AllowedEntityUpsertTable = (typeof allowedEntityUpsertTables)[number];

export type EntityUpsertProfile = {
  company_id: string | null;
  role: string;
};

export type EntityUpsertRow = Record<string, unknown>;

const MAX_BATCH_SIZE = 50;

const allowedEntityUpsertTableSet = new Set<AllowedEntityUpsertTable>(allowedEntityUpsertTables);
const companyScopedTables = new Set<AllowedEntityUpsertTable>(
  allowedEntityUpsertTables.filter((table) => !["asset_inspections", "meter_readings", "companies"].includes(table))
);
const assetScopedTables = new Set<AllowedEntityUpsertTable>(["asset_inspections", "meter_readings"]);

type EntityUpsertValidationResult =
  | { ok: true; rows: EntityUpsertRow[] }
  | { ok: false; status: number; error: string };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isAllowedEntityUpsertTable(value: unknown): value is AllowedEntityUpsertTable {
  return typeof value === "string" && allowedEntityUpsertTableSet.has(value as AllowedEntityUpsertTable);
}

export function validateEntityUpsertRequest(
  table: unknown,
  data: unknown,
  profile: EntityUpsertProfile
): EntityUpsertValidationResult {
  if (!isAllowedEntityUpsertTable(table)) {
    return { ok: false, status: 403, error: "Table not allowed" };
  }

  // RBAC: check whether this role can write to this table
  if (!canAccessTable(profile.role, table, "create")) {
    return { ok: false, status: 403, error: "You do not have permission to write to this resource" };
  }

  const rows = Array.isArray(data) ? data : [data];

  if (rows.length === 0) {
    return { ok: false, status: 400, error: "At least one row is required" };
  }

  if (rows.length > MAX_BATCH_SIZE) {
    return { ok: false, status: 413, error: `Batch limit exceeded (${MAX_BATCH_SIZE} rows max)` };
  }

  const normalizedRows: EntityUpsertRow[] = [];

  for (const row of rows) {
    if (!isPlainObject(row)) {
      return { ok: false, status: 400, error: "Each upsert row must be an object" };
    }

    const normalizedRow: EntityUpsertRow = { ...row };

    if (normalizedRow.id !== undefined) {
      if (typeof normalizedRow.id !== "string" || !isValidUUID(normalizedRow.id)) {
        return { ok: false, status: 400, error: "Row id must be a valid UUID" };
      }
    }

    if (table === "companies") {
      if (profile.role !== "super_admin") {
        return { ok: false, status: 403, error: "Insufficient permissions" };
      }

      normalizedRows.push(normalizedRow);
      continue;
    }

    if (companyScopedTables.has(table)) {
      if (profile.role === "super_admin") {
        if (typeof normalizedRow.company_id !== "string" || !isValidUUID(normalizedRow.company_id)) {
          return { ok: false, status: 400, error: "company_id is required for platform writes" };
        }
      } else {
        if (!profile.company_id || !isValidUUID(profile.company_id)) {
          return { ok: false, status: 403, error: "User profile missing company access" };
        }

        if (
          normalizedRow.company_id !== undefined &&
          (typeof normalizedRow.company_id !== "string" || normalizedRow.company_id !== profile.company_id)
        ) {
          return { ok: false, status: 403, error: "Cannot access data from another company" };
        }

        normalizedRow.company_id = profile.company_id;
      }
    }

    if (assetScopedTables.has(table)) {
      if (typeof normalizedRow.asset_id !== "string" || !isValidUUID(normalizedRow.asset_id)) {
        return { ok: false, status: 400, error: "asset_id is required and must be a valid UUID" };
      }
    }

    normalizedRows.push(normalizedRow);
  }

  return { ok: true, rows: normalizedRows };
}

export function getAssetScopedRowIds(table: AllowedEntityUpsertTable, rows: EntityUpsertRow[]): string[] {
  if (!assetScopedTables.has(table)) {
    return [];
  }

  return [...new Set(rows.map((row) => row.asset_id).filter((assetId): assetId is string => typeof assetId === "string"))];
}
