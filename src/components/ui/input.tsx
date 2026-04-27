import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

export function Input({ className, type, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type={type}
      className={cn(
        "h-11 w-full rounded-2xl border border-stone-200 bg-white/80 px-4 text-sm text-charcoal-950 shadow-inner-soft transition focus-visible:border-bronze-300 focus-visible:ring-4 focus-visible:ring-bronze-100",
        className,
      )}
      {...props}
    />
  );
}

export function PasswordInput({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  const [visible, setVisible] = React.useState(false);

  return (
    <div className="relative">
      <input
        type={visible ? "text" : "password"}
        className={cn(
          "h-11 w-full rounded-2xl border border-stone-200 bg-white/80 px-4 pr-12 text-sm text-charcoal-950 shadow-inner-soft transition focus-visible:border-bronze-300 focus-visible:ring-4 focus-visible:ring-bronze-100",
          className,
        )}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        className="absolute inset-y-0 right-0 flex items-center pr-4 text-stone-500 transition hover:text-charcoal-950"
        aria-label={visible ? "Hide password" : "Show password"}
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-28 w-full rounded-2xl border border-stone-200 bg-white/80 px-4 py-3 text-sm text-charcoal-950 shadow-inner-soft transition focus-visible:border-bronze-300 focus-visible:ring-4 focus-visible:ring-bronze-100",
        className,
      )}
      {...props}
    />
  );
}
