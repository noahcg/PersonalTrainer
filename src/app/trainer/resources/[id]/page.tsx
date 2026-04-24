import Link from "next/link";
import { ArrowLeft, ExternalLink, Globe2, UserRound } from "lucide-react";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getTrainerResourceById } from "@/lib/resources";

export default async function TrainerResourceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const resource = await getTrainerResourceById(id);

  if (!resource) {
    notFound();
  }

  return (
    <AppShell
      role="trainer"
      title={resource.title}
      subtitle="Resource details, audience, and full coaching content."
    >
      <div className="space-y-5">
        <Link href="/trainer/resources" className="inline-flex items-center gap-2 text-sm font-medium text-stone-600 transition hover:text-charcoal-950">
          <ArrowLeft className="size-4" />
          Back to resources
        </Link>

        <Card className="p-7">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="bronze">{resource.type}</Badge>
            <Badge variant={resource.audience === "all" ? "sage" : "default"}>
              {resource.audience === "all" ? "Global resource" : "Personal resource"}
            </Badge>
          </div>
          <h2 className="mt-5 font-serif text-4xl font-semibold text-charcoal-950">{resource.title}</h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-stone-600">{resource.description}</p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-[1.5rem] bg-stone-50 p-5">
              <Globe2 className="size-5 text-bronze-500" />
              <p className="mt-4 text-[0.66rem] uppercase tracking-[0.28em] text-stone-500">Audience</p>
              <p className="mt-2 text-sm font-semibold text-charcoal-950">
                {resource.audience === "all" ? "All clients" : resource.assignedClientNames.join(", ") || "Assigned client"}
              </p>
            </div>
            <div className="rounded-[1.5rem] bg-stone-50 p-5">
              <UserRound className="size-5 text-sage-700" />
              <p className="mt-4 text-[0.66rem] uppercase tracking-[0.28em] text-stone-500">Estimated time</p>
              <p className="mt-2 text-sm font-semibold text-charcoal-950">{resource.estimatedTime}</p>
            </div>
            <div className="rounded-[1.5rem] bg-stone-50 p-5">
              <p className="text-[0.66rem] uppercase tracking-[0.28em] text-stone-500">Updated</p>
              <p className="mt-2 text-sm font-semibold text-charcoal-950">{resource.updatedAt}</p>
            </div>
          </div>
        </Card>

        <Card className="p-7">
          <p className="text-[0.66rem] uppercase tracking-[0.28em] text-bronze-600">Full content</p>
          <div className="mt-5 space-y-5">
            <p className="text-sm leading-7 text-stone-700">{resource.content || "No long-form notes have been added yet."}</p>
            {resource.tags.length ? (
              <div className="flex flex-wrap gap-2">
                {resource.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-stone-100 px-3 py-1 text-xs text-stone-600">
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
            {resource.url ? (
              <Link href={resource.url} className="inline-flex items-center gap-2 font-medium text-bronze-700">
                Open attached link
                <ExternalLink className="size-4" />
              </Link>
            ) : null}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
