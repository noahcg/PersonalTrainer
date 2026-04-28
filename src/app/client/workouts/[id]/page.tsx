import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { WorkoutLogger } from "@/components/product/workout-logger";
import { Button } from "@/components/ui/button";
import { getClientWorkoutById } from "@/lib/workouts";

export default async function ClientWorkoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const workout = await getClientWorkoutById(id);
  if (!workout) notFound();

  return (
    <AppShell role="client" title="Workout log" subtitle="Log sets, reps, load, notes, completion, and feedback with a mobile-first flow.">
      <Button asChild variant="ghost" size="sm" className="-ml-2 mb-5 w-fit">
        <Link href="/client/workouts">Back to workouts</Link>
      </Button>
      <WorkoutLogger workout={workout} />
    </AppShell>
  );
}
