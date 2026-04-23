import { AppShell } from "@/components/layout/app-shell";
import { TrainerClientsManager } from "@/components/product/trainer-clients-manager";
import { getTrainerClients } from "@/lib/clients";

export default async function ClientsPage() {
  const { clients, mode } = await getTrainerClients();

  return (
    <AppShell role="trainer" title="Client roster" subtitle="Manage profiles, goals, limitations, coaching notes, status, and metrics in one polished client view.">
      <TrainerClientsManager initialClients={clients} mode={mode} />
    </AppShell>
  );
}
