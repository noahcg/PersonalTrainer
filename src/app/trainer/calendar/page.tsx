import { AppShell } from "@/components/layout/app-shell";
import { TrainerCalendar } from "@/components/product/trainer-calendar";
import { getTrainerCalendarData } from "@/lib/appointments";
import { getTrainerClients } from "@/lib/clients";

export default async function TrainerCalendarPage() {
  const [{ appointments, events, mode }, { clients }] = await Promise.all([
    getTrainerCalendarData(),
    getTrainerClients(),
  ]);

  const clientOptions = clients
    .filter((client) => client.status !== "archived")
    .map((client) => ({ id: client.id, name: client.name }));

  return (
    <AppShell
      role="trainer"
      title="Calendar"
      subtitle="See every appointment, in-person session, and bulletin session in one place. Add new client appointments directly here."
    >
      <TrainerCalendar
        mode={mode}
        initialAppointments={appointments}
        initialEvents={events}
        clientOptions={clientOptions}
      />
    </AppShell>
  );
}
