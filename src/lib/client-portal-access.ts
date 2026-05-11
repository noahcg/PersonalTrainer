import { createClient } from "@/lib/supabase-server";
import type { ClientPortalAccess, ClientStatus, Profile } from "@/lib/types";

export const dataOnlyClientRoutes = ["/client/home", "/client/progress", "/client/profile", "/client/intake"];

export function isDataOnlyClientRoute(pathname: string) {
  return dataOnlyClientRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export function clientPortalAccessFromStatus(status: ClientStatus | null | undefined): ClientPortalAccess {
  return status === "archived" ? "data_only" : "full";
}

export async function getClientPortalAccess(profile: Profile | null): Promise<ClientPortalAccess> {
  if (!profile) return "full";

  const supabase = await createClient();
  const { data } = await supabase
    .from("clients")
    .select("status")
    .eq("profile_id", profile.id)
    .maybeSingle<{ status: ClientStatus }>();

  return clientPortalAccessFromStatus(data?.status);
}
