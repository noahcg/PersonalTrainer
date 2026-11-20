/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { loadTypeScript } = require("../scripts/load-typescript.cjs");
const { classifyLegacyExercise, getClassification, classificationSchema, taxonomy, resolveOption, emptyFacets, changeFacet, matchesExercise } = loadTypeScript(path.join(__dirname, "../src/lib/exercise-classification.ts"));
const { exerciseInputSchema, coachingLines } = loadTypeScript(path.join(__dirname, "../src/lib/exercise-input.ts"));
const { planExerciseBackfill } = loadTypeScript(path.join(__dirname, "../src/lib/exercise-backfill.ts"));
const { getExercisePrescriptionType } = loadTypeScript(path.join(__dirname, "../src/lib/exercise-prescriptions.ts"));

const exercise = (overrides = {}) => ({ id: "stable-id", name: "TRX Row", category: "TRX", pattern: "Pull", equipment: ["TRX straps"], muscleGroups: ["Back", "Biceps"], tags: ["custom coaching tag"], instructions: "Keep ribs down, pause.\nReturn slowly.", cues: ["Pause, then lower", "Long neck"], mistakes: ["Shrugging, rotating"], substitutions: [], difficulty: "Beginner", prescriptionType: "strength", demoUrl: "", ...overrides });

