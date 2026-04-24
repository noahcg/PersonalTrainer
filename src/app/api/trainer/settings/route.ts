import { NextResponse } from "next/server";
import { createAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase-server";

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

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle<{ role: "trainer" | "client" }>();

    if (profile?.role !== "trainer") {
      return NextResponse.json({ error: "Only trainers can update trainer settings." }, { status: 403 });
    }

    const { name, email, bio, photo } = (await request.json()) as {
      name?: string;
      email?: string;
      bio?: string;
      photo?: string | null;
    };

    if (!name?.trim() || !email?.trim()) {
      return NextResponse.json({ error: "Name and email are required." }, { status: 400 });
    }

    const admin = createAdminClient();

    if (email.trim() !== user.email) {
      const { error: authError } = await admin.auth.admin.updateUserById(user.id, {
        email: email.trim(),
        user_metadata: {
          ...user.user_metadata,
          full_name: name.trim(),
        },
        email_confirm: true,
      });

      if (authError) {
        return NextResponse.json({ error: authError.message }, { status: 400 });
      }
    } else {
      const { error: authError } = await admin.auth.admin.updateUserById(user.id, {
        user_metadata: {
          ...user.user_metadata,
          full_name: name.trim(),
        },
      });

      if (authError) {
        return NextResponse.json({ error: authError.message }, { status: 400 });
      }
    }

    const [{ error: profileError }, { error: trainerError }] = await Promise.all([
      admin.from("profiles").upsert(
        {
          id: user.id,
          role: "trainer",
          full_name: name.trim(),
          email: email.trim(),
          avatar_url: photo?.trim() || null,
        },
        { onConflict: "id" },
      ),
      admin.from("trainers").upsert(
        {
          profile_id: user.id,
          coaching_bio: bio?.trim() || null,
        },
        { onConflict: "profile_id" },
      ),
    ]);

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    if (trainerError) {
      return NextResponse.json({ error: trainerError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to save trainer settings." },
      { status: 500 },
    );
  }
}
