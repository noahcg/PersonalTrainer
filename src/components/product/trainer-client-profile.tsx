"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { motion } from "motion/react";
import { Ban, PencilLine, Save, StickyNote, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { createClient as createBrowserClient } from "@/lib/supabase-browser";
import type { Client, ClientStatus, CoachingEntry, Plan } from "@/lib/types";

type StoredState = {
  client: Client;
  coachingNotes: CoachingEntry[];
};

const coachStorageKey = (clientId: string) => `aurelian-client-profile-${clientId}`;

export function TrainerClientProfile({
  initialClient,
  assignedPlan,
  initialCoachingNotes,
  mode,
}: {
  initialClient: Client;
  assignedPlan: Plan;
  initialCoachingNotes: CoachingEntry[];
  mode: "demo" | "supabase";
}) {
  const [client, setClient] = useState(initialClient);
  const [coachingNotes, setCoachingNotes] = useState<CoachingEntry[]>(initialCoachingNotes);
  const [editOpen, setEditOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [draftClient, setDraftClient] = useState(initialClient);
  const [draftNote, setDraftNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== "demo") return;

    const stored = window.localStorage.getItem(coachStorageKey(initialClient.id));
    if (!stored) return;

    const timeout = window.setTimeout(() => {
      try {
        const parsed = JSON.parse(stored) as StoredState;
        setClient(parsed.client);
        setDraftClient(parsed.client);
        setCoachingNotes(parsed.coachingNotes ?? []);
      } catch {
        window.localStorage.removeItem(coachStorageKey(initialClient.id));
      }
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [initialClient, mode]);

  function persist(nextClient: Client, nextNotes: CoachingEntry[]) {
    window.localStorage.setItem(
      coachStorageKey(initialClient.id),
      JSON.stringify({ client: nextClient, coachingNotes: nextNotes } satisfies StoredState),
    );
  }

  function updateDraft(field: keyof Client, value: string | ClientStatus) {
    setDraftClient((current) => ({ ...current, [field]: value }));
  }

  async function saveProfile() {
    setBusy(true);
    setMessage(null);

    try {
      if (mode === "supabase") {
        const supabase = createBrowserClient();
        const { error } = await supabase
          .from("clients")
          .update({
            full_name: draftClient.name,
            email: draftClient.email,
            goals: draftClient.goals,
            fitness_level: draftClient.level,
            injuries_limitations: draftClient.injuries,
            notes: draftClient.notes,
            preferred_training_style: draftClient.style,
            availability: draftClient.availability,
            status: draftClient.status,
          })
          .eq("id", draftClient.id);

        if (error) throw error;
      } else {
        persist(draftClient, coachingNotes);
      }

      setClient(draftClient);
      setEditOpen(false);
      setMessage("Profile saved.");
      window.setTimeout(() => setMessage(null), 2400);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save profile.");
    } finally {
      setBusy(false);
    }
  }

  async function addCoachingNote() {
    if (!draftNote.trim()) return;

    setBusy(true);
    setMessage(null);

    try {
      let nextNotes = coachingNotes;
      if (mode === "supabase") {
        const supabase = createBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          throw new Error("You need an authenticated trainer session to leave a coaching note.");
        }

        const { data: trainer } = await supabase
          .from("trainers")
          .select("id")
          .eq("profile_id", user.id)
          .maybeSingle<{ id: string }>();

        if (!trainer?.id) {
          throw new Error("Trainer profile not found.");
        }

        const { data: inserted, error } = await supabase
          .from("messages")
          .insert({
            trainer_id: trainer.id,
            client_id: client.id,
            sender_profile_id: user.id,
            kind: "coaching_note",
            body: draftNote.trim(),
          })
          .select("id, body, created_at")
          .single<{ id: string; body: string; created_at: string }>();

        if (error || !inserted) throw error ?? new Error("Unable to save coaching note.");

        nextNotes = [
          {
            id: inserted.id,
            body: inserted.body,
            createdAt: new Date(inserted.created_at).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            }),
          },
          ...coachingNotes,
        ];
      } else {
        nextNotes = [
          {
            id: `note-${Date.now()}`,
            body: draftNote.trim(),
            createdAt: new Date().toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            }),
          },
          ...coachingNotes,
        ];

        const nextClient = {
          ...client,
          notes: draftNote.trim(),
        };

        setClient(nextClient);
        setDraftClient(nextClient);
        persist(nextClient, nextNotes);
      }

      setCoachingNotes(nextNotes);
      setDraftNote("");
      setNoteOpen(false);
      setMessage("Coaching note saved.");
      window.setTimeout(() => setMessage(null), 2400);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save coaching note.");
    } finally {
      setBusy(false);
    }
  }

  async function deactivateClient() {
    const nextStatus: ClientStatus = client.status === "archived" ? "active" : "archived";
    const nextClient = { ...client, status: nextStatus };
    setBusy(true);
    setMessage(null);

    try {
      if (mode === "supabase") {
        const supabase = createBrowserClient();
        const { error } = await supabase.from("clients").update({ status: nextStatus }).eq("id", client.id);
        if (error) throw error;
      } else {
        persist(nextClient, coachingNotes);
      }

      setClient(nextClient);
      setDraftClient(nextClient);
      setMessage(nextStatus === "archived" ? "Client archived." : "Client reactivated.");
      window.setTimeout(() => setMessage(null), 2400);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update client status.");
    } finally {
      setBusy(false);
    }
  }

  const sections = useMemo(
    () => [
      ["Goals", client.goals],
      ["Injuries / limitations", client.injuries],
      ["Preferred training style", client.style],
      ["Availability", client.availability],
      ["Trainer notes", client.notes],
    ],
    [client],
  );

  return (
    <>
      <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
        <Card className="p-6">
          <Avatar name={client.name} src={client.photo} className="size-24" />
          <h2 className="mt-5 font-serif text-4xl font-semibold">{client.name}</h2>
          <p className="text-sm text-stone-500">{client.email}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Badge variant="sage">{client.level}</Badge>
            <Badge variant={client.status === "needs_attention" ? "alert" : client.status === "archived" ? "default" : "bronze"}>
              {client.status.replace("_", " ")}
            </Badge>
          </div>
          <div className="mt-6">
            <div className="mb-2 flex justify-between text-sm text-stone-500">
              <span>Adherence</span>
              <span>{client.adherence}%</span>
            </div>
            <Progress value={client.adherence} />
          </div>
          <div className="mt-6 grid grid-cols-3 gap-2 text-center">
            <MetricTile label="Workouts" value={String(client.metrics.workouts)} />
            <MetricTile label="Streak" value={String(client.metrics.streak)} />
            <MetricTile label="Weight" value={client.metrics.bodyWeight} />
          </div>
          <div className="mt-6 grid gap-3">
            <Button variant="warm" onClick={() => setNoteOpen(true)}>
              <StickyNote className="size-4" />
              Leave coaching note
            </Button>
            <Button variant="secondary" onClick={() => setEditOpen(true)}>
              <PencilLine className="size-4" />
              Edit profile
            </Button>
            <Button variant="ghost" onClick={deactivateClient} disabled={busy}>
              <Ban className="size-4" />
              {client.status === "archived" ? "Reactivate client" : "Deactivate client"}
            </Button>
          </div>
        </Card>

        <div className="grid gap-5">
          {sections.map(([title, body]) => (
            <Card key={title}>
              <CardHeader>
                <CardTitle>{title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-7 text-stone-600">{body}</p>
              </CardContent>
            </Card>
          ))}

          <Card>
            <CardHeader>
              <CardTitle>Recent coaching notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {coachingNotes.length ? (
                coachingNotes.map((note) => (
                  <div key={note.id} className="rounded-[1.5rem] bg-stone-50 p-4">
                    <p className="text-sm leading-6 text-stone-700">{note.body}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.18em] text-stone-400">{note.createdAt}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-[1.5rem] bg-stone-50 p-4 text-sm text-stone-500">
                  No coaching notes yet. Use the note action to leave your first cue, reminder, or encouragement.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Assigned plan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-[1.75rem] bg-stone-50 p-5">
                <p className="text-xl font-semibold">{assignedPlan.title}</p>
                <p className="mt-2 text-sm leading-6 text-stone-600">{assignedPlan.description}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog.Root open={editOpen} onOpenChange={setEditOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-charcoal-950/35 backdrop-blur-sm" />
          <Dialog.Content asChild>
            <ModalShell title="Edit client profile" description="Update client details and save them directly into the demo workspace.">
              <div className="grid gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Full name">
                    <Input value={draftClient.name} onChange={(event) => updateDraft("name", event.target.value)} />
                  </Field>
                  <Field label="Email">
                    <Input value={draftClient.email} onChange={(event) => updateDraft("email", event.target.value)} />
                  </Field>
                  <Field label="Preferred training style">
                    <Input value={draftClient.style} onChange={(event) => updateDraft("style", event.target.value)} />
                  </Field>
                  <Field label="Availability">
                    <Input value={draftClient.availability} onChange={(event) => updateDraft("availability", event.target.value)} />
                  </Field>
                  <Field label="Status">
                    <select
                      value={draftClient.status}
                      onChange={(event) => updateDraft("status", event.target.value as ClientStatus)}
                      className="h-11 rounded-2xl border border-stone-200 bg-white/80 px-4 text-sm shadow-inner-soft outline-none transition focus:border-bronze-300 focus:ring-4 focus:ring-bronze-100"
                    >
                      <option value="active">Active</option>
                      <option value="needs_attention">Needs attention</option>
                      <option value="paused">Paused</option>
                      <option value="archived">Archived</option>
                    </select>
                  </Field>
                  <Field label="Fitness level">
                    <select
                      value={draftClient.level}
                      onChange={(event) => updateDraft("level", event.target.value as Client["level"])}
                      className="h-11 rounded-2xl border border-stone-200 bg-white/80 px-4 text-sm shadow-inner-soft outline-none transition focus:border-bronze-300 focus:ring-4 focus:ring-bronze-100"
                    >
                      <option value="Foundation">Foundation</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Advanced">Advanced</option>
                    </select>
                  </Field>
                </div>
                <Field label="Goals">
                  <Textarea value={draftClient.goals} onChange={(event) => updateDraft("goals", event.target.value)} />
                </Field>
                <Field label="Injuries / limitations">
                  <Textarea value={draftClient.injuries} onChange={(event) => updateDraft("injuries", event.target.value)} />
                </Field>
                <Field label="Trainer notes">
                  <Textarea value={draftClient.notes} onChange={(event) => updateDraft("notes", event.target.value)} />
                </Field>
              </div>
              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Dialog.Close asChild>
                  <Button variant="secondary">Cancel</Button>
                </Dialog.Close>
                <Button variant="warm" onClick={saveProfile} disabled={busy}>
                  <Save className="size-4" />
                  {busy ? "Saving..." : "Save profile"}
                </Button>
              </div>
            </ModalShell>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={noteOpen} onOpenChange={setNoteOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-charcoal-950/35 backdrop-blur-sm" />
          <Dialog.Content asChild>
            <ModalShell title="Leave coaching note" description="Add a contextual cue, reminder, or encouragement for this client.">
              <Textarea
                value={draftNote}
                onChange={(event) => setDraftNote(event.target.value)}
                placeholder="Keep the first work set conservative. If hip tightness shows up, switch to the box squat variation and note depth."
              />
              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Dialog.Close asChild>
                  <Button variant="secondary">Cancel</Button>
                </Dialog.Close>
                <Button variant="warm" onClick={addCoachingNote} disabled={busy}>
                  <StickyNote className="size-4" />
                  {busy ? "Saving..." : "Save note"}
                </Button>
              </div>
            </ModalShell>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {message ? (
        <div className="fixed bottom-24 right-3 z-40 rounded-full bg-charcoal-950 px-4 py-3 text-sm text-ivory-50 shadow-soft lg:right-6">
          {message}
        </div>
      ) : null}
    </>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-stone-50 p-3">
      <p className="font-semibold">{value}</p>
      <p className="text-xs text-stone-500">{label}</p>
    </div>
  );
}

function ModalShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.98 }}
      className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100vw-1.5rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[2rem] border border-white/70 bg-ivory-50 p-5 shadow-soft outline-none sm:p-7"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <Dialog.Title className="font-serif text-4xl font-semibold text-charcoal-950">{title}</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm leading-6 text-stone-600">{description}</Dialog.Description>
        </div>
        <Dialog.Close asChild>
          <Button variant="ghost" size="icon" aria-label="Close modal">
            <X className="size-5" />
          </Button>
        </Dialog.Close>
      </div>
      <div className="mt-6">{children}</div>
    </motion.div>
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
