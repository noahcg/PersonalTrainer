import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase-server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const requestedNext = url.searchParams.get("next");
  const next = requestedNext?.startsWith("/") ? requestedNext : type === "recovery" ? "/reset-password" : "/";

  const supabase = await createClient();
  let authError: Error | null = null;

  if (next.startsWith("/setup-account")) {
    await supabase.auth.signOut();
  }

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
    const errorUrl = new URL(type === "recovery" ? "/reset-password" : "/setup-account", url.origin);
    errorUrl.searchParams.set("error", type === "recovery" ? "recovery_expired" : "invite_expired");
    return NextResponse.redirect(errorUrl);
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
