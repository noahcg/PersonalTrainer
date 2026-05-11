import { NextResponse } from "next/server";
import { createAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase-server";

type PartnerSignupPayload = {
  clientA?: { name?: string; email?: string };
  clientB?: { name?: string; email?: string };
  totalSessions?: number | null;
  sharedLocation?: string;
  sharedSchedule?: string;
  policyNotes?: string;
  internalNotes?: string;
  packageTypeId?: string;
};

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
    const payload = (await request.json()) as PartnerSignupPayload;
    const clientA = { name: clean(payload.clientA?.name), email: cleanEmail(payload.clientA?.email) };
    const clientB = { name: clean(payload.clientB?.name), email: cleanEmail(payload.clientB?.email) };
    const totalSessions =
      typeof payload.totalSessions === "number" && Number.isFinite(payload.totalSessions)
        ? Math.max(Math.round(payload.totalSessions), 0)
        : null;

    if (!clientA.name || !clientA.email || !clientB.name || !clientB.email) {
      return NextResponse.json({ error: "Both partner names and emails are required." }, { status: 400 });
    }

    if (clientA.email === clientB.email) {
      return NextResponse.json({ error: "Partner training requires two different client emails." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: packageType } = clean(payload.packageTypeId)
      ? await admin
          .from("training_package_types")
          .select("id, name, session_count, price_cents, currency, billing_terms, policy_notes, internal_notes, default_location, default_schedule")
          .eq("id", clean(payload.packageTypeId))
          .eq("trainer_id", trainerId)
          .eq("kind", "partner_training")
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

    async function upsertClient(client: { name: string; email: string }) {
      const { data: existing, error: lookupError } = await admin
        .from("clients")
        .select("id")
        .eq("trainer_id", trainerId)
        .eq("email", client.email)
        .maybeSingle<{ id: string }>();

      if (lookupError) throw lookupError;
      if (existing?.id) return existing.id;

      const { data: inserted, error: insertError } = await admin
        .from("clients")
        .insert({
          trainer_id: trainerId,
          full_name: client.name,
          email: client.email,
          goals: null,
          fitness_level: "Foundation",
          injuries_limitations: null,
          notes: null,
          preferred_training_style: "Partner training",
          availability: clean(payload.sharedSchedule) || null,
          pricing_tier: "ongoing_coaching",
          package_session_limit: null,
          start_date: new Date().toISOString().slice(0, 10),
          status: "active",
        })
        .select("id")
        .single<{ id: string }>();

      if (insertError || !inserted?.id) throw insertError ?? new Error("Unable to create client.");
      return inserted.id;
    }

    const [clientAId, clientBId] = await Promise.all([upsertClient(clientA), upsertClient(clientB)]);
    const title = `${clientA.name} + ${clientB.name}`;
    const { data: packageRow, error: packageError } = await admin
      .from("training_packages")
      .insert({
        trainer_id: trainerId,
        kind: "partner_training",
        title: packageType?.name ? `${title} - ${packageType.name}` : title,
        total_sessions: resolvedTotalSessions,
        status: "pending",
        price_cents: packageType?.price_cents ?? null,
        currency: packageType?.currency ?? "USD",
        billing_terms: packageType?.billing_terms ?? null,
        shared_location: clean(payload.sharedLocation) || packageType?.default_location || null,
        shared_schedule: clean(payload.sharedSchedule) || packageType?.default_schedule || null,
        policy_notes:
          clean(payload.policyNotes) ||
          packageType?.policy_notes ||
          "Shared appointments are reserved for two named clients. If one partner cannot attend inside the cancellation window, the shared appointment may still count toward the package.",
        internal_notes: clean(payload.internalNotes) || packageType?.internal_notes || null,
        started_on: new Date().toISOString().slice(0, 10),
      })
      .select("id")
      .single<{ id: string }>();

    if (packageError || !packageRow?.id) {
      throw packageError ?? new Error("Unable to create partner package.");
    }

    const { error: memberError } = await admin.from("training_package_members").insert([
      { training_package_id: packageRow.id, client_id: clientAId },
      { training_package_id: packageRow.id, client_id: clientBId },
    ]);

    if (memberError) throw memberError;

    return NextResponse.json({
      ok: true,
      packageId: packageRow.id,
      clientIds: [clientAId, clientBId],
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create partner training signup." },
      { status: 500 },
    );
  }
}
