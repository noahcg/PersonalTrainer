import { NextResponse } from "next/server";
import { createAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase-server";

type AssignClientWorkoutBody = {
  workoutId?: string;
  scheduledFor?: string;
  dueOn?: string;
  notes?: string;
};

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanDate(value: unknown) {
  const date = clean(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "";
}

export async function POST(request: Request, context: RouteContext<"/api/trainer/clients/[id]/workout-assignments">) {
  try {
    if (!hasSupabaseAdminEnv()) {
      return NextResponse.json({ error: "Supabase admin credentials are not configured." }, { status: 500 });
    }

    const { id: clientId } = await context.params;
    const { workoutId, scheduledFor, dueOn, notes } = (await request.json()) as AssignClientWorkoutBody;
    const selectedWorkoutId = clean(workoutId);
    const availableOn = cleanDate(scheduledFor);
    const completeBy = cleanDate(dueOn);

    if (!selectedWorkoutId) return NextResponse.json({ error: "Workout id is required." }, { status: 400 });
    if (!availableOn && !completeBy) {
      return NextResponse.json({ error: "Set an available date or completion deadline." }, { status: 400 });
    }
    if (availableOn && completeBy && completeBy < availableOn) {
      return NextResponse.json({ error: "Completion deadline cannot be before the available date." }, { status: 400 });
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
    const [{ data: client, error: clientError }, { data: workout, error: workoutError }] = await Promise.all([
      admin
        .from("clients")
        .select("id, status")
        .eq("id", clientId)
        .eq("trainer_id", trainer.id)
        .maybeSingle<{ id: string; status: string }>(),
      admin
        .from("workouts")
        .select("id")
        .eq("id", selectedWorkoutId)
        .eq("trainer_id", trainer.id)
        .maybeSingle<{ id: string }>(),
    ]);

    if (clientError) return NextResponse.json({ error: clientError.message }, { status: 500 });
    if (workoutError) return NextResponse.json({ error: workoutError.message }, { status: 500 });
    if (!client) return NextResponse.json({ error: "Client not found." }, { status: 404 });
    if (!workout) return NextResponse.json({ error: "Workout not found." }, { status: 404 });
    if (client.status === "archived") {
      return NextResponse.json({ error: "Inactive clients cannot receive workout assignments." }, { status: 400 });
    }

    const today = new Date().toISOString().slice(0, 10);
    const { error: deactivateError } = await admin
      .from("workout_assignments")
      .update({ status: "inactive", ends_on: today })
      .eq("client_id", client.id)
      .eq("workout_id", workout.id)
      .eq("status", "active");

    if (deactivateError) return NextResponse.json({ error: deactivateError.message }, { status: 500 });

    const { data: inserted, error: insertError } = await admin
      .from("workout_assignments")
      .insert({
        workout_id: workout.id,
        client_id: client.id,
        assigned_by_trainer_id: trainer.id,
        assigned_on: today,
        scheduled_for: availableOn || today,
        due_on: completeBy || null,
        assignment_notes: clean(notes) || null,
        ends_on: null,
        status: "active",
      })
      .select("id")
      .single<{ id: string }>();

    if (insertError || !inserted?.id) {
      return NextResponse.json({ error: insertError?.message ?? "Unable to assign workout." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, assignmentId: inserted.id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to assign workout." },
      { status: 500 },
    );
  }
}
