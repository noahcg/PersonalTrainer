import { CopyPlus, LayoutTemplate, Link2 } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { TrainerPlansManager } from "@/components/product/trainer-plans-manager";
import { getTrainerClients } from "@/lib/clients";
import { getTrainerPlans } from "@/lib/plans";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export default async function PlansPage() {
  const [{ plans, mode }, { clients }] = await Promise.all([getTrainerPlans(), getTrainerClients()]);
  const templates = plans.filter((plan) => plan.template).length;

  return (
    <AppShell role="trainer" title="Training plans" subtitle="Create reusable plan templates, duplicate proven cycles, and assign polished training journeys to clients.">
      <div className="space-y-5">
        <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <Card className="p-7">
            <Badge variant="bronze">Plan architecture</Badge>
            <h2 className="mt-5 max-w-2xl font-serif text-4xl font-semibold leading-tight text-charcoal-950">Build training cycles that feel structured, progressive, and easy to trust.</h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-stone-600">
              Clear coaching. Real progress. Reuse what works, preserve your coaching standards, and assign each client a journey with visible intent.
            </p>
          </Card>
          <div className="grid gap-5 sm:grid-cols-3 xl:grid-cols-3">
            {[
              { label: "Plan library", value: String(plans.length), icon: LayoutTemplate },
              { label: "Templates", value: String(templates), icon: CopyPlus },
              { label: "Assignments", value: String(clients.length), icon: Link2 },
            ].map(({ label, value, icon: Icon }) => (
              <Card key={label} className="p-5">
                <Icon className="size-5 text-bronze-500" />
                <p className="mt-6 text-[0.66rem] uppercase tracking-[0.28em] text-stone-500">{label}</p>
                <p className="mt-2 font-serif text-4xl font-semibold text-charcoal-950">{value}</p>
              </Card>
            ))}
          </div>
        </div>

        <Card className="p-5">
          <div className="mb-5 border-b border-border pb-5">
            <p className="text-[0.66rem] uppercase tracking-[0.3em] text-bronze-600">Plan workspace</p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">Shape reusable templates, duplicate proven cycles, and assign plans without losing the editorial clarity of the system.</p>
          </div>
          <TrainerPlansManager initialPlans={plans} mode={mode} clients={clients} />
        </Card>
      </div>
    </AppShell>
  );
}
