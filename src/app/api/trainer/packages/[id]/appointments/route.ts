import { NextResponse } from "next/server";
import { createAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase-server";
import type { PackageAttendanceStatus, PackageDebitPolicy } from "@/lib/types";

type AppointmentPayload = {
  startedAt?: string;
  location?: string;
  notes?: string;
  debitPolicy?: PackageDebitPolicy;
  attendance?: Array<{
    clientId?: string;
    status?: PackageAttendanceStatus;
  }>;
};

const debitPolicies: PackageDebitPolicy[] = ["charged", "not_charged", "converted_to_one_on_one"];
const attendanceStatuses: PackageAttendanceStatus[] = ["attending", "absent", "late_cancelled", "excused"];

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
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
      .select("id, trainer_id")
      .eq("id", id)
      .eq("trainer_id", trainer.id)
      .maybeSingle<{ id: string; trainer_id: string }>();

    if (!trainingPackage?.id) {
      return NextResponse.json({ error: "Package not found." }, { status: 404 });
    }

    const payload = (await request.json()) as AppointmentPayload;
    const debitPolicy = debitPolicies.includes(payload.debitPolicy as PackageDebitPolicy)
      ? (payload.debitPolicy as PackageDebitPolicy)
      : "charged";
    const startedAt = payload.startedAt ? new Date(payload.startedAt) : new Date();
    if (Number.isNaN(startedAt.getTime())) {
      return NextResponse.json({ error: "Invalid appointment date." }, { status: 400 });
    }

    const { data: members, error: membersError } = await admin
      .from("training_package_members")
      .select("client_id")
      .eq("training_package_id", id);

    if (membersError) throw membersError;
    const memberIds = (members ?? []).map((member: { client_id: string }) => member.client_id);
    if (memberIds.length !== 2) {
      return NextResponse.json({ error: "Partner package must have exactly two members." }, { status: 400 });
    }

    const attendance = memberIds.map((clientId) => {
      const provided = payload.attendance?.find((item) => item.clientId === clientId);
      return {
        clientId,
        status: attendanceStatuses.includes(provided?.status as PackageAttendanceStatus)
          ? (provided?.status as PackageAttendanceStatus)
          : "attending",
      };
    });

    const { data: appointment, error: appointmentError } = await admin
      .from("package_appointments")
      .insert({
        training_package_id: id,
        status: "completed",
        started_at: startedAt.toISOString(),
        completed_at: new Date().toISOString(),
        location: clean(payload.location) || null,
        notes: clean(payload.notes) || null,
        debit_policy: debitPolicy,
      })
      .select("id")
      .single<{ id: string }>();

    if (appointmentError || !appointment?.id) {
      throw appointmentError ?? new Error("Unable to record shared appointment.");
    }

    const { error: attendanceError } = await admin.from("package_appointment_attendance").insert(
      attendance.map((item) => ({
        package_appointment_id: appointment.id,
        client_id: item.clientId,
        status: item.status,
      })),
    );

    if (attendanceError) throw attendanceError;

    const { error: packageError } = await admin
      .from("training_packages")
      .update({ status: "active", updated_at: new Date().toISOString() })
      .eq("id", id);

    if (packageError) throw packageError;

    return NextResponse.json({ ok: true, appointmentId: appointment.id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to record shared appointment." },
      { status: 500 },
    );
  }
}
