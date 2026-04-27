"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, BookOpenText, Globe2, LibraryBig, Sparkles, UserRound, X } from "lucide-react";
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
    return {
      total: resources.length,
      global: resources.length - personalCount,
      personal: personalCount,
    };
  }, [resources]);

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
      <div className="space-y-5">
        <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          <Card className="min-h-[260px] p-7">
            <Badge variant="bronze">Resource library</Badge>
            <h2 className="mt-5 max-w-2xl font-serif text-4xl font-semibold leading-tight text-charcoal-950">
              Build a support library clients can actually use between sessions.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-stone-600">
              Make resources feel like real coaching assets: clear summaries, detailed guidance, direct links, and a defined audience for who should see them.
            </p>
          </Card>
          <div className="grid gap-5 md:grid-cols-3 xl:grid-cols-1">
            {[
              { label: "Resources", value: String(libraryStats.total), icon: LibraryBig },
              { label: "Global", value: String(libraryStats.global), icon: Globe2 },
              { label: "Personal", value: String(libraryStats.personal), icon: UserRound },
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
          <div className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[0.66rem] uppercase tracking-[0.3em] text-bronze-600">Resource workspace</p>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
                Create evergreen resources for all clients or assign a focused resource to one person when it supports a specific plan, limitation, or habit.
              </p>
            </div>
            <Button variant="warm" onClick={() => setOpen(true)}>
              Create resource
            </Button>
          </div>

          <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {resources.map((resource) => (
              <Link key={resource.id} href={`/trainer/resources/${resource.id}`} className="block">
                <Card className="h-full p-5 sm:p-6 transition hover:-translate-y-1 hover:bg-white/90">
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
            ))}
          </div>
        </Card>
      </div>

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
