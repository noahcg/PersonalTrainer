import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, type, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type={type}
      className={cn(
        "h-11 w-full rounded-2xl border border-stone-200 bg-white/80 px-4 text-sm text-charcoal-950 shadow-inner-soft outline-none transition focus:border-bronze-300 focus:ring-4 focus:ring-bronze-100",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-28 w-full rounded-2xl border border-stone-200 bg-white/80 px-4 py-3 text-sm text-charcoal-950 shadow-inner-soft outline-none transition focus:border-bronze-300 focus:ring-4 focus:ring-bronze-100",
        className,
      )}
      {...props}
    />
  );
}
