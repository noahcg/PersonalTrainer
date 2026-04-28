import { formatDistanceToNow } from "date-fns";
import { clientSessions as demoClientSessions, clients as demoClients, plans } from "@/lib/demo-data";
import { isSupabaseConfigured } from "@/lib/auth-server";
import { normalizePricingTier } from "@/lib/pricing";
import { createClient } from "@/lib/supabase-server";
import type { Client, ClientSession, CoachingEntry, Plan } from "@/lib/types";

type ClientRow = {
  id: string;
  full_name: string;
  email: string;
  profile_photo_url: string | null;
  goals: string | null;
  fitness_level: string | null;
  injuries_limitations: string | null;
  notes: string | null;
  preferred_training_style: string | null;
  availability: string | null;
  start_date: string | null;
  status: Client["status"];
  pricing_tier: string | null;
  package_session_limit: number | null;
  profile_id: string | null;
  invite_sent_at: string | null;
};

type MessageRow = {
  id: string;
  body: string;
  created_at: string;
};

type PlanRow = {
  training_plans: {
    id: string;
    title: string;
    description: string | null;
    goal: string | null;
    weekly_structure: string | null;
    notes: string | null;
    duration_weeks: number | null;
  } | null;
};

type ClientSessionRow = {
  id: string;
  client_id: string;
  started_at: string;
  completed_at: string | null;
  status: ClientSession["status"];
  location: string | null;
  notes: string | null;
  duration_minutes: number | null;
  created_by: "trainer" | "client";
};

const clientSelect =
  "id, profile_id, full_name, email, profile_photo_url, goals, fitness_level, injuries_limitations, notes, preferred_training_style, availability, start_date, status, pricing_tier, package_session_limit, invite_sent_at";
const legacyClientSelect =
  "id, profile_id, full_name, email, profile_photo_url, goals, fitness_level, injuries_limitations, notes, preferred_training_style, availability, start_date, status, pricing_tier, invite_sent_at";

async function getTrainerContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, trainerId: null };
  }

  const { data: trainer } = await supabase
    .from("trainers")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle<{ id: string }>();

  return {
    supabase,
    trainerId: trainer?.id ?? null,
  };
}

function formatRelativeDate(value: string | null) {
  if (!value) return "No check-in yet";
  return formatDistanceToNow(new Date(value), { addSuffix: true });
}

function withLegacySessionPackage<T extends Omit<ClientRow, "package_session_limit">>(row: T): ClientRow {
  return {
    ...row,
    package_session_limit: null,
  };
}

