"use client";

import { Input, Textarea } from "@/components/ui/input";
import { TaxonomySelect } from "@/components/ui/taxonomy-select";
import { getClassification, taxonomy, type ExerciseClassification } from "@/lib/exercise-classification";
import { getExercisePrescriptionType, prescriptionTypeLabel, exercisePrescriptionTypes } from "@/lib/exercise-prescriptions";
import type { Exercise, ExercisePrescriptionType } from "@/lib/types";

export type DraftExercise = {
  name: string; classification: ExerciseClassification; prescriptionType: ExercisePrescriptionType;
  difficulty: Exercise["difficulty"]; instructions: string; cues: string; mistakes: string;
  substitutions: string; regressions: string; progressions: string; demoUrl: string;
};
export const emptyDraft: DraftExercise = {
  name: "", classification: { version: 1, exerciseType: "strength", movementFocus: null, equipment: [], muscles: [], commonUses: [], review: [] },
  prescriptionType: "strength", difficulty: "Beginner", instructions: "", cues: "", mistakes: "", substitutions: "", regressions: "", progressions: "", demoUrl: "",
};
export function exerciseToDraft(exercise: Exercise): DraftExercise {
  return { name: exercise.name, classification: getClassification(exercise), prescriptionType: getExercisePrescriptionType(exercise), difficulty: exercise.difficulty,
    instructions: exercise.instructions, cues: exercise.cues.join("\n"), mistakes: exercise.mistakes.join("\n"), substitutions: exercise.substitutions.join("\n"),
    regressions: (exercise.regressions ?? []).join("\n"), progressions: (exercise.progressions ?? []).join("\n"), demoUrl: exercise.demoUrl };
}

