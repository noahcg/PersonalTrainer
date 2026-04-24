import { NextResponse } from "next/server";
import { createAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase-server";

export async function POST(request: Request) {
  try {
    const { clientId } = (await request.json()) as { clientId?: string };

    if (!clientId) {
      return NextResponse.json({ error: "Client id is required." }, { status: 400 });
    }

    if (!hasSupabaseAdminEnv()) {
      return NextResponse.json({ error: "Supabase admin invite flow is not configured." }, { status: 500 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { data: trainer } = await supabase
      .from("trainers")
      .select("id")
      .eq("profile_id", user.id)
      .maybeSingle<{ id: string }>();

    if (!trainer?.id) {
      return NextResponse.json({ error: "Trainer profile not found." }, { status: 403 });
    }

    const { data: client } = await supabase
      .from("clients")
      .select("id, email, full_name")
      .eq("trainer_id", trainer.id)
      .eq("id", clientId)
      .maybeSingle<{ id: string; email: string; full_name: string }>();

    if (!client) {
      return NextResponse.json({ error: "Client not found." }, { status: 404 });
    }

    const admin = createAdminClient();
    const origin = new URL(request.url).origin;
    const redirectTo = `${origin}/auth/callback?next=/setup-account`;

    const { error } = await admin.auth.admin.inviteUserByEmail(client.email, {
      redirectTo,
      data: {
        full_name: client.full_name,
        role: "client",
      },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const inviteSentAt = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("clients")
      .update({ invite_sent_at: inviteSentAt })
      .eq("id", client.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, inviteSentAt });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to send invite." },
      { status: 500 },
    );
  }
}
