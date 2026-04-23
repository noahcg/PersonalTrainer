"use client";

import Image from "next/image";
import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { motion } from "motion/react";
import { Check, Eye, MessageSquare, PlayCircle, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { exercises as exerciseLibrary } from "@/lib/demo-data";
import type { Exercise, Workout, WorkoutExercise } from "@/lib/types";

export function WorkoutLogger({ workout }: { workout: Workout }) {
  const total = workout.blocks.reduce((sum, block) => sum + block.exercises.length, 0);
  const [completed, setCompleted] = useState<string[]>([]);
  const [referenceExercise, setReferenceExercise] = useState<{
    prescription: WorkoutExercise;
    exercise?: Exercise;
  } | null>(null);

  const toggle = (id: string) => {
    setCompleted((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden bg-charcoal-950 text-ivory-50">
        <div className="p-6 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Badge variant="bronze">{workout.dayLabel}</Badge>
              <h2 className="mt-4 font-serif text-4xl font-semibold">{workout.name}</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-ivory-50/65">{workout.coachNotes}</p>
            </div>
            <Button variant="warm" size="lg">
              <PlayCircle className="size-5" />
              Start session
            </Button>
          </div>
          <div className="mt-7">
            <div className="mb-2 flex justify-between text-xs text-ivory-50/55">
              <span>Workout completion</span>
              <span>{completed.length}/{total}</span>
            </div>
            <Progress value={(completed.length / total) * 100} />
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
                const reference = exerciseLibrary.find((item) => item.id === exercise.exerciseId);
                return (
                  <div key={exercise.id} className="rounded-[1.75rem] border border-stone-200 bg-stone-50/70 p-4">
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
                        <Button variant={done ? "secondary" : "default"} onClick={() => toggle(exercise.id)}>
                          <Check className="size-4" />
                          {done ? "Logged" : "Mark done"}
                        </Button>
                      </div>
                    </div>
                    {reference ? (
                      <button
                        type="button"
                        onClick={() => setReferenceExercise({ prescription: exercise, exercise: reference })}
                        className="mt-4 flex w-full flex-col overflow-hidden rounded-[1.5rem] border border-white bg-white/75 text-left shadow-inner-soft transition hover:bg-white sm:flex-row"
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
                      {Array.from({ length: exercise.sets }).map((_, setIndex) => (
                        <div key={setIndex} className="rounded-2xl bg-white/80 p-3">
                          <p className="mb-2 text-xs font-semibold text-stone-500">Set {setIndex + 1}</p>
                          <div className="grid grid-cols-2 gap-2">
                            <Input placeholder={exercise.reps} aria-label="reps" />
                            <Input placeholder="lbs" aria-label="weight" />
                          </div>
                        </div>
                      ))}
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
        <Textarea className="mt-4" placeholder="How did the session feel? Any pain, wins, or adjustments?" />
        <div className="mt-4 flex justify-end">
          <Button variant="warm">Mark workout complete</Button>
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
