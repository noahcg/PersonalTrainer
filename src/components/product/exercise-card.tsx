import Image from "next/image";
import Link from "next/link";
import { PencilLine } from "lucide-react";
import type { Exercise } from "@/lib/types";
import { cn } from "@/lib/utils";

function compactCategory(category: string) {
  if (category === "Free Weights (Barbell & Dumbbell Focus)") return "Free Weights";
  if (category === "Bodyweight (Beginner-Friendly)") return "Bodyweight";
  if (category === "Gym (Machines & Weights)") return "Gym";
  if (category === "Calisthenics (Progression-Based Bodyweight)") return "Calisthenics";
  if (category === "Cardio / Conditioning") return "Conditioning";
  return category;
}

export function ExerciseCard({
  exercise,
  href,
  canEdit = false,
  onEdit,
}: {
  exercise: Exercise;
  href: string;
  canEdit?: boolean;
  onEdit?: () => void;
}) {
  const muscles = exercise.muscleGroups.slice(0, 2).join(", ");
  const equipment = exercise.equipment.slice(0, 2).join(", ");

  return (
    <article className="group relative h-24 border-b border-stone-200/80 bg-transparent transition hover:bg-white/70">
      <Link
        href={href}
        className="grid h-full min-w-0 grid-cols-[4.75rem_minmax(0,1fr)_3rem] items-center gap-3 px-2 py-2 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-bronze-500 sm:grid-cols-[5rem_minmax(0,1.45fr)_minmax(7rem,0.8fr)_3rem] lg:grid-cols-[5rem_minmax(0,1.4fr)_minmax(8rem,0.75fr)_minmax(8rem,0.8fr)_minmax(7rem,0.65fr)_3rem]"
      >
        <div className="relative size-20 overflow-hidden bg-stone-100">
          <Image
            src={exercise.demoUrl}
            alt={exercise.name}
            fill
            sizes="80px"
            className="object-cover transition duration-500 group-hover:scale-105"
          />
        </div>

        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-charcoal-950 sm:text-base">{exercise.name}</h3>
            <span className="hidden shrink-0 rounded-sm bg-charcoal-950 px-2 py-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-ivory-50 sm:inline">
              {exercise.pattern}
            </span>
          </div>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-stone-500">{exercise.instructions}</p>
        </div>

        <div className="hidden min-w-0 text-sm sm:block">
          <p className="truncate font-medium text-charcoal-950">{compactCategory(exercise.category)}</p>
          <p className="mt-1 text-xs text-stone-500">{exercise.difficulty}</p>
        </div>

        <div className="hidden min-w-0 text-sm lg:block">
          <p className="truncate text-stone-700">{muscles || "No muscles set"}</p>
          <p className="mt-1 text-xs text-stone-500">Muscles</p>
        </div>

        <div className="hidden min-w-0 text-sm lg:block">
          <p className="truncate text-stone-700">{equipment || "No equipment"}</p>
          <p className="mt-1 text-xs text-stone-500">{canEdit ? "Custom" : "Reference"}</p>
        </div>

        <div aria-hidden="true" />
      </Link>

      <div className="absolute right-2 top-1/2 -translate-y-1/2">
        <button
          type="button"
          aria-label={`${canEdit ? "Edit" : "Customize"} ${exercise.name}`}
          title={canEdit ? "Edit exercise" : "Customize exercise"}
          onClick={onEdit}
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
