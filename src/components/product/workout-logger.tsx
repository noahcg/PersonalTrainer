"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { motion } from "motion/react";
import { Check, Eye, LoaderCircle, MessageSquare, PlayCircle, Save, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { exercises as exerciseLibrary } from "@/lib/demo-data";
import { createClient as createBrowserClient } from "@/lib/supabase-browser";
import type { Exercise, Workout, WorkoutExercise } from "@/lib/types";

type SetEntry = {
  reps: string;
  weight: string;
  notes: string;
  completed: boolean;
};

type SetState = Record<string, SetEntry>;

const demoStorageKey = (workoutId: string) => `aurelian-demo-workout-log-${workoutId}`;

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

function buildInitialSetState(workout: Workout) {
  const state: SetState = {};
  workout.blocks.forEach((block) => {
    block.exercises.forEach((exercise) => {
      for (let setNumber = 1; setNumber <= exercise.sets; setNumber += 1) {
        state[entryKey(exercise.id, setNumber)] = {
          reps: "",
          weight: "",
          notes: "",
          completed: false,
        };
      }
    });
  });
  return state;
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
  const [logId, setLogId] = useState<string | null>(null);
  const [planAssignmentId, setPlanAssignmentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
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
            };
            if (!cancelled) {
              setCompleted(parsed.completed ?? []);
              setSetState({ ...buildInitialSetState(workout), ...(parsed.setState ?? {}) });
              setFeedback(parsed.feedback ?? "");
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

        let activeAssignmentId: string | null = null;
        if (workout.trainingPlanId) {
          const { data: assignment } = await supabase
            .from("plan_assignments")
            .select("id")
            .eq("client_id", client.id)
            .eq("training_plan_id", workout.trainingPlanId)
            .eq("status", "active")
            .order("assigned_at", { ascending: false })
            .limit(1)
            .maybeSingle<{ id: string }>();
          activeAssignmentId = assignment?.id ?? null;
        }

        const { data: workoutLog } = await supabase
          .from("workout_logs")
          .select("id, feedback, status, plan_assignment_id")
          .eq("client_id", client.id)
          .eq("workout_id", workout.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle<{ id: string; feedback: string | null; status: string; plan_assignment_id: string | null }>();

        if (cancelled) return;
        setPlanAssignmentId(workoutLog?.plan_assignment_id ?? activeAssignmentId);
        setLogId(workoutLog?.id ?? null);
        setFeedback(workoutLog?.feedback ?? "");

        if (!workoutLog?.id) {
          setLoading(false);
          return;
        }

        const { data: setLogs } = await supabase
          .from("set_logs")
          .select("workout_exercise_id, set_number, reps, weight, notes, completed")
          .eq("workout_log_id", workoutLog.id);

        if (cancelled) return;

        const nextSetState = buildInitialSetState(workout);
        const completedExercises = new Set<string>();

        (setLogs ?? []).forEach((setLog: {
          workout_exercise_id: string;
          set_number: number;
          reps: number | null;
          weight: number | null;
          notes: string | null;
          completed: boolean;
        }) => {
          const key = entryKey(setLog.workout_exercise_id, setLog.set_number);
          nextSetState[key] = {
            reps: setLog.reps?.toString() ?? "",
            weight: setLog.weight?.toString() ?? "",
            notes: setLog.notes ?? "",
            completed: Boolean(setLog.completed),
          };
        });

        workout.blocks.forEach((block) => {
          block.exercises.forEach((exercise) => {
            const allSetsDone = Array.from({ length: exercise.sets }).every((_, index) => {
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
      }),
    );
  }, [completed, feedback, loading, readyForPersistence, setState, workout.id]);

  const referenceExercises = useMemo(
    () =>
      new Map(
        exerciseLibrary.map((exercise) => [exercise.id, exercise]),
      ),
    [],
  );

  function updateEntry(exerciseId: string, setNumber: number, patch: Partial<SetEntry>) {
    setSetState((current) => ({
      ...current,
      [entryKey(exerciseId, setNumber)]: {
        ...(current[entryKey(exerciseId, setNumber)] ?? {
          reps: "",
          weight: "",
          notes: "",
          completed: false,
        }),
        ...patch,
      },
    }));
  }

  async function ensureWorkoutLog() {
    if (!readyForPersistence) return null;
    if (logId) return logId;

    const supabase = createBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("You need to be logged in to save workout progress.");

    const { data: client } = await supabase
      .from("clients")
      .select("id")
      .eq("profile_id", user.id)
      .maybeSingle<{ id: string }>();
    if (!client?.id) throw new Error("Client profile not found.");

    let assignmentId = planAssignmentId;
    if (!assignmentId && workout.trainingPlanId) {
      const { data: assignment } = await supabase
        .from("plan_assignments")
        .select("id")
        .eq("client_id", client.id)
        .eq("training_plan_id", workout.trainingPlanId)
        .eq("status", "active")
        .order("assigned_at", { ascending: false })
        .limit(1)
        .maybeSingle<{ id: string }>();
      assignmentId = assignment?.id ?? null;
      setPlanAssignmentId(assignmentId);
    }

    const { data: inserted, error } = await supabase
      .from("workout_logs")
      .insert({
        client_id: client.id,
        workout_id: workout.id,
        plan_assignment_id: assignmentId,
        started_at: new Date().toISOString(),
        status: "in_progress",
      })
      .select("id")
      .single<{ id: string }>();

    if (error || !inserted?.id) throw error ?? new Error("Unable to create workout log.");
    setLogId(inserted.id);
    return inserted.id;
  }

  async function startSession() {
    setStarting(true);
    setMessage(null);
    try {
      if (readyForPersistence) {
        await ensureWorkoutLog();
      }
      setMessage("Session started.");
      window.setTimeout(() => setMessage(null), 1800);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to start session.");
    } finally {
      setStarting(false);
    }
  }

  async function saveExerciseProgress(exercise: WorkoutExercise) {
    setSaving(true);
    setMessage(null);

    try {
      const done = completed.includes(exercise.id);
      const nextCompleted = done
        ? completed.filter((item) => item !== exercise.id)
        : [...completed, exercise.id];

      if (readyForPersistence) {
        const currentLogId = await ensureWorkoutLog();
        if (!currentLogId) throw new Error("Unable to resolve workout log.");

        const supabase = createBrowserClient();
        await supabase.from("set_logs").delete().eq("workout_log_id", currentLogId).eq("workout_exercise_id", exercise.id);

        const rows = Array.from({ length: exercise.sets }).map((_, index) => {
          const setNumber = index + 1;
          const entry = setState[entryKey(exercise.id, setNumber)];
          return {
            workout_log_id: currentLogId,
            workout_exercise_id: exercise.id,
            set_number: setNumber,
            reps: entry?.reps ? Number(entry.reps) : null,
            weight: entry?.weight ? Number(entry.weight) : null,
            notes: entry?.notes ?? null,
            completed: !done,
          };
        });

        if (rows.length) {
          const { error } = await supabase.from("set_logs").insert(rows);
          if (error) throw error;
        }

        const { error: logError } = await supabase
          .from("workout_logs")
          .update({ status: "in_progress" })
          .eq("id", currentLogId);
        if (logError) throw logError;
      } else {
        Array.from({ length: exercise.sets }).forEach((_, index) => {
          updateEntry(exercise.id, index + 1, { completed: !done });
        });
      }

      setCompleted(nextCompleted);
      Array.from({ length: exercise.sets }).forEach((_, index) => {
        updateEntry(exercise.id, index + 1, { completed: !done });
      });
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
      if (readyForPersistence) {
        const currentLogId = await ensureWorkoutLog();
        if (!currentLogId) throw new Error("Unable to resolve workout log.");
        const supabase = createBrowserClient();
        const { error } = await supabase
          .from("workout_logs")
          .update({
            feedback,
            status: "completed",
            completed_at: new Date().toISOString(),
          })
          .eq("id", currentLogId);
        if (error) throw error;
      }
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
      <Card className="p-6">
        <div className="flex items-center gap-3 text-stone-600">
          <LoaderCircle className="size-5 animate-spin" />
          Restoring your workout session...
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden border-charcoal-950 bg-charcoal-950 text-ivory-50">
        <div className="p-6 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Badge variant="bronze">Nick Glushien Coaching</Badge>
              <h2 className="mt-4 font-serif text-4xl font-semibold">{workout.name}</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-ivory-50/65">{workout.coachNotes}</p>
              <div className="mt-5 flex flex-wrap gap-3 text-sm text-ivory-50/70">
                <div className="rounded-full border border-white/10 bg-white/6 px-4 py-2">{workout.dayLabel}</div>
                <div className="rounded-full border border-white/10 bg-white/6 px-4 py-2">{total} exercises</div>
                <div className="rounded-full border border-white/10 bg-white/6 px-4 py-2">Clear coaching. Real progress.</div>
              </div>
            </div>
            <Button variant="warm" size="lg" onClick={startSession} disabled={starting || saving}>
              <PlayCircle className="size-5" />
              {starting ? "Starting..." : logId ? "Session active" : "Start session"}
            </Button>
          </div>
          <div className="mt-7">
            <div className="mb-2 flex justify-between text-xs text-ivory-50/55">
              <span>Workout completion</span>
              <span>{completed.length}/{total}</span>
            </div>
            <Progress value={completionPercent} />
          </div>
        </div>
      </Card>

      {workout.blocks.map((block, index) => (
        <motion.section
          key={block.id}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.06 }}
        >
          <Card className="p-5 sm:p-6">
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-bronze-600">{block.label}</p>
              <h3 className="mt-2 text-xl font-semibold">{block.intent}</h3>
            </div>
            <div className="space-y-4">
              {block.exercises.map((exercise) => {
                const done = completed.includes(exercise.id);
                const reference = referenceExercises.get(exercise.exerciseId);
                return (
                  <div key={exercise.id} className="rounded-[1.5rem] border border-stone-200 bg-stone-50/78 p-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-lg font-semibold">{exercise.name}</h4>
                          <Badge variant={done ? "sage" : "default"}>{done ? "Complete" : `${exercise.sets} sets`}</Badge>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-stone-600">{exercise.notes}</p>
                      </div>
                      <div className="flex flex-col gap-2 sm:items-end">
                        <Button
                          variant="secondary"
                          onClick={() => setReferenceExercise({ prescription: exercise, exercise: reference })}
                        >
                          <Eye className="size-4" />
                          Watch / review form
                        </Button>
                        <Button variant={done ? "secondary" : "default"} onClick={() => void saveExerciseProgress(exercise)} disabled={saving}>
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
                        <div className="relative h-36 sm:h-auto sm:w-44">
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
                    <div className="mt-4 grid gap-3 sm:grid-cols-5">
                      {Array.from({ length: exercise.sets }).map((_, setIndex) => {
                        const setNumber = setIndex + 1;
                        const currentEntry = setState[entryKey(exercise.id, setNumber)] ?? {
                          reps: "",
                          weight: "",
                          notes: "",
                          completed: false,
                        };
                        return (
                          <div key={setNumber} className="rounded-[1.15rem] bg-white/86 p-3">
                            <p className="mb-2 text-xs font-semibold text-stone-500">Set {setNumber}</p>
                            <div className="grid grid-cols-2 gap-2">
                              <Input
                                value={currentEntry.reps}
                                onChange={(event) => updateEntry(exercise.id, setNumber, { reps: event.target.value })}
                                placeholder={exercise.reps}
                                aria-label="reps"
                              />
                              <Input
                                value={currentEntry.weight}
                                onChange={(event) => updateEntry(exercise.id, setNumber, { weight: event.target.value })}
                                placeholder="lbs"
                                aria-label="weight"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-4 grid gap-3 text-xs text-stone-500 sm:grid-cols-4">
                      <span>Tempo: {exercise.tempo}</span>
                      <span>Rest: {exercise.rest}</span>
                      <span>RPE: {exercise.rpe}</span>
                      <span>Load: {exercise.load}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </motion.section>
      ))}

      <Card className="p-5 sm:p-6">
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
        <div className="mt-4 flex justify-end">
          <Button variant="warm" onClick={() => void completeWorkout()} disabled={saving}>
            <Save className="size-4" />
            {saving ? "Saving..." : "Mark workout complete"}
          </Button>
        </div>
      </Card>

      <ExerciseReferenceDialog
        open={Boolean(referenceExercise)}
        onOpenChange={(open) => {
          if (!open) setReferenceExercise(null);
        }}
        prescription={referenceExercise?.prescription}
        exercise={referenceExercise?.exercise}
      />

      {message ? (
        <div className="fixed bottom-24 right-3 z-40 rounded-full bg-charcoal-950 px-4 py-3 text-sm text-ivory-50 shadow-soft lg:right-6">
          {message}
        </div>
      ) : null}
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
            className="fixed inset-x-3 bottom-3 z-50 max-h-[92vh] overflow-y-auto rounded-[2rem] border border-white/70 bg-ivory-50 shadow-soft outline-none sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-w-4xl sm:-translate-x-1/2 sm:-translate-y-1/2"
          >
            <div className="grid sm:grid-cols-[0.95fr_1.05fr]">
              <div className="relative min-h-72 overflow-hidden rounded-t-[2rem] bg-charcoal-950 sm:rounded-l-[2rem] sm:rounded-tr-none">
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
                  <p className="mt-3 font-serif text-4xl font-semibold text-ivory-50">{title}</p>
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
                    <MiniMetric label="Sets" value={String(prescription.sets)} />
                    <MiniMetric label="Reps" value={prescription.reps} />
                    <MiniMetric label="Tempo" value={prescription.tempo} />
                    <MiniMetric label="Rest" value={prescription.rest} />
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
