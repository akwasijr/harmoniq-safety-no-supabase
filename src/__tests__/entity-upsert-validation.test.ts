import { describe, expect, it } from "vitest";
import {
  getAssetScopedRowIds,
  validateEntityUpsertRequest,
} from "@/lib/entity-upsert";

const companyId = "11111111-1111-1111-1111-111111111111";
const otherCompanyId = "22222222-2222-2222-2222-222222222222";
const assetId = "33333333-3333-3333-3333-333333333333";

describe("validateEntityUpsertRequest", () => {
  it("forces company-scoped writes onto the authenticated company", () => {
    const result = validateEntityUpsertRequest(
      "incidents",
      { id: assetId, title: "Near miss" },
      { role: "company_admin", company_id: companyId }
    );

    expect(result).toEqual({
      ok: true,
      rows: [{ id: assetId, title: "Near miss", company_id: companyId }],
    });
  });

  it("rejects cross-company writes for non-platform users", () => {
    const result = validateEntityUpsertRequest(
      "assets",
      { id: assetId, company_id: otherCompanyId },
      { role: "company_admin", company_id: companyId }
    );

    expect(result).toEqual({
      ok: false,
      status: 403,
      error: "Cannot access data from another company",
    });
  });

  it("requires company_id when a platform admin writes company-scoped data", () => {
    const result = validateEntityUpsertRequest(
      "assets",
      { id: assetId, name: "Forklift" },
      { role: "super_admin", company_id: null }
    );

    expect(result).toEqual({
      ok: false,
      status: 400,
      error: "company_id is required for platform writes",
    });
  });

  it("requires a valid asset reference for asset-scoped tables", () => {
    const result = validateEntityUpsertRequest(
      "asset_inspections",
      { id: assetId },
      { role: "company_admin", company_id: companyId }
    );

    expect(result).toEqual({
      ok: false,
      status: 400,
      error: "asset_id is required and must be a valid UUID",
    });
  });

  it("allows company_admin to write to their own company", () => {
    const result = validateEntityUpsertRequest(
      "companies",
      { id: companyId, name: "Acme" },
      { role: "company_admin", company_id: companyId }
    );

    expect(result).toEqual({
      ok: true,
      rows: [{ id: companyId, name: "Acme" }],
    });
  });

  it("blocks company_admin from writing to another company", () => {
    const result = validateEntityUpsertRequest(
      "companies",
      { id: otherCompanyId, name: "Evil Corp" },
      { role: "company_admin", company_id: companyId }
    );

    expect(result).toEqual({
      ok: false,
      status: 403,
      error: "Cannot modify other companies",
    });
  });
});

describe("getAssetScopedRowIds", () => {
  it("returns distinct asset ids for asset-scoped tables", () => {
    expect(
      getAssetScopedRowIds("asset_inspections", [
        { asset_id: assetId },
        { asset_id: assetId },
        { asset_id: otherCompanyId },
      ])
    ).toEqual([assetId, otherCompanyId]);
  });

  it("ignores non asset-scoped tables", () => {
    expect(getAssetScopedRowIds("incidents", [{ asset_id: assetId }])).toEqual([]);
  });
});
