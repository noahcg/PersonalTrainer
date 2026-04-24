import { brand } from "@/lib/brand";
import { clients as demoClients, messages as demoMessages } from "@/lib/demo-data";
import { isSupabaseConfigured } from "@/lib/auth-server";
import { createClient } from "@/lib/supabase-server";
import type { ClientStatus, ConversationParticipant, Message } from "@/lib/types";

type ClientRow = {
  id: string;
  trainer_id: string;
  profile_id: string | null;
  full_name: string;
  profile_photo_url: string | null;
  status?: ClientStatus;
};

function formatMessageTimestamp(value: string) {
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
    return { supabase, user: null, trainerId: null, clientRow: null as ClientRow | null };
  }

  const [{ data: trainer }, { data: clientRow }] = await Promise.all([
    supabase.from("trainers").select("id").eq("profile_id", user.id).maybeSingle<{ id: string }>(),
    supabase
      .from("clients")
      .select("id, trainer_id, profile_id, full_name, profile_photo_url, status")
      .eq("profile_id", user.id)
      .maybeSingle<ClientRow>(),
  ]);

  return {
    supabase,
    user,
    trainerId: trainer?.id ?? clientRow?.trainer_id ?? null,
    clientRow: clientRow ?? null,
  };
}

function toParticipant(row: ClientRow): ConversationParticipant {
  return {
    id: row.id,
    name: row.full_name,
    photo: row.profile_photo_url ?? "",
  };
}

export async function getTrainerConversationData() {
  if (!isSupabaseConfigured()) {
    return {
      mode: "demo" as const,
      participants: demoClients.map((client) => ({ id: client.id, name: client.name, photo: client.photo })),
      messages: demoMessages,
    };
  }

  const { supabase, trainerId } = await getContext();
  if (!trainerId) {
    return { mode: "supabase" as const, participants: [] as ConversationParticipant[], messages: [] as Message[] };
  }

  const [{ data: clientRows }, { data: messageRows }] = await Promise.all([
    supabase
      .from("clients")
      .select("id, trainer_id, profile_id, full_name, profile_photo_url, status")
      .eq("trainer_id", trainerId)
      .order("created_at", { ascending: false }),
    supabase
      .from("messages")
      .select("id, client_id, sender_profile_id, body, created_at")
      .eq("trainer_id", trainerId)
      .eq("kind", "message")
      .order("created_at", { ascending: true }),
  ]);

  const clientsById = new Map((clientRows ?? []).map((row) => [row.id, row as ClientRow]));

  const messages: Message[] = (messageRows ?? []).map((row) => {
    const client = clientsById.get(row.client_id);
    const from = row.sender_profile_id && client?.profile_id && row.sender_profile_id === client.profile_id ? "client" : "trainer";
    return {
      id: row.id,
      from,
      author: from === "client" ? client?.full_name ?? "Client" : brand.app.trainerLabel,
      body: row.body,
      createdAt: formatMessageTimestamp(row.created_at),
      clientId: row.client_id,
      clientName: client?.full_name ?? "Client",
    };
  });

  return {
    mode: "supabase" as const,
    participants: (clientRows ?? []).map((row) => toParticipant(row as ClientRow)),
    messages,
  };
}

export async function getClientConversationData() {
  if (!isSupabaseConfigured()) {
    const client = demoClients[0];
    return {
      mode: "demo" as const,
      participant: { id: client.id, name: client.name, photo: client.photo },
      messages: demoMessages.filter((message) => message.clientId === client.id),
    };
  }

  const { supabase, user, trainerId, clientRow } = await getContext();
  if (!trainerId || !user || !clientRow) {
    return {
      mode: "supabase" as const,
      participant: null as ConversationParticipant | null,
      messages: [] as Message[],
    };
  }

  const { data: messageRows } = await supabase
    .from("messages")
    .select("id, client_id, sender_profile_id, body, created_at")
    .eq("trainer_id", trainerId)
    .eq("client_id", clientRow.id)
    .eq("kind", "message")
    .order("created_at", { ascending: true });

  const messages: Message[] = (messageRows ?? []).map((row) => {
    const from = row.sender_profile_id === user.id ? "client" : "trainer";
    return {
      id: row.id,
      from,
      author: from === "client" ? clientRow.full_name : brand.app.trainerLabel,
      body: row.body,
      createdAt: formatMessageTimestamp(row.created_at),
      clientId: clientRow.id,
      clientName: clientRow.full_name,
    };
  });

  return {
    mode: "supabase" as const,
    participant: toParticipant(clientRow),
    messages,
  };
}
