import { clients as demoClients } from "@/lib/demo-data";
import { isSupabaseConfigured } from "@/lib/auth-server";
import { createAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase-server";
import type {
  PackageAppointment,
  PackageAttendanceStatus,
  PackageDebitPolicy,
  TrainingPackage,
  TrainingPackageKind,
  TrainingPackageStatus,
} from "@/lib/types";

type PackageRow = {
  id: string;
  kind: TrainingPackageKind;
  title: string;
  total_sessions: number | null;
  status: TrainingPackageStatus;
  price_cents?: number | null;
  currency?: string | null;
  billing_terms?: string | null;
  shared_location: string | null;
  shared_schedule: string | null;
  policy_notes: string | null;
  internal_notes: string | null;
  started_on: string | null;
  created_at: string;
};

type MemberRow = {
  training_package_id: string;
  client_id: string;
  clients:
    | {
        id: string;
        full_name: string;
        email: string;
        profile_photo_url: string | null;
      }
    | Array<{
        id: string;
        full_name: string;
        email: string;
        profile_photo_url: string | null;
      }>
    | null;
};

type AppointmentRow = {
  id: string;
  training_package_id: string;
  status: PackageAppointment["status"];
  started_at: string;
  completed_at: string | null;
  location: string | null;
  notes: string | null;
  debit_policy: PackageDebitPolicy;
};

type AttendanceRow = {
  package_appointment_id: string;
  client_id: string;
  status: PackageAttendanceStatus;
};

function formatDateTime(value: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function memberClient(row: MemberRow) {
  return Array.isArray(row.clients) ? row.clients[0] : row.clients;
}

function mapPackage(
  row: PackageRow,
  members: MemberRow[],
  appointments: AppointmentRow[],
  attendance: AttendanceRow[],
): TrainingPackage {
  const packageAppointments = appointments
    .filter((appointment) => appointment.training_package_id === row.id)
    .map((appointment) => ({
      id: appointment.id,
      packageId: appointment.training_package_id,
      status: appointment.status,
      startedAtIso: appointment.started_at,
      startedAt: formatDateTime(appointment.started_at) ?? "Unknown",
      completedAtIso: appointment.completed_at,
      completedAt: formatDateTime(appointment.completed_at),
      location: appointment.location ?? "",
      notes: appointment.notes ?? "",
      debitPolicy: appointment.debit_policy,
      attendance: attendance
        .filter((item) => item.package_appointment_id === appointment.id)
        .map((item) => ({
          clientId: item.client_id,
          status: item.status,
        })),
    }));
  const usedSessions = packageAppointments.filter((appointment) => appointment.debitPolicy === "charged").length;

  return {
    id: row.id,
    kind: row.kind,
    status: row.status,
    title: row.title,
    totalSessions: row.total_sessions,
    usedSessions,
    remainingSessions: row.total_sessions === null ? null : Math.max(row.total_sessions - usedSessions, 0),
    priceCents: row.price_cents ?? null,
    currency: row.currency ?? "USD",
    billingTerms: row.billing_terms ?? "",
    sharedLocation: row.shared_location ?? "",
    sharedSchedule: row.shared_schedule ?? "",
    policyNotes: row.policy_notes ?? "",
    internalNotes: row.internal_notes ?? "",
    startedOn: row.started_on ?? "",
    createdAt: row.created_at,
    members: members
      .filter((member) => member.training_package_id === row.id)
      .map((member) => {
        const client = memberClient(member);
        return {
          clientId: member.client_id,
          name: client?.full_name ?? "Client",
          email: client?.email ?? "",
          photo: client?.profile_photo_url ?? "",
        };
      }),
    appointments: packageAppointments,
  };
}

function demoPartnerPackage(): TrainingPackage {
  return {
    id: "demo-partner-package",
    kind: "partner_training",
    status: "active",
    title: "Partner Training",
    totalSessions: 10,
    usedSessions: 2,
    remainingSessions: 8,
    priceCents: 160000,
    currency: "USD",
    billingTerms: "$160 total per shared session. Charged, comped, or converted sessions are controlled by the trainer.",
    sharedLocation: "Studio",
    sharedSchedule: "Tuesday evenings",
    policyNotes: "Shared appointments are reserved for two named clients. Late cancels may still count toward the shared package.",
    internalNotes: "",
    startedOn: "2026-05-01",
    createdAt: "2026-05-01T12:00:00Z",
    members: demoClients.slice(0, 2).map((client) => ({
      clientId: client.id,
      name: client.name,
      email: client.email,
      photo: client.photo,
    })),
    appointments: [],
  };
}

export async function getTrainerPackages() {
  if (!isSupabaseConfigured()) {
    return { mode: "demo" as const, packages: [demoPartnerPackage()] };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { mode: "supabase" as const, packages: [] as TrainingPackage[] };

  const { data: trainer } = await supabase
    .from("trainers")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle<{ id: string }>();

  if (!trainer?.id) return { mode: "supabase" as const, packages: [] as TrainingPackage[] };

  const packageSelect =
    "id, kind, title, total_sessions, status, price_cents, currency, billing_terms, shared_location, shared_schedule, policy_notes, internal_notes, started_on, created_at";
  const legacyPackageSelect =
    "id, kind, title, total_sessions, status, shared_location, shared_schedule, policy_notes, internal_notes, started_on, created_at";

  const packageClient = hasSupabaseAdminEnv() ? createAdminClient() : supabase;
  const packageResult = await packageClient
    .from("training_packages")
    .select(packageSelect)
    .eq("trainer_id", trainer.id)
    .order("created_at", { ascending: false });
  let packageRows = packageResult.data as PackageRow[] | null;
  let packageError = packageResult.error;

  if (packageError?.code === "PGRST204") {
    const retry = await packageClient
      .from("training_packages")
      .select(legacyPackageSelect)
      .eq("trainer_id", trainer.id)
      .order("created_at", { ascending: false });
    packageRows = retry.data as PackageRow[] | null;
    packageError = retry.error;
  }

  if (packageError) {
    if (packageError.code === "42P01" || packageError.code === "PGRST205") {
      return { mode: "supabase" as const, packages: [] as TrainingPackage[] };
    }
    throw packageError;
  }

  const ids = (packageRows ?? []).map((row) => row.id);
  if (!ids.length) return { mode: "supabase" as const, packages: [] as TrainingPackage[] };

  const [{ data: memberRows, error: memberError }, { data: appointmentRows, error: appointmentError }] = await Promise.all([
    packageClient
      .from("training_package_members")
      .select("training_package_id, client_id, clients(id, full_name, email, profile_photo_url)")
      .in("training_package_id", ids),
    packageClient
      .from("package_appointments")
      .select("id, training_package_id, status, started_at, completed_at, location, notes, debit_policy")
      .in("training_package_id", ids)
      .order("started_at", { ascending: false }),
  ]);

  if (memberError) throw memberError;
  if (appointmentError) throw appointmentError;

  const appointmentIds = (appointmentRows ?? []).map((row) => row.id);
  const { data: attendanceRows, error: attendanceError } = appointmentIds.length
      ? await packageClient
        .from("package_appointment_attendance")
        .select("package_appointment_id, client_id, status")
        .in("package_appointment_id", appointmentIds)
    : { data: [] as AttendanceRow[], error: null };

  if (attendanceError) throw attendanceError;

  return {
    mode: "supabase" as const,
    packages: (packageRows ?? []).map((row) =>
      mapPackage(
        row as PackageRow,
        (memberRows ?? []) as MemberRow[],
        (appointmentRows ?? []) as AppointmentRow[],
        (attendanceRows ?? []) as AttendanceRow[],
      ),
    ),
  };
}

export async function getTrainerPackage(id: string) {
  const { packages, mode } = await getTrainerPackages();
  return { mode, package: packages.find((item) => item.id === id) ?? null };
}

export async function getPartnerPackagesByClientIds(clientIds: string[]) {
  if (!clientIds.length) return new Map<string, TrainingPackage>();
  const { packages } = await getTrainerPackages();
  const byClient = new Map<string, TrainingPackage>();
  for (const trainingPackage of packages) {
    if (trainingPackage.kind !== "partner_training") continue;
    for (const member of trainingPackage.members) {
      if (clientIds.includes(member.clientId)) {
        byClient.set(member.clientId, trainingPackage);
      }
    }
  }
  return byClient;
}
