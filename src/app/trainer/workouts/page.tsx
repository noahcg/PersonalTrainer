import { Layers3, ListChecks, TimerReset } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { TrainerWorkoutBuilder } from "@/components/product/trainer-workout-builder";
import { getTrainerExercises } from "@/lib/exercises";
import { getTrainerPlanOptions, getTrainerWorkouts } from "@/lib/workouts";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export default async function WorkoutsPage() {
  const [{ workouts, mode }, { exercises }, { plans }] = await Promise.all([
    getTrainerWorkouts(),
    getTrainerExercises(),
    getTrainerPlanOptions(),
  ]);

  return (
    <AppShell role="trainer" title="Workout builder" subtitle="Compose warm-ups, main blocks, accessories, finishers, cooldowns, and exercise prescriptions with coach-grade detail.">
      <div className="space-y-5">
        <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <Card className="overflow-hidden border-charcoal-950 bg-charcoal-950 p-7 text-ivory-50">
            <Badge variant="bronze">Workout composition</Badge>
            <h2 className="mt-5 max-w-2xl font-serif text-4xl font-semibold leading-tight">Compose sessions with the same precision your clients feel in person.</h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-ivory-50/65">
              Build warm-ups, main lifts, accessories, and finishers in a sequence that feels clear, coach-led, and immediately actionable.
            </p>
          </Card>
          <div className="grid gap-5 sm:grid-cols-3 xl:grid-cols-3">
            {[
              { label: "Workout library", value: String(workouts.length), icon: Layers3 },
              { label: "Exercise options", value: String(exercises.length), icon: ListChecks },
              { label: "Linked plans", value: String(plans.length), icon: TimerReset },
            ].map(({ label, value, icon: Icon }) => (
              <Card key={label} className="p-5">
                <Icon className="size-5 text-sage-700" />
                <p className="mt-6 text-[0.66rem] uppercase tracking-[0.28em] text-stone-500">{label}</p>
                <p className="mt-2 font-serif text-4xl font-semibold text-charcoal-950">{value}</p>
              </Card>
            ))}
          </div>
        </div>

        <Card className="p-5">
          <div className="mb-5 border-b border-border pb-5">
            <p className="text-[0.66rem] uppercase tracking-[0.3em] text-bronze-600">Builder workspace</p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">Use this space to create sessions that read clearly on mobile, preserve coaching nuance, and stay easy to update over time.</p>
          </div>
          <TrainerWorkoutBuilder initialWorkouts={workouts} exercises={exercises} plans={plans} mode={mode} />
        </Card>
      </div>
    </AppShell>
  );
}
