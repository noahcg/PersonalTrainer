# Launch Checklist

Use this as the working execution checklist when preparing the app for production.

## 1. Accounts And Infrastructure

- [ ] Supabase production project exists
- [ ] Supabase billing/ownership is confirmed
- [ ] Vercel project exists
- [ ] Production domain is purchased and accessible
- [ ] DNS ownership is confirmed
- [ ] Resend account exists
- [ ] Resend billing/ownership is confirmed
- [ ] Sender domain is verified in Resend
- [ ] Sentry project exists

## 2. Environment Configuration

- [ ] `NEXT_PUBLIC_SUPABASE_URL` set in Vercel
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` set in Vercel
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set in Vercel
- [ ] `RESEND_API_KEY` set in Vercel
- [ ] `INVITE_FROM_EMAIL` set in Vercel
- [ ] `INVITE_REPLY_TO_EMAIL` set if needed
- [ ] `SENTRY_DSN` set if Sentry is enabled
- [ ] Production env vars are not committed into the repo

## 3. Supabase Configuration

- [ ] `supabase/schema.sql` has been applied to the production project
- [ ] required seed-independent baseline data exists
- [ ] auth redirect URLs include the production domain
- [ ] auth redirect URLs include preview domains only if intentionally allowed
- [ ] email templates / auth settings reviewed
- [ ] storage bucket for profile photos works
- [ ] RLS policies verified against real trainer/client sessions

## 4. Email / Invite Flow

- [ ] real invite emails send successfully through Resend
- [ ] invite links open the production domain
- [ ] client setup flow creates a password successfully
- [ ] client setup cannot downgrade a trainer account
- [ ] trainer email cannot be reused as a client email
- [ ] password reset behavior is confirmed

## 5. Core Workflow Verification

### Trainer

- [ ] trainer can log in
- [ ] trainer can edit settings
- [ ] trainer profile photo uploads and persists
- [ ] trainer can create a client
- [ ] trainer can invite a client
- [ ] trainer can archive a client
- [ ] trainer can permanently delete a client
- [ ] trainer can create/edit/assign plans
- [ ] trainer can create/edit workouts
- [ ] trainer can create/edit exercises
- [ ] trainer can create/edit resources
- [ ] trainer can create bulletin posts
- [ ] trainer can review check-ins
- [ ] trainer can send communication messages

### Client

- [ ] client can complete account setup from invite
- [ ] client can log in
- [ ] client sees only their own data
- [ ] client profile photo uploads and persists
- [ ] client can view assigned plan
- [ ] client can view workouts
- [ ] client can log workout progress
- [ ] client can submit check-ins
- [ ] client can send messages
- [ ] client can RSVP to bulletin session posts
- [ ] client can view assigned/global resources

## 6. Data Integrity Checks

- [ ] deleting a client removes dependent rows as intended
- [ ] deleting a client with login access removes auth access as intended
- [ ] archiving does not delete data
- [ ] invites only target the intended client email
- [ ] trainer/client identity separation is verified in multiple accounts
- [ ] no page unintentionally falls back to demo data in production mode

## 7. Product / UX Review

- [ ] public pages show the production version number
- [ ] app shell shows the production version number
- [ ] mobile layouts reviewed
- [ ] footer links reviewed
- [ ] copy reviewed for launch readiness
- [ ] empty states reviewed for first-time users

## 8. Monitoring And Safety

- [ ] Sentry captures server errors
- [ ] Sentry captures client errors
- [ ] uptime monitoring is configured
- [ ] at least one alert destination exists
- [ ] a recovery owner is assigned for infrastructure issues

## 9. Launch Prep

- [ ] run `npm run lint`
- [ ] run `npm run build`
- [ ] perform a fresh end-to-end trainer flow in production-like conditions
- [ ] perform a fresh end-to-end client flow in an incognito window
- [ ] choose the next version number
- [ ] keep version below `1.0.0` until true launch
- [ ] only set `1.0.0` when launch is intentional

## 10. First Week After Launch

- [ ] monitor auth/invite failures daily
- [ ] monitor profile photo upload errors
- [ ] monitor message/check-in workflow issues
- [ ] review Sentry errors daily
- [ ] review email delivery failures
- [ ] confirm backups and operational ownership

## Notes

- This checklist should be updated as production scope changes.
- When a workflow is changed substantially, add a verification item here.
- Prefer explicit checkboxes over undocumented launch assumptions.
