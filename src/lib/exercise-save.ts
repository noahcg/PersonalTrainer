import { NextResponse } from "next/server";
import { createAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase-server";
import { exerciseFieldErrors, exerciseInputSchema } from "@/lib/exercise-input";
import { classificationLabels, getClassification } from "@/lib/exercise-classification";
import { fromExerciseRow, type ExerciseRow } from "@/lib/exercises";

// Classification is a single atomic row write. Existing legacy columns and tags remain intact.
export async function saveTrainerExercise(request: Request, id?: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    const { data: trainer } = await supabase.from("trainers").select("id").eq("profile_id", user.id).maybeSingle<{ id: string }>();
    if (!trainer) return NextResponse.json({ error: "Trainer access required." }, { status: 403 });
    if (!hasSupabaseAdminEnv()) return NextResponse.json({ error: "Exercise editing is not configured." }, { status: 503 });
    const parsed = exerciseInputSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Check the highlighted fields.", fields: exerciseFieldErrors(parsed.error) }, { status: 400 });
    const input = parsed.data;
    if (!id && (!input.classification.exerciseType || !input.classification.equipment.length)) {
      return NextResponse.json({ error: "Choose an exercise type and equipment (or No equipment)." }, { status: 400 });
    }
    if (input.demoUrl && !/^(https?:\/\/|\/(?!\/))/.test(input.demoUrl)) {
      return NextResponse.json({ error: "Use an http(s) media URL or upload an image.", fields: { demoUrl: "Use an http(s) URL." } }, { status: 400 });
    }
    const admin = createAdminClient();
    let existing: ExerciseRow | null = null;
    if (id) {
      const { data, error } = await admin.from("exercises").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      if (!data || (!data.is_global && data.trainer_id !== trainer.id)) return NextResponse.json({ error: "Exercise not found." }, { status: 404 });
      existing = data as ExerciseRow;
      input.classification.review = [...new Set([...getClassification(fromExerciseRow(existing)).review, ...input.classification.review])];
    }
    const row = {
      name: input.name, classification: input.classification,
      prescription_type: input.prescriptionType, difficulty: input.difficulty.toLowerCase(),
      instructions: input.instructions, coaching_cues: input.cues, mistakes_to_avoid: input.mistakes,
      substitutions: input.substitutions, demo_url: input.demoUrl || null,
      ...(input.regressions ? { regressions: input.regressions } : {}),
      ...(input.progressions ? { progressions: input.progressions } : {}),
      updated_at: new Date().toISOString(),
    };
    if (existing) {
      const { data, error } = await admin.from("exercises").update(row).eq("id", existing.id)
        .or(`is_global.eq.true,trainer_id.eq.${trainer.id}`).select("id").single();
      if (error) throw error;
      return NextResponse.json({ ok: true, id: data.id, classification: input.classification });
    }
    const labels = classificationLabels({ ...input, category: "", pattern: "", equipment: [], muscleGroups: [], tags: [] });
    const { data, error } = await admin.from("exercises").insert({ ...row,
      trainer_id: trainer.id, is_global: false, category: labels.type,
      movement_pattern: labels.focus, equipment: labels.equipment, muscle_groups: labels.muscles,
    }).select("id").single();
    if (error) throw error;
    return NextResponse.json({ ok: true, id: data.id, classification: input.classification }, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
    const message = typeof error === "object" && error && "message" in error ? String(error.message) : "Unable to save exercise.";
    return NextResponse.json({ error: /classification.*(column|schema)|column.*classification/i.test(message) ? "Exercise classification migration is required before saving. Your changes have not been saved." : message }, { status: 500 });
  }
}
