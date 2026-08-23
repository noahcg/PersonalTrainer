import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getClientWorkoutCheckIns, getClientWorkouts } from "@/lib/workouts";

export default async function ClientWorkoutsPage() {
  const [{ workouts }, { workoutCheckIns }] = await Promise.all([
    getClientWorkouts(),
    getClientWorkoutCheckIns(),
  ]);

  if (!workouts.length && !workoutCheckIns.length) {
    return (
      <AppShell role="client" title="My workouts" subtitle="Upcoming and completed workouts with clear guidance and logging.">
        <Card className="max-w-3xl p-8">
          <p className="font-serif text-4xl font-semibold text-charcoal-950">No workouts assigned yet.</p>
          <p className="mt-3 text-sm leading-6 text-stone-600">
            Your workouts page starts empty for a new client. Sessions will appear here once they are added to your plan.
          </p>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell role="client" title="My workouts" subtitle="Upcoming and completed workouts with clear guidance and logging." mobileFocus>
      <div className="space-y-5 sm:space-y-6">
        {workouts.length ? (
          <section>
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-charcoal-950 sm:text-xl">Assigned workouts</h2>
                <p className="mt-1 text-sm text-stone-500">Workouts available to log now.</p>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2 md:gap-5">
              {workouts.map((workout) => (
                <Card key={workout.id} className="p-4 sm:p-6">
                  <Badge variant="bronze">Assigned</Badge>
                  <h3 className="mt-4 font-serif text-3xl font-semibold leading-tight sm:mt-5 sm:text-4xl">{workout.name}</h3>
                  <p className="mt-3 text-sm leading-6 text-stone-600">{workout.coachNotes}</p>
                  <div className="mt-4 flex flex-wrap gap-2 text-sm text-stone-500 sm:mt-5">
                    <span>{workout.duration}</span>
                    <span>{workout.blocks.length} training blocks</span>
                  </div>
                  <Button asChild className="mt-5 w-full sm:mt-6 sm:w-fit" variant="warm">
                    <Link href={`/client/workouts/${workout.id}`}>
                      Start logging
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                </Card>
              ))}
            </div>
          </section>
        ) : null}

        <section>
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-charcoal-950 sm:text-xl">Logged workouts</h2>
              <p className="mt-1 text-sm text-stone-500">Your completed non-session workout history.</p>
            </div>
          </div>
          <Card className="p-3 sm:p-6">
            {workoutCheckIns.length ? (
              <div className="space-y-2.5 sm:space-y-3">
                {workoutCheckIns.map((checkIn) => (
                  <Link
                    key={checkIn.id}
                    href={`/client/workouts/${checkIn.workoutId}`}
                    className="flex flex-col gap-3 rounded-[1.15rem] bg-stone-50/88 px-3.5 py-3.5 transition hover:bg-white sm:flex-row sm:items-center sm:justify-between sm:rounded-[1.35rem] sm:px-4 sm:py-4"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-charcoal-950">{checkIn.workoutName}</p>
                        <Badge variant="sage">Complete</Badge>
                      </div>
                      <p className="mt-1 text-sm text-stone-500">{checkIn.completedAt}</p>
                      {checkIn.feedback ? (
                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-stone-600">{checkIn.feedback}</p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-2 text-sm text-stone-500">
                      <span>{checkIn.dayLabel}</span>
                      {checkIn.perceivedEffort ? <Badge variant="bronze">RPE {checkIn.perceivedEffort}</Badge> : null}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-[1.35rem] bg-stone-50/88 px-4 py-5 text-sm text-stone-600">
                Completed workouts will appear here after you submit them.
              </div>
            )}
          </Card>
        </section>
      </div>
    </AppShell>
  );
}
