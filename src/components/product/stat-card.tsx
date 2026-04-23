import { ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  detail,
  tone = "light",
}: {
  label: string;
  value: string;
  detail: string;
  tone?: "light" | "dark" | "sage";
}) {
  return (
    <Card
      className={cn(
        "group rounded-[1.6rem] p-5 transition hover:-translate-y-1",
        tone === "dark" && "border-charcoal-900 bg-charcoal-950 text-ivory-50",
        tone === "sage" && "bg-sage-100/62",
        tone === "light" && "bg-white/52",
      )}
    >
      <div className="flex items-start justify-between">
        <p className={cn("text-[0.66rem] uppercase tracking-[0.26em] text-stone-500", tone === "dark" && "text-ivory-50/55")}>{label}</p>
        <ArrowUpRight className={cn("size-4 text-stone-400 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5", tone === "dark" && "text-bronze-200")} />
      </div>
      <p className="mt-6 font-serif text-[2.55rem] font-semibold leading-none">{value}</p>
      <p className={cn("mt-2 text-sm text-stone-500", tone === "dark" && "text-ivory-50/65")}>{detail}</p>
    </Card>
  );
}
