"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { brand } from "@/lib/brand";
import { createClient, hasSupabaseEnv } from "@/lib/supabase-browser";
import { NGLogoLockup } from "@/components/brand/ng-logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, PasswordInput } from "@/components/ui/input";
import type { Profile, Role } from "@/lib/types";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("trainer@example.com");
  const [password, setPassword] = useState("demo-password");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("Enter your email and password to continue.");

  function roleDestination(role: Role) {
    const requestedDestination = searchParams.get("next");
    if (requestedDestination?.startsWith(`/${role}/`)) return requestedDestination;
    return role === "trainer" ? "/trainer/dashboard" : "/client/home";
  }

  async function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("Signing in...");

    if (!hasSupabaseEnv()) {
      setMessage("Supabase is not connected. Demo login is unavailable from this form.");
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setMessage(error.message || "Invalid email or password.");
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setMessage("Unable to load your account after login.");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle<Pick<Profile, "role">>();

      if (!profile?.role) {
        setMessage("Your account profile is missing a role.");
        return;
      }

      const resolvedRole = profile.role;
      let destination = roleDestination(resolvedRole);

      if (resolvedRole === "client") {
        const { data: client } = await supabase
          .from("clients")
          .select("intake_completed_at")
          .eq("profile_id", user.id)
          .maybeSingle<{ intake_completed_at: string | null }>();

        if (!client?.intake_completed_at) {
          destination = "/client/intake";
        }
      }

      router.push(destination);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to log in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main suppressHydrationWarning className="grid min-h-screen place-items-center px-5 py-10">
      <Card className="w-full max-w-xl p-5 sm:p-8">
        <Link href="/" className="block w-fit">
          <NGLogoLockup tone="ink" subtext="Training" monogramVariant="mark" />
        </Link>
        <h1 className="mt-5 font-serif text-4xl font-semibold sm:text-5xl">Welcome back.</h1>
        <p className="mt-3 text-sm font-semibold uppercase tracking-[0.24em] text-bronze-600">{brand.tagline}</p>
        <p className="mt-3 text-sm leading-6 text-stone-600">{message}</p>
        <form className="mt-8 space-y-4" onSubmit={signIn}>
          <Input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" autoComplete="email" />
          <PasswordInput value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" autoComplete="current-password" />
          <Button disabled={loading} type="submit" variant="warm" className="mt-2 w-full">
            {loading ? "Logging in..." : "Log in"}
          </Button>
        </form>
      </Card>
    </main>
  );
}
