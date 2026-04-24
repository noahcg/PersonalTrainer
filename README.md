# Nick Glushien Training

Next.js application for a personal training business with:

- a public-facing marketing site
- a trainer workspace
- a client workspace
- demo mode with seeded local data
- Supabase-backed auth and data when configured

## What The App Currently Includes

### Public site

- Landing page
- About page
- Pricing page
- Login page
- Invite-based account setup page

### Trainer workspace

- Dashboard
- Client roster
- Individual client profiles
- Client package visibility and editing
- Bulk and single-client access invites
- Custom invite composer for client onboarding
- Communications center for messages and check-ins
- Bulletin board
- Training plans
- Workout builder
- Exercise library
- Progress page with real roster/check-in signals
- Resources
- Settings

### Client workspace

- Home
- Bulletin board
- Plan view
- Workouts
- Progress
- Messages and check-ins
- Profile

## Modes

### Demo mode

If Supabase is not configured, the app runs against seeded in-repo demo data and local browser storage.

Useful routes:

- Trainer: `/trainer/dashboard`
- Client: `/client/home`
- Login: `/login`

Demo mode is useful for UI/product development, but it does not send real auth emails.

### Supabase mode

When the required environment variables are present, the app uses Supabase Auth and Postgres-backed data.

This enables:

- authenticated trainer and client sessions
- trainer/client messaging
- check-ins
- client access invites
- client account setup via invite link

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Radix UI primitives
- Motion
- Recharts
- Supabase SSR + `@supabase/supabase-js`

## Local Development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
INVITE_FROM_EMAIL=
INVITE_REPLY_TO_EMAIL=
```

Notes:

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` enable Supabase mode.
- `SUPABASE_SERVICE_ROLE_KEY` is required for server-side invite generation.
- `RESEND_API_KEY`, `INVITE_FROM_EMAIL`, and optional `INVITE_REPLY_TO_EMAIL` are required for custom invite emails.

## Supabase Setup

1. Create a Supabase project.
2. Copy the project URL and anon key into `.env.local`.
3. Add the service role key to `.env.local`.
4. Run `supabase/schema.sql` in the Supabase SQL editor.
5. Run `supabase/seed.sql` if you want starter data.
6. Configure auth redirect URLs so invite/setup flows can return to your app.

## Invite Flow

The current client onboarding flow is trainer-invite based:

1. Trainer selects a client or opens a client profile.
2. Trainer clicks `Send invite`.
3. Trainer writes the invite email subject and message.
4. The server generates a Supabase invite/setup link.
5. The app sends the email through Resend.
6. The client opens the invite link and sets their password on `/setup-account`.

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## Repo Notes

- `src/app` contains the public site plus trainer/client route groups.
- `src/components` contains shared UI, marketing components, and product surfaces.
- `src/lib` contains demo data, data loaders, auth helpers, invite/email helpers, and shared config.
- `supabase/schema.sql` and `supabase/seed.sql` describe the current backend model.

## Current Position

This is no longer just an MVP shell. It is currently a working product prototype with:

- a public brand/marketing surface
- a trainer operating area
- a client experience area
- demo fallback behavior
- real invite-based onboarding infrastructure when backend services are configured

The remaining work is mostly product polish, stronger production data coverage, and deployment/config hardening.
