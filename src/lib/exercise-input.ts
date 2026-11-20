import { z } from "zod";
import { classificationSchema } from "./exercise-classification";

export const exerciseInputSchema = z.object({
  name: z.string().trim().min(1, "Exercise name is required.").max(200),
  classification: classificationSchema,
  prescriptionType: z.enum(["strength", "duration", "distance", "intervals", "stretch"]),
  difficulty: z.enum(["Beginner", "Intermediate", "Advanced"]),
  instructions: z.string().max(30000).refine((value) => !!value.trim(), "Instructions are required."),
  cues: z.array(z.string()).max(200),
  mistakes: z.array(z.string()).max(200),
  substitutions: z.array(z.string()).max(200),
  regressions: z.array(z.string()).max(200).optional(),
  progressions: z.array(z.string()).max(200).optional(),
  demoUrl: z.string().max(8000000),
});

export function exerciseFieldErrors(error: z.ZodError) {
  return Object.fromEntries(error.issues.map((issue) => [issue.path.join("."), issue.message]));
}

export function coachingLines(value: string, original?: string[]) {
  return original && original.join("\n") === value ? original : value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}
