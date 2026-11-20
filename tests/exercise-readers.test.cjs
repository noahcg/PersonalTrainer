/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { createTypeScriptLoader } = require("../scripts/load-typescript.cjs");
const row = (id) => ({ id, trainer_id: "trainer", is_global: false, name: "PVC pass-through", category: "Warm Up", movement_pattern: "Mobility", equipment: ["PVC pipe"], muscle_groups: ["Shoulders"], difficulty: "beginner", instructions: "Verbatim, instructions.", coaching_cues: ["Original, cue"], mistakes_to_avoid: ["Original mistake"], substitutions: ["Alternative"], regressions: ["Regression"], progressions: ["Progression"], demo_url: "", prescription_type: "stretch", exercise_tags: [{ tag: "custom automation" }] });
function readers(db) {
  const load = createTypeScriptLoader({ "@/lib/demo-data": { exercises: [] }, "@/lib/auth-server": { isSupabaseConfigured: () => true }, "@/lib/supabase-server": { createClient: async () => db } });
  return load(path.join(__dirname, "../src/lib/exercises.ts"));
}
test("shared serializer retains coaching, prescription, tags, progressions and stable identity", () => {
  const { fromExerciseRow } = readers({});
  const source = row("stable-id"); const result = fromExerciseRow(source);
  assert.equal(result.id, source.id); assert.equal(result.instructions, source.instructions); assert.deepEqual(result.cues, source.coaching_cues); assert.equal(result.prescriptionType, "stretch");
  assert.deepEqual(result.progressions, source.progressions); assert.deepEqual(result.regressions, source.regressions); assert.deepEqual(result.tags, ["custom automation"]);
});
test("trainer library loads past the PostgREST 1000-row default cap", async () => {
  const rows = Array.from({ length: 1201 }, (_, index) => row(String(index)));
  const ranges = [];
  const db = { auth: { getUser: async () => ({ data: { user: { id: "profile" } } }) }, from(table) {
    if (table === "trainers") return { select() { return this; }, eq() { return this; }, maybeSingle: async () => ({ data: { id: "trainer" } }) };
    return { select() { return this; }, or() { return this; }, order() { return this; }, range: async (start, end) => { ranges.push([start, end]); return { data: rows.slice(start, end + 1), error: null }; } };
  } };
  const result = await readers(db).getTrainerExercises();
  assert.equal(result.exercises.length, 1201); assert.deepEqual(ranges, [[0, 499], [500, 999], [1000, 1499]]);
});
test("workout references fetch only the distinct required IDs, in bounded chunks", async () => {
  const requests = [];
  const db = { from() { return { select() { return this; }, in: async (column, ids) => { requests.push(ids); return { data: ids.map(row), error: null }; } }; } };
  const ids = [...Array.from({ length: 401 }, (_, index) => String(index)), "1"];
  const result = await readers(db).getExerciseRowsByIds(db, ids);
  assert.equal(result.length, 401); assert.deepEqual(requests.map((request) => request.length), [200, 200, 1]);
});
test("a failed library fetch is an error, not a successful empty library", async () => {
  const db = { auth: { getUser: async () => ({ data: { user: { id: "profile" } } }) }, from(table) {
    if (table === "trainers") return { select() { return this; }, eq() { return this; }, maybeSingle: async () => ({ data: { id: "trainer" } }) };
    return { select() { return this; }, or() { return this; }, order() { return this; }, range: async () => ({ data: null, error: { message: "offline" } }) };
  } };
  assert.match((await readers(db).getTrainerExercises()).error, /could not be loaded/);
});
