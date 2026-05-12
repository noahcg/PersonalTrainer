"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { motion } from "motion/react";
import Link from "next/link";
import { Archive, Clock3, Copy, ExternalLink, Mail, PackagePlus, Save, Search, UserCheck, UserPlus, Users, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ClientCard } from "@/components/product/client-card";
import { InviteComposeDialog } from "@/components/product/invite-compose-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { clientStatusLabel } from "@/lib/client-access";
import { demoClientsStorageKey } from "@/lib/demo-client-storage";
import { defaultInviteMessage, defaultInviteSubject } from "@/lib/invitations";
import { createClient as createBrowserClient } from "@/lib/supabase-browser";
import type { Client, ClientStatus, PackageType, PricingTier } from "@/lib/types";

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
  packageSessionLimit: string;
};

type InvitePreview = {
  clientId: string;
  clientName: string;
  actionLink: string;
};

type PartnerSignupDraft = {
  clientAName: string;
  clientAEmail: string;
  clientBName: string;
  clientBEmail: string;
  totalSessions: string;
  sharedLocation: string;
  sharedSchedule: string;
  policyNotes: string;
  internalNotes: string;
};

type SignupPackageKind = "one_on_one" | "partner_training";

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
  packageSessionLimit: "12",
};

const emptyPartnerSignup: PartnerSignupDraft = {
  clientAName: "",
  clientAEmail: "",
  clientBName: "",
  clientBEmail: "",
  totalSessions: "10",
  sharedLocation: "",
  sharedSchedule: "",
  policyNotes:
    "Shared appointments are reserved for two named clients. If one partner cannot attend inside the cancellation window, the shared appointment may still count toward the package.",
  internalNotes: "",
};

