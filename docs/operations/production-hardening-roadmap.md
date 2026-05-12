# Production Hardening Roadmap

This document is the long-term plan for taking `PersonalTrainer` from a strong custom prototype into a production-grade hosted platform for one trainer and many clients.

This is not a SaaS marketplace or a multi-trainer platform. It is a single-trainer business application for Nick Glushien Training. The trainer can manage as many clients as needed, and each client can have their own secure portal.

It is written for two readers:

- The owner should be able to understand what each phase is for and why it matters.
- Codex should be able to pick up a phase, inspect the right parts of the project, and help execute it safely.

Do not treat this document as permission to execute every item at once. Use it as the working roadmap. Each task should still be implemented in small, reviewable changes.

## Product Definition

This app is best defined as a production-grade, single-tenant training business platform.

The intended model:

- one trainer business: Nick Glushien Training
- one private trainer workspace
- many client accounts
- each client only sees their own assigned workouts, plans, resources, messages, check-ins, and profile data
- the trainer can manage all clients from one authenticated workspace
- the application is hosted on a real production domain
- the app is operated like a real production system with backups, monitoring, deployment discipline, and security checks

What this app is not:

- not a public SaaS platform for other trainers to sign up
- not a marketplace
- not a multi-tenant trainer subscription product
- not an app that needs organization provisioning, trainer self-signup, or trainer-to-trainer tenant isolation

## Current App State

The application is already much more than a static mockup. It includes:

- a public marketing site for Nick Glushien Training
- a trainer workspace
- a client workspace
- invite-based client onboarding
- Supabase-backed auth and data when environment variables are configured
- demo fallback behavior for local UI/product work
- trainer client management
- packages and client package assignment
- messages and check-ins
- bulletin board posts and RSVP behavior
- training plans
- workout builder
- exercise library
- resources
- profile photo upload
- client workout views and logging

The current app should be thought of as a strong custom prototype or early production candidate. It is not yet fully production-hardened because the production operating layer still needs more proof and structure:

- production deployment needs to be finalized
- monitoring needs to be connected and verified
- backup and recovery expectations need to be documented
- Supabase row-level security needs a focused audit
- client data isolation needs to be verified with real client accounts
- demo fallback behavior needs to be clearly separated from production behavior
- migrations need to become more disciplined
- automated tests need broader workflow coverage
- payment handling needs a clear decision if client billing moves into the app

Existing related docs:

- `docs/operations/production-readiness.md`
- `docs/operations/launch-checklist.md`
- `docs/testing/trainer-ui-ux-testing-plan.md`
- `docs/testing/trainer-workflow-matrix.md`
- `docs/testing/trainer-test-data-and-edge-cases.md`

## Conservative Build Value Estimate

A conservative freelancer build estimate for the current application is roughly `$50k-$90k`.

That estimate assumes a competent freelancer or small senior contractor building:

- a custom Next.js web application
- a branded public site
- a private trainer workspace
- secure client portals
- Supabase auth and database workflows
- invite-based onboarding
- CRUD workflows across clients, workouts, exercises, plans, packages, resources, check-ins, and messages
- responsive UI polish
- enough product design judgment to make the app usable instead of just functional

This is not an invoice, appraisal, or promise of market value. It is a practical planning estimate based on the amount of custom product, engineering, integration, and polish already present.

The cost to make the app production-grade from here depends on launch scope. A careful path should prioritize stability, client data privacy, deployment discipline, and core workflow coverage before adding large new features.

## Definition Of Production-Grade

For this project, production-grade means:

- the app runs on a real production domain
- production environment variables are managed only through the hosting provider
- Supabase auth redirects are configured for the production domain
- the trainer account can access the full trainer workspace
- each client account can only access its own client data
- RLS policies are reviewed and tested for every sensitive table
- no critical production workflow depends on demo data
- email delivery works reliably through the production sender domain
- error monitoring is live for server and client errors
- uptime monitoring is live
- backups and recovery expectations are documented
- migrations are tracked and applied intentionally
- core trainer and client workflows have regression coverage
- launch and rollback steps are documented
- client billing rules are clear if payments are handled inside the app
- the product can be maintained without relying on memory or undocumented assumptions

## Phase 1: Stabilize The Current Product

Goal: make the current product dependable before adding more operational complexity.

- [ ] Review all pages for outdated placeholder names, temporary copy, and demo-only language.
- [ ] Confirm that production-facing dialogs do not mention implementation details such as Supabase.
- [ ] Audit every trainer route for clear empty states and save/error feedback.
- [ ] Audit every client route for clear empty states and save/error feedback.
- [ ] Review mobile layouts for trainer workflows that are likely to be used on a tablet or phone.
- [ ] Verify that the workout builder handles required warm up, three training sections, and cooldown cleanly.
- [ ] Verify that warm up and cool down exercise categories are available in demo data and Supabase seed data.
- [ ] Identify any screens still relying on static demo values when Supabase mode is active.
- [ ] Create a short issue list for UI polish that should happen before launch.

Acceptance criteria:

