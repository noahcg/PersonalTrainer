import { isSupabaseConfigured } from "@/lib/auth-server";
import { createAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase-server";
import type { PackageType, TrainingPackageKind } from "@/lib/types";

type PackageTypeRow = {
  id: string;
  kind: TrainingPackageKind;
  name: string;
  session_count: number | null;
  price_cents: number | null;
  currency: string | null;
  billing_terms: string | null;
  policy_notes: string | null;
  internal_notes: string | null;
  default_location: string | null;
  default_schedule: string | null;
  active: boolean | null;
};

const defaultPackageTypes: PackageType[] = [
  {
    id: "default-session-bundles",
    kind: "one_on_one",
    name: "Session Bundles",
    sessionCount: 10,
    priceCents: 110000,
    currency: "USD",
    billingTerms: "$1,100 for 10 prepaid one-on-one sessions. $110 per session.",
    policyNotes: "Prepaid one-on-one training with flexible scheduling and a clear bank of sessions.",
    internalNotes: "Public pricing page package. Good fit for clients who want flexibility without a fixed monthly cadence.",
    defaultLocation: "",
    defaultSchedule: "",
    active: true,
  },
  {
    id: "default-monthly-training",
    kind: "one_on_one",
    name: "Monthly Training",
    sessionCount: 8,
    priceCents: 84000,
    currency: "USD",
    billingTerms: "$840 per month for 2x/week training, 8 sessions per month. 3x/week option is $1,200 for 12 sessions per month.",
    policyNotes: "Consistent weekly training rhythm with a reserved schedule, progressive session planning, and ongoing adjustments.",
    internalNotes: "Public pricing page package. Default package uses the 2x/week option; adjust sessions/price on the client package if using 3x/week.",
    defaultLocation: "",
    defaultSchedule: "2x / week",
    active: true,
  },
  {
    id: "default-partner-training",
    kind: "partner_training",
    name: "Partner Training",
    sessionCount: 10,
    priceCents: 160000,
    currency: "USD",
    billingTerms: "$160 total per shared session package.",
    policyNotes:
      "Shared appointments are reserved for two named clients. If one partner cannot attend inside the cancellation window, the shared appointment may still count toward the package.",
    internalNotes: "",
    defaultLocation: "",
    defaultSchedule: "",
    active: true,
  },
];

function defaultPackageTypeRows(trainerId: string) {
  return defaultPackageTypes.map((packageType) => ({
    trainer_id: trainerId,
    kind: packageType.kind,
    name: packageType.name,
    session_count: packageType.sessionCount,
    price_cents: packageType.priceCents,
    currency: packageType.currency,
    billing_terms: packageType.billingTerms || null,
    policy_notes: packageType.policyNotes || null,
    internal_notes: packageType.internalNotes || null,
    default_location: packageType.defaultLocation || null,
    default_schedule: packageType.defaultSchedule || null,
    active: packageType.active,
  }));
}

function mapPackageType(row: PackageTypeRow): PackageType {
  return {
    id: row.id,
    kind: row.kind,
    name: row.name,
    sessionCount: row.session_count,
    priceCents: row.price_cents,
    currency: row.currency ?? "USD",
    billingTerms: row.billing_terms ?? "",
    policyNotes: row.policy_notes ?? "",
    internalNotes: row.internal_notes ?? "",
    defaultLocation: row.default_location ?? "",
    defaultSchedule: row.default_schedule ?? "",
    active: row.active ?? true,
  };
}

export async function getTrainerPackageTypes() {
  if (!isSupabaseConfigured()) {
    return { mode: "demo" as const, packageTypes: defaultPackageTypes };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !hasSupabaseAdminEnv()) {
    return { mode: "supabase" as const, packageTypes: [] as PackageType[] };
  }

  const { data: trainer } = await supabase
    .from("trainers")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle<{ id: string }>();

  if (!trainer?.id) return { mode: "supabase" as const, packageTypes: [] as PackageType[] };

  const admin = createAdminClient();

  const { data: existingRows, error: existingError } = await admin
    .from("training_package_types")
    .select("id, kind, name, session_count, price_cents, currency, billing_terms, policy_notes, internal_notes, default_location, default_schedule, active")
    .eq("trainer_id", trainer.id)
    .order("created_at", { ascending: false });

  if (existingError) {
    if (existingError.code === "42P01" || existingError.code === "PGRST205") {
      return { mode: "supabase" as const, packageTypes: [] as PackageType[] };
    }
    throw existingError;
  }

  const existingNames = new Set((existingRows ?? []).map((row) => String(row.name).toLowerCase()));
  const missingDefaults = defaultPackageTypeRows(trainer.id).filter((row) => !existingNames.has(row.name.toLowerCase()));

  if (missingDefaults.length) {
    const { error: insertError } = await admin.from("training_package_types").insert(missingDefaults);
    if (insertError) throw insertError;
  }

  const { data, error } = await admin
    .from("training_package_types")
    .select("id, kind, name, session_count, price_cents, currency, billing_terms, policy_notes, internal_notes, default_location, default_schedule, active")
    .eq("trainer_id", trainer.id)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return { mode: "supabase" as const, packageTypes: (data ?? []).map((row) => mapPackageType(row as PackageTypeRow)) };
}
