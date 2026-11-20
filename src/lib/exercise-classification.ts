import { z } from "zod";
import catalog from "./exercise-taxonomy.json";
import type { Exercise } from "./types";

export const taxonomy = catalog;
export type TaxonomyOption = { value: string; label: string; aliases?: string[]; type?: string };
export type ExerciseClassification = {
  version: 1;
  exerciseType: string | null;
  movementFocus: string | null;
  equipment: string[];
  muscles: string[];
  commonUses: string[];
  review: string[];
};

export const normalizeTerm = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
export function resolveOption(options: TaxonomyOption[], value: string) {
  const term = normalizeTerm(value);
  return options.find((option) => [option.value, option.label, ...(option.aliases ?? [])].some((alias) => normalizeTerm(alias) === term));
}
export const optionLabel = (options: TaxonomyOption[], value: string | null) => options.find((option) => option.value === value)?.label ?? "Needs review";
const unique = (values: string[]) => [...new Set(values)];
const canonical = (options: TaxonomyOption[]) => z.string().refine((value) => options.some((option) => option.value === value), "Choose a listed option.");
const canonicalList = (options: TaxonomyOption[]) => z.array(canonical(options)).max(50).refine((values) => new Set(values).size === values.length, "Remove duplicate selections.");

export const classificationSchema = z.object({
  version: z.literal(1),
  exerciseType: canonical(taxonomy.types).nullable(),
  movementFocus: canonical(taxonomy.focuses).nullable(),
  equipment: canonicalList(taxonomy.equipment),
  muscles: canonicalList(taxonomy.muscles),
  commonUses: canonicalList(taxonomy.commonUses),
  review: z.array(z.string().max(2000)).max(200),
}).strict().superRefine((value, context) => {
  if (value.movementFocus && !taxonomy.focuses.some((option) => option.value === value.movementFocus && option.type === value.exerciseType)) {
    context.addIssue({ code: "custom", path: ["movementFocus"], message: "Choose a focus for this exercise type, or remove the previous focus." });
  }
  if (value.equipment.includes("none") && value.equipment.length > 1) {
    context.addIssue({ code: "custom", path: ["equipment"], message: "Choose No equipment or the equipment needed, rather than both." });
  }
});

// Deliberately narrow, reviewed mappings. No coaching text is used or rewritten.
const reviewedFocuses: Record<string, [string, string]> = {
  "pvc pass through": ["mobility", "shoulder_mobility"],
  "world s greatest stretch": ["mobility", "full_body_mobility"],
  "cat cow to t spine reach": ["mobility", "spinal_mobility"],
  "couch stretch breathing": ["mobility", "hip_mobility"],
  "glute bridge march": ["strength", "core_stabilization"],
};

export function classifyLegacyExercise(exercise: Pick<Exercise, "name" | "category" | "pattern" | "equipment" | "muscleGroups" | "tags">): ExerciseClassification {
  const review: string[] = [];
  function mapList(options: TaxonomyOption[], values: string[], dimension: string) {
    return unique(values.flatMap((raw) => raw.split(/[,;|]+/)).flatMap((raw) => {
      if (!raw.trim()) return [];
      const option = resolveOption(options, raw);
      if (!option) review.push(`${dimension}: ${raw.trim()}`);
      return option ? [option.value] : [];
    }));
  }
  const category = resolveOption(taxonomy.types, exercise.category);
  const legacyFocus = resolveOption(taxonomy.focuses, exercise.pattern);
  const reviewed = reviewedFocuses[normalizeTerm(exercise.name)];
  const mobilityPattern = ["mobility", "stretch"].includes(normalizeTerm(exercise.pattern));
  const exerciseType = reviewed?.[0] ?? (mobilityPattern ? "mobility" : category?.value ?? legacyFocus?.type ?? null);
  const movementFocus = reviewed?.[1] ?? (legacyFocus?.type === exerciseType ? legacyFocus.value : null);
  const commonUses = unique([exercise.category, ...exercise.tags].flatMap((value) => {
    const option = resolveOption(taxonomy.commonUses, value);
    return option ? [option.value] : [];
  }));
  if (!exerciseType) review.push(`Exercise type: ${exercise.category || "not specified"}`);
  if (!category && !resolveOption(taxonomy.commonUses, exercise.category) && normalizeTerm(exercise.category) !== "trx") review.push(`Category: ${exercise.category}`);
  if (exercise.pattern && !movementFocus) review.push(`Movement / focus: ${exercise.pattern}`);
  const equipment = mapList(taxonomy.equipment, exercise.equipment, "Equipment");
  const suspension = /\btrx\b|suspension (trainer|straps|training)/i.test([exercise.name, exercise.category, ...exercise.equipment, ...exercise.tags].join(" "));
  if (suspension) equipment.push("suspension_trainer");
  if (!equipment.length && /^(bodyweight|calisthenics)/i.test(exercise.category)) equipment.push("none");
  if (!equipment.length) review.push("Equipment: not specified");
  if (equipment.includes("none") && equipment.some((value) => value !== "none")) review.push("Equipment: bodyweight/no equipment appeared alongside equipment; original retained.");
  return {
    version: 1, exerciseType, movementFocus,
    equipment: unique(equipment.filter((value) => value !== "none" || equipment.every((item) => item === "none"))),
    muscles: mapList(taxonomy.muscles, exercise.muscleGroups, "Muscle groups / areas"),
    commonUses, review: unique(review),
  };
}

