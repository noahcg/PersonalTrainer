import { CheckCircle2 } from "lucide-react";
import { PublicSiteShell } from "@/components/marketing/public-site-shell";
import { offeringCatalog } from "@/lib/offering-catalog";

const presentation = {
  "once-weekly": {
    eyebrow: "Monthly coaching",
    title: "Monthly Personal Training & Coaching",
    description: "Build strength, move with more confidence, and know exactly what to do between training sessions. I’ll build your plan around your goals, your schedule, and the equipment you have access to.",
    frequency: "1x / week",
    features: (sessions: number) => [
      { title: `${sessions} private, in-person training sessions.`, detail: "I come to you, bring the equipment we need, and coach you through each session." },
      { title: "2 custom written workouts.", detail: "You’ll have clear instructions for two workouts you can do on your own between our sessions." },
      { title: "Online coaching throughout the month.", detail: "I’ll help you stay on track, answer training questions, and adjust your workouts as needed." },
    ],
    fit: "A good fit if you want regular hands-on coaching and a clear plan for the days you train on your own.",
  },
  "twice-weekly": {
    eyebrow: "Build momentum",
    title: "Twice a Week",
    description: "Train together more often and build a consistent rhythm with one-on-one coaching focused on your goals.",
    frequency: "2x / week",
    features: (sessions: number) => [
      { title: `${sessions} private, in-person training sessions.`, detail: "I come to you and coach you through focused, one-on-one sessions." },
      { title: "Training shaped around you.", detail: "We’ll work with your goals, experience, and the equipment available to you." },
      { title: "More hands-on coaching.", detail: "With two sessions a week, we have more time together to build your strength and confidence." },
    ],
    fit: "A good fit if you want more frequent in-person coaching and a steady weekly routine.",
  },
  "partner-monthly": {
    eyebrow: "Shared session",
    title: "Partner Training",
    description: "Train alongside a partner with coaching that helps you both build strength and stay consistent together.",
    frequency: "Shared training",
    features: (sessions: number) => [
      { title: `${sessions} shared, in-person training sessions.`, detail: "You and your partner train together with me there to guide each session." },
      { title: "Coaching for both of you.", detail: "You’ll each receive equal attention as we work through the session together." },
      { title: "Training at home.", detail: "I’ll come to you so you can train together in a familiar space." },
    ],
    fit: "A good fit for friends, couples, or training partners who want to work toward their goals together.",
  },
} as const;

const displayOrder = ["twice-weekly", "once-weekly", "partner-monthly"] as const;
const formatPrice = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);

export default function PricingPage() {
  return (
    <PublicSiteShell>
      <section className="py-12 lg:py-16">
        <div className="max-w-4xl">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-bronze-600">Pricing</p>
          <h1 className="mt-5 font-serif text-4xl font-semibold leading-tight text-charcoal-950 sm:text-5xl">
            Personal training packages built around steady, focused work.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-600">
            Choose the training rhythm that fits your goals, your schedule, and the way you like to work.
          </p>
        </div>
      </section>

      <section className="pb-12 lg:pb-16" aria-label="Training packages">
        <div className="grid gap-5 lg:grid-cols-3 lg:grid-rows-[repeat(6,auto)] lg:gap-x-5 lg:gap-y-0">
          {displayOrder.map((id) => {
            const offer = offeringCatalog.find((item) => item.id === id)!;
            const content = presentation[id];
            const featured = id === "once-weekly";
            const partner = offer.kind === "partner_training";
            return (
              <article key={offer.id} className={`relative flex min-h-[32rem] flex-col overflow-hidden rounded-[1.75rem] border p-6 shadow-soft lg:row-span-6 lg:grid lg:grid-rows-subgrid lg:p-7 ${featured ? "border-bronze-300 bg-charcoal-950 text-ivory-50" : "border-white/70 bg-white/62 text-charcoal-950 backdrop-blur-xl"}`}>
                {featured ? <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-bronze-400 via-bronze-200 to-sage-200" /> : null}
                <p className={`text-xs font-semibold uppercase tracking-[0.28em] ${featured ? "text-bronze-200" : "text-bronze-600"}`}>{content.eyebrow}</p>
                <h2 className={`mt-4 font-serif font-semibold ${featured ? "text-3xl leading-tight" : "text-4xl"}`}>{content.title}</h2>
                <p className={`mt-4 text-sm leading-7 ${featured ? "text-ivory-50/72" : "text-stone-600"}`}>{content.description}</p>
                <div className="mt-8">
                  <p className="font-serif text-6xl font-semibold leading-none">{formatPrice(partner ? offer.priceCents / 2 : offer.priceCents)}</p>
                  <p className={`mt-3 text-sm ${featured ? "text-ivory-50/68" : "text-stone-500"}`}>
                    <span className="font-semibold">{partner ? "per person / month" : "per month"}</span> · {content.frequency}
                  </p>
                  <p className={`mt-2 text-sm ${featured ? "text-ivory-50/78" : "text-stone-600"}`}>
                    {offer.sessionCount} {partner ? "shared " : ""}one-hour sessions per month{partner ? ` · ${formatPrice(offer.priceCents)} combined` : ""}
                  </p>
                </div>
                <ul className="mt-8 space-y-4">
                  {content.features(offer.sessionCount).map((feature) => (
                    <li key={feature.title} className="flex items-start gap-3">
                      <CheckCircle2 aria-hidden="true" className={`mt-0.5 size-5 shrink-0 ${featured ? "text-bronze-200" : "text-sage-700"}`} />
                      <span className={`text-sm leading-6 ${featured ? "text-ivory-50/78" : "text-stone-700"}`}><strong className={`font-semibold ${featured ? "text-ivory-50" : "text-charcoal-950"}`}>{feature.title}</strong> {feature.detail}</span>
                    </li>
                  ))}

                </ul>
                <p className={`mt-8 text-sm leading-6 ${featured ? "text-ivory-50/72" : "text-stone-600"}`}>{content.fit}</p>
              </article>
            );
          })}
        </div>
      </section>

    </PublicSiteShell>
  );
}
