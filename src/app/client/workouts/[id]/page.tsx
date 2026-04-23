import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { WorkoutLogger } from "@/components/product/workout-logger";
import { workouts } from "@/lib/demo-data";

export default async function ClientWorkoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const workout = workouts.find((item) => item.id === id);
  if (!workout) notFound();

  return (
    <AppShell role="client" title="Workout session" subtitle="Log sets, reps, load, notes, completion, and feedback with a mobile-first flow.">
      <WorkoutLogger workout={workout} />
    </AppShell>
  );
}
