import { AppShell } from "@/components/layout/app-shell";
import { ClientCard } from "@/components/product/client-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { clients } from "@/lib/demo-data";

export default function ClientsPage() {
  return (
    <AppShell role="trainer" title="Client roster" subtitle="Manage profiles, goals, limitations, coaching notes, status, and metrics in one polished client view.">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <Input placeholder="Search clients by name, goal, status..." className="sm:max-w-md" />
        <Button variant="warm">Create client</Button>
        <Button variant="secondary">Archive selected</Button>
      </div>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {clients.map((client) => <ClientCard key={client.id} client={client} />)}
      </div>
    </AppShell>
  );
}
