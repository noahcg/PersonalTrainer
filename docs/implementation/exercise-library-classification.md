# Exercise classification — 0.38.0

## Model and scope

The repository stores equipment and muscles as text arrays, category/pattern as text, and tags in `exercise_tags`. Workout exercises reference the stable exercise UUID with `ON DELETE RESTRICT`. Trainer/client workout readers previously duplicated their exercise serializers. Creation used browser inserts while updates used a privileged trainer endpoint and replaced tags in separate requests.

The new nullable `exercises.classification` JSONB column holds version 1 canonical codes for exercise type, one optional movement/focus, ordered equipment and muscle lists, optional common uses, and migration review notes. This follows the existing array/JSON conventions without introducing junction-table writes. The single-row create/update is atomic. Canonical vocabulary and aliases live in `src/lib/exercise-taxonomy.json`; shared Zod validation checks the form and API, and a generated SQL constraint checks direct database writes. Regenerate the migration after intentional vocabulary changes and run `npm run exercise:taxonomy:check`. Keep existing canonical codes stable; removing a code requires a separate data audit/migration.

The initial types are Strength, Mobility, Cardio, and Plyometric. Existing fixtures do not justify a separate Stability & balance type; core stabilization covers the existing strength records. Focus is optional and contextual. Changing type in the editor retains an incompatible prior focus until the trainer explicitly removes/replaces it; saving is blocked meanwhile. Type filter changes remove incompatible focus filters while retaining the other facets.

`none` means explicitly No equipment. An empty equipment list means unspecified, not bodyweight. It never matches the No equipment filter. Forms prevent `none` alongside tools; the API and SQL reject contradictory values. The equipment filter can combine No equipment OR other options, as with other facets.

## Legacy mappings and retained data

- Exact aliases normalize case, spacing, common punctuation, plurals, and comma/semicolon/pipe-delimited values. TRX / TRX straps / suspension trainer / suspension straps share `suspension_trainer`. Legacy TRX category, name, or tags also establish that equipment; explicit bodyweight alongside TRX never removes the straps.
- Warm Up / Cool Down map to common use, not type. Mobility / Stretch patterns establish Mobility type. Known strength patterns and legacy strength/free-weight/bodyweight/core categories establish Strength. Cardio / Conditioning establishes Cardio. Arbitrary tags do not establish exercise type.
- Reviewed exact-name focus mappings: PVC pass-through → shoulder mobility; World's Greatest Stretch → full-body mobility; Cat-Cow to T-Spine Reach → spinal mobility; Couch Stretch Breathing → hip mobility; Glute Bridge March → strength/core stabilization. Other generic mobility/activation records retain an unset focus and a review note rather than an invented classification.
- Upper back, rotator cuff, lats, thoracic spine, hip flexors, and other distinct areas remain separate codes. Unrecognized terms remain in the original columns and in review notes. Missing/ambiguous types remain nullable for existing records, so the trainer can still edit coaching content. New records require a type and an explicit equipment choice.
- Existing category, pattern, equipment, muscle arrays, and all `exercise_tags` are untouched on edit/backfill. They remain visible in the editor's Original classification disclosure. Review notes are retained as migration provenance; they are not automatically cleared by saving. A future review/cleanup release can add explicit sign-off once production records have been inspected.
- Instructions are saved verbatim. Coaching lists use one item per line; unchanged lists retain their original array entries, including embedded commas. Prescription, difficulty, substitutions, regressions, progressions, and media are retained. Classification changes do not recalculate prescription styles or any existing workout prescriptions.
- The library, picker, exercise detail, and client reference use the shared canonical presentation. Existing tags remain searchable and still support saved workout tag filters; they are no longer a duplicate editable taxonomy field.
- Library reads use stable 500-row pages instead of silently stopping at PostgREST's default row limit. The UI renders 60 results at a time; normalized classification/search text is cached per immutable exercise object. Workout readers fetch only referenced, distinct exercise IDs in batches of 200. Phone filters expand on demand so results stay accessible above the fold.
- Trainer authentication is required for both create/update endpoints. Global-reference editing retains the previous trainer authorization behavior; another trainer's custom records remain inaccessible. Existing RLS policies and deletion restrictions are unchanged.

## Deployment and backfill

1. Apply `supabase/exercise-classification-migration.sql` to a staging database, then production through the normal reviewed migration process. It only adds a nullable column and validation function/constraint. Apply it after `schema.sql` for a fresh install as well. It does not modify exercise IDs, legacy data, workout tables, prescriptions, or security policies. It can be rerun.
2. Deploy the app. Readers accept missing/null classification and normalize legacy fields, including before migration; writers require the migration and report a failed save without discarding the draft if it is absent. Existing rows do not need to be backfilled before the UI works.
3. With approved target credentials in the environment, run a dry-run: `node --env-file=.env.local scripts/backfill-exercise-classification.cjs --report /tmp/exercise-classification-review.json`. Inspect the target environment and review report. No database writes occur without `--apply`.
4. Once the report is reviewed, run the same command with `--apply`. The backfill pages 500 records at a time and changes only classification where it is still NULL and `updated_at` still matches the read value. Concurrent edits are counted and skipped. Rerunning skips already classified rows. Retain the review report and resolve uncertain records with the trainer. It is safe to interrupt and rerun; completed rows do not need to be reverted.
5. Keep legacy columns and tags through this rollout. An older application can still read them, although its legacy classification display will not reflect canonical edits. Do not run an older writer alongside the new classification editor indefinitely. Any future dual-write/cleanup requires a separately reviewed data-parity audit.

No production migration or backfill is run as part of this implementation.

## Validation

Implementation checks passed: 23 unit/API/reader tests; 36 feature browser checks across Chromium, WebKit, and Mobile Chrome; isolated PostgreSQL migration checks; lint; TypeScript; production build; version and vocabulary checks. Browser coverage includes existing trainer and client reference links and scrollable option lists.

- `npm test`: normalization, aliases, facets, unknown values, contradictory equipment, contextual focus validation, backfill idempotency, and coaching retention.
- `npm run exercise:taxonomy:check`, `npm run version:check`, `npm run lint`, `npx tsc --noEmit`, `npm run build`.
- `e2e/exercise-library.spec.ts`: demo create/edit/reload, PVC mapping, TRX filtering, OR/AND facets, keyboard selection/removal, unsaved changes, field errors, legacy review, workout-picker selection, and unauthenticated API rejection.
- Disposable PostgreSQL test: `node scripts/test-exercise-classification-db.cjs --container=personaltrainer-classification-test`. This is restricted to the named isolated container; it applies the migration twice, validates all canonical options and invalid combinations, and checks legacy/coaching/prescription data, reference constraints, and existing RLS policies. It does not connect to the app database.

The browser suite uses the established demo environment. Authenticated production create/edit and a live production backfill must be verified during staged rollout; demo-mode browser checks do not establish those results.

The full pre-existing browser suite was also run: 60 passed and six stale smoke assertions failed (two routes in each of three browsers). `/trainer/plans` already redirects to `/trainer/workouts`, while the smoke test still expects Training plans / Plan workspace; `/trainer/workouts` already has the heading Workouts, while the smoke test expects Workout builder. These unchanged route behaviors were confirmed against HEAD. The feature's dedicated browser checks pass separately. Desktop and 375px phone layouts were visually reviewed with no horizontal overflow.
