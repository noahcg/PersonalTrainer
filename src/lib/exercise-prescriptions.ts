import type { Exercise, ExercisePrescriptionType, WorkoutExercise } from "@/lib/types";

export const exercisePrescriptionTypes = ["strength", "duration", "distance", "intervals", "stretch"] as const satisfies readonly ExercisePrescriptionType[];

export function parseExercisePrescriptionType(value: unknown): ExercisePrescriptionType | null {
  return typeof value === "string" && exercisePrescriptionTypes.includes(value as ExercisePrescriptionType)
    ? (value as ExercisePrescriptionType)
    : null;
}

export function getExercisePrescriptionType(exercise: Pick<Exercise, "category"> & { prescriptionType?: unknown; pattern?: string; name?: string }): ExercisePrescriptionType {
  const explicitType = parseExercisePrescriptionType(exercise.prescriptionType);
  if (explicitType) return explicitType;

  if (/^(stretch|mobility)$/i.test(exercise.pattern?.trim() ?? "") || /stretch/i.test(exercise.name ?? "")) return "stretch";

  const category = exercise.category.trim().toLowerCase();
  if (category === "cardio / conditioning" || category === "warm up" || category === "cool down") return "duration";
  return "strength";
}

export function getWorkoutExercisePrescriptionType(exercise: Pick<WorkoutExercise, "prescriptionType">): ExercisePrescriptionType {
  return parseExercisePrescriptionType(exercise.prescriptionType) ?? "strength";
}

export function prescriptionTypeLabel(type: ExercisePrescriptionType) {
  switch (type) {
    case "stretch":
      return "Stretch / hold";
    case "duration":
      return "Timed cardio";
    case "distance":
      return "Distance cardio";
    case "intervals":
      return "Intervals";
    default:
      return "Strength / reps";
  }
}
