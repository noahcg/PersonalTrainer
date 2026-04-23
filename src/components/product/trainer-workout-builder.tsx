"use client";

import { Plus, Save } from "lucide-react";
import { useState } from "react";
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
    trainingPlanId: "",
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
  const [draft, setDraft] = useState<DraftWorkout>(toDraft(initialWorkouts[0]));
  const [activeBlockId, setActiveBlockId] = useState<string | null>(draft.blocks[0]?.id ?? null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const filteredExercises = exercises;

  function selectWorkout(workout: Workout) {
    setActiveWorkoutId(workout.id);
    const nextDraft = toDraft(workout);
    setDraft(nextDraft);
    setActiveBlockId(nextDraft.blocks[0]?.id ?? null);
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
      <div className="grid gap-5 xl:grid-cols-[320px_1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Workouts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              className="w-full"
              variant="warm"
              onClick={() => {
                const nextDraft = toDraft();
                setActiveWorkoutId(null);
                setDraft(nextDraft);
                setActiveBlockId(nextDraft.blocks[0]?.id ?? null);
              }}
            >
              <Plus className="size-4" />
              New workout
            </Button>
            {workouts.map((workout) => (
              <button
                key={workout.id}
                type="button"
                onClick={() => selectWorkout(workout)}
                className={`w-full rounded-[1.5rem] border px-4 py-4 text-left transition ${
                  activeWorkoutId === workout.id ? "border-bronze-300 bg-bronze-50" : "border-stone-200 bg-white/75"
                }`}
              >
                <p className="font-semibold">{workout.name}</p>
                <p className="mt-1 text-sm text-stone-500">{workout.dayLabel}</p>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{draft.id ? "Edit workout" : "Create workout"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Workout name" />
              <Input value={draft.dayLabel} onChange={(event) => setDraft((current) => ({ ...current, dayLabel: event.target.value }))} placeholder="Phase / day label" />
            </div>
            <select
              value={draft.trainingPlanId}
              onChange={(event) => setDraft((current) => ({ ...current, trainingPlanId: event.target.value }))}
              className="h-11 w-full rounded-2xl border border-stone-200 bg-white/80 px-4 text-sm shadow-inner-soft outline-none transition focus:border-bronze-300 focus:ring-4 focus:ring-bronze-100"
            >
              <option value="">Unassigned workout</option>
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.title}
                </option>
              ))}
            </select>
            <Textarea value={draft.warmup} onChange={(event) => setDraft((current) => ({ ...current, warmup: event.target.value }))} placeholder="Warm-up" />
            {draft.blocks.map((block) => (
              <div key={block.id} className="rounded-[1.75rem] border border-stone-200 bg-stone-50/80 p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex-1 space-y-3">
                    <Input value={block.label} onChange={(event) => setBlock(block.id, (current) => ({ ...current, label: event.target.value }))} />
                    <Input value={block.intent} onChange={(event) => setBlock(block.id, (current) => ({ ...current, intent: event.target.value }))} placeholder="Block intent" />
                  </div>
                  <Button variant={activeBlockId === block.id ? "warm" : "secondary"} size="sm" onClick={() => setActiveBlockId(block.id)}>
                    Target
                  </Button>
                </div>
                <div className="space-y-3">
                  {block.exercises.map((exercise) => (
                    <div key={exercise.id} className="grid gap-3 rounded-[1.5rem] bg-white/80 p-4 md:grid-cols-[1.2fr_repeat(5,90px)] md:items-start">
                      <div className="space-y-2">
                        <p className="font-semibold">{exercise.name}</p>
                        <Textarea
                          className="min-h-20"
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
                      <Input value={String(exercise.sets)} onChange={(event) => setBlock(block.id, (current) => ({ ...current, exercises: current.exercises.map((item) => item.id === exercise.id ? { ...item, sets: Number(event.target.value) || 0 } : item) }))} />
                      <Input value={exercise.reps} onChange={(event) => setBlock(block.id, (current) => ({ ...current, exercises: current.exercises.map((item) => item.id === exercise.id ? { ...item, reps: event.target.value } : item) }))} />
                      <Input value={exercise.tempo} onChange={(event) => setBlock(block.id, (current) => ({ ...current, exercises: current.exercises.map((item) => item.id === exercise.id ? { ...item, tempo: event.target.value } : item) }))} />
                      <Input value={exercise.rest} onChange={(event) => setBlock(block.id, (current) => ({ ...current, exercises: current.exercises.map((item) => item.id === exercise.id ? { ...item, rest: event.target.value } : item) }))} />
                      <Input value={exercise.rpe} onChange={(event) => setBlock(block.id, (current) => ({ ...current, exercises: current.exercises.map((item) => item.id === exercise.id ? { ...item, rpe: event.target.value } : item) }))} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <Button variant="secondary" onClick={addBlock}>
              <Plus className="size-4" />
              Add block
            </Button>
            <Textarea value={draft.cooldown} onChange={(event) => setDraft((current) => ({ ...current, cooldown: event.target.value }))} placeholder="Cooldown" />
            <Textarea value={draft.coachNotes} onChange={(event) => setDraft((current) => ({ ...current, coachNotes: event.target.value }))} placeholder="Coach notes" />
            <Button variant="warm" onClick={saveWorkout} disabled={busy}>
              <Save className="size-4" />
              {busy ? "Saving..." : "Save workout"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Exercise drawer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeBlockId ? <Badge variant="bronze">Adding to selected block</Badge> : null}
            {filteredExercises.map((exercise) => (
              <div key={exercise.id} className="rounded-2xl bg-stone-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{exercise.name}</p>
                    <p className="text-sm text-stone-500">{exercise.pattern} · {exercise.equipment.join(", ")}</p>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => addExercise(exercise)}>
                    Add
                  </Button>
                </div>
              </div>
            ))}
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
