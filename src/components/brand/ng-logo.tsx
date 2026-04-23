import Image from "next/image";
import { cn } from "@/lib/utils";
import monogram from "../../../monogram.jpg";

type LogoTone = "ink" | "light" | "copper";

function toneClasses(tone: LogoTone) {
  if (tone === "light") {
    return {
      primary: "text-offwhite",
      secondary: "text-offwhite/72",
      stroke: "stroke-offwhite",
      accent: "stroke-offwhite",
      panel: "bg-offwhite/10 border-white/12",
    };
  }

  if (tone === "copper") {
    return {
      primary: "text-copper-deep",
      secondary: "text-copper-deep/72",
      stroke: "stroke-copper",
      accent: "stroke-copper",
      panel: "bg-copper/10 border-copper/20",
    };
  }

  return {
    primary: "text-ink",
    secondary: "text-text-muted",
    stroke: "stroke-ink",
    accent: "stroke-ink",
    panel: "bg-white/70 border-border",
  };
}

export function NGMonogram({
  className,
  tone = "ink",
}: {
  className?: string;
  tone?: LogoTone;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative isolate overflow-hidden rounded-[0.9rem]",
        tone === "light" && "bg-white/3",
        className,
      )}
    >
      <Image
        src={monogram}
        alt=""
        className={cn(
          "h-full w-full object-contain",
          tone === "light" && "brightness-[1.3] contrast-[0.9]",
          tone === "copper" && "sepia-[0.24] saturate-[1.08]",
        )}
        sizes="64px"
        placeholder="blur"
      />
    </div>
  );
}

export function NGLogoLockup({
  tone = "ink",
  subtext = "Coaching",
  className,
}: {
  tone?: LogoTone;
  subtext?: string;
  className?: string;
}) {
  const colors = toneClasses(tone);

  return (
    <div className={cn("flex items-center gap-3.5", className)}>
      <div className={cn("grid size-14 shrink-0 place-items-center rounded-[1.15rem] border p-1.5 shadow-soft", colors.panel)}>
        <NGMonogram tone={tone} className="size-full" />
      </div>
      <div className="min-w-0">
        <div className={cn("text-[1.2rem] font-medium uppercase leading-[0.9] tracking-[0.24em] sm:text-[1.45rem]", colors.primary)}>
          <span className="block">Nick</span>
          <span className="mt-1 block">Glushien</span>
        </div>
        <div
          className={cn(
            "mt-3 text-[0.62rem] uppercase tracking-[0.52em] sm:text-[0.7rem]",
            tone === "copper" ? colors.secondary : "text-bronze-500",
          )}
        >
          {subtext}
        </div>
      </div>
    </div>
  );
}

export function NGAppIcon({
  tone = "ink",
  className,
}: {
  tone?: LogoTone;
  className?: string;
}) {
  const colors = toneClasses(tone);

  return (
    <div className={cn("grid size-14 place-items-center rounded-[1.4rem] border p-2 shadow-soft", colors.panel, className)}>
      <NGMonogram tone={tone} className="size-full" />
    </div>
  );
}
