"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Dumbbell, Library } from "lucide-react";
import { cn } from "@/lib/utils";

export const workoutBuilderSections = [
  {
    href: "/trainer/exercises",
    label: "Exercise Library",
    description: "Manage the movement building blocks you use in programming, including cues, demo media, substitutions, and progressions.",
    icon: Library,
  },
  {
    href: "/trainer/workouts",
    label: "Workouts",
    description: "Build complete sessions from library exercises, then set the warm-up, training blocks, prescriptions, and coaching details.",
    icon: Dumbbell,
  },
];

export function TrainerWorkoutBuilderNav({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="grid min-w-0 gap-5 xl:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="min-w-0 xl:sticky xl:top-5 xl:self-start">
        <div className="rounded-[1.5rem] border border-white/70 bg-white/52 p-3 shadow-soft backdrop-blur-xl sm:rounded-[2rem] sm:p-4">
          <div className="px-2 pb-3 pt-1">
            <p className="text-[0.66rem] font-semibold uppercase tracking-[0.28em] text-bronze-600">Builder tools</p>
          </div>
          <nav aria-label="Workout builder navigation" className="grid gap-2">
            {workoutBuilderSections.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group flex min-w-0 items-center gap-3 rounded-[1.25rem] px-3 py-3 text-sm font-medium transition focus-visible:outline-offset-2",
                    active ? "bg-charcoal-950 text-ivory-50 shadow-inner-soft" : "text-stone-600 hover:bg-white/80 hover:text-charcoal-950",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-9 shrink-0 place-items-center rounded-full",
                      active ? "bg-white/10 text-bronze-200" : "bg-stone-100 text-bronze-600 group-hover:bg-bronze-50",
                    )}
                  >
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  <ArrowRight className={cn("size-4 shrink-0", active ? "text-bronze-200" : "text-stone-400")} />
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function TrainerWorkoutBuilderOverview() {
  return (
    <section className="overflow-hidden rounded-[1.5rem] border border-white/70 bg-white/62 shadow-soft backdrop-blur-xl sm:rounded-[2rem]">
      <div>
        <div className="flex flex-col gap-5 p-5 sm:p-7 lg:p-8">
          <div>
            <h2 className="max-w-3xl font-serif text-4xl font-semibold leading-[1.02] text-charcoal-950 sm:text-5xl">
              A workout starts as one movement.
            </h2>
          </div>

          <div className="max-w-3xl space-y-3 text-base leading-7 text-stone-600">
            <p>
              Use the Exercise Library as your source material. Every exercise you save becomes a reusable block with
              cues, instructions, demo media, and movement details ready to drop into a workout.
            </p>
            <p>
              If the movement is not there yet, create it once. Then build workouts from those blocks with the warm-up,
              stage work, prescriptions, and coaching notes ready for clients.
            </p>
          </div>

          <p className="max-w-2xl text-sm font-medium leading-6 text-charcoal-950">
            Exercises become workouts. The builder is just the path between movement details and a finished session.
          </p>
        </div>
      </div>
    </section>
  );
}
