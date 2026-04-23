import { workouts as demoWorkouts } from "@/lib/demo-data";
import { isSupabaseConfigured } from "@/lib/auth-server";
import { createClient } from "@/lib/supabase-server";
import type { Exercise, Plan, Workout, WorkoutBlock, WorkoutExercise } from "@/lib/types";

type WorkoutRow = {
  id: string;
  training_plan_id: string | null;
  name: string;
  phase_label: string | null;
  warmup: string | null;
  cooldown: string | null;
  coach_notes: string | null;
};

type WorkoutBlockRow = {
  id: string;
  workout_id: string;
  label: string;
  intent: string | null;
  position: number;
};

type WorkoutExerciseRow = {
  id: string;
  workout_block_id: string;
  exercise_id: string;
  sets: number | null;
  reps: string | null;
  tempo: string | null;
  rest_time: string | null;
  rpe_target: string | null;
  load_guidance: string | null;
  duration: string | null;
  notes: string | null;
  position: number;
};

async function getTrainerContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { supabase, trainerId: null, clientId: null };

  const [{ data: trainer }, { data: client }] = await Promise.all([
    supabase.from("trainers").select("id").eq("profile_id", user.id).maybeSingle<{ id: string }>(),
    supabase.from("clients").select("id").eq("profile_id", user.id).maybeSingle<{ id: string }>(),
  ]);

  return { supabase, trainerId: trainer?.id ?? null, clientId: client?.id ?? null };
}

function mapWorkout(
  workout: WorkoutRow,
  blocks: WorkoutBlockRow[],
  items: WorkoutExerciseRow[],
  exercisesById: Map<string, Exercise>,
): Workout {
  const mappedBlocks: WorkoutBlock[] = blocks
    .filter((block) => block.workout_id === workout.id)
    .sort((a, b) => a.position - b.position)
    .map((block) => ({
      id: block.id,
      label: block.label,
      intent: block.intent ?? "",
      exercises: items
        .filter((item) => item.workout_block_id === block.id)
        .sort((a, b) => a.position - b.position)
        .map((item) => {
          const exercise = exercisesById.get(item.exercise_id);
          return {
            id: item.id,
            exerciseId: item.exercise_id,
            name: exercise?.name ?? "Exercise",
            sets: item.sets ?? 0,
            reps: item.reps ?? "",
            tempo: item.tempo ?? "",
            rest: item.rest_time ?? "",
            rpe: item.rpe_target ?? "",
            load: item.load_guidance ?? "",
            duration: item.duration ?? undefined,
            notes: item.notes ?? "",
          } satisfies WorkoutExercise;
        }),
    }));

  return {
    id: workout.id,
    trainingPlanId: workout.training_plan_id ?? undefined,
    name: workout.name,
    dayLabel: workout.phase_label ?? "Assigned workout",
    duration: "45 min",
    warmup: workout.warmup ?? "",
    cooldown: workout.cooldown ?? "",
    coachNotes: workout.coach_notes ?? "",
    blocks: mappedBlocks,
  };
}

export async function getTrainerWorkouts() {
  if (!isSupabaseConfigured()) {
    return { mode: "demo" as const, workouts: demoWorkouts };
  }

  const { supabase, trainerId } = await getTrainerContext();
  if (!trainerId) return { mode: "supabase" as const, workouts: [] as Workout[] };

  const [{ data: workoutRows }, { data: blockRows }, { data: itemRows }, { data: exerciseRows }] = await Promise.all([
    supabase
      .from("workouts")
      .select("id, training_plan_id, name, phase_label, warmup, cooldown, coach_notes")
      .eq("trainer_id", trainerId)
      .order("created_at", { ascending: false }),
    supabase.from("workout_blocks").select("id, workout_id, label, intent, position"),
    supabase
      .from("workout_exercises")
      .select("id, workout_block_id, exercise_id, sets, reps, tempo, rest_time, rpe_target, load_guidance, duration, notes, position"),
    supabase.from("exercises").select("id, name, category, muscle_groups, equipment, movement_pattern, difficulty, instructions, coaching_cues, mistakes_to_avoid, substitutions, demo_url, is_global"),
  ]);

  const exercisesById = new Map(
    (exerciseRows ?? []).map((row: Record<string, unknown>) => [
      row.id as string,
      {
        id: row.id as string,
        name: row.name as string,
        category: (row.category as string) ?? "",
        muscleGroups: (row.muscle_groups as string[]) ?? [],
        equipment: (row.equipment as string[]) ?? [],
        pattern: (row.movement_pattern as string) ?? "General",
        difficulty:
          row.difficulty === "advanced"
            ? "Advanced"
            : row.difficulty === "intermediate"
              ? "Intermediate"
              : "Beginner",
        instructions: (row.instructions as string) ?? "",
        cues: (row.coaching_cues as string[]) ?? [],
        mistakes: (row.mistakes_to_avoid as string[]) ?? [],
        substitutions: (row.substitutions as string[]) ?? [],
        demoUrl: (row.demo_url as string) ?? "",
        tags: [],
        editable: !(row.is_global as boolean),
      } satisfies Exercise,
    ]),
  );

  const workouts = (workoutRows ?? []).map((row) =>
    mapWorkout(row as WorkoutRow, (blockRows ?? []) as WorkoutBlockRow[], (itemRows ?? []) as WorkoutExerciseRow[], exercisesById),
  );

  return { mode: "supabase" as const, workouts };
}

