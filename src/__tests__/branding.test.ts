import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { hexToHsl, hexToHslValue, applyBranding, resetBranding } from "@/lib/branding";

describe("branding", () => {
  describe("hexToHsl", () => {
    it("converts standard hex colors", () => {
      const red = hexToHsl("#FF0000");
      expect(red).toEqual({ h: 0, s: 100, l: 50 });

      const green = hexToHsl("#00FF00");
      expect(green).toEqual({ h: 120, s: 100, l: 50 });

      const blue = hexToHsl("#0000FF");
      expect(blue).toEqual({ h: 240, s: 100, l: 50 });
    });

    it("converts the default brand color #7045d3", () => {
      const hsl = hexToHsl("#7045d3");
      expect(hsl).not.toBeNull();
      expect(hsl!.h).toBeGreaterThanOrEqual(250);
      expect(hsl!.h).toBeLessThanOrEqual(270);
      expect(hsl!.s).toBeGreaterThan(40);
    });

    it("handles 3-digit hex shorthand", () => {
      const white = hexToHsl("#FFF");
      expect(white).toEqual({ h: 0, s: 0, l: 100 });
    });

    it("returns null for invalid hex", () => {
      expect(hexToHsl("invalid")).toBeNull();
      expect(hexToHsl("#GGG")).toBeNull();
      expect(hexToHsl("")).toBeNull();
    });
  });

  describe("hexToHslValue", () => {
    it("returns HSL string format", () => {
      const val = hexToHslValue("#FF0000");
      expect(val).toBe("0 100% 50%");
    });

    it("returns null for invalid input", () => {
      expect(hexToHslValue("bad")).toBeNull();
    });
  });

  describe("applyBranding", () => {
    beforeEach(() => {
      resetBranding();
    });

    afterEach(() => {
      resetBranding();
    });

    it("sets primary CSS variable from hex color", () => {
      applyBranding({ primaryColor: "#7045d3" }, "light");
      const root = document.documentElement;
      const primary = root.style.getPropertyValue("--primary");
      expect(primary).toBeTruthy();
      expect(primary).toContain("%");
    });

    it("sets brand-solid for app header", () => {
      applyBranding({ primaryColor: "#FF5500" }, "light");
      const root = document.documentElement;
      const brandSolid = root.style.getPropertyValue("--brand-solid");
      expect(brandSolid).toBeTruthy();
    });

    it("sets different values for dark theme", () => {
      applyBranding({ primaryColor: "#7045d3" }, "light");
      const lightPrimary = document.documentElement.style.getPropertyValue("--primary");

      resetBranding();

      applyBranding({ primaryColor: "#7045d3" }, "dark");
      const darkPrimary = document.documentElement.style.getPropertyValue("--primary");

      expect(lightPrimary).not.toBe(darkPrimary);
    });

    it("sets secondary color", () => {
      applyBranding({ secondaryColor: "#22C55E" }, "light");
      const secondary = document.documentElement.style.getPropertyValue("--secondary");
      expect(secondary).toBeTruthy();
    });

    it("sets font family", () => {
      applyBranding({ fontFamily: "Inter" }, "light");
      const font = document.documentElement.style.getPropertyValue("--font-sans");
      expect(font).toContain("Inter");
    });

    it("sets border radius for rounded style", () => {
      applyBranding({ uiStyle: "rounded" }, "light");
      const radius = document.documentElement.style.getPropertyValue("--radius");
      expect(radius).toBe("0.5rem");
    });

    it("sets border radius for square style", () => {
      applyBranding({ uiStyle: "square" }, "light");
      const radius = document.documentElement.style.getPropertyValue("--radius");
      expect(radius).toBe("0.25rem");
    });

    it("sets sidebar colors from primary", () => {
      applyBranding({ primaryColor: "#7045d3" }, "light");
      const root = document.documentElement;
      expect(root.style.getPropertyValue("--sidebar-background")).toBeTruthy();
      expect(root.style.getPropertyValue("--sidebar-primary")).toBeTruthy();
    });
  });

  describe("resetBranding", () => {
    it("clears all branding CSS variables", () => {
      applyBranding({ primaryColor: "#FF0000", secondaryColor: "#00FF00", fontFamily: "Manrope", uiStyle: "square" }, "light");

      const root = document.documentElement;
      expect(root.style.getPropertyValue("--primary")).toBeTruthy();

      resetBranding();

      expect(root.style.getPropertyValue("--primary")).toBe("");
      expect(root.style.getPropertyValue("--secondary")).toBe("");
      expect(root.style.getPropertyValue("--font-sans")).toBe("");
      expect(root.style.getPropertyValue("--radius")).toBe("");
      expect(root.style.getPropertyValue("--brand-solid")).toBe("");
    });
  });
});
