export const profilePhotosBucket = "profile-photos";

export function buildProfilePhotoPath({
  userId,
  kind,
  fileName,
}: {
  userId: string;
  kind: "trainer" | "client";
  fileName: string;
}) {
  const extension = fileName.includes(".") ? fileName.split(".").pop()?.toLowerCase() ?? "jpg" : "jpg";
  const safeExtension = extension.replace(/[^a-z0-9]/g, "") || "jpg";
  return `${kind}/${userId}-${Date.now()}.${safeExtension}`;
}
