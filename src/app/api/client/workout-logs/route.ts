import { NextResponse } from "next/server";
import { createAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase-server";

type SetEntryPayload = {
  exerciseId?: string;
  setNumber?: number;
  reps?: string;
  weight?: string;
  durationMinutes?: string;
  distance?: string;
  notes?: string;
  completed?: boolean;
};

type WorkoutLogPayload = {
  workoutId?: string;
  feedback?: string;
  perceivedEffort?: number | null;
  status?: "in_progress" | "completed";
  sets?: SetEntryPayload[];
};

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function parsePositiveNumber(value: string) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : Number.NaN;
}

function parseNonNegativeNumber(value: string) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : Number.NaN;
}

function normalizeSets(sets: SetEntryPayload[]) {
  return sets
    .map((set) => {
      const exerciseId = clean(set.exerciseId);
      const setNumber = typeof set.setNumber === "number" ? Math.round(set.setNumber) : 0;
      const reps = parsePositiveNumber(clean(set.reps));
      const weight = parseNonNegativeNumber(clean(set.weight));
      const durationMinutes = parsePositiveNumber(clean(set.durationMinutes));
      const distance = parsePositiveNumber(clean(set.distance));

      return {
        workout_exercise_id: exerciseId,
        set_number: setNumber,
        reps,
        weight,
        duration_seconds: durationMinutes === null || Number.isNaN(durationMinutes) ? durationMinutes : Math.round(durationMinutes * 60),
        distance,
        notes: clean(set.notes) || null,
        completed: Boolean(set.completed),
      };
    })
    .filter((set) => set.workout_exercise_id && set.set_number > 0);
}

export async function POST(request: Request) {
  try {
    if (!hasSupabaseAdminEnv()) {
      return NextResponse.json({ error: "Supabase admin credentials are not configured." }, { status: 500 });
    }

    const payload = (await request.json()) as WorkoutLogPayload;
    const workoutId = clean(payload.workoutId);
    const status = payload.status === "completed" ? "completed" : "in_progress";
    const feedback = clean(payload.feedback);
    const perceivedEffort = payload.perceivedEffort ?? null;

    if (!workoutId) return NextResponse.json({ error: "Workout not found." }, { status: 400 });
    if (perceivedEffort !== null && (!Number.isInteger(perceivedEffort) || perceivedEffort < 1 || perceivedEffort > 10)) {
      return NextResponse.json({ error: "Effort must be a whole number from 1 to 10." }, { status: 400 });
    }

    const sets = normalizeSets(payload.sets ?? []);
    if (sets.some((set) => Number.isNaN(set.reps) || Number.isNaN(set.weight) || Number.isNaN(set.duration_seconds) || Number.isNaN(set.distance))) {
      return NextResponse.json({ error: "Set reps, weight, duration, and distance must be valid numbers." }, { status: 400 });
    }
    if (status === "completed" && (!sets.length || sets.some((set) => !set.completed || (set.reps === null && set.duration_seconds === null && set.distance === null)))) {
      return NextResponse.json({ error: "Log each exercise before completing the workout." }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const { data: client } = await supabase
      .from("clients")
      .select("id")
      .eq("profile_id", user.id)
      .maybeSingle<{ id: string }>();

    if (!client?.id) return NextResponse.json({ error: "Client profile not found." }, { status: 404 });

    const admin = createAdminClient();
    const { data: workout, error: workoutError } = await admin
      .from("workouts")
      .select("id, training_plan_id")
      .eq("id", workoutId)
      .maybeSingle<{ id: string; training_plan_id: string | null }>();

    if (workoutError) return NextResponse.json({ error: workoutError.message }, { status: 500 });
    if (!workout) return NextResponse.json({ error: "Workout not found." }, { status: 404 });

    let assignmentId: string | null = null;
    let directAssignmentId: string | null = null;
    if (workout.training_plan_id) {
      const { data: assignment, error: assignmentError } = await admin
        .from("plan_assignments")
        .select("id")
        .eq("client_id", client.id)
        .eq("training_plan_id", workout.training_plan_id)
        .eq("status", "active")
        .order("assigned_at", { ascending: false })
        .limit(1)
        .maybeSingle<{ id: string }>();

      if (assignmentError) return NextResponse.json({ error: assignmentError.message }, { status: 500 });
      assignmentId = assignment?.id ?? null;
    }

    const { data: directAssignment, error: directAssignmentError } = await admin
      .from("workout_assignments")
      .select("id")
      .eq("client_id", client.id)
      .eq("workout_id", workoutId)
      .eq("status", "active")
      .order("assigned_at", { ascending: false })
      .limit(1)
      .maybeSingle<{ id: string }>();

    if (directAssignmentError) return NextResponse.json({ error: directAssignmentError.message }, { status: 500 });
    directAssignmentId = directAssignment?.id ?? null;

    if (!assignmentId && !directAssignmentId) {
      return NextResponse.json({ error: "This workout is not assigned to your account." }, { status: 403 });
    }

    const now = new Date().toISOString();
    const { data: existingLog, error: existingLogError } = await admin
      .from("workout_logs")
      .select("id")
      .eq("client_id", client.id)
      .eq("workout_id", workoutId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<{ id: string }>();

    if (existingLogError) return NextResponse.json({ error: existingLogError.message }, { status: 500 });

    let logId = existingLog?.id ?? null;
    const logMutation = {
      client_id: client.id,
      workout_id: workoutId,
      plan_assignment_id: assignmentId,
      started_at: now,
      status,
      feedback: feedback || null,
      perceived_effort: perceivedEffort,
      completed_at: status === "completed" ? now : null,
    };

    if (logId) {
      const { error: updateError } = await admin
        .from("workout_logs")
        .update({
          plan_assignment_id: assignmentId,
          status,
          feedback: feedback || null,
          perceived_effort: perceivedEffort,
          completed_at: status === "completed" ? now : null,
        })
        .eq("id", logId)
        .eq("client_id", client.id);
      if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
    } else {
      const { data: insertedLog, error: insertError } = await admin
        .from("workout_logs")
        .insert(logMutation)
        .select("id")
        .single<{ id: string }>();
      if (insertError || !insertedLog?.id) {
        return NextResponse.json({ error: insertError?.message ?? "Unable to create workout log." }, { status: 500 });
      }
      logId = insertedLog.id;
    }

    const { error: deleteError } = await admin.from("set_logs").delete().eq("workout_log_id", logId);
    if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });

    if (sets.length) {
      const { error: setInsertError } = await admin.from("set_logs").insert(
        sets.map((set) => ({
          ...set,
          workout_log_id: logId,
        })),
      );
      if (setInsertError) return NextResponse.json({ error: setInsertError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, logId, completedAt: status === "completed" ? now : null });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to save workout log." },
      { status: 500 },
    );
  }
}
