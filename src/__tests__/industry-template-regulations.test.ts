import { describe, expect, it } from "vitest";
import { getAllTemplates, resolveTemplateRegulation } from "@/data/industry-templates";

describe("resolveTemplateRegulation", () => {
  const constructionJha = getAllTemplates().find((template) => template.id === "construction_jha");
  const foodGlass = getAllTemplates().find((template) => template.id === "food_bev_allergen");

  it("keeps US regulations for US companies", () => {
    expect(constructionJha).toBeTruthy();
    expect(resolveTemplateRegulation(constructionJha!, "US")).toBe("OSHA 29 CFR 1926");
  });

  it("maps US-centric regulations to country-aware alternatives", () => {
    expect(constructionJha).toBeTruthy();
    expect(resolveTemplateRegulation(constructionJha!, "NL")).toBe("Arbowet / RI&E");
    expect(resolveTemplateRegulation(constructionJha!, "SE")).toBe("AFS / SAM");
    expect(resolveTemplateRegulation(constructionJha!, "GB")).toBe("HSE CDM 2015 / RIDDOR");
    expect(resolveTemplateRegulation(constructionJha!, "DE")).toBe("ArbSchG / BaustellV / BetrSichV");
    expect(resolveTemplateRegulation(constructionJha!, "FR")).toBe("Code du travail / PPSPS");
    expect(resolveTemplateRegulation(constructionJha!, "ES")).toBe("Ley 31/1995 / RD 1627/1997");
  });

  it("preserves already international regulations", () => {
    expect(foodGlass).toBeTruthy();
    expect(resolveTemplateRegulation(foodGlass!, "FR")).toBe("FALCPA / EU FIC 1169/2011");
  });
});
