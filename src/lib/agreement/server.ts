import "server-only";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase-admin";

export function agreementsEnabled() {
  return process.env.AGREEMENTS_ENABLED === "true" && hasSupabaseAdminEnv();
}

export async function agreementClient() {
  if (!agreementsEnabled()) return null;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const admin = createAdminClient();
  const { data, error } = await admin.from("clients").select("id, trainer_id").eq("profile_id", user.id).maybeSingle<{ id: string; trainer_id: string }>();
  if (error) throw error;
  return data ? { user, client: data, admin } : null;
}

export async function agreementTrainer(clientId: string) {
  if (!agreementsEnabled()) return null;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: trainer, error } = await supabase.from("trainers").select("id").eq("profile_id", user.id).maybeSingle<{ id: string }>();
  if (error) throw error;
  if (!trainer) return null;
  const admin = createAdminClient();
  const { data: client, error: clientError } = await admin.from("clients").select("id, full_name").eq("id", clientId).eq("trainer_id", trainer.id).maybeSingle<{ id: string; full_name: string }>();
  if (clientError) throw clientError;
  return client ? { user, trainer, client, admin } : null;
}

export async function pendingAgreement(clientId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin.from("client_agreement_offers").select("id").eq("client_id", clientId).eq("status", "offered").maybeSingle<{ id: string }>();
  if (error) throw error;
  return data?.id ?? null;
}
