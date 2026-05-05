"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, BookOpenText, Globe2, LibraryBig, Plus, Search, Sparkles, UserRound, X } from "lucide-react";
import type { ComponentType } from "react";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { encodeResourceAudience } from "@/lib/resource-audience";
import { createClient as createBrowserClient } from "@/lib/supabase-browser";
import type { Client, Resource } from "@/lib/types";

const storageKey = "aurelian-trainer-resources";

type DraftResource = {
  title: string;
  description: string;
  type: string;
  url: string;
  content: string;
  tags: string;
  audience: Resource["audience"];
  assignedClientId: string;
  estimatedTime: string;
};

type ResourceAudienceFilter = "all" | "global" | "personal";

const emptyDraft: DraftResource = {
  title: "",
  description: "",
  type: "Guide",
  url: "",
  content: "",
  tags: "",
  audience: "all",
  assignedClientId: "",
  estimatedTime: "5 min read",
};

function splitTags(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function TrainerResourcesManager({
  initialResources,
  clients,
  mode,
}: {
  initialResources: Resource[];
  clients: Client[];
  mode: "demo" | "supabase";
}) {
  const [resources, setResources] = useState(initialResources);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DraftResource>(emptyDraft);
  const [query, setQuery] = useState("");
  const [activeAudience, setActiveAudience] = useState<ResourceAudienceFilter>("all");

  useEffect(() => {
    if (mode !== "demo") return;

    const stored = window.localStorage.getItem(storageKey);
    if (!stored) return;

    const timeout = window.setTimeout(() => {
      try {
        setResources(JSON.parse(stored) as Resource[]);
      } catch {
        window.localStorage.removeItem(storageKey);
      }
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [mode]);

  const libraryStats = useMemo(() => {
    const personalCount = resources.filter((resource) => resource.audience === "personal").length;
    const types = new Set(resources.map((resource) => resource.type).filter(Boolean)).size;
    return {
      total: resources.length,
      global: resources.length - personalCount,
      personal: personalCount,
      types,
    };
  }, [resources]);

  const visibleResources = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return resources.filter((resource) => {
      const searchable = [
        resource.title,
        resource.description,
        resource.content,
        resource.type,
        resource.estimatedTime,
        ...resource.tags,
        ...resource.assignedClientNames,
      ]
        .join(" ")
        .toLowerCase();
      const matchesQuery = !normalizedQuery || searchable.includes(normalizedQuery);
      const matchesAudience =
        activeAudience === "all" ||
        (activeAudience === "global" && resource.audience === "all") ||
        resource.audience === activeAudience;

      return matchesQuery && matchesAudience;
    });
  }, [activeAudience, query, resources]);

  function persist(nextResources: Resource[]) {
    if (mode === "demo") {
      window.localStorage.setItem(storageKey, JSON.stringify(nextResources));
    }
  }

  async function createResource() {
    if (!draft.title.trim()) return;

    const assignedClient = clients.find((client) => client.id === draft.assignedClientId);
    const nextResourceBase = {
      title: draft.title.trim(),
      description: draft.description.trim(),
      type: draft.type.trim() || "Guide",
      url: draft.url.trim(),
      content: draft.content.trim(),
      tags: splitTags(draft.tags),
      audience: draft.audience,
      assignedClientIds: assignedClient ? [assignedClient.id] : [],
      assignedClientNames: assignedClient ? [assignedClient.name] : [],
      estimatedTime: draft.estimatedTime.trim() || "Read when needed",
      updatedAt: new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
    } satisfies Omit<Resource, "id">;

    let nextResource: Resource;

    if (mode === "supabase") {
      const supabase = createBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: trainer } = await supabase
        .from("trainers")
        .select("id")
        .eq("profile_id", user.id)
        .maybeSingle<{ id: string }>();
      if (!trainer?.id) return;

      const { data: inserted, error } = await supabase
        .from("resources")
        .insert({
          trainer_id: trainer.id,
          title: nextResourceBase.title,
          description: nextResourceBase.description,
          resource_type: nextResourceBase.type,
          url: nextResourceBase.url,
          content: nextResourceBase.content,
          tags: nextResourceBase.tags,
          audience: encodeResourceAudience(draft.audience, assignedClient?.id),
        })
        .select("id")
        .single<{ id: string }>();

      if (error || !inserted?.id) return;

      nextResource = {
        id: inserted.id,
        ...nextResourceBase,
      };
    } else {
      nextResource = {
        id: `resource-${Date.now()}`,
        ...nextResourceBase,
      };
    }

    const nextResources = [nextResource, ...resources];
    setResources(nextResources);
    persist(nextResources);
    setDraft(emptyDraft);
    setOpen(false);
  }

  return (
    <>
      <Card className="mb-5 overflow-hidden p-0">
        <div className="border-b border-border bg-white/35 p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-[0.66rem] uppercase tracking-[0.3em] text-bronze-600">Resource workspace</p>
              <h2 className="mt-2 font-serif text-3xl font-semibold leading-tight text-charcoal-950 sm:text-4xl">
                Coaching references clients can revisit between sessions.
              </h2>
              <p className="mt-3 text-sm leading-6 text-stone-600">
                Create evergreen resources for all clients or assign focused guidance to one person when it supports a specific plan, limitation, or habit.
              </p>
            </div>
            <Button variant="warm" onClick={() => setOpen(true)}>
              <Plus className="size-4" />
              Create resource
            </Button>
          </div>
        </div>

        <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4 sm:p-6">
          <ResourceMetric icon={LibraryBig} label="Resources" value={String(libraryStats.total)} detail="Saved references" tone="text-charcoal-950" />
          <ResourceMetric icon={Search} label="Current view" value={String(visibleResources.length)} detail="Matching filters" tone="text-sage-700" />
          <ResourceMetric icon={Globe2} label="Global" value={String(libraryStats.global)} detail="All clients" tone="text-bronze-500" />
          <ResourceMetric icon={UserRound} label="Personal" value={String(libraryStats.personal)} detail={`${libraryStats.types} resource types`} tone="text-stone-600" />
        </div>

        <div className="border-t border-border bg-stone-50/45 p-5 sm:p-6">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search resources, tags, clients..."
                className="pl-11"
              />
            </div>
            <div className="no-scrollbar flex max-w-full gap-2 overflow-x-auto py-1">
              {[
                { label: "All", value: "all" },
                { label: "Global", value: "global" },
                { label: "Personal", value: "personal" },
              ].map((filter) => {
                const value = filter.value as ResourceAudienceFilter;

                return (
                  <button
                    key={filter.label}
                    type="button"
                    onClick={() => setActiveAudience(value)}
                  >
                    <Badge variant={activeAudience === value ? "dark" : "default"}>{filter.label}</Badge>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      {visibleResources.length > 0 ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {visibleResources.map((resource, index) => (
            <motion.div
              key={resource.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index * 0.035, 0.2) }}
            >
              <Link key={resource.id} href={`/trainer/resources/${resource.id}`} className="block">
                <Card className="h-full p-5 transition hover:-translate-y-1 hover:bg-white/90 sm:p-6">
                  <div className="flex items-center justify-between gap-3">
                    <Badge variant="bronze">{resource.type}</Badge>
                    <Badge variant={resource.audience === "all" ? "sage" : "default"}>
                      {resource.audience === "all" ? "Global" : "Personal"}
                    </Badge>
                  </div>
                  <h3 className="mt-5 text-xl font-semibold text-charcoal-950">{resource.title}</h3>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-stone-600">{resource.description || resource.content}</p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {resource.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="rounded-full bg-stone-100 px-3 py-1 text-xs text-stone-600">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="mt-6 flex items-center justify-between text-sm text-stone-500">
                    <span>
                      {resource.audience === "all"
                        ? "All clients"
                        : resource.assignedClientNames.join(", ") || "Assigned client"}
                    </span>
                    <span>{resource.estimatedTime}</span>
                  </div>
                  <div className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-bronze-700">
                    Open details
                    <ArrowRight className="size-4" />
                  </div>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      ) : (
        <Card className="p-8 text-center">
          <p className="font-serif text-3xl font-semibold">No resources match that view.</p>
          <p className="mt-2 text-sm text-stone-500">Try a broader search or create the coaching reference you need.</p>
          <Button className="mt-5" variant="warm" onClick={() => setOpen(true)}>
            <Plus className="size-4" />
            Create resource
          </Button>
        </Card>
      )}

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-charcoal-950/35 backdrop-blur-sm" />
          <Dialog.Content asChild>
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100vw-1.5rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[2rem] border border-white/70 bg-ivory-50 p-5 shadow-soft outline-none sm:p-7"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Dialog.Title className="font-serif text-4xl font-semibold text-charcoal-950">Create resource</Dialog.Title>
                  <Dialog.Description className="mt-2 text-sm leading-6 text-stone-600">
                    Add a detailed coaching asset and choose whether it belongs to everyone or one client.
                  </Dialog.Description>
                </div>
                <Dialog.Close asChild>
                  <Button variant="ghost" size="icon" aria-label="Close modal">
                    <X className="size-5" />
                  </Button>
                </Dialog.Close>
              </div>

              <div className="mt-6 grid gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Resource title" />
                  <Input value={draft.type} onChange={(event) => setDraft((current) => ({ ...current, type: event.target.value }))} placeholder="Type" />
                </div>
                <Textarea value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} placeholder="Short description" />
                <Textarea value={draft.content} onChange={(event) => setDraft((current) => ({ ...current, content: event.target.value }))} placeholder="Detailed guidance or notes" />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input value={draft.url} onChange={(event) => setDraft((current) => ({ ...current, url: event.target.value }))} placeholder="External link (optional)" />
                  <Input value={draft.estimatedTime} onChange={(event) => setDraft((current) => ({ ...current, estimatedTime: event.target.value }))} placeholder="Estimated time" />
                </div>
                <Input value={draft.tags} onChange={(event) => setDraft((current) => ({ ...current, tags: event.target.value }))} placeholder="Tags separated by commas" />
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2 text-sm font-medium text-charcoal-950">
                    Audience
                    <select
                      value={draft.audience}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          audience: event.target.value as Resource["audience"],
                          assignedClientId: event.target.value === "all" ? "" : current.assignedClientId,
                        }))
                      }
                      className="h-11 rounded-2xl border border-stone-200 bg-white/80 px-4 text-sm shadow-inner-soft transition focus-visible:border-bronze-300 focus-visible:ring-4 focus-visible:ring-bronze-100"
                    >
                      <option value="all">All clients</option>
                      <option value="personal">Specific client</option>
                    </select>
                  </label>
                  <label className="grid gap-2 text-sm font-medium text-charcoal-950">
                    Assigned client
                    <select
                      value={draft.assignedClientId}
                      onChange={(event) => setDraft((current) => ({ ...current, assignedClientId: event.target.value }))}
                      disabled={draft.audience !== "personal"}
                      className="h-11 rounded-2xl border border-stone-200 bg-white/80 px-4 text-sm shadow-inner-soft transition focus-visible:border-bronze-300 focus-visible:ring-4 focus-visible:ring-bronze-100 disabled:opacity-50"
                    >
                      <option value="">Select client</option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Dialog.Close asChild>
                  <Button variant="secondary">Cancel</Button>
                </Dialog.Close>
                <Button variant="warm" onClick={() => void createResource()}>
                  Create resource
                </Button>
              </div>
            </motion.div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

function ResourceMetric({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  detail: string;
  tone: string;
}) {
  return (
    <div className="min-w-0 rounded-[1.25rem] border border-stone-200/80 bg-white/72 p-4 shadow-inner-soft">
      <div className="flex items-center justify-between gap-3">
        <p className="truncate text-[0.65rem] uppercase tracking-[0.2em] text-stone-400">{label}</p>
        <Icon className={`size-4 shrink-0 ${tone}`} />
      </div>
      <p className="mt-4 font-serif text-3xl font-semibold leading-none text-charcoal-950">{value}</p>
      <p className="mt-2 truncate text-xs text-stone-500">{detail}</p>
    </div>
  );
}

export function ClientResourcesGrid({
  resources,
}: {
  resources: Resource[];
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="min-h-[260px] overflow-hidden border-charcoal-950 bg-charcoal-950 p-7 text-ivory-50">
          <Badge variant="bronze">Support library</Badge>
          <h2 className="mt-5 max-w-2xl font-serif text-4xl font-semibold leading-tight">
            Clear support between sessions.
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-ivory-50/65">
            These resources are here so you can revisit key guidance without digging through messages.
          </p>
        </Card>
        <div className="grid gap-5 md:grid-cols-3 xl:grid-cols-1">
          {[
            { label: "Available", value: String(resources.length), icon: LibraryBig, tone: "text-bronze-500" },
            { label: "Guides", value: String(resources.filter((resource) => resource.type.toLowerCase() !== "video").length), icon: BookOpenText, tone: "text-sage-700" },
            { label: "Assigned", value: String(resources.filter((resource) => resource.audience === "personal").length), icon: Sparkles, tone: "text-charcoal-950" },
          ].map(({ label, value, icon: Icon, tone }) => (
            <Card key={label} className="p-5">
              <Icon className={`size-5 ${tone}`} />
              <p className="mt-6 text-[0.66rem] uppercase tracking-[0.28em] text-stone-500">{label}</p>
              <p className="mt-2 font-serif text-4xl font-semibold text-charcoal-950">{value}</p>
            </Card>
          ))}
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {resources.map((resource) => (
          <Link key={resource.id} href={`/client/resources/${resource.id}`} className="block">
            <Card className="h-full p-5 sm:p-6 transition hover:-translate-y-1 hover:bg-white/90">
              <div className="flex items-center justify-between gap-3">
                <Badge variant="bronze">{resource.type}</Badge>
                {resource.audience === "personal" ? <Badge variant="sage">Assigned for you</Badge> : null}
              </div>
              <h3 className="mt-5 text-xl font-semibold text-charcoal-950">{resource.title}</h3>
              <p className="mt-3 line-clamp-3 text-sm leading-6 text-stone-600">{resource.description || resource.content}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {resource.tags.slice(0, 3).map((tag) => (
                  <span key={tag} className="rounded-full bg-stone-100 px-3 py-1 text-xs text-stone-600">
                    {tag}
                  </span>
                ))}
              </div>
              <div className="mt-6 flex items-center justify-between text-sm text-stone-500">
                <span>{resource.estimatedTime}</span>
                <span>{resource.audience === "personal" ? "Assigned for you" : "Available anytime"}</span>
              </div>
              <div className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-bronze-700">
                Open details
                <ArrowRight className="size-4" />
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
