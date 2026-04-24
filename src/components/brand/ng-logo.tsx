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
  subtext = "Training",
  className,
}: {
  tone?: LogoTone;
  subtext?: string;
  className?: string;
}) {
  const colors = toneClasses(tone);

  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      <div className={cn("grid size-13 shrink-0 place-items-center rounded-[1.05rem] border p-1.5 shadow-soft sm:size-14", colors.panel)}>
        <NGMonogram tone={tone} className="size-full" />
      </div>
      <div className="min-w-0">
        <div
          className={cn(
            "text-[1rem] font-medium uppercase leading-[0.92] tracking-[0.18em] sm:text-[1.15rem] sm:tracking-[0.2em]",
            colors.primary,
          )}
        >
          <span className="block">Nick</span>
          <span className="mt-0.5 block">Glushien</span>
        </div>
        <div
          className={cn(
            "mt-2 text-[0.56rem] uppercase tracking-[0.38em] sm:text-[0.62rem] sm:tracking-[0.44em]",
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
