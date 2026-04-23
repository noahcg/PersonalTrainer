import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getClientAssignedPlan } from "@/lib/plans";

export default async function ClientPlanPage() {
  const { plan } = await getClientAssignedPlan();
  if (!plan) {
    return (
      <AppShell role="client" title="My plan" subtitle="Your training cycle will appear here as soon as your trainer assigns it.">
        <Card className="max-w-3xl p-8">
          <p className="font-serif text-4xl font-semibold">No plan assigned yet.</p>
          <p className="mt-3 text-sm leading-6 text-stone-600">
            Your trainer has not assigned an active plan yet. Check back soon or send them a note.
          </p>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell role="client" title="My plan" subtitle="Your current training cycle, weekly rhythm, coach notes, and assigned workouts.">
      <Card>
        <CardHeader>
          <Badge variant="bronze">{plan.duration}</Badge>
          <CardTitle className="mt-4 font-serif text-5xl">{plan.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="max-w-3xl text-sm leading-7 text-stone-600">{plan.description}</p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-[1.75rem] bg-stone-50 p-5"><p className="text-sm text-stone-500">Goal</p><p className="mt-2 font-semibold">{plan.goal}</p></div>
            <div className="rounded-[1.75rem] bg-stone-50 p-5"><p className="text-sm text-stone-500">Structure</p><p className="mt-2 font-semibold">{plan.weeklyStructure}</p></div>
            <div className="rounded-[1.75rem] bg-stone-50 p-5"><p className="text-sm text-stone-500">Coach notes</p><p className="mt-2 font-semibold">{plan.notes}</p></div>
          </div>
        </CardContent>
      </Card>
      <div className="mt-5 grid gap-5 md:grid-cols-2">
        {plan.workouts.map((workout) => (
          <Card key={workout.id} className="p-6">
            <Badge variant="sage">{workout.dayLabel}</Badge>
            <h3 className="mt-4 text-2xl font-semibold">{workout.name}</h3>
            <p className="mt-3 text-sm leading-6 text-stone-600">{workout.coachNotes}</p>
            <Button asChild className="mt-5" variant="warm"><Link href={`/client/workouts/${workout.id}`}>Open workout</Link></Button>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
