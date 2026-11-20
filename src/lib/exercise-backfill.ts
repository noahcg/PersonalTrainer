import { classifyLegacyExercise, classificationSchema } from "./exercise-classification";

export type LegacyBackfillRow = {
  id: string; name: string; category: string; movement_pattern: string | null;
  equipment: string[]; muscle_groups: string[]; exercise_tags?: { tag: string }[] | null;
  classification?: unknown; updated_at: string;
};

export function planExerciseBackfill(row: LegacyBackfillRow) {
  if (row.classification != null) return null;
  const classification = classifyLegacyExercise({ name: row.name, category: row.category, pattern: row.movement_pattern ?? "", equipment: row.equipment ?? [], muscleGroups: row.muscle_groups ?? [], tags: row.exercise_tags?.map((item) => item.tag) ?? [] });
  return { id: row.id, expectedUpdatedAt: row.updated_at, classification: classificationSchema.parse(classification) };
}
