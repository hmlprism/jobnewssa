# Job News SA — South Africa Job Board

A job vacancies website for South Africa: search by sector, province, salary
band, and contract type; employer job posting; job-seeker applications; and
a curated job-market news feed.

## Stack

- **Next.js 16** (App Router, Turbopack) + TypeScript + Tailwind CSS v4
- **Supabase** — Postgres, Auth, Row Level Security
- **Adzuna API** — real South Africa job listings, ingested on a schedule
- **Vercel** — hosting + Cron (scheduled ingestion)

## Getting started

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Create a Supabase project** at [supabase.com](https://supabase.com),
   then run the migrations in `supabase/migrations/` against it, in order,
   via the SQL Editor (or `supabase db push` if you have the CLI linked):
   - `0001_init.sql` — schema
   - `0002_rls.sql` — Row Level Security policies
   - `0003_seed_sectors.sql` — sector taxonomy seed data

3. **Get Adzuna API credentials** at
   [developer.adzuna.com](https://developer.adzuna.com/) (free tier).

4. **Copy the env template and fill in your values**
   ```bash
   cp .env.example .env.local
   ```
   See `.env.example` for what each variable is and where to get it.

5. **Run the dev server**
   ```bash
   npm run dev
   ```
   Visit `http://localhost:3000`.

6. **Test job ingestion locally** (dev-only GET shortcut):
   ```bash
   curl http://localhost:3000/api/jobs/ingest
   ```
   In production this endpoint requires `Authorization: Bearer $CRON_SECRET`
   and is called automatically every 6 hours by `vercel.json`'s cron config.

## Project structure

```
app/
  page.tsx                homepage
  jobs/                   search, filters, job detail, apply flow
  employer/                post-a-job, employer dashboard
  auth/                   login, signup, email confirmation callback
  news/                   job-market news feed
  api/jobs/ingest/        Adzuna ingestion endpoint (cron-triggered)
components/
  ui/                     Button and shared primitives
  layout/                 header, footer
  jobs/                   job card, filters, apply panel
lib/
  supabase/               browser / server / service-role clients
  adzuna.ts               Adzuna API client
  jobs-query.ts           job search query builder
  news-ingest.ts          RSS parsing helpers for the news module
  utils.ts, slug.ts       formatting and slug helpers
types/database.ts        hand-written types matching the Postgres schema
supabase/migrations/     SQL migrations (schema, RLS, seed data)
```

## A note on the Supabase client types

The Supabase clients in `lib/supabase/client.ts` and `lib/supabase/server.ts`
are **not** passed a `Database` generic. During development, doing so
triggered a real upstream inference bug in `supabase-js@2.114` where a
`Database` type built from named `interface`s (rather than inline object
literals) collapses every table to `never`. Rather than fight it, query
results are typed at each call site using the interfaces in
`types/database.ts` (see the pattern in `lib/jobs-query.ts`). Once you
generate real types from your live Supabase project —

```bash
npx supabase gen types typescript --project-id <your-project-id> > types/database-generated.ts
```

— you can wire that generated file back into the client generics; generated
output uses inline literals throughout and doesn't hit this bug.

## Data sources & legal notes

- **Job listings**: sourced from the Adzuna API (licensed, syndication-
  permitted) and directly from employers via the "Post a job" flow. This
  project does not and should not scrape listings from other job boards —
  that content is licensed from recruiters/employers and republishing it
  without permission is a copyright/ToS problem.
- **News**: `lib/news-ingest.ts` pulls short, original excerpts from RSS
  feeds of sources that explicitly permit syndication, always with
  attribution and a link back to the original — never full-text
  reproduction. Verify each feed's actual terms before enabling it in
  `NEWS_SOURCES`.

## Deploying

1. Push this repo to GitHub.
2. Import it into [Vercel](https://vercel.com/new).
3. Add all variables from `.env.example` as Vercel environment variables.
4. Vercel will pick up `vercel.json`'s cron config automatically once
   deployed (Vercel Cron requires a paid plan for schedules more frequent
   than once a day — adjust `vercel.json` if you're on the Hobby plan).
