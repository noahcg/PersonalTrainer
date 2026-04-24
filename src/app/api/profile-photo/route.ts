import { NextResponse } from "next/server";
import { buildProfilePhotoPath, profilePhotosBucket } from "@/lib/profile-photo";
import { createAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase-server";
import type { Role } from "@/lib/types";

const maxFileSizeBytes = 2 * 1024 * 1024;

async function ensureBucket() {
  const admin = createAdminClient();
  const { data: buckets, error: bucketsError } = await admin.storage.listBuckets();
  if (bucketsError) throw bucketsError;

  const existing = buckets.find((bucket) => bucket.name === profilePhotosBucket);
  if (existing) return admin;

  const { error: createError } = await admin.storage.createBucket(profilePhotosBucket, {
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

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Photo file is required." }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Please choose an image file." }, { status: 400 });
    }

    if (file.size > maxFileSizeBytes) {
      return NextResponse.json({ error: "Please choose an image under 2MB." }, { status: 400 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle<{ role: Role }>();

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    const role = profile?.role;
    if (role !== "trainer" && role !== "client") {
      return NextResponse.json({ error: "Profile role not found." }, { status: 400 });
    }

    const admin = await ensureBucket();
    const path = buildProfilePhotoPath({
      userId: user.id,
      kind: role,
      fileName: file.name,
    });

    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await admin.storage.from(profilePhotosBucket).upload(path, arrayBuffer, {
      contentType: file.type,
      upsert: true,
    });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: publicUrlData } = admin.storage.from(profilePhotosBucket).getPublicUrl(path);

    return NextResponse.json({
      ok: true,
      url: publicUrlData.publicUrl,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to upload photo." },
      { status: 500 },
    );
  }
}
