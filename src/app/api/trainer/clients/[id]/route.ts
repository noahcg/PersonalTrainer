import { NextResponse } from "next/server";
import { createAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase-server";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!hasSupabaseAdminEnv()) {
      return NextResponse.json({ error: "Supabase admin credentials are not configured." }, { status: 500 });
    }

    const { id } = await params;
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

    const admin = createAdminClient();
    const { data: client, error: clientLookupError } = await admin
      .from("clients")
      .select("id, profile_id")
      .eq("trainer_id", trainer.id)
      .eq("id", id)
      .maybeSingle<{ id: string; profile_id: string | null }>();

    if (clientLookupError) {
      return NextResponse.json({ error: clientLookupError.message }, { status: 500 });
    }

    if (!client) {
      return NextResponse.json({ error: "Client not found." }, { status: 404 });
    }

    if (client.profile_id) {
      const { error: deleteAuthError } = await admin.auth.admin.deleteUser(client.profile_id);
      const authUserMissing = deleteAuthError?.message.toLowerCase().includes("not found");
      if (deleteAuthError && !authUserMissing) {
        return NextResponse.json({ error: deleteAuthError.message }, { status: 500 });
      }
    }

    const { error: deleteClientError } = await admin.from("clients").delete().eq("id", client.id);
    if (deleteClientError) {
      return NextResponse.json({ error: deleteClientError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to delete client." },
      { status: 500 },
    );
  }
}
