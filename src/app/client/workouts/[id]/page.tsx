import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { WorkoutLogger } from "@/components/product/workout-logger";
import { getClientWorkoutById } from "@/lib/workouts";

export default async function ClientWorkoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const workout = await getClientWorkoutById(id);
  if (!workout) notFound();

  return (
    <AppShell role="client" title="Workout log" subtitle="Log sets, reps, load, notes, completion, and feedback with a mobile-first flow.">
      <WorkoutLogger workout={workout} />
    </AppShell>
  );
}
