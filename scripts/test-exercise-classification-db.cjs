/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { loadTypeScript } = require("./load-typescript.cjs");
const { taxonomy, classifyLegacyExercise } = loadTypeScript(path.join(__dirname, "../src/lib/exercise-classification.ts"));
const container = process.argv.find((arg) => arg.startsWith("--container="))?.split("=")[1];
if (!container || !/^personaltrainer-classification-test$/.test(container)) throw new Error("Run only in the disposable personaltrainer-classification-test container: --container=personaltrainer-classification-test");
function sql(source) {
  const result = spawnSync("docker", ["exec", "-i", container, "psql", "-U", "postgres", "-v", "ON_ERROR_STOP=1", "-At"], { input: source, encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr || result.error?.message);
  return result.stdout.trim();
}
const quote = (value) => `'${JSON.stringify(value).replaceAll("'", "''")}'::jsonb`;
sql(`create table if not exists public.exercises (
  id uuid primary key, name text, category text, movement_pattern text, equipment text[], muscle_groups text[],
  instructions text, coaching_cues text[], mistakes_to_avoid text[], prescription_type text,
  difficulty text, updated_at timestamptz default now()
);
create table if not exists public.classification_test_workout_references (exercise_id uuid references public.exercises(id) on delete restrict);
alter table public.exercises enable row level security;
drop policy if exists classification_test_read on public.exercises;
create policy classification_test_read on public.exercises for select using (true);
insert into public.exercises(id,name,category,movement_pattern,equipment,muscle_groups,instructions,coaching_cues,prescription_type,difficulty)
values ('00000000-0000-0000-0000-000000000001','PVC pass-through','Warm Up','Mobility',array['PVC pipe'],array['Shoulders','rotator cuff','chest','upper back'],'Original instructions, with comma.',array['Original cue, with comma'],'stretch','beginner') on conflict do nothing;
delete from public.classification_test_workout_references;
insert into public.classification_test_workout_references values ('00000000-0000-0000-0000-000000000001');`);
const migration = fs.readFileSync(path.join(__dirname, "../supabase/exercise-classification-migration.sql"), "utf8");
sql(migration); sql(migration);
const base = { version: 1, exerciseType: "strength", movementFocus: "pull", equipment: ["suspension_trainer"], muscles: ["back", "biceps"], commonUses: [], review: [] };
for (const value of [base, ...taxonomy.focuses.map((focus) => ({ ...base, exerciseType: focus.type, movementFocus: focus.value })), ...taxonomy.equipment.map((option) => ({ ...base, equipment: [option.value] })), ...taxonomy.muscles.map((option) => ({ ...base, muscles: [option.value] }))]) assert.equal(sql(`select public.valid_exercise_classification(${quote(value)});`), "t");
for (const value of [{ ...base, exerciseType: "trx" }, { ...base, exerciseType: "mobility" }, { ...base, equipment: ["trx"] }, { ...base, equipment: ["none", "dumbbell"] }, { ...base, muscles: ["back", "back"] }, { ...base, equipment: "Dumbbell" }, { ...base, version: null }]) assert.equal(sql(`select public.valid_exercise_classification(${quote(value)});`), "f");
const value = classifyLegacyExercise({ name: "PVC pass-through", category: "Warm Up", pattern: "Mobility", equipment: ["PVC pipe"], muscleGroups: ["Shoulders", "rotator cuff", "chest", "upper back"], tags: [] });
sql(`update public.exercises set classification=${quote(value)} where id='00000000-0000-0000-0000-000000000001' and classification is null;`);
assert.equal(sql("select count(*) from public.exercises where classification is null;"), "0");
assert.equal(sql("select count(*) from public.classification_test_workout_references r join public.exercises e on r.exercise_id=e.id where e.prescription_type='stretch' and e.instructions='Original instructions, with comma.' and e.coaching_cues=array['Original cue, with comma'] and e.category='Warm Up' and e.equipment=array['PVC pipe'];"), "1");
assert.equal(sql("select relrowsecurity from pg_class where oid='public.exercises'::regclass;"), "t");
assert.equal(sql("select count(*) from pg_policies where tablename='exercises' and policyname='classification_test_read';"), "1");
sql(`do $test$ begin
  begin
    update public.exercises set classification=${quote({ ...base, equipment: ["invalid"] })};
    raise exception 'Expected classification constraint violation';
  exception when check_violation then null;
  end;
  begin
    delete from public.exercises;
    raise exception 'Expected retained workout reference constraint';
  exception when foreign_key_violation then null;
  end;
end; $test$;`);
console.log("PostgreSQL migration passed: idempotency, all canonical codes, invalid values, preserved legacy/coaching/prescription data, FK references and RLS policies.");
