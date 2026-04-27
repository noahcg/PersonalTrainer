import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-all focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-bronze-500 focus-visible:ring-4 focus-visible:ring-bronze-100 disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-charcoal-950 text-ivory-50 shadow-soft hover:-translate-y-0.5 hover:bg-charcoal-900",
        secondary: "bg-ivory-100 text-charcoal-950 ring-1 ring-stone-200 hover:bg-white",
        ghost: "text-charcoal-700 hover:bg-stone-100 hover:text-charcoal-950",
        warm: "bg-bronze-500 text-white shadow-warm hover:-translate-y-0.5 hover:bg-bronze-600",
      },
      size: {
        default: "h-11 px-5",
        sm: "h-9 px-4 text-xs",
        lg: "h-13 px-7 text-base",
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}
