import { BookOpenText, Dumbbell, Shapes } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { ExerciseLibrary } from "@/components/product/exercise-library";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getTrainerExercises } from "@/lib/exercises";

export default async function ExercisesPage() {
  const { exercises, mode } = await getTrainerExercises();

  return (
    <AppShell role="trainer" title="Exercise library" subtitle="A searchable coaching library with instructions, cues, mistakes, substitutions, regressions, progressions, and demo references.">
      <div className="space-y-5">
        <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <Card className="p-7">
            <Badge variant="bronze">Movement system</Badge>
            <h2 className="mt-5 max-w-2xl font-serif text-4xl font-semibold leading-tight text-charcoal-950">Build a library that teaches movement with clarity, not noise.</h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-stone-600">
              A premium exercise library should feel like a coaching reference, not a spreadsheet. Keep cues, mistakes, and substitutions easy to scan and easy to trust.
            </p>
          </Card>
          <div className="grid gap-5 sm:grid-cols-3 xl:grid-cols-3">
            {[
              { label: "Exercise bank", value: String(exercises.length), icon: Dumbbell },
              { label: "Coach cues", value: "Rich", icon: BookOpenText },
              { label: "Variations", value: "Built in", icon: Shapes },
            ].map(({ label, value, icon: Icon }) => (
              <Card key={label} className="p-5">
                <Icon className="size-5 text-bronze-500" />
                <p className="mt-6 text-[0.66rem] uppercase tracking-[0.28em] text-stone-500">{label}</p>
                <p className="mt-2 font-serif text-4xl font-semibold text-charcoal-950">{value}</p>
              </Card>
            ))}
          </div>
        </div>
        <Card className="p-5">
          <div className="mb-5 border-b border-border pb-5">
            <p className="text-[0.66rem] uppercase tracking-[0.3em] text-bronze-600">Library workspace</p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">A clear reference system for movements, substitutions, and coaching language.</p>
          </div>
          <ExerciseLibrary initialExercises={exercises} mode={mode} />
        </Card>
      </div>
    </AppShell>
  );
}
