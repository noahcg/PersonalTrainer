import { resources as demoResources } from "@/lib/demo-data";
import { isSupabaseConfigured } from "@/lib/auth-server";
import { createClient } from "@/lib/supabase-server";
import type { Resource } from "@/lib/types";

type ResourceRow = {
  id: string;
  trainer_id: string;
  title: string;
  description: string | null;
  resource_type: string;
  url: string | null;
  content: string | null;
  tags: string[] | null;
  audience: string;
  updated_at: string;
};

function parseAudience(audience: string) {
  if (audience === "all") {
    return { audience: "all" as const, assignedClientIds: [] as string[] };
  }

  if (audience.startsWith("client:")) {
    return {
      audience: "personal" as const,
      assignedClientIds: [audience.replace("client:", "")].filter(Boolean),
    };
  }

  return { audience: "all" as const, assignedClientIds: [] as string[] };
}

function formatUpdatedAt(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function mapResource(row: ResourceRow, clientsById: Map<string, string>) {
  const parsedAudience = parseAudience(row.audience);

  return {
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    type: row.resource_type,
    url: row.url ?? "",
    content: row.content ?? "",
    tags: row.tags ?? [],
    audience: parsedAudience.audience,
    assignedClientIds: parsedAudience.assignedClientIds,
    assignedClientNames: parsedAudience.assignedClientIds
      .map((clientId) => clientsById.get(clientId))
      .filter((name): name is string => Boolean(name)),
    estimatedTime: row.resource_type.toLowerCase() === "video" ? "Watch when needed" : "Read when needed",
    updatedAt: formatUpdatedAt(row.updated_at),
  } satisfies Resource;
}

async function getContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      supabase,
      trainerId: null,
      clientId: null,
    };
  }

  const [{ data: trainer }, { data: client }] = await Promise.all([
    supabase.from("trainers").select("id").eq("profile_id", user.id).maybeSingle<{ id: string }>(),
    supabase.from("clients").select("id, trainer_id").eq("profile_id", user.id).maybeSingle<{ id: string; trainer_id: string }>(),
  ]);

  return {
    supabase,
    trainerId: trainer?.id ?? client?.trainer_id ?? null,
    clientId: client?.id ?? null,
  };
}

export async function getTrainerResources() {
  if (!isSupabaseConfigured()) {
    return { mode: "demo" as const, resources: demoResources };
  }

  const { supabase, trainerId } = await getContext();
  if (!trainerId) {
    return { mode: "supabase" as const, resources: [] as Resource[] };
  }

  const [{ data: resourceRows }, { data: clientRows }] = await Promise.all([
    supabase
      .from("resources")
      .select("id, trainer_id, title, description, resource_type, url, content, tags, audience, updated_at")
      .eq("trainer_id", trainerId)
      .order("updated_at", { ascending: false }),
    supabase.from("clients").select("id, full_name").eq("trainer_id", trainerId),
  ]);

  const clientsById = new Map((clientRows ?? []).map((client) => [client.id, client.full_name]));
  return {
    mode: "supabase" as const,
    resources: (resourceRows ?? []).map((row) => mapResource(row as ResourceRow, clientsById)),
  };
}

export async function getTrainerResourceById(id: string) {
  if (!isSupabaseConfigured()) {
    return demoResources.find((resource) => resource.id === id) ?? null;
  }

  const { supabase, trainerId } = await getContext();
  if (!trainerId) return null;

  const [{ data: resourceRow }, { data: clientRows }] = await Promise.all([
    supabase
      .from("resources")
      .select("id, trainer_id, title, description, resource_type, url, content, tags, audience, updated_at")
      .eq("trainer_id", trainerId)
      .eq("id", id)
      .maybeSingle<ResourceRow>(),
    supabase.from("clients").select("id, full_name").eq("trainer_id", trainerId),
  ]);

  if (!resourceRow) return null;
  const clientsById = new Map((clientRows ?? []).map((client) => [client.id, client.full_name]));
  return mapResource(resourceRow, clientsById);
}

export async function getClientResources() {
  if (!isSupabaseConfigured()) {
    return { mode: "demo" as const, resources: demoResources.filter((resource) => resource.audience === "all") };
  }

  const { supabase, trainerId, clientId } = await getContext();
  if (!trainerId || !clientId) {
    return { mode: "supabase" as const, resources: [] as Resource[] };
  }

  const [{ data: resourceRows }, { data: clientRows }] = await Promise.all([
    supabase
      .from("resources")
      .select("id, trainer_id, title, description, resource_type, url, content, tags, audience, updated_at")
      .eq("trainer_id", trainerId)
      .order("updated_at", { ascending: false }),
    supabase.from("clients").select("id, full_name").eq("trainer_id", trainerId),
  ]);

  const clientsById = new Map((clientRows ?? []).map((client) => [client.id, client.full_name]));
  const resources = (resourceRows ?? [])
    .map((row) => mapResource(row as ResourceRow, clientsById))
    .filter((resource) => resource.audience === "all" || resource.assignedClientIds.includes(clientId));

  return { mode: "supabase" as const, resources };
}
