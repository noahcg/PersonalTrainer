import Image from "next/image";
import Link from "next/link";
import { PencilLine } from "lucide-react";
import type { Exercise } from "@/lib/types";
import { classificationLabels, getClassification } from "@/lib/exercise-classification";
import { cn } from "@/lib/utils";

export function ExerciseCard({
  exercise,
  href,
  canEdit = false,
  onEdit,
}: {
  exercise: Exercise;
  href: string;
  canEdit?: boolean;
  onEdit?: (trigger: HTMLButtonElement) => void;
}) {
  const labels = classificationLabels(exercise);
  const muscles = labels.muscles.slice(0, 2).join(", ");
  const equipment = labels.equipment.slice(0, 2).join(", ");

  return (
    <article className="group relative h-24 border-b border-stone-200/80 bg-transparent transition hover:bg-white/70">
      <Link
        href={href}
        className="grid h-full min-w-0 grid-cols-[4.75rem_minmax(0,1fr)_3rem] items-center gap-3 px-2 py-2 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-bronze-500 sm:grid-cols-[5rem_minmax(0,1.45fr)_minmax(7rem,0.8fr)_3rem] lg:grid-cols-[5rem_minmax(0,1.4fr)_minmax(8rem,0.75fr)_minmax(8rem,0.8fr)_minmax(7rem,0.65fr)_3rem]"
      >
        <div className="relative size-20 overflow-hidden bg-stone-100">
          {exercise.demoUrl ? <Image
            src={exercise.demoUrl}
            alt={exercise.name}
            fill
            sizes="80px"
            className="object-cover transition duration-500 group-hover:scale-105"
          /> : <div className="grid h-full place-items-center text-xs text-stone-500">No media</div>}
        </div>

        <div className="min-w-0">
          <h3 title={exercise.name} className="line-clamp-2 text-sm font-semibold leading-5 text-charcoal-950 sm:text-base">{exercise.name}</h3>
          <p className="mt-1 truncate text-xs leading-5 text-stone-600" title={labels.focus}>
            {labels.focus === "Focus not set" ? labels.type : labels.focus}
            <span className="sm:hidden"> · {equipment || "Equipment needs review"}</span>
          </p>
        </div>

        <div className="hidden min-w-0 text-sm sm:block">
          <p className="truncate font-medium text-charcoal-950">{labels.type}</p>
          <p className="mt-1 text-xs text-stone-500">{exercise.difficulty}{getClassification(exercise).review.length > 0 ? " · Review needed" : ""}</p>
        </div>

        <div className="hidden min-w-0 text-sm lg:block">
          <p className="truncate text-stone-700">{muscles || "No muscles set"}</p>
          <p className="mt-1 text-xs text-stone-500">Muscles</p>
        </div>

        <div className="hidden min-w-0 text-sm lg:block">
          <p className="truncate text-stone-700">{equipment || "Needs review"}</p>
          <p className="mt-1 text-xs text-stone-500">{canEdit ? "Custom" : "Reference"}</p>
        </div>

        <div aria-hidden="true" />
      </Link>

      <div className="absolute right-2 top-1/2 -translate-y-1/2">
        <button
          type="button"
          aria-label={`Edit ${exercise.name}`}
          title="Edit exercise"
          onClick={(event) => onEdit?.(event.currentTarget)}
          className={cn(
            "grid size-9 place-items-center border border-stone-200 bg-white/85 text-charcoal-950 shadow-sm transition",
            "hover:-translate-y-0.5 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-bronze-500",
          )}
        >
          <PencilLine className="size-4" />
        </button>
      </div>
    </article>
  );
}
