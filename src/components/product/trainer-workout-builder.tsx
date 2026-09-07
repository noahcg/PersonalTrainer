"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import Image from "next/image";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Dumbbell,
  Flame,
  GripVertical,
  ListChecks,
  MoreHorizontal,
  PencilLine,
  Plus,
  Save,
  Search,
  Sparkles,
  StretchHorizontal,
  Trash2,
} from "lucide-react";
import type { ComponentType, Dispatch, SetStateAction } from "react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { getExercisePrescriptionType, getWorkoutExercisePrescriptionType, prescriptionTypeLabel } from "@/lib/exercise-prescriptions";
import type { Exercise, Workout, WorkoutBlock, WorkoutExercise } from "@/lib/types";
import { cn } from "@/lib/utils";

type WizardStepId = "warm-up" | "section-1" | "section-2" | "section-3" | "cooldown";
type BuilderView = "list" | "builder";

type WizardStep = {
  id: WizardStepId;
  title: string;
  shortTitle: string;
  helper: string;
  intent: string;
  icon: ComponentType<{ className?: string }>;
};

type DraftWorkout = {
  id: string | null;
  name: string;
  duration: string;
  coachNotes: string;
  blocks: WorkoutBlock[];
};

const wizardSteps: WizardStep[] = [
  {
    id: "warm-up",
    title: "Warm Up",
    shortTitle: "Warm Up",
    helper: "Choose movement prep, breathing, mobility, or light activation work.",
    intent: "Prepare the client for the session.",
    icon: Flame,
  },
  {
    id: "section-1",
    title: "Stage 1",
    shortTitle: "Stage 1",
    helper: "Choose the first primary training stage.",
    intent: "Primary training focus.",
    icon: Dumbbell,
  },
  {
    id: "section-2",
    title: "Stage 2",
    shortTitle: "Stage 2",
    helper: "Choose the second training stage.",
    intent: "Secondary strength or skill work.",
    icon: ListChecks,
  },
  {
    id: "section-3",
    title: "Stage 3",
    shortTitle: "Stage 3",
    helper: "Choose the final training stage.",
    intent: "Accessory, conditioning, or core emphasis.",
    icon: Sparkles,
  },
  {
    id: "cooldown",
    title: "Cooldown",
    shortTitle: "Cooldown",
    helper: "Choose recovery, mobility, breathing, or easy reset work.",
    intent: "Bring the session down and finish cleanly.",
    icon: StretchHorizontal,
  },
];

function emptyExerciseForStep(stepId: WizardStepId): WorkoutBlock {
  const step = wizardSteps.find((item) => item.id === stepId) ?? wizardSteps[0];

  return {
    id: stepId,
    label: step.title,
    intent: step.intent,
    exercises: [],
  };
}

function createTemplateBlocks() {
  return wizardSteps.map((step) => emptyExerciseForStep(step.id));
}

function isStageStep(stepId: WizardStepId) {
  return stepId === "section-1" || stepId === "section-2" || stepId === "section-3";
}

function normalizeBlocks(blocks: WorkoutBlock[]) {
  return wizardSteps.map((step, index) => {
    const matchingBlock =
      blocks.find((block) => block.id === step.id) ??
      blocks.find((block) => block.label.toLowerCase() === step.title.toLowerCase()) ??
      blocks[index] ??
      null;

    return matchingBlock
      ? {
          ...matchingBlock,
          id: step.id,
          label: isStageStep(step.id) ? matchingBlock.label || step.title : step.title,
          intent: matchingBlock.intent || step.intent,
        }
      : emptyExerciseForStep(step.id);
  });
}

function toDraft(workout?: Workout): DraftWorkout {
  if (!workout) {
    return {
      id: null,
      name: "",
      duration: "45-60 min",
      coachNotes: "",
      blocks: createTemplateBlocks(),
    };
  }

  return {
    id: workout.id,
    name: workout.name,
    duration: workout.duration || "45-60 min",
    coachNotes: workout.coachNotes,
    blocks: normalizeBlocks(workout.blocks),
  };
}