- The trainer can use the core product without seeing temporary naming, implementation-specific copy, or obvious prototype seams.
- Known demo/static areas are documented instead of hidden.
- No launch-blocking UI issue is left vague.

## Phase 2: Production Infrastructure

Goal: make the app real on production services.

Use `docs/operations/production-readiness.md` and `docs/operations/launch-checklist.md` as the source of truth for launch setup.

- [ ] Confirm the production Supabase project and owner.
- [ ] Confirm the Vercel project and owner.
- [ ] Confirm the production domain and DNS owner.
- [ ] Confirm the Resend account and sender domain.
- [ ] Set production environment variables in Vercel.
- [ ] Configure production Supabase auth redirect URLs.
- [ ] Verify profile photo storage in production.
- [ ] Verify invite email delivery on the production domain.
- [ ] Configure basic uptime monitoring.
- [ ] Configure Sentry or another error-monitoring tool.
- [ ] Document who owns each external service account and recovery method outside the repo.

Acceptance criteria:

- The app is deployed to a production-like environment.
- Auth, invite links, email sending, and profile photo storage work outside local development.
- There is at least one way to know when production is broken.

## Phase 3: Supabase, Security, And Client Data Isolation

Goal: prove that clients can only access their own data and that trainer-only capabilities stay private to the trainer.

- [ ] Inventory all Supabase tables used by the app.
- [ ] Identify which tables contain trainer-owned data, client-owned data, shared data, and global seed data.
- [ ] Review RLS policies for every sensitive table.
- [ ] Test the trainer account can access all expected trainer workspace data.
- [ ] Test client account A cannot access client account B data.
- [ ] Test a client cannot access trainer-only routes or APIs.
- [ ] Test a trainer cannot accidentally reuse the trainer email as a client account.
- [ ] Verify service-role usage is limited to server routes that truly require it.
- [ ] Verify server routes validate ownership before insert, update, or delete operations.
- [ ] Document any tables that intentionally allow public or global reads.

Acceptance criteria:

- Access rules are explicit and tested.
- Sensitive server routes validate both authentication and ownership.
- There is no known path for one client to read another client's private data.
- There is no known path for a client to access trainer-only functionality.

## Phase 4: Testing And Regression Protection

Goal: stop core workflows from breaking silently.

- [ ] Keep `npm run lint` passing.
- [ ] Keep `npm run build` passing.
- [ ] Add Playwright coverage for trainer login and dashboard access.
- [ ] Add Playwright coverage for trainer client creation.
- [ ] Add Playwright coverage for invite/setup flow in a production-like environment.
- [ ] Add Playwright coverage for creating an exercise.
- [ ] Add Playwright coverage for creating and saving a workout.
- [ ] Add Playwright coverage for assigning or viewing a training plan.
- [ ] Add Playwright coverage for client login and viewing assigned work.
- [ ] Add focused tests for high-risk server routes touching auth, invites, client deletion, and workouts.
- [ ] Keep test data documented in `docs/testing`.

Acceptance criteria:

- The most important trainer and client workflows can be checked repeatedly.
- A future Codex session can run the documented checks before and after changes.
- High-risk auth and ownership regressions are more likely to be caught before deployment.

## Phase 5: Migration And Data Discipline

Goal: make backend changes predictable and recoverable.

- [ ] Decide the official migration workflow for Supabase changes.
- [ ] Separate one-time seed data from schema changes.
- [ ] Keep deterministic global seed data documented.
- [ ] Avoid making live database changes without also updating repo SQL.
- [ ] Document how to apply schema updates to a fresh Supabase project.
- [ ] Document how to verify a migration succeeded.
- [ ] Document backup expectations before risky schema changes.
- [ ] Create a rollback note for any destructive or irreversible migration.

Acceptance criteria:

- A fresh project can be created from repo instructions.
- Production schema changes are not dependent on memory.
- Risky database changes have a recovery plan before they are applied.

## Phase 6: Client Billing Decision

Goal: decide whether the app itself handles client payments.

This phase can wait until the business model is clear. If billing stays outside the app, document that decision and keep this phase small.

- [ ] Decide whether client payments will be handled inside the app.
- [ ] If billing is in-app, choose Stripe as the default provider unless there is a strong reason not to.
- [ ] Decide whether clients pay for packages, subscriptions, invoices, or offline arrangements.
- [ ] Decide whether unpaid clients lose portal access or are handled manually.
- [ ] Add billing tables only after the product rules are clear.
- [ ] Add Stripe webhooks only after payment lifecycle rules are written down.
- [ ] Add trainer visibility for client payment state if needed.

Acceptance criteria:

- The app has a clear billing decision.
- If payments move into the product, client access and payment states are predictable.
- Billing implementation does not begin before business rules are settled.

## Phase 7: Observability, Support, And Operations

Goal: make production problems visible and diagnosable.

- [ ] Capture server errors with useful route context.
- [ ] Capture client-side errors with useful page context.
- [ ] Track invite failures.
- [ ] Track save failures on high-value workflows like workouts, plans, exercises, resources, and clients.
- [ ] Track email delivery failures.
- [ ] Add basic analytics for important product events if useful.
- [ ] Document a support workflow for client login or invite issues.
- [ ] Document how to manually verify a trainer/client relationship in Supabase.
- [ ] Document what to check first when production auth breaks.

