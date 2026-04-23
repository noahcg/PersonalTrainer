import Link from "next/link";
import { ArrowRight, Dumbbell, HeartPulse, MessageCircle } from "lucide-react";
import { PublicSiteShell } from "@/components/marketing/public-site-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const principles = [
  {
    icon: Dumbbell,
    title: "Strength with structure",
    description: "Training is built around clear progressions, sound movement, and sessions that stay easy to follow.",
  },
  {
    icon: HeartPulse,
    title: "Coaching that fits real life",
    description: "Programming accounts for work schedules, recovery, stress, and the realities that affect consistency.",
  },
  {
    icon: MessageCircle,
    title: "Useful communication",
    description: "Clients get straightforward feedback, fast answers, and clear priorities instead of generic motivation.",
  },
];

const outcomes = [
  "Build strength and confidence in the gym",
  "Improve movement quality and reduce guesswork",
  "Train with a plan that matches your lifestyle",
  "See progress through measurable weekly structure",
];

export default function AboutPage() {
  return (
    <PublicSiteShell>
      <section className="px-5 py-12 sm:px-8 lg:px-10 lg:py-16">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-bronze-600">About the coach</p>
            <h1 className="mt-5 max-w-3xl font-serif text-5xl font-semibold leading-[0.95] text-charcoal-950 sm:text-6xl">
              Calm, precise personal training built around real progress.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-600">
              Nick Glushien Coaching is designed for clients who want more than workouts copied from the internet. The focus is
              practical strength, clear direction, and a coaching relationship that keeps momentum visible week after week.
            </p>
          </div>
          <Card className="bg-charcoal-950 p-6 text-ivory-50 ring-1 ring-white/10">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-bronze-200">What clients can expect</p>
            <div className="mt-5 space-y-4">
              {outcomes.map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <div className="mt-2 h-2 w-2 rounded-full bg-bronze-300" />
                  <p className="text-sm leading-6 text-ivory-50/72">{item}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>

      <section className="px-5 pb-12 sm:px-8 lg:px-10">
        <div className="grid gap-5 lg:grid-cols-3">
          {principles.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.title} className="p-6">
                <div className="grid size-11 place-items-center rounded-full bg-bronze-50">
                  <Icon className="size-5 text-bronze-600" />
                </div>
                <h2 className="mt-5 text-xl font-semibold text-charcoal-950">{item.title}</h2>
                <p className="mt-3 text-sm leading-6 text-stone-600">{item.description}</p>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="px-5 pb-12 sm:px-8 lg:px-10 lg:pb-16">
        <Card className="grid gap-6 p-6 lg:grid-cols-[1fr_auto] lg:items-center lg:p-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-bronze-600">How coaching works</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              {[
                "Start with goals, schedule, history, and current training level.",
                "Receive a structured plan with clear sessions, progress markers, and support.",
                "Adjust over time based on performance, recovery, and consistency.",
              ].map((item, index) => (
                <div key={item} className="rounded-[1.6rem] border border-stone-200 bg-white/70 p-4">
                  <div className="text-sm font-semibold text-bronze-600">0{index + 1}</div>
                  <p className="mt-3 text-sm leading-6 text-stone-600">{item}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <Button asChild variant="warm" size="lg">
              <Link href="/pricing">
                View pricing <ArrowRight className="size-5" />
              </Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link href="/login">Existing client login</Link>
            </Button>
          </div>
        </Card>
      </section>
    </PublicSiteShell>
  );
}
