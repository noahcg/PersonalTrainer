import { cn } from "@/lib/utils";

export function ExerciseMedia({
  src,
  alt,
  className,
  priority = false,
}: {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  return (
    // Native sizing lets each uploaded image define its own layout height.
    // This is intentional: exercise media can be either a single frame or a multi-step composite.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={cn("block h-auto w-full", className)}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
    />
  );
}
