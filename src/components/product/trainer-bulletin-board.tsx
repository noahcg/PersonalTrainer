"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { motion } from "motion/react";
import { Archive, CalendarCheck, MapPin, Megaphone, PenSquare, Pin, Plus, Send, Trash2, Users, X } from "lucide-react";
import type { ComponentType } from "react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { SessionReminderBanner } from "@/components/product/session-reminder-banner";
import { applyStoredReminderSettings, archiveStoredBulletinId, deleteStoredBulletinId, writeStoredReminderSettings } from "@/lib/bulletin-reminder-storage";
import { emptyBulletinLocationDetails, formatBulletinLocation, isValidMapUrl, normalizeBulletinLocationDetails } from "@/lib/bulletin-location";
import { createClient as createBrowserClient } from "@/lib/supabase-browser";
import type { BulletinPost } from "@/lib/types";

const storageKey = "aurelian-bulletins";
const rsvpStorageKey = "aurelian-bulletin-rsvps";
const demoClient = { id: "mara-lee", name: "Mara Lee" };

type ComposerErrors = {
  title?: string;
  body?: string;
  sessionStartsAt?: string;
  sessionLocation?: string;
  sessionMapUrl?: string;
  form?: string;
};

function formatSessionDate(value?: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  });
}

type SavedBulletinRow = {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  status: "active" | "archived";
  post_type: "announcement" | "session";
  requires_rsvp: boolean;
  session_starts_at: string | null;
  session_location: string | null;
  session_location_details?: unknown;
  session_capacity: number | null;
  reminder_enabled: boolean;
  reminder_minutes_before: number | null;
  reminder_audience: "attending" | "all";
  reminder_trainer_enabled: boolean;
  published_at: string;
};

function hydrateRsvps(posts: BulletinPost[], rawStorage: string | null) {
  const stored = rawStorage ? (JSON.parse(rawStorage) as Record<string, unknown>) : {};
  return posts.map((post) => {
    const normalizedPost: BulletinPost = {
      ...post,
      postType: post.postType ?? "announcement",
      requiresRsvp: post.requiresRsvp ?? false,
      sessionStartsAt: post.sessionStartsAt ?? null,
      sessionLocation: post.sessionLocation ?? null,
      sessionLocationDetails: normalizeBulletinLocationDetails(post.sessionLocationDetails),
      sessionCapacity: post.sessionCapacity ?? null,
      reminderEnabled: post.reminderEnabled ?? false,
      reminderMinutesBefore: post.reminderMinutesBefore ?? null,
      reminderAudience: post.reminderAudience ?? "attending",
      reminderTrainerEnabled: post.reminderTrainerEnabled ?? true,
      rsvps: post.rsvps ?? [],
    };
    const record = stored[post.id];
    const attendees =
      record && typeof record === "object" && !Array.isArray(record)
        ? Object.entries(record as Record<string, unknown>)
            .map(([clientId, value]) => {
              if (typeof value === "string") {
                return {
                  clientId,
                  clientName: clientId === demoClient.id ? demoClient.name : "Client",
                  status: value as "attending" | "not_attending",
                };
              }
              if (value && typeof value === "object" && "status" in value) {
                const parsed = value as { name?: string; status: "attending" | "not_attending" };
                return {
                  clientId,
                  clientName: parsed.name ?? (clientId === demoClient.id ? demoClient.name : "Client"),
                  status: parsed.status,
                };
              }
              return null;
            })
            .filter((item): item is NonNullable<typeof item> => Boolean(item))
        : [];

    return {
      ...normalizedPost,
      clientRsvp: attendees.find((entry) => entry.clientId === demoClient.id)?.status ?? null,
      rsvps: attendees,
      rsvpSummary: {
        attending: attendees.filter((entry) => entry.status === "attending").length,
        notAttending: attendees.filter((entry) => entry.status === "not_attending").length,
      },
    };
  });
}

