import { NextResponse } from "next/server";
import { buildExerciseMediaPath, exerciseMediaBucket } from "@/lib/exercise-media";
import { createAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase-server";

const maxFileSizeBytes = 5 * 1024 * 1024;

async function ensureBucket() {
  const admin = createAdminClient();
  const { data: buckets, error: bucketsError } = await admin.storage.listBuckets();
  if (bucketsError) throw bucketsError;

  const existing = buckets.find((bucket) => bucket.name === exerciseMediaBucket);
  if (existing) return admin;

  const { error: createError } = await admin.storage.createBucket(exerciseMediaBucket, {
    public: true,
    fileSizeLimit: maxFileSizeBytes,
    allowedMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/gif"],
  });
  if (createError && !createError.message.toLowerCase().includes("already exists")) {
    throw createError;
  }

  return admin;
}

export async function POST(request: Request) {
  try {
    if (!hasSupabaseAdminEnv()) {
      return NextResponse.json({ error: "Supabase admin credentials are not configured." }, { status: 500 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { data: trainer, error: trainerError } = await supabase
      .from("trainers")
      .select("id")
      .eq("profile_id", user.id)
      .maybeSingle<{ id: string }>();

    if (trainerError) {
      return NextResponse.json({ error: trainerError.message }, { status: 500 });
    }

    if (!trainer?.id) {
      return NextResponse.json({ error: "Trainer profile not found." }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Image file is required." }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Please choose an image file." }, { status: 400 });
    }

    if (file.size > maxFileSizeBytes) {
      return NextResponse.json({ error: "Please choose an image under 5MB." }, { status: 400 });
    }

    const admin = await ensureBucket();
    const path = buildExerciseMediaPath({
      trainerId: trainer.id,
      fileName: file.name,
    });

    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await admin.storage.from(exerciseMediaBucket).upload(path, arrayBuffer, {
      contentType: file.type,
      upsert: false,
    });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: publicUrlData } = admin.storage.from(exerciseMediaBucket).getPublicUrl(path);

    return NextResponse.json({
      ok: true,
      url: publicUrlData.publicUrl,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to upload exercise image." },
      { status: 500 },
    );
  }
}
