const HEX_6_REGEX = /^#[0-9a-fA-F]{6}$/;
const HEX_3_REGEX = /^#[0-9a-fA-F]{3}$/;

/** Normalise 3-digit shorthand (#FFF) to 6-digit (#FFFFFF) */
function normalizeHex(hex: string): string | null {
  if (HEX_6_REGEX.test(hex)) return hex;
  if (HEX_3_REGEX.test(hex)) {
    const r = hex[1], g = hex[2], b = hex[3];
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return null;
}

interface HSL {
  h: number; // 0-360
  s: number; // 0-100
  l: number; // 0-100
}

export function hexToHsl(hex: string): HSL | null {
  const normalized = normalizeHex(hex);
  if (!normalized) return null;
  const r = parseInt(normalized.slice(1, 3), 16) / 255;
  const g = parseInt(normalized.slice(3, 5), 16) / 255;
  const b = parseInt(normalized.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

function hslToString(hsl: HSL): string {
  return `${hsl.h} ${hsl.s}% ${hsl.l}%`;
}

/** Keep for backwards compat */
export function hexToHslValue(hex: string): string | null {
  const hsl = hexToHsl(hex);
  return hsl ? hslToString(hsl) : null;
}

/**
 * Derive a dark-mode variant of a color.
 * Dark colors get lightened so they're visible on dark backgrounds.
 * Light colors get slightly darkened so they don't blow out.
 */
function deriveDarkVariant(hsl: HSL): HSL {
  if (hsl.l < 15) {
    // Near-black: use a desaturated light version
    return { h: hsl.h, s: Math.min(hsl.s, 40), l: 75 };
  }
  if (hsl.l < 40) {
    // Dark color: lighten substantially
    return { h: hsl.h, s: Math.min(hsl.s + 10, 80), l: 68 };
  }
  if (hsl.l < 60) {
    // Medium: lighten moderately
    return { h: hsl.h, s: hsl.s, l: 65 };
  }
  // Already light: use as-is but cap brightness to avoid pure white
  return { h: hsl.h, s: hsl.s, l: Math.min(hsl.l, 80) };
}

/** Should text on this background be white or dark? */
function foregroundForBg(hsl: HSL): string {
  return hsl.l < 55 ? "0 0% 98%" : "0 0% 3.9%";
}

/** Derive sidebar colors from primary */
function sidebarColors(primary: HSL, isDark: boolean) {
  if (isDark) {
    return {
      background: `${primary.h} ${Math.min(primary.s, 15)}% 8%`,
      foreground: "0 0% 95%",
      primary: hslToString(deriveDarkVariant(primary)),
      primaryForeground: "0 0% 10%",
      accent: `${primary.h} ${Math.min(primary.s, 15)}% 14%`,
      accentForeground: "0 0% 95%",
      border: `${primary.h} ${Math.min(primary.s, 15)}% 16%`,
    };
  }
  return {
    background: `${primary.h} ${Math.min(primary.s, 60)}% 14%`,
    foreground: "0 0% 98%",
    primary: `${primary.h} ${Math.min(primary.s, 55)}% 55%`,
    primaryForeground: "0 0% 98%",
    accent: `${primary.h} ${Math.min(primary.s, 55)}% 20%`,
    accentForeground: "0 0% 98%",
    border: `${primary.h} ${Math.min(primary.s, 45)}% 28%`,
  };
}

interface BrandingOptions {
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  uiStyle?: "rounded" | "square";
}

/**
 * Apply full company branding to CSS variables.
 * Call on mount, theme change, and company change.
 */
export function applyBranding(options: BrandingOptions, theme: string) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const isDark = theme === "dark";

  // Primary color
  if (options.primaryColor) {
    const hsl = hexToHsl(options.primaryColor);
    if (hsl) {
      const lightVal = hslToString(hsl);
      const darkVal = hslToString(deriveDarkVariant(hsl));
      const primary = isDark ? darkVal : lightVal;
      const fg = isDark ? foregroundForBg(deriveDarkVariant(hsl)) : foregroundForBg(hsl);

      root.style.setProperty("--primary", primary);
      root.style.setProperty("--primary-foreground", fg);
      root.style.setProperty("--ring", primary);

      // Accent: derived from primary so dropdowns/selections match
      if (isDark) {
        root.style.setProperty("--accent", `${hsl.h} ${Math.min(hsl.s, 30)}% 18%`);
        root.style.setProperty("--accent-foreground", "0 0% 98%");
      } else {
        root.style.setProperty("--accent", `${hsl.h} ${Math.min(hsl.s, 40)}% 93%`);
        root.style.setProperty("--accent-foreground", lightVal);
      }

      // Info: match primary hue
      const infoVal = isDark ? darkVal : lightVal;
      root.style.setProperty("--info", infoVal);
      root.style.setProperty("--info-foreground", fg);

      // Brand-solid: always the original color, for app header bars etc.
      root.style.setProperty("--brand-solid", lightVal);
      root.style.setProperty("--brand-solid-foreground", foregroundForBg(hsl));

      // Sidebar
      const sb = sidebarColors(hsl, isDark);
      root.style.setProperty("--sidebar-background", sb.background);
      root.style.setProperty("--sidebar-foreground", sb.foreground);
      root.style.setProperty("--sidebar-primary", sb.primary);
      root.style.setProperty("--sidebar-primary-foreground", sb.primaryForeground);
      root.style.setProperty("--sidebar-accent", sb.accent);
      root.style.setProperty("--sidebar-accent-foreground", sb.accentForeground);
      root.style.setProperty("--sidebar-border", sb.border);
    }
  }

  // Secondary color
  if (options.secondaryColor) {
    const hsl = hexToHsl(options.secondaryColor);
    if (hsl) {
      const val = isDark ? hslToString(deriveDarkVariant(hsl)) : hslToString(hsl);
      const fg = isDark
        ? foregroundForBg(deriveDarkVariant(hsl))
        : foregroundForBg(hsl);
      root.style.setProperty("--secondary", val);
      root.style.setProperty("--secondary-foreground", fg);
    }
  }

  // Font family
  if (options.fontFamily) {
    root.style.setProperty("--font-sans", `"${options.fontFamily}", system-ui, sans-serif`);
  }

  // UI style → border radius
  if (options.uiStyle) {
    root.style.setProperty("--radius", options.uiStyle === "square" ? "0.25rem" : "0.5rem");
  }
}

/** Remove all custom branding CSS properties. */
export function resetBranding() {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const props = [
    "--primary", "--primary-foreground", "--ring",
    "--accent", "--accent-foreground",
    "--info", "--info-foreground",
    "--brand-solid", "--brand-solid-foreground",
    "--secondary", "--secondary-foreground",
    "--sidebar-background", "--sidebar-foreground", "--sidebar-primary",
    "--sidebar-primary-foreground", "--sidebar-accent",
    "--sidebar-accent-foreground", "--sidebar-border",
    "--font-sans", "--radius",
  ];
  props.forEach((p) => root.style.removeProperty(p));
}

/** Legacy compat — use applyBranding instead */
export function applyPrimaryColor(hex?: string) {
  if (typeof document === "undefined" || !hex) return;
  const hsl = hexToHslValue(hex);
  if (!hsl) return;
  document.documentElement.style.setProperty("--primary", hsl);
}

/** Legacy compat — use resetBranding instead */
export function resetPrimaryColor() {
  if (typeof document === "undefined") return;
  document.documentElement.style.removeProperty("--primary");
}
