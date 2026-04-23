import Image from "next/image";
import { cn, initials } from "@/lib/utils";

export function Avatar({
  name,
  src,
  className,
}: {
  name: string;
  src?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative grid size-11 shrink-0 place-items-center overflow-hidden rounded-full bg-stone-200 text-sm font-semibold text-charcoal-900 ring-2 ring-white", className)}>
      {src ? <Image src={src} alt={name} fill className="object-cover" /> : initials(name)}
    </div>
  );
}
