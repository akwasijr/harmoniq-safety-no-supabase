import { describe, it, expect } from "vitest";
import { sanitizeHtml } from "@/lib/sanitize";

describe("sanitizeHtml", () => {
  // In jsdom environment, DOMPurify should work

  it("allows safe formatting tags", () => {
    const result = sanitizeHtml("<p><b>Bold</b> and <em>italic</em></p>");
    expect(result).toContain("<b>Bold</b>");
    expect(result).toContain("<em>italic</em>");
  });

  it("strips script tags", () => {
    const result = sanitizeHtml('<script>alert("xss")</script>Hello');
    expect(result).not.toContain("<script>");
    expect(result).not.toContain("alert");
    expect(result).toContain("Hello");
  });

  it("strips event handlers", () => {
    const result = sanitizeHtml('<img src="x" onerror="alert(1)">');
    expect(result).not.toContain("onerror");
  });

  it("strips data attributes", () => {
    const result = sanitizeHtml('<div data-evil="payload">text</div>');
    expect(result).not.toContain("data-evil");
    expect(result).toContain("text");
  });

  it("allows safe links", () => {
    const result = sanitizeHtml('<a href="https://example.com" target="_blank">link</a>');
    expect(result).toContain('href="https://example.com"');
    expect(result).toContain("link");
  });

  it("allows img with src and alt", () => {
    const result = sanitizeHtml('<img src="photo.jpg" alt="A photo">');
    expect(result).toContain('src="photo.jpg"');
    expect(result).toContain('alt="A photo"');
  });

  it("allows lists", () => {
    const result = sanitizeHtml("<ul><li>Item 1</li><li>Item 2</li></ul>");
    expect(result).toContain("<ul>");
    expect(result).toContain("<li>Item 1</li>");
  });

  it("allows tables", () => {
    const result = sanitizeHtml("<table><tr><td>Cell</td></tr></table>");
    expect(result).toContain("<table>");
    expect(result).toContain("<td>Cell</td>");
  });

  it("strips javascript: URLs", () => {
    const result = sanitizeHtml('<a href="javascript:alert(1)">click</a>');
    expect(result).not.toContain("javascript:");
  });

  it("handles empty string", () => {
    expect(sanitizeHtml("")).toBe("");
  });

  it("handles plain text without tags", () => {
    expect(sanitizeHtml("Hello world")).toBe("Hello world");
  });
});
