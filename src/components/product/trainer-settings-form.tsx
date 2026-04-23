"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";

const storageKey = "aurelian-trainer-settings";

export function TrainerSettingsForm() {
  const [settings, setSettings] = useState({
    name: "Avery Stone",
    email: "avery@aurelian.coach",
    bio: "Calm, precise strength coaching for busy clients who want durable progress.",
  });
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) return;
    const timeout = window.setTimeout(() => {
      try {
        setSettings(JSON.parse(stored));
      } catch {
        window.localStorage.removeItem(storageKey);
      }
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  function save() {
    window.localStorage.setItem(storageKey, JSON.stringify(settings));
    setMessage("Settings saved.");
    window.setTimeout(() => setMessage(null), 1800);
  }

  return (
    <AppShell role="trainer" title="Studio settings" subtitle="Manage profile, coaching voice, notification defaults, and account preferences.">
      <Card className="max-w-3xl">
        <CardHeader><CardTitle>Trainer profile</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Input value={settings.name} onChange={(event) => setSettings((current) => ({ ...current, name: event.target.value }))} />
          <Input value={settings.email} onChange={(event) => setSettings((current) => ({ ...current, email: event.target.value }))} />
          <Textarea value={settings.bio} onChange={(event) => setSettings((current) => ({ ...current, bio: event.target.value }))} />
          <Button variant="warm" onClick={save}>Save settings</Button>
        </CardContent>
      </Card>
      {message ? <div className="fixed bottom-24 right-3 z-40 rounded-full bg-charcoal-950 px-4 py-3 text-sm text-ivory-50 shadow-soft lg:right-6">{message}</div> : null}
    </AppShell>
  );
}