export function ExerciseEditorFields({ draft, onChange, errors, original }: { draft: DraftExercise; onChange: (draft: DraftExercise) => void; errors: Record<string, string>; original?: Exercise }) {
  const classification = draft.classification;
  const update = <K extends keyof DraftExercise>(key: K, value: DraftExercise[K]) => onChange({ ...draft, [key]: value });
  const setClass = <K extends keyof ExerciseClassification>(key: K, value: ExerciseClassification[K]) => update("classification", { ...classification, [key]: value });
  const focusOptions = taxonomy.focuses.filter((option) => option.type === classification.exerciseType);
  const incompatible = !!classification.movementFocus && !focusOptions.some((option) => option.value === classification.movementFocus);
  const selectClass = "h-11 w-full rounded-2xl border border-stone-200 bg-white/80 px-4 text-sm shadow-inner-soft focus-visible:ring-4 focus-visible:ring-bronze-100";
  return (
    <>
      <section aria-labelledby="exercise-details-heading" className="space-y-4">
        <h3 id="exercise-details-heading" className="font-serif text-2xl font-semibold">Exercise details</h3>
        <label className="grid gap-2 text-sm font-medium">Exercise name (required)
          <Input aria-label="Exercise name (required)" value={draft.name} onChange={(event) => update("name", event.target.value)} autoComplete="off" aria-invalid={!!errors.name} aria-describedby={errors.name ? "name-error" : undefined} />
          {errors.name && <span id="name-error" className="text-xs text-red-700">{errors.name}</span>}
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <TaxonomySelect label="Exercise type" options={taxonomy.types} multiple={false} value={classification.exerciseType ? [classification.exerciseType] : []} onChange={(values) => setClass("exerciseType", values[0] ?? null)} description={original ? "What sort of exercise is this?" : "Required for a new exercise."} error={errors["classification.exerciseType"]} />
          <TaxonomySelect label="Common use (optional)" options={taxonomy.commonUses} value={classification.commonUses} onChange={(values) => setClass("commonUses", values)} description="Typical placement; you can use it in any workout section." />
          <TaxonomySelect label="Movement / focus (optional)" options={focusOptions} selectedOptions={taxonomy.focuses}
            multiple={false} value={classification.movementFocus ? [classification.movementFocus] : []} onChange={(values) => setClass("movementFocus", values[0] ?? null)}
            error={incompatible ? "The previous focus belongs to another type. Remove it or choose a compatible focus." : errors["classification.movementFocus"]} description={!classification.exerciseType ? "Choose an exercise type first." : undefined} />
          <TaxonomySelect label="Equipment" options={taxonomy.equipment} value={classification.equipment} onChange={(values) => setClass("equipment", values.includes("none") && values.at(-1) === "none" ? ["none"] : values.filter((value) => value !== "none"))}
            placeholder="Search equipment or No equipment…" error={errors["classification.equipment"]} />
          <div className="sm:col-span-2"><TaxonomySelect label="Muscle groups / areas" options={taxonomy.muscles} value={classification.muscles} onChange={(values) => setClass("muscles", values)} error={errors["classification.muscles"]} /></div>
        </div>
        {original && (classification.review.length > 0 || original.tags.length > 0) && (
          <details className="rounded-2xl border border-stone-200 bg-stone-50/80 p-4 text-sm">
            <summary className="cursor-pointer font-semibold">{classification.review.length ? "Original classification · review needed" : "Original classification and tags"}</summary>
            <p className="mt-2 text-xs leading-5 text-stone-600">Original values remain saved while you refine the classification.</p>
            {classification.review.length > 0 && <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-stone-700">{classification.review.map((item) => <li key={item}>{item}</li>)}</ul>}
            <dl className="mt-3 space-y-1 break-words text-xs text-stone-600">
              <div><dt className="inline font-semibold">Category: </dt><dd className="inline">{original.category || "Not set"}</dd></div>
              <div><dt className="inline font-semibold">Pattern: </dt><dd className="inline">{original.pattern || "Not set"}</dd></div>
              <div><dt className="inline font-semibold">Equipment: </dt><dd className="inline">{original.equipment.join(", ") || "Not set"}</dd></div>
              <div><dt className="inline font-semibold">Muscles: </dt><dd className="inline">{original.muscleGroups.join(", ") || "Not set"}</dd></div>
              <div><dt className="inline font-semibold">Tags: </dt><dd className="inline">{original.tags.join(", ") || "None"}</dd></div>
            </dl>
          </details>
        )}
      </section>
      <section aria-labelledby="exercise-programming-heading" className="space-y-4 border-t border-stone-200 pt-5">
        <h3 id="exercise-programming-heading" className="font-serif text-2xl font-semibold">Programming</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium">Prescription style
            <select aria-label="Prescription style" className={selectClass} value={draft.prescriptionType} onChange={(event) => update("prescriptionType", event.target.value as ExercisePrescriptionType)}>{exercisePrescriptionTypes.map((type) => <option key={type} value={type}>{prescriptionTypeLabel(type)}</option>)}</select>
          </label>
          <label className="grid gap-2 text-sm font-medium">Difficulty
            <select aria-label="Difficulty" className={selectClass} value={draft.difficulty} onChange={(event) => update("difficulty", event.target.value as Exercise["difficulty"])}>{["Beginner", "Intermediate", "Advanced"].map((value) => <option key={value}>{value}</option>)}</select>
          </label>
        </div>
      </section>
      <section aria-labelledby="exercise-coaching-heading" className="space-y-4 border-t border-stone-200 pt-5">
        <h3 id="exercise-coaching-heading" className="font-serif text-2xl font-semibold">Coaching reference</h3>
        <label className="grid gap-2 text-sm font-medium">Instructions (required)
          <Textarea aria-label="Instructions (required)" value={draft.instructions} onChange={(event) => update("instructions", event.target.value)} aria-invalid={!!errors.instructions} aria-describedby={errors.instructions ? "instructions-error" : undefined} />
          {errors.instructions && <span id="instructions-error" className="text-xs text-red-700">{errors.instructions}</span>}
        </label>
        <p className="text-xs text-stone-500">Use one item per line in the fields below.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {([ ["cues", "Coaching cues"], ["mistakes", "Mistakes to avoid"], ["substitutions", "Substitutions"], ["regressions", "Regressions"], ["progressions", "Progressions"] ] as const).map(([key, label]) => (
            <label key={key} className="grid gap-2 text-sm font-medium">{label}<Textarea aria-label={label} value={draft[key]} onChange={(event) => update(key, event.target.value)} /></label>
          ))}
        </div>
      </section>
    </>
  );
}
