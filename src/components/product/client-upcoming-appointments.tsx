"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TrainerAppointment } from "@/lib/types";

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

export function ClientUpcomingAppointments({ appointments }: { appointments: TrainerAppointment[] }) {
  return (
    <Card>
      <CardHeader><CardTitle>Upcoming appointments</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {appointments.length ? (
          appointments.slice(0, 5).map((appointment) => {
            const formatted = formatAppointmentDateTime(appointment.startsAtIso);
            return (
              <div key={appointment.id} className="rounded-[1.35rem] bg-stone-50 p-4">
                <p className="text-sm font-semibold">
                  {formatted.date} at {formatted.time}
                </p>
                <p className="mt-2 text-sm leading-6 text-stone-600">
                  {appointment.title}
                  {appointment.durationMinutes ? ` · ${appointment.durationMinutes} min` : ""}
                  {appointment.location ? ` · ${appointment.location}` : ""}
                </p>
                {appointment.notes ? <p className="mt-2 text-sm leading-6 text-stone-500">{appointment.notes}</p> : null}
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