export async function getClientWorkouts() {
  if (!isSupabaseConfigured()) {
    return { mode: "demo" as const, workouts: demoWorkouts };
  }

  const { supabase, clientId } = await getTrainerContext();
  if (!clientId) return { mode: "supabase" as const, workouts: [] as Workout[] };

  const { data: assignments } = await supabase
    .from("plan_assignments")
    .select("training_plan_id")
    .eq("client_id", clientId)
    .eq("status", "active");

  const planIds = (assignments ?? []).map((row: { training_plan_id: string }) => row.training_plan_id);
  if (!planIds.length) return { mode: "supabase" as const, workouts: [] as Workout[] };

  const [{ data: workoutRows }, { data: blockRows }, { data: itemRows }, { data: exerciseRows }] = await Promise.all([
    supabase
      .from("workouts")
      .select("id, training_plan_id, name, phase_label, warmup, cooldown, coach_notes")
      .in("training_plan_id", planIds)
      .order("created_at", { ascending: false }),
    supabase.from("workout_blocks").select("id, workout_id, label, intent, position"),
    supabase
      .from("workout_exercises")
      .select("id, workout_block_id, exercise_id, sets, reps, tempo, rest_time, rpe_target, load_guidance, duration, notes, position"),
    supabase.from("exercises").select("id, name, category, muscle_groups, equipment, movement_pattern, difficulty, instructions, coaching_cues, mistakes_to_avoid, substitutions, demo_url, is_global"),
  ]);

  const exercisesById = new Map(
    (exerciseRows ?? []).map((row: Record<string, unknown>) => [
      row.id as string,
      {
        id: row.id as string,
        name: row.name as string,
        category: (row.category as string) ?? "",
        muscleGroups: (row.muscle_groups as string[]) ?? [],
        equipment: (row.equipment as string[]) ?? [],
        pattern: (row.movement_pattern as string) ?? "General",
        difficulty:
          row.difficulty === "advanced"
            ? "Advanced"
            : row.difficulty === "intermediate"
              ? "Intermediate"
              : "Beginner",
        instructions: (row.instructions as string) ?? "",
        cues: (row.coaching_cues as string[]) ?? [],
        mistakes: (row.mistakes_to_avoid as string[]) ?? [],
        substitutions: (row.substitutions as string[]) ?? [],
        demoUrl: (row.demo_url as string) ?? "",
        tags: [],
      } satisfies Exercise,
    ]),
  );

  const workouts = (workoutRows ?? []).map((row) =>
    mapWorkout(row as WorkoutRow, (blockRows ?? []) as WorkoutBlockRow[], (itemRows ?? []) as WorkoutExerciseRow[], exercisesById),
  );

  return { mode: "supabase" as const, workouts };
}

export async function getClientWorkoutById(id: string) {
  const { workouts } = await getClientWorkouts();
  return workouts.find((workout) => workout.id === id) ?? null;
}

export async function getTrainerPlanOptions() {
  if (!isSupabaseConfigured()) {
    return { plans: [] as Array<Pick<Plan, "id" | "title">> };
  }

  const { supabase, trainerId } = await getTrainerContext();
  if (!trainerId) return { plans: [] as Array<Pick<Plan, "id" | "title">> };

  const { data } = await supabase
    .from("training_plans")
    .select("id, title")
    .eq("trainer_id", trainerId)
    .order("created_at", { ascending: false });

  return { plans: (data ?? []) as Array<Pick<Plan, "id" | "title">> };
}
