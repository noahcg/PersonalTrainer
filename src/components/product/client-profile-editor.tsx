"use client";

import { useEffect, useState } from "react";
import { CalendarRange, ShieldPlus, Target } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { clients as demoClients } from "@/lib/demo-data";
import { readStoredDemoClientProfile, syncDemoClientRecord, writeStoredDemoClientProfile } from "@/lib/demo-client-storage";
import { dispatchProfileUpdated, readImageFileAsDataUrl } from "@/lib/profile-identity";
import { pricingTierDetail, pricingTierLabel } from "@/lib/pricing";
import { createClient as createBrowserClient } from "@/lib/supabase-browser";
import type { Client } from "@/lib/types";

export function ClientProfileEditor({
  initialClient,
  mode,
}: {
  initialClient: Client;
  mode: "demo" | "supabase";
}) {
  const [profile, setProfile] = useState({
    goals: initialClient.goals,
    availability: initialClient.availability,
    injuries: initialClient.injuries,
    notes: initialClient.notes,
  });
  const [client, setClient] = useState(initialClient);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (mode !== "demo") return;

    const stored = readStoredDemoClientProfile(initialClient.id);
    if (!stored) return;

    const timeout = window.setTimeout(() => {
      setClient(stored.client);
      setProfile({
        goals: stored.client.goals,
        availability: stored.client.availability,
        injuries: stored.client.injuries,
        notes: stored.client.notes,
      });
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [initialClient.id, mode]);

  async function saveProfile() {
    setSaving(true);
    const nextClient = {
      ...client,
      goals: profile.goals,
      availability: profile.availability,
      injuries: profile.injuries,
      notes: profile.notes,
    };

    try {
      if (mode === "supabase") {
        const supabase = createBrowserClient();
        const { error } = await supabase
          .from("clients")
          .update({
            goals: nextClient.goals,
            availability: nextClient.availability,
            injuries_limitations: nextClient.injuries,
            notes: nextClient.notes,
            profile_photo_url: nextClient.photo || null,
          })
          .eq("id", nextClient.id);

        if (error) throw error;
      } else {
        const existing = readStoredDemoClientProfile(initialClient.id);
        writeStoredDemoClientProfile(initialClient.id, {
          client: nextClient,
          coachingNotes: existing?.coachingNotes ?? [],
        });
        syncDemoClientRecord(nextClient, demoClients);
      }

      setClient(nextClient);
      dispatchProfileUpdated();
      setMessage("Profile saved.");
      window.setTimeout(() => setMessage(null), 1800);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save profile.");
      window.setTimeout(() => setMessage(null), 2200);
    } finally {
      setSaving(false);
    }
  }

  async function updatePhoto(file: File | null) {
    if (!file) return;

    try {
      const photo = await readImageFileAsDataUrl(file);
      setClient((current) => ({ ...current, photo }));
      setMessage("Photo ready to save.");
      window.setTimeout(() => setMessage(null), 1800);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load photo.");
      window.setTimeout(() => setMessage(null), 2200);
    }
  }

  return (
    <AppShell role="client" title="Profile" subtitle="Keep your goals, limitations, schedule, and preferences current for better coaching.">
      <div className="space-y-5">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Goals", value: "Current", icon: Target, tone: "text-bronze-500" },
            { label: "Availability", value: "Saved", icon: CalendarRange, tone: "text-sage-700" },
            { label: "Limitations", value: "Visible", icon: ShieldPlus, tone: "text-charcoal-950" },
          ].map(({ label, value, icon: Icon, tone }) => (
            <Card key={label} className="p-5">
              <Icon className={`size-5 ${tone}`} />
              <p className="mt-6 text-[0.66rem] uppercase tracking-[0.28em] text-stone-500">{label}</p>
              <p className="mt-2 font-serif text-4xl font-semibold text-charcoal-950">{value}</p>
            </Card>
          ))}
          <Card className="p-5">
            <Badge variant="dark">{pricingTierLabel(client.pricingTier)}</Badge>
            <p className="mt-6 text-[0.66rem] uppercase tracking-[0.28em] text-stone-500">Pricing package</p>
            <p className="mt-2 text-sm leading-6 text-stone-600">{pricingTierDetail(client.pricingTier)}</p>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
              <Avatar name={client.name} src={client.photo} className="size-20" />
              <div>
                <CardTitle className="font-serif text-4xl">{client.name}</CardTitle>
                <p className="text-sm text-stone-500">{client.email}</p>
              </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button asChild variant="secondary">
                  <label className="cursor-pointer">
                    Upload profile photo
                    <input
                      hidden
                      type="file"
                      accept="image/*"
                      onChange={(event) => void updatePhoto(event.target.files?.[0] ?? null)}
                    />
                  </label>
                </Button>
                {client.photo ? (
                  <Button variant="ghost" onClick={() => setClient((current) => ({ ...current, photo: "" }))}>
                    Remove photo
                  </Button>
                ) : null}
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Field label="Goals">
              <Input value={profile.goals} onChange={(event) => setProfile((current) => ({ ...current, goals: event.target.value }))} />
            </Field>
            <Field label="Availability">
              <Input value={profile.availability} onChange={(event) => setProfile((current) => ({ ...current, availability: event.target.value }))} />
            </Field>
            <Field label="Injuries / limitations">
              <Textarea value={profile.injuries} onChange={(event) => setProfile((current) => ({ ...current, injuries: event.target.value }))} />
            </Field>
            <Field label="Notes">
              <Textarea value={profile.notes} onChange={(event) => setProfile((current) => ({ ...current, notes: event.target.value }))} />
            </Field>
            <Button variant="warm" onClick={() => void saveProfile()} disabled={saving}>{saving ? "Saving..." : "Save profile"}</Button>
          </CardContent>
        </Card>
      </div>
      {message ? <div className="fixed bottom-24 right-3 z-40 rounded-full bg-charcoal-950 px-4 py-3 text-sm text-ivory-50 shadow-soft lg:right-6">{message}</div> : null}
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2 text-sm font-medium text-charcoal-950">
      {label}
      {children}
    </label>
  );
}
