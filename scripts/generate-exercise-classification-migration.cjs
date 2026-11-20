/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const path = require("node:path");
const catalog = require("../src/lib/exercise-taxonomy.json");
const migration = `-- Generated from src/lib/exercise-taxonomy.json; regenerate with the matching script.
-- Additive only. Backfill is a separate, dry-run-first operational script.
begin;
alter table public.exercises add column if not exists classification jsonb;

create or replace function public.valid_exercise_classification(c jsonb)
returns boolean language plpgsql immutable strict set search_path = public as $function$
declare
  catalog constant jsonb := $catalog$${JSON.stringify(catalog)}$catalog$::jsonb;
  dimension text;
  entry jsonb;
  option_found boolean;
begin
  if jsonb_typeof(c) <> 'object' or (select count(*) from jsonb_object_keys(c)) <> 7
    or not (c ?& array['version','exerciseType','movementFocus','equipment','muscles','commonUses','review'])
    or c->'version' <> '1'::jsonb then return false; end if;
  if c->'exerciseType' <> 'null'::jsonb and not exists (
    select 1 from jsonb_array_elements(catalog->'types') o where o->>'value' = c->>'exerciseType'
  ) then return false; end if;
  if c->'movementFocus' <> 'null'::jsonb and not exists (
    select 1 from jsonb_array_elements(catalog->'focuses') o where o->>'value' = c->>'movementFocus' and o->>'type' = c->>'exerciseType'
  ) then return false; end if;
  foreach dimension in array array['equipment','muscles','commonUses','review'] loop
    if jsonb_typeof(c->dimension) <> 'array' then return false; end if;
    if jsonb_array_length(c->dimension) > (case when dimension = 'review' then 200 else 50 end) then return false; end if;
    if dimension <> 'review' and (select count(*) <> count(distinct v) from jsonb_array_elements(c->dimension) v) then return false; end if;
    for entry in select * from jsonb_array_elements(c->dimension) loop
      if jsonb_typeof(entry) <> 'string' then return false; end if;
      if dimension = 'review' then
        if length(entry #>> '{}') > 2000 then return false; end if;
      else
        select exists(select 1 from jsonb_array_elements(catalog->dimension) o where o->'value' = entry) into option_found;
        if not option_found then return false; end if;
      end if;
    end loop;
  end loop;
  if c->'equipment' @> '["none"]'::jsonb and jsonb_array_length(c->'equipment') > 1 then return false; end if;
  return true;
end;
$function$;

do $constraint$
begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.exercises'::regclass and conname = 'exercises_classification_valid') then
    alter table public.exercises add constraint exercises_classification_valid check (classification is null or public.valid_exercise_classification(classification));
  end if;
end;
$constraint$;
comment on column public.exercises.classification is 'Versioned canonical codes. NULL uses the legacy compatibility reader. Legacy columns and tags remain recoverable.';
commit;
`;
const target = path.join(__dirname, "../supabase/exercise-classification-migration.sql");
if (process.argv.includes("--check")) {
  if (fs.readFileSync(target, "utf8") !== migration) throw new Error("Classification migration differs from canonical vocabulary. Regenerate it.");
  console.log("Classification migration matches canonical vocabulary.");
} else fs.writeFileSync(target, migration);
