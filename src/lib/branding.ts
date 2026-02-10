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

export function hexToHslValue(hex: string): string | null {
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
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function applyPrimaryColor(hex?: string) {
  if (typeof document === "undefined" || !hex) return;
  const hsl = hexToHslValue(hex);
  if (!hsl) return;
  document.documentElement.style.setProperty("--primary", hsl);
}

/** Reset branding CSS variable to default. Call on company switch or logout. */
export function resetPrimaryColor() {
  if (typeof document === "undefined") return;
  document.documentElement.style.removeProperty("--primary");
}