function createExerciseItem(exercise: Exercise, suffix: number, stepId: WizardStepId): WorkoutExercise {
  const prescriptionType = getExercisePrescriptionType(exercise);
  const base = {
    id: `draft-${stepId}-${exercise.id}-${Date.now()}-${suffix}`,
    exerciseId: exercise.id,
    name: exercise.name,
    tempo: "",
    notes: "",
    prescriptionType,
  };

  if (prescriptionType === "duration") {
    return { ...base, sets: 0, reps: "", rest: "", rpe: "RPE 5", load: "", duration: "30 min", distance: "" };
  }

  if (prescriptionType === "distance") {
    return { ...base, sets: 0, reps: "", rest: "", rpe: "RPE 5", load: "", duration: "", distance: "2 mi" };
  }

  if (prescriptionType === "intervals") {
    return { ...base, sets: 6, reps: "", rest: "1 min", rpe: "RPE 8", load: "", duration: "1 min", distance: "" };
  }

  return { ...base, sets: 3, reps: "8-10", rest: "90s", rpe: "7", load: "", duration: "", distance: "" };
}

function exerciseScoreForStep(exercise: Exercise, stepId: WizardStepId) {
  const text = [
    exercise.name,
    exercise.category,
    exercise.pattern,
    exercise.difficulty,
    ...exercise.muscleGroups,
    ...exercise.equipment,
    ...exercise.tags,
  ]
    .join(" ")
    .toLowerCase();

  if (stepId === "warm-up") {
    return Number(text.includes("warm")) * 6 + Number(text.includes("mobility")) * 5 + Number(text.includes("core")) * 3 + Number(exercise.difficulty === "Beginner") * 2;
  }

  if (stepId === "cooldown") {
    return Number(text.includes("cool")) * 6 + Number(text.includes("stretch")) * 5 + Number(text.includes("mobility")) * 4 + Number(text.includes("breath")) * 4 + Number(text.includes("recovery")) * 4;
  }

  if (stepId === "section-1") {
    return Number(text.includes("strength")) * 5 + Number(["squat", "hinge", "push", "pull"].some((pattern) => text.includes(pattern))) * 4;
  }

  if (stepId === "section-2") {
    return Number(text.includes("strength")) * 4 + Number(text.includes("upper") || text.includes("lower")) * 3 + Number(text.includes("single")) * 2;
  }

  return Number(text.includes("core")) * 4 + Number(text.includes("conditioning")) * 4 + Number(text.includes("accessory")) * 3 + Number(text.includes("stability")) * 2;
}

function compactCategory(category: string) {
  if (category === "Free Weights (Barbell & Dumbbell Focus)") return "Free Weights";
  if (category === "Bodyweight (Beginner-Friendly)") return "Bodyweight";
  if (category === "Gym (Machines & Weights)") return "Gym";
  if (category === "Calisthenics (Progression-Based Bodyweight)") return "Calisthenics";
  if (category === "Cardio / Conditioning") return "Conditioning";
  return category;
}

function workoutExerciseCount(workout: Workout) {
  return workout.blocks.reduce((sum, block) => sum + block.exercises.length, 0);
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error && typeof error.message === "string") return error.message;
  return "Unable to save workout.";
}

