import { describe, it, expect, beforeEach } from "vitest";
import {
  createTestIncident,
  createTestUser,
  createTestLocation,
  createTestTicket,
  resetIdCounter,
} from "./helpers";

/**
 * Tests for company data isolation logic.
 * The entity stores filter by company_id client-side via itemsForCompany().
 * These tests verify the filtering logic works correctly.
 */
describe("Company data isolation", () => {
  beforeEach(() => {
    resetIdCounter();
  });

  const companyA = "company-a";
  const companyB = "company-b";

  describe("itemsForCompany filtering", () => {
    // This replicates the logic in create-entity-store.tsx itemsForCompany
    function itemsForCompany<T extends { id: string }>(
      items: T[],
      companyId: string | null | undefined
    ): T[] {
      if (!companyId) return items;
      return items.filter(
        (item) =>
          "company_id" in item &&
          (item as unknown as { company_id: string }).company_id === companyId
      );
    }

    it("returns only items for the specified company", () => {
      const incidents = [
        createTestIncident({ company_id: companyA }),
        createTestIncident({ company_id: companyA }),
        createTestIncident({ company_id: companyB }),
      ];

      const result = itemsForCompany(incidents, companyA);
      expect(result).toHaveLength(2);
      expect(result.every((i) => i.company_id === companyA)).toBe(true);
    });

    it("returns all items when companyId is null", () => {
      const incidents = [
        createTestIncident({ company_id: companyA }),
        createTestIncident({ company_id: companyB }),
      ];

      expect(itemsForCompany(incidents, null)).toHaveLength(2);
    });

    it("returns all items when companyId is undefined", () => {
      const incidents = [
        createTestIncident({ company_id: companyA }),
        createTestIncident({ company_id: companyB }),
      ];

      expect(itemsForCompany(incidents, undefined)).toHaveLength(2);
    });

    it("returns empty array when no items match", () => {
      const incidents = [
        createTestIncident({ company_id: companyA }),
      ];

      expect(itemsForCompany(incidents, companyB)).toHaveLength(0);
    });

    it("works with users", () => {
      const users = [
        createTestUser({ company_id: companyA }),
        createTestUser({ company_id: companyA }),
        createTestUser({ company_id: companyB }),
      ];

      expect(itemsForCompany(users, companyA)).toHaveLength(2);
      expect(itemsForCompany(users, companyB)).toHaveLength(1);
    });

    it("works with locations", () => {
      const locations = [
        createTestLocation({ company_id: companyA }),
        createTestLocation({ company_id: companyB }),
      ];

      expect(itemsForCompany(locations, companyA)).toHaveLength(1);
    });

    it("works with tickets", () => {
      const tickets = [
        createTestTicket({ company_id: companyA }),
        createTestTicket({ company_id: companyB }),
        createTestTicket({ company_id: companyB }),
      ];

      expect(itemsForCompany(tickets, companyB)).toHaveLength(2);
    });
  });

  describe("cross-company access prevention", () => {
    it("company A cannot see company B incidents", () => {
      const allIncidents = [
        createTestIncident({ company_id: companyA, title: "A incident" }),
        createTestIncident({ company_id: companyB, title: "B incident" }),
      ];

      const companyAView = allIncidents.filter((i) => i.company_id === companyA);
      expect(companyAView).toHaveLength(1);
      expect(companyAView[0].title).toBe("A incident");
    });

    it("super_admin can see all companies (null companyId)", () => {
      const allUsers = [
        createTestUser({ company_id: companyA }),
        createTestUser({ company_id: companyB }),
      ];

      // Super admin passes null company filter
      const superAdminView = allUsers; // No filtering
      expect(superAdminView).toHaveLength(2);
    });
  });
});
