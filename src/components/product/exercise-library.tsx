"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { motion } from "motion/react";
import { BookOpenText, Dumbbell, Layers3, PencilLine, Plus, Search, Shapes, X } from "lucide-react";
import type { ComponentType } from "react";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { ExerciseCard } from "@/components/product/exercise-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { createClient as createBrowserClient } from "@/lib/supabase-browser";
import type { Exercise } from "@/lib/types";

const filters = ["All", "Gym", "Free Weights", "Bodyweight", "Calisthenics", "Conditioning"];
const storageKey = "aurelian-demo-exercises";
const fallbackDemoUrl =
  "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=900&q=80";

type DraftExercise = {
  name: string;
  category: string;
  muscleGroups: string;
  equipment: string;
  pattern: string;
  difficulty: Exercise["difficulty"];
  instructions: string;
  cues: string;
  mistakes: string;
  substitutions: string;
  demoUrl: string;
  tags: string;
};

const emptyDraft: DraftExercise = {
  name: "",
  category: "Strength",
  muscleGroups: "",
  equipment: "",
  pattern: "Push",
  difficulty: "Beginner",
  instructions: "",
  cues: "",
  mistakes: "",
  substitutions: "",
  demoUrl: "",
  tags: "",
};

function splitList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function ExerciseLibrary({
  initialExercises,
  mode,
}: {
  initialExercises: Exercise[];
  mode: "demo" | "supabase";
}) {
  const [exercises, setExercises] = useState(initialExercises);
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DraftExercise>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== "demo") return;

    const timeout = window.setTimeout(() => {
      const stored = window.localStorage.getItem(storageKey);
      if (!stored) return;

      try {
        setExercises(JSON.parse(stored) as Exercise[]);
      } catch {
        window.localStorage.removeItem(storageKey);
      }
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [mode]);

  const visibleExercises = useMemo(() => {
    const normalizedQuery = query.toLowerCase().trim();

    return exercises.filter((exercise) => {
      const searchable = [
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

      const matchesQuery = !normalizedQuery || searchable.includes(normalizedQuery);
      const matchesFilter =
        activeFilter === "All" ||
        (activeFilter === "Gym" && exercise.category === "Gym (Machines & Weights)") ||
        (activeFilter === "Free Weights" && exercise.category === "Free Weights (Barbell & Dumbbell Focus)") ||
        (activeFilter === "Bodyweight" && exercise.category === "Bodyweight (Beginner-Friendly)") ||
        (activeFilter === "Calisthenics" && exercise.category === "Calisthenics (Progression-Based Bodyweight)") ||
        (activeFilter === "Conditioning" && exercise.category === "Cardio / Conditioning") ||
        searchable.includes(activeFilter.toLowerCase()) ||
        exercise.difficulty.toLowerCase() === activeFilter.toLowerCase();

      return matchesQuery && matchesFilter;
    });
  }, [activeFilter, exercises, query]);

  const librarySummary = useMemo(
    () => ({
      total: exercises.length,
      visible: visibleExercises.length,
      custom: exercises.filter((exercise) => exercise.editable).length,
      patterns: new Set(exercises.map((exercise) => exercise.pattern).filter(Boolean)).size,
      categories: new Set(exercises.map((exercise) => exercise.category).filter(Boolean)).size,
    }),
    [exercises, visibleExercises.length],
  );

  function updateDraft<K extends keyof DraftExercise>(key: K, value: DraftExercise[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function toExerciseFromDraft(id: string) {
    return {
      id,
      name: draft.name.trim(),
      category: draft.category.trim() || "Strength",
      muscleGroups: splitList(draft.muscleGroups),
      equipment: splitList(draft.equipment),
      pattern: draft.pattern.trim() || "General",
      difficulty: draft.difficulty,
      instructions: draft.instructions.trim() || "Add detailed instructions before assigning this exercise.",
      cues: splitList(draft.cues),
      mistakes: splitList(draft.mistakes),
      substitutions: splitList(draft.substitutions),
      demoUrl: draft.demoUrl.trim() || fallbackDemoUrl,
      tags: splitList(draft.tags),
      editable: true,
    } satisfies Exercise;
  }

  function populateDraft(exercise: Exercise) {
    setDraft({
      name: exercise.name,
      category: exercise.category,
      muscleGroups: exercise.muscleGroups.join(", "),
      equipment: exercise.equipment.join(", "),
      pattern: exercise.pattern,
      difficulty: exercise.difficulty,
      instructions: exercise.instructions,
      cues: exercise.cues.join(", "),
      mistakes: exercise.mistakes.join(", "),
      substitutions: exercise.substitutions.join(", "),
      demoUrl: exercise.demoUrl,
      tags: exercise.tags.join(", "),
    });
  }

  async function resolveTrainerId() {
    const supabase = createBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("You need an authenticated trainer session to edit the exercise library.");
    }

    const { data: trainer } = await supabase
      .from("trainers")
      .select("id")
      .eq("profile_id", user.id)
      .maybeSingle<{ id: string }>();

    if (!trainer?.id) {
      throw new Error("Trainer profile not found. Seed the trainer row in Supabase first.");
    }

    return { supabase, trainerId: trainer.id };
  }

  async function persistExercise(nextExercise: Exercise, currentEditingId: string | null) {
    const { supabase, trainerId } = await resolveTrainerId();
      const payload = {
      trainer_id: trainerId,
      name: nextExercise.name,
      category: nextExercise.category,
      muscle_groups: nextExercise.muscleGroups,
      equipment: nextExercise.equipment,
      movement_pattern: nextExercise.pattern,
      difficulty: nextExercise.difficulty.toLowerCase() as "beginner" | "intermediate" | "advanced",
      instructions: nextExercise.instructions,
      coaching_cues: nextExercise.cues,
      mistakes_to_avoid: nextExercise.mistakes,
      substitutions: nextExercise.substitutions,
      demo_url: nextExercise.demoUrl,
      is_global: false,
    };

    if (currentEditingId) {
      const { error } = await supabase.from("exercises").update(payload).eq("id", currentEditingId);
      if (error) throw error;
      await supabase.from("exercise_tags").delete().eq("exercise_id", currentEditingId);
      if (nextExercise.tags.length) {
        const { error: tagsError } = await supabase.from("exercise_tags").insert(
          nextExercise.tags.map((tag) => ({
            exercise_id: currentEditingId,
            tag,
          })),
        );
        if (tagsError) throw tagsError;
      }
      return currentEditingId;
    }

    const { data: inserted, error } = await supabase
      .from("exercises")
      .insert(payload)
      .select("id")
      .single<{ id: string }>();

    if (error || !inserted?.id) throw error ?? new Error("Exercise was not created.");

    if (nextExercise.tags.length) {
      const { error: tagsError } = await supabase.from("exercise_tags").insert(
        nextExercise.tags.map((tag) => ({
          exercise_id: inserted.id,
          tag,
        })),
      );
      if (tagsError) throw tagsError;
    }

    return inserted.id;
  }

  async function createExercise(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!draft.name.trim()) return;

    setSaving(true);
    setMessage(null);

    try {
      const nextExercise = toExerciseFromDraft(editingId ?? `custom-${Date.now()}`);
      const resolvedId = mode === "supabase" ? await persistExercise(nextExercise, editingId) : nextExercise.id;
      const resolvedExercise = { ...nextExercise, id: resolvedId };

      const nextExercises = editingId
        ? exercises.map((exercise) => (exercise.id === editingId ? resolvedExercise : exercise))
        : [resolvedExercise, ...exercises];

      setExercises(nextExercises);
      if (mode === "demo") {
        window.localStorage.setItem(storageKey, JSON.stringify(nextExercises));
      }
      setDraft(emptyDraft);
      setEditingId(null);
      setOpen(false);
      setMessage(editingId ? "Exercise updated." : "Exercise created.");
      window.setTimeout(() => setMessage(null), 2400);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save exercise.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Card className="mb-5 overflow-hidden p-0">
        <div className="border-b border-border bg-white/35 p-5 sm:p-6">
          <div className="max-w-2xl">
            <p className="text-[0.66rem] uppercase tracking-[0.3em] text-bronze-600">Library workspace</p>
            <h2 className="mt-2 font-serif text-3xl font-semibold leading-tight text-charcoal-950 sm:text-4xl">Movement references built for fast coaching.</h2>
            <p className="mt-3 text-sm leading-6 text-stone-600">
              Search, filter, and maintain the instructions, cues, mistakes, and substitutions clients rely on mid-session.
            </p>
          </div>
        </div>

        <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-5 sm:p-6">
          <LibraryMetric icon={Dumbbell} label="Exercise bank" value={String(librarySummary.total)} detail="Saved references" tone="text-charcoal-950" />
          <LibraryMetric icon={Search} label="Current view" value={String(librarySummary.visible)} detail="Matching filters" tone="text-sage-700" />
          <LibraryMetric icon={PencilLine} label="Custom" value={String(librarySummary.custom)} detail="Trainer-created" tone="text-bronze-500" />
          <LibraryMetric icon={Shapes} label="Patterns" value={String(librarySummary.patterns)} detail="Movement types" tone="text-stone-600" />
          <LibraryMetric icon={BookOpenText} label="Categories" value={String(librarySummary.categories)} detail="Reference groups" tone="text-bronze-500" />
        </div>

        <div className="border-t border-border bg-stone-50/45 p-5 sm:p-6">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search exercises, muscle groups, equipment..."
                className="pl-11"
              />
            </div>
          <Dialog.Root open={open} onOpenChange={setOpen}>
            <Dialog.Trigger asChild>
              <Button
                variant="warm"
                onClick={() => {
                  setDraft(emptyDraft);
                  setEditingId(null);
                }}
              >
                <Plus className="size-4" />
                Create exercise
              </Button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-50 bg-charcoal-950/35 backdrop-blur-sm" />
              <Dialog.Content asChild>
                <motion.div
                  initial={{ opacity: 0, y: 24, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 18, scale: 0.98 }}
                  className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100vw-1.5rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[2rem] border border-white/70 bg-ivory-50 p-5 shadow-soft sm:p-7"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <Dialog.Title className="font-serif text-4xl font-semibold text-charcoal-950">
                        {editingId ? "Edit exercise" : "Create exercise"}
                      </Dialog.Title>
                      <Dialog.Description className="mt-2 text-sm leading-6 text-stone-600">
                        {editingId
                          ? "Refine the coaching reference clients see when they need a reminder."
                          : "Add enough context for a client to execute the movement safely and confidently."}
                      </Dialog.Description>
                    </div>
                    <Dialog.Close asChild>
                      <Button variant="ghost" size="icon" aria-label="Close create exercise dialog">
                        <X className="size-5" />
                      </Button>
                    </Dialog.Close>
                  </div>

                  <form onSubmit={createExercise} className="mt-6 grid gap-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="grid gap-2 text-sm font-medium">
                        Name
                        <Input
                          required
                          value={draft.name}
                          onChange={(event) => updateDraft("name", event.target.value)}
                          placeholder="Half-kneeling cable press"
                        />
                      </label>
                      <label className="grid gap-2 text-sm font-medium">
                        Category
                        <Input
                          value={draft.category}
                          onChange={(event) => updateDraft("category", event.target.value)}
                          placeholder="Strength"
                        />
                      </label>
                      <label className="grid gap-2 text-sm font-medium">
                        Movement pattern
                        <Input
                          value={draft.pattern}
                          onChange={(event) => updateDraft("pattern", event.target.value)}
                          placeholder="Push"
                        />
                      </label>
                      <label className="grid gap-2 text-sm font-medium">
                        Difficulty
                        <select
                          value={draft.difficulty}
                          onChange={(event) => updateDraft("difficulty", event.target.value as Exercise["difficulty"])}
                          className="h-11 rounded-2xl border border-stone-200 bg-white/80 px-4 text-sm shadow-inner-soft transition focus-visible:border-bronze-300 focus-visible:ring-4 focus-visible:ring-bronze-100"
                        >
                          <option>Beginner</option>
                          <option>Intermediate</option>
                          <option>Advanced</option>
                        </select>
                      </label>
                      <label className="grid gap-2 text-sm font-medium">
                        Muscle groups
                        <Input
                          value={draft.muscleGroups}
                          onChange={(event) => updateDraft("muscleGroups", event.target.value)}
                          placeholder="Chest, Core, Shoulders"
                        />
                      </label>
                      <label className="grid gap-2 text-sm font-medium">
                        Equipment
                        <Input
                          value={draft.equipment}
                          onChange={(event) => updateDraft("equipment", event.target.value)}
                          placeholder="Cable, Bench"
                        />
                      </label>
                    </div>

                    <label className="grid gap-2 text-sm font-medium">
                      Instructions
                      <Textarea
                        required
                        value={draft.instructions}
                        onChange={(event) => updateDraft("instructions", event.target.value)}
                        placeholder="Set up tall, brace, press slightly upward, and return with control."
                      />
                    </label>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="grid gap-2 text-sm font-medium">
                        Coaching cues
                        <Textarea
                          value={draft.cues}
                          onChange={(event) => updateDraft("cues", event.target.value)}
                          placeholder="Ribs down, Reach long, Slow return"
                        />
                      </label>
                      <label className="grid gap-2 text-sm font-medium">
                        Mistakes to avoid
                        <Textarea
                          value={draft.mistakes}
                          onChange={(event) => updateDraft("mistakes", event.target.value)}
                          placeholder="Arching low back, Shrugging, Rushing"
                        />
                      </label>
                      <label className="grid gap-2 text-sm font-medium">
                        Substitutions
                        <Textarea
                          value={draft.substitutions}
                          onChange={(event) => updateDraft("substitutions", event.target.value)}
                          placeholder="Band press, Incline push-up"
                        />
                      </label>
                      <label className="grid gap-2 text-sm font-medium">
                        Tags
                        <Textarea
                          value={draft.tags}
                          onChange={(event) => updateDraft("tags", event.target.value)}
                          placeholder="upper body, anti-rotation, cable"
                        />
                      </label>
                    </div>

                    <label className="grid gap-2 text-sm font-medium">
                      Demo image or video URL
                      <Input
                        value={draft.demoUrl}
                        onChange={(event) => updateDraft("demoUrl", event.target.value)}
                        placeholder="https://..."
                      />
                    </label>

                    <div className="flex flex-col-reverse gap-3 border-t border-stone-200 pt-5 sm:flex-row sm:justify-between">
                      <div className="text-sm text-stone-500">
                        {mode === "supabase" ? "Saving to Supabase" : "Saving in local demo mode"}
                      </div>
                      <div className="flex flex-col-reverse gap-3 sm:flex-row">
                      <Dialog.Close asChild>
                        <Button type="button" variant="secondary">Cancel</Button>
                      </Dialog.Close>
                      <Button type="submit" variant="warm" disabled={saving}>
                        {saving ? "Saving..." : editingId ? "Save changes" : "Create exercise"}
                      </Button>
                      </div>
                    </div>
                  </form>
                </motion.div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2 text-[0.66rem] uppercase tracking-[0.22em] text-stone-400">
              <Layers3 className="size-4" />
              Filters
            </div>
            <div className="no-scrollbar -mx-2 flex gap-2 overflow-x-auto overscroll-x-contain px-2 py-2">
              {filters.map((filter) => (
                <button key={filter} type="button" onClick={() => setActiveFilter(filter)}>
                  <Badge variant={filter === activeFilter ? "dark" : "default"}>{filter}</Badge>
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {visibleExercises.length > 0 ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {visibleExercises.map((exercise, index) => (
            <motion.div
              key={exercise.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index * 0.035, 0.2) }}
            >
              <div className="space-y-3">
                <Link href={`/trainer/exercises/${exercise.id}`} className="block">
                  <ExerciseCard exercise={exercise} />
                </Link>
                {exercise.editable ?? mode === "demo" ? (
                  <Button
                    variant="secondary"
                    className="w-full rounded-2xl"
                    onClick={() => {
                      populateDraft(exercise);
                      setEditingId(exercise.id);
                      setOpen(true);
                    }}
                  >
                    <PencilLine className="size-4" />
                    Edit exercise
                  </Button>
                ) : (
                  <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-center text-sm text-stone-500">
                    Global reference exercise
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <Card className="p-8 text-center">
          <p className="font-serif text-3xl font-semibold">No exercises match that view.</p>
          <p className="mt-2 text-sm text-stone-500">Try a broader search or create the movement you need.</p>
          <Button className="mt-5" variant="warm" onClick={() => setOpen(true)}>
            <Plus className="size-4" />
            Create exercise
          </Button>
        </Card>
      )}

      {message ? (
        <div className="fixed bottom-24 right-3 z-40 rounded-full bg-charcoal-950 px-4 py-3 text-sm text-ivory-50 shadow-soft lg:right-6">
          {message}
        </div>
      ) : null}
    </>
  );
}

function LibraryMetric({
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
