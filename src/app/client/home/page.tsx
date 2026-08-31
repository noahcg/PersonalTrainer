import Link from "next/link";
import { ArrowRight, CalendarCheck, CheckCircle2, NotebookPen, TrendingUp, UserRound } from "lucide-react";
import { brand } from "@/lib/brand";
import { AppShell } from "@/components/layout/app-shell";
import { AppointmentReminderBanner, ClientUpcomingAppointments } from "@/components/product/client-upcoming-appointments";
import { ClientLocalDateTime } from "@/components/product/client-local-date-time";
import { ProgressChart } from "@/components/product/progress-chart";
import { SessionReminderBanner } from "@/components/product/session-reminder-banner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getClientCheckInData } from "@/lib/checkins";
import { getClientSelfProfile } from "@/lib/clients";
import { getClientAssignedPlan } from "@/lib/plans";
import { getClientBulletins } from "@/lib/bulletins";
import { getClientResources } from "@/lib/resources";
import { getClientWorkoutCheckIns, getClientWorkouts } from "@/lib/workouts";
import { clientPortalAccessFromStatus } from "@/lib/client-portal-access";
import type { TrainerAppointment, Workout } from "@/lib/types";

function normalizeLabel(value: string) {
  return value.toLowerCase().replace(/[^\w\s/.-]/g, " ").replace(/\s+/g, " ").trim();
}

function getTodayWorkoutTokens(today = new Date()) {
  const weekday = today.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
  const shortWeekday = today.toLocaleDateString("en-US", { weekday: "short" }).toLowerCase();
  const month = today.toLocaleDateString("en-US", { month: "long" }).toLowerCase();
  const shortMonth = today.toLocaleDateString("en-US", { month: "short" }).toLowerCase();
  const day = String(today.getDate());
  const monthNumber = String(today.getMonth() + 1);

  return [
    "today",
    weekday,
    shortWeekday,
    `${month} ${day}`,
    `${shortMonth} ${day}`,
    `${monthNumber}/${day}`,
    `${monthNumber}-${day}`,
  ];
}

function isTodaysWorkout(workout: Workout, today = new Date()) {
  const searchableLabel = normalizeLabel(`${workout.assignment?.scheduledFor ?? ""} ${workout.assignment?.dueOn ?? ""} ${workout.dayLabel} ${workout.name}`);
  return getTodayWorkoutTokens(today).some((token) => searchableLabel.includes(token));
}

function getRelevantWorkout(workouts: Workout[]) {
  const today = new Date();
  const todaysWorkout = workouts.find((workout) => isTodaysWorkout(workout, today));
  if (todaysWorkout) return { workout: todaysWorkout, label: "Today's workout" };

  const scheduledWorkout = [...workouts]
    .filter((workout) => workout.assignment?.status !== "completed")
    .sort((a, b) => {
      const aDate = a.assignment?.scheduledFor || a.assignment?.dueOn || "9999-12-31";
      const bDate = b.assignment?.scheduledFor || b.assignment?.dueOn || "9999-12-31";
      return aDate.localeCompare(bDate);
    })[0];

  return {
    workout: scheduledWorkout,
    label: scheduledWorkout ? "Scheduled workout" : "Workout focus",
  };
}

function formatDateOnly(value?: string) {
  if (!value) return "";
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatAppointmentDateTime(iso: string) {
  const date = new Date(iso);
  return {
    date: date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    }),
    time: date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    }),
  };
}

