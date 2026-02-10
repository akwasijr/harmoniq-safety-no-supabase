export function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    // Shape validation: if fallback is an array, parsed must be an array of objects with id
    if (Array.isArray(fallback) && !Array.isArray(parsed)) return fallback;
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Verify each element is an object with at least an id field (entity shape check)
      const allValid = parsed.every(
        (item: unknown) => typeof item === "object" && item !== null && "id" in item
      );
      if (!allValid) return fallback;
    }
    // Non-array: verify it's the same type as fallback
    if (!Array.isArray(fallback) && typeof parsed !== typeof fallback) return fallback;
    return parsed as T;
  } catch {
    return fallback;
  }
}

export function saveToStorage<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    // QuotaExceededError or SecurityError in private browsing
    console.warn(`[Harmoniq] Failed to save to localStorage key "${key}":`, err);
  }
}

/**
 * Clear all Harmoniq data from localStorage.
 * Called on logout to prevent data leaking between sessions.
 */
export function clearAllHarmoniqStorage() {
  if (typeof window === "undefined") return;
  const keysToRemove: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (key && key.startsWith("harmoniq_")) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((key) => window.localStorage.removeItem(key));
}
