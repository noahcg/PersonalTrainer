# Aurelian Coach

Production-minded MVP for a premium personal trainer client management app.

## Stack

- Next.js App Router
- React + TypeScript
- Tailwind CSS
- shadcn/ui-style Radix primitives
- Motion
- Supabase Auth + Postgres
- Vercel deployable

## Local Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

The app runs with seeded in-repo demo data even before Supabase is connected. Use:

- Trainer demo: `/trainer/dashboard`
- Client demo: `/client/home`
- Login shell: `/login`

## Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## Supabase Setup

1. Create a Supabase project.
2. Copy the project URL and anon key into `.env.local`.
3. Run `supabase/schema.sql` in the SQL editor.
4. For local Supabase, run `supabase/seed.sql` after the schema.
5. For hosted Supabase, create demo auth users first if direct auth inserts are blocked, then adapt ids in `seed.sql`.

Demo credentials in the seed:

- `trainer@example.com` / `demo-password`
- `mara@example.com` / `demo-password`

## Vercel Deploy

1. Push the repo to GitHub.
2. Import in Vercel.
3. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Deploy.

## Product Areas

- Trainer dashboard
- Client roster and profile management
- Exercise library
- Training plan management
- Workout builder
- Client workout logger
- Progress tracking
- Check-ins and messaging
- Resources
- Settings/profile

## Recommended V2

- Replace demo-data reads with Supabase queries and mutations per route.
- Add invite flow for client onboarding.
- Add server actions for plan/workout CRUD.
- Add media uploads with Supabase Storage.
- Add calendar scheduling and notifications.
- Add real analytics queries for adherence and recovery trends.
- Add Stripe billing for trainer subscriptions.
