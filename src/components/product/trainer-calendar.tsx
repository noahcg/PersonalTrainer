"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { motion } from "motion/react";
import { BellRing, BriefcaseBusiness, CalendarDays, ChevronLeft, ChevronRight, Clock, MapPin, Megaphone, Pencil, Plus, Trash2, UserRound, X } from "lucide-react";
import { useEffect, useEffectEvent, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { readStoredDemoAppointments, writeStoredDemoAppointments } from "@/lib/demo-appointment-storage";
import { createClient as createBrowserClient } from "@/lib/supabase-browser";
import { cn } from "@/lib/utils";
import type { CalendarEvent, TrainerAppointment } from "@/lib/types";

type Mode = "demo" | "supabase";

type ClientOption = { id: string; name: string };
type CalendarItemKind = "planning_session" | "client_appointment";

type AppointmentInput = {
  title: string;
  clientId: string | null;
  clientName: string | null;
  startsAtIso: string;
  durationMinutes: number;
  location: string;
  notes: string;
  reminderOffsetsMinutes: number[];
};

const weekDayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const reminderOptions = [
  { label: "At time", minutes: 0 },
  { label: "5 min", minutes: 5 },
  { label: "15 min", minutes: 15 },
  { label: "30 min", minutes: 30 },
  { label: "1 hr", minutes: 60 },
  { label: "2 hr", minutes: 120 },
  { label: "1 day", minutes: 1440 },
];

const eventTypeMeta: Record<
  CalendarEvent["type"],
  { label: string; tone: string; dot: string; chip: string }
> = {
  appointment: {
    label: "Client appointment",
    tone: "Client-linked appointment",
    dot: "bg-bronze-500",
    chip: "bg-bronze-100 text-bronze-800 border-bronze-200",
  },
  calendar_item: {
    label: "Calendar item",
    tone: "Trainer-only work block",
    dot: "bg-sky-500",
    chip: "bg-sky-100 text-sky-800 border-sky-200",
  },
  bulletin_session: {
    label: "Bulletin session",
    tone: "Group/bulletin session",
    dot: "bg-charcoal-700",
    chip: "bg-charcoal-100 text-charcoal-800 border-charcoal-200",
  },
  in_person_session: {
    label: "In-person session",
    tone: "Logged in-person session",
    dot: "bg-sage-500",
    chip: "bg-sage-100 text-sage-800 border-sage-200",
  },
};

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, delta: number) {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

function isoDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function eventDateKey(event: CalendarEvent | TrainerAppointment) {
  const iso = "startsAtIso" in event ? event.startsAtIso : "";
  if (!iso) return "";
  return isoDateKey(new Date(iso));
}

function formatEventTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

function localTimeZoneLabel() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone.replaceAll("_", " ");
}

function formatReminderLead(minutes: number) {
  if (minutes === 0) return "at start time";
  if (minutes >= 1440) return `${minutes / 1440} day${minutes === 1440 ? "" : "s"} before`;
  if (minutes >= 60) return `${minutes / 60} hr${minutes === 60 ? "" : "s"} before`;
  return `${minutes} min before`;
}

function normalizeReminderOffsets(values: number[]) {
  return [...new Set(values)]
    .filter((value) => Number.isFinite(value) && value >= 0)
    .sort((a, b) => a - b);
}

function formatLongDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function buildMonthGrid(anchor: Date) {
  const first = startOfMonth(anchor);
  const startWeekday = first.getDay();
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - startWeekday);

  const cells: Date[] = [];
  for (let i = 0; i < 42; i += 1) {
    const cell = new Date(gridStart);
    cell.setDate(gridStart.getDate() + i);
    cells.push(cell);
  }
  return cells;
}

function appointmentToEvent(appointment: TrainerAppointment): CalendarEvent {
  return {
    id: `appt-${appointment.id}`,
    type: appointment.clientId ? "appointment" : "calendar_item",
    title: appointment.title,
    startsAtIso: appointment.startsAtIso,
    durationMinutes: appointment.durationMinutes,
    location: appointment.location,
    clientId: appointment.clientId,
    clientName: appointment.clientName,
    notes: appointment.notes,
    reminderOffsetsMinutes: appointment.reminderOffsetsMinutes,
    status: appointment.status,
  };
}

