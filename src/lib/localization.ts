const DEFAULT_LANGUAGE = "en";

export function applyDocumentLanguage(language?: string) {
  if (typeof document === "undefined") return;
  const resolved = (language || DEFAULT_LANGUAGE).trim();
  if (!resolved) return;
  document.documentElement.lang = resolved;
  document.documentElement.setAttribute("data-language", resolved);
}
