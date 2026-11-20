"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { motion } from "motion/react";
import { ImagePlus, Plus, Search, Trash2, X } from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { ExerciseCard } from "@/components/product/exercise-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ExerciseEditorFields, emptyDraft, exerciseToDraft, type DraftExercise } from "@/components/product/exercise-editor-fields";
import { ExerciseFilters } from "@/components/product/exercise-filters";
import { classificationLabels, emptyFacets, matchesExercise, type ExerciseFacets } from "@/lib/exercise-classification";
import { coachingLines, exerciseFieldErrors, exerciseInputSchema } from "@/lib/exercise-input";
import { useDemoExercises, demoExerciseStorageKey as storageKey } from "@/components/product/use-demo-exercises";
import { createClient as createBrowserClient } from "@/lib/supabase-browser";
import type { Exercise } from "@/lib/types";

function deleteErrorMessage(error: unknown) {
  if (typeof error === "object" && error && "code" in error && error.code === "23503") {
    return "This exercise is used in a workout. Remove it from saved workouts before deleting it from the library.";
  }

  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error && typeof error.message === "string") return error.message;
  return "Unable to delete exercise.";
}

async function readExerciseImagePreview(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file.");
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Please choose an image under 5MB.");
  }

  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Unable to read image file."));
    reader.readAsDataURL(file);
  });
}

async function uploadExerciseImage(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file.");
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Please choose an image under 5MB.");
  }

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/trainer/exercise-media", {
    method: "POST",
    body: formData,
  });

  const payload = (await response.json()) as { error?: string; url?: string };
  if (!response.ok || !payload.url) {
    throw new Error(payload.error ?? "Unable to upload exercise image.");
  }

  return payload.url;
}

