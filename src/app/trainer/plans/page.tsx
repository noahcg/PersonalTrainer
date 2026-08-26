import { AppShell } from "@/components/layout/app-shell";
import { TrainerWorkoutBuilderNav } from "@/components/product/trainer-workout-builder-nav";
import { TrainerPlansManager } from "@/components/product/trainer-plans-manager";
import { getTrainerClients } from "@/lib/clients";
import { getTrainerPlans } from "@/lib/plans";

export default async function PlansPage() {
  const [{ plans, mode }, { clients }] = await Promise.all([getTrainerPlans(), getTrainerClients()]);

  return (
    <AppShell
      role="trainer"
      title="Training plans"
      subtitle="Create reusable plan templates, duplicate proven cycles, and assign polished training journeys to clients."
    >
      <TrainerWorkoutBuilderNav>
        <TrainerPlansManager initialPlans={plans} mode={mode} clients={clients} />
      </TrainerWorkoutBuilderNav>
    </AppShell>
  );
}
