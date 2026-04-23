"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { motion } from "motion/react";
import { CalendarCheck, MapPin, PenSquare, Pin, Plus, Send, Users, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { createClient as createBrowserClient } from "@/lib/supabase-browser";
import type { BulletinPost } from "@/lib/types";

const storageKey = "aurelian-bulletins";
const rsvpStorageKey = "aurelian-bulletin-rsvps";
const demoClient = { id: "mara-lee", name: "Mara Lee" };

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

function hydrateRsvps(posts: BulletinPost[], rawStorage: string | null) {
  const stored = rawStorage ? (JSON.parse(rawStorage) as Record<string, unknown>) : {};
  return posts.map((post) => {
    const normalizedPost: BulletinPost = {
      ...post,
      postType: post.postType ?? "announcement",
      requiresRsvp: post.requiresRsvp ?? false,
      sessionStartsAt: post.sessionStartsAt ?? null,
      sessionLocation: post.sessionLocation ?? null,
      sessionCapacity: post.sessionCapacity ?? null,
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
  const [sessionLocation, setSessionLocation] = useState("");
  const [sessionCapacity, setSessionCapacity] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== "demo") return;
    const sync = () => {
      try {
        const stored = window.localStorage.getItem(storageKey);
        const posts = stored ? (JSON.parse(stored) as BulletinPost[]) : initialBulletins;
        setBulletins(hydrateRsvps(posts, window.localStorage.getItem(rsvpStorageKey)));
      } catch {
        window.localStorage.removeItem(storageKey);
        window.localStorage.removeItem(rsvpStorageKey);
        setBulletins(hydrateRsvps(initialBulletins, null));
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
    setSessionLocation("");
    setSessionCapacity("");
    setEditingId(null);
  }

  function sortBulletins(next: BulletinPost[]) {
    return [...next].sort((a, b) => Number(b.pinned) - Number(a.pinned));
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
    setSessionLocation(post.sessionLocation ?? "");
    setSessionCapacity(post.sessionCapacity ? String(post.sessionCapacity) : "");
    setOpen(true);
  }

  async function saveBulletin() {
    if (!title.trim() || !body.trim()) return;
    if (postType === "session" && (!sessionStartsAt.trim() || !sessionLocation.trim())) {
      setMessage("Add the session date, time, and location.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      let nextPost: BulletinPost;
      if (mode === "supabase") {
        const supabase = createBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("You need an authenticated trainer session to publish announcements.");
        const { data: trainer } = await supabase
          .from("trainers")
          .select("id")
          .eq("profile_id", user.id)
          .maybeSingle<{ id: string }>();
        if (!trainer?.id) throw new Error("Trainer profile not found.");

        const payload = {
          trainer_id: trainer.id,
          title: title.trim(),
          body: body.trim(),
          pinned,
          post_type: postType,
          requires_rsvp: postType === "session" ? true : requiresRsvp,
          session_starts_at: postType === "session" ? new Date(sessionStartsAt).toISOString() : null,
          session_location: postType === "session" ? sessionLocation.trim() : null,
          session_capacity: postType === "session" && sessionCapacity ? Number(sessionCapacity) : null,
        };
        const query = editingId
          ? supabase
              .from("bulletin_posts")
              .update(payload)
              .eq("id", editingId)
              .select("id, title, body, pinned, post_type, requires_rsvp, session_starts_at, session_location, session_capacity, published_at")
              .single<{ id: string; title: string; body: string; pinned: boolean; post_type: "announcement" | "session"; requires_rsvp: boolean; session_starts_at: string | null; session_location: string | null; session_capacity: number | null; published_at: string }>()
          : supabase
              .from("bulletin_posts")
              .insert(payload)
              .select("id, title, body, pinned, post_type, requires_rsvp, session_starts_at, session_location, session_capacity, published_at")
              .single<{ id: string; title: string; body: string; pinned: boolean; post_type: "announcement" | "session"; requires_rsvp: boolean; session_starts_at: string | null; session_location: string | null; session_capacity: number | null; published_at: string }>();
        const { data: inserted, error } = await query;
        if (error || !inserted) throw error ?? new Error(`Unable to ${editingId ? "update" : "publish"} bulletin.`);
        nextPost = {
          id: inserted.id,
          title: inserted.title,
          body: inserted.body,
          author: "Coach Avery",
          publishedAt: new Date(inserted.published_at).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          }),
          pinned: inserted.pinned,
          postType: inserted.post_type,
          requiresRsvp: inserted.requires_rsvp,
          sessionStartsAt: inserted.session_starts_at,
          sessionLocation: inserted.session_location,
          sessionCapacity: inserted.session_capacity,
          clientRsvp: null,
          rsvpSummary: { attending: 0, notAttending: 0 },
          rsvps: bulletins.find((post) => post.id === editingId)?.rsvps ?? [],
        };
      } else {
        nextPost = {
          id: editingId ?? `bulletin-${bulletins.length + 1}`,
          title: title.trim(),
          body: body.trim(),
          author: "Coach Avery",
          publishedAt:
            bulletins.find((post) => post.id === editingId)?.publishedAt ??
            new Date().toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            }),
          pinned,
          postType,
          requiresRsvp: postType === "session" ? true : requiresRsvp,
          sessionStartsAt: postType === "session" ? new Date(sessionStartsAt).toISOString() : null,
          sessionLocation: postType === "session" ? sessionLocation.trim() : null,
          sessionCapacity: postType === "session" && sessionCapacity ? Number(sessionCapacity) : null,
          clientRsvp: bulletins.find((post) => post.id === editingId)?.clientRsvp ?? null,
          rsvpSummary: bulletins.find((post) => post.id === editingId)?.rsvpSummary ?? { attending: 0, notAttending: 0 },
          rsvps: bulletins.find((post) => post.id === editingId)?.rsvps ?? [],
        };
      }

      const next = sortBulletins(
        editingId ? bulletins.map((post) => (post.id === editingId ? { ...post, ...nextPost } : post)) : [nextPost, ...bulletins],
      );
      setBulletins(next);
      persist(next);
      resetComposer();
      setOpen(false);
      setMessage(editingId ? "Announcement updated." : "Announcement posted.");
      window.setTimeout(() => setMessage(null), 2000);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : `Unable to ${editingId ? "update" : "publish"} bulletin.`);
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

  return (
    <>
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="max-w-2xl text-sm text-stone-600">
          Post studio-wide announcements, schedule changes, reminders, or coaching themes that every client should see.
        </div>
        <Button variant="warm" onClick={openCreate}>
          <Plus className="size-4" />
          Post bulletin
        </Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {bulletins.map((post) => (
          <Card key={post.id} className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p suppressHydrationWarning className="text-xs font-semibold uppercase tracking-[0.28em] text-bronze-600">{post.publishedAt}</p>
                <h2 className="mt-3 font-serif text-4xl font-semibold">{post.title}</h2>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                {post.postType === "session" ? (
                  <div className="flex items-center gap-2 rounded-full bg-charcoal-950 px-3 py-2 text-xs font-medium text-ivory-50">
                    <CalendarCheck className="size-3.5" />
                    Session invite
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
                    RSVP requested
                  </div>
                ) : null}
              </div>
            </div>
            <p className="mt-5 text-sm leading-7 text-stone-600">{post.body}</p>
            {post.postType === "session" ? (
              <div className="mt-5 rounded-[1.5rem] border border-stone-200/80 bg-stone-50/80 p-4 text-sm text-stone-700">
                <div className="flex items-center gap-2">
                  <CalendarCheck className="size-4 text-bronze-600" />
                  <span suppressHydrationWarning>{formatSessionDate(post.sessionStartsAt) ?? "Session timing pending"}</span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <MapPin className="size-4 text-bronze-600" />
                  <span>{post.sessionLocation ?? "Location to be announced"}</span>
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
              <div className="mt-5 flex gap-3 text-sm text-stone-600">
                <span>{post.rsvpSummary?.attending ?? 0} attending</span>
                <span>{post.rsvpSummary?.notAttending ?? 0} not attending</span>
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
            <div className="mt-5 flex flex-wrap gap-3">
              <Button variant="secondary" onClick={() => openEdit(post)} disabled={busy}>
                <PenSquare className="size-4" />
                Edit
              </Button>
              <Button variant="secondary" onClick={() => void togglePinned(post)} disabled={busy}>
                <Pin className="size-4" />
                {post.pinned ? "Unpin" : "Pin to top"}
              </Button>
            </div>
            <div className="mt-6 text-xs uppercase tracking-[0.22em] text-stone-400">Published by {post.author}</div>
          </Card>
        ))}
      </div>

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-charcoal-950/35 backdrop-blur-sm" />
          <Dialog.Content asChild>
            <motion.div initial={{ opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-1.5rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 rounded-[2rem] border border-white/70 bg-ivory-50 p-6 shadow-soft">
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
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPostType("announcement");
                      setRequiresRsvp(false);
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
                    }}
                    className={`rounded-[1.5rem] border px-4 py-4 text-left ${postType === "session" ? "border-sage-300 bg-sage-50" : "border-stone-200 bg-white/70"}`}
                  >
                    <div className="font-medium text-charcoal-950">Training session invite</div>
                    <div className="mt-1 text-sm text-stone-600">Collect RSVPs for a live coached session and track attendees.</div>
                  </button>
                </div>
                <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Bulletin title" />
                <Textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="Write the message every client should see..." />
                {postType === "session" ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <span className="text-sm font-medium text-stone-700">Session date and time</span>
                      <Input type="datetime-local" value={sessionStartsAt} onChange={(event) => setSessionStartsAt(event.target.value)} />
                    </div>
                    <div className="grid gap-2">
                      <span className="text-sm font-medium text-stone-700">Location</span>
                      <Input value={sessionLocation} onChange={(event) => setSessionLocation(event.target.value)} placeholder="Studio, park, or gym location" />
                    </div>
                    <div className="grid gap-2">
                      <span className="text-sm font-medium text-stone-700">Capacity</span>
                      <Input type="number" min="1" value={sessionCapacity} onChange={(event) => setSessionCapacity(event.target.value)} placeholder="Optional" />
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
