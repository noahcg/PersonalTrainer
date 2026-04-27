import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Dumbbell, ListChecks, ShieldAlert, Sparkles, type LucideIcon } from "lucide-react";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
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
      subtitle="Exercise reference, coaching cues, mistakes to avoid, substitutions, and movement details."
    >
      <div className="space-y-5">
        <Link href="/trainer/exercises" className="inline-flex items-center gap-2 text-sm font-medium text-stone-600 transition hover:text-charcoal-950">
          <ArrowLeft className="size-4" />
          Back to exercise library
        </Link>

        <Card className="overflow-hidden border-charcoal-950 bg-charcoal-950 text-ivory-50">
          <div className="grid lg:grid-cols-[0.92fr_1.08fr]">
            <div className="relative min-h-80 bg-charcoal-950">
              {exercise.demoUrl ? (
                <Image
                  src={exercise.demoUrl}
                  alt={`${exercise.name} demonstration`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 540px"
                  priority
                />
              ) : (
                <div className="grid h-full min-h-80 place-items-center p-8 text-center text-ivory-50/70">
                  Demo media has not been added yet.
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-charcoal-950/70 via-transparent to-charcoal-950/20" />
              <div className="absolute bottom-5 left-5 right-5 flex flex-wrap gap-2">
                <Badge variant="bronze">{exercise.pattern}</Badge>
                <Badge variant="dark">{exercise.difficulty}</Badge>
              </div>
            </div>

            <div className="p-5 sm:p-7">
              <div className="flex flex-wrap gap-2">
                <Badge variant={exercise.editable ? "sage" : "default"}>
                  {exercise.editable ? "Trainer exercise" : "Global reference"}
                </Badge>
                <Badge variant="bronze">{exercise.category}</Badge>
              </div>
              <h2 className="mt-5 font-serif text-4xl font-semibold leading-tight sm:text-5xl">{exercise.name}</h2>
              <p className="mt-4 text-sm leading-7 text-ivory-50/70">
                {exercise.instructions || "No instructions have been added yet."}
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <MiniPanel icon={Dumbbell} label="Equipment" value={exercise.equipment.join(", ") || "Bodyweight"} />
                <MiniPanel icon={Sparkles} label="Muscle groups" value={exercise.muscleGroups.join(", ") || "Not specified"} />
              </div>
            </div>
          </div>
        </Card>

        <div className="grid gap-5 lg:grid-cols-3">
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
    <div className="rounded-[1.5rem] border border-white/10 bg-white/6 p-4">
      <Icon className="size-5 text-bronze-200" />
      <p className="mt-4 text-[0.66rem] uppercase tracking-[0.24em] text-ivory-50/45">{label}</p>
      <p className="mt-2 text-sm font-semibold leading-6 text-ivory-50">{value}</p>
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
    <Card className="p-5 sm:p-6">
      <Icon className="size-5 text-bronze-600" />
      <h3 className="mt-4 text-lg font-semibold text-charcoal-950">{title}</h3>
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
