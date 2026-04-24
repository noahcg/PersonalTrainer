import { checkIns as demoCheckIns } from "@/lib/demo-data";
import { isSupabaseConfigured } from "@/lib/auth-server";
import { createClient } from "@/lib/supabase-server";
import type { CheckIn } from "@/lib/types";

type ClientRow = {
  id: string;
  trainer_id: string;
  profile_id: string | null;
  full_name: string;
};

type CheckInRow = {
  id: string;
  client_id: string;
  submitted_at: string;
  energy: number | null;
  soreness: number | null;
  sleep: number | null;
  stress: number | null;
  motivation: number | null;
  mood: string | null;
  notes: string | null;
  reviewed_at: string | null;
  trainer_response: string | null;
};

function formatCheckInDate(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

async function getContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, trainerId: null, clientRow: null as ClientRow | null };
  }

  const [{ data: trainer }, { data: clientRow }] = await Promise.all([
    supabase.from("trainers").select("id").eq("profile_id", user.id).maybeSingle<{ id: string }>(),
    supabase.from("clients").select("id, trainer_id, profile_id, full_name").eq("profile_id", user.id).maybeSingle<ClientRow>(),
  ]);

  return {
    supabase,
    trainerId: trainer?.id ?? clientRow?.trainer_id ?? null,
    clientRow: clientRow ?? null,
  };
}

function mapCheckIn(row: CheckInRow, clientName: string): CheckIn {
  return {
    id: row.id,
    clientId: row.client_id,
    client: clientName,
    date: formatCheckInDate(row.submitted_at),
    energy: row.energy ?? 0,
    soreness: row.soreness ?? 0,
    sleep: row.sleep ?? 0,
    stress: row.stress ?? 0,
    motivation: row.motivation ?? 0,
    mood: row.mood ?? "",
    notes: row.notes ?? "",
    reviewed: Boolean(row.reviewed_at),
    trainerResponse: row.trainer_response ?? "",
    reviewedAt: row.reviewed_at ? formatCheckInDate(row.reviewed_at) : undefined,
  };
}

export async function getTrainerCheckInData() {
  if (!isSupabaseConfigured()) {
    return { mode: "demo" as const, checkIns: demoCheckIns };
  }

  const { supabase, trainerId } = await getContext();
  if (!trainerId) {
    return { mode: "supabase" as const, checkIns: [] as CheckIn[] };
  }

  const { data: clientRows } = await supabase
    .from("clients")
    .select("id, trainer_id, profile_id, full_name")
    .eq("trainer_id", trainerId);

  const clients = clientRows ?? [];
  if (!clients.length) {
    return { mode: "supabase" as const, checkIns: [] as CheckIn[] };
  }

  const { data: rows } = await supabase
    .from("check_ins")
    .select("id, client_id, submitted_at, energy, soreness, sleep, stress, motivation, mood, notes, reviewed_at, trainer_response")
    .in("client_id", clients.map((client) => client.id))
    .order("submitted_at", { ascending: false });

  const namesByClientId = new Map(clients.map((client) => [client.id, client.full_name]));
  return {
    mode: "supabase" as const,
    checkIns: (rows ?? []).map((row) => mapCheckIn(row as CheckInRow, namesByClientId.get((row as CheckInRow).client_id) ?? "Client")),
  };
}

export async function getClientCheckInData() {
  if (!isSupabaseConfigured()) {
    return { mode: "demo" as const, checkIns: demoCheckIns.filter((checkIn) => checkIn.clientId === demoCheckIns[0]?.clientId) };
  }

  const { supabase, clientRow } = await getContext();
  if (!clientRow) {
    return { mode: "supabase" as const, checkIns: [] as CheckIn[] };
  }

  const { data: rows } = await supabase
    .from("check_ins")
    .select("id, client_id, submitted_at, energy, soreness, sleep, stress, motivation, mood, notes, reviewed_at, trainer_response")
    .eq("client_id", clientRow.id)
    .order("submitted_at", { ascending: false });

  return {
    mode: "supabase" as const,
    checkIns: (rows ?? []).map((row) => mapCheckIn(row as CheckInRow, clientRow.full_name)),
  };
}
