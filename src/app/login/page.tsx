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
  const [message, setMessage] = useState("Use Supabase credentials when connected, or jump into demo mode.");

  function openDemo(role: "trainer" | "client") {
    setMessage("Supabase is not connected yet. Opening the seeded demo workspace instead.");
    router.push(role === "trainer" ? "/trainer/dashboard" : "/client/home");
    router.refresh();
  }

  async function signIn(role: "trainer" | "client") {
    setLoading(true);

    if (!hasSupabaseEnv()) {
      openDemo(role);
      return;
    }

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        openDemo(role);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      let destination = searchParams.get("next");

      if (!destination && user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle<Pick<Profile, "role">>();

        const resolvedRole: Role = profile?.role ?? role;
        destination = resolvedRole === "trainer" ? "/trainer/dashboard" : "/client/home";
      }

      router.push(destination ?? (role === "trainer" ? "/trainer/dashboard" : "/client/home"));
      router.refresh();
    } catch {
      openDemo(role);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main suppressHydrationWarning className="grid min-h-screen place-items-center px-5 py-10">
      <Card className="w-full max-w-xl p-5 sm:p-8">
        <Link href="/" className="block">
          <NGLogoLockup tone="ink" subtext="Training" />
        </Link>
        <h1 className="mt-5 font-serif text-5xl font-semibold">Welcome back.</h1>
        <p className="mt-3 text-sm font-semibold uppercase tracking-[0.24em] text-bronze-600">{brand.tagline}</p>
        <p className="mt-3 text-sm leading-6 text-stone-600">{message}</p>
        <div className="mt-8 space-y-4">
          <Input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" />
          <PasswordInput value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" />
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Button disabled={loading} onClick={() => signIn("trainer")} variant="warm">Trainer login</Button>
          <Button disabled={loading} onClick={() => signIn("client")} variant="secondary">Client login</Button>
        </div>
      </Card>
    </main>
  );
}
