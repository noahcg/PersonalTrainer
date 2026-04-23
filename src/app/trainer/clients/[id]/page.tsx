import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { TrainerClientProfile } from "@/components/product/trainer-client-profile";
import { clients, plans } from "@/lib/demo-data";

export default async function ClientProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = clients.find((item) => item.id === id);
  if (!client) notFound();

  return (
    <AppShell role="trainer" title={client.name} subtitle="A complete client profile with context, metrics, assignments, and coaching notes.">
      <TrainerClientProfile initialClient={client} assignedPlan={plans[0]} />
    </AppShell>
  );
}
