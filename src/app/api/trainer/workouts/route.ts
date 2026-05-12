import { NextResponse } from "next/server";
import { createAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase-server";

type WorkoutExercisePayload = {
  exerciseId?: string;
  name?: string;
  sets?: number;
  reps?: string;
  tempo?: string;
  rest?: string;
  rpe?: string;
  load?: string;
  duration?: string;
  notes?: string;
};

type WorkoutBlockPayload = {
  label?: string;
  intent?: string;
  exercises?: WorkoutExercisePayload[];
};

type WorkoutPayload = {
  id?: string | null;
  trainingPlanId?: string | null;
  name?: string;
  duration?: string;
  coachNotes?: string;
  blocks?: WorkoutBlockPayload[];
};

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeBlocks(payload: WorkoutPayload) {
  return (payload.blocks ?? []).map((block) => ({
    label: clean(block.label),
    intent: clean(block.intent),
    exercises: (block.exercises ?? [])
      .filter((exercise) => clean(exercise.exerciseId))
      .map((exercise) => ({
        exercise_id: clean(exercise.exerciseId),
        name: clean(exercise.name),
        sets: typeof exercise.sets === "number" && Number.isFinite(exercise.sets) ? Math.max(Math.round(exercise.sets), 0) : null,
        reps: clean(exercise.reps) || null,
        tempo: clean(exercise.tempo) || null,
        rest_time: clean(exercise.rest) || null,
        rpe_target: clean(exercise.rpe) || null,
        load_guidance: clean(exercise.load) || null,
        duration: clean(exercise.duration) || null,
        notes: clean(exercise.notes) || null,
      })),
  }));
}

function sectionText(blocks: ReturnType<typeof normalizeBlocks>, label: string) {
  return blocks.find((block) => block.label === label)?.exercises.map((exercise) => exercise.name || exercise.exercise_id).join(", ") ?? "";
}

export async function POST(request: Request) {
  try {
    if (!hasSupabaseAdminEnv()) {
      return NextResponse.json({ error: "Supabase admin credentials are not configured." }, { status: 500 });
    }

    const payload = (await request.json()) as WorkoutPayload;
    const name = clean(payload.name);
    const blocks = normalizeBlocks(payload);

    if (!name) return NextResponse.json({ error: "Add a workout name before saving." }, { status: 400 });
    if (blocks.length !== 5 || blocks.some((block) => !block.label || !block.exercises.length)) {
      return NextResponse.json({ error: "Complete warm up, all three sections, and cooldown before saving." }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const { data: trainer } = await supabase
      .from("trainers")
      .select("id")
      .eq("profile_id", user.id)
      .maybeSingle<{ id: string }>();

    if (!trainer?.id) return NextResponse.json({ error: "Trainer profile not found." }, { status: 403 });

    const admin = createAdminClient();
    const workoutId = clean(payload.id);
    const trainingPlanId = clean(payload.trainingPlanId);

    if (trainingPlanId) {
      const { data: plan, error: planError } = await admin
        .from("training_plans")
        .select("id")
        .eq("id", trainingPlanId)
        .eq("trainer_id", trainer.id)
        .maybeSingle<{ id: string }>();

      if (planError) return NextResponse.json({ error: planError.message }, { status: 500 });
      if (!plan) return NextResponse.json({ error: "Linked plan was not found for this trainer." }, { status: 404 });
    }

    const mutation = {
      trainer_id: trainer.id,
      training_plan_id: trainingPlanId || null,
      name,
      phase_label: "Template workout",
      warmup: sectionText(blocks, "Warm Up"),
      cooldown: sectionText(blocks, "Cooldown"),
      coach_notes: clean(payload.coachNotes) || null,
      updated_at: new Date().toISOString(),
    };

    let savedWorkoutId = workoutId;

    if (workoutId) {
      const { data: workout, error: workoutLookupError } = await admin
        .from("workouts")
        .select("id")
        .eq("id", workoutId)
        .eq("trainer_id", trainer.id)
        .maybeSingle<{ id: string }>();

      if (workoutLookupError) return NextResponse.json({ error: workoutLookupError.message }, { status: 500 });
      if (!workout) return NextResponse.json({ error: "Workout not found." }, { status: 404 });

      const { error: updateError } = await admin.from("workouts").update(mutation).eq("id", workoutId).eq("trainer_id", trainer.id);
      if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

      const { data: existingBlocks, error: blockLookupError } = await admin.from("workout_blocks").select("id").eq("workout_id", workoutId);
      if (blockLookupError) return NextResponse.json({ error: blockLookupError.message }, { status: 500 });

      const existingBlockIds = (existingBlocks ?? []).map((block) => block.id);
      if (existingBlockIds.length) {
        const { error: exerciseDeleteError } = await admin.from("workout_exercises").delete().in("workout_block_id", existingBlockIds);
        if (exerciseDeleteError) return NextResponse.json({ error: exerciseDeleteError.message }, { status: 500 });

        const { error: blockDeleteError } = await admin.from("workout_blocks").delete().eq("workout_id", workoutId);
        if (blockDeleteError) return NextResponse.json({ error: blockDeleteError.message }, { status: 500 });
      }
    } else {
      const { data: inserted, error: insertError } = await admin
        .from("workouts")
        .insert(mutation)
        .select("id")
        .single<{ id: string }>();

      if (insertError || !inserted?.id) {
        return NextResponse.json({ error: insertError?.message ?? "Unable to create workout." }, { status: 500 });
      }

      savedWorkoutId = inserted.id;
    }

    for (const [blockIndex, block] of blocks.entries()) {
      const { data: insertedBlock, error: blockError } = await admin
        .from("workout_blocks")
        .insert({
          workout_id: savedWorkoutId,
          label: block.label,
          intent: block.intent || null,
          position: blockIndex,
        })
        .select("id")
        .single<{ id: string }>();

      if (blockError || !insertedBlock?.id) {
        return NextResponse.json({ error: blockError?.message ?? "Unable to save workout section." }, { status: 500 });
      }

      const { error: exerciseError } = await admin.from("workout_exercises").insert(
        block.exercises.map((exercise, exerciseIndex) => ({
          workout_block_id: insertedBlock.id,
          exercise_id: exercise.exercise_id,
          position: exerciseIndex,
          sets: exercise.sets,
          reps: exercise.reps,
          tempo: exercise.tempo,
          rest_time: exercise.rest_time,
          rpe_target: exercise.rpe_target,
          load_guidance: exercise.load_guidance,
          duration: exercise.duration,
          notes: exercise.notes,
        })),
      );

      if (exerciseError) {
        return NextResponse.json({ error: exerciseError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true, id: savedWorkoutId });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to save workout." },
      { status: 500 },
    );
  }
}
