import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { TrainerClientProfile } from "@/components/product/trainer-client-profile";
import { getTrainerClientProfile } from "@/lib/clients";

export default async function ClientProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getTrainerClientProfile(id);
  if (!result) notFound();
  const { client, assignedPlan, coachingNotes, sessions, mode } = result;

  return (
    <AppShell role="trainer" title="Client Profile" subtitle="A complete client profile with context, metrics, assignments, and coaching notes.">
      <TrainerClientProfile
        initialClient={client}
        assignedPlan={assignedPlan}
        initialCoachingNotes={coachingNotes}
        initialSessions={sessions}
        mode={mode}
      />
    </AppShell>
  );
}
