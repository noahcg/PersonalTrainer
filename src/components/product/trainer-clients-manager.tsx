"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { motion } from "motion/react";
import Link from "next/link";
import { Copy, ExternalLink, Mail, Plus, Save, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ClientCard } from "@/components/product/client-card";
import { InviteComposeDialog } from "@/components/product/invite-compose-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { demoClientsStorageKey } from "@/lib/demo-client-storage";
import { defaultInviteMessage, defaultInviteSubject } from "@/lib/invitations";
import { pricingTierOptions } from "@/lib/pricing";
import { createClient as createBrowserClient } from "@/lib/supabase-browser";
import type { Client, ClientStatus, PricingTier } from "@/lib/types";

type DraftClient = {
  name: string;
  email: string;
  goals: string;
  level: Client["level"];
  injuries: string;
  notes: string;
  style: string;
  availability: string;
  pricingTier: PricingTier;
};

type InvitePreview = {
  clientId: string;
  clientName: string;
  actionLink: string;
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
  pricingTier: "ongoing_coaching",
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
  const [inviteOpen, setInviteOpen] = useState(false);
  const [draft, setDraft] = useState<DraftClient>(emptyDraft);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [invitePreviews, setInvitePreviews] = useState<InvitePreview[]>([]);

  useEffect(() => {
    if (mode !== "demo") return;
    const stored = window.localStorage.getItem(demoClientsStorageKey);
    if (!stored) return;

    const timeout = window.setTimeout(() => {
      try {
        setClients(JSON.parse(stored) as Client[]);
      } catch {
        window.localStorage.removeItem(demoClientsStorageKey);
      }
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [mode]);

  const visibleClients = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return clients;
    return clients.filter((client) =>
      [client.name, client.email, client.goals, client.status.replace("_", " "), client.accessStatus.replace("_", " ")]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [clients, query]);

  const accessSummary = useMemo(
    () => ({
      active: clients.filter((client) => client.accessStatus === "account_active").length,
      pending: clients.filter((client) => client.accessStatus === "invite_pending").length,
      notInvited: clients.filter((client) => client.accessStatus === "not_invited").length,
    }),
    [clients],
  );

  function persist(nextClients: Client[]) {
    if (mode === "demo") {
      window.localStorage.setItem(demoClientsStorageKey, JSON.stringify(nextClients));
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
            pricing_tier: draft.pricingTier,
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
          accessStatus: "not_invited",
          inviteSentAt: null,
          pricingTier: draft.pricingTier,
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
          accessStatus: "not_invited",
          inviteSentAt: null,
          pricingTier: draft.pricingTier,
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

  async function inviteSelected(inviteDraft: { subject: string; message: string }) {
    if (!selectedIds.length) return;

    setBusy(true);
    setMessage(null);

    try {
      if (mode === "supabase") {
        const results = await Promise.all(
          selectedIds.map(async (clientId) => {
            const clientRecord = clients.find((item) => item.id === clientId);
            const response = await fetch("/api/invitations/client", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                clientId,
                subject: inviteDraft.subject,
                message: inviteDraft.message,
              }),
            });

            const payload = (await response.json()) as { error?: string; inviteSentAt?: string; actionLink?: string };
            if (!response.ok) {
              throw new Error(payload.error ?? "Unable to send invite.");
            }

            return {
              clientId,
              clientName: clientRecord?.name ?? "Client",
              inviteSentAt: payload.inviteSentAt
                ? new Date(payload.inviteSentAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                : null,
              actionLink: payload.actionLink ?? "",
            };
          }),
        );

        const nextClients = clients.map((client) => {
          const update = results.find((result) => result.clientId === client.id);
          if (!update) return client;

          return {
            ...client,
            accessStatus: "invite_pending" as const,
            inviteSentAt: update.inviteSentAt ?? client.inviteSentAt,
          };
        });

        setClients(nextClients);
        const nextInvitePreviews = results
          .filter((result) => result.actionLink)
          .map((result) => ({
            clientId: result.clientId,
            clientName: result.clientName,
            actionLink: result.actionLink,
          }));
        setInvitePreviews(nextInvitePreviews);

        setInviteOpen(false);
        setMessage(
          nextInvitePreviews.length
            ? `${selectedIds.length} client invite${selectedIds.length === 1 ? "" : "s"} generated for local testing.`
            : `${selectedIds.length} client invite${selectedIds.length === 1 ? "" : "s"} sent.`,
        );
      } else {
        const inviteSentAt = new Date().toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        const nextClients = clients.map((client) =>
          selectedIds.includes(client.id)
            ? {
                ...client,
                accessStatus: "invite_pending" as const,
                inviteSentAt,
              }
            : client,
        );
        setClients(nextClients);
        persist(nextClients);
      }

      if (mode !== "supabase") {
        setInviteOpen(false);
        setMessage(`${selectedIds.length} client invite${selectedIds.length === 1 ? "" : "s"} sent.`);
      }
      window.setTimeout(() => setMessage(null), 2200);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to send invites.");
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
            <p className="mt-2 text-sm leading-6 text-stone-600">Search the roster, track access, and handle invite or archive actions without opening every profile.</p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-stone-500">
            <div className="rounded-full bg-stone-50 px-4 py-2">{clients.length} total clients</div>
            <div className="rounded-full bg-stone-50 px-4 py-2">{selectedIds.length} selected</div>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-[1.25rem] bg-stone-50 px-4 py-3 text-sm text-stone-600">
            <p className="text-[0.65rem] uppercase tracking-[0.2em] text-stone-400">Account active</p>
            <p className="mt-2 text-2xl font-semibold text-charcoal-950">{accessSummary.active}</p>
          </div>
          <div className="rounded-[1.25rem] bg-stone-50 px-4 py-3 text-sm text-stone-600">
            <p className="text-[0.65rem] uppercase tracking-[0.2em] text-stone-400">Invite pending</p>
            <p className="mt-2 text-2xl font-semibold text-charcoal-950">{accessSummary.pending}</p>
          </div>
          <div className="rounded-[1.25rem] bg-stone-50 px-4 py-3 text-sm text-stone-600">
            <p className="text-[0.65rem] uppercase tracking-[0.2em] text-stone-400">Not invited</p>
            <p className="mt-2 text-2xl font-semibold text-charcoal-950">{accessSummary.notInvited}</p>
          </div>
        </div>
      </Card>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search clients by name, goal, status, or access..."
          className="sm:max-w-md"
        />
        <Button variant="warm" onClick={() => setOpen(true)}>
          <Plus className="size-4" />
          Create client
        </Button>
        <Button variant="secondary" onClick={() => setInviteOpen(true)} disabled={busy || selectedIds.length === 0}>
          <Mail className="size-4" />
          Send invites
        </Button>
        <Button variant="secondary" onClick={() => void archiveSelected()} disabled={busy || selectedIds.length === 0}>
          Archive selected
        </Button>
      </div>

      {message ? (
        <Card className="mb-5 border-bronze-200 bg-bronze-50/70 p-4 text-sm text-stone-700">
          {message}
        </Card>
      ) : null}

      {invitePreviews.length ? (
        <Card className="mb-5 border-sage-200 bg-sage-50/55 p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[0.66rem] uppercase tracking-[0.22em] text-sage-700">Local invite testing</p>
              <p className="mt-2 text-sm leading-6 text-stone-700">
                Email is not configured, so these invite setup links were generated for local testing. Open one in an incognito window to finish client setup.
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setInvitePreviews([])}>
              Dismiss
            </Button>
          </div>
          <div className="mt-4 grid gap-3">
            {invitePreviews.map((preview) => (
              <div key={preview.clientId} className="rounded-[1.35rem] border border-sage-200/80 bg-white/80 p-4">
                <p className="font-semibold text-charcoal-950">{preview.clientName}</p>
                <p className="mt-2 break-all text-sm leading-6 text-stone-600">{preview.actionLink}</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => void navigator.clipboard.writeText(preview.actionLink)}
                  >
                    <Copy className="size-4" />
                    Copy link
                  </Button>
                  <Button asChild variant="warm" size="sm">
                    <Link href={preview.actionLink} target="_blank" rel="noreferrer">
                      Open link
                      <ExternalLink className="size-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {selectedIds.length > 0 ? (
        <Card className="mb-5 flex items-center justify-between p-4 text-sm text-stone-600">
          <span>{selectedIds.length} client{selectedIds.length === 1 ? "" : "s"} selected for bulk actions.</span>
          <Button variant="ghost" size="sm" onClick={() => setSelectedIds([])}>
            Clear
          </Button>
        </Card>
      ) : null}

      <div className="min-w-0 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {visibleClients.map((client) => (
          <div key={client.id} className="min-w-0">
            <ClientCard client={client} selectable selected={selectedIds.includes(client.id)} onToggleSelect={toggleSelect} />
          </div>
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
                  <Field label="Pricing package">
                    <select
                      value={draft.pricingTier}
                      onChange={(event) => setDraft((current) => ({ ...current, pricingTier: event.target.value as PricingTier }))}
                      className="h-11 rounded-2xl border border-stone-200 bg-white/80 px-4 text-sm shadow-inner-soft outline-none transition focus:border-bronze-300 focus:ring-4 focus:ring-bronze-100"
                    >
                      {pricingTierOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
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

      <InviteComposeDialog
        key={selectedIds.join("|") || "empty-selection"}
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        title={selectedIds.length === 1 ? "Send client invite" : "Send client invites"}
        description={
          selectedIds.length === 1
            ? "Write the email your selected client will receive with their setup link."
            : "Write the email your selected clients will receive with their setup links."
        }
        defaultSubject={defaultInviteSubject(selectedIds.length === 1 ? clients.find((client) => client.id === selectedIds[0])?.name : undefined)}
        defaultMessage={defaultInviteMessage(selectedIds.length === 1 ? clients.find((client) => client.id === selectedIds[0])?.name : undefined)}
        busy={busy}
        onSend={inviteSelected}
      />

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
