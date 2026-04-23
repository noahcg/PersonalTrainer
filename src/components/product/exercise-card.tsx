import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { Exercise } from "@/lib/types";

export function ExerciseCard({ exercise }: { exercise: Exercise }) {
  return (
    <Card className="group overflow-hidden transition hover:-translate-y-1 hover:bg-white/90">
      <div className="relative h-44 overflow-hidden">
        <Image src={exercise.demoUrl} alt={exercise.name} fill className="object-cover transition duration-700 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal-950/55 to-transparent" />
        <Badge variant="dark" className="absolute left-4 top-4">{exercise.pattern}</Badge>
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold">{exercise.name}</h3>
            <p className="mt-1 text-sm text-stone-500">{exercise.category} · {exercise.difficulty}</p>
          </div>
          <Badge variant="bronze">{exercise.equipment[0]}</Badge>
        </div>
        <p className="mt-4 line-clamp-2 text-sm leading-6 text-stone-600">{exercise.instructions}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {exercise.muscleGroups.map((group) => (
            <Badge key={group}>{group}</Badge>
          ))}
        </div>
      </div>
    </Card>
  );
}
