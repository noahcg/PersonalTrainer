import { NextResponse } from "next/server";
import { createAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase-server";

type SerializedPushSubscription = {
  endpoint?: string;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
};

async function getTrainerId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized.", status: 401 as const, trainerId: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle<{ role: "trainer" | "client" }>();

  if (profile?.role !== "trainer") {
    return { error: "Only trainers can manage appointment notifications.", status: 403 as const, trainerId: null };
  }

  const { data: trainer } = await supabase
    .from("trainers")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle<{ id: string }>();

  if (!trainer?.id) return { error: "Trainer profile missing.", status: 404 as const, trainerId: null };
  return { error: null, status: null, trainerId: trainer.id };
}

export async function POST(request: Request) {
  try {
    if (!hasSupabaseAdminEnv()) {
      return NextResponse.json({ error: "Supabase admin credentials are not configured." }, { status: 500 });
    }

    const trainer = await getTrainerId();
    if (trainer.error || !trainer.trainerId) {
      return NextResponse.json({ error: trainer.error }, { status: trainer.status ?? 401 });
    }

    const body = (await request.json()) as { subscription?: SerializedPushSubscription };
    const subscription = body.subscription;
    const endpoint = subscription?.endpoint?.trim();
    const p256dh = subscription?.keys?.p256dh?.trim();
    const auth = subscription?.keys?.auth?.trim();

    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json({ error: "Push subscription is incomplete." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { error } = await admin.from("trainer_push_subscriptions").upsert(
      {
        trainer_id: trainer.trainerId,
        endpoint,
        p256dh_key: p256dh,
        auth_key: auth,
        user_agent: request.headers.get("user-agent"),
        disabled_at: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "endpoint" },
    );

    if (error) {
      if (/trainer_push_subscriptions/i.test(error.message)) {
        return NextResponse.json(
          { error: "Push notification tables are missing. Run supabase/trainer-push-notifications-migration.sql in Supabase." },
          { status: 500 },
        );
      }

      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to save notification subscription." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    if (!hasSupabaseAdminEnv()) {
      return NextResponse.json({ error: "Supabase admin credentials are not configured." }, { status: 500 });
    }

    const trainer = await getTrainerId();
    if (trainer.error || !trainer.trainerId) {
      return NextResponse.json({ error: trainer.error }, { status: trainer.status ?? 401 });
    }

    const body = (await request.json()) as { endpoint?: string };
    const endpoint = body.endpoint?.trim();
    if (!endpoint) return NextResponse.json({ error: "Endpoint is required." }, { status: 400 });

    const admin = createAdminClient();
    const { error } = await admin
      .from("trainer_push_subscriptions")
      .update({ disabled_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("trainer_id", trainer.trainerId)
      .eq("endpoint", endpoint);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to remove notification subscription." },
      { status: 500 },
    );
  }
}
