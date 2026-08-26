"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { ArrowLeft, Ban, CalendarClock, CheckCircle2, Copy, Dumbbell, ExternalLink, Mail, NotebookPen, Package, PencilLine, Save, Search, Send, StickyNote, Trash2, X } from "lucide-react";
import { forwardRef, type HTMLAttributes, useEffect, useMemo, useRef, useState } from "react";
import { clientAccessDetail } from "@/lib/client-access";
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
import { pricingTierDetail, pricingTierLabel } from "@/lib/pricing";
import { createClient as createBrowserClient } from "@/lib/supabase-browser";
import type { Client, ClientIntake, ClientSession, ClientStatus, CoachingEntry, PackageType, Plan, PricingTier, Workout, WorkoutAssignment } from "@/lib/types";

function isoDateAfter(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatDateOnly(value?: string) {
  if (!value) return "Not scheduled";
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function assignmentWindowLabel(assignment: WorkoutAssignment) {
  const scheduled = assignment.scheduledFor ? formatDateOnly(assignment.scheduledFor) : "";
  const due = assignment.dueOn ? formatDateOnly(assignment.dueOn) : "";
  if (scheduled && due) return scheduled === due ? `Scheduled ${scheduled}` : `${scheduled} - due ${due}`;
  if (due) return `Due ${due}`;
  if (scheduled) return `Scheduled ${scheduled}`;
  return "No date set";
}

function assignmentStatusLabel(status?: WorkoutAssignment["status"]) {
  if (status === "completed") return "Completed";
  if (status === "overdue") return "Overdue";
  return "Assigned";
}

function assignmentStatusVariant(status?: WorkoutAssignment["status"]) {
  if (status === "completed") return "sage";
  if (status === "overdue") return "alert";
  return "bronze";
}

export function TrainerClientProfile({
  initialClient,
  intake,
  assignedPlan,
  initialCoachingNotes,
  initialSessions,
  packageTypes,
  initialWorkouts,
  mode,
}: {
  initialClient: Client;
  intake: ClientIntake | null;
  assignedPlan: Plan;
  initialCoachingNotes: CoachingEntry[];
  initialSessions: ClientSession[];
  packageTypes: PackageType[];
  initialWorkouts: Workout[];
  mode: "demo" | "supabase";
}) {
  const [client, setClient] = useState(initialClient);
  const [coachingNotes, setCoachingNotes] = useState<CoachingEntry[]>(initialCoachingNotes);
  const [sessions, setSessions] = useState<ClientSession[]>(initialSessions);
  const [editOpen, setEditOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [detailTab, setDetailTab] = useState<"context" | "workouts" | "coaching" | "sessions">("context");
  const [workouts, setWorkouts] = useState(initialWorkouts);
  const [workoutQuery, setWorkoutQuery] = useState("");
  const [selectedWorkoutId, setSelectedWorkoutId] = useState(initialWorkouts[0]?.id ?? "");
  const [assignmentScheduledFor, setAssignmentScheduledFor] = useState(() => isoDateAfter(1));
  const [assignmentDueOn, setAssignmentDueOn] = useState(() => isoDateAfter(7));
  const [assignmentNotes, setAssignmentNotes] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [draftClient, setDraftClient] = useState(initialClient);
  const [draftPackageTypeId, setDraftPackageTypeId] = useState("");
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
    let nextClient = draftClient;

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

        if (draftPackageTypeId) {
          const response = await fetch(`/api/trainer/clients/${client.id}/package`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ packageTypeId: draftPackageTypeId }),
          });
          const payload = (await response.json()) as { error?: string; sessionCount?: number | null; packageName?: string };
          if (!response.ok) throw new Error(payload.error ?? "Unable to assign package.");
          nextClient = {
            ...nextClient,
            style: payload.packageName ?? nextClient.style,
            sessionPackage: {
              ...nextClient.sessionPackage,
              total: payload.sessionCount ?? null,
              remaining:
                payload.sessionCount === null || payload.sessionCount === undefined
                  ? null
                  : Math.max(payload.sessionCount - nextClient.sessionPackage.used, 0),
            },
          };
        }
      } else {
        const packageType = packageTypes.find((item) => item.id === draftPackageTypeId);
        if (packageType) {
          nextClient = {
            ...nextClient,
            style: packageType.name,
            sessionPackage: {
              ...nextClient.sessionPackage,
              total: packageType.sessionCount,
              remaining:
                packageType.sessionCount === null
                  ? null
                  : Math.max(packageType.sessionCount - nextClient.sessionPackage.used, 0),
            },
          };
        }
        persist(nextClient, coachingNotes);
      }

      setClient(nextClient);
      setDraftClient(nextClient);
      setEditOpen(false);
      setDraftPackageTypeId("");
      setMessage("Profile saved.");
      window.setTimeout(() => setMessage(null), 2400);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save profile.");
    } finally {
      setBusy(false);
    }
  }

  async function logInPersonSession() {
    setBusy(true);
    setMessage(null);

    try {
      let nextSessions = sessions;
      const loggedAt = new Date();

      if (mode === "supabase") {
        const supabase = createBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) throw new Error("You need an authenticated trainer session to log a client session.");

        const { data: inserted, error } = await supabase
          .from("client_sessions")
          .insert({
            client_id: client.id,
            started_at: loggedAt.toISOString(),
            completed_at: loggedAt.toISOString(),
            status: "completed",
            location: sessionLocation.trim() || "In person",
            notes: sessionNotes.trim() || null,
            duration_minutes: null,
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

        if (error || !inserted) throw error ?? new Error("Unable to log in-person session.");

        nextSessions = [
          {
            id: inserted.id,
            clientId: inserted.client_id,
            startedAtIso: inserted.started_at,
            startedAt: new Date(inserted.started_at).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            }),
            completedAt: inserted.completed_at
              ? new Date(inserted.completed_at).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })
              : null,
            completedAtIso: inserted.completed_at,
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
            startedAtIso: loggedAt.toISOString(),
            startedAt: loggedAt.toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            }),
            completedAt: loggedAt.toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            }),
            completedAtIso: loggedAt.toISOString(),
            status: "completed",
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
      setMessage("In-person session logged and counted against package.");
      window.setTimeout(() => setMessage(null), 2400);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to log in-person session.");
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
      const startedTime = session ? new Date(session.startedAtIso).getTime() : completedAt.getTime();
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
              completedAtIso: completedAt.toISOString(),
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
      setMessage(nextStatus === "archived" ? "Client marked inactive." : "Client reactivated.");
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

  const profileContextRows = useMemo<Array<[string, string]>>(
    () => [
      ["Goals", intake?.goals.primary || client.goals],
      ["Preferred training style", intake?.training.likes || client.style],
      ["Fitness level", client.level],
      ["Injuries / limitations", client.injuries],
      ["Availability", client.availability],
      ["Trainer notes", client.notes],
      ["Pricing package", `${pricingTierLabel(client.pricingTier)}. ${pricingTierDetail(client.pricingTier)}`],
    ],
    [client, intake],
  );
  const intakeContextRows = useMemo<Array<[string, string]>>(() => {
    const lastWorkout =
      [intake?.training.lastWorkoutWhen, intake?.training.lastWorkoutWhat].filter(Boolean).join(" · ") ||
      intake?.training.currentActivity ||
      "Not provided";
    const intakeSubmitted = intake?.completedAt
      ? new Date(intake.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : "Not completed yet";

    return [
      ["Intake submitted", intakeSubmitted],
      ["Age", intake?.metrics.age || "Not provided"],
      ["Last workout", lastWorkout],
    ];
  }, [intake]);
  const partnerPackage = client.partnerPackage;
  const assignablePackageTypes = partnerPackage ? [] : packageTypes.filter((packageType) => packageType.kind === "one_on_one" && packageType.active);
  const selectedDraftPackageType = assignablePackageTypes.find((item) => item.id === draftPackageTypeId) ?? null;
  const clientWorkoutAssignments = useMemo(
    () =>
      workouts
        .flatMap((workout) =>
          (workout.assignments ?? [])
            .filter((assignment) => assignment.clientId === client.id)
            .map((assignment) => ({ workout, assignment })),
        )
        .sort((a, b) => {
          const aStatus = a.assignment.status === "completed" ? 1 : 0;
          const bStatus = b.assignment.status === "completed" ? 1 : 0;
          if (aStatus !== bStatus) return aStatus - bStatus;
          return (a.assignment.dueOn || "9999-12-31").localeCompare(b.assignment.dueOn || "9999-12-31");
        }),
    [client.id, workouts],
  );
  const filteredWorkoutOptions = useMemo(
    () =>
      workouts.filter((workout) =>
        [workout.name, workout.dayLabel, workout.coachNotes].join(" ").toLowerCase().includes(workoutQuery.trim().toLowerCase()),
      ),
    [workoutQuery, workouts],
  );
  const selectedWorkout = workouts.find((workout) => workout.id === selectedWorkoutId) ?? workouts[0] ?? null;

  async function assignClientWorkout() {
    if (!selectedWorkout) return;
    if (!assignmentScheduledFor && !assignmentDueOn) {
      setMessage("Set an available date or completion deadline.");
      window.setTimeout(() => setMessage(null), 2400);
      return;
    }
    if (assignmentScheduledFor && assignmentDueOn && assignmentDueOn < assignmentScheduledFor) {
      setMessage("Completion deadline cannot be before the available date.");
      window.setTimeout(() => setMessage(null), 2400);
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      if (mode === "supabase") {
        const response = await fetch(`/api/trainer/clients/${client.id}/workout-assignments`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            workoutId: selectedWorkout.id,
            scheduledFor: assignmentScheduledFor,
            dueOn: assignmentDueOn,
            notes: assignmentNotes,
          }),
        });
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        if (!response.ok) throw new Error(payload.error ?? "Unable to assign workout.");
      }

      const nextAssignment: WorkoutAssignment = {
        clientId: client.id,
        clientName: client.name,
        assignedOn: new Date().toISOString().slice(0, 10),
        scheduledFor: assignmentScheduledFor,
        dueOn: assignmentDueOn,
        notes: assignmentNotes.trim(),
        status: assignmentDueOn && assignmentDueOn < new Date().toISOString().slice(0, 10) ? "overdue" : "assigned",
        completedAt: "",
      };
      setWorkouts((current) =>
        current.map((workout) => {
          if (workout.id !== selectedWorkout.id) return workout;
          const otherAssignments = (workout.assignments ?? []).filter((assignment) => assignment.clientId !== client.id);
          const assignments = [nextAssignment, ...otherAssignments];
          return {
            ...workout,
            assignments,
            assignment: assignments[0],
            assignedClientIds: assignments.map((assignment) => assignment.clientId),
            assignedClientNames: assignments.map((assignment) => assignment.clientName ?? "Client"),
          };
        }),
      );
      setAssignmentNotes("");
      setMessage("Workout scheduled for client.");
      window.setTimeout(() => setMessage(null), 2400);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to assign workout.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="space-y-5">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-border bg-white/35 p-4 sm:p-5">
            <Button asChild variant="ghost" size="sm" className="-ml-2 mb-4 w-fit">
              <Link href="/trainer/clients">
                <ArrowLeft className="size-4" />
                Back to roster
              </Link>
            </Button>
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
              <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
                <Avatar name={client.name} src={client.photo} className="size-16 sm:size-[4.5rem]" />
                <div className="min-w-0">
                  <h2 className="font-serif text-3xl font-semibold leading-tight text-charcoal-950 sm:text-4xl">{client.name}</h2>
                  <p className="mt-1 break-all text-sm text-stone-500">{client.email}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant="sage">{client.level}</Badge>
                    <Badge variant="dark">{pricingTierLabel(client.pricingTier)}</Badge>
                    <Badge variant={client.status === "archived" ? "default" : "sage"}>
                      {client.status === "archived" ? "Inactive" : "Active"}
                    </Badge>
                    {partnerPackage ? <Badge variant="bronze">Partner Training</Badge> : null}
                  </div>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
                    {client.status === "archived"
                      ? "Client can log in with data-only access to profile, progress, and recorded history."
                      : client.accessStatus === "account_active"
                        ? "Client has full training access."
                        : clientAccessDetail(client.accessStatus, client.inviteSentAt)}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 xl:max-w-[39rem] xl:justify-end">
                {client.accessStatus !== "account_active" ? (
                  <Button variant="secondary" size="sm" onClick={() => setInviteOpen(true)} disabled={busy} className="bg-white">
                    <Mail className="size-4" />
                    {client.accessStatus === "invite_pending" ? "Resend access invite" : "Send access invite"}
                  </Button>
                ) : null}
                <Button
                  variant="warm"
                  size="sm"
                  onClick={() => void logInPersonSession()}
                  disabled={busy || client.status === "archived"}
                  className="shadow-warm"
                >
                  <CheckCircle2 className="size-4" />
                  {client.status === "archived" ? "Client inactive" : busy ? "Logging..." : "Log in-person session"}
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)} className="bg-ivory-50">
                  <PencilLine className="size-4" />
                  Edit profile
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={deactivateClient}
                  disabled={busy}
                  className="bg-stone-50/80 text-stone-700 ring-1 ring-stone-200/80 hover:bg-white"
                >
                  <Ban className="size-4" />
                  {client.status === "archived" ? "Reactivate client" : "Mark inactive"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteOpen(true)}
                  disabled={busy}
                  className="bg-rose-50/70 text-rose-600 ring-1 ring-rose-100 hover:bg-rose-50 hover:text-rose-700"
                >
                  <Trash2 className="size-4" />
                  Delete client
                </Button>
              </div>
            </div>
          </div>

          <div className="border-t border-border bg-stone-50/35 p-5 sm:p-6">
            <div className="flex w-fit max-w-full flex-col gap-4 xl:flex-row xl:items-stretch">
              <div className="w-full max-w-md rounded-[1.5rem] border border-stone-200 bg-white/75 p-4 shadow-inner-soft sm:p-5 xl:w-[28rem]">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[0.66rem] uppercase tracking-[0.22em] text-stone-400">Progress</p>
                    <p className="mt-1 text-sm font-medium text-charcoal-950">Plan adherence</p>
                  </div>
                  <div className="rounded-full bg-sage-50 px-3 py-1 text-sm font-semibold text-sage-700">{client.adherence}%</div>
                </div>
                <Progress value={client.adherence} className="mt-4 h-2.5 bg-stone-100" />
                <p className="mt-3 text-xs text-stone-500">
                  {client.metrics.assignedWorkouts.total
                    ? `${client.metrics.assignedWorkouts.completed}/${client.metrics.assignedWorkouts.total} due workouts logged`
                    : "No scheduled workouts due yet"}
                </p>
              </div>
              <div className="grid w-fit gap-3 sm:grid-cols-2">
                <ProfileSummaryMetric icon={<Dumbbell className="size-4" />} label="Workouts" value={String(client.metrics.workouts)} />
                <ProfileSummaryMetric
                  icon={<NotebookPen className="size-4" />}
                  label="In-person sessions"
                  value={`${client.sessionPackage.used}/${client.sessionPackage.total ?? "∞"}`}
                />
              </div>
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

        {partnerPackage ? (
          <Card className="overflow-hidden p-0">
            <CardHeader className="border-b border-border bg-white/35">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <CardTitle>Partner Training package</CardTitle>
                  <p className="text-sm leading-6 text-stone-500">
                    Shared package with {partnerPackage.partnerName}. Shared sessions are recorded once for both clients.
                  </p>
                </div>
                <Button asChild variant="warm" size="sm">
                  <Link href="/trainer/packages">
                    <Package className="size-4" />
                    Open packages
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="grid gap-5 lg:grid-cols-[1fr_22rem]">
              <div className="grid gap-3 sm:grid-cols-3">
                <MetricTile label="Shared package" value={partnerPackage.totalSessions === null ? "Open" : String(partnerPackage.totalSessions)} />
                <MetricTile label="Shared used" value={String(partnerPackage.usedSessions)} />
                <MetricTile
                  label="Shared left"
                  value={partnerPackage.remainingSessions === null ? "Open" : String(partnerPackage.remainingSessions)}
                />
              </div>
              <div className="rounded-[1.25rem] bg-stone-50 p-4">
                <p className="text-[0.66rem] uppercase tracking-[0.22em] text-stone-400">Shared terms</p>
                <p className="mt-3 text-sm leading-6 text-stone-700">
                  {[partnerPackage.sharedLocation, partnerPackage.sharedSchedule].filter(Boolean).join(" · ") || "Location and schedule not set"}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <Card className="overflow-hidden p-0">
          <CardHeader className="border-b border-border bg-white/35">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle>Client workspace</CardTitle>
                <p className="text-sm leading-6 text-stone-500">Switch between overview details, workout assignments, coaching notes, and in-person session tracking.</p>
              </div>
              <div className="flex flex-wrap gap-2 rounded-full bg-stone-100 p-1" role="tablist" aria-label="Client profile sections">
                <DetailTabButton active={detailTab === "context"} onClick={() => setDetailTab("context")}>
                  Overview
                </DetailTabButton>
                <DetailTabButton active={detailTab === "workouts"} onClick={() => setDetailTab("workouts")}>
                  Workouts
                </DetailTabButton>
                <DetailTabButton active={detailTab === "coaching"} onClick={() => setDetailTab("coaching")}>
                  Coaching
                </DetailTabButton>
                <DetailTabButton active={detailTab === "sessions"} onClick={() => setDetailTab("sessions")}>
                  Sessions
                </DetailTabButton>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {detailTab === "context" ? (
              <OverviewContextPanel profileRows={profileContextRows} intakeRows={intakeContextRows} />
            ) : null}

            {detailTab === "workouts" ? (
              <div>
                <div className="grid gap-5 border-b border-border p-5 lg:grid-cols-[1fr_22rem] sm:p-6">
                  <div>
                    <p className="text-sm font-semibold text-charcoal-950">Assign independent work</p>
                    <p className="mt-1 text-sm leading-6 text-stone-500">
                      Schedule the workouts this client should complete between 1:1 sessions.
                    </p>
                    <div className="relative mt-4 max-w-xl">
                      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
                      <Input value={workoutQuery} onChange={(event) => setWorkoutQuery(event.target.value)} placeholder="Search saved workouts..." className="pl-9" />
                    </div>
                    <div className="mt-4 grid max-h-80 gap-2 overflow-y-auto pr-1">
                      {filteredWorkoutOptions.map((workout) => {
                        const selected = selectedWorkout?.id === workout.id;
                        return (
                          <button
                            key={workout.id}
                            type="button"
                            onClick={() => setSelectedWorkoutId(workout.id)}
                            className={`rounded-[1.25rem] border px-4 py-3 text-left transition ${
                              selected ? "border-bronze-300 bg-bronze-50" : "border-stone-200 bg-white/75 hover:bg-white"
                            }`}
                          >
                            <p className="font-semibold text-charcoal-950">{workout.name}</p>
                            <p className="mt-1 line-clamp-1 text-sm text-stone-500">{workout.coachNotes || workout.dayLabel}</p>
                          </button>
                        );
                      })}
                      {!filteredWorkoutOptions.length ? (
                        <div className="rounded-[1.25rem] border border-dashed border-stone-200 bg-white/70 p-4 text-sm text-stone-500">
                          No workouts match this search.
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <div className="grid content-start gap-3">
                    <Field label="Available on">
                      <Input type="date" value={assignmentScheduledFor} onChange={(event) => setAssignmentScheduledFor(event.target.value)} />
                    </Field>
                    <Field label="Complete by">
                      <Input type="date" value={assignmentDueOn} onChange={(event) => setAssignmentDueOn(event.target.value)} />
                    </Field>
                    <Field label="Assignment notes">
                      <Textarea
                        className="min-h-28"
                        value={assignmentNotes}
                        onChange={(event) => setAssignmentNotes(event.target.value)}
                        placeholder="Complete this before our next 1:1 and log how it felt."
                      />
                    </Field>
                    <Button variant="warm" onClick={() => void assignClientWorkout()} disabled={busy || !selectedWorkout || client.status === "archived"}>
                      <Send className="size-4" />
                      {client.status === "archived" ? "Client inactive" : busy ? "Scheduling..." : "Schedule workout"}
                    </Button>
                  </div>
                </div>
                <div className="p-5 sm:p-6">
                  <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-[0.66rem] uppercase tracking-[0.22em] text-stone-400">Workout ledger</p>
                      <p className="mt-1 text-sm text-stone-500">Due dates also appear on the trainer calendar until the workout is completed.</p>
                    </div>
                    <Badge variant="bronze">{clientWorkoutAssignments.filter((item) => item.assignment.status !== "completed").length} active</Badge>
                  </div>
                  <div className="grid gap-3">
                    {clientWorkoutAssignments.length ? (
                      clientWorkoutAssignments.map(({ workout, assignment }) => (
                        <div key={`${workout.id}-${assignment.assignedOn}-${assignment.dueOn}`} className="rounded-[1.25rem] border border-stone-200 bg-white/78 p-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-semibold text-charcoal-950">{workout.name}</p>
                                <Badge variant={assignmentStatusVariant(assignment.status)}>{assignmentStatusLabel(assignment.status)}</Badge>
                              </div>
                              <p className="mt-2 text-sm text-stone-500">{assignmentWindowLabel(assignment)}</p>
                              {assignment.completedAt ? (
                                <p className="mt-1 text-sm font-medium text-sage-700">Completed {formatDateOnly(assignment.completedAt)}</p>
                              ) : null}
                              {assignment.notes ? <p className="mt-3 text-sm leading-6 text-stone-600">{assignment.notes}</p> : null}
                            </div>
                            <Button asChild variant="secondary" size="sm">
                              <Link href="/trainer/calendar">
                                <CalendarClock className="size-4" />
                                Calendar
                              </Link>
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-[1.25rem] bg-stone-50 p-4 text-sm text-stone-500">
                        No independent workouts assigned yet. Schedule one above when this client needs between-session work.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            {detailTab === "coaching" ? (
              <div>
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
              </div>
            ) : null}

            {detailTab === "sessions" ? (
              <div>
                <div className="grid gap-5 border-b border-border p-5 lg:grid-cols-[1fr_22rem] sm:p-6">
                  <div>
                    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-charcoal-950">In-person session package</p>
                        <p className="mt-1 text-sm leading-6 text-stone-500">Track live coached sessions separately from at-home workout logs.</p>
                      </div>
                      <Badge variant={client.sessionPackage.remaining === 0 ? "alert" : "sage"}>
                        {client.sessionPackage.remaining === null ? "Open package" : `${client.sessionPackage.remaining} remaining`}
                      </Badge>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <MetricTile label="Package total" value={client.sessionPackage.total === null ? "Open" : String(client.sessionPackage.total)} />
                      <MetricTile label="Used" value={String(client.sessionPackage.used)} />
                      <MetricTile label="Last in-person" value={client.sessionPackage.lastSessionAt ?? "None yet"} />
                    </div>
                  </div>
                  <div className="grid content-start gap-3">
                    <Input value={sessionLocation} onChange={(event) => setSessionLocation(event.target.value)} placeholder="Studio, client home, gym..." />
                    <Input value={sessionNotes} onChange={(event) => setSessionNotes(event.target.value)} placeholder="Optional session note" />
                    <Button variant="warm" onClick={() => void logInPersonSession()} disabled={busy || client.status === "archived"}>
                      <CheckCircle2 className="size-4" />
                      {client.status === "archived" ? "Client inactive" : busy ? "Logging..." : "Log in-person session"}
                    </Button>
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
                        No in-person sessions recorded yet. Log a session when live training is complete.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
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
                      <option value="archived">Inactive</option>
                    </select>
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
                <div className="rounded-[1.5rem] border border-stone-200 bg-stone-50/70 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-[0.66rem] uppercase tracking-[0.22em] text-bronze-600">Package</p>
                      <p className="mt-2 text-sm leading-6 text-stone-600">
                        {partnerPackage
                          ? `Currently shared with ${partnerPackage.partnerName}.`
                          : `Current balance: ${draftClient.sessionPackage.remaining === null ? "open" : `${draftClient.sessionPackage.remaining} left`}.`}
                      </p>
                    </div>
                    <Badge variant={partnerPackage ? "bronze" : "dark"}>
                      {partnerPackage ? "Shared package" : draftClient.style}
                    </Badge>
                  </div>

                  {partnerPackage ? (
                    <div className="mt-4 rounded-[1.25rem] border border-bronze-200 bg-white/80 p-4 text-sm leading-6 text-stone-700">
                      Complete or convert the shared package before assigning an individual package type.
                    </div>
                  ) : (
                    <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_12rem]">
                      <Field label="Assign package type">
                        <select
                          value={draftPackageTypeId}
                          onChange={(event) => {
                            const packageType = assignablePackageTypes.find((item) => item.id === event.target.value);
                            setDraftPackageTypeId(event.target.value);
                            if (packageType) {
                              setDraftClient((current) => ({
                                ...current,
                                style: packageType.name,
                                availability: current.availability || packageType.defaultSchedule,
                                sessionPackage: {
                                  ...current.sessionPackage,
                                  total: packageType.sessionCount,
                                  remaining:
                                    packageType.sessionCount === null
                                      ? null
                                      : Math.max(packageType.sessionCount - current.sessionPackage.used, 0),
                                },
                              }));
                            }
                          }}
                          className="h-11 rounded-2xl border border-stone-200 bg-white/80 px-4 text-sm shadow-inner-soft transition focus-visible:border-bronze-300 focus-visible:ring-4 focus-visible:ring-bronze-100"
                        >
                          <option value="">Keep current package</option>
                          {assignablePackageTypes.map((packageType) => (
                            <option key={packageType.id} value={packageType.id}>
                              {packageType.name} · {packageType.sessionCount === null ? "Open" : `${packageType.sessionCount} sessions`}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Sessions">
                        <Input
                          type="number"
                          min="0"
                          value={draftClient.sessionPackage.total ?? ""}
                          onChange={(event) => updateDraftSessionLimit(event.target.value)}
                          placeholder="Open"
                        />
                      </Field>
                    </div>
                  )}
                  {selectedDraftPackageType ? (
                    <p className="mt-3 text-xs leading-5 text-stone-500">
                      {selectedDraftPackageType.billingTerms || selectedDraftPackageType.policyNotes || "Package terms can be edited from Packages."}
                    </p>
                  ) : null}
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

function ProfileSummaryMetric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex min-h-20 items-center gap-3 rounded-[1.25rem] border border-stone-200 bg-white/65 px-4 py-3 shadow-inner-soft">
      <div className="grid size-10 shrink-0 place-items-center rounded-full bg-bronze-50 text-bronze-700">{icon}</div>
      <div>
        <p className="text-2xl font-semibold leading-none text-charcoal-950">{value}</p>
        <p className="mt-1 text-sm text-stone-500">{label}</p>
      </div>
    </div>
  );
}

function DetailTabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-medium transition ${
        active ? "bg-white text-charcoal-950 shadow-sm" : "text-stone-600 hover:bg-white/70 hover:text-charcoal-950"
      }`}
    >
      {children}
    </button>
  );
}

const OVERVIEW_COLLAPSED_HEIGHT = 600;

function OverviewContextPanel({
  profileRows,
  intakeRows,
}: {
  profileRows: Array<[string, string]>;
  intakeRows: Array<[string, string]>;
}) {
  return (
    <div className="grid divide-y divide-border lg:grid-cols-2 lg:divide-x lg:divide-y-0">
      <CollapsibleContextColumn title="Profile" description="Current profile details used for programming and support." rows={profileRows} />
      <CollapsibleContextColumn title="Intake info" description="Onboarding answers that give helpful starting context." rows={intakeRows} />
    </div>
  );
}

function CollapsibleContextColumn({
  title,
  description,
  rows,
}: {
  title: string;
  description: string;
  rows: Array<[string, string]>;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [canExpand, setCanExpand] = useState(false);

  useEffect(() => {
    function measureColumn() {
      const nextCanExpand = (contentRef.current?.scrollHeight ?? 0) > OVERVIEW_COLLAPSED_HEIGHT;

      setCanExpand(nextCanExpand);
      if (!nextCanExpand) {
        setExpanded(false);
      }
    }

    measureColumn();

    const resizeObserver = new ResizeObserver(measureColumn);
    if (contentRef.current) resizeObserver.observe(contentRef.current);

    window.addEventListener("resize", measureColumn);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", measureColumn);
    };
  }, [rows]);

  return (
    <div>
      <div
        ref={contentRef}
        className={canExpand && !expanded ? "overflow-hidden transition-[max-height] duration-300 ease-out" : "transition-[max-height] duration-300 ease-out"}
        style={canExpand && !expanded ? { maxHeight: OVERVIEW_COLLAPSED_HEIGHT } : undefined}
      >
        <ContextGroup title={title} description={description} rows={rows} />
      </div>

      {canExpand ? (
        <div className={`${expanded ? "" : "-mt-14 bg-gradient-to-t from-ivory-50 via-ivory-50/95 to-transparent"} relative p-5 sm:p-6`}>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setExpanded((current) => !current)}
            className="bg-white shadow-soft"
          >
            {expanded ? "Show less" : "Show more"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function ContextGroup({
  title,
  description,
  rows,
}: {
  title: string;
  description: string;
  rows: Array<[string, string]>;
}) {
  return (
    <section>
      <div className="border-b border-border p-5 sm:p-6">
        <p className="text-sm font-semibold text-charcoal-950">{title}</p>
        <p className="mt-1 text-sm leading-6 text-stone-500">{description}</p>
      </div>
      <div className="grid divide-y divide-border">
        {rows.map(([rowTitle, body]) => (
          <ProfileContextRow key={rowTitle} title={rowTitle} body={body} />
        ))}
      </div>
    </section>
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

const ModalShell = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement> & {
    title: string;
    description: string;
    children: React.ReactNode;
  }
>(function ModalShell({ title, description, children, ...props }, ref) {
  return (
    <div
      ref={ref}
      className="fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100vh-2rem)] w-[calc(100vw-1.5rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[2rem] border border-white/70 bg-ivory-50 p-5 shadow-soft outline-none sm:p-7"
      {...props}
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
      <div className="mt-6 overflow-y-auto pr-1">{children}</div>
    </div>
  );
});

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2 text-sm font-medium text-charcoal-950">
      {label}
      {children}
    </label>
  );
}
