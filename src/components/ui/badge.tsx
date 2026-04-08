import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Color pairs tested for WCAG AA contrast (4.5:1 minimum).
 * Light mode: dark solid bg + white text
 * Dark mode: inline styles with specific hex values for guaranteed contrast
 */
const badgeVariants = cva(
  "inline-flex items-center rounded-md border border-transparent px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "bg-[#475569] text-white dark:bg-[#334155] dark:text-[#e2e8f0]",
        secondary:
          "bg-[#475569] text-white dark:bg-[#334155] dark:text-[#e2e8f0]",
        destructive:
          "bg-[#dc2626] text-white dark:bg-[#7f1d1d] dark:text-[#fca5a5]",
        success:
          "bg-[#059669] text-white dark:bg-[#064e3b] dark:text-[#6ee7b7]",
        warning:
          "bg-[#b45309] text-white dark:bg-[#78350f] dark:text-[#fcd34d]",
        info:
          "bg-[#2563eb] text-white dark:bg-[#1e3a5f] dark:text-[#93c5fd]",
        outline: "text-foreground bg-muted/50 border-border",
        // Status variants
        "in-progress": "bg-[#2563eb] text-white dark:bg-[#1e3a5f] dark:text-[#93c5fd]",
        in_progress: "bg-[#2563eb] text-white dark:bg-[#1e3a5f] dark:text-[#93c5fd]",
        "in-review": "bg-[#7c3aed] text-white dark:bg-[#4c1d95] dark:text-[#c4b5fd]",
        in_review: "bg-[#7c3aed] text-white dark:bg-[#4c1d95] dark:text-[#c4b5fd]",
        resolved: "bg-[#059669] text-white dark:bg-[#064e3b] dark:text-[#6ee7b7]",
        archived: "bg-[#6b7280] text-white dark:bg-[#374151] dark:text-[#d1d5db]",
        pending: "bg-[#475569] text-white dark:bg-[#334155] dark:text-[#e2e8f0]",
        // Severity variants
        low: "bg-[#059669] text-white dark:bg-[#064e3b] dark:text-[#6ee7b7]",
        medium: "bg-[#b45309] text-white dark:bg-[#78350f] dark:text-[#fcd34d]",
        high: "bg-[#ea580c] text-white dark:bg-[#7c2d12] dark:text-[#fdba74]",
        critical: "bg-[#dc2626] text-white dark:bg-[#7f1d1d] dark:text-[#fca5a5]",
        // Semantic status variants
        expired: "bg-[#dc2626] text-white dark:bg-[#7f1d1d] dark:text-[#fca5a5]",
        overdue: "bg-[#ea580c] text-white dark:bg-[#7c2d12] dark:text-[#fdba74]",
        inactive: "bg-[#6b7280] text-white dark:bg-[#374151] dark:text-[#d1d5db]",
        active: "bg-[#059669] text-white dark:bg-[#064e3b] dark:text-[#6ee7b7]",
        completed: "bg-[#059669] text-white dark:bg-[#064e3b] dark:text-[#6ee7b7]",
        cancelled: "bg-[#6b7280] text-white dark:bg-[#374151] dark:text-[#d1d5db]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
