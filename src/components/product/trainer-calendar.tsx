"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { motion } from "motion/react";
import { CalendarDays, ChevronLeft, ChevronRight, Clock, MapPin, Megaphone, Plus, Trash2, UserRound, X } from "lucide-react";
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

const weekDayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const eventTypeMeta: Record<
  CalendarEvent["type"],
  { label: string; tone: string; dot: string; chip: string }
> = {
  appointment: {
    label: "Appointment",
    tone: "Trainer-scheduled appointment",
    dot: "bg-bronze-500",
    chip: "bg-bronze-100 text-bronze-800 border-bronze-200",
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
  });
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
    type: "appointment",
    title: appointment.title,
    startsAtIso: appointment.startsAtIso,
    durationMinutes: appointment.durationMinutes,
    location: appointment.location,
    clientId: appointment.clientId,
    clientName: appointment.clientName,
    notes: appointment.notes,
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

  async function createAppointment(input: {
    title: string;
    clientId: string | null;
    clientName: string | null;
    startsAtIso: string;
    durationMinutes: number;
    location: string;
    notes: string;
  }): Promise<{ ok: true } | { ok: false; error: string }> {
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
            status: "scheduled",
          })
          .select("id, trainer_id, client_id, title, starts_at, duration_minutes, location, notes, status, created_at")
          .single<{
            id: string;
            trainer_id: string;
            client_id: string | null;
            title: string;
            starts_at: string;
            duration_minutes: number;
            location: string | null;
            notes: string | null;
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
          status: inserted.status,
          createdAt: inserted.created_at,
        };
        await persistAppointments([...appointments, created]);
      }

      setSelectedDateKey(eventDateKey({ startsAtIso: input.startsAtIso } as CalendarEvent));
      flashMessage("Appointment added to your calendar.");
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

  async function deleteAppointment(appointmentId: string) {
    if (!window.confirm("Remove this appointment from your calendar?")) return;
    setBusy(true);
    try {
      if (mode === "supabase") {
        const supabase = createBrowserClient();
        const { error } = await supabase.from("trainer_appointments").delete().eq("id", appointmentId);
        if (error) throw error;
      }
      const next = appointments.filter((appt) => appt.id !== appointmentId);
      await persistAppointments(next);
      flashMessage("Appointment removed.");
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
                <h2 className="font-serif text-2xl font-semibold text-charcoal-950">{monthLabel}</h2>
              </div>
            </div>
            <p className="mt-3 text-sm leading-6 text-stone-500">
              Appointments you create, in-person session logs, and bulletin-board sessions are merged here.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="icon" aria-label="Previous month" onClick={() => setAnchor((current) => addMonths(current, -1))}>
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="secondary" size="sm" onClick={() => {
              const today = new Date();
              setAnchor(startOfMonth(today));
              setSelectedDateKey(isoDateKey(today));
            }}>
              Today
            </Button>
            <Button variant="secondary" size="icon" aria-label="Next month" onClick={() => setAnchor((current) => addMonths(current, 1))}>
              <ChevronRight className="size-4" />
            </Button>
            <Button variant="warm" onClick={() => setDialogOpen(true)}>
              <Plus className="size-4" />
              New appointment
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
          <div className="grid grid-cols-7 border-b border-stone-200 pb-2 text-center text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
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
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[0.66rem] font-semibold uppercase tracking-[0.28em] text-bronze-600">Selected day</p>
                <p className="mt-1 font-serif text-xl font-semibold text-charcoal-950">{formatLongDate(selectedDate)}</p>
              </div>
              <Badge variant={selectedEvents.length ? "bronze" : "default"}>
                {selectedEvents.length} {selectedEvents.length === 1 ? "event" : "events"}
              </Badge>
            </div>
            <div className="mt-4 space-y-3">
              {selectedEvents.length === 0 ? (
                <p className="rounded-[1.25rem] bg-stone-50 px-4 py-4 text-sm leading-6 text-stone-600">
                  Nothing scheduled. Click <span className="font-semibold">New appointment</span> to add one for this day.
                </p>
              ) : (
                selectedEvents.map((event) => <EventRow key={event.id} event={event} onDelete={deleteAppointment} busy={busy} />)
              )}
            </div>
          </Card>

          <Card className="p-5">
            <p className="text-[0.66rem] font-semibold uppercase tracking-[0.28em] text-bronze-600">Upcoming</p>
            <p className="mt-1 font-serif text-lg font-semibold text-charcoal-950">Next on the schedule</p>
            <div className="mt-4 space-y-3">
              {upcomingEvents.length === 0 ? (
                <p className="rounded-[1.25rem] bg-stone-50 px-4 py-4 text-sm leading-6 text-stone-600">
                  No upcoming events. Add an appointment to get started.
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
        onOpenChange={setDialogOpen}
        defaultDateKey={selectedDateKey}
        clientOptions={clientOptions}
        onSubmit={createAppointment}
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
  onDelete,
  busy,
}: {
  event: CalendarEvent;
  onDelete: (appointmentId: string) => Promise<void> | void;
  busy: boolean;
}) {
  const meta = eventTypeMeta[event.type];
  const isAppointment = event.type === "appointment";
  return (
    <div className="rounded-[1.25rem] border border-stone-200 bg-white/82 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
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
          </div>
          {event.notes ? <p className="mt-3 text-sm leading-6 text-stone-600">{event.notes}</p> : null}
        </div>
        {isAppointment ? (
          <Button
            variant="ghost"
            size="sm"
            aria-label="Remove appointment"
            disabled={busy}
            onClick={() => void onDelete(event.id.replace(/^appt-/, ""))}
          >
            <Trash2 className="size-4" />
          </Button>
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
  defaultDateKey,
  clientOptions,
  onSubmit,
  busy,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDateKey: string;
  clientOptions: ClientOption[];
  onSubmit: (input: {
    title: string;
    clientId: string | null;
    clientName: string | null;
    startsAtIso: string;
    durationMinutes: number;
    location: string;
    notes: string;
  }) => Promise<{ ok: true } | { ok: false; error: string }>;
  busy: boolean;
}) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(defaultDateKey);
  const [time, setTime] = useState("09:00");
  const [duration, setDuration] = useState("60");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [clientId, setClientId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const resetForm = useEffectEvent(() => {
    setDate(defaultDateKey);
    setTitle("");
    setTime("09:00");
    setDuration("60");
    setLocation("");
    setNotes("");
    setClientId("");
    setError(null);
  });

  useEffect(() => {
    if (!open) return;
    const timeout = window.setTimeout(() => resetForm(), 0);
    return () => window.clearTimeout(timeout);
  }, [open]);

  const selectedClient = clientOptions.find((option) => option.id === clientId) ?? null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const trimmedTitle = title.trim() || (selectedClient ? `Session with ${selectedClient.name}` : "");
    if (!trimmedTitle) {
      setError("Add a title or select a client.");
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
                  <Dialog.Title className="text-xl font-semibold text-charcoal-950">New appointment</Dialog.Title>
                  <Dialog.Description className="mt-1 text-sm leading-6 text-stone-600">
                    Block out time with a client or save a personal note on your calendar.
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
                    placeholder={selectedClient ? `Session with ${selectedClient.name}` : "Strength block, intake call, etc."}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="mt-2"
                  />
                </div>

                <div>
                  <label htmlFor="appointment-client" className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                    Client (optional)
                  </label>
                  <select
                    id="appointment-client"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className="mt-2 h-11 w-full rounded-2xl border border-stone-200 bg-white/80 px-4 text-sm text-charcoal-950 shadow-inner-soft focus-visible:border-bronze-300 focus-visible:ring-4 focus-visible:ring-bronze-100"
                  >
                    <option value="">No client (personal block)</option>
                    {clientOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                </div>

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
                    Location
                  </label>
                  <Input
                    id="appointment-location"
                    placeholder="Studio, virtual, gym, etc."
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
                    placeholder="Focus, equipment to prep, or anything to remember."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="mt-2"
                  />
                </div>

                {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <Dialog.Close asChild>
                  <Button type="button" variant="secondary" disabled={busy}>
                    Cancel
                  </Button>
                </Dialog.Close>
                <Button type="submit" variant="warm" disabled={busy}>
                  {busy ? "Saving..." : "Save appointment"}
                </Button>
              </div>
            </form>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
