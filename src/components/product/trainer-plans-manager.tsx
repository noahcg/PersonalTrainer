"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { CalendarDays, Copy, Dumbbell, PencilLine, Plus, Save, Send, Users, X, type LucideIcon } from "lucide-react";
import { HTMLAttributes, forwardRef, useEffect, useMemo, useState } from "react";
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
  const [activePlanId, setActivePlanId] = useState<string | null>(initialPlans[0]?.id ?? null);
  const [draft, setDraft] = useState<DraftPlan>(emptyDraft);
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const activePlan = useMemo(
    () => plans.find((plan) => plan.id === activePlanId) ?? plans[0] ?? null,
    [activePlanId, plans],
  );

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
      if (!editingId) {
        setActivePlanId(nextPlans[0]?.id ?? null);
      }
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
      setActivePlanId(nextPlans[0]?.id ?? activePlanId);
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

      nextPlans = plans.map((plan) => ({
        ...plan,
        assignedClients:
          plan.id === assigningPlanId
            ? Array.from(new Set([...plan.assignedClients.filter((id) => !selectedClientIds.includes(id)), ...selectedClientIds]))
            : plan.assignedClients.filter((id) => !selectedClientIds.includes(id)),
      }));
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
      <Card className="mb-5 p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[0.66rem] uppercase tracking-[0.3em] text-bronze-600">Plan workspace</p>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">Select a plan, review the structure, edit the training cycle, then assign it to clients when it is ready.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              variant="warm"
              onClick={() => {
                resetDraft();
                setOpen(true);
              }}
            >
              <Plus className="size-4" />
              New plan
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
              Save template
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="lg:sticky lg:top-5 lg:max-h-[calc(100vh-2.5rem)] lg:overflow-hidden">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>Plan library</CardTitle>
                <p className="mt-1 text-sm text-stone-500">{plans.length} plans · {plans.filter((plan) => plan.template).length} templates</p>
              </div>
              <Badge>{clients.length} clients</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 lg:max-h-[calc(100vh-9rem)] lg:overflow-y-auto lg:pr-3">
            {plans.length ? (
              plans.map((plan) => (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => setActivePlanId(plan.id)}
                  className={`w-full rounded-[1.35rem] border px-4 py-4 text-left transition ${
                    activePlan?.id === plan.id ? "border-bronze-300 bg-bronze-50" : "border-stone-200 bg-white/80 hover:bg-stone-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-charcoal-950">{plan.title}</p>
                      <p className="mt-1 text-sm text-stone-500">{plan.duration}</p>
                    </div>
                    {plan.template ? <Badge variant="sage">Template</Badge> : null}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-stone-500">
                    <span className="rounded-full bg-white/80 px-2.5 py-1">{plan.workouts.length} workouts</span>
                    <span className="rounded-full bg-white/80 px-2.5 py-1">{plan.assignedClients.length} assigned</span>
                  </div>
                </button>
              ))
            ) : (
              <div className="rounded-[1.35rem] bg-stone-50/86 p-4 text-sm leading-6 text-stone-500">
                No plans yet. Create a plan to start building reusable training cycles.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          {activePlan ? (
            <>
            <CardHeader>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="bronze">{activePlan.duration}</Badge>
                    {activePlan.template ? <Badge variant="sage">Template</Badge> : null}
                  </div>
                  <CardTitle className="mt-4 font-serif text-4xl">{activePlan.title}</CardTitle>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-600">{activePlan.description || "No description has been added yet."}</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button variant="secondary" onClick={() => duplicatePlan(activePlan)} disabled={busy}>
                    <Copy className="size-4" /> Duplicate
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      populateDraft(activePlan);
                      setEditingId(activePlan.id);
                      setOpen(true);
                    }}
                    disabled={busy}
                  >
                    <PencilLine className="size-4" /> Edit
                  </Button>
                  <Button
                    variant="warm"
                    onClick={() => {
                      setAssigningPlanId(activePlan.id);
                      setSelectedClientIds(activePlan.assignedClients);
                      setAssignOpen(true);
                    }}
                    disabled={busy}
                  >
                    <Send className="size-4" /> Assign
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-3">
                <PlanMetric icon={CalendarDays} label="Duration" value={activePlan.duration} />
                <PlanMetric icon={Dumbbell} label="Workouts" value={String(activePlan.workouts.length)} />
                <PlanMetric icon={Users} label="Assigned" value={String(activePlan.assignedClients.length)} />
              </div>
              <div className="grid gap-4 rounded-[1.5rem] bg-stone-50/88 p-5">
                <PlanText label="Goal" value={activePlan.goal} />
                <PlanText label="Weekly structure" value={activePlan.weeklyStructure} />
                <PlanText label="Notes" value={activePlan.notes} />
              </div>
              <div>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-charcoal-950">Included workouts</p>
                  <Badge>{activePlan.workouts.length} total</Badge>
                </div>
                <div className="space-y-3">
                  {activePlan.workouts.length ? (
                    activePlan.workouts.map((workout) => (
                      <div key={workout.id} className="rounded-[1.35rem] border border-stone-200 bg-white/80 p-4">
                        <p className="font-semibold text-charcoal-950">{workout.name}</p>
                        <p className="mt-1 text-sm text-stone-500">{workout.dayLabel}</p>
                        <p className="mt-3 text-sm leading-6 text-stone-600">{workout.coachNotes || "No coach notes added."}</p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[1.35rem] border border-dashed border-stone-200 bg-white/70 p-4 text-sm leading-6 text-stone-500">
                      No workouts are linked to this plan yet. Link workouts from the Workout Builder.
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
            </>
          ) : (
            <CardContent className="p-8 text-center">
              <p className="font-serif text-3xl font-semibold">No plan selected.</p>
              <p className="mt-2 text-sm text-stone-500">Create or select a plan to review its structure.</p>
            </CardContent>
          )}
        </Card>
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

const ModalShell = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement> & {
    title: string;
    description: string;
    children: React.ReactNode;
  }
>(function ModalShell({ title, description, children, ...props }, ref) {
  return (
    <div
      ref={ref}
      className="fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100vh-2rem)] w-[calc(100vw-1.5rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[2rem] border border-white/70 bg-ivory-50 p-5 shadow-soft outline-none sm:p-7"
      {...props}
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
      <div className="mt-6 overflow-y-auto pr-1">{children}</div>
    </div>
  );
});

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2 text-sm font-medium text-charcoal-950">
      {label}
      {children}
    </label>
  );
}

function PlanMetric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-[1.35rem] bg-stone-50/88 p-4">
      <Icon className="size-5 text-bronze-600" />
      <p className="mt-4 text-[0.66rem] uppercase tracking-[0.24em] text-stone-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-charcoal-950">{value}</p>
    </div>
  );
}

function PlanText({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[0.66rem] uppercase tracking-[0.24em] text-stone-500">{label}</p>
      <p className="mt-2 text-sm leading-7 text-stone-700">{value || "Not specified"}</p>
    </div>
  );
}
