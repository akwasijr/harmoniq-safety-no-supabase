import { describe, expect, it } from "vitest";
import { buildRegionalDefaults } from "@/lib/company-settings";
import { cloneChecklistTemplate } from "@/lib/template-activation";
import type { ChecklistTemplate } from "@/types";

describe("buildRegionalDefaults", () => {
  it("maps country defaults for Spain", () => {
    expect(buildRegionalDefaults("ES")).toEqual({
      country: "ES",
      language: "es",
      currency: "EUR",
      dateFormat: "DD/MM/YYYY",
      timezone: "Europe/Madrid",
      measurementSystem: "metric",
    });
  });

  it("uses imperial units for the US", () => {
    expect(buildRegionalDefaults("US").measurementSystem).toBe("imperial");
  });
});

describe("cloneChecklistTemplate", () => {
  it("creates a draft copy without mutating the active template", () => {
    const source: ChecklistTemplate = {
      id: "template-1",
      company_id: "company-1",
      name: "Vehicle Safety Walk",
      description: "Original published checklist",
      category: "vehicles",
      assignment: "all",
      recurrence: "weekly",
      items: [
        {
          id: "item-1",
          question: "Check tire pressure",
          type: "yes_no_na",
          required: true,
          order: 1,
        },
      ],
      source_template_id: "transport_vehicle_walkaround",
      regulation: "DVSA / Road Vehicles Regulations / Working Time",
      tags: ["vehicle", "safety"],
      publish_status: "published",
      is_active: true,
      created_at: "2026-03-20T00:00:00.000Z",
      updated_at: "2026-03-20T00:00:00.000Z",
    };

    const clone = cloneChecklistTemplate(source);

    expect(clone.id).not.toBe(source.id);
    expect(clone.name).toBe("Vehicle Safety Walk (Copy)");
    expect(clone.publish_status).toBe("draft");
    expect(clone.is_active).toBe(false);
    expect(clone.items[0].id).not.toBe(source.items[0].id);
    expect(source.publish_status).toBe("published");
    expect(source.is_active).toBe(true);
  });
});
