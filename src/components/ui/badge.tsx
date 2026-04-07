import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border border-transparent px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-slate-100",
        secondary:
          "bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-slate-100",
        destructive:
          "bg-red-200 text-red-900 dark:bg-red-900/50 dark:text-red-100",
        success:
          "bg-green-200 text-green-900 dark:bg-green-900/50 dark:text-green-100",
        warning:
          "bg-amber-200 text-amber-900 dark:bg-amber-900/50 dark:text-amber-100",
        info:
          "bg-blue-200 text-blue-900 dark:bg-blue-900/50 dark:text-blue-100",
        outline: "text-foreground bg-muted/50 border-border",
        // Status variants
        "in-progress": "bg-amber-200 text-amber-900 dark:bg-amber-900/50 dark:text-amber-100",
        in_progress: "bg-amber-200 text-amber-900 dark:bg-amber-900/50 dark:text-amber-100",
        "in-review": "bg-purple-200 text-purple-900 dark:bg-purple-900/50 dark:text-purple-100",
        in_review: "bg-purple-200 text-purple-900 dark:bg-purple-900/50 dark:text-purple-100",
        resolved: "bg-green-200 text-green-900 dark:bg-green-900/50 dark:text-green-100",
        archived: "bg-gray-200 text-gray-900 dark:bg-gray-800 dark:text-gray-100",
        pending: "bg-yellow-200 text-yellow-900 dark:bg-yellow-900/50 dark:text-yellow-100",
        // Severity variants
        low: "bg-green-200 text-green-900 dark:bg-green-900/50 dark:text-green-100",
        medium: "bg-yellow-200 text-yellow-900 dark:bg-yellow-900/50 dark:text-yellow-100",
        high: "bg-orange-200 text-orange-900 dark:bg-orange-900/50 dark:text-orange-100",
        critical: "bg-red-200 text-red-900 dark:bg-red-900/50 dark:text-red-100",
        // Semantic status variants
        expired:
          "bg-red-200 text-red-900 dark:bg-red-900/50 dark:text-red-100",
        overdue:
          "bg-orange-200 text-orange-900 dark:bg-orange-900/50 dark:text-orange-100",
        inactive:
          "bg-gray-200 text-gray-900 dark:bg-gray-800 dark:text-gray-100",
        active:
          "bg-green-200 text-green-900 dark:bg-green-900/50 dark:text-green-100",
        completed:
          "bg-green-200 text-green-900 dark:bg-green-900/50 dark:text-green-100",
        cancelled:
          "bg-gray-200 text-gray-900 dark:bg-gray-800 dark:text-gray-100",
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
