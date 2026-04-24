import Link from "next/link";
import { ArrowRight, CalendarCheck, Dumbbell, HeartPulse, MessageCircle, TrendingUp } from "lucide-react";
import { brand } from "@/lib/brand";
import { PublicSiteShell } from "@/components/marketing/public-site-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function Home() {
  const pillars = [
    {
      label: "Structured programming",
      detail: "Training is planned with progression, not improvised week to week.",
      icon: CalendarCheck,
      tone: "text-bronze-600",
    },
    {
      label: "Clear support",
      detail: "Clients always know what to do next and why it matters.",
      icon: MessageCircle,
      tone: "text-sage-700",
    },
    {
      label: "Visible progress",
      detail: "Momentum is tracked in a way that feels motivating instead of noisy.",
      icon: TrendingUp,
      tone: "text-bronze-600",
    },
    {
      label: "Real-life coaching",
      detail: "The system fits work, travel, energy shifts, and actual human schedules.",
      icon: HeartPulse,
      tone: "text-sage-700",
    },
  ];

  return (
    <PublicSiteShell>
      <section className="px-5 py-12 sm:px-8 lg:px-10 lg:py-16">
        <div className="grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
          <div>
            <p className="inline-flex rounded-full border border-bronze-200 bg-bronze-50 px-4 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-bronze-700">
              {brand.tagline}
            </p>
            <h1 className="mt-6 max-w-4xl font-serif text-5xl font-semibold leading-[0.95] text-charcoal-950 sm:text-6xl lg:text-7xl">
              Personal training that feels clear, calm, and built to last.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-600">
              Clear programming, steady support, and a training process that stays usable in real life.
            </p>
            <div className="mt-8">
              <Button asChild size="lg" variant="warm">
                <Link href="/pricing">
                  Review coaching options <ArrowRight className="size-5" />
                </Link>
              </Button>
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                "Structured programming.",
                "Direct coaching support.",
                "Progress that stays visible.",
              ].map((item) => (
                <div key={item} className="rounded-[1.5rem] border border-stone-200/80 bg-white/72 px-4 py-4 text-sm leading-6 text-stone-600 shadow-inner-soft">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <Card className="overflow-hidden border-charcoal-950 bg-charcoal-950 p-6 text-ivory-50 ring-1 ring-white/10 lg:p-7">
            <div className="grid gap-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-bronze-200">Coaching philosophy</p>
                <p className="mt-4 font-serif text-3xl font-semibold leading-tight">
                  Good coaching should reduce noise.
                </p>
              </div>
              <div className="grid gap-3">
                {[
                  "Sessions are planned with purpose.",
                  "Adjustments stay clear when life gets busy.",
                  "Progress is easy to understand.",
                ].map((item) => (
                  <div key={item} className="rounded-[1.5rem] border border-white/10 bg-white/6 px-4 py-4 text-sm leading-6 text-ivory-50/72">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </section>

      <section className="px-5 pb-12 sm:px-8 lg:px-10">
        <div className="grid gap-5 lg:grid-cols-4">
          {pillars.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.label} className="p-5">
                <div className="grid size-10 place-items-center rounded-full bg-stone-100">
                  <Icon className={`size-4 ${item.tone}`} />
                </div>
                <h2 className="mt-5 text-xl font-semibold text-charcoal-950">{item.label}</h2>
                <p className="mt-3 text-sm leading-6 text-stone-600">{item.detail}</p>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="px-5 pb-12 sm:px-8 lg:px-10">
        <Card className="overflow-hidden p-6 lg:p-8">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-bronze-600">How it works</p>
              <h2 className="mt-4 font-serif text-3xl font-semibold text-charcoal-950 sm:text-4xl">
                Better coaching comes down to a few basics.
              </h2>
              <p className="mt-4 text-sm leading-6 text-stone-600">
                The plan should be clear, the support should be useful, and the work should stay sustainable.
              </p>
            </div>
            <div className="grid gap-4">
              {[
                {
                  title: "Plan with purpose",
                  body: "Every phase should have a job, so the client knows what they are building toward.",
                },
                {
                  title: "Support outside the session",
                  body: "Check-ins and communication should answer questions quickly instead of adding friction.",
                },
                {
                  title: "Keep momentum visible",
                  body: "Progress should stay visible enough that the next priority is obvious.",
                },
              ].map((item, index) => (
                <div key={item.title} className="rounded-[1.6rem] bg-stone-50/88 p-5">
                  <p className="text-[0.66rem] uppercase tracking-[0.24em] text-stone-400">0{index + 1}</p>
                  <h3 className="mt-3 text-xl font-semibold text-charcoal-950">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-stone-600">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </section>

      <section className="px-5 pb-12 sm:px-8 lg:px-10">
        <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          <Card className="p-6 lg:p-8">
            <Dumbbell className="size-5 text-bronze-600" />
            <h2 className="mt-5 font-serif text-3xl font-semibold text-charcoal-950">Training should fit real life and still feel serious.</h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-stone-600">
              The goal is a structure a client can trust on busy weeks, low-energy weeks, and normal weeks.
            </p>
          </Card>
          <Card className="p-6 lg:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-bronze-600">Client experience</p>
            <div className="mt-5 space-y-4">
              {[
                "A clear plan instead of random sessions.",
                "Support that feels direct and usable.",
                "Progress that stays visible over time.",
              ].map((item) => (
                <div key={item} className="rounded-[1.4rem] border border-stone-200/80 bg-white/72 px-4 py-4 text-sm leading-6 text-stone-600">
                  {item}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>
    </PublicSiteShell>
  );
}