export function TrainerCalendar({
  mode,
  initialAppointments,
  initialEvents,
  clientOptions,
}: {
  mode: Mode;
  initialAppointments: TrainerAppointment[];
  initialEvents: CalendarEvent[];
  clientOptions: ClientOption[];
}) {
  const [appointments, setAppointments] = useState<TrainerAppointment[]>(initialAppointments);
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);
  const [anchor, setAnchor] = useState<Date>(() => startOfMonth(new Date()));
  const [selectedDateKey, setSelectedDateKey] = useState<string>(() => isoDateKey(new Date()));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<TrainerAppointment | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [nowMs, setNowMs] = useState<number | null>(null);

  const hydrateDemoAppointments = useEffectEvent(() => {
    const stored = readStoredDemoAppointments();
    if (!stored.length) return;
    setAppointments(stored);
    setEvents((current) => {
      const withoutOldAppointments = current.filter((event) => event.type !== "appointment");
      return [...withoutOldAppointments, ...stored.map(appointmentToEvent)];
    });
  });

  useEffect(() => {
    if (mode !== "demo") return;
    const timeout = window.setTimeout(() => {
      hydrateDemoAppointments();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [mode]);

  const captureNow = useEffectEvent(() => {
    setNowMs(Date.now());
  });

  useEffect(() => {
    const timeout = window.setTimeout(() => captureNow(), 0);
    return () => window.clearTimeout(timeout);
  }, []);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      const key = eventDateKey(event);
      if (!key) continue;
      const list = map.get(key) ?? [];
      list.push(event);
      map.set(key, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => new Date(a.startsAtIso).getTime() - new Date(b.startsAtIso).getTime());
    }
    return map;
  }, [events]);

  const monthCells = useMemo(() => buildMonthGrid(anchor), [anchor]);
  const monthLabel = anchor.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const selectedDate = useMemo(() => {
    const [year, month, day] = selectedDateKey.split("-").map(Number);
    return new Date(year, month - 1, day);
  }, [selectedDateKey]);
  const selectedEvents = eventsByDate.get(selectedDateKey) ?? [];

  const upcomingEvents = useMemo(() => {
    if (nowMs === null) return [];
    return [...events]
      .filter((event) => new Date(event.startsAtIso).getTime() >= nowMs)
      .sort((a, b) => new Date(a.startsAtIso).getTime() - new Date(b.startsAtIso).getTime())
      .slice(0, 6);
  }, [events, nowMs]);

  function flashMessage(value: string) {
    setMessage(value);
    window.setTimeout(() => setMessage(null), 2200);
  }

  async function persistAppointments(next: TrainerAppointment[]) {
    setAppointments(next);
    setEvents((current) => {
      const others = current.filter((event) => event.type !== "appointment");
      return [...others, ...next.map(appointmentToEvent)];
    });
    if (mode === "demo") {
      writeStoredDemoAppointments(next);
    }
  }

  function openNewAppointment() {
    setEditingAppointment(null);
    setDialogOpen(true);
  }

  function openEditAppointment(appointmentId: string) {
    const appointment = appointments.find((item) => item.id === appointmentId);
    if (!appointment) {
      flashMessage("Appointment not found.");
      return;
    }
    setEditingAppointment(appointment);
    setDialogOpen(true);
  }

  async function createAppointment(input: AppointmentInput): Promise<{ ok: true } | { ok: false; error: string }> {
    setBusy(true);
    try {
      if (mode === "demo") {
        const created: TrainerAppointment = {
          id: `appt-${Date.now().toString(36)}`,
          trainerId: null,
          clientId: input.clientId,
          clientName: input.clientName,
          title: input.title,
          startsAtIso: input.startsAtIso,
          durationMinutes: input.durationMinutes,
          location: input.location,
          notes: input.notes,
          reminderOffsetsMinutes: input.reminderOffsetsMinutes,
          status: "scheduled",
          createdAt: new Date().toISOString(),
        };
        await persistAppointments([...appointments, created]);
      } else {
        const supabase = createBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("You must be signed in to add appointments.");

        const { data: trainer } = await supabase
          .from("trainers")
          .select("id")
          .eq("profile_id", user.id)
          .maybeSingle<{ id: string }>();
        if (!trainer?.id) throw new Error("Trainer profile missing.");

        const { data: inserted, error } = await supabase
          .from("trainer_appointments")
          .insert({
            trainer_id: trainer.id,
            client_id: input.clientId,
            title: input.title,
            starts_at: input.startsAtIso,
            duration_minutes: input.durationMinutes,
            location: input.location || null,
            notes: input.notes || null,
            reminder_offsets_minutes: input.reminderOffsetsMinutes,
            status: "scheduled",
          })
          .select("id, trainer_id, client_id, title, starts_at, duration_minutes, location, notes, reminder_offsets_minutes, status, created_at")
          .single<{
            id: string;
            trainer_id: string;
            client_id: string | null;
            title: string;
            starts_at: string;
            duration_minutes: number;
            location: string | null;
            notes: string | null;
            reminder_offsets_minutes: number[] | null;
            status: TrainerAppointment["status"];
            created_at: string;
          }>();
        if (error || !inserted) {
          const message = error?.message ?? "Unable to save appointment.";
          if (/relation .* does not exist|trainer_appointments/i.test(message)) {
            throw new Error(
              "The trainer_appointments table is missing. Run supabase/trainer-appointments-migration.sql in your Supabase project.",
            );
          }
          if (/reminder_offsets_minutes/i.test(message)) {
            throw new Error(
              "Appointment reminders need a database upgrade. Re-run supabase/trainer-appointments-migration.sql in your Supabase project.",
            );
          }
          throw error ?? new Error("Unable to save appointment.");
        }

        const created: TrainerAppointment = {
          id: inserted.id,
          trainerId: inserted.trainer_id,
          clientId: inserted.client_id,
          clientName: input.clientName,
          title: inserted.title,
          startsAtIso: inserted.starts_at,
          durationMinutes: inserted.duration_minutes,
          location: inserted.location ?? "",
          notes: inserted.notes ?? "",
          reminderOffsetsMinutes: inserted.reminder_offsets_minutes ?? input.reminderOffsetsMinutes,
          status: inserted.status,
          createdAt: inserted.created_at,
        };
        await persistAppointments([...appointments, created]);
      }

      setSelectedDateKey(eventDateKey({ startsAtIso: input.startsAtIso } as CalendarEvent));
      flashMessage(input.clientId ? "Appointment added to your calendar." : "Calendar item added.");
      setDialogOpen(false);
      return { ok: true };
    } catch (error) {
      console.error("createAppointment failed", error);
      const message = error instanceof Error ? error.message : "Unable to save appointment.";
      flashMessage(message);
      return { ok: false, error: message };
    } finally {
      setBusy(false);
    }
  }

  async function updateAppointment(appointmentId: string, input: AppointmentInput): Promise<{ ok: true } | { ok: false; error: string }> {
    setBusy(true);
    try {
      if (mode === "supabase") {
        const supabase = createBrowserClient();
        const { data: updated, error } = await supabase
          .from("trainer_appointments")
          .update({
            client_id: input.clientId,
            title: input.title,
            starts_at: input.startsAtIso,
            duration_minutes: input.durationMinutes,
            location: input.location || null,
            notes: input.notes || null,
            reminder_offsets_minutes: input.reminderOffsetsMinutes,
          })
          .eq("id", appointmentId)
          .select("id, trainer_id, client_id, title, starts_at, duration_minutes, location, notes, reminder_offsets_minutes, status, created_at")
          .single<{
            id: string;
            trainer_id: string;
            client_id: string | null;
            title: string;
            starts_at: string;
            duration_minutes: number;
            location: string | null;
            notes: string | null;
            reminder_offsets_minutes: number[] | null;
            status: TrainerAppointment["status"];
            created_at: string;
          }>();

        if (error || !updated) {
          if (error?.message && /reminder_offsets_minutes/i.test(error.message)) {
            throw new Error(
              "Appointment reminders need a database upgrade. Re-run supabase/trainer-appointments-migration.sql in your Supabase project.",
            );
          }
          throw error ?? new Error("Unable to update appointment.");
        }

        const nextAppointment: TrainerAppointment = {
          id: updated.id,
          trainerId: updated.trainer_id,
          clientId: updated.client_id,
          clientName: input.clientName,
          title: updated.title,
          startsAtIso: updated.starts_at,
          durationMinutes: updated.duration_minutes,
          location: updated.location ?? "",
          notes: updated.notes ?? "",
          reminderOffsetsMinutes: updated.reminder_offsets_minutes ?? input.reminderOffsetsMinutes,
          status: updated.status,
          createdAt: updated.created_at,
        };
        await persistAppointments(appointments.map((appointment) => (appointment.id === appointmentId ? nextAppointment : appointment)));
      } else {
        const nextAppointment: TrainerAppointment = {
          ...(appointments.find((appointment) => appointment.id === appointmentId) ?? {
            id: appointmentId,
            trainerId: null,
            status: "scheduled" as const,
            createdAt: new Date().toISOString(),
          }),
          clientId: input.clientId,
          clientName: input.clientName,
          title: input.title,
          startsAtIso: input.startsAtIso,
          durationMinutes: input.durationMinutes,
          location: input.location,
          notes: input.notes,
          reminderOffsetsMinutes: input.reminderOffsetsMinutes,
        };
        await persistAppointments(appointments.map((appointment) => (appointment.id === appointmentId ? nextAppointment : appointment)));
      }

      setSelectedDateKey(eventDateKey({ startsAtIso: input.startsAtIso } as CalendarEvent));
      flashMessage(input.clientId ? "Appointment updated." : "Calendar item updated.");
      setEditingAppointment(null);
      setDialogOpen(false);
      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to update appointment.";
      flashMessage(message);
      return { ok: false, error: message };
    } finally {
      setBusy(false);
    }
  }

  async function saveAppointment(input: AppointmentInput): Promise<{ ok: true } | { ok: false; error: string }> {
    if (editingAppointment) {
      return updateAppointment(editingAppointment.id, input);
    }
    return createAppointment(input);
  }

  async function deleteAppointment(appointmentId: string) {
    if (!window.confirm("Remove this calendar item?")) return;
    setBusy(true);
    try {
      if (mode === "supabase") {
        const supabase = createBrowserClient();
        const { error } = await supabase.from("trainer_appointments").delete().eq("id", appointmentId);
        if (error) throw error;
      }
      const next = appointments.filter((appt) => appt.id !== appointmentId);
      await persistAppointments(next);
      flashMessage("Calendar item removed.");
    } catch (error) {
      flashMessage(error instanceof Error ? error.message : "Unable to remove appointment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-full bg-bronze-100 text-bronze-700">
                <CalendarDays className="size-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-bronze-600">Schedule</p>
                <h2 className="font-serif text-2xl font-semibold text-charcoal-950">Calendar workspace</h2>
              </div>
            </div>
            <p className="mt-3 text-sm leading-6 text-stone-500">
              Client appointments, trainer-only work blocks, in-person session logs, and bulletin-board sessions are merged here.
            </p>
          </div>
          <div className="flex items-center gap-2 sm:self-start">
            <Button variant="warm" onClick={openNewAppointment}>
              <Plus className="size-4" />
              New item
            </Button>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2 text-xs text-stone-600">
          {(Object.entries(eventTypeMeta) as Array<[CalendarEvent["type"], (typeof eventTypeMeta)[CalendarEvent["type"]]]>).map(([type, meta]) => (
            <span key={type} className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white/80 px-3 py-1">
              <span className={cn("size-2 rounded-full", meta.dot)} />
              {meta.label}
            </span>
          ))}
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="overflow-hidden p-3 sm:p-4">
          <div className="flex flex-col gap-3 border-b border-stone-200 px-1 pb-4 sm:flex-row sm:items-center sm:justify-between sm:px-2">
            <div className="min-w-0">
              <p className="text-[0.66rem] font-semibold uppercase tracking-[0.24em] text-bronze-600">Month view</p>
              <p className="mt-1 truncate font-serif text-2xl font-semibold text-charcoal-950 sm:text-3xl">{monthLabel}</p>
            </div>
            <div className="inline-flex w-full items-center justify-between gap-2 rounded-full border border-stone-200 bg-white/75 p-1 shadow-[0_10px_28px_rgba(41,37,36,0.05)] sm:w-auto">
              <Button
                variant="ghost"
                size="icon"
                className="size-9 shrink-0 hover:bg-stone-50"
                aria-label="Previous month"
                onClick={() => setAnchor((current) => addMonths(current, -1))}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="h-9 min-w-20 bg-stone-50 px-4 text-xs ring-stone-200 hover:bg-ivory-50"
                onClick={() => {
                  const today = new Date();
                  setAnchor(startOfMonth(today));
                  setSelectedDateKey(isoDateKey(today));
                }}
              >
                Today
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-9 shrink-0 hover:bg-stone-50"
                aria-label="Next month"
                onClick={() => setAnchor((current) => addMonths(current, 1))}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-7 pt-3 pb-2 text-center text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
            {weekDayLabels.map((label) => (
              <div key={label} className="py-2">
                {label}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1 pt-2">
            {monthCells.map((cell) => {
              const dateKey = isoDateKey(cell);
              const inMonth = cell.getMonth() === anchor.getMonth();
              const isToday = isoDateKey(new Date()) === dateKey;
              const isSelected = dateKey === selectedDateKey;
              const dayEvents = eventsByDate.get(dateKey) ?? [];
              return (
                <button
                  key={dateKey}
                  type="button"
                  onClick={() => setSelectedDateKey(dateKey)}
                  className={cn(
                    "group min-h-24 rounded-2xl border border-transparent p-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bronze-300",
                    inMonth ? "bg-stone-50/70" : "bg-stone-50/30 text-stone-400",
                    isSelected && "border-bronze-400 bg-white shadow-soft",
                    !isSelected && "hover:border-stone-200 hover:bg-white",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className={cn("text-sm font-semibold", isToday && "rounded-full bg-charcoal-950 px-2 py-0.5 text-ivory-50")}>{cell.getDate()}</span>
                    {dayEvents.length ? (
                      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-500">
                        {dayEvents.length}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1 space-y-1">
                    {dayEvents.slice(0, 3).map((event) => {
                      const meta = eventTypeMeta[event.type];
                      return (
                        <div key={event.id} className={cn("flex items-center gap-1 truncate rounded-md px-1.5 py-0.5 text-[11px]", meta.chip, "border")}>
                          <span className={cn("size-1.5 shrink-0 rounded-full", meta.dot)} />
                          <span className="truncate">{formatEventTime(event.startsAtIso)} · {event.title}</span>
                        </div>
                      );
                    })}
                    {dayEvents.length > 3 ? (
                      <p className="text-[10px] font-medium text-stone-500">+{dayEvents.length - 3} more</p>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        <div className="space-y-5">
          <Card className="p-5">
            <div>
              <p className="text-[0.66rem] font-semibold uppercase tracking-[0.28em] text-bronze-600">Selected day</p>
              <p className="mt-1 font-serif text-xl font-semibold leading-tight text-charcoal-950">{formatLongDate(selectedDate)}</p>
              <div className="mt-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                <span className={cn("size-2 rounded-full", selectedEvents.length ? "bg-bronze-500" : "bg-stone-300")} />
                <span>
                  {selectedEvents.length
                    ? `${selectedEvents.length} ${selectedEvents.length === 1 ? "event" : "events"} scheduled`
                    : "No events scheduled"}
                </span>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {selectedEvents.length === 0 ? (
                <p className="rounded-[1.25rem] bg-stone-50 px-4 py-4 text-sm leading-6 text-stone-600">
                  Nothing scheduled. Click <span className="font-semibold">New item</span> to add one for this day.
                </p>
              ) : (
                selectedEvents.map((event) => (
                  <EventRow key={event.id} event={event} onEdit={openEditAppointment} onDelete={deleteAppointment} busy={busy} />
                ))
              )}
            </div>
          </Card>

          <Card className="p-5">
            <p className="text-[0.66rem] font-semibold uppercase tracking-[0.28em] text-bronze-600">Upcoming</p>
            <p className="mt-1 font-serif text-lg font-semibold text-charcoal-950">Next on the schedule</p>
            <div className="mt-4 space-y-3">
              {upcomingEvents.length === 0 ? (
                <p className="rounded-[1.25rem] bg-stone-50 px-4 py-4 text-sm leading-6 text-stone-600">
                  No upcoming events. Add a calendar item to get started.
                </p>
              ) : (
                upcomingEvents.map((event) => (
                  <button
                    type="button"
                    key={event.id}
                    onClick={() => {
                      const date = new Date(event.startsAtIso);
                      setAnchor(startOfMonth(date));
                      setSelectedDateKey(isoDateKey(date));
                    }}
                    className="block w-full rounded-[1.25rem] border border-stone-200 bg-white/70 p-3 text-left transition hover:bg-white"
                  >
                    <UpcomingRow event={event} />
                  </button>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>

      <AppointmentDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingAppointment(null);
        }}
        appointment={editingAppointment}
        defaultDateKey={selectedDateKey}
        clientOptions={clientOptions}
        onSubmit={saveAppointment}
        busy={busy}
      />

      {message ? (
        <div className="fixed bottom-24 right-3 z-40 rounded-full bg-charcoal-950 px-4 py-3 text-sm text-ivory-50 shadow-soft lg:right-6">
          {message}
        </div>
      ) : null}
    </div>
  );
}

function EventRow({
  event,
  onEdit,
  onDelete,
  busy,
}: {
  event: CalendarEvent;
  onEdit: (appointmentId: string) => void;
  onDelete: (appointmentId: string) => Promise<void> | void;
  busy: boolean;
}) {
  const meta = eventTypeMeta[event.type];
  const isTrainerEditableItem = event.type === "appointment" || event.type === "calendar_item";
  return (
    <div className={cn("relative rounded-[1.25rem] border border-stone-200 bg-white/82 p-4", isTrainerEditableItem && "pr-24")}>
      <div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold", meta.chip)}>
              <span className={cn("size-1.5 rounded-full", meta.dot)} />
              {meta.label}
            </span>
            {event.status && event.status !== "scheduled" && event.status !== "active" ? (
              <Badge variant="default">{event.status}</Badge>
            ) : null}
          </div>
          <p className="mt-2 font-semibold text-charcoal-950">{event.title}</p>
          <div className="mt-2 grid gap-1 text-xs text-stone-500">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-3.5" />
              {formatEventTime(event.startsAtIso)}
              {event.durationMinutes ? ` · ${event.durationMinutes} min` : ""}
            </span>
            {event.location ? (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-3.5" />
                {event.location}
              </span>
            ) : null}
            {event.clientName ? (
              <span className="inline-flex items-center gap-1.5">
                <UserRound className="size-3.5" />
                {event.clientName}
              </span>
            ) : event.type === "bulletin_session" ? (
              <span className="inline-flex items-center gap-1.5">
                <Megaphone className="size-3.5" />
                Bulletin invite
              </span>
            ) : null}
            {event.type === "calendar_item" ? (
              <span className="inline-flex items-center gap-1.5">
                <BriefcaseBusiness className="size-3.5" />
                Trainer-only
              </span>
            ) : null}
            {event.type === "appointment" && event.clientId && event.reminderOffsetsMinutes?.length ? (
              <span className="inline-flex items-center gap-1.5">
                <BellRing className="size-3.5" />
                Client reminder {event.reminderOffsetsMinutes.map(formatReminderLead).join(", ")}
              </span>
            ) : null}
          </div>
          {event.notes ? <p className="mt-3 text-sm leading-6 text-stone-600">{event.notes}</p> : null}
        </div>
        {isTrainerEditableItem ? (
          <div className="absolute right-3 top-3 flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              aria-label="Edit calendar item"
              disabled={busy}
              onClick={() => onEdit(event.id.replace(/^appt-/, ""))}
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              aria-label="Remove calendar item"
              disabled={busy}
              onClick={() => void onDelete(event.id.replace(/^appt-/, ""))}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function UpcomingRow({ event }: { event: CalendarEvent }) {
  const meta = eventTypeMeta[event.type];
  const date = new Date(event.startsAtIso);
  return (
    <div className="flex items-center gap-3">
      <div className="grid size-11 place-items-center rounded-2xl bg-stone-50 text-center">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-500">
          {date.toLocaleDateString("en-US", { month: "short" })}
        </span>
        <span className="-mt-1 text-lg font-semibold text-charcoal-950">{date.getDate()}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={cn("size-1.5 rounded-full", meta.dot)} />
          <span className="truncate text-sm font-semibold text-charcoal-950">{event.title}</span>
        </div>
        <p className="mt-1 truncate text-xs text-stone-500">
          {formatEventTime(event.startsAtIso)}
          {event.clientName ? ` · ${event.clientName}` : ""}
          {event.location ? ` · ${event.location}` : ""}
        </p>
      </div>
    </div>
  );
}

function AppointmentDialog({
  open,
  onOpenChange,
  appointment,
  defaultDateKey,
  clientOptions,
  onSubmit,
  busy,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: TrainerAppointment | null;
  defaultDateKey: string;
  clientOptions: ClientOption[];
  onSubmit: (input: AppointmentInput) => Promise<{ ok: true } | { ok: false; error: string }>;
  busy: boolean;
}) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(defaultDateKey);
  const [time, setTime] = useState("09:00");
  const [duration, setDuration] = useState("60");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [itemKind, setItemKind] = useState<CalendarItemKind>("planning_session");
  const [clientId, setClientId] = useState<string>("");
  const [reminderOffsets, setReminderOffsets] = useState<number[]>([60]);
  const [error, setError] = useState<string | null>(null);

  const resetForm = useEffectEvent(() => {
    if (appointment) {
      const startsAt = new Date(appointment.startsAtIso);
      setDate(isoDateKey(startsAt));
      setTitle(appointment.title);
      setTime(`${String(startsAt.getHours()).padStart(2, "0")}:${String(startsAt.getMinutes()).padStart(2, "0")}`);
      setDuration(String(appointment.durationMinutes));
      setLocation(appointment.location);
      setNotes(appointment.notes);
      setItemKind(appointment.clientId ? "client_appointment" : "planning_session");
      setClientId(appointment.clientId ?? "");
      setReminderOffsets(normalizeReminderOffsets(appointment.reminderOffsetsMinutes ?? []));
      setError(null);
      return;
    }

    setDate(defaultDateKey);
    setTitle("");
    setTime("09:00");
    setDuration("60");
    setLocation("");
    setNotes("");
    setItemKind("planning_session");
    setClientId("");
    setReminderOffsets([60]);
    setError(null);
  });

  useEffect(() => {
    if (!open) return;
    const timeout = window.setTimeout(() => resetForm(), 0);
    return () => window.clearTimeout(timeout);
  }, [open]);

  const selectedClient = itemKind === "client_appointment"
    ? clientOptions.find((option) => option.id === clientId) ?? null
    : null;

  function toggleReminderOffset(minutes: number) {
    setReminderOffsets((current) => {
      const next = current.includes(minutes)
        ? current.filter((value) => value !== minutes)
        : [...current, minutes];
      return normalizeReminderOffsets(next);
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const trimmedTitle = title.trim() || (selectedClient ? `Session with ${selectedClient.name}` : "");
    if (!trimmedTitle) {
      setError("Add a title.");
      return;
    }
    if (itemKind === "client_appointment" && !selectedClient) {
      setError("Select a client for this appointment.");
      return;
    }
    if (!date || !time) {
      setError("Add a date and start time.");
      return;
    }
    const startsAt = new Date(`${date}T${time}`);
    if (Number.isNaN(startsAt.getTime())) {
      setError("That date and time don't look valid.");
      return;
    }
    const durationMinutes = Math.max(5, Number.parseInt(duration, 10) || 60);

    const result = await onSubmit({
      title: trimmedTitle,
      clientId: selectedClient?.id ?? null,
      clientName: selectedClient?.name ?? null,
      startsAtIso: startsAt.toISOString(),
      durationMinutes,
      location: location.trim(),
      notes: notes.trim(),
      reminderOffsetsMinutes: selectedClient ? normalizeReminderOffsets(reminderOffsets) : [],
    });

    if (!result.ok) {
      setError(result.error);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-charcoal-950/40 backdrop-blur-sm" />
        <Dialog.Content asChild>
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            className="fixed inset-x-3 bottom-3 z-50 max-h-[92vh] overflow-y-auto rounded-[2rem] border border-white/70 bg-ivory-50 shadow-soft outline-none sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-w-xl sm:-translate-x-1/2 sm:-translate-y-1/2"
          >
            <form onSubmit={handleSubmit} className="p-5 sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Dialog.Title className="text-xl font-semibold text-charcoal-950">
                    {appointment ? "Edit calendar item" : "New calendar item"}
                  </Dialog.Title>
                  <Dialog.Description className="mt-1 text-sm leading-6 text-stone-600">
                    {appointment
                      ? "Update the time, client, location, or notes for this calendar item."
                      : "Add a client appointment or block off trainer-only work time."}
                  </Dialog.Description>
                </div>
                <Dialog.Close asChild>
                  <Button type="button" variant="ghost" size="icon" aria-label="Close dialog">
                    <X className="size-5" />
                  </Button>
                </Dialog.Close>
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <label htmlFor="appointment-title" className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                    Title
                  </label>
                  <Input
                    id="appointment-title"
                    placeholder={itemKind === "client_appointment" && selectedClient ? `Session with ${selectedClient.name}` : "Client management, workout build, demo media, etc."}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="mt-2"
                  />
                </div>

                <div>
                  <label htmlFor="appointment-kind" className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                    Event
                  </label>
                  <select
                    id="appointment-kind"
                    value={itemKind}
                    onChange={(e) => {
                      const nextKind = e.target.value as CalendarItemKind;
                      setItemKind(nextKind);
                      if (nextKind === "planning_session") {
                        setClientId("");
                        setReminderOffsets([]);
                      } else if (!reminderOffsets.length) {
                        setReminderOffsets([60]);
                      }
                    }}
                    className="mt-2 h-11 w-full rounded-2xl border border-stone-200 bg-white/80 px-4 text-sm text-charcoal-950 shadow-inner-soft focus-visible:border-bronze-300 focus-visible:ring-4 focus-visible:ring-bronze-100"
                  >
                    <option value="planning_session">Planning session</option>
                    <option value="client_appointment">Client appointment</option>
                  </select>
                </div>

                {itemKind === "client_appointment" ? (
                  <div>
                    <label htmlFor="appointment-client" className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                      Client
                    </label>
                    <select
                      id="appointment-client"
                      value={clientId}
                      onChange={(e) => setClientId(e.target.value)}
                      className="mt-2 h-11 w-full rounded-2xl border border-stone-200 bg-white/80 px-4 text-sm text-charcoal-950 shadow-inner-soft focus-visible:border-bronze-300 focus-visible:ring-4 focus-visible:ring-bronze-100"
                    >
                      <option value="">Select a client</option>
                      {clientOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}

                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label htmlFor="appointment-date" className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                      Date
                    </label>
                    <Input id="appointment-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-2" />
                  </div>
                  <div>
                    <label htmlFor="appointment-time" className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                      Start time
                    </label>
                    <Input id="appointment-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} className="mt-2" />
                    <p className="mt-1 text-xs text-stone-500">{localTimeZoneLabel()}</p>
                  </div>
                  <div>
                    <label htmlFor="appointment-duration" className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                      Minutes
                    </label>
                    <Input
                      id="appointment-duration"
                      type="number"
                      min={5}
                      step={5}
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      className="mt-2"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="appointment-location" className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                    Location (optional)
                  </label>
                  <Input
                    id="appointment-location"
                    placeholder="Studio, virtual, desk work, gym, etc."
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="mt-2"
                  />
                </div>

                <div>
                  <label htmlFor="appointment-notes" className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                    Notes
                  </label>
                  <Textarea
                    id="appointment-notes"
                    placeholder="Focus, prep details, links to gather, or anything to remember."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="mt-2"
                  />
                </div>

                {selectedClient ? (
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                        Client reminders
                      </label>
                      <span className="text-xs text-stone-500">{selectedClient.name}</span>
                    </div>
                    <div className="mt-2 grid gap-2 sm:grid-cols-4">
                      {reminderOptions.map((option) => {
                        const selected = reminderOffsets.includes(option.minutes);
                        return (
                          <button
                            key={option.minutes}
                            type="button"
                            onClick={() => toggleReminderOffset(option.minutes)}
                            className={cn(
                              "inline-flex min-h-11 items-center justify-center rounded-2xl border px-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bronze-300",
                              selected
                                ? "border-bronze-300 bg-bronze-50 text-bronze-800"
                                : "border-stone-200 bg-white/70 text-stone-600 hover:bg-white",
                            )}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                    <p className="mt-2 text-xs leading-5 text-stone-500">
                      Reminders appear in the client portal during the selected window before the appointment.
                    </p>
                  </div>
                ) : null}

                {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <Dialog.Close asChild>
                  <Button type="button" variant="secondary" disabled={busy}>
                    Cancel
                  </Button>
                </Dialog.Close>
                <Button type="submit" variant="warm" disabled={busy}>
                  {busy ? "Saving..." : appointment ? "Update item" : "Save item"}
                </Button>
              </div>
            </form>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
