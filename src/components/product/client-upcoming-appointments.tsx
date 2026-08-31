"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BellRing, CalendarCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TrainerAppointment } from "@/lib/types";

const dismissedStorageKey = "nick-glushien-appointment-reminders-dismissed";

function formatAppointmentDateTime(iso: string) {
  const date = new Date(iso);
  return {
    date: date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    }),
    time: date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    }),
  };
}

function formatReminderLead(minutes: number) {
  if (minutes === 0) return "at start time";
  if (minutes >= 1440) return `${minutes / 1440} day${minutes === 1440 ? "" : "s"} before`;
  if (minutes >= 60) return `${minutes / 60} hour${minutes === 60 ? "" : "s"} before`;
  return `${minutes} minutes before`;
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

function findActiveAppointmentReminder(appointments: TrainerAppointment[]) {
  const now = Date.now();

  for (const appointment of appointments) {
    const startsAt = new Date(appointment.startsAtIso).getTime();
    if (!appointment.reminderOffsetsMinutes.length || startsAt < now) continue;

    const activeOffset = [...appointment.reminderOffsetsMinutes]
      .sort((a, b) => b - a)
      .find((minutes) => {
        const reminderStartsAt = startsAt - minutes * 60_000;
        return now >= reminderStartsAt && now <= startsAt;
      });

    if (activeOffset !== undefined) return { appointment, offset: activeOffset };
  }

  return null;
}

export function AppointmentReminderBanner({ appointments }: { appointments: TrainerAppointment[] }) {
  const [dismissedKeys, setDismissedKeys] = useState<Set<string> | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDismissedKeys(readDismissedKeys()), 0);
    return () => window.clearTimeout(timeout);
  }, []);

  const reminder = useMemo(() => findActiveAppointmentReminder(appointments), [appointments]);
  const reminderKey = reminder ? `client:${reminder.appointment.id}:${reminder.offset}` : null;

  if (!reminder || !reminderKey || dismissedKeys?.has(reminderKey)) return null;

  const formatted = formatAppointmentDateTime(reminder.appointment.startsAtIso);

  return (
    <Card className="mb-5 border-bronze-200 bg-bronze-50/70 p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <div className="mt-1 grid size-10 shrink-0 place-items-center rounded-full bg-white/70 text-bronze-600">
            <BellRing className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-charcoal-950">Upcoming appointment reminder</p>
            <p suppressHydrationWarning className="mt-1 text-sm leading-6 text-stone-700">
              {reminder.appointment.title} is scheduled for {formatted.date} at {formatted.time}
              {reminder.appointment.location ? ` at ${reminder.appointment.location}` : ""}.
            </p>
            <p className="mt-1 text-xs font-medium text-bronze-700">
              Reminder set {formatReminderLead(reminder.offset)}.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button asChild variant="secondary" size="sm">
            <Link href="/client/home">
              <CalendarCheck className="size-4" />
              View
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              writeDismissedKey(reminderKey);
              setDismissedKeys(readDismissedKeys());
            }}
          >
            <X className="size-4" />
            Dismiss
          </Button>
        </div>
      </div>
    </Card>
  );
}

export function ClientUpcomingAppointments({ appointments }: { appointments: TrainerAppointment[] }) {
  return (
    <Card>
      <CardHeader><CardTitle>Upcoming appointments</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {appointments.length ? (
          appointments.slice(0, 5).map((appointment) => {
            const formatted = formatAppointmentDateTime(appointment.startsAtIso);
            return (
              <div key={appointment.id} className="rounded-[1.35rem] border border-stone-200 bg-white/80 p-4 shadow-[0_10px_28px_rgba(41,37,36,0.06)]">
                <p suppressHydrationWarning className="text-sm font-semibold">
                  {formatted.date} at {formatted.time}
                </p>
                <p className="mt-2 text-sm leading-6 text-stone-600">
                  {appointment.title}
                  {appointment.durationMinutes ? ` · ${appointment.durationMinutes} min` : ""}
                  {appointment.location ? ` · ${appointment.location}` : ""}
                </p>
                {appointment.notes ? <p className="mt-2 text-sm leading-6 text-stone-500">{appointment.notes}</p> : null}
                {appointment.reminderOffsetsMinutes.length ? (
                  <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-bronze-700">
                    <BellRing className="size-3.5" />
                    Reminder {appointment.reminderOffsetsMinutes.map(formatReminderLead).join(", ")}
                  </p>
                ) : null}
              </div>
            );
          })
        ) : (
          <div className="rounded-[1.35rem] bg-stone-50 p-4 text-sm leading-6 text-stone-600">
            No upcoming appointments have been scheduled yet.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
