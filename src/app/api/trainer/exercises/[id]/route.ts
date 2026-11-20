import { saveTrainerExercise } from "@/lib/exercise-save";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  return saveTrainerExercise(request, (await context.params).id);
}
