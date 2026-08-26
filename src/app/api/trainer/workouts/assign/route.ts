import { NextResponse } from "next/server";
import { createAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase-server";

type AssignWorkoutBody = {
  workoutId?: string;
  clientIds?: string[];
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

export async function POST(request: Request) {
  try {
    if (!hasSupabaseAdminEnv()) {
      return NextResponse.json({ error: "Supabase admin credentials are not configured." }, { status: 500 });
    }

    const { workoutId, clientIds = [], scheduledFor, dueOn, notes } = (await request.json()) as AssignWorkoutBody;
    const selectedClientIds = Array.from(new Set(clientIds.map(clean).filter(Boolean)));
    const selectedWorkoutId = clean(workoutId);
    const availableOn = cleanDate(scheduledFor);
    const completeBy = cleanDate(dueOn);

    if (!selectedWorkoutId) {
      return NextResponse.json({ error: "Workout id is required." }, { status: 400 });
    }
    if (selectedClientIds.length && !availableOn && !completeBy) {
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
    const { data: workout, error: workoutError } = await admin
      .from("workouts")
      .select("id")
      .eq("id", selectedWorkoutId)
      .eq("trainer_id", trainer.id)
      .maybeSingle<{ id: string }>();

    if (workoutError) return NextResponse.json({ error: workoutError.message }, { status: 500 });
    if (!workout) return NextResponse.json({ error: "Workout not found." }, { status: 404 });

    if (selectedClientIds.length) {
      const { data: clients, error: clientsError } = await admin
        .from("clients")
        .select("id, status")
        .eq("trainer_id", trainer.id)
        .in("id", selectedClientIds);

      if (clientsError) return NextResponse.json({ error: clientsError.message }, { status: 500 });
      if ((clients ?? []).length !== selectedClientIds.length) {
        return NextResponse.json({ error: "One or more selected clients were not found." }, { status: 404 });
      }
      if ((clients ?? []).some((client) => client.status === "archived")) {
        return NextResponse.json({ error: "Inactive clients cannot receive workout assignments." }, { status: 400 });
      }
    }

    const today = new Date().toISOString().slice(0, 10);
    let deactivateQuery = admin
      .from("workout_assignments")
      .update({ status: "inactive", ends_on: today })
      .eq("workout_id", selectedWorkoutId)
      .eq("status", "active");

    if (selectedClientIds.length) {
      deactivateQuery = deactivateQuery.not("client_id", "in", `(${selectedClientIds.join(",")})`);
    }

    const { error: deactivateError } = await deactivateQuery;
    if (deactivateError) return NextResponse.json({ error: deactivateError.message }, { status: 500 });

    if (selectedClientIds.length) {
      const { error: upsertError } = await admin.from("workout_assignments").upsert(
        selectedClientIds.map((clientId) => ({
          workout_id: selectedWorkoutId,
          client_id: clientId,
          assigned_by_trainer_id: trainer.id,
          assigned_on: today,
          scheduled_for: availableOn || today,
          due_on: completeBy || null,
          assignment_notes: clean(notes) || null,
          ends_on: null,
          status: "active",
        })),
        { onConflict: "workout_id,client_id,assigned_on" },
      );

      if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, assignedClientIds: selectedClientIds });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to assign workout." },
      { status: 500 },
    );
  }
}
