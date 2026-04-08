import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Badge, badgeVariants } from "@/components/ui/badge";

// ---------------------------------------------------------------------------
// Render smoke tests — every variant renders without error
// ---------------------------------------------------------------------------

const VARIANTS = [
  "default",
  "secondary",
  "destructive",
  "success",
  "warning",
  "info",
  "outline",
  "in-progress",
  "in_progress",
  "in-review",
  "in_review",
  "resolved",
  "archived",
  "pending",
  "low",
  "medium",
  "high",
  "critical",
  "expired",
  "overdue",
  "inactive",
  "active",
  "completed",
  "cancelled",
] as const;

describe("Badge — render smoke tests", () => {
  for (const variant of VARIANTS) {
    it(`renders "${variant}" variant without errors`, () => {
      const { container } = render(
        <Badge variant={variant}>{variant}</Badge>,
      );
      expect(container.querySelector("span")).not.toBeNull();
      expect(container.textContent).toBe(variant);
    });
  }
});

// ---------------------------------------------------------------------------
// Color contract tests — specific hex values in class strings
// ---------------------------------------------------------------------------

describe("Badge — color correctness", () => {
  it("success variant contains green hex #059669", () => {
    const classes = badgeVariants({ variant: "success" });
    expect(classes).toContain("#059669");
  });

  it("destructive variant contains red hex #dc2626", () => {
    const classes = badgeVariants({ variant: "destructive" });
    expect(classes).toContain("#dc2626");
  });

  it("warning variant contains amber hex #d97706", () => {
    const classes = badgeVariants({ variant: "warning" });
    expect(classes).toContain("#d97706");
  });

  it("info variant contains blue hex #2563eb", () => {
    const classes = badgeVariants({ variant: "info" });
    expect(classes).toContain("#2563eb");
  });

  it("critical variant uses same red as destructive (#dc2626)", () => {
    const classes = badgeVariants({ variant: "critical" });
    expect(classes).toContain("#dc2626");
  });
});

// ---------------------------------------------------------------------------
// Dark mode support
// ---------------------------------------------------------------------------

describe("Badge — dark mode classes", () => {
  it("success variant includes dark:bg-* class", () => {
    const classes = badgeVariants({ variant: "success" });
    expect(classes).toMatch(/dark:bg-/);
  });

  it("destructive variant includes dark:bg-* class", () => {
    const classes = badgeVariants({ variant: "destructive" });
    expect(classes).toMatch(/dark:bg-/);
  });

  it("warning variant includes dark:text-* class", () => {
    const classes = badgeVariants({ variant: "warning" });
    expect(classes).toMatch(/dark:text-/);
  });

  it("all status/severity variants have dark mode styles", () => {
    const statusVariants = [
      "success",
      "destructive",
      "warning",
      "info",
      "pending",
      "resolved",
      "low",
      "medium",
      "high",
      "critical",
    ] as const;
    for (const v of statusVariants) {
      const classes = badgeVariants({ variant: v });
      expect(classes, `${v} should have dark:bg-`).toMatch(/dark:bg-/);
      expect(classes, `${v} should have dark:text-`).toMatch(/dark:text-/);
    }
  });
});

// ---------------------------------------------------------------------------
// Removed variant
// ---------------------------------------------------------------------------

describe("Badge — removed variants", () => {
  it("does NOT have a 'new' variant", () => {
    // @ts-expect-error — intentionally passing removed variant
    const newClasses = badgeVariants({ variant: "new" });
    // cva omits variant classes for unknown variants — no "new"-specific styling
    expect(newClasses).not.toContain("new");
    // Verify it does NOT match the default variant (which includes explicit colors)
    const defaultClasses = badgeVariants({ variant: "default" });
    expect(newClasses).not.toBe(defaultClasses);
  });
});

// ---------------------------------------------------------------------------
// Accessibility — base classes
// ---------------------------------------------------------------------------

describe("Badge — accessibility base classes", () => {
  it("includes focus ring styles in base classes", () => {
    const classes = badgeVariants({ variant: "default" });
    expect(classes).toContain("focus:outline-none");
    expect(classes).toContain("focus:ring-2");
  });

  it("renders as a <span> element", () => {
    const { container } = render(<Badge>Test</Badge>);
    const el = container.firstElementChild;
    expect(el?.tagName).toBe("SPAN");
  });

  it("passes through className prop", () => {
    const { container } = render(
      <Badge className="custom-class">Test</Badge>,
    );
    expect(container.firstElementChild?.classList.contains("custom-class")).toBe(
      true,
    );
  });

  it("passes through arbitrary props", () => {
    const { container } = render(
      <Badge data-testid="badge-test">Test</Badge>,
    );
    expect(
      container.querySelector('[data-testid="badge-test"]'),
    ).not.toBeNull();
  });
});
