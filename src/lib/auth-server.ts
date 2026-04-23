import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import type { Profile, Role } from "@/lib/types";

export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://demo.supabase.co" &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== "demo-anon-key",
  );
}

export async function getAuthenticatedProfile() {
  if (!isSupabaseConfigured()) {
    return { configured: false as const, profile: null, user: null };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { configured: true as const, profile: null, user: null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, full_name, email, avatar_url")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  return {
    configured: true as const,
    user,
    profile: profile ?? null,
  };
}

export async function requireRole(role: Role) {
  const auth = await getAuthenticatedProfile();

  if (!auth.configured) {
    return { mode: "demo" as const, profile: null };
  }

  if (!auth.user || !auth.profile) {
    redirect(`/login?next=${role === "trainer" ? "/trainer/dashboard" : "/client/home"}`);
  }

  if (auth.profile.role !== role) {
    redirect(auth.profile.role === "trainer" ? "/trainer/dashboard" : "/client/home");
  }

  return { mode: "supabase" as const, profile: auth.profile };
}
