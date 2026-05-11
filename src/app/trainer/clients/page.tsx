import { AppShell } from "@/components/layout/app-shell";
import { TrainerClientsManager } from "@/components/product/trainer-clients-manager";
import { getTrainerClients } from "@/lib/clients";
import { getTrainerPackageTypes } from "@/lib/package-types";

export default async function ClientsPage() {
  const [{ clients, mode }, { packageTypes }] = await Promise.all([getTrainerClients(), getTrainerPackageTypes()]);

  return (
    <AppShell role="trainer" title="Client roster" subtitle="Manage profiles, goals, limitations, coaching notes, status, and metrics in one polished client view.">
      <TrainerClientsManager initialClients={clients} initialPackageTypes={packageTypes} mode={mode} />
    </AppShell>
  );
}
