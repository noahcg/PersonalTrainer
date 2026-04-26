import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase-server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const next = url.searchParams.get("next") ?? "/";

  const supabase = await createClient();
  let authError: Error | null = null;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    authError = error;
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as EmailOtpType,
    });
    authError = error;
  }

  if (authError) {
    await supabase.auth.signOut();
    const setupUrl = new URL("/setup-account", url.origin);
    setupUrl.searchParams.set("error", "invite_expired");
    return NextResponse.redirect(setupUrl);
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
