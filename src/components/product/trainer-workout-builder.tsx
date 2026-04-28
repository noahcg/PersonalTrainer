"use client";

import { Dumbbell, Layers3, ListChecks, Plus, Save, Search, TimerReset, Undo2, X } from "lucide-react";
import type { ComponentType } from "react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { createClient as createBrowserClient } from "@/lib/supabase-browser";
import type { Exercise, Plan, Workout, WorkoutBlock, WorkoutExercise } from "@/lib/types";

type DraftWorkout = {
  id: string | null;
  trainingPlanId: string;
  name: string;
  dayLabel: string;
  warmup: string;
  cooldown: string;
  coachNotes: string;
  blocks: WorkoutBlock[];
};

function createEmptyBlock(id = "draft-block-1"): WorkoutBlock {
  return {
    id,
    label: "New block",
    intent: "",
    exercises: [],
  };
}

function toDraft(workout?: Workout): DraftWorkout {
  if (!workout) {
    return {
      id: null,
      trainingPlanId: "",
      name: "",
      dayLabel: "",
      warmup: "",
      cooldown: "",
      coachNotes: "",
      blocks: [createEmptyBlock()],
    };
  }

  return {
    id: workout.id,
    trainingPlanId: workout.trainingPlanId ?? "",
    name: workout.name,
    dayLabel: workout.dayLabel,
    warmup: workout.warmup,
    cooldown: workout.cooldown,
    coachNotes: workout.coachNotes,
    blocks: workout.blocks.length ? workout.blocks : [createEmptyBlock()],
  };
}

function createExerciseItem(exercise: Exercise, suffix: number): WorkoutExercise {
  return {
    id: `draft-${exercise.id}-${suffix}`,
    exerciseId: exercise.id,
    name: exercise.name,
    sets: 3,
    reps: "8",
    tempo: "2-1-1",
    rest: "90s",
    rpe: "7",
    load: "",
    notes: "",
  };
}

function getCategoryLabel(category: string) {
  if (category === "Free Weights (Barbell & Dumbbell Focus)") return "Free Weights";
  if (category === "Bodyweight (Beginner-Friendly)") return "Bodyweight";
  if (category === "Gym (Machines & Weights)") return "Gym";
  if (category === "Calisthenics (Progression-Based Bodyweight)") return "Calisthenics";
  if (category === "Cardio / Conditioning") return "Conditioning";
  return category;
}

