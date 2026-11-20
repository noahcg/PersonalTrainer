/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { createTypeScriptLoader } = require("../scripts/load-typescript.cjs");
const classification = { version: 1, exerciseType: "strength", movementFocus: "pull", equipment: ["suspension_trainer"], muscles: ["back", "biceps"], commonUses: [], review: [] };
const payload = { name: "TRX Row", classification, difficulty: "Beginner", prescriptionType: "stretch", instructions: "Original, verbatim.\nSecond line.", cues: ["Pause, then lower"], mistakes: ["Shrugging"], substitutions: [], demoUrl: "" };
function setup({ user = { id: "user-a" }, trainer = { id: "trainer-a" }, existing = null, saveError = null } = {}) {
  const writes = []; let adminCreated = false;
  const result = { data: { id: "exercise-a" }, error: saveError };
  const writeChain = { eq() { return this; }, or() { return this; }, select() { return this; }, async single() { return result; } };
  const admin = { from(table) {
    assert.equal(table, "exercises", "Tags and exercise references must not be rewritten");
    return {
      select() { return { eq() { return { maybeSingle: async () => ({ data: existing, error: null }) }; } }; },
      update(row) { writes.push({ operation: "update", row }); return writeChain; },
      insert(row) { writes.push({ operation: "insert", row }); return writeChain; },
    };
  } };
  const load = createTypeScriptLoader({
    "@/lib/supabase-server": { createClient: async () => ({ auth: { getUser: async () => ({ data: { user } }) }, from: () => ({ select() { return this; }, eq() { return this; }, maybeSingle: async () => ({ data: trainer }) }) }) },
    "@/lib/supabase-admin": { hasSupabaseAdminEnv: () => true, createAdminClient: () => { adminCreated = true; return admin; } },
    "@/lib/exercises": { fromExerciseRow: (row) => ({ ...row, equipment: row.equipment ?? [], muscleGroups: row.muscle_groups ?? [], pattern: row.movement_pattern ?? "", tags: [] }) },
  });
  const { saveTrainerExercise } = load(path.join(__dirname, "../src/lib/exercise-save.ts"));
  return { save: (body = payload, id) => saveTrainerExercise(new Request("http://localhost/api/trainer/exercises", { method: id ? "PATCH" : "POST", body: JSON.stringify(body) }), id), writes, adminCreated: () => adminCreated };
}
test("anonymous and client accounts cannot invoke privileged exercise writes", async () => {
  for (const [options, status] of [[{ user: null }, 401], [{ trainer: null }, 403]]) {
    const run = setup(options); assert.equal((await run.save()).status, status); assert.equal(run.adminCreated(), false); assert.deepEqual(run.writes, []);
  }
});
test("another trainer's custom exercise cannot be edited", async () => {
  const run = setup({ existing: { id: "exercise-a", trainer_id: "trainer-b", is_global: false } });
  assert.equal((await run.save(payload, "exercise-a")).status, 404); assert.deepEqual(run.writes, []);
});
test("API rejects unknown IDs and incompatible focus without any database write", async () => {
  for (const value of [{ ...classification, equipment: ["arbitrary tool"] }, { ...classification, exerciseType: "mobility" }]) {
    const run = setup(); assert.equal((await run.save({ ...payload, classification: value })).status, 400); assert.deepEqual(run.writes, []);
  }
});
test("API create stores canonical classification and compatible legacy display values atomically", async () => {
  const run = setup(); assert.equal((await run.save()).status, 201); assert.equal(run.writes.length, 1);
  const row = run.writes[0].row;
  assert.equal(row.trainer_id, "trainer-a"); assert.equal(row.is_global, false); assert.equal(row.category, "Strength");
  assert.deepEqual(row.equipment, ["TRX / Suspension Trainer"]); assert.equal(row.prescription_type, "stretch"); assert.equal(row.instructions, payload.instructions);
});
test("API edits stable global/owned IDs in one write without overwriting legacy data or tags", async () => {
  for (const global of [false, true]) {
    const run = setup({ existing: { id: "exercise-a", trainer_id: global ? null : "trainer-a", is_global: global, name: "TRX Row", category: "TRX", movement_pattern: "Pull", equipment: ["Special legacy tool", "TRX straps"], muscle_groups: ["Back"] } });
    const response = await run.save(payload, "exercise-a"); assert.equal(response.status, 200); assert.equal(run.writes.length, 1);
    const row = run.writes[0].row;
    for (const key of ["id", "category", "movement_pattern", "equipment", "muscle_groups", "tags", "trainer_id", "is_global"]) assert.equal(key in row, false);
    assert.equal(row.instructions, payload.instructions); assert.deepEqual(row.coaching_cues, payload.cues); assert.equal(row.prescription_type, "stretch");
    assert(row.classification.review.includes("Equipment: Special legacy tool"));
  }
});
test("missing migration is reported as a failed save, without success response", async () => {
  const run = setup({ saveError: { message: "Could not find the classification column in schema cache" } });
  const response = await run.save(); assert.equal(response.status, 500); assert.match((await response.json()).error, /migration is required/);
});