test("PVC backfill separates common use, type and focus without touching coaching or prescription", () => {
  const value = exercise({ name: "PVC pass-through", category: "Warm Up", pattern: "Mobility", equipment: ["PVC pipe"], muscleGroups: ["Shoulders, rotator cuff, chest, upper back"], prescriptionType: "stretch" });
  const before = structuredClone(value);
  const classification = classifyLegacyExercise(value);
  assert.deepEqual(classification, { version: 1, exerciseType: "mobility", movementFocus: "shoulder_mobility", equipment: ["pvc_pipe"], muscles: ["shoulders", "rotator_cuff", "chest", "upper_back"], commonUses: ["warm_up"], review: [] });
  assert.deepEqual(value, before);
  assert.equal(getExercisePrescriptionType(value), "stretch");
  assert.equal(getExercisePrescriptionType({ ...value, prescriptionType: "duration" }), "duration");
});
test("TRX aliases share one brand-neutral equipment identity", () => {
  for (const raw of ["TRX", " trx STRAPS ", "suspension trainer", "Suspension-straps", "TRX / Suspension Trainer"]) assert.equal(resolveOption(taxonomy.equipment, raw).value, "suspension_trainer");
  assert.deepEqual(classifyLegacyExercise(exercise()).equipment, ["suspension_trainer"]);
  assert.equal(classifyLegacyExercise(exercise()).exerciseType, "strength");
});
test("TRX rows and presses share equipment while retaining distinct patterns and target areas", () => {
  const row = exercise();
  const press = exercise({ name: "TRX Chest Press", pattern: "Push", muscleGroups: ["Chest", "Triceps"] });
  const facets = { ...emptyFacets, types: ["strength"], focuses: ["pull"], equipment: ["suspension_trainer"] };
  assert.equal(matchesExercise(row, "TRX", facets), true);
  assert.equal(matchesExercise(press, "TRX", facets), false);
  assert.equal(matchesExercise(press, "suspension trainer", { ...facets, focuses: ["push"] }), true);
});
test("facets use OR within equipment and AND across type, focus, area and search", () => {
  const db = exercise({ name: "Dumbbell Row", category: "Strength", equipment: ["Dumbbells"] });
  const kb = exercise({ name: "Kettlebell Row", category: "Strength", equipment: ["Kettlebell"] });
  const facets = { ...emptyFacets, equipment: ["dumbbell", "kettlebell"], types: ["strength"], focuses: ["pull"] };
  assert(matchesExercise(db, "row back", facets)); assert(matchesExercise(kb, "row", facets)); assert(!matchesExercise(exercise(), "", facets));
  assert(!matchesExercise(db, "squat", facets));
  const pvc = exercise({ name: "PVC pass-through", category: "Warm Up", pattern: "Mobility", equipment: ["PVC"], muscleGroups: ["Shoulder"] });
  assert(matchesExercise(pvc, "", { ...emptyFacets, types: ["mobility"], equipment: ["pvc_pipe"], muscles: ["shoulders"] }));
});
test("changing type clears incompatible filter focuses and keeps other facets", () => {
  const next = changeFacet({ ...emptyFacets, focuses: ["pull", "hip_mobility"], equipment: ["suspension_trainer"] }, "types", ["mobility"]);
  assert.deepEqual(next.focuses, ["hip_mobility"]); assert.deepEqual(next.equipment, ["suspension_trainer"]);
  assert.deepEqual(changeFacet(next, "types", []).equipment, next.equipment);
});
test("editor schema rejects incompatible focus, unknown IDs, duplicates and contradictory no-equipment", () => {
  const valid = classifyLegacyExercise(exercise());
  for (const value of [{ ...valid, exerciseType: "mobility" }, { ...valid, equipment: ["trx"] }, { ...valid, muscles: ["back", "back"] }, { ...valid, equipment: ["none", "suspension_trainer"] }]) assert(!classificationSchema.safeParse(value).success);
  assert(classificationSchema.safeParse({ ...valid, exerciseType: "cardio", movementFocus: null }).success);
});
test("unknown legacy text is retained and flagged; generic mobility is not assigned an invented focus", () => {
  const original = exercise({ name: "Custom drill", category: "Mystery", pattern: "Unusual", equipment: ["Odd tool; Dumbbells"], muscleGroups: ["Odd area | Upper Back"], tags: ["automation-key"] });
  const copy = structuredClone(original); const result = classifyLegacyExercise(original);
  assert.equal(result.exerciseType, null); assert.equal(result.movementFocus, null);
  assert.deepEqual(result.equipment, ["dumbbell"]); assert.deepEqual(result.muscles, ["upper_back"]);
  assert(result.review.some((value) => value.includes("Odd tool"))); assert(result.review.some((value) => value.includes("Odd area")));
  assert.deepEqual(original, copy);
  assert.equal(classifyLegacyExercise(exercise({ name: "General mobility", pattern: "Mobility" })).movementFocus, null);
});
test("normalizes delimiters, duplicates, spacing and case while preserving anatomical specificity", () => {
  const result = classifyLegacyExercise(exercise({ equipment: ["trx straps, TRX", "Dumbbells; dumbbell"], muscleGroups: ["Rotator CUFF | upper-back; Lats", "Quads, Hip flexors"] }));
  assert.deepEqual(result.equipment, ["suspension_trainer", "dumbbell"]);
  assert.deepEqual(result.muscles, ["rotator_cuff", "upper_back", "lats", "quadriceps", "hip_flexors"]);
});
test("empty and unknown equipment never match No equipment; TRX bodyweight still requires straps", () => {
  const filter = { ...emptyFacets, equipment: ["none"] };
  for (const value of [exercise({ equipment: [] }), exercise({ equipment: ["Bodyweight"] }), exercise({ name: "Custom", category: "Unknown", pattern: "", equipment: [] })]) assert(!matchesExercise(value, "", filter));
  assert(matchesExercise(exercise({ name: "Push-up", category: "Bodyweight", pattern: "Push", equipment: [], tags: [] }), "", filter));
});
test("backfill plans preserve IDs, relation references and all legacy columns and rerun idempotently", () => {
  const row = { id: "original-id", name: "PVC pass-through", category: "Warm Up", movement_pattern: "Mobility", equipment: ["PVC pipe"], muscle_groups: ["Shoulders"], exercise_tags: [{ tag: "custom" }], updated_at: "2026-11-20T12:00:00Z", instructions: "Verbatim, including comma.", coaching_cues: ["Cue, with comma"], prescription_type: "stretch", workout_references: ["saved", "assigned", "history"] };
  const copy = structuredClone(row); const plan = planExerciseBackfill(row);
  assert.equal(plan.id, row.id); assert.equal(plan.expectedUpdatedAt, row.updated_at);
  assert.deepEqual(row, copy);
  assert.equal(planExerciseBackfill({ ...row, classification: plan.classification }), null);
  assert.deepEqual(getClassification(exercise({ classification: classifyLegacyExercise(exercise()) })), classifyLegacyExercise(exercise()));
});
test("round-trip coaching lists retain commas, blank values and original instructions", () => {
  const value = exercise({ classification: classifyLegacyExercise(exercise()) });
  assert.deepEqual(coachingLines(value.cues.join("\n"), value.cues), value.cues);
  assert.deepEqual(coachingLines("First cue, with comma\nSecond cue"), ["First cue, with comma", "Second cue"]);
  assert.equal(exerciseInputSchema.parse(value).instructions, value.instructions);
  assert(!exerciseInputSchema.safeParse({ ...value, name: " " }).success);
});
