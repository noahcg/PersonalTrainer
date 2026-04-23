import Link from "next/link";
import { ArrowRight, CheckCircle2, Dumbbell, MessageCircle, Sparkles, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function Home() {
  return (
    <main suppressHydrationWarning className="min-h-screen px-5 py-6">
      <section className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-7xl overflow-hidden rounded-[2.75rem] border border-white/70 bg-white/55 shadow-soft backdrop-blur-xl lg:grid-cols-[1.05fr_0.95fr]">
        <div className="flex flex-col justify-between p-6 sm:p-10 lg:p-14">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-2xl bg-charcoal-950 text-ivory-50">
              <Sparkles className="size-5 text-bronze-200" />
            </div>
            <div>
              <p className="font-serif text-3xl font-semibold leading-none">Aurelian Coach</p>
              <p className="text-sm text-stone-500">Personal training, refined.</p>
            </div>
          </div>

          <div className="py-16">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-bronze-600">Premium coaching operations</p>
            <h1 className="mt-5 max-w-4xl font-serif text-6xl font-semibold leading-[0.92] tracking-tight text-charcoal-950 sm:text-7xl lg:text-8xl">
              Client management that feels like a private studio.
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-stone-600">
              Build plans, guide workouts, track progress, review check-ins, and keep clients supported from a calm,
              native-quality coaching workspace.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" variant="warm">
                <Link href="/trainer/dashboard">
                  Open trainer demo <ArrowRight className="size-5" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href="/client/home">Open client demo</Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-3 text-sm text-stone-600 sm:grid-cols-3">
            {["Supabase Auth + RLS ready", "Seeded Postgres schema", "Vercel deployable"].map((item) => (
              <div key={item} className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-sage-500" />
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="relative hidden bg-charcoal-950 p-8 text-ivory-50 lg:block">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_40%_0%,rgba(200,141,74,.28),transparent_28rem)]" />
          <div className="relative grid h-full content-center gap-5">
            <Card className="ml-10 bg-white/10 p-5 text-ivory-50 ring-1 ring-white/10">
              <p className="text-sm text-ivory-50/60">Today’s adherence</p>
              <p className="mt-4 font-serif text-6xl font-semibold">91%</p>
              <p className="mt-3 text-sm text-ivory-50/60">Mara completed Lower Strength A with a new controlled RDL best.</p>
            </Card>
            <div className="grid grid-cols-2 gap-5">
              <Card className="bg-white/10 p-5 text-ivory-50 ring-1 ring-white/10">
                <Dumbbell className="size-5 text-bronze-200" />
                <p className="mt-8 text-3xl font-semibold">8</p>
                <p className="text-sm text-ivory-50/55">workouts scheduled</p>
              </Card>
              <Card className="bg-white/10 p-5 text-ivory-50 ring-1 ring-white/10">
                <MessageCircle className="size-5 text-sage-200" />
                <p className="mt-8 text-3xl font-semibold">3</p>
                <p className="text-sm text-ivory-50/55">check-ins to review</p>
              </Card>
            </div>
            <Card className="mr-12 bg-white/10 p-5 text-ivory-50 ring-1 ring-white/10">
              <TrendingUp className="size-5 text-bronze-200" />
              <p className="mt-3 text-xl font-semibold">Progress signal</p>
              <p className="mt-2 text-sm leading-6 text-ivory-50/60">Sleep trending up for 3 clients after habit reminder sequence.</p>
            </Card>
          </div>
        </div>
      </section>
    </main>
  );
}
