"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { motion } from "motion/react";
import { ArrowRight, Check, Eye, LoaderCircle, MessageSquare, Save, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { exercises as exerciseLibrary } from "@/lib/demo-data";
import { getWorkoutExercisePrescriptionType } from "@/lib/exercise-prescriptions";
import { createClient as createBrowserClient } from "@/lib/supabase-browser";
import type { Exercise, Workout, WorkoutExercise } from "@/lib/types";

type SetEntry = {
  reps: string;
  weight: string;
  durationMinutes: string;
  distance: string;
  notes: string;
  completed: boolean;
};

type SetState = Record<string, SetEntry>;

const demoStorageKey = (workoutId: string) => `nick-glushien-demo-workout-log-${workoutId}`;

function isSupabaseReady() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://demo.supabase.co" &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== "demo-anon-key",
  );
}

function entryKey(exerciseId: string, setNumber: number) {
  return `${exerciseId}:${setNumber}`;
}

function emptySetEntry(): SetEntry {
  return { reps: "", weight: "", durationMinutes: "", distance: "", notes: "", completed: false };
}

function setEntry(entry?: Partial<SetEntry>): SetEntry {
  return { ...emptySetEntry(), ...entry };
}

function logUnitCount(exercise: WorkoutExercise) {
  const prescriptionType = getWorkoutExercisePrescriptionType(exercise);
  return prescriptionType === "strength" || prescriptionType === "intervals" ? Math.max(exercise.sets, 1) : 1;
}

function logUnitLabel(exercise: WorkoutExercise, unitNumber: number) {
  switch (getWorkoutExercisePrescriptionType(exercise)) {
    case "intervals":
      return `Round ${unitNumber}`;
    case "duration":
    case "distance":
      return "Session";
    default:
      return `Set ${unitNumber}`;
  }
}

function exerciseStatusLabel(exercise: WorkoutExercise) {
  switch (getWorkoutExercisePrescriptionType(exercise)) {
    case "duration":
      return exercise.duration || "Timed cardio";
    case "distance":
      return exercise.distance || "Distance cardio";
    case "intervals":
      return `${exercise.sets} rounds`;
    default:
      return `${exercise.sets} sets`;
  }
}

function buildInitialSetState(workout: Workout) {
  const state: SetState = {};
  workout.blocks.forEach((block) => {
    block.exercises.forEach((exercise) => {
      for (let setNumber = 1; setNumber <= logUnitCount(exercise); setNumber += 1) {
        state[entryKey(exercise.id, setNumber)] = emptySetEntry();
      }
    });
  });
  return state;
}

