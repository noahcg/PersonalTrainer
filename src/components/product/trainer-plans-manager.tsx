"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { motion } from "motion/react";
import { Copy, PencilLine, Save, Send, Users, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { createClient as createBrowserClient } from "@/lib/supabase-browser";
import type { Client, Plan } from "@/lib/types";

const storageKey = "aurelian-demo-plans";

type DraftPlan = {
  title: string;
  description: string;
  durationWeeks: string;
  goal: string;
  weeklyStructure: string;
  notes: string;
  template: boolean;
};

const emptyDraft: DraftPlan = {
  title: "",
  description: "",
  durationWeeks: "12",
  goal: "",
  weeklyStructure: "",
  notes: "",
  template: true,
};

export function TrainerPlansManager({
  initialPlans,
  mode,
  clients,
}: {
  initialPlans: Plan[];
  mode: "demo" | "supabase";
  clients: Client[];
}) {
  const [plans, setPlans] = useState(initialPlans);
  const [open, setOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [assigningPlanId, setAssigningPlanId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftPlan>(emptyDraft);
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== "demo") return;
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) return;

    const timeout = window.setTimeout(() => {
      try {
        setPlans(JSON.parse(stored) as Plan[]);
      } catch {
        window.localStorage.removeItem(storageKey);
      }
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [mode]);

  function persist(nextPlans: Plan[]) {
    if (mode === "demo") {
      window.localStorage.setItem(storageKey, JSON.stringify(nextPlans));
    }
  }

  function resetDraft() {
    setDraft(emptyDraft);
    setEditingId(null);
  }

  function populateDraft(plan: Plan) {
    setDraft({
      title: plan.title,
      description: plan.description,
      durationWeeks: plan.duration.replace(/\D/g, "") || "12",
      goal: plan.goal,
      weeklyStructure: plan.weeklyStructure,
      notes: plan.notes,
      template: plan.template,
    });
  }

  async function getTrainerContext() {
    const supabase = createBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error("You need an authenticated trainer session to manage plans.");

    const { data: trainer } = await supabase
      .from("trainers")
      .select("id")
      .eq("profile_id", user.id)
      .maybeSingle<{ id: string }>();

    if (!trainer?.id) throw new Error("Trainer profile not found.");
    return { supabase, trainerId: trainer.id };
  }

  async function savePlan() {
    if (!draft.title.trim()) return;

    setBusy(true);
    setMessage(null);
    try {
      let nextPlans = plans;

      if (mode === "supabase") {
        const { supabase, trainerId } = await getTrainerContext();
        const payload = {
          trainer_id: trainerId,
          title: draft.title.trim(),
          description: draft.description.trim(),
          duration_weeks: Number(draft.durationWeeks) || null,
          goal: draft.goal.trim(),
          weekly_structure: draft.weeklyStructure.trim(),
          notes: draft.notes.trim(),
          is_template: draft.template,
          status: "active",
        };

        if (editingId) {
          const { error } = await supabase.from("training_plans").update(payload).eq("id", editingId);
          if (error) throw error;
          nextPlans = plans.map((plan) =>
            plan.id === editingId
              ? {
                  ...plan,
                  title: payload.title,
                  description: payload.description,
                  duration: payload.duration_weeks ? `${payload.duration_weeks} weeks` : "Custom duration",
                  goal: payload.goal,
                  weeklyStructure: payload.weekly_structure,
                  notes: payload.notes,
                  template: payload.is_template,
                }
              : plan,
          );
        } else {
          const { data: inserted, error } = await supabase
            .from("training_plans")
            .insert(payload)
            .select("id")
            .single<{ id: string }>();
          if (error || !inserted?.id) throw error ?? new Error("Unable to create plan.");
          nextPlans = [
            {
              id: inserted.id,
              title: payload.title,
              description: payload.description,
              duration: payload.duration_weeks ? `${payload.duration_weeks} weeks` : "Custom duration",
              goal: payload.goal,
              weeklyStructure: payload.weekly_structure,
              notes: payload.notes,
              template: payload.is_template,
              assignedClients: [],
              workouts: [],
            },
            ...plans,
          ];
        }
      } else {
        if (editingId) {
          nextPlans = plans.map((plan) =>
            plan.id === editingId
              ? {
                  ...plan,
                  title: draft.title.trim(),
                  description: draft.description.trim(),
                  duration: `${Number(draft.durationWeeks) || 12} weeks`,
                  goal: draft.goal.trim(),
                  weeklyStructure: draft.weeklyStructure.trim(),
                  notes: draft.notes.trim(),
                  template: draft.template,
                }
              : plan,
          );
        } else {
          nextPlans = [
            {
              id: `plan-${Date.now()}`,
              title: draft.title.trim(),
              description: draft.description.trim(),
              duration: `${Number(draft.durationWeeks) || 12} weeks`,
              goal: draft.goal.trim(),
              weeklyStructure: draft.weeklyStructure.trim(),
              notes: draft.notes.trim(),
              template: draft.template,
              assignedClients: [],
              workouts: [],
            },
            ...plans,
          ];
        }
      }

      setPlans(nextPlans);
      persist(nextPlans);
      setOpen(false);
      resetDraft();
      setMessage(editingId ? "Plan updated." : "Plan created.");
      window.setTimeout(() => setMessage(null), 2200);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save plan.");
    } finally {
      setBusy(false);
    }
  }

  async function duplicatePlan(plan: Plan) {
    setBusy(true);
    setMessage(null);
    try {
      let nextPlans = plans;
      if (mode === "supabase") {
        const { supabase, trainerId } = await getTrainerContext();
        const payload = {
          trainer_id: trainerId,
          title: `${plan.title} Copy`,
          description: plan.description,
          duration_weeks: Number(plan.duration.replace(/\D/g, "")) || null,
          goal: plan.goal,
          weekly_structure: plan.weeklyStructure,
          notes: plan.notes,
          is_template: plan.template,
          status: "active",
        };
        const { data: inserted, error } = await supabase
          .from("training_plans")
          .insert(payload)
          .select("id")
          .single<{ id: string }>();
        if (error || !inserted?.id) throw error ?? new Error("Unable to duplicate plan.");

        nextPlans = [
          {
            ...plan,
            id: inserted.id,
            title: payload.title,
            assignedClients: [],
            workouts: [],
          },
          ...plans,
        ];
      } else {
        const duplicateId = `${plan.id}-copy-${plans.filter((item) => item.title.startsWith(plan.title)).length + 1}`;
        nextPlans = [
          {
            ...plan,
            id: duplicateId,
            title: `${plan.title} Copy`,
            assignedClients: [],
          },
          ...plans,
        ];
      }

      setPlans(nextPlans);
      persist(nextPlans);
      setMessage("Plan duplicated.");
      window.setTimeout(() => setMessage(null), 2200);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to duplicate plan.");
    } finally {
      setBusy(false);
    }
  }

  async function assignPlan() {
    if (!assigningPlanId || !selectedClientIds.length) return;

    setBusy(true);
    setMessage(null);
    try {
      let nextPlans = plans;
      if (mode === "supabase") {
        const { supabase } = await getTrainerContext();
        const today = new Date().toISOString().slice(0, 10);
        await Promise.all(
          selectedClientIds.map(async (clientId) => {
            await supabase
              .from("plan_assignments")
              .update({ status: "inactive", ends_on: today })
              .eq("client_id", clientId)
              .eq("training_plan_id", assigningPlanId)
              .eq("status", "active");

            const { error } = await supabase.from("plan_assignments").insert({
              training_plan_id: assigningPlanId,
              client_id: clientId,
              starts_on: today,
              status: "active",
            });
            if (error) throw error;
          }),
        );
      }

      nextPlans = plans.map((plan) =>
        plan.id === assigningPlanId
          ? { ...plan, assignedClients: Array.from(new Set([...plan.assignedClients, ...selectedClientIds])) }
          : plan,
      );
      setPlans(nextPlans);
      persist(nextPlans);
      setAssignOpen(false);
      setSelectedClientIds([]);
      setAssigningPlanId(null);
      setMessage("Plan assigned.");
      window.setTimeout(() => setMessage(null), 2200);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to assign plan.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Card className="mb-5 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[0.66rem] uppercase tracking-[0.3em] text-bronze-600">Plan controls</p>
            <p className="mt-2 text-sm leading-6 text-stone-600">Create, duplicate, and assign polished training cycles while keeping the plan library easy to trust and easy to scan.</p>
          </div>
          <div className="flex gap-3 text-sm text-stone-500">
            <div className="rounded-full bg-stone-50 px-4 py-2">{plans.length} plans</div>
            <div className="rounded-full bg-stone-50 px-4 py-2">{plans.filter((plan) => plan.template).length} templates</div>
          </div>
        </div>
      </Card>

      <div className="mb-5 flex gap-3">
        <Button
          variant="warm"
          onClick={() => {
            resetDraft();
            setOpen(true);
          }}
        >
          Create plan from scratch
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            setDraft({
              ...emptyDraft,
              title: "New reusable template",
              template: true,
            });
            setEditingId(null);
            setOpen(true);
          }}
        >
          Save current as template
        </Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {plans.map((plan) => (
          <Card key={plan.id} className="overflow-hidden">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Badge variant="bronze">{plan.duration}</Badge>
                  <CardTitle className="mt-4 font-serif text-4xl">{plan.title}</CardTitle>
                </div>
                {plan.template && <Badge variant="sage">Template</Badge>}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-7 text-stone-600">{plan.description}</p>
              <div className="mt-5 grid gap-3 rounded-[1.5rem] bg-stone-50/88 p-5">
                <p><span className="font-semibold">Goal:</span> {plan.goal || "Not specified"}</p>
                <p><span className="font-semibold">Weekly structure:</span> {plan.weeklyStructure || "Not specified"}</p>
                <p><span className="font-semibold">Notes:</span> {plan.notes || "No notes yet."}</p>
              </div>
              <div className="mt-5 text-sm text-stone-500">
                {plan.assignedClients.length} active assignment{plan.assignedClients.length === 1 ? "" : "s"}
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button variant="secondary" onClick={() => duplicatePlan(plan)} disabled={busy}>
                  <Copy className="size-4" /> Duplicate
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    populateDraft(plan);
                    setEditingId(plan.id);
                    setOpen(true);
                  }}
                  disabled={busy}
                >
                  <PencilLine className="size-4" /> Edit
                </Button>
                <Button
                  variant="warm"
                  onClick={() => {
                    setAssigningPlanId(plan.id);
                    setSelectedClientIds(plan.assignedClients);
                    setAssignOpen(true);
                  }}
                  disabled={busy}
                >
                  <Send className="size-4" /> Assign to clients
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-charcoal-950/35 backdrop-blur-sm" />
          <Dialog.Content asChild>
            <ModalShell
              title={editingId ? "Edit plan" : "Create plan"}
              description="Shape the training journey clients see across the app."
            >
              <div className="grid gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Title">
                    <Input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} />
                  </Field>
                  <Field label="Duration in weeks">
                    <Input value={draft.durationWeeks} onChange={(event) => setDraft((current) => ({ ...current, durationWeeks: event.target.value }))} />
                  </Field>
                </div>
                <Field label="Description">
                  <Textarea value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} />
                </Field>
                <Field label="Goal">
                  <Input value={draft.goal} onChange={(event) => setDraft((current) => ({ ...current, goal: event.target.value }))} />
                </Field>
                <Field label="Weekly structure">
                  <Textarea value={draft.weeklyStructure} onChange={(event) => setDraft((current) => ({ ...current, weeklyStructure: event.target.value }))} />
                </Field>
                <Field label="Notes">
                  <Textarea value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} />
                </Field>
              </div>
              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Dialog.Close asChild>
                  <Button variant="secondary">Cancel</Button>
                </Dialog.Close>
                <Button variant="warm" onClick={savePlan} disabled={busy}>
                  <Save className="size-4" />
                  {busy ? "Saving..." : editingId ? "Save plan" : "Create plan"}
                </Button>
              </div>
            </ModalShell>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={assignOpen} onOpenChange={setAssignOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-charcoal-950/35 backdrop-blur-sm" />
          <Dialog.Content asChild>
            <ModalShell title="Assign plan" description="Select the clients who should receive this plan.">
              <div className="space-y-3">
                {clients.map((client) => {
                  const selected = selectedClientIds.includes(client.id);
                  return (
                    <button
                      key={client.id}
                      type="button"
                      onClick={() =>
                        setSelectedClientIds((current) =>
                          selected ? current.filter((id) => id !== client.id) : [...current, client.id],
                        )
                      }
                      className={`flex w-full items-center justify-between rounded-[1.35rem] border px-4 py-4 text-left transition ${
                        selected ? "border-bronze-300 bg-bronze-50" : "border-stone-200 bg-white/80"
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <span className="grid size-10 place-items-center rounded-full bg-stone-100 text-stone-600">
                          <Users className="size-4" />
                        </span>
                        <span>
                          <span className="block font-semibold text-charcoal-950">{client.name}</span>
                          <span className="text-sm text-stone-500">{client.status.replace("_", " ")}</span>
                        </span>
                      </span>
                      {selected ? <Badge variant="bronze">Selected</Badge> : null}
                    </button>
                  );
                })}
              </div>
              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Dialog.Close asChild>
                  <Button variant="secondary">Cancel</Button>
                </Dialog.Close>
                <Button variant="warm" onClick={assignPlan} disabled={busy || selectedClientIds.length === 0}>
                  <Send className="size-4" />
                  {busy ? "Assigning..." : "Assign plan"}
                </Button>
              </div>
            </ModalShell>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {message ? (
        <div className="fixed bottom-24 right-3 z-40 rounded-full bg-charcoal-950 px-4 py-3 text-sm text-ivory-50 shadow-soft lg:right-6">
          {message}
        </div>
      ) : null}
    </>
  );
}

function ModalShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.98 }}
      className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100vw-1.5rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[2rem] border border-white/70 bg-ivory-50 p-5 shadow-soft outline-none sm:p-7"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <Dialog.Title className="font-serif text-4xl font-semibold text-charcoal-950">{title}</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm leading-6 text-stone-600">{description}</Dialog.Description>
        </div>
        <Dialog.Close asChild>
          <Button variant="ghost" size="icon" aria-label="Close modal">
            <X className="size-5" />
          </Button>
        </Dialog.Close>
      </div>
      <div className="mt-6">{children}</div>
    </motion.div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2 text-sm font-medium text-charcoal-950">
      {label}
      {children}
    </label>
  );
}
