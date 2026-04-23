import { ArrowRight, CircleDashed, UserRoundCheck, Waves } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { TrainerClientsManager } from "@/components/product/trainer-clients-manager";
import { getTrainerClients } from "@/lib/clients";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export default async function ClientsPage() {
  const { clients, mode } = await getTrainerClients();
  const activeClients = clients.filter((client) => client.status === "active").length;
  const needsAttention = clients.filter((client) => client.status === "needs_attention").length;

  return (
    <AppShell role="trainer" title="Client roster" subtitle="Manage profiles, goals, limitations, coaching notes, status, and metrics in one polished client view.">
      <div className="space-y-5">
        <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <Card className="overflow-hidden border-charcoal-950 bg-charcoal-950 p-7 text-ivory-50">
            <Badge variant="bronze">Nick Glushien Coaching</Badge>
            <h2 className="mt-5 max-w-2xl font-serif text-4xl font-semibold leading-tight">A clear roster makes coaching feel calm, personal, and accountable.</h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-ivory-50/65">
              Clear coaching. Real progress. Keep every client’s context visible so each session, note, and adjustment feels intentional.
            </p>
            <div className="mt-8 flex flex-wrap gap-3 text-sm text-ivory-50/74">
              <div className="rounded-full border border-white/10 bg-white/6 px-4 py-2">{activeClients} active clients</div>
              <div className="rounded-full border border-white/10 bg-white/6 px-4 py-2">{needsAttention} needing review</div>
              <div className="rounded-full border border-white/10 bg-white/6 px-4 py-2">Structured notes and profile context</div>
            </div>
          </Card>
          <div className="grid gap-5 sm:grid-cols-3 xl:grid-cols-1">
            {[
              { label: "Active", value: String(activeClients), icon: UserRoundCheck, tone: "text-sage-700" },
              { label: "Needs review", value: String(needsAttention), icon: CircleDashed, tone: "text-bronze-500" },
              { label: "Coaching rhythm", value: "Weekly", icon: Waves, tone: "text-charcoal-950" },
            ].map(({ label, value, icon: Icon, tone }) => (
              <Card key={label} className="p-5">
                <Icon className={`size-5 ${tone}`} />
                <p className="mt-6 text-[0.66rem] uppercase tracking-[0.28em] text-stone-500">{label}</p>
                <p className="mt-2 font-serif text-4xl font-semibold text-charcoal-950">{value}</p>
              </Card>
            ))}
          </div>
        </div>

        <Card className="p-5">
          <div className="mb-5 flex items-center justify-between gap-4 border-b border-border pb-5">
            <div>
              <p className="text-[0.66rem] uppercase tracking-[0.3em] text-bronze-600">Roster workspace</p>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">Client records, status, notes, and direct profile actions all live here in one command surface.</p>
            </div>
            <div className="hidden items-center gap-2 rounded-full bg-stone-50 px-4 py-2 text-sm text-stone-500 lg:flex">
              Open a client
              <ArrowRight className="size-4" />
            </div>
          </div>
          <TrainerClientsManager initialClients={clients} mode={mode} />
        </Card>
      </div>
    </AppShell>
  );
}
