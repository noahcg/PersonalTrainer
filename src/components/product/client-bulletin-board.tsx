"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { CalendarCheck, ExternalLink, MapPin, Pin, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SessionReminderBanner } from "@/components/product/session-reminder-banner";
import { formatBulletinLocation, normalizeBulletinLocationDetails } from "@/lib/bulletin-location";
import { applyStoredReminderSettings, filterArchivedBulletins } from "@/lib/bulletin-reminder-storage";
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

export function ClientBulletinBoard({
  initialBulletins,
  mode,
}: {
  initialBulletins: BulletinPost[];
  mode: "demo" | "supabase";
}) {
  const [bulletins, setBulletins] = useState(initialBulletins);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setBulletins((current) => filterArchivedBulletins(applyStoredReminderSettings(current)));
    }, 0);

    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (mode !== "demo") return;
    const sync = () => {
      try {
        const stored = window.localStorage.getItem(storageKey);
        const posts = stored ? (JSON.parse(stored) as BulletinPost[]) : initialBulletins;
        setBulletins(filterArchivedBulletins(applyStoredReminderSettings(hydrateRsvps(posts, window.localStorage.getItem(rsvpStorageKey)))));
      } catch {
        window.localStorage.removeItem(storageKey);
        window.localStorage.removeItem(rsvpStorageKey);
        setBulletins(filterArchivedBulletins(applyStoredReminderSettings(hydrateRsvps(initialBulletins, null))));
      }
    };
    const timeout = window.setTimeout(sync, 0);
    window.addEventListener("storage", sync);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("storage", sync);
    };
  }, [initialBulletins, mode]);

  async function respond(postId: string, status: "attending" | "not_attending") {
    setBusyId(postId);
    setMessage(null);
    try {
      if (mode === "supabase") {
        const supabase = createBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("You need an authenticated client session to RSVP.");

        const { data: client } = await supabase
          .from("clients")
          .select("id")
          .eq("profile_id", user.id)
          .maybeSingle<{ id: string }>();
        if (!client?.id) throw new Error("Client profile not found.");

        const { error } = await supabase.from("bulletin_rsvps").upsert(
          {
            bulletin_post_id: postId,
            client_id: client.id,
            status,
          },
          { onConflict: "bulletin_post_id,client_id" },
        );
        if (error) throw error;
      } else {
        const current = JSON.parse(window.localStorage.getItem(rsvpStorageKey) ?? "{}") as Record<
          string,
          Record<string, { name: string; status: "attending" | "not_attending" }>
        >;
        current[postId] = {
          ...(current[postId] ?? {}),
          [demoClient.id]: { name: demoClient.name, status },
        };
        window.localStorage.setItem(rsvpStorageKey, JSON.stringify(current));
      }

      setBulletins((current) =>
        current.map((post) =>
          post.id === postId
            ? {
                ...post,
                clientRsvp: status,
                rsvps: [
                  ...(post.rsvps ?? []).filter((entry) => entry.clientId !== demoClient.id),
                  { clientId: demoClient.id, clientName: demoClient.name, status },
                ],
                rsvpSummary: {
                  attending: [
                    ...(post.rsvps ?? []).filter((entry) => entry.clientId !== demoClient.id),
                    { clientId: demoClient.id, clientName: demoClient.name, status },
                  ].filter((entry) => entry.status === "attending").length,
                  notAttending: [
                    ...(post.rsvps ?? []).filter((entry) => entry.clientId !== demoClient.id),
                    { clientId: demoClient.id, clientName: demoClient.name, status },
                  ].filter((entry) => entry.status === "not_attending").length,
                },
              }
            : post,
        ),
      );
      setMessage(status === "attending" ? "RSVP saved. Your trainer knows you’re in." : "RSVP saved. Your trainer has your update.");
      window.setTimeout(() => setMessage(null), 2200);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save RSVP.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <SessionReminderBanner initialBulletins={bulletins} mode={mode} role="client" />
      <div className="mb-5 max-w-2xl text-sm text-stone-600">
        Review studio announcements, logistics, and special training events. Posts that require an RSVP let you confirm attendance without leaving the app.
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
      {bulletins.map((post) => (
        <Card key={post.id} className="p-5 sm:p-6">
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
            <div className="mt-6 rounded-[1.5rem] border border-stone-200/80 bg-stone-50/80 p-4 text-sm text-stone-700">
              <div className="flex items-center gap-2">
                <CalendarCheck className="size-4 text-bronze-600" />
                <span suppressHydrationWarning>{formatSessionDate(post.sessionStartsAt) ?? "Session timing pending"}</span>
              </div>
              <div className="mt-2 flex items-start gap-2">
                <MapPin className="mt-0.5 size-4 shrink-0 text-bronze-600" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <span>{formatBulletinLocation(post.sessionLocationDetails, post.sessionLocation) || "Location to be announced"}</span>
                    {post.sessionLocationDetails?.mapUrl ? (
                      <Button
                        asChild
                        variant="secondary"
                        size="sm"
                        className="h-8 shrink-0 self-start rounded-full border-bronze-200 bg-ivory-50 px-3 text-xs font-medium text-bronze-700 hover:bg-bronze-50"
                      >
                        <a href={post.sessionLocationDetails.mapUrl} target="_blank" rel="noreferrer">
                          <ExternalLink className="size-3.5" />
                          Open map
                        </a>
                      </Button>
                    ) : null}
                  </div>
                  {post.sessionLocationDetails?.notes ? (
                    <p className="mt-1 text-stone-500">{post.sessionLocationDetails.notes}</p>
                  ) : null}
                </div>
              </div>
              {post.sessionCapacity ? (
                <div className="mt-2 flex items-center gap-2">
                  <Users className="size-4 text-bronze-600" />
                  <span>{post.sessionCapacity} total spots</span>
                </div>
              ) : null}
            </div>
          ) : null}
          {post.requiresRsvp ? (
            <motion.div layout className="mt-6 rounded-[1.5rem] border border-sage-200/70 bg-sage-50/70 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-charcoal-950">{post.postType === "session" ? "Reserve your spot" : "Training RSVP"}</div>
                  <div className="mt-1 text-sm text-stone-600">
                    {post.clientRsvp === "attending"
                      ? post.postType === "session"
                        ? "You’re on the attendee list for this training session."
                        : "You’re marked as attending."
                      : post.clientRsvp === "not_attending"
                        ? post.postType === "session"
                          ? "Your trainer can see that you can’t make this session."
                          : "You’ve let your trainer know you can’t make it."
                        : post.postType === "session"
                          ? "Reserve your spot so your trainer can plan the session."
                          : "Let your trainer know if you’re attending this session."}
                  </div>
                </div>
                <div className="text-right text-xs uppercase tracking-[0.22em] text-stone-400">
                  <div>{post.rsvpSummary?.attending ?? 0} attending</div>
                  <div className="mt-1">{post.rsvpSummary?.notAttending ?? 0} not attending</div>
                </div>
              </div>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <Button
                  variant={post.clientRsvp === "attending" ? "warm" : "secondary"}
                  className="flex-1"
                  onClick={() => void respond(post.id, "attending")}
                  disabled={busyId === post.id}
                >
                  {post.postType === "session" ? "Reserve spot" : "I'm attending"}
                </Button>
                <Button
                  variant={post.clientRsvp === "not_attending" ? "warm" : "secondary"}
                  className="flex-1"
                  onClick={() => void respond(post.id, "not_attending")}
                  disabled={busyId === post.id}
                >
                  {post.postType === "session" ? "Can't attend" : "Can't make it"}
                </Button>
              </div>
            </motion.div>
          ) : null}
        </Card>
      ))}
      </div>
      {message ? <div className="fixed bottom-24 right-3 z-40 rounded-full bg-charcoal-950 px-4 py-3 text-sm text-ivory-50 shadow-soft lg:right-6">{message}</div> : null}
    </>
  );
}
