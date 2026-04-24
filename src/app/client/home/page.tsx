import Link from "next/link";
import { ArrowRight, CalendarCheck, CheckCircle2, HeartPulse, NotebookPen } from "lucide-react";
import { brand } from "@/lib/brand";
import { AppShell } from "@/components/layout/app-shell";
import { ProgressChart } from "@/components/product/progress-chart";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { messages, plans, workouts } from "@/lib/demo-data";

export default function ClientHomePage() {
  const workout = workouts[0];

  return (
    <AppShell role="client" title="Your next session is clear." subtitle={`${brand.tagline} Everything is organized so you can train with calm structure, log performance, and feel supported.`}>
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <section className="space-y-5">
          <Card className="overflow-hidden border-charcoal-950 bg-charcoal-950 text-ivory-50">
            <div className="p-6 sm:p-8">
              <Badge variant="bronze">{brand.app.workspaceBadge}</Badge>
              <h2 className="mt-5 max-w-2xl font-serif text-5xl font-semibold leading-[0.95]">{workout.name}</h2>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-ivory-50/65">{workout.coachNotes}</p>
              <div className="mt-7 flex flex-wrap gap-3 text-sm text-ivory-50/70">
                <div className="rounded-full border border-white/10 bg-white/6 px-4 py-2">{workout.dayLabel}</div>
                <div className="rounded-full border border-white/10 bg-white/6 px-4 py-2">{workout.duration}</div>
                <div className="rounded-full border border-white/10 bg-white/6 px-4 py-2">{brand.tagline}</div>
              </div>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Button asChild variant="warm" size="lg">
                  <Link href={`/client/workouts/${workout.id}`}>Open workout <ArrowRight className="size-5" /></Link>
                </Button>
                <Button asChild variant="secondary" size="lg"><Link href="/client/plan">View plan</Link></Button>
              </div>
            </div>
          </Card>
          <div className="grid gap-5 md:grid-cols-3">
            {[
              { label: "Weekly adherence", value: "91%", detail: "3 of 3 sessions logged", Icon: CalendarCheck },
              { label: "Current streak", value: "7", detail: "days with habits complete", Icon: CheckCircle2 },
              { label: "Trainer reminders", value: "2", detail: "clear notes waiting for you", Icon: NotebookPen },
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
            <CardContent><ProgressChart /></CardContent>
          </Card>
        </section>
        <aside className="space-y-5">
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <HeartPulse className="size-5 text-bronze-600" />
              <h3 className="font-semibold">Today’s check-in</h3>
            </div>
            <p className="mt-3 text-sm leading-6 text-stone-600">Energy is high and soreness is low. Keep the session smooth and controlled.</p>
            <div className="mt-5"><Progress value={82} /></div>
            <Button asChild className="mt-5 w-full" variant="warm"><Link href="/client/messages">Submit check-in</Link></Button>
          </Card>
          <Card>
            <CardHeader><CardTitle>Trainer notes</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {messages.slice(0, 2).map((message) => (
                <div key={message.id} className="rounded-[1.35rem] bg-stone-50 p-4">
                  <div className="flex items-center gap-2">
                    <Avatar name={message.author} className="size-8" />
                    <p className="text-sm font-semibold">{message.author}</p>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-stone-600">{message.body}</p>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="border-charcoal-950 bg-charcoal-950 p-6 text-ivory-50">
            <CheckCircle2 className="size-5 text-sage-500" />
            <p className="mt-4 text-[0.66rem] uppercase tracking-[0.28em] text-bronze-200">Current plan</p>
            <p className="mt-2 font-serif text-3xl font-semibold">{plans[0].title}</p>
            <p className="mt-2 text-sm leading-6 text-ivory-50/62">{plans[0].weeklyStructure}</p>
          </Card>
        </aside>
      </div>
    </AppShell>
  );
}
