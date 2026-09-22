import Link from "next/link";
import { ArrowLeft, Dumbbell, ListChecks, ShieldAlert, Sparkles, type LucideIcon } from "lucide-react";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { TrainerWorkoutBuilderNav } from "@/components/product/trainer-workout-builder-nav";
import { ExerciseMedia } from "@/components/product/exercise-media";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getTrainerExerciseById } from "@/lib/exercises";

export default async function TrainerExerciseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const exercise = await getTrainerExerciseById(id);

  if (!exercise) {
    notFound();
  }

  return (
    <AppShell
      role="trainer"
      title={exercise.name}
      eyebrow="Exercise reference"
      subtitle="Exercise reference, coaching cues, mistakes to avoid, substitutions, and movement details."
    >
      <TrainerWorkoutBuilderNav>
        <div className="space-y-5">
          <Link href="/trainer/exercises" className="inline-flex items-center gap-2 text-sm font-medium text-stone-600 transition hover:text-charcoal-950">
            <ArrowLeft className="size-4" />
            Back to exercise library
          </Link>

          <Card className="overflow-hidden border-charcoal-950 bg-charcoal-950 text-ivory-50 shadow-[0_28px_70px_-32px_rgba(13,13,13,0.55)]">
            <div className="relative overflow-hidden bg-charcoal-950">
                {exercise.demoUrl ? (
                  <ExerciseMedia
                    src={exercise.demoUrl}
                    alt={`${exercise.name} demonstration`}
                    className="relative z-10"
                    priority
                  />
                ) : (
                  <div className="grid min-h-64 place-items-center p-8 text-center text-ivory-50/70">
                    Demo media has not been added yet.
                  </div>
                )}
                <div className="pointer-events-none absolute inset-0 z-20 bg-gradient-to-t from-charcoal-950/90 via-charcoal-950/5 to-transparent" />
                <div className="absolute left-5 top-5 z-30 rounded-full border border-white/15 bg-charcoal-950/70 px-3 py-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-ivory-50/80 backdrop-blur-sm sm:left-7 sm:top-7">
                  Visual guide · follow the sequence
                </div>
                <div className="absolute bottom-5 left-5 right-5 z-30 flex items-end justify-between gap-4 sm:bottom-7 sm:left-7 sm:right-7">
                  <p className="max-w-xs text-sm leading-6 text-ivory-50/75 sm:max-w-sm">
                    Use the full frame to compare the starting position with the finished rotation.
                  </p>
                  <span className="hidden shrink-0 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs text-ivory-50/80 backdrop-blur-sm sm:inline-flex">
                    2-position reference
                  </span>
                </div>
            </div>

            <div className="grid lg:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.75fr)]">
              <div className="p-6 sm:p-9">
                <div className="flex flex-wrap gap-2">
                  <Badge variant={exercise.editable ? "sage" : "default"}>
                    {exercise.editable ? "Trainer exercise" : "Global reference"}
                  </Badge>
                  <Badge variant="bronze">{exercise.category}</Badge>
                </div>
                <h2 className="mt-5 max-w-3xl font-serif text-4xl font-semibold leading-[0.98] tracking-[-0.035em] sm:text-6xl">
                  {exercise.name}
                </h2>
                <p className="mt-6 max-w-2xl text-base leading-8 text-ivory-50/70 sm:text-lg">
                  {exercise.instructions || "No instructions have been added yet."}
                </p>
              </div>

              <aside className="border-t border-white/10 bg-white/[0.04] p-6 sm:p-9 lg:border-l lg:border-t-0">
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-bronze-200/80">At a glance</p>
                <div className="mt-5 divide-y divide-white/10">
                  <MiniPanel icon={Dumbbell} label="Equipment" value={exercise.equipment.join(", ") || "Bodyweight"} />
                  <MiniPanel icon={Sparkles} label="Primary focus" value={exercise.muscleGroups.join(", ") || "Not specified"} />
                  <div className="flex items-center justify-between gap-4 py-4">
                    <span className="text-sm text-ivory-50/55">Difficulty</span>
                    <span className="text-sm font-semibold text-ivory-50">{exercise.difficulty}</span>
                  </div>
                </div>
              </aside>
            </div>
          </Card>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-bronze-600">Coaching playbook</p>
              <h2 className="mt-2 font-serif text-3xl font-semibold tracking-[-0.025em] text-charcoal-950 sm:text-4xl">Make the next rep clearer.</h2>
            </div>
            <p className="max-w-sm text-sm leading-6 text-stone-500">The reminders below are designed to sit beside the visual reference while you coach.</p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <DetailList
              icon={ListChecks}
              title="Coaching cues"
              items={exercise.cues}
              fallback="No coaching cues have been added yet."
              tone="sage"
            />
            <DetailList
              icon={ShieldAlert}
              title="Mistakes to avoid"
              items={exercise.mistakes}
              fallback="No common mistakes have been listed yet."
              tone="bronze"
            />
            <DetailList
              icon={Sparkles}
              title="Substitutions"
              items={exercise.substitutions}
              fallback="No substitutions have been added yet."
            />
          </div>

          {exercise.tags.length ? (
            <Card className="p-5 sm:p-6">
              <p className="text-[0.66rem] uppercase tracking-[0.28em] text-bronze-600">Tags</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {exercise.tags.map((tag) => (
                  <Badge key={tag}>{tag}</Badge>
                ))}
              </div>
            </Card>
          ) : null}
        </div>
      </TrainerWorkoutBuilderNav>
    </AppShell>
  );
}

function MiniPanel({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 py-4 first:pt-0 last:pb-0">
      <Icon className="mt-0.5 size-4 shrink-0 text-bronze-200" />
      <div className="min-w-0">
        <p className="text-[0.63rem] uppercase tracking-[0.24em] text-ivory-50/45">{label}</p>
        <p className="mt-1 text-sm font-semibold leading-6 text-ivory-50">{value}</p>
      </div>
    </div>
  );
}

function DetailList({
  icon: Icon,
  title,
  items,
  fallback,
  tone = "neutral",
}: {
  icon: LucideIcon;
  title: string;
  items: string[];
  fallback: string;
  tone?: "neutral" | "sage" | "bronze";
}) {
  const dotClass =
    tone === "sage" ? "bg-sage-500" : tone === "bronze" ? "bg-bronze-500" : "bg-stone-400";

  return (
    <Card className="relative overflow-hidden p-5 sm:p-6">
      <div className={`absolute inset-x-0 top-0 h-1 ${dotClass}`} />
      <div className="flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-full bg-stone-100">
          <Icon className="size-4 text-bronze-600" />
        </span>
        <h3 className="text-lg font-semibold text-charcoal-950">{title}</h3>
      </div>
      {items.length ? (
        <ul className="mt-4 space-y-3">
          {items.map((item) => (
            <li key={item} className="flex gap-3 text-sm leading-6 text-stone-600">
              <span className={`mt-2 size-1.5 shrink-0 rounded-full ${dotClass}`} />
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm leading-6 text-stone-500">{fallback}</p>
      )}
    </Card>
  );
}
