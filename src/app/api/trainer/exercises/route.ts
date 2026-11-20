import { saveTrainerExercise } from "@/lib/exercise-save";

export async function POST(request: Request) {
  return saveTrainerExercise(request);
}