type ClassifiableExercise = Pick<Exercise, "classification" | "name" | "category" | "pattern" | "equipment" | "muscleGroups" | "tags">;
const classificationCache = new WeakMap<ClassifiableExercise, ExerciseClassification>();
const searchCache = new WeakMap<Exercise, string>();
export function getClassification(exercise: ClassifiableExercise): ExerciseClassification {
  const cached = classificationCache.get(exercise);
  if (cached) return cached;
  const parsed = classificationSchema.safeParse(exercise.classification);
  const result = parsed.success ? parsed.data : classifyLegacyExercise(exercise);
  classificationCache.set(exercise, result);
  return result;
}
export function classificationLabels(exercise: ClassifiableExercise) {
  const value = getClassification(exercise);
  return {
    type: optionLabel(taxonomy.types, value.exerciseType),
    focus: value.movementFocus ? optionLabel(taxonomy.focuses, value.movementFocus) : "Focus not set",
    equipment: value.equipment.map((id) => optionLabel(taxonomy.equipment, id)),
    muscles: value.muscles.map((id) => optionLabel(taxonomy.muscles, id)),
    commonUses: value.commonUses.map((id) => optionLabel(taxonomy.commonUses, id)),
  };
}

export type ExerciseFacets = { types: string[]; focuses: string[]; equipment: string[]; muscles: string[]; commonUses: string[]; difficulty: string[] };
export const emptyFacets: ExerciseFacets = { types: [], focuses: [], equipment: [], muscles: [], commonUses: [], difficulty: [] };
export function changeFacet(facets: ExerciseFacets, group: keyof ExerciseFacets, values: string[]): ExerciseFacets {
  const next = { ...facets, [group]: values };
  if (group === "types" && values.length) next.focuses = next.focuses.filter((id) => taxonomy.focuses.some((focus) => focus.value === id && values.includes(focus.type)));
  return next;
}
export function exerciseSearchText(exercise: Exercise) {
  const cached = searchCache.get(exercise);
  if (cached) return cached;
  const value = getClassification(exercise);
  const options = [
    ...taxonomy.types.filter((option) => option.value === value.exerciseType),
    ...taxonomy.focuses.filter((option) => option.value === value.movementFocus),
    ...taxonomy.equipment.filter((option) => value.equipment.includes(option.value)),
    ...taxonomy.muscles.filter((option) => value.muscles.includes(option.value)),
    ...taxonomy.commonUses.filter((option) => value.commonUses.includes(option.value)),
  ];
  const result = normalizeTerm([exercise.name, exercise.category, exercise.pattern, exercise.difficulty, ...exercise.equipment, ...exercise.muscleGroups, ...exercise.tags, ...options.flatMap((option) => [option.label, ...option.aliases])].join(" "));
  searchCache.set(exercise, result);
  return result;
}
export function matchesExercise(exercise: Exercise, query: string, facets: ExerciseFacets) {
  const value = getClassification(exercise);
  const groups: Record<keyof ExerciseFacets, string[]> = { types: value.exerciseType ? [value.exerciseType] : [], focuses: value.movementFocus ? [value.movementFocus] : [], equipment: value.equipment, muscles: value.muscles, commonUses: value.commonUses, difficulty: [exercise.difficulty] };
  return Object.entries(facets).every(([group, selected]) => !selected.length || selected.some((id: string) => groups[group as keyof ExerciseFacets].includes(id)))
    && (!query.trim() || (() => { const text = exerciseSearchText(exercise); return normalizeTerm(query).split(" ").every((term) => text.includes(term)); })());
}
