import { exercises as demoExercises } from "@/lib/demo-data";
import { isSupabaseConfigured } from "@/lib/auth-server";
import { createClient } from "@/lib/supabase-server";
import type { Exercise } from "@/lib/types";

type ExerciseRow = {
  id: string;
  trainer_id: string | null;
  is_global: boolean;
  name: string;
  category: string;
  muscle_groups: string[];
  equipment: string[];
  movement_pattern: string | null;
  difficulty: "beginner" | "intermediate" | "advanced";
  instructions: string | null;
  coaching_cues: string[];
  mistakes_to_avoid: string[];
  substitutions: string[];
  demo_url: string | null;
  exercise_tags?: { tag: string }[] | null;
};

export function fromExerciseRow(row: ExerciseRow): Exercise {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    muscleGroups: row.muscle_groups ?? [],
    equipment: row.equipment ?? [],
    pattern: row.movement_pattern ?? "General",
    difficulty:
      row.difficulty === "advanced"
        ? "Advanced"
        : row.difficulty === "intermediate"
          ? "Intermediate"
          : "Beginner",
    instructions: row.instructions ?? "",
    cues: row.coaching_cues ?? [],
    mistakes: row.mistakes_to_avoid ?? [],
    substitutions: row.substitutions ?? [],
    demoUrl: row.demo_url ?? "",
    tags: row.exercise_tags?.map((tag) => tag.tag) ?? [],
    editable: !row.is_global,
  };
}

export async function getTrainerExercises() {
  if (!isSupabaseConfigured()) {
    return {
      mode: "demo" as const,
      exercises: demoExercises,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { mode: "supabase" as const, exercises: [] as Exercise[] };
  }

  const { data: trainer } = await supabase
    .from("trainers")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle<{ id: string }>();

  const trainerId = trainer?.id ?? null;

  const { data } = await supabase
    .from("exercises")
    .select(
      "id, trainer_id, is_global, name, category, muscle_groups, equipment, movement_pattern, difficulty, instructions, coaching_cues, mistakes_to_avoid, substitutions, demo_url, exercise_tags(tag)",
    )
    .or(trainerId ? `is_global.eq.true,trainer_id.eq.${trainerId}` : "is_global.eq.true")
    .order("created_at", { ascending: false });

  return {
    mode: "supabase" as const,
    exercises: (data ?? []).map((row) => fromExerciseRow(row as ExerciseRow)),
  };
}
