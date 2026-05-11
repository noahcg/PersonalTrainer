import { NextResponse } from "next/server";
import { createAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase-server";
import type { Client, PricingTier } from "@/lib/types";

type OneOnOneSignupPayload = {
  client?: {
    name?: string;
    email?: string;
    level?: Client["level"];
    notes?: string;
    style?: string;
    availability?: string;
  };
  pricingTier?: PricingTier;
  totalSessions?: number | null;
  packageNotes?: string;
  packageTypeId?: string;
};

const levels: Array<Client["level"]> = ["Foundation", "Intermediate", "Advanced"];
const pricingTiers: PricingTier[] = ["intro_session", "ongoing_coaching", "high_touch_coaching"];

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanEmail(value: unknown) {
  return clean(value).toLowerCase();
}

export async function POST(request: Request) {
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

    if (!trainer?.id) return NextResponse.json({ error: "Trainer profile not found." }, { status: 403 });

    const trainerId = trainer.id;
    const payload = (await request.json()) as OneOnOneSignupPayload;
    const client = {
      name: clean(payload.client?.name),
      email: cleanEmail(payload.client?.email),
      level: levels.includes(payload.client?.level as Client["level"]) ? (payload.client?.level as Client["level"]) : "Foundation",
      notes: clean(payload.client?.notes),
      style: clean(payload.client?.style),
      availability: clean(payload.client?.availability),
    };
    const pricingTier = pricingTiers.includes(payload.pricingTier as PricingTier)
      ? (payload.pricingTier as PricingTier)
      : "ongoing_coaching";
    const totalSessions =
      typeof payload.totalSessions === "number" && Number.isFinite(payload.totalSessions)
        ? Math.max(Math.round(payload.totalSessions), 0)
        : null;

    if (!client.name || !client.email) {
      return NextResponse.json({ error: "Client name and email are required." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: packageType } = clean(payload.packageTypeId)
      ? await admin
          .from("training_package_types")
          .select("id, name, session_count, price_cents, currency, billing_terms, policy_notes, internal_notes, default_location, default_schedule")
          .eq("id", clean(payload.packageTypeId))
          .eq("trainer_id", trainerId)
          .eq("kind", "one_on_one")
          .maybeSingle<{
            id: string;
            name: string;
            session_count: number | null;
            price_cents: number | null;
            currency: string | null;
            billing_terms: string | null;
            policy_notes: string | null;
            internal_notes: string | null;
            default_location: string | null;
            default_schedule: string | null;
          }>()
      : { data: null };
    const resolvedTotalSessions = totalSessions ?? packageType?.session_count ?? null;

    const { data: existing, error: lookupError } = await admin
      .from("clients")
      .select("id")
      .eq("trainer_id", trainerId)
      .eq("email", client.email)
      .maybeSingle<{ id: string }>();

    if (lookupError) throw lookupError;
    if (existing?.id) {
      return NextResponse.json({ error: "A client with that email already exists on your roster." }, { status: 409 });
    }

    const { data: inserted, error: insertError } = await admin
      .from("clients")
      .insert({
        trainer_id: trainerId,
        full_name: client.name,
        email: client.email,
        goals: null,
        fitness_level: client.level,
        injuries_limitations: null,
        notes: client.notes || null,
        preferred_training_style: client.style || null,
        availability: client.availability || packageType?.default_schedule || null,
        pricing_tier: pricingTier,
        package_session_limit: resolvedTotalSessions,
        start_date: new Date().toISOString().slice(0, 10),
        status: "active",
      })
      .select("id")
      .single<{ id: string }>();

    if (insertError || !inserted?.id) throw insertError ?? new Error("Unable to create client.");

    const { data: packageRow, error: packageError } = await admin
      .from("training_packages")
      .insert({
        trainer_id: trainerId,
        kind: "one_on_one",
        title: packageType?.name ? `${client.name} - ${packageType.name}` : `${client.name} one-on-one`,
        total_sessions: resolvedTotalSessions,
        status: "pending",
        price_cents: packageType?.price_cents ?? null,
        currency: packageType?.currency ?? "USD",
        billing_terms: packageType?.billing_terms ?? null,
        shared_location: packageType?.default_location ?? null,
        shared_schedule: client.availability || packageType?.default_schedule || null,
        policy_notes: clean(payload.packageNotes) || packageType?.policy_notes || null,
        internal_notes: client.notes || packageType?.internal_notes || null,
        started_on: new Date().toISOString().slice(0, 10),
      })
      .select("id")
      .single<{ id: string }>();

    if (packageError || !packageRow?.id) {
      throw packageError ?? new Error("Unable to create one-on-one package.");
    }

    const { error: memberError } = await admin.from("training_package_members").insert({
      training_package_id: packageRow.id,
      client_id: inserted.id,
    });

    if (memberError) throw memberError;

    return NextResponse.json({
      ok: true,
      clientId: inserted.id,
      packageId: packageRow.id,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create one-on-one signup." },
      { status: 500 },
    );
  }
}
