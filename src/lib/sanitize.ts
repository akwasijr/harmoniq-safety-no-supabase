import DOMPurify from "dompurify";

/**
 * Sanitize HTML to prevent XSS attacks.
 * Uses DOMPurify to strip dangerous tags/attributes while preserving safe formatting.
 */
export function sanitizeHtml(dirty: string): string {
  if (typeof window === "undefined") {
    // Server-side: strip all HTML tags as a safe fallback
    return dirty.replace(/<[^>]*>/g, "");
  }
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      "p", "br", "b", "i", "em", "strong", "u", "s", "a",
      "ul", "ol", "li", "h1", "h2", "h3", "h4", "h5", "h6",
      "blockquote", "code", "pre", "span", "div", "hr",
      "table", "thead", "tbody", "tr", "th", "td",
      "img", "figure", "figcaption", "sub", "sup",
    ],
    ALLOWED_ATTR: [
      "href", "target", "rel", "src", "alt", "width", "height",
      "class", "id", "title",
    ],
    ALLOW_DATA_ATTR: false,
  });
}
