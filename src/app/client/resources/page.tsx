import { AppShell } from "@/components/layout/app-shell";
import { ClientResourcesGrid } from "@/components/product/trainer-resources-manager";
import { Card } from "@/components/ui/card";
import { getClientResources } from "@/lib/resources";

export default async function ClientResourcesPage() {
  const { resources } = await getClientResources();

  return (
    <AppShell role="client" title="Resources" subtitle="Guides, support materials, and assigned references from your trainer.">
      {resources.length ? (
        <ClientResourcesGrid resources={resources} />
      ) : (
        <Card className="max-w-3xl p-8">
          <p className="font-serif text-4xl font-semibold text-charcoal-950">No resources yet.</p>
          <p className="mt-3 text-sm leading-6 text-stone-600">
            When your trainer shares guides, videos, or support references, they will appear here.
          </p>
        </Card>
      )}
    </AppShell>
  );
}
