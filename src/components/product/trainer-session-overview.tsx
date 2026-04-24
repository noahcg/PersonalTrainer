"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarCheck, MapPin, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
      ...post,
      postType: post.postType ?? "announcement",
      requiresRsvp: post.requiresRsvp ?? false,
      sessionStartsAt: post.sessionStartsAt ?? null,
      sessionLocation: post.sessionLocation ?? null,
      sessionCapacity: post.sessionCapacity ?? null,
      clientRsvp: attendees.find((entry) => entry.clientId === demoClient.id)?.status ?? null,
      rsvps: attendees,
      rsvpSummary: {
        attending: attendees.filter((entry) => entry.status === "attending").length,
        notAttending: attendees.filter((entry) => entry.status === "not_attending").length,
      },
    };
  });
}

export function TrainerSessionOverview({
  initialBulletins,
  mode,
}: {
  initialBulletins: BulletinPost[];
  mode: "demo" | "supabase";
}) {
  const [bulletins, setBulletins] = useState(initialBulletins);

  useEffect(() => {
    if (mode !== "demo") return;
    const sync = () => {
      try {
        const stored = window.localStorage.getItem(storageKey);
        const posts = stored ? (JSON.parse(stored) as BulletinPost[]) : initialBulletins;
        setBulletins(hydrateRsvps(posts, window.localStorage.getItem(rsvpStorageKey)));
      } catch {
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

  const session = useMemo(
    () =>
      bulletins.find((post) => post.postType === "session") ??
      bulletins.find((post) => post.requiresRsvp && post.sessionStartsAt),
    [bulletins],
  );

  if (!session) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Upcoming training session</CardTitle>
            <CardDescription>Event invites and attendee visibility live here.</CardDescription>
          </div>
          <Button asChild variant="secondary" size="sm">
            <Link href="/trainer/bulletin">Create invite</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-[1.5rem] border border-dashed border-stone-200 bg-stone-50/70 p-5 text-sm text-stone-500">
            No session invite is active. Post one from the bulletin board to collect RSVPs from clients.
          </div>
        </CardContent>
      </Card>
    );
  }

  const attending = (session.rsvps ?? []).filter((entry) => entry.status === "attending");

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>{session.title}</CardTitle>
          <CardDescription>Upcoming training session and live RSVP list.</CardDescription>
        </div>
        <Button asChild variant="secondary" size="sm">
          <Link href="/trainer/bulletin">
            Manage invite
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-[1.4rem] bg-stone-50/86 p-4">
          <p className="text-sm leading-6 text-stone-700">{session.body}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant="bronze">
              <CalendarCheck className="mr-1 size-3.5" />
              <span suppressHydrationWarning>{formatSessionDate(session.sessionStartsAt) ?? "Timing pending"}</span>
            </Badge>
            {session.sessionLocation ? (
              <Badge variant="sage">
                <MapPin className="mr-1 size-3.5" />
                {session.sessionLocation}
              </Badge>
            ) : null}
            <Badge variant="dark">
              <Users className="mr-1 size-3.5" />
              {session.rsvpSummary?.attending ?? 0} attending
            </Badge>
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-charcoal-950">Attendees</p>
            {session.sessionCapacity ? (
              <p className="text-xs uppercase tracking-[0.22em] text-stone-400">
                {attending.length}/{session.sessionCapacity} spots filled
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            {attending.length ? (
              attending.map((entry) => (
                <div key={`${session.id}-${entry.clientId}`} className="flex items-center justify-between rounded-[1.2rem] bg-white px-4 py-3 shadow-soft">
                  <span className="text-sm font-medium text-charcoal-950">{entry.clientName}</span>
                  <span className="text-sm text-sage-700">Reserved</span>
                </div>
              ))
            ) : (
              <div className="rounded-[1.2rem] bg-stone-50/80 px-4 py-4 text-sm text-stone-500">
                No clients have reserved a spot yet.
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
