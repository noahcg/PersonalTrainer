"use client";

import { createBrowserClient } from "@supabase/ssr";

const fallbackUrl = "https://demo.supabase.co";
const fallbackAnonKey = "demo-anon-key";

export function hasSupabaseEnv() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? fallbackUrl,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? fallbackAnonKey,
  );
}
