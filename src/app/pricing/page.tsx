import { CheckCircle2 } from "lucide-react";
import { PublicSiteShell } from "@/components/marketing/public-site-shell";

const pricingCards = [
  {
    eyebrow: "Packages",
    name: "Session Bundles",
    description: "Prepaid one-on-one training for clients who want flexibility with a clear bank of sessions.",
    price: "$1,100",
    cadence: "10 sessions",
    detail: "$110 per session",
    features: ["Flexible scheduling", "One-on-one coaching", "Strength work matched to your goals"],
  },
  {
    eyebrow: "Best fit",
    name: "Monthly Training",
    description: "A consistent weekly training rhythm for clients who want structure, accountability, and momentum.",
    price: "$840",
    cadence: "2x / week",
    detail: "8 sessions per month",
    secondaryPrice: "$1,200",
    secondaryCadence: "3x / week",
    secondaryDetail: "12 sessions per month",
    featured: true,
    features: ["Reserved weekly schedule", "Progressive session planning", "Ongoing adjustments as needed"],
  },
  {
    eyebrow: "Shared session",
    name: "Partner Training",
    description: "Train with a partner while keeping the session coached, organized, and focused.",
    price: "$160",
    cadence: "total",
    detail: "$80 per person",
    features: ["Two-person session", "Shared coaching attention", "Useful for friends, couples, or training partners"],
  },
];

export default function PricingPage() {
  return (
    <PublicSiteShell>
      <section className="px-5 py-12 sm:px-8 lg:px-10 lg:py-16">
        <div className="max-w-4xl">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-bronze-600">Pricing</p>
          <h1 className="mt-5 font-serif text-5xl font-semibold leading-[0.95] text-charcoal-950 sm:text-6xl">
            Personal training packages built around steady, focused work.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-600">
            Choose the format that best fits your schedule, training goals, and preferred level of consistency.
          </p>
        </div>
      </section>

      <section className="px-5 pb-12 sm:px-8 lg:px-10 lg:pb-16">
        <div className="grid gap-5 lg:grid-cols-3 lg:items-stretch">
          {pricingCards.map((card) => (
            <article
              key={card.name}
              className={`relative flex min-h-[34rem] flex-col overflow-hidden rounded-[1.75rem] border p-5 shadow-soft sm:p-6 lg:p-7 ${
                card.featured
                  ? "border-bronze-300 bg-charcoal-950 text-ivory-50"
                  : "border-white/70 bg-white/62 text-charcoal-950 backdrop-blur-xl"
              }`}
            >
              {card.featured ? (
                <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-bronze-400 via-bronze-200 to-sage-200" />
              ) : null}

              <div>
                <p className={`text-xs font-semibold uppercase tracking-[0.28em] ${card.featured ? "text-bronze-200" : "text-bronze-600"}`}>
                  {card.eyebrow}
                </p>
                <h2 className="mt-4 font-serif text-4xl font-semibold">{card.name}</h2>
                <p className={`mt-4 text-sm leading-7 ${card.featured ? "text-ivory-50/72" : "text-stone-600"}`}>
                  {card.description}
                </p>
              </div>

              <div className="mt-8">
                <p className="font-serif text-6xl font-semibold leading-none">{card.price}</p>
                <p className={`mt-3 text-sm ${card.featured ? "text-ivory-50/68" : "text-stone-500"}`}>
                  <span className="font-semibold">{card.cadence}</span> · {card.detail}
                </p>
              </div>

              {card.secondaryPrice ? (
                <div className="mt-5 rounded-[1.25rem] border border-white/12 bg-white/8 p-4">
                  <p className="font-serif text-4xl font-semibold">{card.secondaryPrice}</p>
                  <p className="mt-2 text-sm text-ivory-50/68">
                    <span className="font-semibold">{card.secondaryCadence}</span> · {card.secondaryDetail}
                  </p>
                </div>
              ) : null}

              <div className="mt-8 space-y-4">
                {card.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-3">
                    <CheckCircle2 className={`mt-0.5 size-5 shrink-0 ${card.featured ? "text-bronze-200" : "text-sage-700"}`} />
                    <p className={`text-sm leading-6 ${card.featured ? "text-ivory-50/78" : "text-stone-700"}`}>{feature}</p>
                  </div>
                ))}
              </div>

              <div className={`mt-auto pt-8 text-xs leading-5 ${card.featured ? "text-ivory-50/54" : "text-stone-500"}`}>
                Pricing reflects in-person training sessions with Nick Glushien Training.
              </div>
            </article>
          ))}
        </div>
      </section>
    </PublicSiteShell>
  );
}
