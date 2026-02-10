import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border border-transparent px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
        secondary:
          "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
        destructive:
          "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
        success:
          "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
        warning:
          "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
        info:
          "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
        outline: "text-foreground border-border",
        // Status variants for incidents (both dash and underscore versions)
        new: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
        "in-progress": "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
        in_progress: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
        "in-review": "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200",
        in_review: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200",
        resolved: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
        archived: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
        pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200",
        // Severity variants
        low: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
        medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200",
        high: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200",
        critical: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