export function ExerciseLibrary({
  initialExercises,
  mode,
  loadError,
}: {
  initialExercises: Exercise[];
  mode: "demo" | "supabase";
  loadError?: string;
}) {
  const [exercises, setExercises] = useDemoExercises(initialExercises, mode);
  const [query, setQuery] = useState("");
  const [facets, setFacets] = useState<ExerciseFacets>(emptyFacets);
  const [visibleCount, setVisibleCount] = useState(60);
  const dialogOpener = useRef<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DraftExercise>(emptyDraft);
  const [baselineDraft, setBaselineDraft] = useState(emptyDraft);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingCanDelete, setEditingCanDelete] = useState(false);
  const [pendingDemoFile, setPendingDemoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const dirty = JSON.stringify(draft) !== JSON.stringify(baselineDraft);
  useEffect(() => {
    if (!open || !dirty) return;
    const protect = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", protect);
    return () => window.removeEventListener("beforeunload", protect);
  }, [dirty, open]);

  const visibleExercises = useMemo(() => exercises.filter((exercise) => matchesExercise(exercise, query, facets)), [exercises, query, facets]);
  function updateFacets(next: ExerciseFacets) { setFacets(next); setVisibleCount(60); }
  const original = editingId ? exercises.find((exercise) => exercise.id === editingId) : undefined;

  function updateDraft<K extends keyof DraftExercise>(key: K, value: DraftExercise[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function toExerciseFromDraft(id: string): Exercise {
    const labels = classificationLabels({ ...emptyDraft, ...original, name: draft.name, classification: draft.classification, category: "", pattern: "", equipment: [], muscleGroups: [], tags: [] });
    return {
      ...original, id, name: draft.name.trim(), classification: draft.classification,
      category: original?.category ?? labels.type, pattern: original?.pattern ?? labels.focus,
      muscleGroups: original?.muscleGroups ?? labels.muscles, equipment: original?.equipment ?? labels.equipment,
      prescriptionType: draft.prescriptionType, difficulty: draft.difficulty, instructions: draft.instructions,
      cues: coachingLines(draft.cues, original?.cues), mistakes: coachingLines(draft.mistakes, original?.mistakes),
      substitutions: coachingLines(draft.substitutions, original?.substitutions),
      regressions: coachingLines(draft.regressions, original?.regressions), progressions: coachingLines(draft.progressions, original?.progressions),
      demoUrl: draft.demoUrl, tags: original?.tags ?? [], editable: original?.editable ?? true,
    };
  }

  function populateDraft(exercise: Exercise) {
    const next = exerciseToDraft(exercise);
    setDraft(next); setBaselineDraft(next); setErrors({}); setMessage(null); setPendingDemoFile(null);
  }

  function beginEditingExercise(exercise: Exercise, trigger: HTMLElement) {
    dialogOpener.current = trigger;
    populateDraft(exercise);
    setEditingId(exercise.id);
    setEditingCanDelete(exercise.editable ?? mode === "demo");
    setOpen(true);
  }

  function resetDialogState() {
    setDraft(emptyDraft);
    setBaselineDraft(emptyDraft);
    setErrors({});
    setEditingId(null);
    setEditingCanDelete(false);
    setPendingDemoFile(null);
  }

  function handleDialogOpenChange(nextOpen: boolean) {
    if (saving || deleting) return;
    if (!nextOpen && dirty && !window.confirm("Discard unsaved exercise changes?")) return;
    setOpen(nextOpen);
    if (!nextOpen) {
      resetDialogState();
    }
  }

  async function updateDemoFile(file: File | null) {
    if (!file) return;

    try {
      const preview = await readExerciseImagePreview(file);
      setPendingDemoFile(file);
      updateDraft("demoUrl", preview);
      setMessage("Exercise image ready to save.");
      window.setTimeout(() => setMessage(null), 1800);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load exercise image.");
      window.setTimeout(() => setMessage(null), 2200);
    }
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
    const response = await fetch(currentEditingId ? `/api/trainer/exercises/${currentEditingId}` : "/api/trainer/exercises", {
      method: currentEditingId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(nextExercise),
    });
    const payload = await response.json();
    if (!response.ok) { setErrors(payload.fields ?? {}); throw new Error(payload.error ?? "Unable to save exercise."); }
    return payload as { id: string; classification: Exercise["classification"] };
  }

  async function deleteExercise() {
    if (!editingId) return;

    const exercise = exercises.find((item) => item.id === editingId);
    if (!exercise) return;

    const confirmed = window.confirm(`Delete "${exercise.name}" from the exercise library? This cannot be undone.`);
    if (!confirmed) return;

    setDeleting(true);
    setMessage(null);

    try {
      if (mode === "supabase") {
        const { supabase, trainerId } = await resolveTrainerId();
        const { data: deleted, error } = await supabase
          .from("exercises")
          .delete()
          .eq("id", editingId)
          .eq("trainer_id", trainerId)
          .select("id")
          .maybeSingle<{ id: string }>();

        if (error) throw error;
        if (!deleted?.id) throw new Error("Only trainer-owned custom exercises can be deleted.");
      }

      const nextExercises = exercises.filter((item) => item.id !== editingId);
      if (mode === "demo") {
        window.localStorage.setItem(storageKey, JSON.stringify(nextExercises));
      }
      setExercises(nextExercises);

      resetDialogState();
      setOpen(false);
      setMessage("Exercise deleted.");
      window.setTimeout(() => setMessage(null), 2400);
    } catch (error) {
      setMessage(deleteErrorMessage(error));
    } finally {
      setDeleting(false);
    }
  }

  async function createExercise(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const candidate = toExerciseFromDraft(editingId ?? `custom-${crypto.randomUUID()}`);
    const parsed = exerciseInputSchema.safeParse(candidate);
    const nextErrors = parsed.success ? {} : exerciseFieldErrors(parsed.error);
    if (!editingId && !draft.classification.exerciseType) nextErrors["classification.exerciseType"] = "Choose an exercise type.";
    if (!editingId && !draft.classification.equipment.length) nextErrors["classification.equipment"] = "Choose equipment or No equipment.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) { setMessage("Check the highlighted fields."); window.setTimeout(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(), 0); return; }

    setSaving(true);
    setMessage(null);

    try {
      const uploadedDemoUrl = mode === "supabase" && pendingDemoFile ? await uploadExerciseImage(pendingDemoFile) : draft.demoUrl;
      const nextExercise = {
        ...candidate,
        demoUrl: uploadedDemoUrl,
      };
      const saved = mode === "supabase" ? await persistExercise(nextExercise, editingId) : { id: nextExercise.id, classification: nextExercise.classification };
      const existingExercise = editingId ? exercises.find((exercise) => exercise.id === editingId) : null;
      const resolvedExercise = {
        ...nextExercise,
        id: saved.id,
        classification: saved.classification,
        editable: existingExercise?.editable ?? nextExercise.editable,
      };

      const nextExercises = editingId
        ? exercises.map((exercise) => (exercise.id === editingId ? resolvedExercise : exercise))
        : [resolvedExercise, ...exercises];

      if (mode === "demo") {
        window.localStorage.setItem(storageKey, JSON.stringify(nextExercises));
      }
      setExercises(nextExercises);
      setDraft(emptyDraft);
      setEditingId(null);
      setEditingCanDelete(false);
      setPendingDemoFile(null);
      setOpen(false);
      setMessage(editingId ? "Exercise updated." : "Exercise created.");
      window.setTimeout(() => setMessage(null), 2400);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save exercise.");
    } finally {
      setSaving(false);
    }
  }

  if (loadError) return <Card role="alert" className="p-6"><p>{loadError}</p><Button className="mt-3" variant="secondary" onClick={() => window.location.reload()}>Try again</Button></Card>;

  return (
    <>
      <Card className="relative z-10 mb-5 p-0">
        <div className="rounded-[inherit] bg-stone-50/45 p-5 sm:p-6">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
              <Input
                aria-label="Search exercises"
                value={query}
                onChange={(event) => { setQuery(event.target.value); setVisibleCount(60); }}
                placeholder="Search exercises, patterns, muscles, equipment..."
                className="pl-11"
              />
            </div>
          <Dialog.Root open={open} onOpenChange={handleDialogOpenChange}>
            <Dialog.Trigger asChild>
              <Button
                variant="warm"
                onClick={(event) => {
                  dialogOpener.current = event.currentTarget;
                  resetDialogState();
                }}
              >
                <Plus className="size-4" />
                Create exercise
              </Button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-50 bg-charcoal-950/35 backdrop-blur-sm" />
              <Dialog.Content onEscapeKeyDown={(event) => { if (event.target instanceof HTMLElement && event.target.matches('[role="combobox"][aria-expanded="true"]')) event.preventDefault(); }} asChild onCloseAutoFocus={(event) => { if (dialogOpener.current) { event.preventDefault(); dialogOpener.current.focus(); } }}>
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

                  <form onSubmit={createExercise} noValidate aria-busy={saving} className="mt-6 grid gap-5">
                    <fieldset disabled={saving || deleting} className="contents">
                    <ExerciseEditorFields draft={draft} onChange={setDraft} errors={errors} original={original} />
                    {message && <p role="alert" className="rounded-2xl bg-stone-100 p-3 text-sm text-charcoal-950">{message}</p>}

                    <div className="grid gap-3 rounded-[1.35rem] border border-stone-200 bg-white/70 p-4">
                      <div className="grid gap-3">
                        <div>
                          <p className="text-sm font-semibold text-charcoal-950">Demo media</p>
                          <p className="mt-1 text-xs leading-5 text-stone-500">
                            Upload a trainer-shot image, or keep using an external URL.
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button asChild type="button" variant="secondary" size="sm">
                            <label className="cursor-pointer focus-within:outline-2 focus-within:outline-offset-3 focus-within:outline-bronze-500 focus-within:ring-4 focus-within:ring-bronze-100">
                              <ImagePlus className="size-4" />
                              Upload image
                              <input
                                className="sr-only"
                                type="file"
                                accept="image/*"
                                onChange={(event) => void updateDemoFile(event.target.files?.[0] ?? null)}
                              />
                            </label>
                          </Button>
                          {draft.demoUrl ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                updateDraft("demoUrl", "");
                                setPendingDemoFile(null);
                              }}
                            >
                              Remove
                            </Button>
                          ) : null}
                        </div>
                        <label className="grid gap-2 text-sm font-medium">
                          Image or video URL
                          <Input
                            value={draft.demoUrl}
                            onChange={(event) => {
                              updateDraft("demoUrl", event.target.value);
                              setPendingDemoFile(null);
                            }}
                            placeholder="https://..."
                          />
                        </label>
                      </div>
                    </div>

                    <div className="flex flex-col-reverse gap-3 border-t border-stone-200 pt-5 sm:flex-row sm:justify-between">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        {editingId && editingCanDelete ? (
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => void deleteExercise()}
                            disabled={saving || deleting}
                            className="justify-start text-red-700 hover:bg-red-50 hover:text-red-800"
                          >
                            <Trash2 className="size-4" />
                            {deleting ? "Deleting..." : "Delete exercise"}
                          </Button>
                        ) : null}
                        <div className="text-sm text-stone-500">
                          {editingId
                            ? "Review the changes before saving."
                            : "Add the details your clients need to follow this exercise."}
                        </div>
                      </div>
                      <div className="flex flex-col-reverse gap-3 sm:flex-row">
                        <Dialog.Close asChild>
                          <Button type="button" variant="secondary" disabled={saving || deleting}>
                            Cancel
                          </Button>
                        </Dialog.Close>
                        <Button type="submit" variant="warm" disabled={saving || deleting}>
                          {saving
                            ? "Saving..."
                            : editingId
                              ? "Save changes"
                              : "Create exercise"}
                        </Button>
                      </div>
                    </div>
                    </fieldset>
                  </form>
                </motion.div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
          </div>

          <ExerciseFilters value={facets} onChange={updateFacets} onClear={() => setQuery("")} count={visibleExercises.length} />
        </div>
      </Card>

      {visibleExercises.length > 0 ? (
        <div className="overflow-hidden border-y border-stone-200/90">
          <div className="hidden h-10 grid-cols-[5rem_minmax(0,1.4fr)_minmax(8rem,0.75fr)_minmax(8rem,0.8fr)_minmax(7rem,0.65fr)_3rem] items-center gap-3 border-b border-stone-200/90 bg-stone-50/55 px-2 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-stone-500 lg:grid">
            <span>Demo</span>
            <span>Exercise</span>
            <span>Exercise type</span>
            <span>Muscles</span>
            <span>Equipment</span>
            <span className="sr-only">Actions</span>
          </div>
          {visibleExercises.slice(0, visibleCount).map((exercise, index) => (
            <motion.div
              key={exercise.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index * 0.035, 0.2) }}
              className="h-24"
            >
              <ExerciseCard
                exercise={exercise}
                href={`/trainer/exercises/${exercise.id}`}
                canEdit={exercise.editable ?? mode === "demo"}
                onEdit={(trigger) => beginEditingExercise(exercise, trigger)}
              />
            </motion.div>
          ))}
        </div>
      ) : (
        <Card className="p-8 text-center">
          <p className="font-serif text-3xl font-semibold">{exercises.length ? "No exercises match these filters." : "Build your exercise library."}</p>
          <p className="mt-2 text-sm text-stone-500">Try a broader search or create the movement you need.</p>
          {exercises.length > 0 && <Button className="mt-5 mr-3" variant="secondary" onClick={() => { setQuery(""); updateFacets(emptyFacets); }}>Clear all</Button>}
          <Button className="mt-5" variant="warm" onClick={() => { resetDialogState(); setOpen(true); }}>
            <Plus className="size-4" />
            Create exercise
          </Button>
        </Card>
      )}

      {visibleExercises.length > visibleCount && <Button className="mt-4" variant="secondary" onClick={() => setVisibleCount((count) => count + 60)}>Show more exercises</Button>}

      {message && !open ? (
        <div role="status" className="fixed bottom-24 right-3 z-40 rounded-full bg-charcoal-950 px-4 py-3 text-sm text-ivory-50 shadow-soft lg:right-6">
          {message}
        </div>
      ) : null}
    </>
  );
}
