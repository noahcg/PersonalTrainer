import { bulletins as demoBulletins } from "@/lib/demo-data";
import { isSupabaseConfigured } from "@/lib/auth-server";
import { createClient } from "@/lib/supabase-server";
import type { BulletinPost } from "@/lib/types";

type BulletinRow = {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  post_type: "announcement" | "session";
  requires_rsvp: boolean;
  session_starts_at: string | null;
  session_location: string | null;
  session_capacity: number | null;
  published_at: string;
};

type BulletinRsvpRow = {
  bulletin_post_id: string;
  client_id: string;
  full_name?: string;
  status: "attending" | "not_attending";
};

type BulletinRsvpQueryRow = {
  bulletin_post_id: string;
  client_id: string;
  status: "attending" | "not_attending";
  clients?: { full_name: string }[] | { full_name: string } | null;
};

async function getContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { supabase, trainerId: null, clientId: null };

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

function mapBulletin(
  row: BulletinRow,
  rsvps: BulletinRsvpRow[] = [],
  clientId: string | null = null,
): BulletinPost {
  const relevant = rsvps.filter((rsvp) => rsvp.bulletin_post_id === row.id);
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    author: "Coach Avery",
    publishedAt: new Date(row.published_at).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }),
    pinned: row.pinned,
    postType: row.post_type,
    requiresRsvp: row.requires_rsvp,
    sessionStartsAt: row.session_starts_at,
    sessionLocation: row.session_location,
    sessionCapacity: row.session_capacity,
    clientRsvp: clientId ? relevant.find((rsvp) => rsvp.client_id === clientId)?.status ?? null : null,
    rsvpSummary: {
      attending: relevant.filter((rsvp) => rsvp.status === "attending").length,
      notAttending: relevant.filter((rsvp) => rsvp.status === "not_attending").length,
    },
    rsvps: relevant.map((rsvp) => ({
      clientId: rsvp.client_id,
      clientName: rsvp.full_name ?? "Client",
      status: rsvp.status,
    })),
  };
}

function normalizeRsvps(rows: BulletinRsvpQueryRow[] = []): BulletinRsvpRow[] {
  return rows.map((rsvp) => ({
    bulletin_post_id: rsvp.bulletin_post_id,
    client_id: rsvp.client_id,
    full_name: Array.isArray(rsvp.clients) ? rsvp.clients[0]?.full_name : rsvp.clients?.full_name,
    status: rsvp.status,
  }));
}

export async function getTrainerBulletins() {
  if (!isSupabaseConfigured()) {
    return { mode: "demo" as const, bulletins: demoBulletins };
  }

  const { supabase, trainerId } = await getContext();
  if (!trainerId) return { mode: "supabase" as const, bulletins: [] as BulletinPost[] };

  const [{ data, error }, { data: rsvps }] = await Promise.all([
    supabase
    .from("bulletin_posts")
    .select("id, title, body, pinned, post_type, requires_rsvp, session_starts_at, session_location, session_capacity, published_at")
    .eq("trainer_id", trainerId)
    .order("pinned", { ascending: false })
    .order("published_at", { ascending: false }),
    supabase.from("bulletin_rsvps").select("bulletin_post_id, client_id, status, clients(full_name)"),
  ]);

  // Older Supabase projects may not have the session-invite bulletin columns yet.
  if (error) {
    const { data: legacyData } = await supabase
      .from("bulletin_posts")
      .select("id, title, body, pinned, requires_rsvp, published_at")
      .eq("trainer_id", trainerId)
      .order("pinned", { ascending: false })
      .order("published_at", { ascending: false });

    return {
      mode: "supabase" as const,
      bulletins: (legacyData ?? []).map((row) =>
        mapBulletin(
          {
            ...(row as Omit<BulletinRow, "post_type" | "session_starts_at" | "session_location" | "session_capacity">),
            post_type: "announcement",
            session_starts_at: null,
            session_location: null,
            session_capacity: null,
          },
          normalizeRsvps((rsvps ?? []) as BulletinRsvpQueryRow[]),
        ),
      ),
    };
  }

  return {
    mode: "supabase" as const,
    bulletins: (data ?? []).map((row) => mapBulletin(row as BulletinRow, normalizeRsvps((rsvps ?? []) as BulletinRsvpQueryRow[]))),
  };
}

export async function getClientBulletins() {
  if (!isSupabaseConfigured()) {
    return { mode: "demo" as const, bulletins: demoBulletins };
  }

  const { supabase, trainerId, clientId } = await getContext();
  if (!trainerId) return { mode: "supabase" as const, bulletins: [] as BulletinPost[] };

  const [{ data, error }, { data: rsvps }] = await Promise.all([
    supabase
      .from("bulletin_posts")
      .select("id, title, body, pinned, post_type, requires_rsvp, session_starts_at, session_location, session_capacity, published_at")
      .eq("trainer_id", trainerId)
      .order("pinned", { ascending: false })
      .order("published_at", { ascending: false }),
    supabase.from("bulletin_rsvps").select("bulletin_post_id, client_id, status, clients(full_name)"),
  ]);

  if (error) {
    const { data: legacyData } = await supabase
      .from("bulletin_posts")
      .select("id, title, body, pinned, requires_rsvp, published_at")
      .eq("trainer_id", trainerId)
      .order("pinned", { ascending: false })
      .order("published_at", { ascending: false });

    return {
      mode: "supabase" as const,
      bulletins: (legacyData ?? []).map((row) =>
        mapBulletin(
          {
            ...(row as Omit<BulletinRow, "post_type" | "session_starts_at" | "session_location" | "session_capacity">),
            post_type: "announcement",
            session_starts_at: null,
            session_location: null,
            session_capacity: null,
          },
          normalizeRsvps((rsvps ?? []) as BulletinRsvpQueryRow[]),
          clientId,
        ),
      ),
    };
  }

  return {
    mode: "supabase" as const,
    bulletins: (data ?? []).map((row) => mapBulletin(row as BulletinRow, normalizeRsvps((rsvps ?? []) as BulletinRsvpQueryRow[]), clientId)),
  };
}
