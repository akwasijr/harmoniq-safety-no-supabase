/**
 * Server-side input validation & sanitization utilities.
 * Use these in API routes to validate/clean user inputs before processing.
 */

// Strip HTML tags for plain-text fields (server-safe, no DOM needed)
export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, "").trim();
}

// Truncate to max length
export function truncate(input: string, maxLength: number): string {
  return input.length > maxLength ? input.slice(0, maxLength) : input;
}

// Sanitize a plain-text field: strip HTML, trim, enforce max length
export function sanitizeText(input: unknown, maxLength = 255): string {
  if (typeof input !== "string") return "";
  return truncate(stripHtml(input), maxLength);
}

// Validate email format (RFC 5322 simplified)
const EMAIL_RE = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email) && email.length <= 254;
}

// Password strength: min 12 chars, at least one uppercase, one lowercase, one digit
export function validatePassword(password: string): { valid: boolean; reason?: string } {
  if (typeof password !== "string") return { valid: false, reason: "Password is required" };
  if (password.length < 12) return { valid: false, reason: "Password must be at least 12 characters" };
  if (password.length > 128) return { valid: false, reason: "Password must be 128 characters or fewer" };
  if (!/[a-z]/.test(password)) return { valid: false, reason: "Password must include a lowercase letter" };
  if (!/[A-Z]/.test(password)) return { valid: false, reason: "Password must include an uppercase letter" };
  if (!/[0-9]/.test(password)) return { valid: false, reason: "Password must include a number" };
  return { valid: true };
}

// Validate UUID v4 format
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function isValidUUID(id: string): boolean {
  return UUID_RE.test(id);
}

// Validate a role value against allowed set
export function isValidRole(role: string, allowed = ["worker", "supervisor", "safety_officer", "company_admin", "super_admin"]): boolean {
  return allowed.includes(role);
}

// Validate array of UUIDs (e.g. team_ids)
export function validateUUIDArray(arr: unknown): string[] | null {
  if (!Array.isArray(arr)) return null;
  if (arr.length > 50) return null; // sensible cap
  const valid = arr.every((id) => typeof id === "string" && isValidUUID(id));
  return valid ? arr : null;
}