function getNextAction(appointments: TrainerAppointment[], workouts: Workout[]) {
  const now = Date.now();
  const nextAppointment = appointments
    .filter((appointment) => appointment.status === "scheduled" && new Date(appointment.startsAtIso).getTime() >= now - 60 * 60 * 1000)
    .sort((a, b) => new Date(a.startsAtIso).getTime() - new Date(b.startsAtIso).getTime())[0];

  if (nextAppointment) {
    const formatted = formatAppointmentDateTime(nextAppointment.startsAtIso);
    return {
      type: "appointment" as const,
      badge: "Upcoming appointment",
      title: nextAppointment.title,
      description: nextAppointment.notes || "Your next 1:1 session is on the schedule.",
      primaryMeta: `${formatted.date} at ${formatted.time}`,
      primaryMetaIso: nextAppointment.startsAtIso,
      secondaryMeta: nextAppointment.durationMinutes ? `${nextAppointment.durationMinutes} min` : "Scheduled",
      tertiaryMeta: nextAppointment.location || "Location TBD",
      href: "/client/home",
      action: "View appointment",
    };
  }

  const featuredWorkout = getRelevantWorkout(workouts);
  const workout = featuredWorkout.workout;
  if (workout) {
    const due = formatDateOnly(workout.assignment?.dueOn);
    const scheduled = formatDateOnly(workout.assignment?.scheduledFor);
    return {
      type: "workout" as const,
      badge: featuredWorkout.label,
      title: workout.name,
      description: workout.assignment?.notes || workout.coachNotes || "Complete this workout on your own and log how it went.",
    primaryMeta: due ? `Due ${due}` : scheduled ? `Scheduled ${scheduled}` : workout.dayLabel,
    primaryMetaIso: null,
      secondaryMeta: workout.duration,
      tertiaryMeta: `${workout.blocks.length} training blocks`,
      href: `/client/workouts/${workout.id}`,
      action: "Open workout",
    };
  }

  return {
    type: "empty" as const,
    badge: brand.app.workspaceBadge,
    title: "No upcoming item yet",
    description: "Your trainer will place appointments and scheduled workouts here when they are ready.",
    primaryMeta: "Awaiting schedule",
    primaryMetaIso: null,
    secondaryMeta: "Planned by coach",
    tertiaryMeta: brand.tagline,
    href: "/client/workouts",
    action: "View workouts",
  };
}

