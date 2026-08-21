import { NextResponse } from "next/server";
import { createAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase-admin";
import { sendPush } from "@/lib/push-notifications";
import { createClient } from "@/lib/supabase-server";

export async function POST() {
  try {
    if (!hasSupabaseAdminEnv()) {
      return NextResponse.json({ error: "Supabase admin credentials are not configured." }, { status: 500 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const { data: trainer } = await supabase
      .from("trainers")
      .select("id")
      .eq("profile_id", user.id)
      .maybeSingle<{ id: string }>();

    if (!trainer?.id) return NextResponse.json({ error: "Trainer profile missing." }, { status: 404 });

    const admin = createAdminClient();
    const { data: subscriptions, error } = await admin
      .from("trainer_push_subscriptions")
      .select("endpoint, p256dh_key, auth_key")
      .eq("trainer_id", trainer.id)
      .is("disabled_at", null);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!subscriptions?.length) return NextResponse.json({ error: "No active notification subscriptions found." }, { status: 404 });

    await Promise.all(
      subscriptions.map((subscription) =>
        sendPush(subscription, {
          title: "Appointment notifications are ready",
          body: "You will get reminders before trainer appointments with reminders enabled.",
          url: "/trainer/calendar",
          tag: "trainer-notification-test",
        }),
      ),
    );

    return NextResponse.json({ ok: true, sent: subscriptions.length });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to send a test notification." },
      { status: 500 },
    );
  }
}
