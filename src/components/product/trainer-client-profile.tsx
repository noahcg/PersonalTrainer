"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowLeft, Ban, CalendarClock, CheckCircle2, Copy, ExternalLink, Mail, PencilLine, PlayCircle, Save, StickyNote, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { clientAccessDetail, clientAccessLabel } from "@/lib/client-access";
import { InviteComposeDialog } from "@/components/product/invite-compose-dialog";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { clients as demoClients } from "@/lib/demo-data";
import { deleteStoredDemoClient, readStoredDemoClientProfile, syncDemoClientRecord, writeStoredDemoClientProfile } from "@/lib/demo-client-storage";
import { defaultInviteMessage, defaultInviteSubject } from "@/lib/invitations";
import { pricingTierDetail, pricingTierLabel, pricingTierOptions } from "@/lib/pricing";
import { createClient as createBrowserClient } from "@/lib/supabase-browser";
import type { Client, ClientSession, ClientStatus, CoachingEntry, Plan, PricingTier } from "@/lib/types";

export function TrainerClientProfile({
  initialClient,
  assignedPlan,
  initialCoachingNotes,
  initialSessions,
  mode,
}: {
  initialClient: Client;
  assignedPlan: Plan;
  initialCoachingNotes: CoachingEntry[];
  initialSessions: ClientSession[];
  mode: "demo" | "supabase";
}) {
  const [client, setClient] = useState(initialClient);
  const [coachingNotes, setCoachingNotes] = useState<CoachingEntry[]>(initialCoachingNotes);
  const [sessions, setSessions] = useState<ClientSession[]>(initialSessions);
  const [editOpen, setEditOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [draftClient, setDraftClient] = useState(initialClient);
  const [draftNote, setDraftNote] = useState("");
  const [sessionLocation, setSessionLocation] = useState("In person");
  const [sessionNotes, setSessionNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [invitePreviewLink, setInvitePreviewLink] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== "demo") return;

    const stored = readStoredDemoClientProfile(initialClient.id);
    if (!stored) return;

    const timeout = window.setTimeout(() => {
      setClient(stored.client);
      setDraftClient(stored.client);
      setCoachingNotes(stored.coachingNotes ?? []);
      setSessions(stored.sessions ?? initialSessions);
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [initialClient, initialSessions, mode]);

  function persist(nextClient: Client, nextNotes: CoachingEntry[], nextSessions = sessions) {
    writeStoredDemoClientProfile(initialClient.id, { client: nextClient, coachingNotes: nextNotes, sessions: nextSessions });
    syncDemoClientRecord(nextClient, demoClients);
  }

  function withSessionPackage(nextClient: Client, nextSessions: ClientSession[]) {
    const used = nextSessions.filter((session) => session.status === "completed").length;
    const activeSession = nextSessions.find((session) => session.status === "active") ?? null;
    const lastCompleted = nextSessions.find((session) => session.status === "completed") ?? null;
    const total = nextClient.sessionPackage.total;

    return {
      ...nextClient,
      sessionPackage: {
        total,
        used,
        remaining: total === null ? null : Math.max(total - used, 0),
        activeSessionId: activeSession?.id ?? null,
        lastSessionAt: lastCompleted?.startedAt ?? null,
      },
    };
  }

  function updateDraft(field: keyof Client, value: string | ClientStatus | PricingTier) {
    setDraftClient((current) => ({ ...current, [field]: value }));
  }

  function updateDraftSessionLimit(value: string) {
    const trimmed = value.trim();
    const total = trimmed ? Math.max(Number(trimmed), 0) : null;
    setDraftClient((current) => ({
      ...current,
      sessionPackage: {
        ...current.sessionPackage,
        total,
        remaining: total === null ? null : Math.max(total - current.sessionPackage.used, 0),
      },
    }));
  }

  async function saveProfile() {
    setBusy(true);
    setMessage(null);

    try {
      if (mode === "supabase") {
        const supabase = createBrowserClient();
        let { error } = await supabase
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
            pricing_tier: draftClient.pricingTier,
            package_session_limit: draftClient.sessionPackage.total,
          })
          .eq("id", draftClient.id);

        if (error?.message.includes("package_session_limit")) {
          const retry = await supabase
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
              pricing_tier: draftClient.pricingTier,
            })
            .eq("id", draftClient.id);
          error = retry.error;
        }

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

  async function startInPersonSession() {
    if (client.sessionPackage.activeSessionId) return;
    setBusy(true);
    setMessage(null);

    try {
      let nextSessions = sessions;
      const startedAt = new Date();

      if (mode === "supabase") {
        const supabase = createBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) throw new Error("You need an authenticated trainer session to start a client session.");

        const { data: inserted, error } = await supabase
          .from("client_sessions")
          .insert({
            client_id: client.id,
            started_at: startedAt.toISOString(),
            status: "active",
            location: sessionLocation.trim() || "In person",
            notes: sessionNotes.trim() || null,
            created_by: "trainer",
          })
          .select("id, client_id, started_at, completed_at, status, location, notes, duration_minutes, created_by")
          .single<{
            id: string;
            client_id: string;
            started_at: string;
            completed_at: string | null;
            status: ClientSession["status"];
            location: string | null;
            notes: string | null;
            duration_minutes: number | null;
            created_by: "trainer" | "client";
          }>();

        if (error || !inserted) throw error ?? new Error("Unable to start in-person session.");

        nextSessions = [
          {
            id: inserted.id,
            clientId: inserted.client_id,
            startedAt: new Date(inserted.started_at).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            }),
            completedAt: null,
            status: inserted.status,
            location: inserted.location ?? "",
            notes: inserted.notes ?? "",
            durationMinutes: inserted.duration_minutes,
            createdBy: inserted.created_by,
          },
          ...sessions,
        ];
      } else {
        nextSessions = [
          {
            id: `client-session-${Date.now()}`,
            clientId: client.id,
            startedAt: startedAt.toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            }),
            completedAt: null,
            status: "active",
            location: sessionLocation.trim() || "In person",
            notes: sessionNotes.trim(),
            durationMinutes: null,
            createdBy: "trainer",
          },
          ...sessions,
        ];
      }

      const nextClient = withSessionPackage(client, nextSessions);
      setSessions(nextSessions);
      setClient(nextClient);
      setDraftClient(nextClient);
      if (mode === "demo") persist(nextClient, coachingNotes, nextSessions);
      setSessionNotes("");
      setMessage("In-person session started.");
      window.setTimeout(() => setMessage(null), 2400);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to start in-person session.");
    } finally {
      setBusy(false);
    }
  }

  async function completeInPersonSession(sessionId: string) {
    setBusy(true);
    setMessage(null);

    try {
      const completedAt = new Date();
      const session = sessions.find((item) => item.id === sessionId);
      const startedTime = session ? new Date(session.startedAt).getTime() : completedAt.getTime();
      const durationMinutes = Math.max(Math.round((completedAt.getTime() - startedTime) / 60000), 1);

      if (mode === "supabase") {
        const supabase = createBrowserClient();
        const { error } = await supabase
          .from("client_sessions")
          .update({
            status: "completed",
            completed_at: completedAt.toISOString(),
            duration_minutes: durationMinutes,
          })
          .eq("id", sessionId)
          .eq("client_id", client.id);
        if (error) throw error;
      }

      const nextSessions = sessions.map((item) =>
        item.id === sessionId
          ? {
              ...item,
              status: "completed" as const,
              completedAt: completedAt.toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              }),
              durationMinutes,
            }
          : item,
      );
      const nextClient = withSessionPackage(client, nextSessions);
      setSessions(nextSessions);
      setClient(nextClient);
      setDraftClient(nextClient);
      if (mode === "demo") persist(nextClient, coachingNotes, nextSessions);
      setMessage("In-person session completed and counted against package.");
      window.setTimeout(() => setMessage(null), 2600);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to complete in-person session.");
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

  async function sendInvite(inviteDraft: { subject: string; message: string }) {
    setBusy(true);
    setMessage(null);

    try {
      if (mode === "supabase") {
        const response = await fetch("/api/invitations/client", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            clientId: client.id,
            subject: inviteDraft.subject,
            message: inviteDraft.message,
          }),
        });

        const payload = (await response.json()) as { error?: string; inviteSentAt?: string; actionLink?: string };
        if (!response.ok) {
          throw new Error(payload.error ?? "Unable to send invite.");
        }

        const nextClient = {
          ...client,
          accessStatus: "invite_pending" as const,
          inviteSentAt: payload.inviteSentAt
            ? new Date(payload.inviteSentAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })
            : client.inviteSentAt,
        };

        setClient(nextClient);
        setDraftClient(nextClient);
        const nextInvitePreviewLink = payload.actionLink ?? null;
        setInvitePreviewLink(nextInvitePreviewLink);
        setInviteOpen(false);
        setMessage(
          nextInvitePreviewLink
            ? client.accessStatus === "invite_pending"
              ? "Invite link regenerated for local testing."
              : "Invite link generated for local testing."
            : client.accessStatus === "invite_pending"
              ? "Invite resent."
              : "Invite sent.",
        );
      } else {
        const nextClient = {
          ...client,
          accessStatus: "invite_pending" as const,
          inviteSentAt: new Date().toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
        };
        setClient(nextClient);
        setDraftClient(nextClient);
        persist(nextClient, coachingNotes);
        setInviteOpen(false);
        setMessage(client.accessStatus === "invite_pending" ? "Invite resent." : "Invite sent.");
      }
      window.setTimeout(() => setMessage(null), 2400);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to send invite.");
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

  async function deleteClient() {
    setDeleteBusy(true);
    setDeleteError(null);
    setMessage(null);

    try {
      if (mode === "supabase") {
        const response = await fetch(`/api/trainer/clients/${client.id}`, {
          method: "DELETE",
        });
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        if (!response.ok) {
          const supabase = createBrowserClient();
          const { error } = await supabase.from("clients").delete().eq("id", client.id);
          if (error) {
            throw new Error(payload.error ?? error.message ?? "Unable to delete client.");
          }
        }
      } else {
        deleteStoredDemoClient(client.id, demoClients);
      }

      setDeleteOpen(false);
      window.location.assign("/trainer/clients");
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Unable to delete client.");
    } finally {
      setDeleteBusy(false);
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
  const activeSession = sessions.find((session) => session.status === "active") ?? null;

  return (
    <>
      <div className="space-y-5">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-border bg-white/35 p-5 sm:p-6">
            <Button asChild variant="ghost" size="sm" className="-ml-2 mb-5 w-fit">
              <Link href="/trainer/clients">
                <ArrowLeft className="size-4" />
                Back to roster
              </Link>
            </Button>
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start">
                <Avatar name={client.name} src={client.photo} className="size-20 sm:size-24" />
                <div className="min-w-0">
                  <h2 className="font-serif text-4xl font-semibold leading-tight text-charcoal-950 sm:text-5xl">{client.name}</h2>
                  <p className="mt-2 break-all text-sm text-stone-500">{client.email}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Badge variant="sage">{client.level}</Badge>
                    <Badge variant="dark">{pricingTierLabel(client.pricingTier)}</Badge>
                    <Badge variant="default">{clientAccessLabel(client.accessStatus)}</Badge>
                    <Badge variant={client.status === "needs_attention" ? "alert" : client.status === "archived" ? "default" : "bronze"}>
                      {client.status.replace("_", " ")}
                    </Badge>
                  </div>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">{clientAccessDetail(client.accessStatus, client.inviteSentAt)}</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:w-[21rem] lg:grid-cols-1">
                {client.accessStatus !== "account_active" ? (
                  <Button variant="secondary" onClick={() => setInviteOpen(true)} disabled={busy}>
                    <Mail className="size-4" />
                    {client.accessStatus === "invite_pending" ? "Resend access invite" : "Send access invite"}
                  </Button>
                ) : null}
                <Button variant="warm" onClick={() => setNoteOpen(true)}>
                  <StickyNote className="size-4" />
                  Leave coaching note
                </Button>
                <Button variant="warm" onClick={() => void startInPersonSession()} disabled={busy || Boolean(activeSession)}>
                  <PlayCircle className="size-4" />
                  {activeSession ? "Session active" : "Start in-person session"}
                </Button>
                <Button variant="secondary" onClick={() => setEditOpen(true)}>
                  <PencilLine className="size-4" />
                  Edit profile
                </Button>
              </div>
            </div>
          </div>

          <div className="grid gap-5 p-5 lg:grid-cols-[1fr_18rem] sm:p-6">
            <div>
              <div className="mb-2 flex justify-between text-sm text-stone-500">
                <span>Adherence</span>
                <span>{client.adherence}%</span>
              </div>
              <Progress value={client.adherence} />
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <MetricTile label="Workouts" value={String(client.metrics.workouts)} />
                <MetricTile label="In-person sessions" value={`${client.sessionPackage.used}/${client.sessionPackage.total ?? "∞"}`} />
                <MetricTile label="Remaining" value={client.sessionPackage.remaining === null ? "∞" : String(client.sessionPackage.remaining)} />
              </div>
            </div>
            <div className="grid content-start gap-3">
              <Button variant="ghost" onClick={deactivateClient} disabled={busy}>
                <Ban className="size-4" />
                {client.status === "archived" ? "Reactivate client" : "Deactivate client"}
              </Button>
              <Button
                variant="ghost"
                onClick={() => setDeleteOpen(true)}
                disabled={busy}
                className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
              >
                <Trash2 className="size-4" />
                Delete client
              </Button>
            </div>
          </div>
        </Card>

        {invitePreviewLink ? (
          <Card className="border-sage-200 bg-sage-50/55 p-5">
            <p className="text-[0.66rem] uppercase tracking-[0.22em] text-sage-700">Local invite testing</p>
            <p className="mt-2 text-sm leading-6 text-stone-700">
              Email is not configured, so this setup link was generated for local testing. Open it in an incognito window to complete this client’s account setup.
            </p>
            <p className="mt-3 break-all text-sm leading-6 text-stone-600">{invitePreviewLink}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void navigator.clipboard.writeText(invitePreviewLink)}
              >
                <Copy className="size-4" />
                Copy link
              </Button>
              <Button asChild variant="warm" size="sm">
                <Link href={invitePreviewLink} target="_blank" rel="noreferrer">
                  Open link
                  <ExternalLink className="size-4" />
                </Link>
              </Button>
            </div>
          </Card>
        ) : null}

        <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
          <Card className="overflow-hidden p-0">
            <CardHeader className="border-b border-border bg-white/35">
              <CardTitle>Profile context</CardTitle>
              <p className="text-sm leading-6 text-stone-500">The training details that shape programming, cueing, and weekly decisions.</p>
            </CardHeader>
            <CardContent className="p-0">
              <div className="grid divide-y divide-border md:grid-cols-2 md:divide-x md:divide-y-0">
                <div className="grid divide-y divide-border">
                  {sections.slice(0, 3).map(([title, body]) => (
                    <ProfileContextRow key={title} title={title} body={body} />
                  ))}
                </div>
                <div className="grid divide-y divide-border">
                  {sections.slice(3).map(([title, body]) => (
                    <ProfileContextRow key={title} title={title} body={body} />
                  ))}
                  <div className="p-5 sm:p-6">
                    <p className="text-[0.66rem] uppercase tracking-[0.22em] text-stone-400">Pricing package</p>
                    <div className="mt-3">
                      <Badge variant="dark">{pricingTierLabel(client.pricingTier)}</Badge>
                    </div>
                    <p className="mt-4 text-sm leading-6 text-stone-600">{pricingTierDetail(client.pricingTier)}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden p-0">
            <CardHeader className="border-b border-border bg-white/35">
              <CardTitle>Coaching activity</CardTitle>
              <p className="text-sm leading-6 text-stone-500">Recent notes and the plan currently anchoring this client’s work.</p>
            </CardHeader>
            <CardContent className="p-0">
              <div className="border-b border-border p-5 sm:p-6">
                <p className="text-[0.66rem] uppercase tracking-[0.22em] text-stone-400">Assigned plan</p>
                <p className="mt-3 text-xl font-semibold text-charcoal-950">{assignedPlan.title}</p>
                <p className="mt-2 text-sm leading-6 text-stone-600">{assignedPlan.description}</p>
              </div>
              <div className="p-5 sm:p-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <p className="text-[0.66rem] uppercase tracking-[0.22em] text-stone-400">Recent notes</p>
                  <Button variant="ghost" size="sm" onClick={() => setNoteOpen(true)}>
                    <StickyNote className="size-4" />
                    Add note
                  </Button>
                </div>
                <div className="space-y-3">
                  {coachingNotes.length ? (
                    coachingNotes.map((note) => (
                      <div key={note.id} className="border-l-2 border-bronze-200 pl-4">
                        <p className="text-sm leading-6 text-stone-700">{note.body}</p>
                        <p className="mt-2 text-xs uppercase tracking-[0.18em] text-stone-400">{note.createdAt}</p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[1.25rem] bg-stone-50 p-4 text-sm text-stone-500">
                      No coaching notes yet. Use the note action to leave your first cue, reminder, or encouragement.
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="overflow-hidden p-0">
          <CardHeader className="border-b border-border bg-white/35">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle>In-person session package</CardTitle>
                <p className="text-sm leading-6 text-stone-500">
                  Track live coached sessions separately from at-home workout logs.
                </p>
              </div>
              <Badge variant={client.sessionPackage.remaining === 0 ? "alert" : "sage"}>
                {client.sessionPackage.remaining === null ? "Open package" : `${client.sessionPackage.remaining} remaining`}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid gap-5 border-b border-border p-5 lg:grid-cols-[1fr_22rem] sm:p-6">
              <div className="grid gap-3 sm:grid-cols-3">
                <MetricTile label="Package total" value={client.sessionPackage.total === null ? "Open" : String(client.sessionPackage.total)} />
                <MetricTile label="Used" value={String(client.sessionPackage.used)} />
                <MetricTile label="Last in-person" value={client.sessionPackage.lastSessionAt ?? "None yet"} />
              </div>
              <div className="grid gap-3">
                <Input value={sessionLocation} onChange={(event) => setSessionLocation(event.target.value)} placeholder="Studio, client home, gym..." />
                <Input value={sessionNotes} onChange={(event) => setSessionNotes(event.target.value)} placeholder="Optional session note" />
                {activeSession ? (
                  <Button variant="warm" onClick={() => void completeInPersonSession(activeSession.id)} disabled={busy}>
                    <CheckCircle2 className="size-4" />
                    {busy ? "Completing..." : "Complete active session"}
                  </Button>
                ) : (
                  <Button variant="warm" onClick={() => void startInPersonSession()} disabled={busy}>
                    <PlayCircle className="size-4" />
                    {busy ? "Starting..." : "Start in-person session"}
                  </Button>
                )}
              </div>
            </div>
            <div className="p-5 sm:p-6">
              <div className="mb-4 flex items-center gap-2">
                <CalendarClock className="size-4 text-bronze-600" />
                <p className="text-[0.66rem] uppercase tracking-[0.22em] text-stone-400">Session ledger</p>
              </div>
              <div className="grid gap-3">
                {sessions.length ? (
                  sessions.map((session) => (
                    <div key={session.id} className="rounded-[1.25rem] border border-stone-200 bg-white/70 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
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
                        {session.status === "active" ? (
                          <Button variant="secondary" size="sm" onClick={() => void completeInPersonSession(session.id)} disabled={busy}>
                            Complete
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[1.25rem] bg-stone-50 p-4 text-sm text-stone-500">
                    No in-person sessions recorded yet. Start a session when live training begins.
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
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
                      className="h-11 rounded-2xl border border-stone-200 bg-white/80 px-4 text-sm shadow-inner-soft transition focus-visible:border-bronze-300 focus-visible:ring-4 focus-visible:ring-bronze-100"
                    >
                      <option value="active">Active</option>
                      <option value="needs_attention">Needs attention</option>
                      <option value="paused">Paused</option>
                      <option value="archived">Archived</option>
                    </select>
                  </Field>
                  <Field label="Pricing package">
                    <select
                      value={draftClient.pricingTier}
                      onChange={(event) => updateDraft("pricingTier", event.target.value as PricingTier)}
                      className="h-11 rounded-2xl border border-stone-200 bg-white/80 px-4 text-sm shadow-inner-soft transition focus-visible:border-bronze-300 focus-visible:ring-4 focus-visible:ring-bronze-100"
                    >
                      {pricingTierOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="In-person session package">
                    <Input
                      type="number"
                      min="0"
                      value={draftClient.sessionPackage.total ?? ""}
                      onChange={(event) => updateDraftSessionLimit(event.target.value)}
                      placeholder="Leave blank for open-ended"
                    />
                  </Field>
                  <Field label="Fitness level">
                    <select
                      value={draftClient.level}
                      onChange={(event) => updateDraft("level", event.target.value as Client["level"])}
                      className="h-11 rounded-2xl border border-stone-200 bg-white/80 px-4 text-sm shadow-inner-soft transition focus-visible:border-bronze-300 focus-visible:ring-4 focus-visible:ring-bronze-100"
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

      <InviteComposeDialog
        key={`${client.id}-${client.accessStatus}`}
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        title={client.accessStatus === "invite_pending" ? "Resend access invite" : "Send access invite"}
        description={`Write the email ${client.name} will receive with their setup link.`}
        defaultSubject={defaultInviteSubject(client.name)}
        defaultMessage={defaultInviteMessage(client.name)}
        busy={busy}
        onSend={sendInvite}
      />

      <Dialog.Root
        open={deleteOpen}
        onOpenChange={(open) => {
          if (deleteBusy) return;
          setDeleteOpen(open);
          if (!open) setDeleteError(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-charcoal-950/35 backdrop-blur-sm" />
          <Dialog.Content asChild>
            <ModalShell
              title="Delete client"
              description="This permanently removes the client from the system. If they have login access, their account will be deleted too."
            >
              <div className="rounded-[1.5rem] border border-rose-200 bg-rose-50 p-5 text-sm leading-6 text-stone-700">
                This action is permanent. Client profile data, assignments, messages, logs, check-ins, and related records will be removed.
              </div>
              {deleteError ? (
                <div className="mt-4 rounded-[1.25rem] border border-rose-200 bg-white px-4 py-3 text-sm font-medium text-rose-700">
                  {deleteError}
                </div>
              ) : null}
              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Dialog.Close asChild>
                  <Button type="button" variant="secondary" disabled={deleteBusy}>
                    Cancel
                  </Button>
                </Dialog.Close>
                <Button
                  type="button"
                  onClick={() => void deleteClient()}
                  disabled={deleteBusy}
                  className="bg-rose-600 text-white hover:bg-rose-700"
                >
                  <Trash2 className="size-4" />
                  {deleteBusy ? "Deleting..." : "Delete client permanently"}
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

function ProfileContextRow({ title, body }: { title: string; body: string }) {
  return (
    <div className="p-5 sm:p-6">
      <p className="text-[0.66rem] uppercase tracking-[0.22em] text-stone-400">{title}</p>
      <p className="mt-3 text-sm leading-7 text-stone-600">{body}</p>
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
