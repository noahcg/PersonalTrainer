import { AppShell } from "@/components/layout/app-shell";
import {
  TrainerWorkoutBuilderOverview,
  TrainerWorkoutBuilderNav,
} from "@/components/product/trainer-workout-builder-nav";

export default function TrainerWorkoutBuilderPage() {
  return (
    <AppShell
      role="trainer"
      title="Workout builder"
      eyebrow="Builder workspace"
      subtitle="A simple starting point for creating exercises and workouts."
    >
      <TrainerWorkoutBuilderNav>
        <TrainerWorkoutBuilderOverview />
      </TrainerWorkoutBuilderNav>
    </AppShell>
  );
}
