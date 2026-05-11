import { NextResponse } from "next/server";
import { createAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase-server";
import type { TrainingPackageKind } from "@/lib/types";

type PackageTypePayload = {
  id?: string;
  kind?: TrainingPackageKind;
  name?: string;
  sessionCount?: number | null;
  priceCents?: number | null;
  currency?: string;
  billingTerms?: string;
  policyNotes?: string;
  internalNotes?: string;
  defaultLocation?: string;
  defaultSchedule?: string;
  active?: boolean;
};

const kinds: TrainingPackageKind[] = ["one_on_one", "partner_training"];

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

async function getTrainerId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: trainer } = await supabase
    .from("trainers")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle<{ id: string }>();

  return trainer?.id ?? null;
}

function rowFromPayload(payload: PackageTypePayload, trainerId: string) {
  const name = clean(payload.name);
  if (!name) throw new Error("Package type name is required.");

  return {
    trainer_id: trainerId,
    kind: kinds.includes(payload.kind as TrainingPackageKind) ? payload.kind : "one_on_one",
    name,
    session_count:
      typeof payload.sessionCount === "number" && Number.isFinite(payload.sessionCount)
        ? Math.max(Math.round(payload.sessionCount), 0)
        : null,
    price_cents:
      typeof payload.priceCents === "number" && Number.isFinite(payload.priceCents)
        ? Math.max(Math.round(payload.priceCents), 0)
        : null,
    currency: clean(payload.currency) || "USD",
    billing_terms: clean(payload.billingTerms) || null,
    policy_notes: clean(payload.policyNotes) || null,
    internal_notes: clean(payload.internalNotes) || null,
    default_location: clean(payload.defaultLocation) || null,
    default_schedule: clean(payload.defaultSchedule) || null,
    active: payload.active ?? true,
    updated_at: new Date().toISOString(),
  };
}

export async function POST(request: Request) {
  try {
    if (!hasSupabaseAdminEnv()) return NextResponse.json({ error: "Supabase admin credentials are not configured." }, { status: 500 });
    const trainerId = await getTrainerId();
    if (!trainerId) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const payload = (await request.json()) as PackageTypePayload;
    const admin = createAdminClient();
    const row = rowFromPayload(payload, trainerId);

    const { data, error } = await admin.from("training_package_types").insert(row).select("id").single<{ id: string }>();
    if (error || !data?.id) throw error ?? new Error("Unable to create package type.");

    return NextResponse.json({ ok: true, id: data.id });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to save package type." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    if (!hasSupabaseAdminEnv()) return NextResponse.json({ error: "Supabase admin credentials are not configured." }, { status: 500 });
    const trainerId = await getTrainerId();
    if (!trainerId) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const payload = (await request.json()) as PackageTypePayload;
    const id = clean(payload.id);
    if (!id) return NextResponse.json({ error: "Package type id is required." }, { status: 400 });

    const admin = createAdminClient();
    const row = rowFromPayload(payload, trainerId);
    const { error } = await admin.from("training_package_types").update(row).eq("id", id).eq("trainer_id", trainerId);
    if (error) throw error;

    return NextResponse.json({ ok: true, id });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to save package type." }, { status: 500 });
  }
}
