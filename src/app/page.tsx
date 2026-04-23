import Link from "next/link";
import { ArrowRight, CalendarCheck, CheckCircle2, Dumbbell, HeartPulse, MessageCircle, TrendingUp } from "lucide-react";
import { PublicSiteShell } from "@/components/marketing/public-site-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function Home() {
  const pillars = [
    { label: "Coaching", icon: Dumbbell, tone: "text-bronze-600" },
    { label: "Structure", icon: CalendarCheck, tone: "text-sage-700" },
    { label: "Progress", icon: TrendingUp, tone: "text-bronze-600" },
    { label: "Wellness", icon: HeartPulse, tone: "text-sage-700" },
  ];

  return (
    <PublicSiteShell>
      <section className="px-5 py-12 sm:px-8 lg:px-10 lg:py-16">
        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
          <div>
            <p className="inline-flex rounded-full border border-bronze-200 bg-bronze-50 px-4 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-bronze-700">
              Clear coaching. Real progress.
            </p>
            <h1 className="mt-6 max-w-4xl font-serif text-5xl font-semibold leading-[0.95] text-charcoal-950 sm:text-6xl lg:text-7xl">
              Personal training with structure, clarity, and visible momentum.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-600">
              This is the public front door for Nick Glushien Coaching. Prospective clients can learn about the coach,
              understand the process, and review pricing before they ever log in.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" variant="warm">
                <Link href="/pricing">
                  View pricing <ArrowRight className="size-5" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href="/about">Meet the coach</Link>
              </Button>
            </div>
          </div>

          <Card className="bg-charcoal-950 p-6 text-ivory-50 ring-1 ring-white/10 lg:p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-bronze-200">Who this is for</p>
            <div className="mt-5 space-y-4">
              {[
                "Clients who want expert guidance without confusion.",
                "Busy professionals who need training that fits real life.",
                "People who value accountability, communication, and measurable progress.",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-1 size-4 shrink-0 text-bronze-200" />
                  <p className="text-sm leading-6 text-ivory-50/72">{item}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>

      <section className="px-5 pb-12 sm:px-8 lg:px-10">
        <div className="grid gap-3 text-sm text-stone-700 sm:grid-cols-2 lg:grid-cols-4">
          {pillars.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="flex items-center gap-3 rounded-2xl border border-stone-200/80 bg-white/72 px-4 py-4 shadow-inner-soft">
                <div className="grid size-10 place-items-center rounded-full bg-stone-100">
                  <Icon className={`size-4 ${item.tone}`} />
                </div>
                <span className="font-medium">{item.label}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="px-5 pb-12 sm:px-8 lg:px-10">
        <div className="grid gap-5 lg:grid-cols-3">
          <Card className="p-6">
            <CalendarCheck className="size-5 text-bronze-600" />
            <h2 className="mt-5 text-2xl font-semibold text-charcoal-950">Clear planning</h2>
            <p className="mt-3 text-sm leading-6 text-stone-600">
              Every client gets a structured training path instead of improvised week-to-week sessions.
            </p>
          </Card>
          <Card className="p-6">
            <MessageCircle className="size-5 text-sage-700" />
            <h2 className="mt-5 text-2xl font-semibold text-charcoal-950">Practical coaching support</h2>
            <p className="mt-3 text-sm leading-6 text-stone-600">
              Feedback, check-ins, and communication stay straightforward so clients always know the next priority.
            </p>
          </Card>
          <Card className="p-6">
            <TrendingUp className="size-5 text-bronze-600" />
            <h2 className="mt-5 text-2xl font-semibold text-charcoal-950">Visible progress</h2>
            <p className="mt-3 text-sm leading-6 text-stone-600">
              Training is designed to produce momentum clients can feel and track over time.
            </p>
          </Card>
        </div>
      </section>

      <section className="px-5 pb-12 sm:px-8 lg:px-10 lg:pb-16">
        <Card className="grid gap-6 p-6 lg:grid-cols-[1fr_auto] lg:items-center lg:p-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-bronze-600">Next steps</p>
            <h2 className="mt-4 font-serif text-3xl font-semibold text-charcoal-950 sm:text-4xl">
              Prospective clients can learn about the coach first, then review pricing with context.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-stone-600">
              The app still supports current clients after login, but the public website now has a clear path for new visitors.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <Button asChild size="lg" variant="warm">
              <Link href="/about">
                Learn about Nick <ArrowRight className="size-5" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href="/pricing">See pricing</Link>
            </Button>
          </div>
        </Card>
      </section>
    </PublicSiteShell>
  );
}
