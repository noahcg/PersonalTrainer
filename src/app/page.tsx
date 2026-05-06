import Link from "next/link";
import { ArrowRight, CalendarCheck, HeartPulse, MessageCircle } from "lucide-react";
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
      label: "Progress you can see",
      detail: "Simple check-ins and notes keep the next priority obvious.",
      icon: HeartPulse,
      tone: "text-bronze-600",
    },
  ];

  return (
    <PublicSiteShell>
      <section className="py-10 lg:py-14">
        <div className="grid gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
          <div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.32em] text-bronze-700">
              {brand.tagline}
            </p>
            <h1 className="mt-6 max-w-4xl font-serif text-4xl font-semibold leading-tight text-charcoal-950 sm:text-5xl lg:text-6xl">
              Personal training that feels clear, calm, and built for real life.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-600">
              In-home strength coaching, steady support, and a training process clients can actually keep using.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" variant="warm">
                <Link href="/pricing">
                  Review coaching options <ArrowRight className="size-5" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href="/about">Meet Nick</Link>
              </Button>
            </div>
            <div className="mt-8 grid gap-3 border-y border-stone-200/80 py-4 sm:grid-cols-3">
              {[
                "In-home sessions",
                "Progressive strength work",
                "Clear weekly priorities",
              ].map((item) => (
                <div key={item} className="text-sm font-medium leading-6 text-stone-600">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <Card className="overflow-hidden border-charcoal-950 bg-charcoal-950 p-5 text-ivory-50 ring-1 ring-white/10 sm:p-6 lg:p-7">
            <div className="grid gap-7">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-bronze-200">Coaching philosophy</p>
                <p className="mt-4 max-w-md font-serif text-3xl font-semibold leading-tight">
                  Good coaching should reduce noise.
                </p>
                <p className="mt-4 text-sm leading-7 text-ivory-50/62">
                  Every session should make the next step easier to understand, not harder to manage.
                </p>
              </div>
              <div className="grid gap-3 border-t border-white/10 pt-2">
                {[
                  "Sessions are planned with purpose.",
                  "Adjustments stay clear when life gets busy.",
                  "Progress is easy to understand.",
                ].map((item, index) => (
                  <div key={item} className="grid grid-cols-[auto_1fr] gap-3 border-b border-white/10 py-4 text-sm leading-6 text-ivory-50/72 last:border-b-0">
                    <span className="text-bronze-200">0{index + 1}</span>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </section>

      <section className="pb-10">
        <div className="grid gap-5 lg:grid-cols-3">
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

      <section className="pb-12 lg:pb-16">
        <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
          <Card className="p-5 sm:p-6 lg:p-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-bronze-600">How it works</p>
              <h2 className="mt-4 font-serif text-3xl font-semibold text-charcoal-950">Start simple. Build steadily.</h2>
              <p className="mt-4 text-sm leading-6 text-stone-600">
                Sessions begin with your goals, your space, and what your body is ready for. From there, the plan progresses without making training feel complicated.
              </p>
              <div className="mt-6">
                <Button asChild variant="secondary">
                  <Link href="/about">How coaching works</Link>
                </Button>
              </div>
            </div>
          </Card>

          <Card className="p-5 sm:p-6 lg:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-bronze-600">What to expect</p>
            <div className="mt-5 grid gap-4">
              {[
                {
                  title: "A plan with a clear reason",
                  body: "Each session has a purpose, with progressions that make sense week to week.",
                },
                {
                  title: "Adjustments when life changes",
                  body: "Training can adapt around energy, travel, soreness, schedule shifts, and available equipment.",
                },
                {
                  title: "Support that stays useful",
                  body: "Questions, check-ins, and notes stay focused on what helps you keep moving.",
                },
              ].map((item, index) => (
                <div key={item.title} className="grid gap-3 border-b border-stone-200/80 pb-4 last:border-b-0 last:pb-0 sm:grid-cols-[2.5rem_1fr]">
                  <p className="text-[0.66rem] uppercase tracking-[0.24em] text-stone-400">0{index + 1}</p>
                  <div>
                    <h3 className="text-lg font-semibold text-charcoal-950">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-stone-600">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>
    </PublicSiteShell>
  );
}
