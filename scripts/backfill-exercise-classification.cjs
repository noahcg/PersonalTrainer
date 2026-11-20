/* eslint-disable @typescript-eslint/no-require-imports */
const path = require("node:path");
const fs = require("node:fs");
const { createClient } = require("@supabase/supabase-js");
const { loadTypeScript } = require("./load-typescript.cjs");
const { planExerciseBackfill } = loadTypeScript(path.join(__dirname, "../src/lib/exercise-backfill.ts"));

async function main() {
  const apply = process.argv.includes("--apply");
  const reportIndex = process.argv.indexOf("--report");
  if (reportIndex >= 0 && !process.argv[reportIndex + 1]) throw new Error("Provide a path after --report.");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supply Supabase URL and service-role key through the environment. Dry-run is the default.");
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const report = [];
  let scanned = 0, planned = 0, updated = 0, skippedConcurrent = 0;
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await db.from("exercises").select("*, exercise_tags(tag)").order("id").range(offset, offset + 499);
    if (error) throw error;
    for (const row of data) {
      scanned++;
      const plan = planExerciseBackfill(row);
      if (!plan) continue;
      planned++;
      if (plan.classification.review.length) report.push({ id: row.id, name: row.name, review: plan.classification.review, original: { category: row.category, pattern: row.movement_pattern, equipment: row.equipment, muscles: row.muscle_groups, tags: row.exercise_tags } });
      if (apply) {
        // Compare-and-set prevents overwriting trainer classification or concurrent edits.
        const result = await db.from("exercises").update({ classification: plan.classification }).eq("id", plan.id).is("classification", null).eq("updated_at", plan.expectedUpdatedAt).select("id");
        if (result.error) throw result.error;
        if (result.data.length) updated++; else skippedConcurrent++;
      }
    }
    if (data.length < 500) break;
  }
  if (reportIndex >= 0) fs.writeFileSync(process.argv[reportIndex + 1], JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", scanned, planned, updated, skippedConcurrent, needingReview: report.length }));
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
