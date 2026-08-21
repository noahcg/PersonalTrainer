"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { KeyRound } from "lucide-react";
import { brand } from "@/lib/brand";
import { createClient } from "@/lib/supabase-browser";
import { NGLogoLockup } from "@/components/brand/ng-logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PasswordInput } from "@/components/ui/input";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resetError = searchParams.get("error");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState(
    resetError === "recovery_expired"
      ? "This reset link is expired or was already used. Send yourself a fresh reset email from the login page."
      : "Enter a new password for your account.",
  );
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

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
        setMessage("Open this page from your password reset email so your session is active.");
        return;
      }

      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      setMessage("Password updated. Redirecting...");
      router.push("/login");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update your password.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main suppressHydrationWarning className="grid min-h-screen place-items-center px-5 py-10">
      <Card className="w-full max-w-xl p-5 sm:p-8">
        <Link href="/" className="block w-fit">
          <NGLogoLockup tone="ink" subtext="Training" monogramVariant="mark" />
        </Link>
        <h1 className="mt-5 font-serif text-4xl font-semibold sm:text-5xl">Reset password.</h1>
        <p className="mt-3 text-sm font-semibold uppercase tracking-[0.24em] text-bronze-600">{brand.tagline}</p>
        <p className="mt-3 text-sm leading-6 text-stone-600">{message}</p>
        <form className="mt-8 space-y-4" onSubmit={submit}>
          <PasswordInput
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="New password"
            autoComplete="new-password"
          />
          <PasswordInput
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Confirm new password"
            autoComplete="new-password"
          />
          <Button disabled={saving} type="submit" variant="warm" className="mt-2 w-full">
            <KeyRound className="size-4" />
            {saving ? "Saving..." : "Update password"}
          </Button>
        </form>
      </Card>
    </main>
  );
}
