import Link from "next/link";
import { ArrowRight, CalendarCheck, CheckCircle2, HeartPulse, NotebookPen } from "lucide-react";
import { brand } from "@/lib/brand";
import { AppShell } from "@/components/layout/app-shell";
import { ProgressChart } from "@/components/product/progress-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getClientCheckInData } from "@/lib/checkins";
import { getClientSelfProfile } from "@/lib/clients";
import { getClientConversationData } from "@/lib/messages";
import { getClientAssignedPlan } from "@/lib/plans";
import { getClientResources } from "@/lib/resources";
import { getClientWorkouts } from "@/lib/workouts";

export default async function ClientHomePage() {
  const [{ client }, { plan }, { workouts }, { messages }, { checkIns }, { resources }] = await Promise.all([
    getClientSelfProfile(),
    getClientAssignedPlan(),
    getClientWorkouts(),
    getClientConversationData(),
    getClientCheckInData(),
    getClientResources(),
  ]);

  const workout = workouts[0];
  const latestCheckIn = checkIns[0];
  const hasWorkspaceData = Boolean(client || plan || workouts.length || messages.length || checkIns.length || resources.length);

  if (!hasWorkspaceData) {
    return (
      <AppShell
        role="client"
        title="Welcome"
        subtitle="Your coaching workspace starts empty and fills in only with the plan, workouts, messages, and resources assigned to you."
      >
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
    <AppShell role="client" title="Your next session is clear." subtitle={`${brand.tagline} Everything is organized so you can train with calm structure, log performance, and feel supported.`}>
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <section className="space-y-5">
          <Card className="overflow-hidden border-charcoal-950 bg-charcoal-950 text-ivory-50">
            <div className="p-6 sm:p-8">
              <Badge variant="bronze">{brand.app.workspaceBadge}</Badge>
              <h2 className="mt-5 max-w-2xl font-serif text-5xl font-semibold leading-[0.95]">{workout?.name ?? "No workout assigned yet"}</h2>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-ivory-50/65">
                {workout?.coachNotes ?? "Your trainer will place your next session here once your plan is live."}
              </p>
              <div className="mt-7 flex flex-wrap gap-3 text-sm text-ivory-50/70">
                <div className="rounded-full border border-white/10 bg-white/6 px-4 py-2">{workout?.dayLabel ?? "Awaiting schedule"}</div>
                <div className="rounded-full border border-white/10 bg-white/6 px-4 py-2">{workout?.duration ?? "Planned by coach"}</div>
                <div className="rounded-full border border-white/10 bg-white/6 px-4 py-2">{brand.tagline}</div>
              </div>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Button asChild variant="warm" size="lg">
                  <Link href={workout ? `/client/workouts/${workout.id}` : "/client/workouts"}>Open workout <ArrowRight className="size-5" /></Link>
                </Button>
                <Button asChild variant="secondary" size="lg"><Link href="/client/plan">View plan</Link></Button>
              </div>
            </div>
          </Card>
          <div className="grid gap-5 md:grid-cols-3">
            {[
              { label: "Weekly adherence", value: client ? `${client.adherence}%` : "—", detail: `${client?.metrics.workouts ?? 0} sessions logged`, Icon: CalendarCheck },
              { label: "Check-ins", value: String(checkIns.length), detail: latestCheckIn ? `Latest: ${latestCheckIn.date}` : "No check-ins yet", Icon: CheckCircle2 },
              { label: "Resources", value: String(resources.length), detail: resources.length ? "Support material available" : "No resources assigned yet", Icon: NotebookPen },
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
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <HeartPulse className="size-5 text-bronze-600" />
              <h3 className="font-semibold">Today’s check-in</h3>
            </div>
            <p className="mt-3 text-sm leading-6 text-stone-600">
              {latestCheckIn ? latestCheckIn.notes || "Latest check-in submitted." : "No check-in submitted yet. Use this area to keep your trainer updated."}
            </p>
            <Button asChild className="mt-5 w-full" variant="warm"><Link href="/client/messages">Submit check-in</Link></Button>
          </Card>
          <Card>
            <CardHeader><CardTitle>Trainer notes</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {messages.length ? (
                messages.slice(-2).reverse().map((message) => (
                  <div key={message.id} className="rounded-[1.35rem] bg-stone-50 p-4">
                    <p className="text-sm font-semibold">{message.author}</p>
                    <p className="mt-3 text-sm leading-6 text-stone-600">{message.body}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-[1.35rem] bg-stone-50 p-4 text-sm leading-6 text-stone-600">
                  Coach notes will appear here once your trainer starts the conversation.
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="border-charcoal-950 bg-charcoal-950 p-6 text-ivory-50">
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
