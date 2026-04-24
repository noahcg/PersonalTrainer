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

    if (profile?.role !== "client") {
      return NextResponse.json({ error: "Only clients can update this profile." }, { status: 403 });
    }

    const { goals, availability, injuries, notes, photo } = (await request.json()) as {
      goals?: string;
      availability?: string;
      injuries?: string;
      notes?: string;
      photo?: string | null;
    };

    const admin = createAdminClient();
    const { error } = await admin
      .from("clients")
      .update({
        goals: goals?.trim() || null,
        availability: availability?.trim() || null,
        injuries_limitations: injuries?.trim() || null,
        notes: notes?.trim() || null,
        profile_photo_url: photo?.trim() || null,
      })
      .eq("profile_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to save client profile." },
      { status: 500 },
    );
  }
}
