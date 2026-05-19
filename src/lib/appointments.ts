import { isSupabaseConfigured } from "@/lib/auth-server";
import { createClient } from "@/lib/supabase-server";
import { clientSessions as demoClientSessions, clients as demoClients, bulletins as demoBulletins } from "@/lib/demo-data";
import type { CalendarEvent, TrainerAppointment } from "@/lib/types";

type AppointmentRow = {
  id: string;
  trainer_id: string;
  client_id: string | null;
  title: string;
  starts_at: string;
  duration_minutes: number;
  location: string | null;
  notes: string | null;
  status: TrainerAppointment["status"];
  created_at: string;
  clients?: { full_name: string } | { full_name: string }[] | null;
};

function mapAppointmentRow(row: AppointmentRow): TrainerAppointment {
  const clientRecord = Array.isArray(row.clients) ? row.clients[0] : row.clients;
  return {
    id: row.id,
    trainerId: row.trainer_id,
    clientId: row.client_id,
    clientName: clientRecord?.full_name ?? null,
    title: row.title,
    startsAtIso: row.starts_at,
    durationMinutes: row.duration_minutes,
    location: row.location ?? "",
    notes: row.notes ?? "",
    status: row.status,
    createdAt: row.created_at,
  };
}

async function getTrainerContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, trainerId: null };

  const { data: trainer } = await supabase
    .from("trainers")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle<{ id: string }>();
  return { supabase, trainerId: trainer?.id ?? null };
}

export async function getTrainerCalendarData(): Promise<{
  mode: "demo" | "supabase";
  appointments: TrainerAppointment[];
  events: CalendarEvent[];
}> {
  if (!isSupabaseConfigured()) {
    const events: CalendarEvent[] = [];

    for (const session of demoClientSessions) {
      const client = demoClients.find((item) => item.id === session.clientId);
      events.push({
        id: `session-${session.id}`,
        type: "in_person_session",
        title: `${client?.name ?? "Client"} - In-person session`,
        startsAtIso: session.startedAtIso,
        durationMinutes: session.durationMinutes,
        location: session.location ?? "",
        clientId: session.clientId,
        clientName: client?.name ?? null,
        notes: session.notes ?? "",
        status: session.status,
      });
    }

    for (const bulletin of demoBulletins) {
      if (bulletin.postType !== "session" || !bulletin.sessionStartsAt) continue;
      events.push({
        id: `bulletin-${bulletin.id}`,
        type: "bulletin_session",
        title: bulletin.title,
        startsAtIso: bulletin.sessionStartsAt,
        durationMinutes: null,
        location: bulletin.sessionLocation ?? "",
        clientId: null,
        clientName: null,
        notes: bulletin.body,
        status: bulletin.status ?? "active",
      });
    }

    return { mode: "demo", appointments: [], events };
  }

  const { supabase, trainerId } = await getTrainerContext();
  if (!trainerId) {
    return { mode: "supabase", appointments: [], events: [] };
  }

  const [appointmentsResponse, sessionsResponse, bulletinsResponse] = await Promise.all([
    supabase
      .from("trainer_appointments")
      .select("id, trainer_id, client_id, title, starts_at, duration_minutes, location, notes, status, created_at, clients(full_name)")
      .eq("trainer_id", trainerId)
      .order("starts_at", { ascending: true }),
    supabase
      .from("client_sessions")
      .select("id, client_id, started_at, completed_at, status, location, notes, duration_minutes, clients(full_name)")
      .order("started_at", { ascending: false })
      .limit(200),
    supabase
      .from("bulletin_posts")
      .select("id, title, body, post_type, session_starts_at, session_location, status")
      .eq("trainer_id", trainerId)
      .eq("post_type", "session")
      .not("session_starts_at", "is", null),
  ]);

  const appointmentRows = (appointmentsResponse.data ?? []) as AppointmentRow[];
  const appointments = appointmentRows.map(mapAppointmentRow);
  const events: CalendarEvent[] = appointments.map((appt) => ({
    id: `appt-${appt.id}`,
    type: "appointment",
    title: appt.title,
    startsAtIso: appt.startsAtIso,
    durationMinutes: appt.durationMinutes,
    location: appt.location,
    clientId: appt.clientId,
    clientName: appt.clientName,
    notes: appt.notes,
    status: appt.status,
  }));

  for (const row of sessionsResponse.data ?? []) {
    const sessionRow = row as {
      id: string;
      client_id: string;
      started_at: string;
      completed_at: string | null;
      status: string;
      location: string | null;
      notes: string | null;
      duration_minutes: number | null;
      clients?: { full_name: string } | { full_name: string }[] | null;
    };
    const clientRecord = Array.isArray(sessionRow.clients) ? sessionRow.clients[0] : sessionRow.clients;
    events.push({
      id: `session-${sessionRow.id}`,
      type: "in_person_session",
      title: `${clientRecord?.full_name ?? "Client"} - In-person session`,
      startsAtIso: sessionRow.started_at,
      durationMinutes: sessionRow.duration_minutes,
      location: sessionRow.location ?? "",
      clientId: sessionRow.client_id,
      clientName: clientRecord?.full_name ?? null,
      notes: sessionRow.notes ?? "",
      status: sessionRow.status,
    });
  }

  for (const row of bulletinsResponse.data ?? []) {
    const bulletinRow = row as {
      id: string;
      title: string;
      body: string;
      session_starts_at: string;
      session_location: string | null;
      status: string;
    };
    events.push({
      id: `bulletin-${bulletinRow.id}`,
      type: "bulletin_session",
      title: bulletinRow.title,
      startsAtIso: bulletinRow.session_starts_at,
      durationMinutes: null,
      location: bulletinRow.session_location ?? "",
      clientId: null,
      clientName: null,
      notes: bulletinRow.body,
      status: bulletinRow.status ?? "active",
    });
  }

  return { mode: "supabase", appointments, events };
}
