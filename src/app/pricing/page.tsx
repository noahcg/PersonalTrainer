import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { PublicSiteShell } from "@/components/marketing/public-site-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const tiers = [
  {
    name: "Intro Session",
    price: "$95",
    cadence: "one-time",
    description: "A starting point for new clients who want a professional assessment and a clear next step.",
    features: ["Movement and goal review", "Training history assessment", "Initial recommendations"],
  },
  {
    name: "Ongoing Coaching",
    price: "$325",
    cadence: "per month",
    description: "A structured monthly coaching option for clients who want programming, accountability, and consistent progress.",
    features: ["Personalized programming", "Ongoing adjustments", "Client messaging and check-ins", "Progress tracking"],
  },
  {
    name: "High-Touch Coaching",
    price: "$525",
    cadence: "per month",
    description: "For clients who want more frequent support, tighter feedback loops, and a more hands-on coaching relationship.",
    features: ["Everything in Ongoing Coaching", "Higher support cadence", "Priority plan updates", "Expanded accountability"],
  },
];

export default function PricingPage() {
  return (
    <PublicSiteShell>
      <section className="px-5 py-12 sm:px-8 lg:px-10 lg:py-16">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-bronze-600">Pricing</p>
          <h1 className="mt-5 font-serif text-5xl font-semibold leading-[0.95] text-charcoal-950 sm:text-6xl">
            Coaching options for clients who want clarity, consistency, and measurable progress.
          </h1>
          <p className="mt-6 text-lg leading-8 text-stone-600">
            Simple pricing, clear support levels, and no extra explanation needed.
          </p>
        </div>
      </section>

      <section className="px-5 pb-12 sm:px-8 lg:px-10">
        <div className="grid gap-5 lg:grid-cols-3">
          {tiers.map((tier, index) => (
            <Card
              key={tier.name}
              className={index === 1 ? "border-bronze-300 bg-bronze-50/55 p-5 sm:p-6" : "p-5 sm:p-6"}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-bronze-600">{tier.name}</p>
                  <p className="mt-4 text-4xl font-semibold text-charcoal-950">{tier.price}</p>
                  <p className="mt-1 text-sm text-stone-500">{tier.cadence}</p>
                </div>
                {index === 1 ? (
                  <span className="inline-flex items-center justify-center rounded-full bg-charcoal-950 px-3 py-2 text-center text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-ivory-50">
                    Most popular
                  </span>
                ) : null}
              </div>
              <p className="mt-5 text-sm leading-6 text-stone-600">{tier.description}</p>
              <div className="mt-6 space-y-3">
                {tier.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-1 size-4 shrink-0 text-sage-500" />
                    <p className="text-sm leading-6 text-stone-700">{feature}</p>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className="px-5 pb-12 sm:px-8 lg:px-10 lg:pb-16">
        <Card className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-center lg:p-8">
          <div>
            <h2 className="font-serif text-3xl font-semibold text-charcoal-950">Already a client?</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
              Log in to review plans, workouts, progress, and communication.
            </p>
          </div>
          <div>
            <Button asChild size="lg" variant="warm">
              <Link href="/login">Client login</Link>
            </Button>
          </div>
        </Card>
      </section>
    </PublicSiteShell>
  );
}
