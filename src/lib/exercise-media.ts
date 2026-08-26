export const exerciseMediaBucket = "exercise-media";

export function buildExerciseMediaPath({
  trainerId,
  fileName,
}: {
  trainerId: string;
  fileName: string;
}) {
  const extension = fileName.includes(".") ? fileName.split(".").pop()?.toLowerCase() ?? "jpg" : "jpg";
  const safeExtension = extension.replace(/[^a-z0-9]/g, "") || "jpg";
  return `trainer/${trainerId}/${Date.now()}.${safeExtension}`;
}