export function TrainerClientsManager({
  initialClients,
  initialPackageTypes,
  mode,
}: {
  initialClients: Client[];
  initialPackageTypes: PackageType[];
  mode: "demo" | "supabase";
}) {
  const [clients, setClients] = useState(initialClients);
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [signupOpen, setSignupOpen] = useState(false);
  const [signupKind, setSignupKind] = useState<SignupPackageKind>("one_on_one");
  const [selectedPackageTypeId, setSelectedPackageTypeId] = useState(initialPackageTypes.find((item) => item.kind === "one_on_one")?.id ?? "");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [draft, setDraft] = useState<DraftClient>(emptyDraft);
  const [partnerDraft, setPartnerDraft] = useState<PartnerSignupDraft>(emptyPartnerSignup);
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
      [client.name, client.email, client.goals, clientStatusLabel(client.status), client.accessStatus.replace("_", " ")]
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

  const activeClients = useMemo(() => clients.filter((client) => client.status === "active").length, [clients]);
  const needsAttention = useMemo(() => clients.filter((client) => client.status === "needs_attention").length, [clients]);
  const selectedActiveIds = useMemo(
    () => selectedIds.filter((id) => clients.some((client) => client.id === id && client.status !== "archived")),
    [clients, selectedIds],
  );
  const matchingPackageTypes = useMemo(
    () => initialPackageTypes.filter((packageType) => packageType.kind === signupKind && packageType.active),
    [initialPackageTypes, signupKind],
  );
  const selectedPackageType = matchingPackageTypes.find((packageType) => packageType.id === selectedPackageTypeId) ?? matchingPackageTypes[0] ?? null;

  function persist(nextClients: Client[]) {
    if (mode === "demo") {
      window.localStorage.setItem(demoClientsStorageKey, JSON.stringify(nextClients));
    }
  }

  function toggleSelect(id: string) {
    const client = clients.find((item) => item.id === id);
    if (client?.status === "archived") return;
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function applyPackageType(packageType: PackageType | null) {
    if (!packageType) return;
    setSelectedPackageTypeId(packageType.id);
    if (packageType.kind === "one_on_one") {
      setDraft((current) => ({
        ...current,
        packageSessionLimit: packageType.sessionCount === null ? "" : String(packageType.sessionCount),
        availability: current.availability || packageType.defaultSchedule,
        notes: current.notes || packageType.internalNotes,
      }));
    } else {
      setPartnerDraft((current) => ({
        ...current,
        totalSessions: packageType.sessionCount === null ? "" : String(packageType.sessionCount),
        sharedLocation: current.sharedLocation || packageType.defaultLocation,
        sharedSchedule: current.sharedSchedule || packageType.defaultSchedule,
        policyNotes: packageType.policyNotes || current.policyNotes,
        internalNotes: current.internalNotes || packageType.internalNotes,
      }));
    }
  }

  async function createOneOnOneSignup() {
    if (!draft.name.trim() || !draft.email.trim()) return;
    setBusy(true);
    setMessage(null);
    try {
      let nextClient: Client;

      if (mode === "supabase") {
        const response = await fetch("/api/trainer/packages/one-on-one-signup", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            client: {
              name: draft.name,
              email: draft.email,
              level: draft.level,
              notes: draft.notes,
              style: draft.style,
              availability: draft.availability,
            },
            pricingTier: draft.pricingTier,
            totalSessions: draft.packageSessionLimit ? Number(draft.packageSessionLimit) : null,
            packageNotes: draft.notes,
            packageTypeId: selectedPackageType?.id,
          }),
        });
        const payload = (await response.json()) as { error?: string; clientId?: string };
        if (!response.ok || !payload.clientId) throw new Error(payload.error ?? "Unable to create one-on-one signup.");

        nextClient = {
          id: payload.clientId,
          name: draft.name.trim(),
          email: draft.email.trim(),
          photo: "",
          goals: "Goals will come from client intake.",
          level: draft.level,
          injuries: "Limitations will come from client intake.",
          notes: draft.notes.trim() || "No trainer notes yet.",
          style: draft.style.trim() || "Training style not specified.",
          availability: draft.availability.trim() || "Availability not specified.",
          startDate: new Date().toISOString().slice(0, 10),
          status: "active",
          accessStatus: "not_invited",
          inviteSentAt: null,
          pricingTier: draft.pricingTier,
          sessionPackage: {
            total: draft.packageSessionLimit ? Number(draft.packageSessionLimit) : null,
            used: 0,
            remaining: draft.packageSessionLimit ? Number(draft.packageSessionLimit) : null,
            activeSessionId: null,
            lastSessionAt: null,
          },
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
          goals: "Goals will come from client intake.",
          level: draft.level,
          injuries: "Limitations will come from client intake.",
          notes: draft.notes.trim() || "No trainer notes yet.",
          style: draft.style.trim() || "Training style not specified.",
          availability: draft.availability.trim() || "Availability not specified.",
          startDate: new Date().toISOString().slice(0, 10),
          status: "active",
          accessStatus: "not_invited",
          inviteSentAt: null,
          pricingTier: draft.pricingTier,
          sessionPackage: {
            total: draft.packageSessionLimit ? Number(draft.packageSessionLimit) : null,
            used: 0,
            remaining: draft.packageSessionLimit ? Number(draft.packageSessionLimit) : null,
            activeSessionId: null,
            lastSessionAt: null,
          },
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
      setSignupOpen(false);
      setDraft(emptyDraft);
      setSignupKind("one_on_one");
      setMessage("One-on-one signup created. Send the invite when the client is ready for setup.");
      window.setTimeout(() => setMessage(null), 2200);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create one-on-one signup.");
    } finally {
      setBusy(false);
    }
  }

  async function createPartnerSignup() {
    if (!partnerDraft.clientAName.trim() || !partnerDraft.clientAEmail.trim() || !partnerDraft.clientBName.trim() || !partnerDraft.clientBEmail.trim()) return;
    setBusy(true);
    setMessage(null);

    try {
      if (mode === "supabase") {
        const response = await fetch("/api/trainer/packages/partner-signup", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            clientA: { name: partnerDraft.clientAName, email: partnerDraft.clientAEmail },
            clientB: { name: partnerDraft.clientBName, email: partnerDraft.clientBEmail },
            totalSessions: partnerDraft.totalSessions ? Number(partnerDraft.totalSessions) : null,
            sharedLocation: partnerDraft.sharedLocation,
            sharedSchedule: partnerDraft.sharedSchedule,
            policyNotes: partnerDraft.policyNotes,
            internalNotes: partnerDraft.internalNotes,
            packageTypeId: selectedPackageType?.id,
          }),
        });

        const payload = (await response.json()) as { error?: string; clientIds?: string[] };
        if (!response.ok) throw new Error(payload.error ?? "Unable to create partner signup.");
      } else {
        const startDate = new Date().toISOString().slice(0, 10);
        const sessionTotal = partnerDraft.totalSessions ? Number(partnerDraft.totalSessions) : null;
        const partnerPackageId = `partner-package-${Date.now()}`;
        const nextClients: Client[] = [
          {
            id: `client-${Date.now()}-a`,
            name: partnerDraft.clientAName.trim(),
            email: partnerDraft.clientAEmail.trim(),
            photo: "",
            goals: "Partner training goals not set yet.",
            level: "Foundation",
            injuries: "No limitations recorded.",
            notes: partnerDraft.internalNotes.trim() || "Partner training signup.",
            style: "Partner training",
            availability: partnerDraft.sharedSchedule.trim() || "Availability not specified.",
            startDate,
            status: "active",
            accessStatus: "not_invited",
            inviteSentAt: null,
            pricingTier: "ongoing_coaching",
            sessionPackage: { total: null, used: 0, remaining: null, activeSessionId: null, lastSessionAt: null },
            partnerPackage: {
              id: partnerPackageId,
              title: `${partnerDraft.clientAName.trim()} + ${partnerDraft.clientBName.trim()}`,
              status: "pending",
              totalSessions: sessionTotal,
              usedSessions: 0,
              remainingSessions: sessionTotal,
              sharedLocation: partnerDraft.sharedLocation.trim(),
              sharedSchedule: partnerDraft.sharedSchedule.trim(),
              partnerName: partnerDraft.clientBName.trim(),
            },
            adherence: 0,
            metrics: { bodyWeight: "—", workouts: 0, streak: 0, lastCheckIn: "No check-in yet" },
          },
          {
            id: `client-${Date.now()}-b`,
            name: partnerDraft.clientBName.trim(),
            email: partnerDraft.clientBEmail.trim(),
            photo: "",
            goals: "Partner training goals not set yet.",
            level: "Foundation",
            injuries: "No limitations recorded.",
            notes: partnerDraft.internalNotes.trim() || "Partner training signup.",
            style: "Partner training",
            availability: partnerDraft.sharedSchedule.trim() || "Availability not specified.",
            startDate,
            status: "active",
            accessStatus: "not_invited",
            inviteSentAt: null,
            pricingTier: "ongoing_coaching",
            sessionPackage: { total: null, used: 0, remaining: null, activeSessionId: null, lastSessionAt: null },
            partnerPackage: {
              id: partnerPackageId,
              title: `${partnerDraft.clientAName.trim()} + ${partnerDraft.clientBName.trim()}`,
              status: "pending",
              totalSessions: sessionTotal,
              usedSessions: 0,
              remainingSessions: sessionTotal,
              sharedLocation: partnerDraft.sharedLocation.trim(),
              sharedSchedule: partnerDraft.sharedSchedule.trim(),
              partnerName: partnerDraft.clientAName.trim(),
            },
            adherence: 0,
            metrics: { bodyWeight: "—", workouts: 0, streak: 0, lastCheckIn: "No check-in yet" },
          },
        ];
        const merged = [...nextClients, ...clients];
        setClients(merged);
        persist(merged);
      }

      setSignupOpen(false);
      setPartnerDraft(emptyPartnerSignup);
      setSignupKind("one_on_one");
      setMessage("Partner training signup created. Send invites when both clients are ready for setup.");
      window.setTimeout(() => setMessage(null), 2600);
      if (mode === "supabase") window.location.assign("/trainer/packages");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create partner signup.");
    } finally {
      setBusy(false);
    }
  }

  async function archiveSelected() {
    if (!selectedActiveIds.length) return;
    setBusy(true);
    setMessage(null);
    try {
      if (mode === "supabase") {
        const supabase = createBrowserClient();
        const { error } = await supabase.from("clients").update({ status: "archived" }).in("id", selectedActiveIds);
        if (error) throw error;
      }

      const nextClients = clients.map((client) =>
        selectedActiveIds.includes(client.id) ? { ...client, status: "archived" as ClientStatus } : client,
      );
      setClients(nextClients);
      persist(nextClients);
      setSelectedIds([]);
      setMessage("Selected clients marked inactive.");
      window.setTimeout(() => setMessage(null), 2200);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to mark selected clients inactive.");
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
      <Card className="mb-5 overflow-hidden p-0">
        <div className="border-b border-border bg-white/35 p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-[0.66rem] uppercase tracking-[0.3em] text-bronze-600">Roster workspace</p>
              <h2 className="mt-2 font-serif text-3xl font-semibold leading-tight text-charcoal-950 sm:text-4xl">Client operations at a glance.</h2>
              <p className="mt-3 text-sm leading-6 text-stone-600">
                Search the roster, track account access, and handle invite or inactive-status actions without opening every profile.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-sm text-stone-600">
              <div className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white/70 px-3 py-2">
                <Users className="size-4 text-bronze-500" />
                {clients.length} total
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white/70 px-3 py-2">
                <UserCheck className="size-4 text-sage-700" />
                {selectedIds.length} selected
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-5 sm:p-6">
          <RosterMetric icon={Users} label="Total clients" value={String(clients.length)} detail={`${activeClients} active`} tone="text-charcoal-950" />
          <RosterMetric icon={Clock3} label="Needs review" value={String(needsAttention)} detail="Status flags" tone="text-bronze-500" />
          <RosterMetric icon={UserCheck} label="Account active" value={String(accessSummary.active)} detail="Setup complete" tone="text-sage-700" />
          <RosterMetric icon={Mail} label="Invite pending" value={String(accessSummary.pending)} detail="Awaiting setup" tone="text-bronze-500" />
          <RosterMetric icon={UserPlus} label="Not invited" value={String(accessSummary.notInvited)} detail="Ready to send" tone="text-stone-600" />
        </div>

        <div className="border-t border-border bg-stone-50/45 p-5 sm:p-6">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search clients by name, goal, status, or access..."
                className="pl-10"
              />
            </div>
            <div className="flex flex-col gap-3 sm:flex-row xl:justify-end">
              <Button variant="warm" onClick={() => setSignupOpen(true)}>
                <PackagePlus className="size-4" />
                New signup
              </Button>
              <Button variant="secondary" onClick={() => setInviteOpen(true)} disabled={busy || selectedIds.length === 0}>
                <Mail className="size-4" />
                Send invites
              </Button>
              <Button variant="secondary" onClick={() => void archiveSelected()} disabled={busy || selectedActiveIds.length === 0}>
                <Archive className="size-4" />
                Mark inactive
              </Button>
            </div>
          </div>
        </div>
      </Card>

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
        <Card className="mb-5 flex flex-wrap items-center justify-between gap-3 p-4 text-sm text-stone-600">
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

      <Dialog.Root open={signupOpen} onOpenChange={setSignupOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-charcoal-950/35 backdrop-blur-sm" />
          <Dialog.Content asChild>
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.98 }}
              className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100vw-1.5rem)] max-w-4xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[2rem] border border-white/70 bg-ivory-50 p-5 shadow-soft outline-none sm:p-7"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Dialog.Title className="font-serif text-4xl font-semibold text-charcoal-950">New signup</Dialog.Title>
                  <Dialog.Description className="mt-2 text-sm leading-6 text-stone-600">
                    Create the client record through the package they are starting with.
                  </Dialog.Description>
                </div>
                <Dialog.Close asChild>
                  <Button variant="ghost" size="icon" aria-label="Close partner signup dialog">
                    <X className="size-5" />
                  </Button>
                </Dialog.Close>
              </div>

              <div className="mt-6 grid gap-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <PackageTypeButton
                    active={signupKind === "one_on_one"}
                    title="One-on-one"
                    description="One client, individual session package."
                    onClick={() => {
                      setSignupKind("one_on_one");
                      applyPackageType(initialPackageTypes.find((item) => item.kind === "one_on_one") ?? null);
                    }}
                  />
                  <PackageTypeButton
                    active={signupKind === "partner_training"}
                    title="Partner Training"
                    description="Two clients trained together in the same location."
                    onClick={() => {
                      setSignupKind("partner_training");
                      applyPackageType(initialPackageTypes.find((item) => item.kind === "partner_training") ?? null);
                    }}
                  />
                </div>

                <div className="rounded-[1.5rem] border border-stone-200 bg-stone-50/70 p-4">
                  <div className="grid gap-4 lg:grid-cols-[1fr_16rem] lg:items-end">
                    <Field label="Package type">
                      <select
                        value={selectedPackageType?.id ?? ""}
                        onChange={(event) => applyPackageType(matchingPackageTypes.find((item) => item.id === event.target.value) ?? null)}
                        className="h-11 rounded-2xl border border-stone-200 bg-white/80 px-4 text-sm shadow-inner-soft transition focus-visible:border-bronze-300 focus-visible:ring-4 focus-visible:ring-bronze-100"
                      >
                        {matchingPackageTypes.length ? (
                          matchingPackageTypes.map((packageType) => (
                            <option key={packageType.id} value={packageType.id}>
                              {packageType.name}
                            </option>
                          ))
                        ) : (
                          <option value="">Create package types from Packages first</option>
                        )}
                      </select>
                    </Field>
                    <Button asChild variant="secondary">
                      <Link href="/trainer/packages">
                        <PackagePlus className="size-4" />
                        Manage types
                      </Link>
                    </Button>
                  </div>
                  {selectedPackageType ? (
                    <div className="mt-4 grid gap-2 rounded-[1.25rem] bg-white/75 p-4 text-sm text-stone-600 sm:grid-cols-3">
                      <PackageSummary label="Sessions" value={selectedPackageType.sessionCount === null ? "Open" : String(selectedPackageType.sessionCount)} />
                      <PackageSummary label="Price" value={formatPackagePrice(selectedPackageType.priceCents, selectedPackageType.currency)} />
                      <PackageSummary label="Schedule" value={selectedPackageType.defaultSchedule || "Set below"} />
                    </div>
                  ) : null}
                </div>

                {signupKind === "one_on_one" ? (
                  <>
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
                          className="h-11 rounded-2xl border border-stone-200 bg-white/80 px-4 text-sm shadow-inner-soft transition focus-visible:border-bronze-300 focus-visible:ring-4 focus-visible:ring-bronze-100"
                        >
                          <option value="Foundation">Foundation</option>
                          <option value="Intermediate">Intermediate</option>
                          <option value="Advanced">Advanced</option>
                        </select>
                      </Field>
                      <Field label="Availability">
                        <Input value={draft.availability} onChange={(event) => setDraft((current) => ({ ...current, availability: event.target.value }))} />
                      </Field>
                      <Field label="Sessions">
                        <Input
                          type="number"
                          min="0"
                          value={draft.packageSessionLimit}
                          onChange={(event) => setDraft((current) => ({ ...current, packageSessionLimit: event.target.value }))}
                        />
                      </Field>
                    </div>
                    <Field label="Preferred training style">
                      <Textarea value={draft.style} onChange={(event) => setDraft((current) => ({ ...current, style: event.target.value }))} />
                    </Field>
                    <Field label="Notes">
                      <Textarea value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} />
                    </Field>
                  </>
                ) : (
                  <>
                    <div className="grid gap-4 lg:grid-cols-2">
                      <Card className="p-4">
                        <p className="text-[0.66rem] uppercase tracking-[0.22em] text-bronze-600">Client A</p>
                        <div className="mt-4 grid gap-4">
                          <Field label="Full name">
                            <Input value={partnerDraft.clientAName} onChange={(event) => setPartnerDraft((current) => ({ ...current, clientAName: event.target.value }))} />
                          </Field>
                          <Field label="Email">
                            <Input value={partnerDraft.clientAEmail} onChange={(event) => setPartnerDraft((current) => ({ ...current, clientAEmail: event.target.value }))} />
                          </Field>
                        </div>
                      </Card>
                      <Card className="p-4">
                        <p className="text-[0.66rem] uppercase tracking-[0.22em] text-bronze-600">Client B</p>
                        <div className="mt-4 grid gap-4">
                          <Field label="Full name">
                            <Input value={partnerDraft.clientBName} onChange={(event) => setPartnerDraft((current) => ({ ...current, clientBName: event.target.value }))} />
                          </Field>
                          <Field label="Email">
                            <Input value={partnerDraft.clientBEmail} onChange={(event) => setPartnerDraft((current) => ({ ...current, clientBEmail: event.target.value }))} />
                          </Field>
                        </div>
                      </Card>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                      <Field label="Shared sessions">
                        <Input
                          type="number"
                          min="0"
                          value={partnerDraft.totalSessions}
                          onChange={(event) => setPartnerDraft((current) => ({ ...current, totalSessions: event.target.value }))}
                        />
                      </Field>
                      <Field label="Shared location">
                        <Input value={partnerDraft.sharedLocation} onChange={(event) => setPartnerDraft((current) => ({ ...current, sharedLocation: event.target.value }))} />
                      </Field>
                      <Field label="Shared schedule">
                        <Input value={partnerDraft.sharedSchedule} onChange={(event) => setPartnerDraft((current) => ({ ...current, sharedSchedule: event.target.value }))} />
                      </Field>
                    </div>

                    <Field label="Client-facing policy note">
                      <Textarea value={partnerDraft.policyNotes} onChange={(event) => setPartnerDraft((current) => ({ ...current, policyNotes: event.target.value }))} />
                    </Field>
                    <Field label="Internal trainer notes">
                      <Textarea value={partnerDraft.internalNotes} onChange={(event) => setPartnerDraft((current) => ({ ...current, internalNotes: event.target.value }))} />
                    </Field>
                  </>
                )}
              </div>

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Dialog.Close asChild>
                  <Button variant="secondary">Cancel</Button>
                </Dialog.Close>
                <Button
                  variant="warm"
                  onClick={() => void (signupKind === "one_on_one" ? createOneOnOneSignup() : createPartnerSignup())}
                  disabled={busy}
                >
                  <Save className="size-4" />
                  {busy ? "Creating..." : signupKind === "one_on_one" ? "Create one-on-one signup" : "Create partner signup"}
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