async function hydrateClient(row: ClientRow, supabase: Awaited<ReturnType<typeof createClient>>) {
  const [{ count: completedCount }, { count: usedSessions }, { data: activeSession }, { data: latestSession }, { data: latestCheckIn }, { data: latestProgress }] = await Promise.all([
    supabase
      .from("workout_logs")
      .select("*", { count: "exact", head: true })
      .eq("client_id", row.id)
      .eq("status", "completed"),
    supabase
      .from("client_sessions")
      .select("*", { count: "exact", head: true })
      .eq("client_id", row.id)
      .eq("status", "completed"),
    supabase
      .from("client_sessions")
      .select("id")
      .eq("client_id", row.id)
      .eq("status", "active")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle<{ id: string }>(),
    supabase
      .from("client_sessions")
      .select("started_at")
      .eq("client_id", row.id)
      .eq("status", "completed")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle<{ started_at: string }>(),
    supabase
      .from("check_ins")
      .select("submitted_at")
      .eq("client_id", row.id)
      .order("submitted_at", { ascending: false })
      .limit(1)
      .maybeSingle<{ submitted_at: string }>(),
    supabase
      .from("progress_entries")
      .select("body_weight, adherence_percent")
      .eq("client_id", row.id)
      .order("entry_date", { ascending: false })
      .limit(1)
      .maybeSingle<{ body_weight: number | null; adherence_percent: number | null }>(),
  ]);
  const packageTotal = row.package_session_limit;
  const packageUsed = usedSessions ?? 0;

  return {
    id: row.id,
    name: row.full_name,
    email: row.email,
    photo: row.profile_photo_url ?? "",
    goals: row.goals ?? "Goals not set yet.",
    level:
      row.fitness_level === "Advanced"
        ? "Advanced"
        : row.fitness_level === "Intermediate"
          ? "Intermediate"
          : "Foundation",
    injuries: row.injuries_limitations ?? "No limitations recorded.",
    notes: row.notes ?? "No trainer notes yet.",
    style: row.preferred_training_style ?? "Training style not specified.",
    availability: row.availability ?? "Availability not specified.",
    startDate: row.start_date ?? "",
    status: row.status,
    accessStatus: row.profile_id ? "account_active" : row.invite_sent_at ? "invite_pending" : "not_invited",
    inviteSentAt: row.invite_sent_at
      ? new Date(row.invite_sent_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })
      : null,
    pricingTier: normalizePricingTier(row.pricing_tier),
    sessionPackage: {
      total: packageTotal,
      used: packageUsed,
      remaining: packageTotal === null ? null : Math.max(packageTotal - packageUsed, 0),
      activeSessionId: activeSession?.id ?? null,
      lastSessionAt: latestSession?.started_at
        ? new Date(latestSession.started_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })
        : null,
    },
    adherence: Math.round(latestProgress?.adherence_percent ?? 0),
    metrics: {
      bodyWeight: latestProgress?.body_weight ? `${latestProgress.body_weight} lb` : "—",
      workouts: completedCount ?? 0,
      streak: 0,
      lastCheckIn: formatRelativeDate(latestCheckIn?.submitted_at ?? null),
    },
  } satisfies Client;
}

function toClientSession(row: ClientSessionRow): ClientSession {
  return {
    id: row.id,
    clientId: row.client_id,
    startedAtIso: row.started_at,
    startedAt: new Date(row.started_at).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }),
    completedAtIso: row.completed_at,
    completedAt: row.completed_at
      ? new Date(row.completed_at).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })
      : null,
    status: row.status,
    location: row.location ?? "",
    notes: row.notes ?? "",
    durationMinutes: row.duration_minutes,
    createdBy: row.created_by,
  };
}

export async function getTrainerClients() {
  if (!isSupabaseConfigured()) {
    return { mode: "demo" as const, clients: demoClients };
  }

  const { supabase, trainerId } = await getTrainerContext();
  if (!trainerId) {
    return { mode: "supabase" as const, clients: [] as Client[] };
  }

  const { data } = await supabase
    .from("clients")
    .select(clientSelect)
    .eq("trainer_id", trainerId)
    .order("created_at", { ascending: false });
  let rows = (data ?? []) as ClientRow[];

  if (!rows.length) {
    const { data: legacyRows } = await supabase
      .from("clients")
      .select(legacyClientSelect)
      .eq("trainer_id", trainerId)
      .order("created_at", { ascending: false });
    rows = (legacyRows ?? []).map((row) => withLegacySessionPackage(row as Omit<ClientRow, "package_session_limit">));
  }

  const hydrated = await Promise.all(rows.map((row) => hydrateClient(row, supabase)));
  return { mode: "supabase" as const, clients: hydrated };
}

