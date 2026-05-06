import Link from "next/link";
import Image from "next/image";
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

export default function AboutPage() {
  return (
    <PublicSiteShell>
      <section className="py-12 lg:py-16">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.68fr)] md:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-bronze-600">About the trainer</p>
            <h1 className="mt-5 max-w-3xl font-serif text-4xl font-semibold leading-tight text-charcoal-950 sm:text-5xl">
              Calm, precise personal training built around real progress.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-600">
              Nick works with people who want to feel stronger, steadier, and more capable without being forced into
              a gym routine that does not fit their life. Most sessions happen in the client&apos;s home, with training
              shaped around the space, equipment, energy, and starting point they actually have.
            </p>
            <p className="mt-5 max-w-2xl text-base leading-8 text-stone-600">
              He often works with adults who want to feel more capable in everyday life, including clients navigating
              stiffness, changing mobility, previous aches, or the simple reality that training needs to respect where
              their body is right now. Sessions are designed to build strength with patience and intent, not pressure.
            </p>
            <p className="mt-5 max-w-2xl text-base leading-8 text-stone-600">
              The goal is not to chase a one-size-fits-all workout. It is to create a plan that helps someone move
              better, trust their body more, and make progress at a pace that actually fits their life.
            </p>
          </div>
          <div className="grid min-w-0 gap-5 md:w-full md:max-w-[420px] md:justify-self-end">
            <div className="relative h-[360px] w-full overflow-hidden rounded-[1.75rem] border border-white/70 bg-charcoal-950 shadow-soft sm:h-[440px] sm:rounded-[2rem] md:aspect-[4/5] md:h-auto md:min-h-0">
              <Image
                src="/images/NickGlushien.PNG"
                alt="Nick Glushien"
                fill
                className="object-cover object-[center_18%] sm:object-[center_22%] md:object-center"
                sizes="(max-width: 767px) 100vw, 420px"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-charcoal-950/68 via-charcoal-950/5 to-transparent" />
              <div className="absolute bottom-5 left-5 right-5">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-bronze-200">Nick Glushien</p>
                <p className="mt-2 max-w-sm text-sm leading-6 text-ivory-50/72">Personal training built around clear movement, practical strength, and steady accountability.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="pb-12">
        <div className="grid gap-5 lg:grid-cols-3">
          {principles.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.title} className="p-5 sm:p-6">
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

      <section className="pb-12 lg:pb-16">
        <div className="relative overflow-hidden rounded-[1.75rem] border border-bronze-300 bg-charcoal-950 p-5 text-ivory-50 shadow-soft sm:p-6 lg:p-8">
          <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-bronze-400 via-bronze-200 to-sage-200" />
          <div className="grid gap-8 lg:grid-cols-[0.72fr_1fr] lg:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-bronze-200">How coaching works</p>
              <h2 className="mt-4 font-serif text-4xl font-semibold leading-tight">A process that starts where you are.</h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-ivory-50/70">
                Training begins with the client&apos;s real life: home setup, schedule, movement comfort, and what they
                want to feel more confident doing day to day.
              </p>
              <div className="mt-6">
                <Button asChild variant="warm" size="lg">
                  <Link href="/pricing">
                    View pricing <ArrowRight className="size-5" />
                  </Link>
                </Button>
              </div>
            </div>
            <div className="grid gap-4">
              {[
                {
                  title: "Understand the starting point",
                  body: "Talk through goals, schedule, health history, mobility concerns, available space, and what feels realistic right now.",
                },
                {
                  title: "Build the right first plan",
                  body: "Create sessions that match the client&apos;s current ability, equipment, confidence, and preferred training environment.",
                },
                {
                  title: "Adjust with real feedback",
                  body: "Progress the plan over time based on comfort, recovery, consistency, and the practical wins that matter outside the session.",
                },
              ].map((item, index) => (
                <div key={item.title} className="rounded-[1.35rem] border border-white/12 bg-white/8 p-4 sm:p-5">
                  <div className="flex items-start gap-4">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full border border-bronze-200/50 text-sm font-semibold text-bronze-200">
                      0{index + 1}
                    </span>
                    <div>
                      <h3 className="text-lg font-semibold text-ivory-50">{item.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-ivory-50/68">{item.body}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </PublicSiteShell>
  );
}