export function TrainerWorkoutBuilder({
  initialWorkouts,
  exercises,
  plans,
  mode,
}: {
  initialWorkouts: Workout[];
  exercises: Exercise[];
  plans: Array<Pick<Plan, "id" | "title">>;
  mode: "demo" | "supabase";
}) {
  const [workouts, setWorkouts] = useState(initialWorkouts);
  const [activeWorkoutId, setActiveWorkoutId] = useState<string | null>(initialWorkouts[0]?.id ?? null);
  const [previousWorkoutId, setPreviousWorkoutId] = useState<string | null>(initialWorkouts[0]?.id ?? null);
  const [draft, setDraft] = useState<DraftWorkout>(toDraft(initialWorkouts[0]));
  const [activeBlockId, setActiveBlockId] = useState<string | null>(draft.blocks[0]?.id ?? null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [exerciseQuery, setExerciseQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  const exerciseCategories = useMemo(
    () => ["All", ...Array.from(new Set(exercises.map((exercise) => exercise.category))).sort()],
    [exercises],
  );

  const filteredExercises = useMemo(() => {
    const normalizedQuery = exerciseQuery.trim().toLowerCase();

    return exercises.filter((exercise) => {
      const matchesCategory = activeCategory === "All" || exercise.category === activeCategory;
      const searchable = [
        exercise.name,
        exercise.category,
        exercise.pattern,
        exercise.difficulty,
        ...exercise.muscleGroups,
        ...exercise.equipment,
      ]
        .join(" ")
        .toLowerCase();

      return matchesCategory && (!normalizedQuery || searchable.includes(normalizedQuery));
    });
  }, [activeCategory, exerciseQuery, exercises]);

  const builderSummary = useMemo(
    () => ({
      workouts: workouts.length,
      exercises: exercises.length,
      plans: plans.length,
      blocks: draft.blocks.length,
      prescribedExercises: draft.blocks.reduce((total, block) => total + block.exercises.length, 0),
    }),
    [draft.blocks, exercises.length, plans.length, workouts.length],
  );

  function selectWorkout(workout: Workout) {
    setActiveWorkoutId(workout.id);
    setPreviousWorkoutId(workout.id);
    const nextDraft = toDraft(workout);
    setDraft(nextDraft);
    setActiveBlockId(nextDraft.blocks[0]?.id ?? null);
  }

  function startNewWorkout() {
    setPreviousWorkoutId(activeWorkoutId);
    const nextDraft = toDraft();
    setActiveWorkoutId(null);
    setDraft(nextDraft);
    setActiveBlockId(nextDraft.blocks[0]?.id ?? null);
    setMessage("New workout draft ready.");
    window.setTimeout(() => setMessage(null), 1800);
  }

  function cancelNewWorkout() {
    const fallbackWorkout =
      workouts.find((workout) => workout.id === previousWorkoutId) ??
      workouts[0] ??
      null;

    if (!fallbackWorkout) {
      const nextDraft = toDraft();
      setActiveWorkoutId(null);
      setDraft(nextDraft);
      setActiveBlockId(nextDraft.blocks[0]?.id ?? null);
      setMessage("New workout draft cleared.");
      window.setTimeout(() => setMessage(null), 1800);
      return;
    }

    selectWorkout(fallbackWorkout);
    setMessage("New workout draft canceled.");
    window.setTimeout(() => setMessage(null), 1800);
  }

  function setBlock(blockId: string, updater: (block: WorkoutBlock) => WorkoutBlock) {
    setDraft((current) => ({
      ...current,
      blocks: current.blocks.map((block) => (block.id === blockId ? updater(block) : block)),
    }));
  }

  function addBlock() {
    const block = createEmptyBlock(`draft-block-${draft.blocks.length + 1}`);
    setDraft((current) => ({ ...current, blocks: [...current.blocks, block] }));
    setActiveBlockId(block.id);
  }

  function addExercise(exercise: Exercise) {
    const targetBlockId = activeBlockId ?? draft.blocks[0]?.id;
    if (!targetBlockId) return;
    setBlock(targetBlockId, (block) => ({
      ...block,
      exercises: [...block.exercises, createExerciseItem(exercise, block.exercises.length + 1)],
    }));
  }

  function removeExercise(blockId: string, exerciseId: string) {
    setBlock(blockId, (block) => ({
      ...block,
      exercises: block.exercises.filter((exercise) => exercise.id !== exerciseId),
    }));
  }

  async function saveWorkout() {
    if (!draft.name.trim()) return;
    setBusy(true);
    setMessage(null);
    try {
      let nextWorkoutId = draft.id;

      if (mode === "supabase") {
        const supabase = createBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("You need an authenticated trainer session to save workouts.");

        const { data: trainer } = await supabase
          .from("trainers")
          .select("id")
          .eq("profile_id", user.id)
          .maybeSingle<{ id: string }>();
        if (!trainer?.id) throw new Error("Trainer profile not found.");

        const payload = {
          trainer_id: trainer.id,
          training_plan_id: draft.trainingPlanId || null,
          name: draft.name.trim(),
          phase_label: draft.dayLabel.trim(),
          warmup: draft.warmup.trim(),
          cooldown: draft.cooldown.trim(),
          coach_notes: draft.coachNotes.trim(),
        };

        if (draft.id) {
          const { error } = await supabase.from("workouts").update(payload).eq("id", draft.id);
          if (error) throw error;

          const { data: existingBlocks } = await supabase.from("workout_blocks").select("id").eq("workout_id", draft.id);
          const existingBlockIds = (existingBlocks ?? []).map((block: { id: string }) => block.id);
          if (existingBlockIds.length) {
            await supabase.from("workout_exercises").delete().in("workout_block_id", existingBlockIds);
            await supabase.from("workout_blocks").delete().eq("workout_id", draft.id);
          }
          nextWorkoutId = draft.id;
        } else {
          const { data: inserted, error } = await supabase.from("workouts").insert(payload).select("id").single<{ id: string }>();
          if (error || !inserted?.id) throw error ?? new Error("Unable to create workout.");
          nextWorkoutId = inserted.id;
        }

        for (const [blockIndex, block] of draft.blocks.entries()) {
          const { data: insertedBlock, error: blockError } = await supabase
            .from("workout_blocks")
            .insert({
              workout_id: nextWorkoutId,
              label: block.label,
              intent: block.intent,
              position: blockIndex,
            })
            .select("id")
            .single<{ id: string }>();

          if (blockError || !insertedBlock?.id) throw blockError ?? new Error("Unable to save workout block.");

          if (block.exercises.length) {
            const { error: itemError } = await supabase.from("workout_exercises").insert(
              block.exercises.map((exercise, index) => ({
                workout_block_id: insertedBlock.id,
                exercise_id: exercise.exerciseId,
                position: index,
                sets: exercise.sets,
                reps: exercise.reps,
                tempo: exercise.tempo,
                rest_time: exercise.rest,
                rpe_target: exercise.rpe,
                load_guidance: exercise.load,
                duration: exercise.duration ?? null,
                notes: exercise.notes,
              })),
            );
            if (itemError) throw itemError;
          }
        }
      } else {
        nextWorkoutId = draft.id ?? `workout-${workouts.length + 1}`;
      }

      const savedWorkout: Workout = {
        id: nextWorkoutId!,
        name: draft.name,
        dayLabel: draft.dayLabel,
        duration: "45 min",
        warmup: draft.warmup,
        cooldown: draft.cooldown,
        coachNotes: draft.coachNotes,
        blocks: draft.blocks,
      };

      const nextWorkouts = draft.id
        ? workouts.map((workout) => (workout.id === draft.id ? savedWorkout : workout))
        : [savedWorkout, ...workouts];
      setWorkouts(nextWorkouts);
      setActiveWorkoutId(savedWorkout.id);
      setDraft((current) => ({ ...current, id: savedWorkout.id }));
      setMessage("Workout saved.");
      window.setTimeout(() => setMessage(null), 2200);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save workout.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Card className="mb-5 overflow-hidden p-0">
        <div className="border-b border-border bg-white/35 p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-[0.66rem] uppercase tracking-[0.3em] text-bronze-600">Builder workspace</p>
              <h2 className="mt-2 font-serif text-3xl font-semibold leading-tight text-charcoal-950 sm:text-4xl">Session composition in one working surface.</h2>
              <p className="mt-3 text-sm leading-6 text-stone-600">
                Choose a workout, edit its structure, add movements to the selected block, then save the complete session.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              {!draft.id && (draft.name || draft.dayLabel || draft.warmup || draft.cooldown || draft.coachNotes || draft.blocks.some((block) => block.intent || block.exercises.length)) ? (
                <Button variant="ghost" onClick={cancelNewWorkout}>
                  <Undo2 className="size-4" />
                  Cancel draft
                </Button>
              ) : !draft.id && activeWorkoutId === null ? (
                <Button variant="ghost" onClick={cancelNewWorkout}>
                  <Undo2 className="size-4" />
                  Cancel draft
                </Button>
              ) : null}
              <Button
                variant="secondary"
                onClick={startNewWorkout}
              >
                <Plus className="size-4" />
                New workout
              </Button>
              <Button variant="warm" onClick={saveWorkout} disabled={busy || !draft.name.trim()}>
                <Save className="size-4" />
                {busy ? "Saving..." : "Save workout"}
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-5 sm:p-6">
          <BuilderMetric icon={Layers3} label="Workouts" value={String(builderSummary.workouts)} detail="Saved sessions" tone="text-charcoal-950" />
          <BuilderMetric icon={ListChecks} label="Exercise options" value={String(builderSummary.exercises)} detail="Library movements" tone="text-sage-700" />
          <BuilderMetric icon={TimerReset} label="Linked plans" value={String(builderSummary.plans)} detail="Plan options" tone="text-bronze-500" />
          <BuilderMetric icon={Dumbbell} label="Blocks" value={String(builderSummary.blocks)} detail="Current workout" tone="text-stone-600" />
          <BuilderMetric icon={Save} label="Prescribed" value={String(builderSummary.prescribedExercises)} detail="Current exercises" tone="text-bronze-500" />
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="lg:sticky lg:top-5 lg:max-h-[calc(100vh-2.5rem)] lg:overflow-hidden">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>Workout library</CardTitle>
                <p className="mt-1 text-sm text-stone-500">{workouts.length} saved sessions</p>
              </div>
              <Badge>{exercises.length} exercises</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 lg:max-h-[calc(100vh-9rem)] lg:overflow-y-auto lg:pr-3">
            {!activeWorkoutId ? (
              <div className="rounded-[1.35rem] border border-bronze-300 bg-bronze-50 px-4 py-4 text-left">
                <p className="font-semibold text-charcoal-950">New workout draft</p>
                <p className="mt-1 text-sm text-stone-600">Fill in the builder, then save to add it to the library.</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-stone-500">
                  <span className="rounded-full bg-white/80 px-2.5 py-1">{draft.blocks.length} blocks</span>
                  <span className="rounded-full bg-white/80 px-2.5 py-1">
                    {draft.blocks.reduce((total, block) => total + block.exercises.length, 0)} exercises
                  </span>
                </div>
              </div>
            ) : null}
            {workouts.length ? (
              workouts.map((workout) => (
                <button
                  key={workout.id}
                  type="button"
                  onClick={() => selectWorkout(workout)}
                  className={`w-full rounded-[1.35rem] border px-4 py-4 text-left transition ${
                    activeWorkoutId === workout.id ? "border-bronze-300 bg-bronze-50" : "border-stone-200 bg-white/80 hover:bg-stone-50"
                  }`}
                >
                  <p className="font-semibold text-charcoal-950">{workout.name}</p>
                  <p className="mt-1 text-sm text-stone-500">{workout.dayLabel}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-stone-500">
                    <span className="rounded-full bg-white/80 px-2.5 py-1">{workout.blocks.length} blocks</span>
                    <span className="rounded-full bg-white/80 px-2.5 py-1">
                      {workout.blocks.reduce((total, block) => total + block.exercises.length, 0)} exercises
                    </span>
                  </div>
                </button>
              ))
            ) : (
              <div className="rounded-[1.35rem] bg-stone-50/86 p-4 text-sm leading-6 text-stone-500">
                No workouts yet. Start with a new workout, add movements, and save it to the library.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-[0.66rem] uppercase tracking-[0.28em] text-bronze-600">
                  {draft.id ? "Editing workout" : "New workout"}
                </p>
                <CardTitle className="mt-2">{draft.name || (draft.id ? "Untitled workout" : "New workout draft")}</CardTitle>
              </div>
              <Badge variant={activeBlockId ? "bronze" : "default"}>
                {activeBlockId ? "Block selected" : "Select a block"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 rounded-[1.5rem] bg-stone-50/82 p-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-charcoal-950">
                Workout name
                <Input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Upper strength day" />
              </label>
              <label className="grid gap-2 text-sm font-medium text-charcoal-950">
                Phase or day label
                <Input value={draft.dayLabel} onChange={(event) => setDraft((current) => ({ ...current, dayLabel: event.target.value }))} placeholder="Week 1 / Day 1" />
              </label>
              <label className="grid gap-2 text-sm font-medium text-charcoal-950 md:col-span-2">
                Linked plan
                <select
                  value={draft.trainingPlanId}
                  onChange={(event) => setDraft((current) => ({ ...current, trainingPlanId: event.target.value }))}
                  className="h-11 w-full rounded-2xl border border-stone-200 bg-white/80 px-4 text-sm shadow-inner-soft transition focus-visible:border-bronze-300 focus-visible:ring-4 focus-visible:ring-bronze-100"
                >
                  <option value="">Unassigned workout</option>
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-medium text-charcoal-950 md:col-span-2">
                Warm-up
                <Textarea value={draft.warmup} onChange={(event) => setDraft((current) => ({ ...current, warmup: event.target.value }))} placeholder="Warm-up" />
              </label>
            </div>

            <div className="rounded-[1.5rem] border border-stone-200 bg-white/72 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-semibold text-charcoal-950">Add exercises</p>
                  <p className="mt-1 text-sm text-stone-500">Exercises are added to the currently selected block.</p>
                </div>
                {activeBlockId ? <Badge variant="bronze">Targeting selected block</Badge> : <Badge>Select a block first</Badge>}
              </div>
              <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
                  <Input
                    value={exerciseQuery}
                    onChange={(event) => setExerciseQuery(event.target.value)}
                    placeholder="Search exercises, equipment, patterns..."
                    className="pl-10"
                  />
                </div>
                <div className="no-scrollbar flex max-w-full gap-2 overflow-x-auto py-1 lg:max-w-[360px]">
                  {exerciseCategories.map((category) => (
                    <button key={category} type="button" onClick={() => setActiveCategory(category)}>
                      <Badge variant={category === activeCategory ? "dark" : "default"}>{getCategoryLabel(category)}</Badge>
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-4 grid max-h-72 gap-2 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-3">
                {filteredExercises.map((exercise) => (
                  <button
                    key={exercise.id}
                    type="button"
                    onClick={() => addExercise(exercise)}
                    className="rounded-[1.15rem] border border-stone-200 bg-stone-50/86 px-3 py-3 text-left transition hover:bg-white"
                  >
                    <span className="block truncate text-sm font-semibold text-charcoal-950">{exercise.name}</span>
                    <span className="mt-1 block truncate text-xs text-stone-500">{exercise.pattern} · {exercise.equipment.join(", ")}</span>
                  </button>
                ))}
                {!filteredExercises.length ? (
                  <div className="rounded-[1.15rem] bg-stone-50/86 px-3 py-4 text-sm text-stone-500 sm:col-span-2 xl:col-span-3">
                    No exercises match that view.
                  </div>
                ) : null}
              </div>
            </div>

            {draft.blocks.map((block) => (
              <div key={block.id} className="rounded-[1.5rem] border border-stone-200 bg-stone-50/86 p-4">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="grid flex-1 gap-3 sm:grid-cols-[0.8fr_1.2fr]">
                    <label className="grid gap-2 text-sm font-medium text-charcoal-950">
                      Block label
                      <Input value={block.label} onChange={(event) => setBlock(block.id, (current) => ({ ...current, label: event.target.value }))} />
                    </label>
                    <label className="grid gap-2 text-sm font-medium text-charcoal-950">
                      Intent
                      <Input value={block.intent} onChange={(event) => setBlock(block.id, (current) => ({ ...current, intent: event.target.value }))} placeholder="Block intent" />
                    </label>
                  </div>
                  <Button variant={activeBlockId === block.id ? "warm" : "secondary"} size="sm" onClick={() => setActiveBlockId(block.id)}>
                    Target
                  </Button>
                </div>
                <div className="space-y-3">
                  {block.exercises.length ? (
                    block.exercises.map((exercise) => (
                      <div key={exercise.id} className="rounded-[1.35rem] bg-white/90 p-4">
                        <div className="mb-4 flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold">{exercise.name}</p>
                            <p className="mt-1 text-xs text-stone-500">Prescription and notes</p>
                          </div>
                          <Button variant="ghost" size="icon" aria-label={`Remove ${exercise.name}`} onClick={() => removeExercise(block.id, exercise.id)}>
                            <X className="size-4" />
                          </Button>
                        </div>
                        <div className="grid gap-3 md:grid-cols-5">
                          <MiniField label="Sets">
                            <Input value={String(exercise.sets)} onChange={(event) => setBlock(block.id, (current) => ({ ...current, exercises: current.exercises.map((item) => item.id === exercise.id ? { ...item, sets: Number(event.target.value) || 0 } : item) }))} />
                          </MiniField>
                          <MiniField label="Reps">
                            <Input value={exercise.reps} onChange={(event) => setBlock(block.id, (current) => ({ ...current, exercises: current.exercises.map((item) => item.id === exercise.id ? { ...item, reps: event.target.value } : item) }))} />
                          </MiniField>
                          <MiniField label="Tempo">
                            <Input value={exercise.tempo} onChange={(event) => setBlock(block.id, (current) => ({ ...current, exercises: current.exercises.map((item) => item.id === exercise.id ? { ...item, tempo: event.target.value } : item) }))} />
                          </MiniField>
                          <MiniField label="Rest">
                            <Input value={exercise.rest} onChange={(event) => setBlock(block.id, (current) => ({ ...current, exercises: current.exercises.map((item) => item.id === exercise.id ? { ...item, rest: event.target.value } : item) }))} />
                          </MiniField>
                          <MiniField label="RPE">
                            <Input value={exercise.rpe} onChange={(event) => setBlock(block.id, (current) => ({ ...current, exercises: current.exercises.map((item) => item.id === exercise.id ? { ...item, rpe: event.target.value } : item) }))} />
                          </MiniField>
                        </div>
                        <Textarea
                          className="mt-3 min-h-20"
                          value={exercise.notes}
                          onChange={(event) =>
                            setBlock(block.id, (current) => ({
                              ...current,
                              exercises: current.exercises.map((item) =>
                                item.id === exercise.id ? { ...item, notes: event.target.value } : item,
                              ),
                            }))
                          }
                          placeholder="Notes"
                        />
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[1.35rem] border border-dashed border-stone-200 bg-white/70 p-4 text-sm text-stone-500">
                      Select this block, then add exercises from the panel above.
                    </div>
                  )}
                </div>
              </div>
            ))}
            <Button variant="secondary" onClick={addBlock}>
              <Plus className="size-4" />
              Add block
            </Button>
            <div className="grid gap-4 rounded-[1.5rem] bg-stone-50/82 p-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-charcoal-950">
                Cooldown
                <Textarea value={draft.cooldown} onChange={(event) => setDraft((current) => ({ ...current, cooldown: event.target.value }))} placeholder="Cooldown" />
              </label>
              <label className="grid gap-2 text-sm font-medium text-charcoal-950">
                Coach notes
                <Textarea value={draft.coachNotes} onChange={(event) => setDraft((current) => ({ ...current, coachNotes: event.target.value }))} placeholder="Coach notes" />
              </label>
            </div>
            <Button className="w-full sm:w-auto" variant="warm" onClick={saveWorkout} disabled={busy || !draft.name.trim()}>
              <Save className="size-4" />
              {busy ? "Saving..." : "Save workout"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {message ? (
        <div className="fixed bottom-24 right-3 z-40 rounded-full bg-charcoal-950 px-4 py-3 text-sm text-ivory-50 shadow-soft lg:right-6">
          {message}
        </div>
      ) : null}
    </>
  );
}

function MiniField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
      {label}
      {children}
    </label>
  );
}

function BuilderMetric({
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
