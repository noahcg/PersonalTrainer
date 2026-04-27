import Link from "next/link";
import { ArrowRight, CalendarDays, Target, Waves } from "lucide-react";
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
    <AppShell role="client" title="My plan" subtitle="Your current training cycle, weekly rhythm, trainer notes, and assigned workouts.">
      <Card className="overflow-hidden border-charcoal-950 bg-charcoal-950 text-ivory-50">
        <CardHeader>
          <Badge variant="bronze">{plan.duration}</Badge>
          <CardTitle className="mt-4 font-serif text-5xl text-ivory-50">{plan.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="max-w-3xl text-sm leading-7 text-ivory-50/65">{plan.description}</p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-[1.6rem] border border-white/10 bg-white/6 p-5"><Target className="size-5 text-bronze-200" /><p className="mt-5 text-[0.66rem] uppercase tracking-[0.28em] text-ivory-50/50">Goal</p><p className="mt-2 font-semibold text-ivory-50">{plan.goal}</p></div>
            <div className="rounded-[1.6rem] border border-white/10 bg-white/6 p-5"><CalendarDays className="size-5 text-bronze-200" /><p className="mt-5 text-[0.66rem] uppercase tracking-[0.28em] text-ivory-50/50">Structure</p><p className="mt-2 font-semibold text-ivory-50">{plan.weeklyStructure}</p></div>
            <div className="rounded-[1.6rem] border border-white/10 bg-white/6 p-5"><Waves className="size-5 text-sage-200" /><p className="mt-5 text-[0.66rem] uppercase tracking-[0.28em] text-ivory-50/50">Trainer notes</p><p className="mt-2 font-semibold text-ivory-50">{plan.notes}</p></div>
          </div>
        </CardContent>
      </Card>
      <div className="mt-5 grid gap-5 md:grid-cols-2">
        {plan.workouts.map((workout) => (
          <Card key={workout.id} className="p-5 sm:p-6">
            <Badge variant="sage">{workout.dayLabel}</Badge>
            <h3 className="mt-4 font-serif text-3xl font-semibold">{workout.name}</h3>
            <p className="mt-3 text-sm leading-6 text-stone-600">{workout.coachNotes}</p>
            <Button asChild className="mt-5" variant="warm"><Link href={`/client/workouts/${workout.id}`}>Open workout <ArrowRight className="size-4" /></Link></Button>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