export default async function ClientHomePage() {
  const profileResult = await getClientSelfProfile();
  const { client, sessions, appointments } = profileResult;
  const clientPortalAccess = clientPortalAccessFromStatus(client?.status);
  const { checkIns } = await getClientCheckInData();

  if (clientPortalAccess === "data_only") {
    return (
      <AppShell
        role="client"
        title="Your account is inactive."
        eyebrow="Account status"
        subtitle="You can still access your profile, progress, and recorded history. Active training services are paused."
        clientPortalAccess={clientPortalAccess}
      >
        <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
          <section className="space-y-5">
            <Card className="overflow-hidden border-charcoal-950 bg-charcoal-950 text-ivory-50">
              <div className="p-5 sm:p-8">
                <Badge variant="bronze">Data access</Badge>
                <h2 className="mt-5 max-w-2xl font-serif text-5xl font-semibold leading-[0.95]">
                  Your training account remains available.
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-ivory-50/65">
                  Your active coaching package has ended, so workouts, plans, messages, resources, and bulletin updates are no longer available in this portal.
                </p>
                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <Button asChild variant="warm" size="lg">
                    <Link href="/client/progress">
                      View progress
                      <ArrowRight className="size-5" />
                    </Link>
                  </Button>
                  <Button asChild variant="secondary" size="lg">
                    <Link href="/client/profile">Open profile</Link>
                  </Button>
                </div>
              </div>
            </Card>

            <div className="grid gap-5 md:grid-cols-3">
              {[
                { label: "Body weight", value: client?.metrics.bodyWeight ?? "—", detail: "Latest recorded metric", Icon: TrendingUp },
                { label: "Workout history", value: String(client?.metrics.workouts ?? 0), detail: "Completed workouts recorded", Icon: CalendarCheck },
                { label: "In-person sessions", value: String(client?.sessionPackage.used ?? 0), detail: "Completed sessions recorded", Icon: NotebookPen },
              ].map(({ label, value, detail, Icon }) => (
                <Card key={label} className="p-5">
                  <Icon className="size-5 text-bronze-500" />
                  <p className="mt-6 text-[0.66rem] uppercase tracking-[0.28em] text-stone-500">{label}</p>
                  <p className="mt-2 font-serif text-4xl font-semibold">{value}</p>
                  <p className="mt-2 text-sm text-stone-500">{detail}</p>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Progress summary</CardTitle>
                <p className="text-sm leading-6 text-stone-500">A read-only snapshot of the data currently recorded on your account.</p>
              </CardHeader>
              <CardContent>
                {client ? (
                  <ProgressChart
                    data={[
                      {
                        label: "Current",
                        weight: Number.parseFloat(client.metrics.bodyWeight.replace(/[^\d.]/g, "")) || 0,
                        adherence: client.adherence,
                        sleep: 0,
                      },
                    ]}
                  />
                ) : (
                  <div className="rounded-[1.35rem] bg-stone-50/88 px-4 py-4 text-sm text-stone-600">No progress data is recorded yet.</div>
                )}
              </CardContent>
            </Card>
          </section>

          <aside className="space-y-5">
            <Card className="p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <UserRound className="size-5 text-bronze-600" />
                <h3 className="font-semibold">Available pages</h3>
              </div>
              <div className="mt-5 grid gap-3">
                <Button asChild variant="secondary" className="justify-start">
                  <Link href="/client/progress">Progress</Link>
                </Button>
                <Button asChild variant="secondary" className="justify-start">
                  <Link href="/client/profile">Profile and history</Link>
                </Button>
              </div>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Recent in-person sessions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {sessions.length ? (
                  sessions.slice(0, 5).map((session) => (
                    <div key={session.id} className="rounded-[1.35rem] bg-stone-50 p-4">
                      <p className="text-sm font-semibold">{session.startedAt}</p>
                      <p className="mt-2 text-sm leading-6 text-stone-600">
                        {session.location || "In person"}
                        {session.durationMinutes ? ` · ${session.durationMinutes} min` : ""}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[1.35rem] bg-stone-50 p-4 text-sm leading-6 text-stone-600">
                    No in-person sessions have been recorded yet.
                  </div>
                )}
              </CardContent>
            </Card>
          </aside>
        </div>
      </AppShell>
    );
  }

  const [{ plan }, { workouts }, { workoutCheckIns }, { resources }, { bulletins, mode }] = await Promise.all([
    getClientAssignedPlan(),
    getClientWorkouts(),
    getClientWorkoutCheckIns(1),
    getClientResources(),
    getClientBulletins(),
  ]);

  const nextAction = getNextAction(appointments, workouts);
  const latestCheckIn = checkIns[0];
  const hasWorkspaceData = Boolean(client || plan || workouts.length || workoutCheckIns.length || checkIns.length || resources.length || bulletins.length || appointments.length);
  const assignedWorkoutDetail = client?.metrics.assignedWorkouts.total
    ? `${client.metrics.assignedWorkouts.completed}/${client.metrics.assignedWorkouts.total} due workouts logged`
    : "No scheduled workouts due yet";

  if (!hasWorkspaceData) {
    return (
      <AppShell
        role="client"
        title="Welcome"
        eyebrow="Client workspace"
        subtitle="Your coaching workspace starts empty and fills in only with the plan, workouts, messages, and resources assigned to you."
        clientPortalAccess={clientPortalAccess}
      >
        <SessionReminderBanner initialBulletins={bulletins} mode={mode} role="client" />
        <AppointmentReminderBanner appointments={appointments} />
        <Card className="max-w-4xl p-8">
          <Badge variant="bronze">{brand.app.workspaceBadge}</Badge>
          <h2 className="mt-5 font-serif text-4xl font-semibold text-charcoal-950">Your workspace is ready for your coach to personalize.</h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-stone-600">
            You will see your training plan, workouts, check-ins, messages, and resources here as soon as they are assigned. Nothing is prefilled from another client.
          </p>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {[
              "Your plan will appear once it is assigned.",
              "Messages and check-ins will stay specific to your account.",
              "Resources will only show if they are shared with you.",
            ].map((item) => (
              <div key={item} className="rounded-[1.5rem] bg-stone-50 p-5 text-sm leading-6 text-stone-600">
                {item}
              </div>
            ))}
          </div>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell
      role="client"
      title="Your next session is clear."
      eyebrow="Today"
      subtitle={`${brand.tagline} Everything is organized so you can train with calm structure, log performance, and feel supported.`}
      clientPortalAccess={clientPortalAccess}
    >
      <SessionReminderBanner initialBulletins={bulletins} mode={mode} role="client" />
      <AppointmentReminderBanner appointments={appointments} />
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <section className="space-y-5">
          <Card className="overflow-hidden border-charcoal-950 bg-charcoal-950 text-ivory-50">
            <div className="p-5 sm:p-8">
              <Badge variant={nextAction.type === "workout" ? "bronze" : "sage"}>{nextAction.badge}</Badge>
              <h2 className="mt-5 max-w-2xl font-serif text-5xl font-semibold leading-[0.95]">{nextAction.title}</h2>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-ivory-50/65">
                {nextAction.description}
              </p>
              <div className="mt-7 flex flex-wrap gap-3 text-sm text-ivory-50/70">
                <div className="rounded-full border border-white/10 bg-white/6 px-4 py-2">
                  {nextAction.primaryMetaIso ? (
                    <ClientLocalDateTime iso={nextAction.primaryMetaIso} fallback={nextAction.primaryMeta} />
                  ) : (
                    nextAction.primaryMeta
                  )}
                </div>
                <div className="rounded-full border border-white/10 bg-white/6 px-4 py-2">
                  {nextAction.secondaryMeta}
                </div>
                <div className="rounded-full border border-white/10 bg-white/6 px-4 py-2">
                  {nextAction.tertiaryMeta}
                </div>
              </div>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Button asChild variant="warm" size="lg">
                  <Link href={nextAction.href}>
                    {nextAction.action}
                    <ArrowRight className="size-5" />
                  </Link>
                </Button>
                <Button asChild variant="secondary" size="lg"><Link href="/client/plan">View plan</Link></Button>
              </div>
            </div>
          </Card>
          <div className="grid gap-5 md:grid-cols-3">
            {[
              { label: "Plan adherence", value: client ? `${client.adherence}%` : "—", detail: assignedWorkoutDetail, Icon: CalendarCheck },
              { label: "Check-ins", value: String(checkIns.length), detail: latestCheckIn ? `Latest: ${latestCheckIn.date}` : "No check-ins yet", Icon: CheckCircle2 },
              {
                label: "In-person sessions",
                value: client?.sessionPackage.remaining === null ? "Open" : String(client?.sessionPackage.remaining ?? 0),
                detail: client ? `${client.sessionPackage.used} used in this package` : "No package assigned yet",
                Icon: NotebookPen,
              },
            ].map(({ label, value, detail, Icon }) => (
              <Card key={label} className="p-5">
                <Icon className="size-5 text-bronze-500" />
                <p className="mt-6 text-[0.66rem] uppercase tracking-[0.28em] text-stone-500">{label}</p>
                <p className="mt-2 font-serif text-4xl font-semibold">{value}</p>
                <p className="mt-2 text-sm text-stone-500">{detail}</p>
              </Card>
            ))}
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Progress summary</CardTitle>
              <p className="text-sm leading-6 text-stone-500">Your training is designed to show momentum, not overwhelm you with noise.</p>
            </CardHeader>
            <CardContent>
              {client ? (
                <ProgressChart
                  data={[
                    {
                      label: "Current",
                      weight: Number.parseFloat(client.metrics.bodyWeight.replace(/[^\d.]/g, "")) || 0,
                      adherence: client.adherence,
                      sleep: 0,
                    },
                  ]}
                />
              ) : (
                <div className="rounded-[1.35rem] bg-stone-50/88 px-4 py-4 text-sm text-stone-600">Your progress summary will appear here once your first entries are recorded.</div>
              )}
            </CardContent>
          </Card>
        </section>
        <aside className="space-y-5">
          <ClientUpcomingAppointments appointments={appointments} />
          <Card>
            <CardHeader><CardTitle>Trainer notes</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {client?.notes && client.notes !== "No trainer notes yet." ? (
                <div className="rounded-[1.35rem] bg-stone-50 p-4">
                  <p className="text-sm font-semibold">Most recent trainer note</p>
                  <p className="mt-3 text-sm leading-6 text-stone-600">{client.notes}</p>
                </div>
              ) : (
                <div className="rounded-[1.35rem] bg-stone-50 p-4 text-sm leading-6 text-stone-600">
                  Trainer notes will appear here once your trainer adds one to your profile.
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="border-charcoal-950 bg-charcoal-950 p-5 sm:p-6 text-ivory-50">
            <CheckCircle2 className="size-5 text-sage-500" />
            <p className="mt-4 text-[0.66rem] uppercase tracking-[0.28em] text-bronze-200">Current plan</p>
            <p className="mt-2 font-serif text-3xl font-semibold">{plan?.title ?? "No plan assigned"}</p>
            <p className="mt-2 text-sm leading-6 text-ivory-50/62">
              {plan?.weeklyStructure ?? "Your trainer will add structure here when your plan is ready."}
            </p>
          </Card>
        </aside>
      </div>
    </AppShell>
  );
}
