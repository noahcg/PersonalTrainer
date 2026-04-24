# Production Readiness

This document defines the minimum production stack and operational requirements for launching `PersonalTrainer` as a real application.

It is written to be used later as an execution guide, not just as reference.

## Launch Stack

### Required At Launch

- `Supabase`
  - Authentication
  - Postgres database
  - Storage for profile photos
  - Invite/setup flow
- `Vercel`
  - Next.js hosting
  - environment variable management
  - preview and production deployments
- `Custom domain`
  - production app domain
  - correct auth redirect origins
  - branded public-facing URLs
- `Resend`
  - transactional email delivery
  - client invites
  - future password reset / notification support
- `Legal pages`
  - Privacy Policy
  - Terms of Service

### Strongly Recommended In First Month

- `Sentry`
  - runtime error visibility
  - invite/auth/save failure tracking
- `Analytics`
  - recommended: `PostHog` for product analytics
  - lighter option: `Plausible` or `Vercel Analytics`
- `Uptime monitoring`
  - recommended: `Better Stack` or `UptimeRobot`
- `Operational backups / migration discipline`
  - migration workflow
  - backup verification
  - env var ownership and recovery

### Optional Later

- `Stripe`
  - if billing/subscriptions move into the app
- `SMS / push`
  - reminders and check-in nudges
- `Scheduling integration`
  - if booking/calendar workflows are added
- `Feature flags`
  - if staged rollouts become necessary

## Environment Variables

### Required

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
INVITE_FROM_EMAIL=
```

### Optional / Recommended

```env
INVITE_REPLY_TO_EMAIL=
SENTRY_DSN=
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=
```

## Service Ownership

When launch preparation begins, verify the owner/account for each external service:

- Supabase
- Vercel
- Domain registrar / DNS provider
- Resend
- Sentry
- Analytics provider

Track these details privately outside the repo:

- account owner
- billing owner
- recovery email
- MFA method
- shared access policy

## Application Areas Already Depending On Production Services

### Supabase-backed

- auth and role routing
- trainer/client profiles
- client invite generation
- messages
- check-ins
- plans and assignments
- workouts and workout logging
- exercise library CRUD
- resources
- profile photo upload/save
- client delete flow
- bulletin board and RSVP

### Still intentionally using demo/static data in places

These can remain for now, but should be reviewed before launch:

- trainer dashboard summary cards and sample activity
- portions of progress visualization
- some fallback/placeholder metrics on client-facing summary screens

## Launch Standards

Before calling the app launch-ready:

- no critical workflow depends on demo mode
- invite emails work on the production domain
- auth redirects use the production domain
- trainer and client accounts are isolated correctly
- profile photos persist correctly
- deletion/archive flows are intentional and verified
- error monitoring is live
- production env vars are set only in the host environment

## Operational Rules

- Keep `1.0.0` reserved for actual launch.
- Until launch, keep semver below `1.0.0`.
- Treat production auth/invite flows as high-risk; verify them in a fresh browser session after any related change.
- Never reuse trainer emails for client accounts.
- Any server route touching `auth.users`, `profiles`, or client deletion should be treated as sensitive and re-tested after changes.

## Recommended Launch Sequence

1. Finalize Supabase schema and verify seed-independent operation.
2. Configure Resend and confirm invite email delivery.
3. Deploy to Vercel preview with production-like env vars.
4. Connect the real domain.
5. Update Supabase redirect URLs and allowed origins.
6. Enable Sentry.
7. Perform end-to-end trainer/client acceptance testing.
8. Bump version to the agreed pre-launch release.
9. Launch only when `1.0.0` is intentionally chosen.
