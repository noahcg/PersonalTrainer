import { NextResponse } from "next/server";
import { createAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase-server";

type AssignPackagePayload = {
  packageTypeId?: string;
};

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    if (!hasSupabaseAdminEnv()) {
      return NextResponse.json({ error: "Supabase admin credentials are not configured." }, { status: 500 });
    }

    const { id } = await context.params;
    const payload = (await request.json()) as AssignPackagePayload;
    const packageTypeId = clean(payload.packageTypeId);
    if (!packageTypeId) return NextResponse.json({ error: "Package type is required." }, { status: 400 });

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

    const admin = createAdminClient();
    const { data: client, error: clientError } = await admin
      .from("clients")
      .select("id, full_name")
      .eq("id", id)
      .eq("trainer_id", trainer.id)
      .maybeSingle<{ id: string; full_name: string }>();

    if (clientError) throw clientError;
    if (!client) return NextResponse.json({ error: "Client not found." }, { status: 404 });

    const { data: packageType, error: packageTypeError } = await admin
      .from("training_package_types")
      .select("id, kind, name, session_count, price_cents, currency, billing_terms, policy_notes, internal_notes, default_location, default_schedule")
      .eq("id", packageTypeId)
      .eq("trainer_id", trainer.id)
      .eq("active", true)
      .maybeSingle<{
        id: string;
        kind: "one_on_one" | "partner_training";
        name: string;
        session_count: number | null;
        price_cents: number | null;
        currency: string | null;
        billing_terms: string | null;
        policy_notes: string | null;
        internal_notes: string | null;
        default_location: string | null;
        default_schedule: string | null;
      }>();

    if (packageTypeError) throw packageTypeError;
    if (!packageType) return NextResponse.json({ error: "Package type not found." }, { status: 404 });
    if (packageType.kind === "partner_training") {
      return NextResponse.json({ error: "Shared package types must be assigned through a shared signup." }, { status: 400 });
    }

    const { data: existingSharedMemberships, error: sharedError } = await admin
      .from("training_package_members")
      .select("training_packages(id, kind, status)")
      .eq("client_id", client.id);

    if (sharedError) throw sharedError;
    const hasOpenSharedPackage = (existingSharedMemberships ?? []).some((membership) => {
      const trainingPackage = Array.isArray(membership.training_packages)
        ? membership.training_packages[0]
        : membership.training_packages;
      return (
        trainingPackage?.kind === "partner_training" &&
        ["pending", "active", "paused"].includes(trainingPackage.status)
      );
    });

    if (hasOpenSharedPackage) {
      return NextResponse.json({ error: "This client is still in an open shared package. Complete or convert that package first." }, { status: 409 });
    }

    const { data: packageRow, error: packageError } = await admin
      .from("training_packages")
      .insert({
        trainer_id: trainer.id,
        kind: "one_on_one",
        title: `${client.full_name} - ${packageType.name}`,
        total_sessions: packageType.session_count,
        status: "pending",
        price_cents: packageType.price_cents,
        currency: packageType.currency ?? "USD",
        billing_terms: packageType.billing_terms,
        shared_location: packageType.default_location,
        shared_schedule: packageType.default_schedule,
        policy_notes: packageType.policy_notes,
        internal_notes: packageType.internal_notes,
        started_on: new Date().toISOString().slice(0, 10),
      })
      .select("id")
      .single<{ id: string }>();

    if (packageError || !packageRow?.id) throw packageError ?? new Error("Unable to create package.");

    const { error: memberError } = await admin.from("training_package_members").insert({
      training_package_id: packageRow.id,
      client_id: client.id,
    });
    if (memberError) throw memberError;

    const { error: clientUpdateError } = await admin
      .from("clients")
      .update({
        package_session_limit: packageType.session_count,
        preferred_training_style: packageType.name,
        availability: packageType.default_schedule,
      })
      .eq("id", client.id);
    if (clientUpdateError) throw clientUpdateError;

    return NextResponse.json({ ok: true, packageId: packageRow.id, sessionCount: packageType.session_count, packageName: packageType.name });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to assign package." },
      { status: 500 },
    );
  }
}
