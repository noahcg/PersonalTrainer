"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { resources as initialResources } from "@/lib/demo-data";

const storageKey = "aurelian-trainer-resources";

type Resource = (typeof initialResources)[number];

export function TrainerResourcesManager() {
  const [resources, setResources] = useState<Resource[]>(initialResources);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Resource>({ title: "", type: "Guide", audience: "", minutes: "" });

  useEffect(() => {
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
  }, []);

  function createResource() {
    if (!draft.title.trim()) return;
    const next = [draft, ...resources];
    setResources(next);
    window.localStorage.setItem(storageKey, JSON.stringify(next));
    setDraft({ title: "", type: "Guide", audience: "", minutes: "" });
    setOpen(false);
  }

  return (
    <AppShell role="trainer" title="Coaching resources" subtitle="Curate helpful guides, videos, reminders, and education clients can revisit between sessions.">
      <div className="mb-5"><Button variant="warm" onClick={() => setOpen(true)}>Create resource</Button></div>
      <div className="grid gap-5 md:grid-cols-3">
        {resources.map((resource) => (
          <Card key={`${resource.title}-${resource.minutes}`} className="p-6">
            <Badge variant="bronze">{resource.type}</Badge>
            <h3 className="mt-5 text-xl font-semibold">{resource.title}</h3>
            <p className="mt-3 text-sm text-stone-500">{resource.audience}</p>
            <p className="mt-8 text-xs uppercase tracking-[0.28em] text-stone-400">{resource.minutes}</p>
          </Card>
        ))}
      </div>

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-charcoal-950/35 backdrop-blur-sm" />
          <Dialog.Content asChild>
            <motion.div initial={{ opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-1.5rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-[2rem] border border-white/70 bg-ivory-50 p-6 shadow-soft">
              <Dialog.Title className="font-serif text-4xl font-semibold text-charcoal-950">Create resource</Dialog.Title>
              <div className="mt-5 grid gap-4">
                <Input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Resource title" />
                <Input value={draft.type} onChange={(event) => setDraft((current) => ({ ...current, type: event.target.value }))} placeholder="Type" />
                <Input value={draft.audience} onChange={(event) => setDraft((current) => ({ ...current, audience: event.target.value }))} placeholder="Audience" />
                <Input value={draft.minutes} onChange={(event) => setDraft((current) => ({ ...current, minutes: event.target.value }))} placeholder="Estimated time" />
              </div>
              <div className="mt-5 flex justify-end gap-3">
                <Dialog.Close asChild><Button variant="secondary">Cancel</Button></Dialog.Close>
                <Button variant="warm" onClick={createResource}>Create</Button>
              </div>
            </motion.div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </AppShell>
  );
}