export function TrainerBulletinBoard({
  initialBulletins,
  mode,
}: {
  initialBulletins: BulletinPost[];
  mode: "demo" | "supabase";
}) {
  const [bulletins, setBulletins] = useState(initialBulletins);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(true);
  const [postType, setPostType] = useState<"announcement" | "session">("announcement");
  const [requiresRsvp, setRequiresRsvp] = useState(false);
  const [sessionStartsAt, setSessionStartsAt] = useState("");
  const [sessionLocationDetails, setSessionLocationDetails] = useState(emptyBulletinLocationDetails);
  const [sessionCapacity, setSessionCapacity] = useState("");
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderMinutesBefore, setReminderMinutesBefore] = useState("60");
  const [reminderAudience, setReminderAudience] = useState<"attending" | "all">("attending");
  const [reminderTrainerEnabled, setReminderTrainerEnabled] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [composerErrors, setComposerErrors] = useState<ComposerErrors>({});

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setBulletins((current) => applyStoredReminderSettings(current));
    }, 0);

    return () => window.clearTimeout(timeout);
  }, []);

  const bulletinSummary = useMemo(
    () => ({
      total: bulletins.length,
      pinned: bulletins.filter((post) => post.pinned).length,
      sessions: bulletins.filter((post) => post.postType === "session").length,
      rsvpRequested: bulletins.filter((post) => post.requiresRsvp).length,
      attending: bulletins.reduce((total, post) => total + (post.rsvpSummary?.attending ?? 0), 0),
    }),
    [bulletins],
  );

  useEffect(() => {
    if (mode !== "demo") return;
    const sync = () => {
      try {
        const stored = window.localStorage.getItem(storageKey);
        const posts = stored ? (JSON.parse(stored) as BulletinPost[]) : initialBulletins;
        setBulletins(applyStoredReminderSettings(hydrateRsvps(posts, window.localStorage.getItem(rsvpStorageKey))));
      } catch {
        window.localStorage.removeItem(storageKey);
        window.localStorage.removeItem(rsvpStorageKey);
        setBulletins(applyStoredReminderSettings(hydrateRsvps(initialBulletins, null)));
      }
    };
    const timeout = window.setTimeout(sync, 0);
    window.addEventListener("storage", sync);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("storage", sync);
    };
  }, [initialBulletins, mode]);

  function persist(next: BulletinPost[]) {
    if (mode === "demo") {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
    }
  }

  function resetComposer() {
    setTitle("");
    setBody("");
    setPinned(true);
    setRequiresRsvp(false);
    setPostType("announcement");
    setSessionStartsAt("");
    setSessionLocationDetails(emptyBulletinLocationDetails);
    setSessionCapacity("");
    setReminderEnabled(true);
    setReminderMinutesBefore("60");
    setReminderAudience("attending");
    setReminderTrainerEnabled(true);
    setEditingId(null);
    setComposerErrors({});
  }

  function sortBulletins(next: BulletinPost[]) {
    return [...next].sort((a, b) => {
      const statusSort = Number(a.status === "archived") - Number(b.status === "archived");
      if (statusSort) return statusSort;
      return Number(b.pinned) - Number(a.pinned);
    });
  }

  function openCreate() {
    resetComposer();
    setOpen(true);
  }

  function openEdit(post: BulletinPost) {
    setEditingId(post.id);
    setTitle(post.title);
    setBody(post.body);
    setPinned(post.pinned);
    setRequiresRsvp(post.requiresRsvp);
    setPostType(post.postType);
    setSessionStartsAt(post.sessionStartsAt ? post.sessionStartsAt.slice(0, 16) : "");
    setSessionLocationDetails(normalizeBulletinLocationDetails(post.sessionLocationDetails) ?? {
      ...emptyBulletinLocationDetails,
      placeName: post.sessionLocation ?? "",
    });
    setSessionCapacity(post.sessionCapacity ? String(post.sessionCapacity) : "");
    setReminderEnabled(post.reminderEnabled ?? false);
    setReminderMinutesBefore(post.reminderMinutesBefore ? String(post.reminderMinutesBefore) : "60");
    setReminderAudience(post.reminderAudience ?? "attending");
    setReminderTrainerEnabled(post.reminderTrainerEnabled ?? true);
    setComposerErrors({});
    setOpen(true);
  }

  async function saveBulletin() {
    const nextErrors: ComposerErrors = {};
    if (!title.trim()) nextErrors.title = "Add a bulletin title.";
    if (!body.trim()) nextErrors.body = "Write the bulletin message.";
    if (postType === "session" && !sessionStartsAt.trim()) nextErrors.sessionStartsAt = "Add the session date and time.";
    if (postType === "session" && !sessionLocationDetails.placeName.trim()) nextErrors.sessionLocation = "Add the park or place name.";
    if (postType === "session" && sessionLocationDetails.mapUrl.trim() && !isValidMapUrl(sessionLocationDetails.mapUrl)) {
      nextErrors.sessionMapUrl = "Paste a valid map link.";
    }

    if (Object.keys(nextErrors).length) {
      setComposerErrors(nextErrors);
      return;
    }

    setBusy(true);
    setMessage(null);
    setComposerErrors({});
    try {
      let nextPost: BulletinPost;
      if (mode === "supabase") {
        const response = await fetch("/api/trainer/bulletins", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: editingId,
            title: title.trim(),
            body: body.trim(),
            pinned,
            postType,
            requiresRsvp,
            sessionStartsAt: postType === "session" ? sessionStartsAt : null,
            sessionLocationDetails: postType === "session" ? sessionLocationDetails : null,
            sessionCapacity: postType === "session" && sessionCapacity ? Number(sessionCapacity) : null,
            reminderEnabled: postType === "session" ? reminderEnabled : false,
            reminderMinutesBefore: postType === "session" && reminderEnabled ? Number(reminderMinutesBefore) : null,
            reminderAudience,
            reminderTrainerEnabled: postType === "session" ? reminderTrainerEnabled : false,
          }),
        });
        const result = (await response.json()) as { post?: SavedBulletinRow; error?: string };
        if (!response.ok || !result.post) throw new Error(result.error ?? `Unable to ${editingId ? "update" : "publish"} bulletin.`);
        const inserted = result.post;

        nextPost = {
          id: inserted.id,
          title: inserted.title,
          body: inserted.body,
          author: "",
          publishedAt: new Date(inserted.published_at).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          }),
          pinned: inserted.pinned,
          status: inserted.status ?? "active",
          postType: inserted.post_type,
          requiresRsvp: inserted.requires_rsvp,
          sessionStartsAt: inserted.session_starts_at,
          sessionLocation: inserted.session_location,
          sessionLocationDetails: postType === "session" ? sessionLocationDetails : normalizeBulletinLocationDetails(inserted.session_location_details),
          sessionCapacity: inserted.session_capacity,
          reminderEnabled: inserted.reminder_enabled || (postType === "session" ? reminderEnabled : false),
          reminderMinutesBefore: inserted.reminder_minutes_before ?? (postType === "session" && reminderEnabled ? Number(reminderMinutesBefore) : null),
          reminderAudience: inserted.reminder_audience ?? reminderAudience,
          reminderTrainerEnabled: inserted.reminder_trainer_enabled || (postType === "session" ? reminderTrainerEnabled : false),
          clientRsvp: null,
          rsvpSummary: { attending: 0, notAttending: 0 },
          rsvps: bulletins.find((post) => post.id === editingId)?.rsvps ?? [],
        };
      } else {
        nextPost = {
          id: editingId ?? `bulletin-${bulletins.length + 1}`,
          title: title.trim(),
          body: body.trim(),
          author: "",
          publishedAt:
            bulletins.find((post) => post.id === editingId)?.publishedAt ??
            new Date().toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            }),
          pinned,
          status: "active",
          postType,
          requiresRsvp: postType === "session" ? true : requiresRsvp,
          sessionStartsAt: postType === "session" ? new Date(sessionStartsAt).toISOString() : null,
          sessionLocation: postType === "session" ? formatBulletinLocation(sessionLocationDetails) : null,
          sessionLocationDetails: postType === "session" ? sessionLocationDetails : null,
          sessionCapacity: postType === "session" && sessionCapacity ? Number(sessionCapacity) : null,
          reminderEnabled: postType === "session" ? reminderEnabled : false,
          reminderMinutesBefore: postType === "session" && reminderEnabled ? Number(reminderMinutesBefore) : null,
          reminderAudience,
          reminderTrainerEnabled: postType === "session" ? reminderTrainerEnabled : false,
          clientRsvp: bulletins.find((post) => post.id === editingId)?.clientRsvp ?? null,
          rsvpSummary: bulletins.find((post) => post.id === editingId)?.rsvpSummary ?? { attending: 0, notAttending: 0 },
          rsvps: bulletins.find((post) => post.id === editingId)?.rsvps ?? [],
        };
      }

      const next = sortBulletins(
        editingId ? bulletins.map((post) => (post.id === editingId ? { ...post, ...nextPost } : post)) : [nextPost, ...bulletins],
      );
      writeStoredReminderSettings(nextPost.id, {
        reminderEnabled: nextPost.reminderEnabled ?? false,
        reminderMinutesBefore: nextPost.reminderMinutesBefore ?? null,
        reminderAudience: nextPost.reminderAudience ?? "attending",
        reminderTrainerEnabled: nextPost.reminderTrainerEnabled ?? true,
      });
      setBulletins(next);
      persist(next);
      resetComposer();
      setOpen(false);
      setMessage(editingId ? "Announcement updated." : "Announcement posted.");
      window.setTimeout(() => setMessage(null), 2000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `Unable to ${editingId ? "update" : "publish"} bulletin.`;
      if (open) {
        setComposerErrors({ form: errorMessage });
      } else {
        setMessage(errorMessage);
      }
    } finally {
      setBusy(false);
    }
  }

  async function togglePinned(post: BulletinPost) {
    setBusy(true);
    setMessage(null);
    try {
      const nextPinned = !post.pinned;
      if (mode === "supabase") {
        const supabase = createBrowserClient();
        const { error } = await supabase.from("bulletin_posts").update({ pinned: nextPinned }).eq("id", post.id);
        if (error) throw error;
      }
      const next = sortBulletins(bulletins.map((item) => (item.id === post.id ? { ...item, pinned: nextPinned } : item)));
      setBulletins(next);
      persist(next);
      setMessage(nextPinned ? "Bulletin pinned to the top." : "Bulletin unpinned.");
      window.setTimeout(() => setMessage(null), 2000);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update bulletin.");
    } finally {
      setBusy(false);
    }
  }

  async function archiveBulletin(post: BulletinPost) {
    setBusy(true);
    setMessage(null);
    try {
      if (mode === "supabase") {
        const supabase = createBrowserClient();
        const { error } = await supabase.from("bulletin_posts").update({ status: "archived" }).eq("id", post.id);
        if (error) {
          archiveStoredBulletinId(post.id);
        }
      } else {
        archiveStoredBulletinId(post.id);
      }

      const next = bulletins.map((item) => (item.id === post.id ? { ...item, status: "archived" as const, pinned: false } : item));
      setBulletins(next);
      persist(next);
      setMessage("Bulletin archived.");
      window.setTimeout(() => setMessage(null), 2000);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to archive bulletin.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteBulletin(post: BulletinPost) {
    setBusy(true);
    setMessage(null);
    try {
      if (mode === "supabase") {
        const supabase = createBrowserClient();
        const { error } = await supabase.from("bulletin_posts").delete().eq("id", post.id);
        if (error) throw error;
      }

      deleteStoredBulletinId(post.id);
      const next = bulletins.filter((item) => item.id !== post.id);
      setBulletins(next);
      persist(next);
      setMessage("Bulletin deleted.");
      window.setTimeout(() => setMessage(null), 2000);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to delete bulletin.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <SessionReminderBanner initialBulletins={bulletins} mode={mode} role="trainer" />

      <Card className="mb-5 overflow-hidden p-0">
        <div className="border-b border-border bg-white/35 p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-[0.66rem] uppercase tracking-[0.3em] text-bronze-600">Bulletin workspace</p>
              <h2 className="mt-2 font-serif text-3xl font-semibold leading-tight text-charcoal-950 sm:text-4xl">Studio updates in one clear feed.</h2>
              <p className="mt-3 text-sm leading-6 text-stone-600">
                Post announcements, schedule changes, session invites, and coaching themes that every client should see.
              </p>
            </div>
            <Button variant="warm" onClick={openCreate} className="w-fit">
              <Plus className="size-4" />
              Post bulletin
            </Button>
          </div>
        </div>

        <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-5 sm:p-6">
          <BulletinMetric icon={Megaphone} label="Total posts" value={String(bulletinSummary.total)} detail="Published bulletins" tone="text-charcoal-950" />
          <BulletinMetric icon={Pin} label="Pinned" value={String(bulletinSummary.pinned)} detail="Top of feed" tone="text-bronze-500" />
          <BulletinMetric icon={CalendarCheck} label="Sessions" value={String(bulletinSummary.sessions)} detail="Training invites" tone="text-sage-700" />
          <BulletinMetric icon={Send} label="RSVPs" value={String(bulletinSummary.rsvpRequested)} detail="Requested responses" tone="text-bronze-500" />
          <BulletinMetric icon={Users} label="Attending" value={String(bulletinSummary.attending)} detail="Reserved spots" tone="text-stone-600" />
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        {bulletins.length ? bulletins.map((post) => {
          const archived = post.status === "archived";

          return (
            <Card
              key={post.id}
              className={`overflow-hidden p-5 transition sm:p-6 ${
                archived ? "border-stone-200 bg-stone-50/45 shadow-none" : "hover:-translate-y-1 hover:bg-white/90"
              }`}
            >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p suppressHydrationWarning className={`text-xs font-semibold uppercase tracking-[0.28em] ${archived ? "text-stone-400" : "text-bronze-600"}`}>{post.publishedAt}</p>
                <h2 className={`mt-3 font-serif text-3xl font-semibold leading-tight sm:text-4xl ${archived ? "text-stone-600" : "text-charcoal-950"}`}>{post.title}</h2>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                {archived ? (
                  <div className="flex items-center gap-2 rounded-full bg-stone-200/80 px-3 py-2 text-xs font-medium text-stone-700">
                    <Archive className="size-3.5" />
                    Archived
                  </div>
                ) : null}
                {post.postType === "session" ? (
                  <div className="flex items-center gap-2 rounded-full bg-charcoal-950 px-3 py-2 text-xs font-medium text-ivory-50">
                    <CalendarCheck className="size-3.5" />
                    Session
                  </div>
                ) : null}
                {post.pinned ? (
                  <div className="flex items-center gap-2 rounded-full bg-bronze-50 px-3 py-2 text-xs font-medium text-bronze-700">
                    <Pin className="size-3.5" />
                    Pinned
                  </div>
                ) : null}
                {post.requiresRsvp ? (
                  <div className="flex items-center gap-2 rounded-full bg-sage-50 px-3 py-2 text-xs font-medium text-sage-700">
                    <CalendarCheck className="size-3.5" />
                    RSVP
                  </div>
                ) : null}
              </div>
            </div>
            <p className={`mt-5 text-sm leading-7 ${archived ? "text-stone-500" : "text-stone-600"}`}>{post.body}</p>
            {post.postType === "session" ? (
              <div className="mt-5 rounded-[1.5rem] border border-stone-200/80 bg-stone-50/80 p-4 text-sm text-stone-700">
                <div className="flex items-center gap-2">
                  <CalendarCheck className="size-4 text-bronze-600" />
                  <span suppressHydrationWarning>{formatSessionDate(post.sessionStartsAt) ?? "Session timing pending"}</span>
                </div>
                <div className="mt-2 flex items-start gap-2">
                  <MapPin className="size-4 text-bronze-600" />
                  <div>
                    <span>{formatBulletinLocation(post.sessionLocationDetails, post.sessionLocation) || "Location to be announced"}</span>
                    {post.sessionLocationDetails?.notes ? (
                      <p className="mt-1 text-stone-500">{post.sessionLocationDetails.notes}</p>
                    ) : null}
                    {post.sessionLocationDetails?.mapUrl ? (
                      <Button asChild variant="ghost" size="sm" className="mt-2 h-auto px-0 py-0 text-bronze-700">
                        <a href={post.sessionLocationDetails.mapUrl} target="_blank" rel="noreferrer">
                          Open map
                        </a>
                      </Button>
                    ) : null}
                  </div>
                </div>
                {post.sessionCapacity ? (
                  <div className="mt-2 flex items-center gap-2">
                    <Users className="size-4 text-bronze-600" />
                    <span>{post.sessionCapacity} spots available</span>
                  </div>
                ) : null}
              </div>
            ) : null}
            {post.requiresRsvp ? (
              <div className="mt-5 flex flex-wrap gap-3 text-sm text-stone-600">
                <span className="rounded-full bg-stone-50 px-3 py-2">{post.rsvpSummary?.attending ?? 0} attending</span>
                <span className="rounded-full bg-stone-50 px-3 py-2">{post.rsvpSummary?.notAttending ?? 0} not attending</span>
                {post.reminderEnabled && post.reminderMinutesBefore ? (
                  <span className="rounded-full bg-bronze-50 px-3 py-2 text-bronze-700">
                    Reminder {post.reminderMinutesBefore >= 1440 ? "1 day" : `${post.reminderMinutesBefore / 60} hr`} before
                  </span>
                ) : null}
              </div>
            ) : null}
            {post.postType === "session" ? (
              <div className="mt-5 rounded-[1.5rem] border border-sage-200/70 bg-sage-50/60 p-4">
                <div className="text-sm font-medium text-charcoal-950">Attendee list</div>
                <div className="mt-3 space-y-2">
                  {(post.rsvps ?? []).filter((entry) => entry.status === "attending").length ? (
                    (post.rsvps ?? [])
                      .filter((entry) => entry.status === "attending")
                      .map((entry) => (
                        <div key={`${post.id}-${entry.clientId}`} className="flex items-center justify-between rounded-2xl bg-white/80 px-3 py-2 text-sm">
                          <span>{entry.clientName}</span>
                          <span className="text-sage-700">Attending</span>
                        </div>
                      ))
                  ) : (
                    <div className="rounded-2xl bg-white/70 px-3 py-3 text-sm text-stone-500">No clients have reserved a spot yet.</div>
                  )}
                </div>
              </div>
            ) : null}
            <div className="mt-5 flex flex-wrap gap-3 border-t border-border pt-5">
              <Button variant="secondary" onClick={() => openEdit(post)} disabled={busy || archived}>
                <PenSquare className="size-4" />
                Edit
              </Button>
              <Button variant="secondary" onClick={() => void togglePinned(post)} disabled={busy || archived}>
                <Pin className="size-4" />
                {post.pinned ? "Unpin" : "Pin to top"}
              </Button>
              {!archived ? (
                <Button variant="secondary" onClick={() => void archiveBulletin(post)} disabled={busy}>
                  <Archive className="size-4" />
                  Archive
                </Button>
              ) : null}
              <Button
                variant="ghost"
                onClick={() => void deleteBulletin(post)}
                disabled={busy}
                className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
              >
                <Trash2 className="size-4" />
                Delete
              </Button>
            </div>
            </Card>
          );
        }) : (
          <Card className="p-7 text-center lg:col-span-2">
            <div className="mx-auto grid size-12 place-items-center rounded-full bg-bronze-50 text-bronze-600">
              <Megaphone className="size-5" />
            </div>
            <h2 className="mt-4 font-serif text-3xl font-semibold text-charcoal-950">No bulletins yet.</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-stone-600">
              Publish your first studio update, coaching reminder, or session invite when there is something every client should see.
            </p>
            <div className="mt-5 flex justify-center">
              <Button variant="warm" onClick={openCreate}>
                <Plus className="size-4" />
                Post bulletin
              </Button>
            </div>
          </Card>
        )}
      </div>

      <Dialog.Root
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) setComposerErrors({});
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-charcoal-950/35 backdrop-blur-sm" />
          <Dialog.Content asChild>
            <motion.div initial={{ opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100vw-1.5rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[2rem] border border-white/70 bg-ivory-50 p-5 shadow-soft sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Dialog.Title className="font-serif text-4xl font-semibold text-charcoal-950">{editingId ? "Edit bulletin" : "Post bulletin"}</Dialog.Title>
                  <Dialog.Description className="mt-2 text-sm text-stone-600">
                    {editingId ? "Refine the announcement and push the updated message to every client." : "This will appear in every client’s bulletin page."}
                  </Dialog.Description>
                </div>
                <Dialog.Close asChild>
                  <Button variant="ghost" size="icon" aria-label="Close bulletin composer">
                    <X className="size-5" />
                  </Button>
                </Dialog.Close>
              </div>
              <div className="mt-5 grid gap-4">
                {composerErrors.form ? (
                  <div className="rounded-[1.25rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                    {composerErrors.form}
                  </div>
                ) : null}
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPostType("announcement");
                      setRequiresRsvp(false);
                      setComposerErrors((current) => ({ ...current, sessionStartsAt: undefined, sessionLocation: undefined, form: undefined }));
                    }}
                    className={`rounded-[1.5rem] border px-4 py-4 text-left ${postType === "announcement" ? "border-bronze-300 bg-bronze-50" : "border-stone-200 bg-white/70"}`}
                  >
                    <div className="font-medium text-charcoal-950">General bulletin</div>
                    <div className="mt-1 text-sm text-stone-600">A polished message, reminder, or studio update.</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPostType("session");
                      setRequiresRsvp(true);
                      setComposerErrors((current) => ({ ...current, form: undefined }));
                    }}
                    className={`rounded-[1.5rem] border px-4 py-4 text-left ${postType === "session" ? "border-sage-300 bg-sage-50" : "border-stone-200 bg-white/70"}`}
                  >
                    <div className="font-medium text-charcoal-950">Training session invite</div>
                    <div className="mt-1 text-sm text-stone-600">Collect RSVPs for a live coached session and track attendees.</div>
                  </button>
                </div>
                <label className="grid gap-2 text-sm font-medium text-stone-700">
                  <span className="flex items-center gap-2">
                    Bulletin title <RequiredIndicator />
                  </span>
                  <Input
                    value={title}
                    onChange={(event) => {
                      setTitle(event.target.value);
                      setComposerErrors((current) => ({ ...current, title: undefined, form: undefined }));
                    }}
                    placeholder="Bulletin title"
                    aria-invalid={Boolean(composerErrors.title)}
                    className={composerErrors.title ? "border-rose-300 focus-visible:border-rose-400 focus-visible:ring-rose-100" : undefined}
                  />
                  {composerErrors.title ? <span className="text-sm font-medium text-rose-600">{composerErrors.title}</span> : null}
                </label>
                <label className="grid gap-2 text-sm font-medium text-stone-700">
                  <span className="flex items-center gap-2">
                    Message <RequiredIndicator />
                  </span>
                  <Textarea
                    value={body}
                    onChange={(event) => {
                      setBody(event.target.value);
                      setComposerErrors((current) => ({ ...current, body: undefined, form: undefined }));
                    }}
                    placeholder="Write the message every client should see..."
                    aria-invalid={Boolean(composerErrors.body)}
                    className={composerErrors.body ? "border-rose-300 focus-visible:border-rose-400 focus-visible:ring-rose-100" : undefined}
                  />
                  {composerErrors.body ? <span className="text-sm font-medium text-rose-600">{composerErrors.body}</span> : null}
                </label>
                {postType === "session" ? (
                  <div className="grid gap-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="grid gap-2 text-sm font-medium text-stone-700">
                        <span className="flex items-center gap-2">
                          Session date and time <RequiredIndicator />
                        </span>
                        <Input
                          type="datetime-local"
                          value={sessionStartsAt}
                          onChange={(event) => {
                            setSessionStartsAt(event.target.value);
                            setComposerErrors((current) => ({ ...current, sessionStartsAt: undefined, form: undefined }));
                          }}
                          aria-invalid={Boolean(composerErrors.sessionStartsAt)}
                          className={composerErrors.sessionStartsAt ? "border-rose-300 focus-visible:border-rose-400 focus-visible:ring-rose-100" : undefined}
                        />
                        {composerErrors.sessionStartsAt ? <span className="text-sm font-medium text-rose-600">{composerErrors.sessionStartsAt}</span> : null}
                      </label>
                      <div className="grid gap-2">
                        <span className="text-sm font-medium text-stone-700">Capacity</span>
                        <Input type="number" min="1" value={sessionCapacity} onChange={(event) => setSessionCapacity(event.target.value)} placeholder="Optional" />
                      </div>
                    </div>
                    <div className="rounded-[1.5rem] border border-stone-200 bg-white/70 p-4">
                      <div className="mb-4 flex items-center gap-2">
                        <MapPin className="size-4 text-bronze-600" />
                        <p className="text-sm font-semibold text-charcoal-950">Session location</p>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                      <label className="grid gap-2 text-sm font-medium text-stone-700">
                        <span className="flex items-center gap-2">
                          Park or place name <RequiredIndicator />
                        </span>
                        <Input
                          value={sessionLocationDetails.placeName}
                          onChange={(event) => {
                            setSessionLocationDetails((current) => ({ ...current, placeName: event.target.value }));
                            setComposerErrors((current) => ({ ...current, sessionLocation: undefined, form: undefined }));
                          }}
                          placeholder="Riverside Park"
                          aria-invalid={Boolean(composerErrors.sessionLocation)}
                          className={composerErrors.sessionLocation ? "border-rose-300 focus-visible:border-rose-400 focus-visible:ring-rose-100" : undefined}
                        />
                        {composerErrors.sessionLocation ? <span className="text-sm font-medium text-rose-600">{composerErrors.sessionLocation}</span> : null}
                      </label>
                        <label className="grid gap-2 text-sm font-medium text-stone-700">
                          Meeting point
                          <Input
                            value={sessionLocationDetails.meetingPoint}
                            onChange={(event) => setSessionLocationDetails((current) => ({ ...current, meetingPoint: event.target.value }))}
                            placeholder="South lot near tennis courts"
                          />
                        </label>
                        <label className="grid gap-2 text-sm font-medium text-stone-700">
                          Address or cross streets
                          <Input
                            value={sessionLocationDetails.address}
                            onChange={(event) => setSessionLocationDetails((current) => ({ ...current, address: event.target.value }))}
                            placeholder="Maple Ave & 3rd St"
                          />
                        </label>
                        <label className="grid gap-2 text-sm font-medium text-stone-700">
                          Map link
                          <Input
                            value={sessionLocationDetails.mapUrl}
                            onChange={(event) => {
                              setSessionLocationDetails((current) => ({ ...current, mapUrl: event.target.value }));
                              setComposerErrors((current) => ({ ...current, sessionMapUrl: undefined, form: undefined }));
                            }}
                            placeholder="Paste Apple Maps or Google Maps share link"
                            aria-invalid={Boolean(composerErrors.sessionMapUrl)}
                            className={composerErrors.sessionMapUrl ? "border-rose-300 focus-visible:border-rose-400 focus-visible:ring-rose-100" : undefined}
                          />
                          {composerErrors.sessionMapUrl ? <span className="text-sm font-medium text-rose-600">{composerErrors.sessionMapUrl}</span> : null}
                        </label>
                        <label className="grid gap-2 text-sm font-medium text-stone-700 sm:col-span-2">
                          Arrival notes
                          <Input
                            value={sessionLocationDetails.notes}
                            onChange={(event) => setSessionLocationDetails((current) => ({ ...current, notes: event.target.value }))}
                            placeholder="Bring water. Meet by the benches."
                          />
                        </label>
                      </div>
                    </div>
                    <div className="rounded-[1.5rem] border border-stone-200 bg-white/70 p-4">
                      <button
                        type="button"
                        onClick={() => setReminderEnabled((current) => !current)}
                        className={`flex w-full items-center gap-2 rounded-2xl border px-4 py-3 text-sm ${reminderEnabled ? "border-bronze-300 bg-bronze-50 text-bronze-700" : "border-stone-200 bg-white/70 text-stone-600"}`}
                      >
                        <CalendarCheck className="size-4" />
                        {reminderEnabled ? "In-app reminder enabled" : "No in-app reminder"}
                      </button>
                      {reminderEnabled ? (
                        <div className="mt-4 grid gap-4 sm:grid-cols-3">
                          <label className="grid gap-2 text-sm font-medium text-stone-700">
                            Reminder timing
                            <select
                              value={reminderMinutesBefore}
                              onChange={(event) => setReminderMinutesBefore(event.target.value)}
                              className="h-11 rounded-2xl border border-stone-200 bg-white/80 px-4 text-sm shadow-inner-soft transition focus-visible:border-bronze-300 focus-visible:ring-4 focus-visible:ring-bronze-100"
                            >
                              <option value="60">1 hour before</option>
                              <option value="180">3 hours before</option>
                              <option value="1440">1 day before</option>
                            </select>
                          </label>
                          <label className="grid gap-2 text-sm font-medium text-stone-700">
                            Client audience
                            <select
                              value={reminderAudience}
                              onChange={(event) => setReminderAudience(event.target.value as "attending" | "all")}
                              className="h-11 rounded-2xl border border-stone-200 bg-white/80 px-4 text-sm shadow-inner-soft transition focus-visible:border-bronze-300 focus-visible:ring-4 focus-visible:ring-bronze-100"
                            >
                              <option value="attending">Attending clients</option>
                              <option value="all">All clients</option>
                            </select>
                          </label>
                          <button
                            type="button"
                            onClick={() => setReminderTrainerEnabled((current) => !current)}
                            className={`self-end rounded-2xl border px-4 py-3 text-left text-sm ${reminderTrainerEnabled ? "border-sage-300 bg-sage-50 text-sage-700" : "border-stone-200 bg-white/70 text-stone-600"}`}
                          >
                            {reminderTrainerEnabled ? "Trainer reminder on" : "Trainer reminder off"}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={() => setPinned((current) => !current)}
                  className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm ${pinned ? "border-bronze-300 bg-bronze-50 text-bronze-700" : "border-stone-200 bg-white/70 text-stone-600"}`}
                >
                  <Pin className="size-4" />
                  {pinned ? "Pinned to top" : "Not pinned"}
                </button>
                <button
                  type="button"
                  onClick={() => setRequiresRsvp((current) => !current)}
                  disabled={postType === "session"}
                  className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm ${requiresRsvp || postType === "session" ? "border-sage-300 bg-sage-50 text-sage-700" : "border-stone-200 bg-white/70 text-stone-600"} ${postType === "session" ? "opacity-75" : ""}`}
                >
                  <CalendarCheck className="size-4" />
                  {postType === "session" ? "RSVP required for session invites" : requiresRsvp ? "Clients must RSVP" : "No RSVP required"}
                </button>
              </div>
              <div className="mt-5 flex justify-end gap-3">
                <Dialog.Close asChild>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      resetComposer();
                    }}
                  >
                    Cancel
                  </Button>
                </Dialog.Close>
                <Button variant="warm" onClick={() => void saveBulletin()} disabled={busy}>
                  <Send className="size-4" />
                  {busy ? (editingId ? "Saving..." : "Posting...") : editingId ? "Save changes" : "Publish"}
                </Button>
              </div>
            </motion.div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {message ? <div className="fixed bottom-24 right-3 z-40 rounded-full bg-charcoal-950 px-4 py-3 text-sm text-ivory-50 shadow-soft lg:right-6">{message}</div> : null}
    </>
  );
}

function BulletinMetric({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: ComponentType<{ className?: string }>;
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

function RequiredIndicator() {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-normal text-stone-500">
      <span aria-hidden="true" className="text-bronze-600">
        *
      </span>
      <span className="sr-only">required</span>
    </span>
  );
}
