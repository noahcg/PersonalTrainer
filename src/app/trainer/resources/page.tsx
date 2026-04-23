import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { resources } from "@/lib/demo-data";

export default function ResourcesPage() {
  return (
    <AppShell role="trainer" title="Coaching resources" subtitle="Curate helpful guides, videos, reminders, and education clients can revisit between sessions.">
      <div className="mb-5"><Button variant="warm">Create resource</Button></div>
      <div className="grid gap-5 md:grid-cols-3">
        {resources.map((resource) => (
          <Card key={resource.title} className="p-6">
            <Badge variant="bronze">{resource.type}</Badge>
            <h3 className="mt-5 text-xl font-semibold">{resource.title}</h3>
            <p className="mt-3 text-sm text-stone-500">{resource.audience}</p>
            <p className="mt-8 text-xs uppercase tracking-[0.28em] text-stone-400">{resource.minutes}</p>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
