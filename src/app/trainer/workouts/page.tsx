import { GripVertical, Plus } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { exercises, workouts } from "@/lib/demo-data";

export default function WorkoutsPage() {
  const workout = workouts[0];

  return (
    <AppShell role="trainer" title="Workout builder" subtitle="Compose warm-ups, main blocks, accessories, finishers, cooldowns, and exercise prescriptions with coach-grade detail.">
      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <Card>
          <CardHeader>
            <CardTitle>{workout.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input defaultValue={workout.name} aria-label="Workout name" />
              <Input defaultValue={workout.dayLabel} aria-label="Day label" />
            </div>
            <Textarea defaultValue={workout.warmup} aria-label="Warm-up" />
            {workout.blocks.map((block) => (
              <div key={block.id} className="rounded-[2rem] border border-stone-200 bg-stone-50/80 p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <Badge variant="bronze">{block.label}</Badge>
                    <p className="mt-2 text-sm text-stone-500">{block.intent}</p>
                  </div>
                  <Button variant="secondary" size="sm"><Plus className="size-4" /> Add exercise</Button>
                </div>
                <div className="space-y-3">
                  {block.exercises.map((exercise) => (
                    <div key={exercise.id} className="grid gap-3 rounded-[1.5rem] bg-white/80 p-4 md:grid-cols-[auto_1fr_repeat(4,80px)] md:items-center">
                      <GripVertical className="hidden size-4 text-stone-400 md:block" />
                      <div>
                        <p className="font-semibold">{exercise.name}</p>
                        <p className="text-xs text-stone-500">{exercise.notes}</p>
                      </div>
                      <Input defaultValue={exercise.sets} aria-label="sets" />
                      <Input defaultValue={exercise.reps} aria-label="reps" />
                      <Input defaultValue={exercise.tempo} aria-label="tempo" />
                      <Input defaultValue={exercise.rest} aria-label="rest" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <Textarea defaultValue={workout.cooldown} aria-label="Cooldown" />
            <Button variant="warm">Save workout</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Exercise drawer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Find exercise..." />
            {exercises.map((exercise) => (
              <div key={exercise.id} className="rounded-2xl bg-stone-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{exercise.name}</p>
                    <p className="text-sm text-stone-500">{exercise.pattern} · {exercise.equipment.join(", ")}</p>
                  </div>
                  <Button size="sm" variant="secondary">Add</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
