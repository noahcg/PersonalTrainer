import { NextResponse } from "next/server";
import { createAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase-server";

async function trainerContext(clientId: string) {
  if (!hasSupabaseAdminEnv()) throw new Error("Server database credentials are not configured.");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: trainer, error: trainerError } = await supabase.from("trainers").select("id").eq("profile_id", user.id).maybeSingle<{ id: string }>();
  if (trainerError) throw trainerError;
  if (!trainer) return null;
  const admin = createAdminClient();
  const { data: client, error } = await admin.from("clients").select("id").eq("id", clientId).eq("trainer_id", trainer.id).maybeSingle<{ id: string }>();
  if (error) throw error;
  return client ? { admin, trainerId: trainer.id } : null;
}

async function ownedPackages(admin: ReturnType<typeof createAdminClient>, trainerId: string, clientId: string) {
  const { data, error } = await admin.from("training_package_members").select("training_packages!inner(id, title, status, trainer_id)").eq("client_id", clientId).eq("training_packages.trainer_id", trainerId);
  if (error) throw error;
  return (data ?? []).flatMap((row) => Array.isArray(row.training_packages) ? row.training_packages : row.training_packages ? [row.training_packages] : []) as Array<{ id: string; title: string; status: string; trainer_id: string }>;
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const auth = await trainerContext(id);
    if (!auth) return NextResponse.json({ error: "Client not found or access denied." }, { status: 404 });
    const [packages, result] = await Promise.all([
      ownedPackages(auth.admin, auth.trainerId, id),
      auth.admin.from("client_notice_records").select("id, training_package_id, scheduled_at, notice_received_at, notice_details, grace_granted, grace_reason, created_at").eq("trainer_id", auth.trainerId).eq("client_id", id).order("created_at", { ascending: false }),
    ]);
    if (result.error) throw result.error;
    return NextResponse.json({ packages, records: result.data ?? [] });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load notices." }, { status: 500 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const auth = await trainerContext(id);
    if (!auth) return NextResponse.json({ error: "Client not found or access denied." }, { status: 404 });
    const body = await request.json();
    const packageId = typeof body.packageId === "string" ? body.packageId : "";
    const details = typeof body.details === "string" ? body.details.trim() : "";
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    const grace = body.grace === true;
    const scheduled = typeof body.scheduledAt === "string" ? new Date(body.scheduledAt) : new Date(NaN);
    const received = body.receivedAt ? new Date(body.receivedAt) : null;
    if (!details || Number.isNaN(scheduled.getTime()) || (received && (Number.isNaN(received.getTime()) || received > new Date())) || (grace && !reason)) {
      return NextResponse.json({ error: "Enter a valid session time, notice details, a past notice time if provided, and a reason when granting grace." }, { status: 400 });
    }
    const packages = await ownedPackages(auth.admin, auth.trainerId, id);
    if (!packages.some((item) => item.id === packageId)) return NextResponse.json({ error: "Package does not belong to this client." }, { status: 400 });
    const { error } = await auth.admin.from("client_notice_records").insert({ trainer_id: auth.trainerId, client_id: id, training_package_id: packageId, scheduled_at: scheduled.toISOString(), notice_received_at: received?.toISOString() ?? null, notice_details: details, grace_granted: grace, grace_reason: grace ? reason : null });
    if (error?.code === "23505") return NextResponse.json({ error: "This client has already received a grace exception for this package." }, { status: 409 });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to save notice." }, { status: 500 });
  }
}
