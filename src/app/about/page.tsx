import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { PublicSiteShell } from "@/components/marketing/public-site-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function AboutPage() {
  return (
    <PublicSiteShell>
      <section className="py-10 lg:py-12">
        <div className="grid gap-6 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.68fr)] md:items-start md:gap-8 lg:gap-12">
          <div className="contents md:block">
            <div className="order-1">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-bronze-600">About the trainer</p>
            <h1 className="mt-5 max-w-3xl font-serif text-4xl font-semibold leading-tight text-charcoal-950 sm:text-5xl">
              Meet Nick Glushien.
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-stone-600">
              I&apos;m Nick, a personal trainer based in San Diego. My career has taken me from working at an athletic club in Boston to running my own training business.
            </p>
            <div className="mt-8">
              <Button asChild variant="warm" size="lg">
                <Link href="/pricing">View pricing <ArrowRight className="size-5" /></Link>
              </Button>
            </div>
            </div>
          <Card className="order-3 p-5 sm:p-6 lg:p-8 md:mt-8">
            <h2 id="career-heading" className="font-serif text-3xl font-semibold text-charcoal-950">My path into training.</h2>
            <div className="mt-5 grid gap-4">
              {[
                { title: "Starting at the front desk", body: "I got my start at the front desk of Beacon Hill Athletic Clubs in Boston." },
                { title: "Working throughout the club", body: "At Beacon Hill, I became a certified personal trainer and also worked as an assistant manager and group fitness instructor." },
                { title: "Continuing in San Diego", body: "In 2015, I moved to San Diego and continued working with clients as a personal trainer." },
              ].map((item, index) => (
                <div key={item.title} className="grid gap-3 border-b border-stone-200/80 pb-4 last:border-b-0 last:pb-0 sm:grid-cols-[2.5rem_1fr]">
                  <span className="text-[0.66rem] uppercase tracking-[0.24em] text-stone-400">0{index + 1}</span>
                  <div>
                    <h3 className="text-lg font-semibold text-charcoal-950">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-stone-600">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
          </div>
          <div className="contents md:block md:w-full md:max-w-[420px] md:justify-self-end">
            <div className="order-2 relative h-[360px] w-full overflow-hidden rounded-[1.75rem] border border-white/70 bg-charcoal-950 shadow-soft sm:h-[440px] sm:rounded-[2rem] md:aspect-[4/5] md:h-auto md:min-h-0">
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
              </div>
            </div>
          <Card className="order-4 p-5 sm:p-6 md:mt-5">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-bronze-600">A little about me</p>
            <h2 className="mt-4 font-serif text-3xl font-semibold text-charcoal-950">
              Family and fitness.
            </h2>
            <p className="mt-4 text-sm leading-7 text-stone-600">
              I&apos;m a husband and father of two, and I know how much it matters to be able to stay active through different stages of life. That perspective is part of what I bring to my work as a trainer.
            </p>
          </Card>
          </div>
        </div>
      </section>
    </PublicSiteShell>
  );
}
