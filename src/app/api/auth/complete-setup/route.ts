import { NextResponse } from "next/server";
import { createAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase-server";

export async function POST() {
  try {
    if (!hasSupabaseAdminEnv()) {
      return NextResponse.json({ error: "Supabase admin setup flow is not configured." }, { status: 500 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const admin = createAdminClient();
    const fullName =
      typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim()
        ? user.user_metadata.full_name.trim()
        : user.email;

    const { error: profileError } = await admin.from("profiles").upsert(
      {
        id: user.id,
        role: "client",
        full_name: fullName,
        email: user.email,
        avatar_url: null,
      },
      { onConflict: "id" },
    );

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    const { data: client, error: clientLookupError } = await admin
      .from("clients")
      .select("id")
      .eq("email", user.email)
      .maybeSingle<{ id: string }>();

    if (clientLookupError) {
      return NextResponse.json({ error: clientLookupError.message }, { status: 500 });
    }

    if (client?.id) {
      const { error: updateError } = await admin
        .from("clients")
        .update({ profile_id: user.id })
        .eq("id", client.id);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true, role: "client" });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to complete account setup." },
      { status: 500 },
    );
  }
}
