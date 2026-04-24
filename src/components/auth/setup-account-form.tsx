"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { brand } from "@/lib/brand";
import { createClient } from "@/lib/supabase-browser";
import { NGLogoLockup } from "@/components/brand/ng-logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Role } from "@/lib/types";

export function SetupAccountForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("Use the invite link from your email to set your password.");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!password || password.length < 8) {
      setMessage("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setMessage("Open this page from your invite email so your session is active.");
        return;
      }

      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      const response = await fetch("/api/auth/complete-setup", {
        method: "POST",
      });
      const payload = (await response.json()) as { error?: string; role?: Role };
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to finish account setup.");
      }

      const role: Role = payload.role ?? "client";
      router.push(role === "trainer" ? "/trainer/dashboard" : "/client/home");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to finish account setup.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main suppressHydrationWarning className="grid min-h-screen place-items-center px-5 py-10">
      <Card className="w-full max-w-xl p-6 sm:p-8">
        <Link href="/" className="block">
          <NGLogoLockup tone="ink" subtext="Coaching" />
        </Link>
        <h1 className="mt-5 font-serif text-5xl font-semibold">Set up your account.</h1>
        <p className="mt-3 text-sm font-semibold uppercase tracking-[0.24em] text-bronze-600">{brand.tagline}</p>
        <p className="mt-3 text-sm leading-6 text-stone-600">{message}</p>
        <div className="mt-8 space-y-4">
          <Input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            placeholder="Create password"
          />
          <Input
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            type="password"
            placeholder="Confirm password"
          />
        </div>
        <Button className="mt-6 w-full" disabled={saving} onClick={() => void submit()} variant="warm">
          {saving ? "Saving..." : "Finish setup"}
        </Button>
      </Card>
    </main>
  );
}
