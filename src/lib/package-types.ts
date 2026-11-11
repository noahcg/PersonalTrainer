import { isSupabaseConfigured } from "@/lib/auth-server";
import { createAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase-server";
import type { PackageType, TrainingPackageKind } from "@/lib/types";
import { offeringCatalog } from "@/lib/offering-catalog";

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

const defaultPackageTypes: PackageType[] = offeringCatalog.map((offer) => ({
  id: `default-${offer.id}`,
  kind: offer.kind,
  name: offer.name,
  sessionCount: offer.sessionCount,
  priceCents: offer.priceCents,
  currency: "USD",
  billingTerms: offer.kind === "partner_training"
    ? `$${offer.priceCents / 100} per month combined ($${offer.priceCents / 200} per person). Payment upfront by cash, check, or Zelle. No automatic renewal.`
    : `$${offer.priceCents / 100} per month. Payment upfront by cash, check, or Zelle. No automatic renewal.`,
  policyNotes: "",
  internalNotes: offer.active ? "" : "Draft: confirm session entitlement before activation.",
  defaultLocation: "",
  defaultSchedule: "",
  active: offer.active,
}));

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
