import { AppShell } from "@/components/layout/app-shell";
import { ExerciseLibrary } from "@/components/product/exercise-library";
import { getTrainerExercises } from "@/lib/exercises";

export default async function ExercisesPage() {
  const { exercises, mode } = await getTrainerExercises();

  return (
    <AppShell role="trainer" title="Exercise library" subtitle="A searchable coaching library with instructions, cues, mistakes, substitutions, regressions, progressions, and demo references.">
      <ExerciseLibrary initialExercises={exercises} mode={mode} />
    </AppShell>
  );
}
