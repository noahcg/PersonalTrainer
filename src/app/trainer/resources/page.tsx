import { AppShell } from "@/components/layout/app-shell";
import { TrainerResourcesManager } from "@/components/product/trainer-resources-manager";
import { getTrainerClients } from "@/lib/clients";
import { getTrainerResources } from "@/lib/resources";

export default async function ResourcesPage() {
  const [{ resources, mode }, { clients }] = await Promise.all([getTrainerResources(), getTrainerClients()]);

  return (
    <AppShell
      role="trainer"
      title="Coaching resources"
      subtitle="Build reusable education, references, and support materials that can be global or assigned directly to one client."
    >
      <TrainerResourcesManager initialResources={resources} clients={clients} mode={mode} />
    </AppShell>
  );
}
