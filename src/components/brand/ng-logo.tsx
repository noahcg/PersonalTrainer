import Image from "next/image";
import { cn } from "@/lib/utils";
import { NGMonogramMark } from "@/components/brand/ng-monogram-mark";
import monogram from "../../../monogram.svg";

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
  variant = "boxed",
}: {
  className?: string;
  tone?: LogoTone;
  variant?: "boxed" | "mark";
}) {
  if (variant === "mark") {
    return <NGMonogramMark className={cn("text-ink", className)} />;
  }

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
      />
    </div>
  );
}

export function NGLogoLockup({
  tone = "ink",
  subtext = "Training",
  className,
  monogramVariant = "boxed",
}: {
  tone?: LogoTone;
  subtext?: string;
  className?: string;
  monogramVariant?: "boxed" | "mark";
}) {
  const colors = toneClasses(tone);

  return (
    <div className={cn("flex min-w-0 items-center gap-3.5", className)}>
      <NGMonogram tone={tone} variant={monogramVariant} className="size-[4.3rem] shrink-0 sm:size-[4.65rem]" />
      <div className="min-w-0">
        <div
          className={cn(
            "mt-[4px] text-[0.94rem] font-medium uppercase leading-[0.88] tracking-[0.17em] sm:text-[1.08rem] sm:tracking-[0.19em]",
            colors.primary,
          )}
        >
          <span className="block">Nick</span>
          <span className="mt-0.5 block">Glushien</span>
        </div>
        <div
          className={cn(
            "mt-[4px] text-[0.52rem] font-semibold uppercase tracking-[0.34em] sm:text-[0.58rem] sm:tracking-[0.4em]",
            tone === "copper" ? colors.secondary : "text-sage-700",
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