export function TrainerWorkoutBuilder({
  initialWorkouts,
  exercises,
  mode,
}: {
  initialWorkouts: Workout[];
  exercises: Exercise[];
  mode: "demo" | "supabase";
}) {
  const [workouts, setWorkouts] = useState(initialWorkouts);
  const [view, setView] = useState<BuilderView>("list");
  const [draft, setDraft] = useState<DraftWorkout>(() => toDraft());
  const [activeStepId, setActiveStepId] = useState<WizardStepId>("warm-up");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [deletingWorkoutId, setDeletingWorkoutId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const activeStep = wizardSteps.find((step) => step.id === activeStepId) ?? wizardSteps[0];
  const activeStepIndex = wizardSteps.findIndex((step) => step.id === activeStepId);
  const activeBlock = draft.blocks.find((block) => block.id === activeStepId) ?? emptyExerciseForStep(activeStepId);
  const activeStepLabel = activeBlock.label.trim() || activeStep.title;
  const completedSteps = new Set(draft.blocks.filter((block) => block.exercises.length > 0).map((block) => block.id as WizardStepId));
  const isWorkoutComplete = wizardSteps.every((step) => completedSteps.has(step.id)) && !!draft.name.trim();

  const recommendedExercises = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return [...exercises]
      .filter((exercise) => {
        if (!normalizedQuery) return true;
        return [
          exercise.name,
          exercise.category,
          exercise.pattern,
          exercise.difficulty,
          ...exercise.muscleGroups,
          ...exercise.equipment,
          ...exercise.tags,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      })
      .sort((a, b) => exerciseScoreForStep(b, activeStepId) - exerciseScoreForStep(a, activeStepId) || a.name.localeCompare(b.name));
  }, [activeStepId, exercises, query]);

  function startNewWorkout() {
    setDraft(toDraft());
    setActiveStepId("warm-up");
    setQuery("");
    setView("builder");
  }

  function editWorkout(workout: Workout) {
    setDraft(toDraft(workout));
    setActiveStepId("warm-up");
    setQuery("");
    setView("builder");
  }

  function updateBlock(stepId: WizardStepId, updater: (block: WorkoutBlock) => WorkoutBlock) {
    setDraft((current) => ({
      ...current,
      blocks: current.blocks.map((block) => (block.id === stepId ? updater(block) : block)),
    }));
  }

  function addExercise(exercise: Exercise) {
    updateBlock(activeStepId, (block) => ({
      ...block,
      exercises: [...block.exercises, createExerciseItem(exercise, block.exercises.length + 1, activeStepId)],
    }));
  }

  function removeExercise(exerciseId: string) {
    updateBlock(activeStepId, (block) => ({
      ...block,
      exercises: block.exercises.filter((exercise) => exercise.id !== exerciseId),
    }));
  }

  function updateExercise(exerciseId: string, updater: (exercise: WorkoutExercise) => WorkoutExercise) {
    updateBlock(activeStepId, (block) => ({
      ...block,
      exercises: block.exercises.map((exercise) => (exercise.id === exerciseId ? updater(exercise) : exercise)),
    }));
  }

  function canOpenStep(stepId: WizardStepId) {
    const targetIndex = wizardSteps.findIndex((step) => step.id === stepId);
    if (targetIndex <= activeStepIndex) return true;
    return wizardSteps.slice(0, targetIndex).every((step) => completedSteps.has(step.id));
  }

  function goNext() {
    if (!completedSteps.has(activeStepId)) return;
    const nextStep = wizardSteps[activeStepIndex + 1];
    if (nextStep) {
      setActiveStepId(nextStep.id);
      setQuery("");
    }
  }

  async function saveWorkout() {
    if (!isWorkoutComplete) {
      setMessage("Complete every stage and add a workout name before saving.");
      window.setTimeout(() => setMessage(null), 2600);
      return;
    }

    setBusy(true);
    setMessage(null);

    try {
      let nextWorkoutId = draft.id;
      const blocksForSave = draft.blocks.map((block) => {
        const step = wizardSteps.find((item) => item.id === block.id);
        return { ...block, label: block.label.trim() || step?.title || block.label };
      });
      const warmupText = blocksForSave.find((block) => block.id === "warm-up")?.exercises.map((exercise) => exercise.name).join(", ") ?? "";
      const cooldownText = blocksForSave.find((block) => block.id === "cooldown")?.exercises.map((exercise) => exercise.name).join(", ") ?? "";

      if (mode === "supabase") {
        const response = await fetch("/api/trainer/workouts", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            id: draft.id,
            name: draft.name,
            duration: draft.duration,
            coachNotes: draft.coachNotes,
            blocks: blocksForSave,
          }),
        });
        const result = (await response.json()) as { id?: string; error?: string };
        if (!response.ok || !result.id) throw new Error(result.error ?? "Unable to save workout.");
        nextWorkoutId = result.id;
      } else {
        nextWorkoutId = draft.id ?? `workout-${workouts.length + 1}`;
      }

      const savedWorkout: Workout = {
        id: nextWorkoutId!,
        name: draft.name.trim(),
        dayLabel: "Template workout",
        duration: draft.duration,
        warmup: warmupText,
        cooldown: cooldownText,
        coachNotes: draft.coachNotes,
        assignedClientIds: draft.id ? workouts.find((workout) => workout.id === draft.id)?.assignedClientIds ?? [] : [],
        assignedClientNames: draft.id ? workouts.find((workout) => workout.id === draft.id)?.assignedClientNames ?? [] : [],
        assignments: draft.id ? workouts.find((workout) => workout.id === draft.id)?.assignments ?? [] : [],
        assignment: draft.id ? workouts.find((workout) => workout.id === draft.id)?.assignment : undefined,
        blocks: blocksForSave,
      };

      setWorkouts((current) =>
        draft.id ? current.map((workout) => (workout.id === draft.id ? savedWorkout : workout)) : [savedWorkout, ...current],
      );
      setDraft(toDraft());
      setActiveStepId("warm-up");
      setView("list");
      setMessage("Workout saved.");
      window.setTimeout(() => setMessage(null), 2200);
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function deleteWorkout(workout: Workout) {
    const confirmed = window.confirm(`Delete "${workout.name}"? This cannot be undone.`);
    if (!confirmed) return;

    setDeletingWorkoutId(workout.id);
    setMessage(null);

    try {
      if (mode === "supabase") {
        const response = await fetch(`/api/trainer/workouts?id=${encodeURIComponent(workout.id)}`, {
          method: "DELETE",
        });
        const result = (await response.json().catch(() => ({}))) as { error?: string };
        if (!response.ok) throw new Error(result.error ?? "Unable to delete workout.");
      }

      setWorkouts((current) => current.filter((item) => item.id !== workout.id));
      setMessage("Workout deleted.");
      window.setTimeout(() => setMessage(null), 2200);
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setDeletingWorkoutId(null);
    }
  }

  return (
    <div className="space-y-5">
      {view === "list" ? (
        <WorkoutList
          workouts={workouts}
          deletingWorkoutId={deletingWorkoutId}
          onNewWorkout={startNewWorkout}
          onEditWorkout={editWorkout}
          onDeleteWorkout={(workout) => void deleteWorkout(workout)}
        />
      ) : (
        <div className="space-y-5">
          <div className="rounded-[1.25rem] border border-stone-200/80 bg-white/78 p-4 shadow-soft backdrop-blur-xl sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <button type="button" onClick={() => setView("list")} className="inline-flex w-fit items-center gap-2 text-xs font-semibold text-bronze-600">
                <ArrowLeft className="size-3.5" />
                Back to workouts
              </button>
              <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                <Button variant="secondary" size="sm" onClick={() => setView("list")}>Cancel</Button>
                <Button variant="warm" size="sm" onClick={() => void saveWorkout()} disabled={busy || !isWorkoutComplete}>
                  <Save className="size-4" />
                  {busy ? "Saving..." : "Save Workout"}
                </Button>
              </div>
            </div>

            <WorkoutDetailsHeader draft={draft} onDraftChange={setDraft} />

            <div className="no-scrollbar mt-5 flex gap-2 overflow-x-auto md:grid md:grid-cols-5 md:overflow-visible">
              {wizardSteps.map((step, index) => {
                const isActive = step.id === activeStepId;
                const isComplete = completedSteps.has(step.id);
                const isAvailable = canOpenStep(step.id);
                const Icon = step.icon;
                const stepBlock = draft.blocks.find((block) => block.id === step.id);
                const stepLabel = stepBlock?.label.trim() || step.shortTitle;

                return (
                  <button
                    key={step.id}
                    type="button"
                    disabled={!isAvailable}
                    onClick={() => {
                      setActiveStepId(step.id);
                      setQuery("");
                    }}
                    className={cn(
                      "flex min-w-[10.5rem] items-center gap-3 rounded-2xl border px-3 py-3 text-left transition md:min-w-0",
                      isActive && "border-bronze-300 bg-bronze-50",
                      !isActive && isComplete && "border-sage-200 bg-sage-50",
                      !isActive && !isComplete && "border-stone-200 bg-white/72",
                      !isAvailable && "opacity-45",
                    )}
                  >
                    <span className={cn("grid size-8 shrink-0 place-items-center rounded-full", isComplete ? "bg-sage-700 text-white" : isActive ? "bg-charcoal-950 text-white" : "bg-stone-100 text-stone-500")}>
                      {isComplete ? <Check className="size-4" /> : <Icon className="size-4" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-charcoal-950">{stepLabel}</span>
                      <span className="text-xs text-stone-500">Step {index + 1}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(240px,280px)_minmax(0,1fr)]">
            <Card className="flex h-[620px] min-h-0 flex-col overflow-hidden rounded-[1.25rem] bg-white/84 shadow-soft">
                  <div className="p-6 pb-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-bronze-600">Exercise selection</p>
                        <h3 className="mt-2 font-serif text-2xl font-semibold">{activeStepLabel}</h3>
                        <p className="mt-2 text-sm leading-6 text-stone-600">{activeStep.helper}</p>
                      </div>
                    </div>

                    <div className="relative mt-4">
                      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
                      <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${activeStepLabel.toLowerCase()} exercises...`} className="pl-9" />
                    </div>
                    <div className="mt-3 text-xs text-stone-500">{recommendedExercises.length} exercise options</div>
                  </div>

                  <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 pb-10">
                    {recommendedExercises.map((exercise) => (
                      <ExerciseChoice key={exercise.id} exercise={exercise} onAdd={() => addExercise(exercise)} />
                    ))}
                    {!recommendedExercises.length ? (
                      <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50/80 p-4 text-sm text-stone-500">
                        No exercises match this search.
                      </div>
                    ) : null}
                  </div>
            </Card>

            <Card className="h-[620px] overflow-hidden rounded-[1.25rem] bg-white/84 p-6 shadow-soft">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-serif text-2xl font-semibold">{activeStepLabel}</h3>
                      <p className="mt-2 text-sm text-stone-600">
                        {activeBlock.exercises.length
                          ? `${activeBlock.exercises.length} selected. Adjust the prescription inline.`
                          : "Add at least one exercise before moving to the next step."}
                      </p>
                      {isStageStep(activeStepId) ? (
                        <label className="mt-4 grid max-w-md gap-2 text-sm font-semibold text-charcoal-950">
                          Stage name
                          <Input
                            value={activeBlock.label}
                            onBlur={() =>
                              updateBlock(activeStepId, (block) => ({
                                ...block,
                                label: block.label.trim() || activeStep.title,
                              }))
                            }
                            onChange={(event) =>
                              updateBlock(activeStepId, (block) => ({
                                ...block,
                                label: event.target.value,
                              }))
                            }
                            placeholder={activeStep.title}
                          />
                        </label>
                      ) : null}
                    </div>
                    <Button variant="secondary" onClick={goNext} disabled={!completedSteps.has(activeStepId) || activeStepIndex === wizardSteps.length - 1}>
                      Next
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>

                  <div className="mt-4 max-h-[500px] space-y-3 overflow-y-auto pr-1">
                    {activeBlock.exercises.map((exercise, index) => (
                      <SelectedExerciseRow
                        key={exercise.id}
                        index={index}
                        exercise={exercise}
                        source={exercises.find((item) => item.id === exercise.exerciseId)}
                        onUpdate={(updater) => updateExercise(exercise.id, updater)}
                        onRemove={() => removeExercise(exercise.id)}
                      />
                    ))}
                    {!activeBlock.exercises.length ? (
                      <div className="grid min-h-72 place-items-center rounded-2xl border border-dashed border-stone-300 bg-stone-50/60 p-8 text-center">
                        <div>
                          <Dumbbell className="mx-auto size-8 text-stone-400" />
                          <p className="mt-3 font-semibold text-charcoal-950">No exercises selected yet.</p>
                          <p className="mt-2 max-w-sm text-sm leading-6 text-stone-500">Choose from the recommended list on the left to complete this step.</p>
                        </div>
                      </div>
                    ) : null}
                  </div>
            </Card>

          </div>
        </div>
      )}

      {message ? (
        <div className="fixed bottom-24 right-3 z-40 rounded-full bg-charcoal-950 px-4 py-3 text-sm text-ivory-50 shadow-soft lg:right-6">
          {message}
        </div>
      ) : null}
    </div>
  );
}

function WorkoutList({
  workouts,
  deletingWorkoutId,
  onNewWorkout,
  onEditWorkout,
  onDeleteWorkout,
}: {
  workouts: Workout[];
  deletingWorkoutId: string | null;
  onNewWorkout: () => void;
  onEditWorkout: (workout: Workout) => void;
  onDeleteWorkout: (workout: Workout) => void;
}) {
  const [query, setQuery] = useState("");
  const filteredWorkouts = workouts.filter((workout) =>
    [workout.name, workout.dayLabel, workout.coachNotes].join(" ").toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <Card className="overflow-hidden rounded-[1.25rem] bg-white/82 shadow-soft">
      <div className="flex flex-col gap-4 border-b border-stone-200/80 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="font-serif text-3xl font-semibold text-charcoal-950">Workouts</h2>
          <p className="mt-2 text-sm text-stone-600">View saved template workouts or start a new one.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="warm" size="sm" onClick={onNewWorkout}>
            <Plus className="size-4" />
            New Workout
          </Button>
        </div>
      </div>

      <div className="p-5">
        <div className="relative max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search workouts..." className="pl-9" />
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-stone-200 bg-white/92">
          <div className="hidden grid-cols-[minmax(0,1fr)_8rem_8rem_8rem_3rem] gap-4 bg-stone-50 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-400 md:grid">
            <span>Workout</span>
            <span>Template</span>
            <span>Exercises</span>
            <span>Duration</span>
            <span />
          </div>
          {filteredWorkouts.map((workout) => (
            <div
              key={workout.id}
              className="grid w-full gap-3 border-t border-stone-200 px-4 py-4 text-left transition first:border-t-0 hover:bg-stone-50 md:grid-cols-[minmax(0,1fr)_8rem_8rem_8rem_3rem] md:items-center"
            >
              <span>
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-charcoal-950">{workout.name}</span>
                </span>
                <span className="mt-1 line-clamp-1 text-xs text-stone-500">{workout.coachNotes || "No notes yet."}</span>
              </span>
              <span className="text-sm text-stone-600">5 steps</span>
              <span className="text-sm text-stone-600">{workoutExerciseCount(workout)}</span>
              <span className="text-sm text-stone-600">{workout.duration}</span>
              <WorkoutRowActions
                workout={workout}
                deleting={deletingWorkoutId === workout.id}
                onEdit={() => onEditWorkout(workout)}
                onDelete={() => onDeleteWorkout(workout)}
              />
            </div>
          ))}
          {!filteredWorkouts.length ? (
            <div className="grid min-h-60 place-items-center p-8 text-center">
              <div>
                <p className="font-semibold text-charcoal-950">No workouts found.</p>
                <p className="mt-2 text-sm text-stone-500">Create the first template workout to populate this list.</p>
                <Button className="mt-4" variant="warm" onClick={onNewWorkout}>
                  <Plus className="size-4" />
                  New Workout
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

function WorkoutRowActions({
  workout,
  deleting,
  onEdit,
  onDelete,
}: {
  workout: Workout;
  deleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-9 justify-self-start text-stone-500 hover:text-charcoal-950 md:justify-self-center"
          aria-label={`Open actions for ${workout.name}`}
          disabled={deleting}
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 min-w-40 rounded-2xl border border-stone-200 bg-white p-1.5 shadow-soft"
        >
          <DropdownMenu.Item
            onSelect={onEdit}
            className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm text-charcoal-950 outline-none transition hover:bg-stone-50 focus:bg-stone-50"
          >
            <PencilLine className="size-4 text-stone-500" />
            Edit
          </DropdownMenu.Item>
          <DropdownMenu.Item
            onSelect={onDelete}
            className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm text-red-700 outline-none transition hover:bg-red-50 focus:bg-red-50"
          >
            <Trash2 className="size-4" />
            {deleting ? "Deleting..." : "Delete"}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function WorkoutDetailsHeader({
  draft,
  onDraftChange,
}: {
  draft: DraftWorkout;
  onDraftChange: Dispatch<SetStateAction<DraftWorkout>>;
}) {
  return (
    <div className="mt-5 grid gap-3 border-t border-stone-200/80 pt-5 lg:grid-cols-[minmax(0,1.1fr)_10rem_minmax(0,1.4fr)]">
      <Field label="Workout name">
        <Input
          value={draft.name}
          onChange={(event) => onDraftChange((current) => ({ ...current, name: event.target.value }))}
          placeholder="Lower Body Strength"
        />
      </Field>
      <Field label="Duration">
        <Input value={draft.duration} onChange={(event) => onDraftChange((current) => ({ ...current, duration: event.target.value }))} />
      </Field>
      <Field label="Trainer notes">
        <Textarea
          className="min-h-11 resize-none py-3"
          value={draft.coachNotes}
          onChange={(event) => onDraftChange((current) => ({ ...current, coachNotes: event.target.value }))}
          placeholder="Coaching emphasis, load guidance, or client-specific notes."
        />
      </Field>
    </div>
  );
}

function ExerciseChoice({ exercise, onAdd }: { exercise: Exercise; onAdd: () => void }) {
  return (
    <div className="grid grid-cols-[2.75rem_1fr_auto] items-center gap-3 rounded-xl border border-stone-200 bg-white/84 p-2 transition hover:border-bronze-200 hover:bg-bronze-50/35">
      <ExerciseThumb exercise={exercise} />
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <p className="truncate text-sm font-semibold text-charcoal-950">{exercise.name}</p>
        </div>
        <p className="mt-1 truncate text-xs text-stone-500">
          {compactCategory(exercise.category)} <span className="px-1">•</span> {prescriptionTypeLabel(getExercisePrescriptionType(exercise))}
        </p>
      </div>
      <Button variant="secondary" size="icon" className="size-9" aria-label={`Add ${exercise.name}`} onClick={onAdd}>
        <Plus className="size-4" />
      </Button>
    </div>
  );
}

function SelectedExerciseRow({
  index,
  exercise,
  source,
  onUpdate,
  onRemove,
}: {
  index: number;
  exercise: WorkoutExercise;
  source?: Exercise;
  onUpdate: (updater: (exercise: WorkoutExercise) => WorkoutExercise) => void;
  onRemove: () => void;
}) {
  const prescriptionType = getWorkoutExercisePrescriptionType(exercise);
  const summary = workoutPrescriptionSummary(exercise);

  return (
    <div className="grid gap-3 rounded-2xl border border-stone-200 bg-white/88 p-3 shadow-inner-soft transition hover:border-bronze-200 md:grid-cols-[1rem_3rem_1.75rem_minmax(10rem,1fr)_minmax(17rem,auto)_2.5rem] md:items-center">
      <GripVertical className="hidden size-4 text-stone-400 md:block" />
      <ExerciseThumb exercise={source} />
      <span className="grid size-7 place-items-center rounded-full bg-stone-100 text-xs font-semibold text-stone-500">{index + 1}</span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-charcoal-950">{exercise.name}</p>
        <p className="mt-1 text-xs text-stone-500 md:hidden">
          {summary}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:min-w-[17rem]">
        {prescriptionType === "strength" ? (
          <>
            <MiniInput label="Sets" value={String(exercise.sets)} onChange={(value) => onUpdate((current) => ({ ...current, sets: Number(value) || 0 }))} />
            <MiniInput label="Reps" value={exercise.reps} onChange={(value) => onUpdate((current) => ({ ...current, reps: value }))} />
            <MiniInput label="Rest" value={exercise.rest} onChange={(value) => onUpdate((current) => ({ ...current, rest: value }))} />
          </>
        ) : null}
        {prescriptionType === "duration" ? (
          <>
            <MiniInput label="Duration" value={exercise.duration ?? ""} onChange={(value) => onUpdate((current) => ({ ...current, duration: value }))} />
            <MiniInput label="Intensity" value={exercise.rpe} onChange={(value) => onUpdate((current) => ({ ...current, rpe: value }))} />
            <MiniInput label="Pace / resistance" value={exercise.load} onChange={(value) => onUpdate((current) => ({ ...current, load: value }))} />
          </>
        ) : null}
        {prescriptionType === "distance" ? (
          <>
            <MiniInput label="Distance" value={exercise.distance ?? ""} onChange={(value) => onUpdate((current) => ({ ...current, distance: value }))} />
            <MiniInput label="Target pace" value={exercise.load} onChange={(value) => onUpdate((current) => ({ ...current, load: value }))} />
            <MiniInput label="Intensity" value={exercise.rpe} onChange={(value) => onUpdate((current) => ({ ...current, rpe: value }))} />
          </>
        ) : null}
        {prescriptionType === "intervals" ? (
          <>
            <MiniInput label="Rounds" value={String(exercise.sets)} onChange={(value) => onUpdate((current) => ({ ...current, sets: Number(value) || 0 }))} />
            <MiniInput label="Work time" value={exercise.duration ?? ""} onChange={(value) => onUpdate((current) => ({ ...current, duration: value }))} />
            <MiniInput label="Work distance" value={exercise.distance ?? ""} onChange={(value) => onUpdate((current) => ({ ...current, distance: value }))} />
            <MiniInput label="Recovery" value={exercise.rest} onChange={(value) => onUpdate((current) => ({ ...current, rest: value }))} />
            <MiniInput label="Intensity" value={exercise.rpe} onChange={(value) => onUpdate((current) => ({ ...current, rpe: value }))} />
          </>
        ) : null}
      </div>
      <button type="button" onClick={onRemove} aria-label={`Remove ${exercise.name}`} className="grid size-9 place-items-center rounded-full text-stone-500 transition hover:bg-stone-100 hover:text-charcoal-950">
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}

function workoutPrescriptionSummary(exercise: WorkoutExercise) {
  switch (getWorkoutExercisePrescriptionType(exercise)) {
    case "duration":
      return [exercise.duration, exercise.rpe, exercise.load].filter(Boolean).join(" · ");
    case "distance":
      return [exercise.distance, exercise.load, exercise.rpe].filter(Boolean).join(" · ");
    case "intervals":
      return [`${exercise.sets} rounds`, exercise.duration || exercise.distance, exercise.rest && `Recovery ${exercise.rest}`].filter(Boolean).join(" · ");
    default:
      return [`${exercise.sets} × ${exercise.reps}`, exercise.rest && `Rest ${exercise.rest}`].filter(Boolean).join(" · ");
  }
}

function ExerciseThumb({ exercise }: { exercise?: Exercise }) {
  if (exercise?.demoUrl) {
    return (
      <Image
        src={exercise.demoUrl}
        alt=""
        width={44}
        height={44}
        className="size-11 rounded-xl border border-stone-200 bg-stone-50 object-cover"
      />
    );
  }

  return (
    <div className="grid size-11 place-items-center rounded-xl border border-stone-200 bg-stone-50 text-bronze-600">
      <Dumbbell className="size-5" />
    </div>
  );
}

function MiniInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-400">
      <span>{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full rounded-lg border border-stone-200 bg-white px-2 text-sm text-charcoal-950 shadow-inner-soft transition focus-visible:border-bronze-300"
      />
    </label>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-charcoal-950">
      {label}
      {children}
    </label>
  );
}
