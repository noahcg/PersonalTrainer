import { NextResponse } from "next/server";
import { createAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase-admin";
import { parseExercisePrescriptionType } from "@/lib/exercise-prescriptions";
import { createClient } from "@/lib/supabase-server";
import type { Exercise } from "@/lib/types";

type ExerciseUpdatePayload = {
  name?: string;
  category?: string;
  muscleGroups?: string[];
  equipment?: string[];
  pattern?: string;
  prescriptionType?: Exercise["prescriptionType"];
  difficulty?: Exercise["difficulty"];
  instructions?: string;
  cues?: string[];
  mistakes?: string[];
  substitutions?: string[];
  demoUrl?: string;
  tags?: string[];
};

const difficultyValues: Exercise["difficulty"][] = ["Beginner", "Intermediate", "Advanced"];

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => clean(item)).filter(Boolean);
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    if (!hasSupabaseAdminEnv()) {
      return NextResponse.json({ error: "Supabase admin credentials are not configured." }, { status: 500 });
    }

    const { id } = await context.params;
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
    const { data: exercise, error: lookupError } = await admin
      .from("exercises")
      .select("id, trainer_id, is_global")
      .eq("id", id)
      .maybeSingle<{ id: string; trainer_id: string | null; is_global: boolean }>();

    if (lookupError) return NextResponse.json({ error: lookupError.message }, { status: 500 });
    if (!exercise) return NextResponse.json({ error: "Exercise not found." }, { status: 404 });
    if (!exercise.is_global && exercise.trainer_id !== trainer.id) {
      return NextResponse.json({ error: "Exercise not found." }, { status: 404 });
    }

    const payload = (await request.json()) as ExerciseUpdatePayload;
    const name = clean(payload.name);

    if (!name) return NextResponse.json({ error: "Exercise name is required." }, { status: 400 });

    const difficulty = difficultyValues.includes(payload.difficulty as Exercise["difficulty"])
      ? (payload.difficulty as Exercise["difficulty"])
      : "Beginner";
    const prescriptionType = parseExercisePrescriptionType(payload.prescriptionType) ?? "strength";

    const { error: updateError } = await admin
      .from("exercises")
      .update({
        name,
        category: clean(payload.category) || "Strength",
        muscle_groups: cleanList(payload.muscleGroups),
        equipment: cleanList(payload.equipment),
        movement_pattern: clean(payload.pattern) || "General",
        prescription_type: prescriptionType,
        difficulty: difficulty.toLowerCase(),
        instructions: clean(payload.instructions) || "Add detailed instructions before assigning this exercise.",
        coaching_cues: cleanList(payload.cues),
        mistakes_to_avoid: cleanList(payload.mistakes),
        substitutions: cleanList(payload.substitutions),
        demo_url: clean(payload.demoUrl) || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", exercise.id);

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

    const { error: deleteTagsError } = await admin.from("exercise_tags").delete().eq("exercise_id", exercise.id);
    if (deleteTagsError) return NextResponse.json({ error: deleteTagsError.message }, { status: 500 });

    const tags = cleanList(payload.tags);
    if (tags.length) {
      const { error: insertTagsError } = await admin.from("exercise_tags").insert(
        tags.map((tag) => ({
          exercise_id: exercise.id,
          tag,
        })),
      );

      if (insertTagsError) return NextResponse.json({ error: insertTagsError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, id: exercise.id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update exercise." },
      { status: 500 },
    );
  }
}
