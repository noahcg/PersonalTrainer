import { NextResponse } from "next/server";
import { formatBulletinLocation, isValidMapUrl, normalizeBulletinLocationDetails } from "@/lib/bulletin-location";
import { createAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase-server";

type BulletinMutationPayload = {
  id?: string | null;
  title?: string;
  body?: string;
  pinned?: boolean;
  postType?: "announcement" | "session";
  requiresRsvp?: boolean;
  sessionStartsAt?: string | null;
  sessionLocationDetails?: unknown;
  sessionCapacity?: number | null;
  reminderEnabled?: boolean;
  reminderMinutesBefore?: number | null;
  reminderAudience?: "attending" | "all";
  reminderTrainerEnabled?: boolean;
};

type SavedBulletinRow = {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  post_type: "announcement" | "session";
  requires_rsvp: boolean;
  session_starts_at: string | null;
  session_location: string | null;
  session_location_details?: unknown;
  session_capacity: number | null;
  published_at: string;
};

export async function POST(request: Request) {
  try {
    if (!hasSupabaseAdminEnv()) {
      return NextResponse.json({ error: "Supabase admin credentials are not configured." }, { status: 500 });
    }

    const payload = (await request.json()) as BulletinMutationPayload;
    const postType = payload.postType ?? "announcement";
    const title = payload.title?.trim() ?? "";
    const body = payload.body?.trim() ?? "";
    const locationDetails = normalizeBulletinLocationDetails(payload.sessionLocationDetails);

    if (!title) return NextResponse.json({ error: "Add a bulletin title." }, { status: 400 });
    if (!body) return NextResponse.json({ error: "Write the bulletin message." }, { status: 400 });
    if (postType === "session" && !payload.sessionStartsAt) {
      return NextResponse.json({ error: "Add the session date and time." }, { status: 400 });
    }
    if (postType === "session" && !locationDetails?.placeName.trim()) {
      return NextResponse.json({ error: "Add the park or place name." }, { status: 400 });
    }
    if (postType === "session" && locationDetails?.mapUrl && !isValidMapUrl(locationDetails.mapUrl)) {
      return NextResponse.json({ error: "Paste a valid map link." }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { data: trainer } = await supabase
      .from("trainers")
      .select("id")
      .eq("profile_id", user.id)
      .maybeSingle<{ id: string }>();

    if (!trainer?.id) {
      return NextResponse.json({ error: "Trainer profile not found." }, { status: 403 });
    }

    const admin = createAdminClient();
    const mutation = {
      title,
      body,
      pinned: Boolean(payload.pinned),
      post_type: postType,
      requires_rsvp: postType === "session" ? true : Boolean(payload.requiresRsvp),
      session_starts_at: postType === "session" && payload.sessionStartsAt ? new Date(payload.sessionStartsAt).toISOString() : null,
      session_location: postType === "session" ? formatBulletinLocation(locationDetails) : null,
      session_location_details: postType === "session" ? locationDetails : null,
      session_capacity: postType === "session" ? payload.sessionCapacity ?? null : null,
    };
    const insertMutation = {
      ...mutation,
      trainer_id: trainer.id,
    };

    const query = payload.id
      ? admin
          .from("bulletin_posts")
          .update(mutation)
          .eq("id", payload.id)
          .eq("trainer_id", trainer.id)
      : admin.from("bulletin_posts").insert(insertMutation);

    const { data: post, error } = await query
      .select("id, title, body, pinned, post_type, requires_rsvp, session_starts_at, session_location, session_location_details, session_capacity, published_at")
      .single<SavedBulletinRow>();

    if (error || !post) {
      console.error("Bulletin save failed", error);
      return NextResponse.json({ error: error?.message ?? "Unable to save bulletin." }, { status: 500 });
    }

    return NextResponse.json({
      post: {
        ...post,
        status: "active",
        reminder_enabled: postType === "session" ? Boolean(payload.reminderEnabled) : false,
        reminder_minutes_before:
          postType === "session" && payload.reminderEnabled ? payload.reminderMinutesBefore ?? null : null,
        reminder_audience: payload.reminderAudience ?? "attending",
        reminder_trainer_enabled: postType === "session" ? Boolean(payload.reminderTrainerEnabled) : false,
      },
    });
  } catch (error) {
    console.error("Bulletin save exception", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to save bulletin." },
      { status: 500 },
    );
  }
}
