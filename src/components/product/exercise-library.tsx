"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { motion } from "motion/react";
import { Plus, Search, X } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { ExerciseCard } from "@/components/product/exercise-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import type { Exercise } from "@/lib/types";

const filters = ["All", "Squat", "Hinge", "Pull", "Push", "Core", "Mobility", "Beginner"];
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

export function ExerciseLibrary({ initialExercises }: { initialExercises: Exercise[] }) {
  const [exercises, setExercises] = useState(initialExercises);
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DraftExercise>(emptyDraft);

  useEffect(() => {
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
  }, []);

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
        searchable.includes(activeFilter.toLowerCase()) ||
        exercise.difficulty.toLowerCase() === activeFilter.toLowerCase();

      return matchesQuery && matchesFilter;
    });
  }, [activeFilter, exercises, query]);

  function updateDraft<K extends keyof DraftExercise>(key: K, value: DraftExercise[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function createExercise(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!draft.name.trim()) return;

    const nextExercise: Exercise = {
      id: `custom-${Date.now()}`,
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
    };

    const nextExercises = [nextExercise, ...exercises];
    setExercises(nextExercises);
    window.localStorage.setItem(storageKey, JSON.stringify(nextExercises));
    setDraft(emptyDraft);
    setOpen(false);
  }

  return (
    <>
      <div className="mb-5 flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative sm:max-w-xl sm:flex-1">
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
              <Button variant="warm">
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
                        Create exercise
                      </Dialog.Title>
                      <Dialog.Description className="mt-2 text-sm leading-6 text-stone-600">
                        Add enough context for a client to execute the movement safely and confidently.
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
                          className="h-11 rounded-2xl border border-stone-200 bg-white/80 px-4 text-sm shadow-inner-soft outline-none transition focus:border-bronze-300 focus:ring-4 focus:ring-bronze-100"
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

                    <div className="flex flex-col-reverse gap-3 border-t border-stone-200 pt-5 sm:flex-row sm:justify-end">
                      <Dialog.Close asChild>
                        <Button type="button" variant="secondary">Cancel</Button>
                      </Dialog.Close>
                      <Button type="submit" variant="warm">Create exercise</Button>
                    </div>
                  </form>
                </motion.div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {filters.map((filter) => (
            <button key={filter} type="button" onClick={() => setActiveFilter(filter)}>
              <Badge variant={filter === activeFilter ? "dark" : "default"}>{filter}</Badge>
            </button>
          ))}
        </div>
      </div>

      {visibleExercises.length > 0 ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {visibleExercises.map((exercise, index) => (
            <motion.div
              key={exercise.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index * 0.035, 0.2) }}
            >
              <ExerciseCard exercise={exercise} />
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
    </>
  );
}
