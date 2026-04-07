import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border border-transparent px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "bg-slate-600 text-white dark:bg-slate-300 dark:text-slate-900",
        secondary:
          "bg-slate-500 text-white dark:bg-slate-300 dark:text-slate-900",
        destructive:
          "bg-red-600 text-white dark:bg-red-400/20 dark:text-red-300",
        success:
          "bg-emerald-600 text-white dark:bg-emerald-400/20 dark:text-emerald-300",
        warning:
          "bg-amber-500 text-white dark:bg-amber-400/20 dark:text-amber-300",
        info:
          "bg-blue-600 text-white dark:bg-blue-400/20 dark:text-blue-300",
        outline: "text-foreground bg-muted/50 border-border",
        // Status variants
        "in-progress": "bg-amber-500 text-white dark:bg-amber-400/20 dark:text-amber-300",
        in_progress: "bg-amber-500 text-white dark:bg-amber-400/20 dark:text-amber-300",
        "in-review": "bg-purple-600 text-white dark:bg-purple-400/20 dark:text-purple-300",
        in_review: "bg-purple-600 text-white dark:bg-purple-400/20 dark:text-purple-300",
        resolved: "bg-emerald-600 text-white dark:bg-emerald-400/20 dark:text-emerald-300",
        archived: "bg-gray-500 text-white dark:bg-gray-600/40 dark:text-gray-300",
        pending: "bg-yellow-500 text-white dark:bg-yellow-400/20 dark:text-yellow-300",
        // Severity variants
        low: "bg-emerald-600 text-white dark:bg-emerald-400/20 dark:text-emerald-300",
        medium: "bg-yellow-500 text-white dark:bg-yellow-400/20 dark:text-yellow-300",
        high: "bg-orange-600 text-white dark:bg-orange-400/20 dark:text-orange-300",
        critical: "bg-red-600 text-white dark:bg-red-400/20 dark:text-red-300",
        // Semantic status variants
        expired:
          "bg-red-600 text-white dark:bg-red-400/20 dark:text-red-300",
        overdue:
          "bg-orange-600 text-white dark:bg-orange-400/20 dark:text-orange-300",
        inactive:
          "bg-gray-500 text-white dark:bg-gray-600/40 dark:text-gray-300",
        active:
          "bg-emerald-600 text-white dark:bg-emerald-400/20 dark:text-emerald-300",
        completed:
          "bg-emerald-600 text-white dark:bg-emerald-400/20 dark:text-emerald-300",
        cancelled:
          "bg-gray-500 text-white dark:bg-gray-600/40 dark:text-gray-300",
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
