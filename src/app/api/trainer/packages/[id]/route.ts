import { NextResponse } from "next/server";
import { createAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase-server";
import type { TrainingPackageStatus } from "@/lib/types";

type PackageUpdatePayload = {
  title?: string;
  totalSessions?: number | null;
  status?: TrainingPackageStatus;
  priceCents?: number | null;
  currency?: string;
  billingTerms?: string;
  sharedLocation?: string;
  sharedSchedule?: string;
  policyNotes?: string;
  internalNotes?: string;
};

const statuses: TrainingPackageStatus[] = ["pending", "active", "paused", "completed", "cancelled"];

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    if (!hasSupabaseAdminEnv()) {
      return NextResponse.json({ error: "Supabase admin credentials are not configured." }, { status: 500 });
    }

    const { id } = await context.params;
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
    const { data: trainingPackage } = await admin
      .from("training_packages")
      .select("id")
      .eq("id", id)
      .eq("trainer_id", trainer.id)
      .maybeSingle<{ id: string }>();

    if (!trainingPackage?.id) {
      return NextResponse.json({ error: "Package not found." }, { status: 404 });
    }

    const payload = (await request.json()) as PackageUpdatePayload;
    const totalSessions =
      typeof payload.totalSessions === "number" && Number.isFinite(payload.totalSessions)
        ? Math.max(Math.round(payload.totalSessions), 0)
        : null;
    const priceCents =
      typeof payload.priceCents === "number" && Number.isFinite(payload.priceCents)
        ? Math.max(Math.round(payload.priceCents), 0)
        : null;
    const status = statuses.includes(payload.status as TrainingPackageStatus)
      ? (payload.status as TrainingPackageStatus)
      : "pending";
    const title = clean(payload.title);

    if (!title) return NextResponse.json({ error: "Package name is required." }, { status: 400 });

    const { error } = await admin
      .from("training_packages")
      .update({
        title,
        total_sessions: totalSessions,
        status,
        price_cents: priceCents,
        currency: clean(payload.currency) || "USD",
        billing_terms: clean(payload.billingTerms) || null,
        shared_location: clean(payload.sharedLocation) || null,
        shared_schedule: clean(payload.sharedSchedule) || null,
        policy_notes: clean(payload.policyNotes) || null,
        internal_notes: clean(payload.internalNotes) || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update package." },
      { status: 500 },
    );
  }
}
