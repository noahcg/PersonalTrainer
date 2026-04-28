import Link from "next/link";
import { Activity, ArrowRight, CalendarCheck, MessageCircle, Plus, Users } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { StatCard } from "@/components/product/stat-card";
import { SessionReminderBanner } from "@/components/product/session-reminder-banner";
import { TrainerSessionOverview } from "@/components/product/trainer-session-overview";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getTrainerBulletins } from "@/lib/bulletins";
import { getTrainerCheckInData } from "@/lib/checkins";
import { getTrainerClients } from "@/lib/clients";

export default async function TrainerDashboardPage() {
  const [{ bulletins, mode }, { clients }, { checkIns }] = await Promise.all([
    getTrainerBulletins(),
    getTrainerClients(),
    getTrainerCheckInData(),
  ]);
  const activeClients = clients.filter((client) => client.status !== "archived");
  const clientsNeedingAttention = activeClients
    .filter((client) => client.status === "needs_attention" || client.adherence < 75)
    .slice(0, 4);
  const averageAdherence = activeClients.length
    ? Math.round(activeClients.reduce((total, client) => total + client.adherence, 0) / activeClients.length)
    : 0;
  const completedWorkouts = activeClients.reduce((total, client) => total + client.metrics.workouts, 0);
  const pendingCheckIns = checkIns.filter((checkIn) => !checkIn.reviewed);
  const focusClient = clientsNeedingAttention[0] ?? activeClients[0] ?? null;
  const recentCompletionSignals = activeClients
    .filter((client) => client.metrics.workouts > 0)
    .slice(0, 3);

  return (
    <AppShell
      role="trainer"
      title="Welcome back, Nick."
      dynamicGreetingName="Nick"
      subtitle="Clear coaching. Real progress. A structured read on client momentum, adherence, and the coaching moments that need your attention."
    >
      <SessionReminderBanner initialBulletins={bulletins} mode={mode} role="trainer" />
      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="min-w-0 space-y-5">
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Active clients" value={String(activeClients.length)} detail="Current roster" tone="dark" />
            <StatCard label="Weekly adherence" value={`${averageAdherence}%`} detail="Across active clients" tone="sage" />
            <StatCard label="Completed workouts" value={String(completedWorkouts)} detail="Logged by clients" />
            <StatCard label="Check-ins waiting" value={String(pendingCheckIns.length)} detail="Awaiting review" />
          </div>

          <Card className="overflow-hidden">
            <CardHeader className="flex flex-col items-start justify-between gap-4 sm:flex-row">
              <div className="min-w-0">
                <CardTitle>Clients needing attention</CardTitle>
                <CardDescription>Prioritized by adherence dips, check-ins, and trainer notes.</CardDescription>
              </div>
              <Button asChild variant="secondary" size="sm">
                <Link href="/trainer/clients">View roster</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {clientsNeedingAttention.length ? (
                clientsNeedingAttention.map((client) => (
                  <Link key={client.id} href={`/trainer/clients/${client.id}`} className="flex flex-wrap items-center gap-3 rounded-[1.35rem] bg-stone-50/88 px-4 py-3 transition hover:bg-white sm:gap-4">
                    <Avatar name={client.name} src={client.photo} />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-charcoal-950">{client.name}</p>
                      <p className="truncate text-sm text-stone-500">{client.goals}</p>
                    </div>
                    <div className="hidden w-28 sm:block">
                      <Progress value={client.adherence} />
                    </div>
                    <Badge className="shrink-0" variant={client.status === "needs_attention" ? "alert" : "sage"}>{client.adherence}%</Badge>
                  </Link>
                ))
              ) : (
                <div className="rounded-[1.35rem] bg-stone-50/88 px-4 py-5 text-sm text-stone-600">
                  No clients need attention right now. New roster activity will appear here once clients are added.
                </div>
              )}
            </CardContent>
          </Card>

          <TrainerSessionOverview initialBulletins={bulletins} mode={mode} />

          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent completions</CardTitle>
                <CardDescription>Workout logs with useful coaching signal.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {recentCompletionSignals.length ? (
                  recentCompletionSignals.map((client) => (
                    <div key={client.id} className="flex gap-3 rounded-[1.35rem] bg-stone-50/82 p-4">
                      <Activity className="mt-0.5 size-5 text-sage-500" />
                      <p className="text-sm leading-6 text-stone-700">
                        {client.name} has {client.metrics.workouts} completed workouts logged.
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[1.35rem] bg-stone-50/82 p-4 text-sm leading-6 text-stone-600">
                    Completed client workouts will appear here once clients begin logging sessions.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick actions</CardTitle>
                <CardDescription>High-frequency coach workflows.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                {[
                  ["Create client", "/trainer/clients", Users],
                  ["Build workout", "/trainer/workouts", Plus],
                  ["Assign plan", "/trainer/plans", CalendarCheck],
                  ["Review check-ins", "/trainer/check-ins", MessageCircle],
                ].map(([label, href, Icon]) => (
                  <Button key={label as string} asChild variant="secondary" className="w-full justify-between rounded-[1.25rem]">
                    <Link href={href as string}>
                      <span className="flex min-w-0 items-center gap-2"><Icon className="size-4 shrink-0" />{label as string}</span>
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                ))}
              </CardContent>
            </Card>
          </div>
        </section>

        <aside className="min-w-0 space-y-5">
          <Card className="rounded-[1.9rem] border-charcoal-950 bg-charcoal-950 p-5 sm:p-6 text-ivory-50">
            <p className="text-[0.66rem] uppercase tracking-[0.3em] text-bronze-200">Focus this week</p>
            <p className="mt-5 text-wrap font-serif text-[2rem] font-semibold leading-[1.04] sm:text-[2.4rem] sm:leading-[1.02]">
              {focusClient ? `${focusClient.name} is your next coaching focus.` : "Build your first client roster."}
            </p>
            <p className="mt-4 text-sm leading-6 text-ivory-50/65">
              {focusClient
                ? "Review their profile, recent adherence, and notes before your next coaching touchpoint."
                : "Create a client, send an invite, and their coaching signals will start appearing here."}
            </p>
            <Button asChild className="mt-6" variant="warm">
              <Link href={focusClient ? `/trainer/clients/${focusClient.id}` : "/trainer/clients"}>
                {focusClient ? "Open profile" : "Open roster"}
              </Link>
            </Button>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Recent check-ins</CardTitle>
              <CardDescription>Recovery, readiness, and client sentiment.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {checkIns.slice(0, 3).length ? (
                checkIns.slice(0, 3).map((checkIn) => (
                  <div key={checkIn.id} className="rounded-[1.35rem] bg-stone-50/80 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="font-medium">{checkIn.client}</p>
                      <Badge variant={checkIn.reviewed ? "sage" : "bronze"}>{checkIn.date}</Badge>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-stone-600">{checkIn.notes || "No notes submitted."}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-[1.35rem] bg-stone-50/80 p-4 text-sm leading-6 text-stone-600">
                  Client check-ins will appear here after invited clients start submitting updates.
                </div>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </AppShell>
  );
}
