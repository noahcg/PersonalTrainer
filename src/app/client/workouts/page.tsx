import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { workouts } from "@/lib/demo-data";

export default function ClientWorkoutsPage() {
  return (
    <AppShell role="client" title="My workouts" subtitle="Upcoming and completed workouts with clear guidance and logging.">
      <div className="grid gap-5 md:grid-cols-2">
        {workouts.map((workout) => (
          <Card key={workout.id} className="p-6">
            <Badge variant="bronze">Upcoming</Badge>
            <h2 className="mt-5 font-serif text-4xl font-semibold">{workout.name}</h2>
            <p className="mt-3 text-sm leading-6 text-stone-600">{workout.coachNotes}</p>
            <div className="mt-5 grid gap-2 text-sm text-stone-500">
              <span>{workout.duration}</span>
              <span>{workout.blocks.length} training blocks</span>
            </div>
            <Button asChild className="mt-6" variant="warm"><Link href={`/client/workouts/${workout.id}`}>Start logging</Link></Button>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
