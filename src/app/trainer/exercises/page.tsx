import { AppShell } from "@/components/layout/app-shell";
import { ExerciseLibrary } from "@/components/product/exercise-library";
import { exercises } from "@/lib/demo-data";

export default function ExercisesPage() {
  return (
    <AppShell role="trainer" title="Exercise library" subtitle="A searchable coaching library with instructions, cues, mistakes, substitutions, regressions, progressions, and demo references.">
      <ExerciseLibrary initialExercises={exercises} />
    </AppShell>
  );
}
