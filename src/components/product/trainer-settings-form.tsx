"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { TrainerNotificationSettings } from "@/components/product/trainer-notification-settings";
import { createClient as createBrowserClient, hasSupabaseEnv } from "@/lib/supabase-browser";
import {
  defaultDemoTrainerSettings,
  dispatchProfileUpdated,
  readDemoTrainerSettings,
  readImageFileAsDataUrl,
  uploadProfilePhoto,
  writeDemoTrainerSettings,
} from "@/lib/profile-identity";

export function TrainerSettingsForm() {
  const [settings, setSettings] = useState(defaultDemoTrainerSettings);
  const [pendingPhotoFile, setPendingPhotoFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function loadSettings() {
    if (!hasSupabaseEnv()) {
      setSettings(readDemoTrainerSettings());
      return;
    }

    const supabase = createBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const [{ data: profile }, { data: trainer }] = await Promise.all([
      supabase.from("profiles").select("full_name, email, avatar_url").eq("id", user.id).maybeSingle<{ full_name: string; email: string; avatar_url: string | null }>(),
      supabase.from("trainers").select("coaching_bio").eq("profile_id", user.id).maybeSingle<{ coaching_bio: string | null }>(),
    ]);

    setSettings({
      name: profile?.full_name ?? defaultDemoTrainerSettings.name,
      email: profile?.email ?? defaultDemoTrainerSettings.email,
      bio: trainer?.coaching_bio ?? defaultDemoTrainerSettings.bio,
      photo: profile?.avatar_url ?? "",
    });
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadSettings();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  async function updatePhoto(file: File | null) {
    if (!file) return;

    try {
      const photo = await readImageFileAsDataUrl(file);
      setSettings((current) => ({ ...current, photo }));
      setPendingPhotoFile(file);
      setMessage("Photo ready to save.");
      window.setTimeout(() => setMessage(null), 1800);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load photo.");
      window.setTimeout(() => setMessage(null), 2200);
    }
  }

  async function save() {
    setSaving(true);

    try {
      if (hasSupabaseEnv()) {
        const photoUrl = pendingPhotoFile ? await uploadProfilePhoto(pendingPhotoFile) : settings.photo;
        const response = await fetch("/api/trainer/settings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: settings.name,
            email: settings.email,
            bio: settings.bio,
            photo: photoUrl || null,
          }),
        });

        const payload = (await response.json()) as { error?: string };
        if (!response.ok) {
          throw new Error(payload.error ?? "Unable to save trainer settings.");
        }

        setSettings((current) => ({ ...current, photo: photoUrl }));
        setPendingPhotoFile(null);
      } else {
        writeDemoTrainerSettings(settings);
      }

      dispatchProfileUpdated();
      setMessage("Settings saved.");
      window.setTimeout(() => setMessage(null), 1800);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save settings.");
      window.setTimeout(() => setMessage(null), 2200);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell role="trainer" title="Studio settings" eyebrow="Account settings" subtitle="Manage profile, coaching voice, notification defaults, and account preferences.">
      <div className="max-w-4xl space-y-5">
        <TrainerNotificationSettings />

        <Card>
          <CardHeader>
            <CardTitle>Trainer profile</CardTitle>
            <CardDescription>Keep your client-facing identity and coaching bio up to date.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-col gap-4 rounded-[1.35rem] border border-stone-200 bg-white/70 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                <Avatar name={settings.name} src={settings.photo} className="size-20 flex-none" />
                <div className="min-w-0">
                  <p className="truncate font-serif text-2xl font-semibold text-charcoal-950">{settings.name}</p>
                  <p className="mt-1 truncate text-sm text-stone-500">{settings.email}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button asChild variant="secondary">
                  <label className="cursor-pointer focus-within:outline-2 focus-within:outline-offset-3 focus-within:outline-bronze-500 focus-within:ring-4 focus-within:ring-bronze-100">
                    Upload profile photo
                    <input
                      className="sr-only"
                      type="file"
                      accept="image/*"
                      onChange={(event) => void updatePhoto(event.target.files?.[0] ?? null)}
                    />
                  </label>
                </Button>
                {settings.photo ? (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setSettings((current) => ({ ...current, photo: "" }));
                      setPendingPhotoFile(null);
                    }}
                  >
                    Remove photo
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Input value={settings.name} onChange={(event) => setSettings((current) => ({ ...current, name: event.target.value }))} />
              <Input value={settings.email} onChange={(event) => setSettings((current) => ({ ...current, email: event.target.value }))} />
            </div>
            <Textarea value={settings.bio} onChange={(event) => setSettings((current) => ({ ...current, bio: event.target.value }))} />
            <Button variant="warm" onClick={() => void save()} disabled={saving}>{saving ? "Saving..." : "Save settings"}</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Legal</CardTitle>
            <CardDescription>Quick access to the policies linked from account and public surfaces.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm font-semibold text-stone-600">
              <Link className="transition hover:text-bronze-700" href="/privacy">Privacy Policy</Link>
              <Link className="transition hover:text-bronze-700" href="/terms">Terms of Service</Link>
            </div>
          </CardContent>
        </Card>
      </div>
      {message ? <div className="fixed bottom-24 right-3 z-40 rounded-full bg-charcoal-950 px-4 py-3 text-sm text-ivory-50 shadow-soft lg:right-6">{message}</div> : null}
    </AppShell>
  );
}
