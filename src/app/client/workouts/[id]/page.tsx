import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { WorkoutLogger } from "@/components/product/workout-logger";
import { Button } from "@/components/ui/button";
import { getClientWorkoutById } from "@/lib/workouts";

export default async function ClientWorkoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const workout = await getClientWorkoutById(id);
  if (!workout) notFound();

  return (
    <AppShell role="client" title="Workout log" eyebrow="Training log" subtitle="Log sets, reps, load, notes, completion, and feedback with a mobile-first flow." mobileFocus>
      <Button asChild variant="ghost" size="sm" className="-ml-2 mb-3 w-fit sm:mb-5">
        <Link href="/client/workouts">
          <ArrowLeft className="size-4" />
          Workouts
        </Link>
      </Button>
      <WorkoutLogger workout={workout} />
    </AppShell>
  );
}
