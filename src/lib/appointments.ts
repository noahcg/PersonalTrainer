import { isSupabaseConfigured } from "@/lib/auth-server";
import { createClient } from "@/lib/supabase-server";
import { clientSessions as demoClientSessions, clients as demoClients, bulletins as demoBulletins, workouts as demoWorkouts } from "@/lib/demo-data";
import { zonedDateTimeToIso } from "@/lib/date-format";
import type { CalendarEvent, TrainerAppointment } from "@/lib/types";

type AppointmentRow = {
  id: string;
  trainer_id: string;
  client_id: string | null;
  title: string;
  starts_at: string;
  time_zone?: string | null;
  duration_minutes: number;
  location: string | null;
  notes: string | null;
  reminder_offsets_minutes?: number[] | null;
  status: TrainerAppointment["status"];
  created_at: string;
  clients?: { full_name: string } | { full_name: string }[] | null;
};

type WorkoutAssignmentCalendarRow = {
  workout_id: string;
  client_id: string;
  due_on: string | null;
  scheduled_for: string | null;
  assignment_notes: string | null;
  clients?: { full_name: string } | { full_name: string }[] | null;
  workouts?: { name: string } | { name: string }[] | null;
};

type WorkoutAssignmentLogRow = {
  client_id: string;
  workout_id: string;
  status: string;
};

function firstJoinedRow<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function dueDateToReminderIso(date: string) {
  return zonedDateTimeToIso(date, "09:00") ?? new Date(`${date}T09:00:00`).toISOString();
}

function mapAppointmentRow(row: AppointmentRow): TrainerAppointment {
  const clientRecord = Array.isArray(row.clients) ? row.clients[0] : row.clients;
  return {
    id: row.id,
    trainerId: row.trainer_id,
    clientId: row.client_id,
    clientName: clientRecord?.full_name ?? null,
    title: row.title,
    startsAtIso: row.starts_at,
    timeZone: row.time_zone ?? null,
    durationMinutes: row.duration_minutes,
    location: row.location ?? "",
    notes: row.notes ?? "",
    reminderOffsetsMinutes: row.reminder_offsets_minutes ?? [],
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

async function getAppointmentRows(supabase: Awaited<ReturnType<typeof createClient>>, trainerId: string) {
  const response = await supabase
    .from("trainer_appointments")
    .select("id, trainer_id, client_id, title, starts_at, time_zone, duration_minutes, location, notes, reminder_offsets_minutes, status, created_at, clients(full_name)")
    .eq("trainer_id", trainerId)
    .order("starts_at", { ascending: true });

  if (!response.error || !/time_zone/i.test(response.error.message)) return response;

  return supabase
    .from("trainer_appointments")
    .select("id, trainer_id, client_id, title, starts_at, duration_minutes, location, notes, reminder_offsets_minutes, status, created_at, clients(full_name)")
    .eq("trainer_id", trainerId)
    .order("starts_at", { ascending: true });
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
        reminderOffsetsMinutes: [],
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
        reminderOffsetsMinutes: [],
        status: bulletin.status ?? "active",
      });
    }

    for (const workout of demoWorkouts) {
      for (const assignment of workout.assignments ?? []) {
        if (assignment.status === "completed" || !assignment.dueOn) continue;
        events.push({
          id: `workout-assignment-${workout.id}-${assignment.clientId}`,
          type: "workout_assignment",
          title: `${assignment.clientName ?? "Client"} due: ${workout.name}`,
          startsAtIso: dueDateToReminderIso(assignment.dueOn),
          durationMinutes: null,
          location: "",
          clientId: assignment.clientId,
          clientName: assignment.clientName ?? null,
          notes: assignment.notes,
          reminderOffsetsMinutes: [],
          status: assignment.status ?? "assigned",
        });
      }
    }

    return { mode: "demo", appointments: [], events };
  }

  const { supabase, trainerId } = await getTrainerContext();
  if (!trainerId) {
    return { mode: "supabase", appointments: [], events: [] };
  }

  const [appointmentsResponse, sessionsResponse, bulletinsResponse, assignmentsResponse] = await Promise.all([
    getAppointmentRows(supabase, trainerId),
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
    supabase
      .from("workout_assignments")
      .select("workout_id, client_id, due_on, scheduled_for, assignment_notes, clients(full_name), workouts(name)")
      .eq("assigned_by_trainer_id", trainerId)
      .eq("status", "active")
      .not("due_on", "is", null),
  ]);

  const appointmentRows = (appointmentsResponse.data ?? []) as AppointmentRow[];
  const appointments = appointmentRows.map(mapAppointmentRow);
  const events: CalendarEvent[] = appointments.map((appt) => ({
    id: `appt-${appt.id}`,
    type: appt.clientId ? "appointment" : "calendar_item",
    title: appt.title,
    startsAtIso: appt.startsAtIso,
    timeZone: appt.timeZone,
    durationMinutes: appt.durationMinutes,
    location: appt.location,
    clientId: appt.clientId,
    clientName: appt.clientName,
    notes: appt.notes,
    reminderOffsetsMinutes: appt.reminderOffsetsMinutes,
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
      reminderOffsetsMinutes: [],
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
      reminderOffsetsMinutes: [],
      status: bulletinRow.status ?? "active",
    });
  }

  const assignmentRows = (assignmentsResponse.data ?? []) as WorkoutAssignmentCalendarRow[];
  const assignmentWorkoutIds = assignmentRows.map((row) => row.workout_id);
  const assignmentClientIds = assignmentRows.map((row) => row.client_id);
  const { data: completedLogs } = assignmentWorkoutIds.length
    ? await supabase
        .from("workout_logs")
        .select("client_id, workout_id, status")
        .in("workout_id", assignmentWorkoutIds)
        .in("client_id", assignmentClientIds)
        .eq("status", "completed")
    : { data: [] as WorkoutAssignmentLogRow[] };
  const completedSet = new Set(
    ((completedLogs ?? []) as WorkoutAssignmentLogRow[]).map((log) => `${log.client_id}:${log.workout_id}`),
  );

  for (const row of assignmentRows) {
    if (!row.due_on || completedSet.has(`${row.client_id}:${row.workout_id}`)) continue;
    const client = firstJoinedRow(row.clients);
    const workout = firstJoinedRow(row.workouts);
    const nowDate = new Date().toISOString().slice(0, 10);
    events.push({
      id: `workout-assignment-${row.workout_id}-${row.client_id}-${row.due_on}`,
      type: "workout_assignment",
      title: `${client?.full_name ?? "Client"} due: ${workout?.name ?? "Workout"}`,
      startsAtIso: dueDateToReminderIso(row.due_on),
      durationMinutes: null,
      location: "",
      clientId: row.client_id,
      clientName: client?.full_name ?? null,
      notes: row.assignment_notes ?? "",
      reminderOffsetsMinutes: [],
      status: row.due_on < nowDate ? "overdue" : "assigned",
    });
  }

  return { mode: "supabase", appointments, events };
}
