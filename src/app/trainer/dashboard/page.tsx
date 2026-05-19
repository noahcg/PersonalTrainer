import Link from "next/link";
import { ArrowRight, CalendarCheck, CalendarDays, Clock, MapPin, MessageCircle, Plus, UserRound, Users } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { SessionReminderBanner } from "@/components/product/session-reminder-banner";
import { TrainerSessionOverview } from "@/components/product/trainer-session-overview";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getTrainerCalendarData } from "@/lib/appointments";
import { getTrainerBulletins } from "@/lib/bulletins";
import { getTrainerCheckInData } from "@/lib/checkins";
import { getTrainerClients } from "@/lib/clients";
import type { CalendarEvent } from "@/lib/types";

const eventTypeLabel: Record<CalendarEvent["type"], string> = {
  appointment: "Appointment",
  bulletin_session: "Bulletin session",
  in_person_session: "In-person session",
};

function formatNextAppointmentDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function TrainerDashboardPage() {
  const [{ bulletins, mode }, { clients }, { checkIns }, calendarData] = await Promise.all([
    getTrainerBulletins(),
    getTrainerClients(),
    getTrainerCheckInData(),
    getTrainerCalendarData(),
  ]);
  const activeClients = clients.filter((client) => client.status !== "archived");
  const clientsNeedingAttention = activeClients
    .filter((client) => client.status === "needs_attention" || client.adherence < 75)
    .slice(0, 4);
  // eslint-disable-next-line react-hooks/purity -- server component, evaluated once per request
  const nowMs = Date.now();
  const nextEvent =
    [...calendarData.events]
      .filter((event) => new Date(event.startsAtIso).getTime() >= nowMs)
      .sort((a, b) => new Date(a.startsAtIso).getTime() - new Date(b.startsAtIso).getTime())[0] ?? null;

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
          <Card className="overflow-hidden border-charcoal-950 bg-charcoal-950 p-5 text-ivory-50 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-full bg-bronze-500/20 text-bronze-200">
                  <CalendarDays className="size-5" />
                </div>
                <div>
                  <p className="text-[0.66rem] font-semibold uppercase tracking-[0.3em] text-bronze-200">Next appointment</p>
                  <p className="mt-1 font-serif text-xl font-semibold">
                    {nextEvent ? eventTypeLabel[nextEvent.type] : "Nothing scheduled"}
                  </p>
                </div>
              </div>
              <Button asChild variant="warm" size="sm">
                <Link href="/trainer/calendar">
                  Open calendar
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>

            {nextEvent ? (
              <div className="mt-5 space-y-4">
                <p className="font-serif text-3xl font-semibold leading-tight sm:text-4xl">{nextEvent.title}</p>
                <div className="grid gap-2 text-sm text-ivory-50/75 sm:grid-cols-2">
                  <span className="inline-flex items-center gap-2">
                    <Clock className="size-4 text-bronze-200" />
                    {formatNextAppointmentDate(nextEvent.startsAtIso)}
                    {nextEvent.durationMinutes ? ` · ${nextEvent.durationMinutes} min` : ""}
                  </span>
                  {nextEvent.clientName ? (
                    <span className="inline-flex items-center gap-2">
                      <UserRound className="size-4 text-bronze-200" />
                      {nextEvent.clientName}
                    </span>
                  ) : null}
                  {nextEvent.location ? (
                    <span className="inline-flex items-center gap-2">
                      <MapPin className="size-4 text-bronze-200" />
                      {nextEvent.location}
                    </span>
                  ) : null}
                </div>
                {nextEvent.notes ? (
                  <p className="line-clamp-3 text-sm leading-6 text-ivory-50/65">{nextEvent.notes}</p>
                ) : null}
              </div>
            ) : (
              <p className="mt-5 max-w-xl text-sm leading-6 text-ivory-50/65">
                Your calendar is open. Add a client appointment or schedule a session to see it here.
              </p>
            )}
          </Card>

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
        </section>

        <aside className="min-w-0 space-y-5">
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
