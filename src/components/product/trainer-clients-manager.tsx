"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { motion } from "motion/react";
import { Plus, Save, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ClientCard } from "@/components/product/client-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { createClient as createBrowserClient } from "@/lib/supabase-browser";
import type { Client, ClientStatus } from "@/lib/types";

const storageKey = "aurelian-demo-clients";

type DraftClient = {
  name: string;
  email: string;
  goals: string;
  level: Client["level"];
  injuries: string;
  notes: string;
  style: string;
  availability: string;
};

const emptyDraft: DraftClient = {
  name: "",
  email: "",
  goals: "",
  level: "Foundation",
  injuries: "",
  notes: "",
  style: "",
  availability: "",
};

export function TrainerClientsManager({
  initialClients,
  mode,
}: {
  initialClients: Client[];
  mode: "demo" | "supabase";
}) {
  const [clients, setClients] = useState(initialClients);
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DraftClient>(emptyDraft);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== "demo") return;
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) return;

    const timeout = window.setTimeout(() => {
      try {
        setClients(JSON.parse(stored) as Client[]);
      } catch {
        window.localStorage.removeItem(storageKey);
      }
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [mode]);

  const visibleClients = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return clients;
    return clients.filter((client) =>
      [client.name, client.email, client.goals, client.status.replace("_", " ")]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [clients, query]);

  function persist(nextClients: Client[]) {
    if (mode === "demo") {
      window.localStorage.setItem(storageKey, JSON.stringify(nextClients));
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  async function createClient() {
    if (!draft.name.trim() || !draft.email.trim()) return;
    setBusy(true);
    setMessage(null);
    try {
      let nextClient: Client;

      if (mode === "supabase") {
        const supabase = createBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("You need an authenticated trainer session to create a client.");

        const { data: trainer } = await supabase
          .from("trainers")
          .select("id")
          .eq("profile_id", user.id)
          .maybeSingle<{ id: string }>();
        if (!trainer?.id) throw new Error("Trainer profile not found.");

        const { data: inserted, error } = await supabase
          .from("clients")
          .insert({
            trainer_id: trainer.id,
            full_name: draft.name.trim(),
            email: draft.email.trim(),
            goals: draft.goals.trim(),
            fitness_level: draft.level,
            injuries_limitations: draft.injuries.trim(),
            notes: draft.notes.trim(),
            preferred_training_style: draft.style.trim(),
            availability: draft.availability.trim(),
            start_date: new Date().toISOString().slice(0, 10),
            status: "active",
          })
          .select("id")
          .single<{ id: string }>();
        if (error || !inserted?.id) throw error ?? new Error("Unable to create client.");

        nextClient = {
          id: inserted.id,
          name: draft.name.trim(),
          email: draft.email.trim(),
          photo: "",
          goals: draft.goals.trim() || "Goals not set yet.",
          level: draft.level,
          injuries: draft.injuries.trim() || "No limitations recorded.",
          notes: draft.notes.trim() || "No trainer notes yet.",
          style: draft.style.trim() || "Training style not specified.",
          availability: draft.availability.trim() || "Availability not specified.",
          startDate: new Date().toISOString().slice(0, 10),
          status: "active",
          adherence: 0,
          metrics: {
            bodyWeight: "—",
            workouts: 0,
            streak: 0,
            lastCheckIn: "No check-in yet",
          },
        };
      } else {
        nextClient = {
          id: `client-${clients.length + 1}`,
          name: draft.name.trim(),
          email: draft.email.trim(),
          photo: "",
          goals: draft.goals.trim() || "Goals not set yet.",
          level: draft.level,
          injuries: draft.injuries.trim() || "No limitations recorded.",
          notes: draft.notes.trim() || "No trainer notes yet.",
          style: draft.style.trim() || "Training style not specified.",
          availability: draft.availability.trim() || "Availability not specified.",
          startDate: new Date().toISOString().slice(0, 10),
          status: "active",
          adherence: 0,
          metrics: {
            bodyWeight: "—",
            workouts: 0,
            streak: 0,
            lastCheckIn: "No check-in yet",
          },
        };
      }

      const nextClients = [nextClient, ...clients];
      setClients(nextClients);
      persist(nextClients);
      setOpen(false);
      setDraft(emptyDraft);
      setMessage("Client created.");
      window.setTimeout(() => setMessage(null), 2200);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create client.");
    } finally {
      setBusy(false);
    }
  }

  async function archiveSelected() {
    if (!selectedIds.length) return;
    setBusy(true);
    setMessage(null);
    try {
      if (mode === "supabase") {
        const supabase = createBrowserClient();
        const { error } = await supabase.from("clients").update({ status: "archived" }).in("id", selectedIds);
        if (error) throw error;
      }

      const nextClients = clients.map((client) =>
        selectedIds.includes(client.id) ? { ...client, status: "archived" as ClientStatus } : client,
      );
      setClients(nextClients);
      persist(nextClients);
      setSelectedIds([]);
      setMessage("Selected clients archived.");
      window.setTimeout(() => setMessage(null), 2200);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to archive selected clients.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Card className="mb-5 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[0.66rem] uppercase tracking-[0.3em] text-bronze-600">Roster controls</p>
            <p className="mt-2 text-sm leading-6 text-stone-600">Search, select, and manage your active client base without losing the human context of each profile.</p>
          </div>
          <div className="flex gap-3 text-sm text-stone-500">
            <div className="rounded-full bg-stone-50 px-4 py-2">{clients.length} total clients</div>
            <div className="rounded-full bg-stone-50 px-4 py-2">{selectedIds.length} selected</div>
          </div>
        </div>
      </Card>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search clients by name, goal, status..."
          className="sm:max-w-md"
        />
        <Button variant="warm" onClick={() => setOpen(true)}>
          <Plus className="size-4" />
          Create client
        </Button>
        <Button variant="secondary" onClick={() => void archiveSelected()} disabled={busy || selectedIds.length === 0}>
          Archive selected
        </Button>
      </div>

      {selectedIds.length > 0 ? (
        <Card className="mb-5 flex items-center justify-between p-4 text-sm text-stone-600">
          <span>{selectedIds.length} client{selectedIds.length === 1 ? "" : "s"} selected for bulk actions.</span>
          <Button variant="ghost" size="sm" onClick={() => setSelectedIds([])}>
            Clear
          </Button>
        </Card>
      ) : null}

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {visibleClients.map((client) => (
          <ClientCard
            key={client.id}
            client={client}
            selectable
            selected={selectedIds.includes(client.id)}
            onToggleSelect={toggleSelect}
          />
        ))}
      </div>

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-charcoal-950/35 backdrop-blur-sm" />
          <Dialog.Content asChild>
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.98 }}
              className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100vw-1.5rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[2rem] border border-white/70 bg-ivory-50 p-5 shadow-soft outline-none sm:p-7"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Dialog.Title className="font-serif text-4xl font-semibold text-charcoal-950">Create client</Dialog.Title>
                  <Dialog.Description className="mt-2 text-sm leading-6 text-stone-600">
                    Add a new client to your roster with enough context to begin programming well.
                  </Dialog.Description>
                </div>
                <Dialog.Close asChild>
                  <Button variant="ghost" size="icon" aria-label="Close create client dialog">
                    <X className="size-5" />
                  </Button>
                </Dialog.Close>
              </div>

              <div className="mt-6 grid gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Full name">
                    <Input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} />
                  </Field>
                  <Field label="Email">
                    <Input value={draft.email} onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))} />
                  </Field>
                  <Field label="Fitness level">
                    <select
                      value={draft.level}
                      onChange={(event) => setDraft((current) => ({ ...current, level: event.target.value as Client["level"] }))}
                      className="h-11 rounded-2xl border border-stone-200 bg-white/80 px-4 text-sm shadow-inner-soft outline-none transition focus:border-bronze-300 focus:ring-4 focus:ring-bronze-100"
                    >
                      <option value="Foundation">Foundation</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Advanced">Advanced</option>
                    </select>
                  </Field>
                  <Field label="Availability">
                    <Input value={draft.availability} onChange={(event) => setDraft((current) => ({ ...current, availability: event.target.value }))} />
                  </Field>
                </div>
                <Field label="Goals">
                  <Textarea value={draft.goals} onChange={(event) => setDraft((current) => ({ ...current, goals: event.target.value }))} />
                </Field>
                <Field label="Injuries / limitations">
                  <Textarea value={draft.injuries} onChange={(event) => setDraft((current) => ({ ...current, injuries: event.target.value }))} />
                </Field>
                <Field label="Preferred training style">
                  <Textarea value={draft.style} onChange={(event) => setDraft((current) => ({ ...current, style: event.target.value }))} />
                </Field>
                <Field label="Notes">
                  <Textarea value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} />
                </Field>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Dialog.Close asChild>
                  <Button variant="secondary">Cancel</Button>
                </Dialog.Close>
                <Button variant="warm" onClick={() => void createClient()} disabled={busy}>
                  <Save className="size-4" />
                  {busy ? "Saving..." : "Create client"}
                </Button>
              </div>
            </motion.div>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2 text-sm font-medium text-charcoal-950">
      {label}
      {children}
    </label>
  );
}