function formatCompletedAt(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function WorkoutLogger({ workout }: { workout: Workout }) {
  const total = workout.blocks.reduce((sum, block) => sum + block.exercises.length, 0);
  const [completed, setCompleted] = useState<string[]>([]);
  const [referenceExercise, setReferenceExercise] = useState<{
    prescription: WorkoutExercise;
    exercise?: Exercise;
  } | null>(null);
  const [setState, setSetState] = useState<SetState>(() => buildInitialSetState(workout));
  const [feedback, setFeedback] = useState("");
  const [perceivedEffort, setPerceivedEffort] = useState("");
  const [completedAt, setCompletedAt] = useState<string | null>(null);
  const [editingCompletedAt, setEditingCompletedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const completionPercent = total ? (completed.length / total) * 100 : 0;
  const readyForPersistence = isSupabaseReady();

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      if (!readyForPersistence) {
        const stored = window.localStorage.getItem(demoStorageKey(workout.id));
        if (stored) {
          try {
            const parsed = JSON.parse(stored) as {
              completed: string[];
              setState: SetState;
              feedback: string;
              perceivedEffort: string;
              completedAt?: string | null;
            };
            if (!cancelled) {
              setCompleted(parsed.completed ?? []);
              setSetState({ ...buildInitialSetState(workout), ...(parsed.setState ?? {}) });
              setFeedback(parsed.feedback ?? "");
              setPerceivedEffort(parsed.perceivedEffort ?? "");
              setCompletedAt(parsed.completedAt ?? null);
              setEditingCompletedAt(null);
            }
          } catch {
            window.localStorage.removeItem(demoStorageKey(workout.id));
          }
        }
        if (!cancelled) setLoading(false);
        return;
      }

      try {
        const supabase = createBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          if (!cancelled) setLoading(false);
          return;
        }

        const { data: client } = await supabase
          .from("clients")
          .select("id")
          .eq("profile_id", user.id)
          .maybeSingle<{ id: string }>();

        if (!client?.id) {
          if (!cancelled) setLoading(false);
          return;
        }

        const { data: workoutLog } = await supabase
          .from("workout_logs")
          .select("id, feedback, perceived_effort, status, completed_at")
          .eq("client_id", client.id)
          .eq("workout_id", workout.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle<{ id: string; feedback: string | null; perceived_effort: number | null; status: string; completed_at: string | null }>();

        if (cancelled) return;
        setFeedback(workoutLog?.feedback ?? "");
        setPerceivedEffort(workoutLog?.perceived_effort?.toString() ?? "");
        setCompletedAt(workoutLog?.status === "completed" ? workoutLog.completed_at ?? new Date().toISOString() : null);
        setEditingCompletedAt(null);

        if (!workoutLog?.id) {
          setLoading(false);
          return;
        }

        const { data: setLogs } = await supabase
          .from("set_logs")
          .select("workout_exercise_id, set_number, reps, weight, duration_seconds, distance, notes, completed")
          .eq("workout_log_id", workoutLog.id);

        if (cancelled) return;

        const nextSetState = buildInitialSetState(workout);
        const completedExercises = new Set<string>();

        (setLogs ?? []).forEach((setLog: {
          workout_exercise_id: string;
          set_number: number;
          reps: number | null;
          weight: number | null;
          duration_seconds: number | null;
          distance: number | null;
          notes: string | null;
          completed: boolean;
        }) => {
          const key = entryKey(setLog.workout_exercise_id, setLog.set_number);
          nextSetState[key] = setEntry({
            reps: setLog.reps?.toString() ?? "",
            weight: setLog.weight?.toString() ?? "",
            durationMinutes: setLog.duration_seconds ? String(setLog.duration_seconds / 60) : "",
            distance: setLog.distance?.toString() ?? "",
            notes: setLog.notes ?? "",
            completed: Boolean(setLog.completed),
          });
        });

        workout.blocks.forEach((block) => {
          block.exercises.forEach((exercise) => {
            const allSetsDone = Array.from({ length: logUnitCount(exercise) }).every((_, index) => {
              const entry = nextSetState[entryKey(exercise.id, index + 1)];
              return entry?.completed;
            });
            if (allSetsDone) completedExercises.add(exercise.id);
          });
        });

        setSetState(nextSetState);
        setCompleted(Array.from(completedExercises));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void hydrate();

    return () => {
      cancelled = true;
    };
  }, [readyForPersistence, workout]);

  useEffect(() => {
    if (readyForPersistence || loading) return;
    window.localStorage.setItem(
      demoStorageKey(workout.id),
      JSON.stringify({
        completed,
        setState,
        feedback,
        perceivedEffort,
        completedAt,
      }),
    );
  }, [completed, completedAt, feedback, loading, perceivedEffort, readyForPersistence, setState, workout.id]);

  const referenceExercises = useMemo(
    () =>
      new Map(
        [
          ...exerciseLibrary,
          ...workout.blocks.flatMap((block) => block.exercises.flatMap((exercise) => exercise.exercise ?? [])),
        ].map((exercise) => [exercise.id, exercise]),
      ),
    [workout.blocks],
  );

  function updateEntry(exerciseId: string, setNumber: number, patch: Partial<SetEntry>) {
    setSetState((current) => ({
      ...current,
      [entryKey(exerciseId, setNumber)]: {
        ...setEntry(current[entryKey(exerciseId, setNumber)]),
        ...patch,
      },
    }));
  }

  function serializeSetState(nextSetState = setState) {
    return workout.blocks.flatMap((block) =>
      block.exercises.flatMap((exercise) =>
        Array.from({ length: logUnitCount(exercise) }).map((_, index) => {
          const setNumber = index + 1;
          const entry = setEntry(nextSetState[entryKey(exercise.id, setNumber)]);

          return {
            exerciseId: exercise.id,
            setNumber,
            reps: entry.reps,
            weight: entry.weight,
            durationMinutes: entry.durationMinutes,
            distance: entry.distance,
            notes: entry.notes,
            completed: entry.completed,
          };
        }),
      ),
    );
  }

  function validateExercise(exercise: WorkoutExercise, nextSetState = setState) {
    const prescriptionType = getWorkoutExercisePrescriptionType(exercise);

    if (prescriptionType === "intervals" && !exercise.duration && !exercise.distance) {
      return `${exercise.name} needs a work time or distance from your trainer before it can be logged.`;
    }

    for (let setNumber = 1; setNumber <= logUnitCount(exercise); setNumber += 1) {
      const entry = setEntry(nextSetState[entryKey(exercise.id, setNumber)]);
      const unitLabel = logUnitLabel(exercise, setNumber).toLowerCase();
      const reps = entry.reps.trim();
      const weight = entry.weight.trim();
      const durationMinutes = entry.durationMinutes.trim();
      const distance = entry.distance.trim();

      if (prescriptionType === "strength") {
        if (!reps) return `Add reps for ${exercise.name}, ${unitLabel}.`;
        if (!Number.isFinite(Number(reps)) || Number(reps) <= 0) {
          return `Reps for ${exercise.name}, ${unitLabel} must be a number above 0.`;
        }
        if (weight && (!Number.isFinite(Number(weight)) || Number(weight) < 0)) {
          return `Weight for ${exercise.name}, ${unitLabel} must be 0 or higher.`;
        }
        continue;
      }

      if (prescriptionType === "duration" || (prescriptionType === "intervals" && exercise.duration)) {
        if (!durationMinutes || !Number.isFinite(Number(durationMinutes)) || Number(durationMinutes) <= 0) {
          return `Add minutes for ${exercise.name}, ${unitLabel}.`;
        }
      }

      if (prescriptionType === "distance" || (prescriptionType === "intervals" && exercise.distance)) {
        if (!distance || !Number.isFinite(Number(distance)) || Number(distance) <= 0) {
          return `Add distance for ${exercise.name}, ${unitLabel}.`;
        }
      }
    }

    return null;
  }

  function validateWorkoutCompletion(nextSetState = setState, nextCompleted = completed) {
    if (nextCompleted.length < total) return "Mark every exercise done before completing the workout.";

    for (const block of workout.blocks) {
      for (const exercise of block.exercises) {
        const error = validateExercise(exercise, nextSetState);
        if (error) return error;
      }
    }

    const effort = Number(perceivedEffort);
    if (!Number.isInteger(effort) || effort < 1 || effort > 10) return "Add an overall effort from 1 to 10.";

    return null;
  }

  function validateOptionalEffort() {
    if (!perceivedEffort) return null;
    const effort = Number(perceivedEffort);
    if (!Number.isInteger(effort) || effort < 1 || effort > 10) return "Overall effort must be a whole number from 1 to 10.";
    return null;
  }

  async function persistWorkoutLog(status: "in_progress" | "completed", nextSetState = setState) {
    if (!readyForPersistence) return null;
    const effortError = validateOptionalEffort();
    if (effortError) throw new Error(effortError);

    const response = await fetch("/api/client/workout-logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workoutId: workout.id,
        feedback,
        perceivedEffort: perceivedEffort ? Number(perceivedEffort) : null,
        status,
        sets: serializeSetState(nextSetState),
      }),
    });
    const result = (await response.json()) as { completedAt?: string | null; error?: string; logId?: string };
    if (!response.ok) throw new Error(result.error ?? "Unable to save workout log.");
    return result;
  }

  async function saveExerciseProgress(exercise: WorkoutExercise) {
    setSaving(true);
    setMessage(null);

    try {
      const done = completed.includes(exercise.id);
      const nextCompleted = done
        ? completed.filter((item) => item !== exercise.id)
        : [...completed, exercise.id];
      const nextSetState = { ...setState };

      Array.from({ length: logUnitCount(exercise) }).forEach((_, index) => {
        const setNumber = index + 1;
        const key = entryKey(exercise.id, setNumber);
        nextSetState[key] = {
          ...setEntry(nextSetState[key]),
          completed: !done,
        };
      });

      if (!done) {
        const validationError = validateExercise(exercise, nextSetState);
        if (validationError) throw new Error(validationError);
      }

      await persistWorkoutLog("in_progress", nextSetState);
      setCompleted(nextCompleted);
      setSetState(nextSetState);
      setMessage(done ? "Exercise reopened." : "Exercise logged.");
      window.setTimeout(() => setMessage(null), 1800);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save exercise progress.");
    } finally {
      setSaving(false);
    }
  }

  async function completeWorkout() {
    setSaving(true);
    setMessage(null);
    try {
      const validationError = validateWorkoutCompletion();
      if (validationError) throw new Error(validationError);
      const result = await persistWorkoutLog("completed");
      const nextCompletedAt = result?.completedAt ?? new Date().toISOString();
      setCompletedAt(nextCompletedAt);
      setEditingCompletedAt(null);
      setMessage("Workout complete.");
      window.setTimeout(() => setMessage(null), 2200);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to complete workout.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Card className="p-5 sm:p-6">
        <div className="flex items-center gap-3 text-stone-600">
          <LoaderCircle className="size-5 animate-spin" />
          Restoring your workout session...
        </div>
      </Card>
    );
  }

  if (completedAt) {
    return (
      <div className="space-y-4 sm:space-y-5">
        <Card className="p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-full bg-sage-100 text-sage-700">
              <Check className="size-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xl font-semibold text-charcoal-950">Workout complete</h3>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                {workout.name} was logged {formatCompletedAt(completedAt)}. Your trainer can now review it from their dashboard.
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-sm text-stone-600">
                <Badge variant="sage">Complete</Badge>
                <span className="rounded-full bg-stone-50 px-3 py-1.5">{total}/{total} exercises</span>
                {perceivedEffort ? <span className="rounded-full bg-stone-50 px-3 py-1.5">RPE {perceivedEffort}</span> : null}
              </div>
              {feedback ? (
                <p className="mt-4 rounded-[1.25rem] bg-stone-50 p-4 text-sm leading-6 text-stone-600">{feedback}</p>
              ) : null}
            </div>
          </div>
          <div className="mt-6 grid gap-3 sm:flex sm:flex-wrap sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setEditingCompletedAt(completedAt);
                setCompletedAt(null);
              }}
            >
              Edit log
            </Button>
            <Button asChild variant="warm">
              <Link href="/client/workouts">
                Back to workouts
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </Card>

        {message ? (
          <div className="fixed bottom-24 right-3 z-40 rounded-full bg-charcoal-950 px-4 py-3 text-sm text-ivory-50 shadow-soft lg:right-6">
            {message}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20 sm:space-y-5 sm:pb-0">
      <section className="rounded-[1.25rem] border border-stone-200/80 bg-white/58 px-4 py-3.5 shadow-inner-soft sm:rounded-[1.5rem] sm:px-5 sm:py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 className="font-serif text-2xl font-semibold leading-tight text-charcoal-950 sm:text-3xl">{workout.name}</h2>
            <p className="mt-2 text-sm leading-6 text-stone-600">{workout.coachNotes}</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2 text-sm text-stone-600 sm:justify-end">
            <span className="rounded-full bg-stone-50 px-3 py-1.5">{workout.dayLabel}</span>
            <span className="rounded-full bg-stone-50 px-3 py-1.5">{total} exercises</span>
          </div>
        </div>
      </section>

      {workout.blocks.map((block, index) => (
        <motion.section
          key={block.id}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.06 }}
        >
          <Card className="p-3.5 sm:p-6">
            <div className="mb-4 sm:mb-5">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-bronze-600">{block.label}</p>
              <h3 className="mt-2 text-lg font-semibold sm:text-xl">{block.intent}</h3>
            </div>
            <div className="space-y-3.5 sm:space-y-4">
              {block.exercises.map((exercise) => {
                const done = completed.includes(exercise.id);
                const reference = referenceExercises.get(exercise.exerciseId);
                return (
                  <div key={exercise.id} className="rounded-[1.2rem] border border-stone-200 bg-stone-50/78 p-3 sm:rounded-[1.5rem] sm:p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-base font-semibold sm:text-lg">{exercise.name}</h4>
                          <Badge variant={done ? "sage" : "default"}>{done ? "Complete" : exerciseStatusLabel(exercise)}</Badge>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-stone-600">{exercise.notes}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-col sm:items-end">
                        <Button
                          variant="secondary"
                          className="px-3 text-xs sm:px-5 sm:text-sm"
                          onClick={() => setReferenceExercise({ prescription: exercise, exercise: reference })}
                        >
                          <Eye className="size-4" />
                          <span className="sm:hidden">Form</span>
                          <span className="hidden sm:inline">Watch / review form</span>
                        </Button>
                        <Button
                          variant={done ? "secondary" : "default"}
                          className="px-3 text-xs sm:px-5 sm:text-sm"
                          onClick={() => void saveExerciseProgress(exercise)}
                          disabled={saving}
                        >
                          <Check className="size-4" />
                          {done ? "Logged" : "Mark done"}
                        </Button>
                      </div>
                    </div>
                    {reference ? (
                      <button
                        type="button"
                        onClick={() => setReferenceExercise({ prescription: exercise, exercise: reference })}
                        className="mt-4 flex w-full flex-col overflow-hidden rounded-[1.35rem] border border-white bg-white/82 text-left shadow-inner-soft transition hover:bg-white sm:flex-row"
                      >
                        <div className="relative h-32 sm:h-auto sm:w-44">
                          <Image
                            src={reference.demoUrl}
                            alt={`${reference.name} demonstration`}
                            fill
                            className="object-cover"
                            sizes="(max-width: 640px) 100vw, 176px"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-charcoal-950/35 to-transparent" />
                          <div className="absolute bottom-3 left-3 rounded-full bg-charcoal-950/85 px-3 py-1 text-xs font-medium text-ivory-50">
                            Demo
                          </div>
                        </div>
                        <div className="flex-1 p-4">
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="bronze">{reference.pattern}</Badge>
                            <Badge>{reference.equipment.join(", ")}</Badge>
                          </div>
                          <p className="mt-3 text-sm font-semibold text-charcoal-950">Need a reminder?</p>
                          <p className="mt-1 line-clamp-2 text-sm leading-6 text-stone-600">{reference.instructions}</p>
                        </div>
                      </button>
                    ) : null}
                    <div className="mt-4 grid gap-2.5 sm:grid-cols-5 sm:gap-3">
                      {Array.from({ length: logUnitCount(exercise) }).map((_, setIndex) => {
                        const setNumber = setIndex + 1;
                        const currentEntry = setEntry(setState[entryKey(exercise.id, setNumber)]);
                        return (
                          <div key={setNumber} className="rounded-[1rem] bg-white/86 p-2.5 sm:rounded-[1.15rem] sm:p-3">
                            <p className="mb-2 text-xs font-semibold text-stone-500">{logUnitLabel(exercise, setNumber)}</p>
                            <WorkoutLogInputs
                              exercise={exercise}
                              entry={currentEntry}
                              onChange={(patch) => updateEntry(exercise.id, setNumber, patch)}
                            />
                          </div>
                        );
                      })}
                    </div>
                    <WorkoutPrescriptionDetails exercise={exercise} />
                  </div>
                );
              })}
            </div>
          </Card>
        </motion.section>
      ))}

      <Card className="p-4 sm:p-6">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-full bg-bronze-100 text-bronze-700">
            <MessageSquare className="size-5" />
          </div>
          <div>
            <h3 className="font-semibold">Post-workout feedback</h3>
            <p className="text-sm text-stone-500">Send context your trainer can actually coach from.</p>
          </div>
        </div>
        <Textarea
          className="mt-4"
          value={feedback}
          onChange={(event) => setFeedback(event.target.value)}
          placeholder="How did the session feel? Any pain, wins, or adjustments?"
        />
        <div className="mt-4 max-w-xs">
          <label className="text-sm font-medium text-charcoal-950" htmlFor="workout-effort">
            Overall effort
          </label>
          <Input
            id="workout-effort"
            className="mt-2"
            type="number"
            min={1}
            max={10}
            step={1}
            value={perceivedEffort}
            onChange={(event) => setPerceivedEffort(event.target.value)}
            placeholder="1-10"
            aria-label="overall effort from 1 to 10"
          />
        </div>
        <div className="mt-4 flex flex-wrap justify-end gap-3">
          {editingCompletedAt ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setCompletedAt(editingCompletedAt);
                setEditingCompletedAt(null);
                setMessage(null);
              }}
              disabled={saving}
            >
              Cancel
            </Button>
          ) : null}
          <Button variant="warm" onClick={() => void completeWorkout()} disabled={saving} className="w-full sm:w-fit">
            <Save className="size-4" />
            {saving ? "Saving..." : "Mark workout complete"}
          </Button>
        </div>
      </Card>

      <div className="fixed inset-x-3 bottom-[5.75rem] z-40 grid grid-cols-[1fr_auto] items-center gap-3 rounded-[1.15rem] border border-white/70 bg-ivory-50/94 p-2.5 shadow-soft backdrop-blur-xl sm:hidden">
        <div className="min-w-0">
          <div className="mb-1.5 flex items-center justify-between gap-3 text-xs font-medium text-stone-600">
            <span>{completed.length}/{total} exercises</span>
            <span>{Math.round(completionPercent)}%</span>
          </div>
          <Progress value={completionPercent} />
        </div>
        <Button variant="warm" onClick={() => void completeWorkout()} disabled={saving} className="h-11 px-4">
          <Save className="size-4" />
          {saving ? "Saving" : "Complete"}
        </Button>
      </div>

      <ExerciseReferenceDialog
        open={Boolean(referenceExercise)}
        onOpenChange={(open) => {
          if (!open) setReferenceExercise(null);
        }}
        prescription={referenceExercise?.prescription}
        exercise={referenceExercise?.exercise}
      />

      {message ? (
        <div className="fixed bottom-[11rem] left-3 right-3 z-50 rounded-[1.2rem] bg-charcoal-950 px-4 py-3 text-sm text-ivory-50 shadow-soft sm:bottom-24 sm:left-auto sm:right-3 sm:rounded-full lg:right-6">
          {message}
        </div>
      ) : null}
    </div>
  );
}

