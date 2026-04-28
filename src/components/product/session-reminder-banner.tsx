"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CalendarCheck, Clock3, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createClient as createBrowserClient } from "@/lib/supabase-browser";
import { applyStoredReminderSettings, filterArchivedBulletins } from "@/lib/bulletin-reminder-storage";
import type { BulletinPost, Role } from "@/lib/types";

const bulletinStorageKey = "aurelian-bulletins";
const rsvpStorageKey = "aurelian-bulletin-rsvps";
const dismissedStorageKey = "aurelian-session-reminders-dismissed";
const demoClient = { id: "mara-lee", name: "Mara Lee" };

function formatSessionDate(value?: string | null) {
  if (!value) return "Timing pending";
  return new Date(value).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  });
}

function formatReminderLead(minutes: number) {
  if (minutes >= 1440) return "1 day";
  if (minutes >= 60) return `${minutes / 60} hour${minutes === 60 ? "" : "s"}`;
  return `${minutes} minutes`;
}

function readDismissedKeys() {
  try {
    return new Set(JSON.parse(window.localStorage.getItem(dismissedStorageKey) ?? "[]") as string[]);
  } catch {
    window.localStorage.removeItem(dismissedStorageKey);
    return new Set<string>();
  }
}

function writeDismissedKey(key: string) {
  const keys = readDismissedKeys();
  keys.add(key);
  window.localStorage.setItem(dismissedStorageKey, JSON.stringify([...keys]));
}

function hydrateDemoRsvps(posts: BulletinPost[]) {
  let stored: Record<string, unknown> = {};
  try {
    stored = JSON.parse(window.localStorage.getItem(rsvpStorageKey) ?? "{}") as Record<string, unknown>;
  } catch {
    window.localStorage.removeItem(rsvpStorageKey);
  }

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
      clientRsvp: attendees.find((entry) => entry.clientId === demoClient.id)?.status ?? post.clientRsvp ?? null,
      rsvps: attendees.length ? attendees : post.rsvps,
    };
  });
}

function findActiveReminder(posts: BulletinPost[], role: Role) {
  const now = Date.now();

  return posts.find((post) => {
    if (post.postType !== "session" || !post.sessionStartsAt || !post.reminderEnabled || !post.reminderMinutesBefore) return false;
    if (role === "trainer" && post.reminderTrainerEnabled === false) return false;
    if (role === "client" && post.reminderAudience !== "all" && post.clientRsvp !== "attending") return false;

    const startsAt = new Date(post.sessionStartsAt).getTime();
    const reminderStartsAt = startsAt - post.reminderMinutesBefore * 60_000;
    return now >= reminderStartsAt && now <= startsAt;
  });
}

export function SessionReminderBanner({
  initialBulletins,
  mode,
  role,
}: {
  initialBulletins: BulletinPost[];
  mode: "demo" | "supabase";
  role: Role;
}) {
  const [bulletins, setBulletins] = useState(initialBulletins);
  const [dismissedKeys, setDismissedKeys] = useState<Set<string> | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const loadDismissals = async () => {
        const keys = readDismissedKeys();

        if (mode === "supabase") {
          try {
            const supabase = createBrowserClient();
            const {
              data: { user },
            } = await supabase.auth.getUser();
            if (user) {
              const { data } = await supabase
                .from("bulletin_reminder_dismissals")
                .select("reminder_key")
                .eq("profile_id", user.id);
              (data ?? []).forEach((row) => {
                if (typeof row.reminder_key === "string") keys.add(row.reminder_key);
              });
            }
          } catch {
            // Local dismissals are enough when the dismissal table has not been applied yet.
          }
        }

        setDismissedKeys(keys);
        setBulletins((current) => filterArchivedBulletins(applyStoredReminderSettings(current)));
      };

      void loadDismissals();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [mode]);

  useEffect(() => {
    if (mode !== "demo") return;

    const sync = () => {
      try {
        const stored = window.localStorage.getItem(bulletinStorageKey);
        const posts = stored ? (JSON.parse(stored) as BulletinPost[]) : initialBulletins;
        setBulletins(filterArchivedBulletins(applyStoredReminderSettings(hydrateDemoRsvps(posts))));
      } catch {
        window.localStorage.removeItem(bulletinStorageKey);
        setBulletins(filterArchivedBulletins(applyStoredReminderSettings(hydrateDemoRsvps(initialBulletins))));
      }
    };

    const timeout = window.setTimeout(sync, 0);
    window.addEventListener("storage", sync);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("storage", sync);
    };
  }, [initialBulletins, mode]);

  const reminder = useMemo(() => findActiveReminder(bulletins, role), [bulletins, role]);
  const reminderKey = reminder ? `${role}:${reminder.id}:${reminder.reminderMinutesBefore}` : null;

  async function dismissReminder() {
    if (!reminderKey || !reminder) return;
    writeDismissedKey(reminderKey);
    setDismissedKeys(readDismissedKeys());

    if (mode === "supabase") {
      try {
        const supabase = createBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        await supabase.from("bulletin_reminder_dismissals").upsert(
          {
            bulletin_post_id: reminder.id,
            profile_id: user.id,
            role,
            reminder_key: reminderKey,
          },
          { onConflict: "bulletin_post_id,profile_id,reminder_key" },
        );
      } catch {
        // Local dismissal still keeps this in-app reminder quiet if the schema has not been applied yet.
      }
    }
  }

  if (!reminder || !reminderKey || dismissedKeys?.has(reminderKey)) return null;

  return (
    <Card className="mb-5 border-bronze-200 bg-bronze-50/70 p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <div className="mt-1 grid size-10 shrink-0 place-items-center rounded-full bg-white/70 text-bronze-600">
            <Clock3 className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-charcoal-950">
              {role === "trainer" ? "Session reminder" : "Upcoming session reminder"}
            </p>
            <p className="mt-1 text-sm leading-6 text-stone-700">
              {reminder.title} starts {formatReminderLead(reminder.reminderMinutesBefore ?? 60)} from the reminder window:
              {" "}
              <span suppressHydrationWarning>{formatSessionDate(reminder.sessionStartsAt)}</span>
              {reminder.sessionLocation ? ` at ${reminder.sessionLocation}` : ""}.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button asChild variant="secondary" size="sm">
            <Link href={role === "trainer" ? "/trainer/bulletin" : "/client/bulletin"}>
              <CalendarCheck className="size-4" />
              View event
            </Link>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => void dismissReminder()}>
            <X className="size-4" />
            Dismiss
          </Button>
        </div>
      </div>
    </Card>
  );
}