export async function getTrainerClientProfile(id: string) {
  if (!isSupabaseConfigured()) {
    const client = demoClients.find((item) => item.id === id) ?? null;
    if (!client) return null;
    return {
      mode: "demo" as const,
      client,
      coachingNotes: [] as CoachingEntry[],
      sessions: demoClientSessions.filter((session) => session.clientId === id),
      assignedPlan: plans[0],
    };
  }

  const { supabase, trainerId } = await getTrainerContext();
  if (!trainerId) return null;

  const { data: row } = await supabase
    .from("clients")
    .select(clientSelect)
    .eq("trainer_id", trainerId)
    .eq("id", id)
    .maybeSingle<ClientRow>();

  let clientRow = row;
  if (!clientRow) {
    const { data: legacyRow } = await supabase
      .from("clients")
      .select(legacyClientSelect)
      .eq("trainer_id", trainerId)
      .eq("id", id)
      .maybeSingle<Omit<ClientRow, "package_session_limit">>();
    clientRow = legacyRow ? withLegacySessionPackage(legacyRow) : null;
  }

  if (!clientRow) return null;

  const [client, notesResponse, sessionsResponse, assignmentResponse] = await Promise.all([
    hydrateClient(clientRow, supabase),
    supabase
      .from("messages")
      .select("id, body, created_at")
      .eq("trainer_id", trainerId)
      .eq("client_id", id)
      .eq("kind", "coaching_note")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("client_sessions")
      .select("id, client_id, started_at, completed_at, status, location, notes, duration_minutes, created_by")
      .eq("client_id", id)
      .order("started_at", { ascending: false })
      .limit(8),
    supabase
      .from("plan_assignments")
      .select("training_plans(id, title, description, goal, weekly_structure, notes, duration_weeks)")
      .eq("client_id", id)
      .eq("status", "active")
      .order("assigned_at", { ascending: false })
      .limit(1)
      .maybeSingle<PlanRow>(),
  ]);

  const coachingNotes: CoachingEntry[] = (notesResponse.data ?? []).map((note: MessageRow) => ({
    id: note.id,
    body: note.body,
    createdAt: new Date(note.created_at).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }),
  }));
  const sessions = ((sessionsResponse.data ?? []) as ClientSessionRow[]).map(toClientSession);

  const assignedPlanRow = assignmentResponse.data?.training_plans;
  const assignedPlan: Plan =
    assignedPlanRow
      ? {
          id: assignedPlanRow.id,
          title: assignedPlanRow.title,
          description: assignedPlanRow.description ?? "",
          duration: assignedPlanRow.duration_weeks ? `${assignedPlanRow.duration_weeks} weeks` : "Custom duration",
          goal: assignedPlanRow.goal ?? "",
          weeklyStructure: assignedPlanRow.weekly_structure ?? "",
          notes: assignedPlanRow.notes ?? "",
          template: false,
          assignedClients: [id],
          workouts: [],
        }
      : plans[0];

  return {
    mode: "supabase" as const,
    client,
    coachingNotes,
    sessions,
    assignedPlan,
  };
}

export async function getClientSelfProfile() {
  if (!isSupabaseConfigured()) {
    const client = demoClients[0];
    return {
      mode: "demo" as const,
      client,
      sessions: demoClientSessions.filter((session) => session.clientId === client.id),
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { mode: "supabase" as const, client: null as Client | null, sessions: [] as ClientSession[] };
  }

  const { data: row } = await supabase
    .from("clients")
    .select(clientSelect)
    .eq("profile_id", user.id)
    .maybeSingle<ClientRow>();

  let clientRow = row;
  if (!clientRow) {
    const { data: legacyRow } = await supabase
      .from("clients")
      .select(legacyClientSelect)
      .eq("profile_id", user.id)
      .maybeSingle<Omit<ClientRow, "package_session_limit">>();
    clientRow = legacyRow ? withLegacySessionPackage(legacyRow) : null;
  }

  if (!clientRow) {
    return { mode: "supabase" as const, client: null as Client | null, sessions: [] as ClientSession[] };
  }

  const [client, sessionsResponse] = await Promise.all([
    hydrateClient(clientRow, supabase),
    supabase
      .from("client_sessions")
      .select("id, client_id, started_at, completed_at, status, location, notes, duration_minutes, created_by")
      .eq("client_id", clientRow.id)
      .order("started_at", { ascending: false })
      .limit(8),
  ]);

  return {
    mode: "supabase" as const,
    client,
    sessions: ((sessionsResponse.data ?? []) as ClientSessionRow[]).map(toClientSession),
  };
}
