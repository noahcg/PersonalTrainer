import { NextResponse } from "next/server";
import { createAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase-admin";
import { isExpiredSubscriptionStatus, sendPush } from "@/lib/push-notifications";

type AppointmentRow = {
  id: string;
  trainer_id: string;
  client_id: string | null;
  title: string;
  starts_at: string;
  location: string | null;
  reminder_offsets_minutes: number[] | null;
  status: string;
  clients?: { full_name: string } | { full_name: string }[] | null;
};

type DeliveryRow = {
  appointment_id: string;
  reminder_offset_minutes: number;
};

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET ?? process.env.APP_CRON_SECRET;
  if (!secret && process.env.NODE_ENV !== "production") return true;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

function formatAppointmentTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

function formatReminderLead(minutes: number) {
  if (minutes === 0) return "now";
  if (minutes >= 1440) return `${minutes / 1440} day${minutes === 1440 ? "" : "s"}`;
  if (minutes >= 60) return `${minutes / 60} hour${minutes === 60 ? "" : "s"}`;
  return `${minutes} minutes`;
}

export async function GET(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (!hasSupabaseAdminEnv()) {
      return NextResponse.json({ error: "Supabase admin credentials are not configured." }, { status: 500 });
    }

    const admin = createAdminClient();
    const now = new Date();
    const nowMs = now.getTime();
    const lookbackMinutes = Number.parseInt(process.env.PUSH_REMINDER_LOOKBACK_MINUTES ?? "15", 10);
    const lookaheadDays = Number.parseInt(process.env.PUSH_REMINDER_LOOKAHEAD_DAYS ?? "2", 10);
    const windowStartMs = nowMs - Math.max(1, lookbackMinutes) * 60_000;
    const windowEnd = new Date(nowMs + Math.max(1, lookaheadDays) * 24 * 60 * 60_000).toISOString();

    const { data: appointments, error: appointmentsError } = await admin
      .from("trainer_appointments")
      .select("id, trainer_id, client_id, title, starts_at, location, reminder_offsets_minutes, status, clients(full_name)")
      .eq("status", "scheduled")
      .gte("starts_at", now.toISOString())
      .lte("starts_at", windowEnd);

    if (appointmentsError) {
      return NextResponse.json({ error: appointmentsError.message }, { status: 500 });
    }

    const due = ((appointments ?? []) as AppointmentRow[]).flatMap((appointment) => {
      const startsAtMs = new Date(appointment.starts_at).getTime();
      return (appointment.reminder_offsets_minutes ?? [])
        .filter((offset) => {
          const dueAtMs = startsAtMs - offset * 60_000;
          return dueAtMs <= nowMs && dueAtMs >= windowStartMs;
        })
        .map((offset) => ({ appointment, offset }));
    });

    if (!due.length) return NextResponse.json({ ok: true, checked: appointments?.length ?? 0, sent: 0 });

    const { data: deliveries, error: deliveriesError } = await admin
      .from("trainer_push_reminder_deliveries")
      .select("appointment_id, reminder_offset_minutes")
      .in("appointment_id", due.map((item) => item.appointment.id));

    if (deliveriesError) {
      return NextResponse.json({ error: deliveriesError.message }, { status: 500 });
    }

    const sentKeys = new Set(
      ((deliveries ?? []) as DeliveryRow[]).map((delivery) => `${delivery.appointment_id}:${delivery.reminder_offset_minutes}`),
    );

    let sent = 0;
    let skipped = 0;
    let failed = 0;

    for (const item of due) {
      const deliveryKey = `${item.appointment.id}:${item.offset}`;
      if (sentKeys.has(deliveryKey)) {
        skipped += 1;
        continue;
      }

      const { data: subscriptions, error: subscriptionsError } = await admin
        .from("trainer_push_subscriptions")
        .select("endpoint, p256dh_key, auth_key")
        .eq("trainer_id", item.appointment.trainer_id)
        .is("disabled_at", null);

      if (subscriptionsError || !subscriptions?.length) {
        skipped += 1;
        continue;
      }

      const client = Array.isArray(item.appointment.clients) ? item.appointment.clients[0] : item.appointment.clients;
      const body = [
        item.offset === 0
          ? "Starts now"
          : `Starts in ${formatReminderLead(item.offset)}`,
        formatAppointmentTime(item.appointment.starts_at),
        client?.full_name ? `with ${client.full_name}` : null,
        item.appointment.location ? `at ${item.appointment.location}` : null,
      ]
        .filter(Boolean)
        .join(" ");

      const results = await Promise.allSettled(
        subscriptions.map((subscription) =>
          sendPush(subscription, {
            title: item.appointment.title,
            body,
            url: "/trainer/calendar",
            tag: `trainer-appointment-${item.appointment.id}-${item.offset}`,
            requireInteraction: item.offset <= 15,
          }),
        ),
      );

      for (let index = 0; index < results.length; index += 1) {
        const result = results[index];
        if (result.status === "fulfilled") {
          sent += 1;
          continue;
        }

        failed += 1;
        const reason = result.reason as { statusCode?: number } | undefined;
        if (isExpiredSubscriptionStatus(reason?.statusCode)) {
          await admin
            .from("trainer_push_subscriptions")
            .update({ disabled_at: new Date().toISOString(), updated_at: new Date().toISOString() })
            .eq("endpoint", subscriptions[index].endpoint);
        }
      }

      if (results.some((result) => result.status === "fulfilled")) {
        await admin.from("trainer_push_reminder_deliveries").upsert(
          {
            trainer_id: item.appointment.trainer_id,
            appointment_id: item.appointment.id,
            reminder_offset_minutes: item.offset,
            sent_at: new Date().toISOString(),
          },
          { onConflict: "appointment_id,reminder_offset_minutes" },
        );
      }
    }

    return NextResponse.json({ ok: true, checked: appointments?.length ?? 0, due: due.length, sent, skipped, failed });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to process trainer appointment reminders." },
      { status: 500 },
    );
  }
}
