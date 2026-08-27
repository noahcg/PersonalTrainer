import { AppShell } from "@/components/layout/app-shell";
import { TrainerWorkoutBuilderNav } from "@/components/product/trainer-workout-builder-nav";
import { TrainerWorkoutBuilder } from "@/components/product/trainer-workout-builder";
import { getTrainerExercises } from "@/lib/exercises";
import { getTrainerWorkouts } from "@/lib/workouts";

export default async function WorkoutsPage() {
  const [{ workouts, mode }, { exercises }] = await Promise.all([
    getTrainerWorkouts(),
    getTrainerExercises(),
  ]);

  return (
    <AppShell role="trainer" title="Workouts" eyebrow="Workout templates" subtitle="Compose warm-ups, main blocks, accessories, finishers, cooldowns, and exercise prescriptions with coach-grade detail.">
      <TrainerWorkoutBuilderNav>
        <TrainerWorkoutBuilder initialWorkouts={workouts} exercises={exercises} mode={mode} />
      </TrainerWorkoutBuilderNav>
    </AppShell>
  );
}
