# Rules for the Lovable AI agent working on this project

## Do not modify these paths
- `supabase/migrations/**` — hand-authored SQL migrations (schema + RLS policies).
  Changing these without a matching change applied to the actual Supabase database
  will cause silent drift between what the app expects and what the database has.
- `lib/supabase/client.ts`, `lib/supabase/server.ts` — deliberately untyped Supabase
  clients (see comments in those files for why). Re-adding a `Database` generic
  here will reintroduce a known upstream type-inference bug.
- `middleware.ts` — Supabase session-refresh middleware. Do not remove or bypass
  this; auth breaks silently without it.
- `.env.example`, `vercel.json` — env variable contract and cron schedule, edit only
  if you're intentionally changing what's deployed.

## Safe to edit freely
- Anything under `app/` for page layout, copy, and visual structure
- `components/ui/`, `components/layout/`, `components/jobs/` for styling and UI
- `app/globals.css` for design tokens (colors, fonts) — but keep using CSS variables,
  don't hardcode new colors inline
- Adding new pages, new components, new visual variants

## If a task seems to require touching a protected path
Stop and describe what you need, rather than editing it — the user will confirm
or bring it back to their other development environment for that part.
