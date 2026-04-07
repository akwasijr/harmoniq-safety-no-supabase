import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border border-transparent px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "bg-slate-100 text-slate-700 dark:bg-slate-700/60 dark:text-slate-200",
        secondary:
          "bg-slate-100 text-slate-700 dark:bg-slate-700/60 dark:text-slate-200",
        destructive:
          "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
        success:
          "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
        warning:
          "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
        info:
          "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
        outline: "text-foreground bg-muted/50 border-border",
        // Status variants
        "in-progress": "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
        in_progress: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
        "in-review": "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300",
        in_review: "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300",
        resolved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
        archived: "bg-gray-100 text-gray-600 dark:bg-gray-700/60 dark:text-gray-300",
        pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300",
        // Severity variants
        low: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
        medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300",
        high: "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300",
        critical: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
        // Semantic status variants
        expired:
          "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
        overdue:
          "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300",
        inactive:
          "bg-gray-100 text-gray-600 dark:bg-gray-700/60 dark:text-gray-300",
        active:
          "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
        completed:
          "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
        cancelled:
          "bg-gray-100 text-gray-600 dark:bg-gray-700/60 dark:text-gray-300",
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
