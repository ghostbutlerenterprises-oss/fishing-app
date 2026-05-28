# Fishing App

Gamified fishing catch log with leaderboards. Vite + React + Supabase.

## Stack

- **Frontend:** Vite, React 18, React Router 6, Tailwind CSS
- **Backend:** Supabase (Postgres + Auth + Storage + RLS)
- **Hosting:** Vercel (static SPA build)

There is no separate Node/Express backend. All data access is via `@supabase/supabase-js` and is protected by Row Level Security policies on the database.

## Local development

1. `cp .env.example .env.local` and fill in your Supabase URL and anon key.
2. `npm install`
3. `npm run dev`

## Schema

See the Supabase project for the canonical schema. V1 has two tables (`profiles`, `catches`) plus two views (`leaderboard_global`, `leaderboard_by_species`), all with RLS enabled.

Photos are stored in the `catch-photos` storage bucket, keyed by `{user_id}/{uuid}.{ext}`. RLS allows public read, authenticated write to the user's own prefix only.
