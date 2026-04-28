"use client";

import { useEffect, useState } from "react";
import { CalendarClock, CalendarRange, CheckCircle2, ShieldPlus, Target } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { clients as demoClients } from "@/lib/demo-data";
import { readStoredDemoClientProfile, syncDemoClientRecord, writeStoredDemoClientProfile } from "@/lib/demo-client-storage";
import { dispatchProfileUpdated, readImageFileAsDataUrl, uploadProfilePhoto } from "@/lib/profile-identity";
import { pricingTierDetail, pricingTierLabel } from "@/lib/pricing";
import type { Client, ClientSession } from "@/lib/types";

export function ClientProfileEditor({
  initialClient,
  initialSessions,
  mode,
}: {
  initialClient: Client;
  initialSessions: ClientSession[];
  mode: "demo" | "supabase";
}) {
  const [profile, setProfile] = useState({
    goals: initialClient.goals,
    availability: initialClient.availability,
    injuries: initialClient.injuries,
    notes: initialClient.notes,
  });
  const [client, setClient] = useState(initialClient);
  const [sessions, setSessions] = useState(initialSessions);
  const [pendingPhotoFile, setPendingPhotoFile] = useState<File | null>(null);
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
      setSessions(stored.sessions ?? initialSessions);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [initialClient.id, initialSessions, mode]);

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
        const photoUrl = pendingPhotoFile ? await uploadProfilePhoto(pendingPhotoFile) : nextClient.photo;
        const resolvedClient = {
          ...nextClient,
          photo: photoUrl,
        };
        const response = await fetch("/api/client/profile", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            goals: resolvedClient.goals,
            availability: resolvedClient.availability,
            injuries: resolvedClient.injuries,
            notes: resolvedClient.notes,
            photo: resolvedClient.photo || null,
          }),
        });

        const payload = (await response.json()) as { error?: string };
        if (!response.ok) {
          throw new Error(payload.error ?? "Unable to save profile.");
        }

        setClient(resolvedClient);
        setPendingPhotoFile(null);
      } else {
        const existing = readStoredDemoClientProfile(initialClient.id);
        writeStoredDemoClientProfile(initialClient.id, {
          client: nextClient,
          coachingNotes: existing?.coachingNotes ?? [],
          sessions,
        });
        syncDemoClientRecord(nextClient, demoClients);
      }

      if (mode !== "supabase") {
        setClient(nextClient);
      }
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
      setPendingPhotoFile(file);
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

        <Card className="overflow-hidden p-0">
          <CardHeader className="border-b border-border bg-white/35">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>In-person session package</CardTitle>
                <p className="text-sm leading-6 text-stone-500">
                  These are live coached sessions and do not include your individual at-home workout logs.
                </p>
              </div>
              <Badge variant={client.sessionPackage.remaining === 0 ? "alert" : "sage"}>
                {client.sessionPackage.remaining === null ? "Open package" : `${client.sessionPackage.remaining} remaining`}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid gap-3 border-b border-border p-5 sm:grid-cols-3 sm:p-6">
              <SessionMetric icon={CalendarRange} label="Package total" value={client.sessionPackage.total === null ? "Open" : String(client.sessionPackage.total)} />
              <SessionMetric icon={CheckCircle2} label="Sessions used" value={String(client.sessionPackage.used)} />
              <SessionMetric icon={CalendarClock} label="Last in-person" value={client.sessionPackage.lastSessionAt ?? "None yet"} />
            </div>
            <div className="p-5 sm:p-6">
              <p className="text-[0.66rem] uppercase tracking-[0.22em] text-stone-400">Recent in-person sessions</p>
              <div className="mt-4 grid gap-3">
                {sessions.length ? (
                  sessions.map((session) => (
                    <div key={session.id} className="rounded-[1.25rem] border border-stone-200 bg-white/70 p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-charcoal-950">{session.startedAt}</p>
                            <Badge variant={session.status === "completed" ? "sage" : session.status === "active" ? "bronze" : "default"}>
                              {session.status}
                            </Badge>
                          </div>
                          <p className="mt-2 text-sm text-stone-500">
                            {session.location || "In person"}{session.durationMinutes ? ` · ${session.durationMinutes} min` : ""}
                          </p>
                          {session.notes ? <p className="mt-3 text-sm leading-6 text-stone-600">{session.notes}</p> : null}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[1.25rem] bg-stone-50 p-4 text-sm text-stone-500">
                    No in-person sessions have been recorded yet.
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

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
                {client.photo ? (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setClient((current) => ({ ...current, photo: "" }));
                      setPendingPhotoFile(null);
                    }}
                  >
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

function SessionMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[1.25rem] bg-stone-50 p-4">
      <Icon className="size-4 text-bronze-600" />
      <p className="mt-4 text-[0.66rem] uppercase tracking-[0.22em] text-stone-500">{label}</p>
      <p className="mt-2 font-serif text-3xl font-semibold text-charcoal-950">{value}</p>
    </div>
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
