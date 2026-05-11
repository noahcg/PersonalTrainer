import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { TrainerClientProfile } from "@/components/product/trainer-client-profile";
import { getTrainerClientProfile } from "@/lib/clients";
import { getTrainerPackageTypes } from "@/lib/package-types";

export default async function ClientProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [result, { packageTypes }] = await Promise.all([getTrainerClientProfile(id), getTrainerPackageTypes()]);
  if (!result) notFound();
  const { client, intake, assignedPlan, coachingNotes, sessions, mode } = result;

  return (
    <AppShell role="trainer" title="Client Profile" subtitle="A complete client profile with context, metrics, assignments, and coaching notes.">
      <TrainerClientProfile
        initialClient={client}
        intake={intake}
        assignedPlan={assignedPlan}
        initialCoachingNotes={coachingNotes}
        initialSessions={sessions}
        packageTypes={packageTypes}
        mode={mode}
      />
    </AppShell>
  );
}