Acceptance criteria:

- Production failures are visible without waiting for a user to describe them.
- Common support issues have a repeatable troubleshooting path.
- The owner can understand what broke, where to look, and what to escalate.

## Phase 8: Scale Readiness And Maintenance

Goal: prepare the app to support many clients without becoming fragile.

- [ ] Review slow pages and expensive data loading patterns.
- [ ] Add pagination or filtering where client, message, workout, resource, or check-in lists can grow large.
- [ ] Review image and file storage usage.
- [ ] Review database indexes for common queries.
- [ ] Review API routes for duplicate validation or repeated ownership checks.
- [ ] Extract shared helpers only when duplication is causing real risk.
- [ ] Keep versioning disciplined and reserve `1.0.0` for intentional launch.
- [ ] Maintain a changelog or release notes once real clients depend on the app.

Acceptance criteria:

- Larger client lists and workout history do not make common pages difficult to use.
- Maintenance work is guided by measured problems instead of speculative rewrites.
- The app has a clear path for ongoing releases.

## Codex Execution Rules

When using Codex to execute this roadmap:

- Always inspect `AGENTS.md` before code changes.
- Because this project uses Next.js 16, read relevant guidance in `node_modules/next/dist/docs/` before changing Next.js routing, server actions, config, metadata, or app structure.
- Prefer small, reviewable changes over broad rewrites.
- Do not overwrite unrelated user changes.
- Treat auth, invites, client deletion, RLS, and service-role routes as high-risk.
- For meaningful code changes, run `npm run lint`.
- For changes that affect routing, build behavior, server routes, or production workflows, run `npm run build`.
- For UI changes, directly check the affected trainer or client routes.
- For database changes, update repo SQL and document how the change should be applied.
- For production service changes, document what changed and how to verify it.

## Working Backlog

### Product Polish

- [ ] Review all trainer screens for spacing, responsive behavior, and confusing copy.
- [ ] Review all client screens for spacing, responsive behavior, and confusing copy.
- [ ] Make empty states useful and action-oriented.
- [ ] Make save states consistent across dialogs and pages.
- [ ] Make error messages human-readable without exposing internal service names.

### Auth And Onboarding

- [ ] Verify login redirects for trainer and client roles.
- [ ] Verify invite setup from a fresh browser session.
- [ ] Verify expired or invalid invite behavior.
- [ ] Verify password reset behavior.
- [ ] Verify trainer/client role separation after setup.

### Supabase Schema And Migrations

- [ ] Convert any remaining ad hoc schema changes into documented SQL.
- [ ] Confirm seed data is safe to run repeatedly where intended.
- [ ] Document how to create a fresh working Supabase project.
- [ ] Document how production schema changes are applied.

### Security And RLS

- [ ] Audit RLS policies.
- [ ] Audit server routes using the service-role key.
- [ ] Add ownership checks where missing.
- [ ] Test cross-client access attempts.
- [ ] Test client attempts to access trainer-only APIs.
- [ ] Confirm sensitive environment variables are not exposed client-side.

### Testing

- [ ] Keep lint and build clean.
- [ ] Add Playwright coverage for critical trainer workflows.
- [ ] Add Playwright coverage for critical client workflows.
- [ ] Add route-level tests or checks for high-risk APIs.
- [ ] Keep test data and edge cases documented.

### Email And Notifications

- [ ] Verify Resend sender domain.
- [ ] Verify invite email copy and links.
- [ ] Verify delivery failure visibility.
- [ ] Decide whether reminders need email, SMS, or in-app notifications.

### Monitoring

- [ ] Add Sentry or equivalent monitoring.
- [ ] Add uptime monitoring.
- [ ] Add alert destination ownership.
- [ ] Document the first checks to run during an outage.

### Deployment

- [ ] Configure Vercel production environment.
- [ ] Confirm preview deployment behavior.
- [ ] Confirm production domain and redirects.
- [ ] Document launch and rollback steps.

### Billing

- [ ] Decide whether client billing belongs inside the app.
- [ ] Define payment states before implementation.
- [ ] Add Stripe only after the lifecycle rules are clear.
- [ ] Decide what happens to a client's portal access when payment is overdue.

### Documentation

- [ ] Keep `README.md` accurate.
- [ ] Keep `docs/operations/production-readiness.md` accurate.
- [ ] Keep `docs/operations/launch-checklist.md` accurate.
- [ ] Add notes after each major production decision.

## How To Use This Roadmap

Work through the phases in order unless there is a specific business reason to jump ahead.

For each future Codex session:

1. Pick one small task or one clearly bounded group of tasks.
2. Ask Codex to inspect the relevant files first.
3. Ask Codex to implement only that task.
4. Run the documented checks.
5. Update this roadmap or the launch checklist when reality changes.

The goal is not to make the app complicated. The goal is to make it dependable enough that the trainer and real clients can use it without the product relying on fragile assumptions.
