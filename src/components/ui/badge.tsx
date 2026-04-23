import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ring-1", {
  variants: {
    variant: {
      default: "bg-stone-100 text-stone-700 ring-stone-200",
      sage: "bg-sage-100 text-sage-800 ring-sage-200",
      bronze: "bg-bronze-100 text-bronze-800 ring-bronze-200",
      dark: "bg-charcoal-950 text-ivory-50 ring-charcoal-900",
      alert: "bg-rose-50 text-rose-700 ring-rose-100",
    },
  },
  defaultVariants: { variant: "default" },
});

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