function PackageTypeButton({
  active,
  title,
  description,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[1.25rem] border p-4 text-left transition ${
        active ? "border-charcoal-950 bg-white shadow-inner-soft" : "border-stone-200 bg-stone-50/70 hover:border-bronze-200"
      }`}
    >
      <p className="font-semibold text-charcoal-950">{title}</p>
      <p className="mt-2 text-sm leading-6 text-stone-600">{description}</p>
    </button>
  );
}

function formatPackagePrice(value: number | null, currency: string) {
  if (value === null) return "Not set";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD" }).format(value / 100);
}

function PackageSummary({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[0.62rem] uppercase tracking-[0.18em] text-stone-400">{label}</p>
      <p className="mt-1 font-semibold text-charcoal-950">{value}</p>
    </div>
  );
}

function RosterMetric({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  detail: string;
  tone: string;
}) {
  return (
    <div className="min-w-0 rounded-[1.25rem] border border-stone-200/80 bg-white/72 p-4 shadow-inner-soft">
      <div className="flex items-center justify-between gap-3">
        <p className="truncate text-[0.65rem] uppercase tracking-[0.2em] text-stone-400">{label}</p>
        <Icon className={`size-4 shrink-0 ${tone}`} />
      </div>
      <p className="mt-4 font-serif text-3xl font-semibold leading-none text-charcoal-950">{value}</p>
      <p className="mt-2 truncate text-xs text-stone-500">{detail}</p>
    </div>
  );
}