function WorkoutLogInputs({
  exercise,
  entry,
  onChange,
}: {
  exercise: WorkoutExercise;
  entry: SetEntry;
  onChange: (patch: Partial<SetEntry>) => void;
}) {
  const inputClassName = "h-10 rounded-xl px-3 sm:h-11 sm:rounded-2xl sm:px-4";
  const prescriptionType = getWorkoutExercisePrescriptionType(exercise);

  if (prescriptionType === "duration") {
    return (
      <Input
        value={entry.durationMinutes}
        onChange={(event) => onChange({ durationMinutes: event.target.value })}
        placeholder="Minutes completed"
        aria-label="minutes completed"
        inputMode="decimal"
        className={inputClassName}
      />
    );
  }

  if (prescriptionType === "distance") {
    return (
      <Input
        value={entry.distance}
        onChange={(event) => onChange({ distance: event.target.value })}
        placeholder="Distance completed"
        aria-label="distance completed"
        inputMode="decimal"
        className={inputClassName}
      />
    );
  }

  if (prescriptionType === "intervals") {
    return (
      <div className="grid gap-2" style={{ gridTemplateColumns: exercise.duration && exercise.distance ? "repeat(2, minmax(0, 1fr))" : undefined }}>
        {exercise.duration ? (
          <Input
            value={entry.durationMinutes}
            onChange={(event) => onChange({ durationMinutes: event.target.value })}
            placeholder="Minutes"
            aria-label="minutes completed"
            inputMode="decimal"
            className={inputClassName}
          />
        ) : null}
        {exercise.distance ? (
          <Input
            value={entry.distance}
            onChange={(event) => onChange({ distance: event.target.value })}
            placeholder="Distance"
            aria-label="distance completed"
            inputMode="decimal"
            className={inputClassName}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      <Input
        value={entry.reps}
        onChange={(event) => onChange({ reps: event.target.value })}
        placeholder={exercise.reps || "Reps"}
        aria-label="reps"
        inputMode="numeric"
        className={inputClassName}
      />
      <Input
        value={entry.weight}
        onChange={(event) => onChange({ weight: event.target.value })}
        placeholder="lbs"
        aria-label="weight"
        inputMode="decimal"
        className={inputClassName}
      />
    </div>
  );
}

function WorkoutPrescriptionDetails({ exercise }: { exercise: WorkoutExercise }) {
  const prescriptionType = getWorkoutExercisePrescriptionType(exercise);
  const details =
    prescriptionType === "duration"
      ? [
          ["Duration", exercise.duration],
          ["Intensity", exercise.rpe],
          ["Pace / resistance", exercise.load],
        ]
      : prescriptionType === "distance"
        ? [
            ["Distance", exercise.distance],
            ["Target pace", exercise.load],
            ["Intensity", exercise.rpe],
          ]
        : prescriptionType === "intervals"
          ? [
              ["Rounds", String(exercise.sets)],
              ["Work", [exercise.duration, exercise.distance].filter(Boolean).join(" / ")],
              ["Recovery", exercise.rest],
              ["Intensity", exercise.rpe],
            ]
          : [
              ["Tempo", exercise.tempo],
              ["Rest", exercise.rest],
              ["RPE", exercise.rpe],
              ["Load", exercise.load],
            ];

  return (
    <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-stone-500 sm:grid-cols-4 sm:gap-3">
      {details.filter(([, value]) => value).map(([label, value]) => (
        <span key={label}>{label}: {value}</span>
      ))}
    </div>
  );
}

function ExerciseReferenceDialog({
  open,
  onOpenChange,
  prescription,
  exercise,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prescription?: WorkoutExercise;
  exercise?: Exercise;
}) {
  const title = exercise?.name ?? prescription?.name ?? "Exercise reference";

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-charcoal-950/40 backdrop-blur-sm" />
        <Dialog.Content asChild>
          <motion.div
            initial={{ opacity: 0, y: 28, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            className="fixed inset-x-2 bottom-2 z-50 max-h-[94vh] overflow-y-auto rounded-[1.4rem] border border-white/70 bg-ivory-50 shadow-soft outline-none sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-w-4xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[2rem]"
          >
            <div className="grid sm:grid-cols-[0.95fr_1.05fr]">
              <div className="relative min-h-60 overflow-hidden rounded-t-[1.4rem] bg-charcoal-950 sm:min-h-72 sm:rounded-l-[2rem] sm:rounded-tr-none">
                {exercise?.demoUrl ? (
                  <Image
                    src={exercise.demoUrl}
                    alt={`${title} demonstration`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, 430px"
                    priority
                  />
                ) : (
                  <div className="grid h-full place-items-center p-8 text-center text-ivory-50/70">
                    Demo media has not been added yet.
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal-950/65 via-transparent to-charcoal-950/20" />
                <div className="absolute bottom-5 left-5 right-5">
                  <Badge variant="bronze">{exercise?.pattern ?? "Movement"}</Badge>
                  <p className="mt-3 font-serif text-3xl font-semibold leading-tight text-ivory-50 sm:text-4xl">{title}</p>
                  {exercise ? (
                    <p className="mt-2 text-sm text-ivory-50/70">
                      {exercise.category} · {exercise.difficulty} · {exercise.equipment.join(", ")}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="p-5 sm:p-7">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Dialog.Title className="text-xl font-semibold text-charcoal-950">Form review</Dialog.Title>
                    <Dialog.Description className="mt-1 text-sm leading-6 text-stone-600">
                      A quick reminder before you log the set. Follow your trainer’s prescription first.
                    </Dialog.Description>
                  </div>
                  <Dialog.Close asChild>
                    <Button variant="ghost" size="icon" aria-label="Close exercise reference">
                      <X className="size-5" />
                    </Button>
                  </Dialog.Close>
                </div>

                {prescription ? (
                  <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {referenceMetrics(prescription).map(([label, value]) => (
                      <MiniMetric key={label} label={label} value={value} />
                    ))}
                  </div>
                ) : null}

                <section className="mt-6 rounded-[1.5rem] bg-stone-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-bronze-600">How to perform it</p>
                  <p className="mt-3 text-sm leading-7 text-stone-700">
                    {exercise?.instructions ?? "Your trainer has not added instructions for this exercise yet."}
                  </p>
                </section>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <ReferenceList title="Coaching cues" items={exercise?.cues} fallback="No cues added yet." tone="sage" />
                  <ReferenceList title="Avoid these" items={exercise?.mistakes} fallback="No mistakes listed yet." tone="bronze" />
                  <ReferenceList title="Substitutions" items={exercise?.substitutions} fallback="Ask your trainer for a swap if this feels wrong." />
                  <ReferenceList title="Muscles" items={exercise?.muscleGroups} fallback="Muscle groups unavailable." />
                </div>

                <div className="mt-5 rounded-[1.5rem] border border-bronze-200 bg-bronze-50 p-4">
                  <p className="text-sm font-semibold text-bronze-800">Client safety note</p>
                  <p className="mt-1 text-sm leading-6 text-stone-700">
                    If pain changes your movement, stop the set, choose a listed substitution, and leave a note for your trainer.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function referenceMetrics(prescription: WorkoutExercise): Array<[string, string]> {
  switch (getWorkoutExercisePrescriptionType(prescription)) {
    case "duration":
      return [
        ["Duration", prescription.duration ?? ""],
        ["Intensity", prescription.rpe],
        ["Pace / resistance", prescription.load],
      ].filter(([, value]) => value) as Array<[string, string]>;
    case "distance":
      return [
        ["Distance", prescription.distance ?? ""],
        ["Target pace", prescription.load],
        ["Intensity", prescription.rpe],
      ].filter(([, value]) => value) as Array<[string, string]>;
    case "intervals":
      return [
        ["Rounds", String(prescription.sets)],
        ["Work", [prescription.duration, prescription.distance].filter(Boolean).join(" / ")],
        ["Recovery", prescription.rest],
        ["Intensity", prescription.rpe],
      ].filter(([, value]) => value) as Array<[string, string]>;
    default:
      return [
        ["Sets", String(prescription.sets)],
        ["Reps", prescription.reps],
        ["Tempo", prescription.tempo],
        ["Rest", prescription.rest],
      ].filter(([, value]) => value) as Array<[string, string]>;
  }
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/80 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-charcoal-950">{value}</p>
    </div>
  );
}

function ReferenceList({
  title,
  items,
  fallback,
  tone = "neutral",
}: {
  title: string;
  items?: string[];
  fallback: string;
  tone?: "neutral" | "sage" | "bronze";
}) {
  const dotClass =
    tone === "sage" ? "bg-sage-500" : tone === "bronze" ? "bg-bronze-500" : "bg-stone-400";

  return (
    <section className="rounded-[1.5rem] bg-white/70 p-4">
      <p className="text-sm font-semibold text-charcoal-950">{title}</p>
      {items?.length ? (
        <ul className="mt-3 space-y-2">
          {items.map((item) => (
            <li key={item} className="flex gap-2 text-sm leading-6 text-stone-600">
              <span className={`mt-2 size-1.5 shrink-0 rounded-full ${dotClass}`} />
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm leading-6 text-stone-500">{fallback}</p>
      )}
    </section>
  );
}
