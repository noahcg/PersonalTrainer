import { AppShell } from "@/components/layout/app-shell";
import { TrainerWorkoutBuilder } from "@/components/product/trainer-workout-builder";
import { getTrainerExercises } from "@/lib/exercises";
import { getTrainerPlanOptions, getTrainerWorkouts } from "@/lib/workouts";

export default async function WorkoutsPage() {
  const [{ workouts, mode }, { exercises }, { plans }] = await Promise.all([
    getTrainerWorkouts(),
    getTrainerExercises(),
    getTrainerPlanOptions(),
  ]);

  return (
    <AppShell role="trainer" title="Workout builder" subtitle="Compose warm-ups, main blocks, accessories, finishers, cooldowns, and exercise prescriptions with coach-grade detail.">
      <TrainerWorkoutBuilder initialWorkouts={workouts} exercises={exercises} plans={plans} mode={mode} />
    </AppShell>
  );
}
