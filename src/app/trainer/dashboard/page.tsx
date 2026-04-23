import Link from "next/link";
import { Activity, ArrowRight, CalendarCheck, MessageCircle, Plus, Users } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { StatCard } from "@/components/product/stat-card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { checkIns, clients } from "@/lib/demo-data";

export default function TrainerDashboardPage() {
  return (
    <AppShell
      role="trainer"
      title="Good morning, Avery."
      subtitle="A clear read on client momentum, adherence, and the coaching moments that need your attention."
    >
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <section className="space-y-5">
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Active clients" value="24" detail="+3 this month" tone="dark" />
            <StatCard label="Weekly adherence" value="87%" detail="Across assigned plans" tone="sage" />
            <StatCard label="Completed workouts" value="118" detail="Last 7 days" />
            <StatCard label="Check-ins waiting" value="3" detail="2 flagged by recovery score" />
          </div>

          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle>Clients needing attention</CardTitle>
                <CardDescription>Prioritized by adherence dips, check-ins, and trainer notes.</CardDescription>
              </div>
              <Button asChild variant="secondary" size="sm">
                <Link href="/trainer/clients">View roster</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {clients.map((client) => (
                <Link key={client.id} href={`/trainer/clients/${client.id}`} className="flex items-center gap-4 rounded-[1.5rem] bg-stone-50/80 p-3 transition hover:bg-white">
                  <Avatar name={client.name} src={client.photo} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{client.name}</p>
                    <p className="truncate text-sm text-stone-500">{client.goals}</p>
                  </div>
                  <div className="hidden w-32 sm:block">
                    <Progress value={client.adherence} />
                  </div>
                  <Badge variant={client.status === "needs_attention" ? "alert" : "sage"}>{client.adherence}%</Badge>
                </Link>
              ))}
            </CardContent>
          </Card>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent completions</CardTitle>
                <CardDescription>Workout logs with useful coaching signal.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {["Mara finished Lower Strength A and added RDL video.", "Nina hit assisted pull-up PR.", "Eli completed shoulder reset flow."].map((item) => (
                  <div key={item} className="flex gap-3 rounded-2xl bg-stone-50/80 p-4">
                    <Activity className="mt-0.5 size-5 text-sage-500" />
                    <p className="text-sm leading-6 text-stone-700">{item}</p>
                  </div>
                ))}
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
                  <Button key={label as string} asChild variant="secondary" className="justify-between rounded-2xl">
                    <Link href={href as string}>
                      <span className="flex items-center gap-2"><Icon className="size-4" />{label as string}</span>
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                ))}
              </CardContent>
            </Card>
          </div>
        </section>

        <aside className="space-y-5">
          <Card className="bg-charcoal-950 p-6 text-ivory-50">
            <p className="text-xs uppercase tracking-[0.28em] text-bronze-200">Progress highlight</p>
            <p className="mt-5 font-serif text-4xl font-semibold">Nina is 1 rep from her first pull-up.</p>
            <p className="mt-4 text-sm leading-6 text-ivory-50/65">Add a confidence note and keep eccentric volume stable this week.</p>
            <Button asChild className="mt-6" variant="warm">
              <Link href="/trainer/progress">Open trend</Link>
            </Button>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Recent check-ins</CardTitle>
              <CardDescription>Recovery, readiness, and client sentiment.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {checkIns.map((checkIn) => (
                <div key={checkIn.id} className="rounded-2xl bg-stone-50/80 p-4">
                  <div className="flex justify-between">
                    <p className="font-semibold">{checkIn.client}</p>
                    <Badge variant={checkIn.reviewed ? "sage" : "bronze"}>{checkIn.date}</Badge>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-stone-600">{checkIn.notes}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </aside>
      </div>
    </AppShell>
  );
}
