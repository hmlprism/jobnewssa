# Job News SA — Project Context

South African job board. Employers post vacancies directly; secondary feeds ingest
listings from Adzuna and the DPSA Public Service Vacancy Circular. Job seekers
browse, filter, apply with a resume, and exchange messages with employers through
a per-application thread. Two tools help applicants prepare: a CV Maker and a Z83
government form filler.

---

## Tech stack

| Layer | Choice | Version |
|---|---|---|
| Framework | Next.js App Router | 16.3.4 |
| Runtime | React | 19.2.8 |
| Styling | Tailwind CSS v4 | ^4 |
| Database / Auth / Storage | Supabase (Postgres + RLS) | supabase-js ^2.114.0, @supabase/ssr ^0.12.5 |
| Language | TypeScript | ^5 |
| E2E / perf | Playwright | ^1.62.1 |
| Deployment | Vercel | — |

**Next.js 16.3.4 has breaking changes** from versions in most LLM training data.
Read `node_modules/next/dist/docs/` before touching framework-level code. The
`middleware` file convention is deprecated in favour of `proxy` — it still
works but emits a build warning.

Turbopack is used in dev (`next dev`). Production builds use the standard
webpack-based compiler (`next build`).

---

## Design system — Broadsheet direction

The visual language is editorial/print, not SaaS. Think newspaper, not dashboard.

### Color tokens (defined in `app/globals.css` via Tailwind v4 `@theme`)

| Token | Hex | Purpose |
|---|---|---|
| `--color-ink` | `#12211a` | Default text — near-black with a green tint |
| `--color-paper` | `#f7f5f0` | Page background — warm off-white |
| `--color-paper-dim` | `#efece3` | Subtle section background, hover states |
| `--color-rust` | `#be421c` | **Primary CTA only** (see rule below) |
| `--color-rust-dark` | `#a53c19` | Rust hover/active state |
| `--color-green` | `#3a5e43` | Saved / success states (forest green — WCAG AA ✓ on paper) |
| `--color-green-dim` | `#eaede8` | Success backgrounds |
| `--color-indigo` | `#2a3d66` | Verified employer badges — informational accent, nowhere else |
| `--color-indigo-dim` | `#eaecf3` | Verified badge backgrounds |
| `--color-clay` | `#96612e` | Closing-soon urgency (days left on a listing — WCAG AA ✓ on paper) |
| `--color-clay-dim` | `#f5ede0` | Urgency backgrounds |
| `--color-amber` | `#7c5b1c` | Secondary category labels/index headings — muted warm gold. Not for primary actions. |
| `--color-amber-dim` | `#f7f0db` | Amber tint backgrounds |
| `--color-muted` | `#6b6558` | Secondary text, metadata |
| `--color-line` | `#ddd8ca` | Borders, dividers |
| `--color-line-hover` | `#c4bfb2` | Border hover state |

**Ink tonal scale** (`--color-ink-50` through `--color-ink-900`): same warm dark-forest hue as
`--color-ink`. Use for text hierarchy and subtle surface variation (e.g. hero column backgrounds).
`ink-900` equals `--color-ink`. `ink-50` (#edf2ee) is the lightest — barely perceptible against
paper, used for zone tinting rather than color change.

### The rust rule
Rust (`--color-rust`) is reserved for exactly three uses:
1. Primary CTA buttons (the `Button` and `LinkButton` components with `variant="primary"`)
2. Active / selected filter states
3. Link hover colour and text-level links

It must not appear on badges, status indicators, informational elements, or
decorative accents. Indigo handles "verified"; clay handles "urgent"; green
handles "success". Using rust anywhere else breaks the visual hierarchy.

### Typography
- **Fraunces** (variable, serif) — display headings only: `h1`, `h2`, `h3`,
  `.font-display`. Never for body copy or UI labels.
- **Inter** — body text and all UI elements.
- Weight scale: 400 body, 500 UI labels/buttons, 600 maximum for in-app headings.
  Fraunces display headings may use `font-semibold` (600).

### Hard layout constraints
- **No border-radius anywhere.** The codebase has been audited; do not add `rounded-*`.
- **No box-shadows.** Use borders and background-colour changes for depth.
- Job card hover: rust left keyline via `before:` pseudo-element (opacity transition
  75ms) + darker border via `--color-line-hover`.

---

## Key architectural patterns

### Supabase client variants

Three distinct clients exist; use the right one for the context:

```
lib/supabase/server.ts    createClient()          Cookie-scoped SSR client.
                                                   Use in Server Components and
                                                   API routes for user-specific queries.

lib/supabase/server.ts    createServiceClient()   Service-role client.
                                                   Bypasses RLS. Use only for trusted
                                                   server-only writes (ingestion, admin).
                                                   Never expose to the browser.

lib/supabase/client.ts    createClient()          Browser client.
                                                   Use in client components ("use client")
                                                   for user-initiated mutations.
```

**No `Database` generic** is passed to either Supabase client. There is an
upstream inference bug in supabase-js 2.114 with named interfaces. Query
results are typed at the call site using the interfaces in `types/database.ts`.

### Auth flow — one network call per request

```
Request arrives
  → middleware (lib/supabase/middleware.ts)
      auth.getUser()              ← ONE network call to Supabase Auth
                                    validates JWT, refreshes if expired,
                                    writes refreshed cookie to response

  → Server Components render
      getAuthUser()               ← reads auth.getSession() from cookie
                                    ZERO network calls — middleware already validated
      getAuthProfile()            ← one DB query to profiles table

Both helpers are react.cache()-wrapped, so any number of Server Components
in the same render tree share a single execution.
```

`getUser()` in client components (`"use client"`) is still necessary and
correct — the browser has no access to the server-validated session. The
above optimization applies only to the server side.

### Public data — unstable_cache pattern

Pages showing public data (job listings, news, sector counts) must use:
1. `createRawClient()` — plain anon Supabase client, **no cookies**
2. `unstable_cache()` — Next.js cross-request in-memory cache

Using the cookie-scoped `createClient()` for public data forces dynamic
rendering on every request even when the data hasn't changed, because Next.js
treats any cookie read as dynamic. The raw client + unstable_cache serves
cached results in sub-millisecond time. See `lib/jobs-query.ts` for the
canonical implementation.

### SiteHeader — streaming Suspense architecture

`SiteHeader` is an **async** function (required to `await getTranslations("Header")`
from next-intl). Auth-dependent parts are async Server Components inside
`<Suspense>` boundaries:

```
SiteHeader (sync, renders instantly)
  ├── Logo, static nav links
  ├── <Suspense fallback={<AuthNavItemsSkeleton />}>
  │     <AuthNavItems />        ← getAuthUser() + messages count query (parallel)
  │   </Suspense>
  └── <Suspense fallback={<AuthControlsSkeleton />}>
        <AuthControls />        ← getAuthUser() + getAuthProfile() + messages count
      </Suspense>               ← getAuthProfile() and messages count run in Promise.all
```

The fallbacks reserve the right amount of space (`min-w-[86px]` for the
Messages nav slot) so no layout shift occurs when auth resolves.

The unread message count is computed server-side in both `AuthNavItems`
(desktop badge) and `AuthControls` (passed to `MobileNav`). There is no
client-side fetch for unread count; `/api/messages/unread-count` exists
in the codebase but is no longer called.

### Link prefetching — disabled everywhere

**RULE: Every `<Link>` added to this codebase MUST include `prefetch={false}`.**
The `LinkButton` component enforces this internally; all bare `<Link>` usages
must carry it explicitly. This rule has been audited and enforced across the
entire codebase. Failing to add it triggers the auth middleware for every
visible link on a signed-in page (~340ms per link) and has caused two separate
performance regressions.

**Why:** Next.js auto-prefetches RSC payloads for every visible link after
hydration. Each prefetch goes through middleware, which calls `auth.getUser()`
— a ~340ms network round-trip for authenticated users. On `/jobs` with 36
links, this caused 19 cascading RSC requests totalling ~1.9 seconds of
post-LCP network activity. Disabling prefetch reduced the settled time on
`/jobs` from ~2600ms to ~840ms for signed-in users.

Links inside conditional renders that never appear in the initial DOM
(dropdown menus, mobile nav drawer) do not need `prefetch={false}` because
Next.js cannot observe them — they are not in the DOM at hydration time.

### ApplyPanel — server-resolved, no client auth waterfall

`ApplyPanelServer` (async Server Component, `components/jobs/apply-panel-server.tsx`)
runs inside a `<Suspense>` on the job detail page. It:
1. Calls `getAuthUser()` (cache hit — zero network)
2. Runs two DB queries in `Promise.all`: profile resume check + existing application check
3. Passes `initialStatus` and `userId` to the client `ApplyPanel` as props

The client component receives its initial state as props and needs no
`auth.getUser()` call on mount.

---

## Internationalisation (i18n)

### Setup
next-intl 4.14.4. All user-facing pages live under `app/[locale]/` — URLs are
`/en/...` and `/af/...`. The following stay at the root and are **not** locale-prefixed:
`app/api/*`, `app/auth/callback/route.ts` (Supabase-registered redirect URI — must
not move), and `app/layout.tsx`.

Supported locales are defined in `lib/i18n-config.ts`: `en` (default) and `af`
(Afrikaans). The active locale is resolved per-request in `i18n/request.ts` and
injected via `NextIntlClientProvider` in `app/[locale]/layout.tsx`.

### Navigation — always use `@/lib/navigation`
**RULE: Import `Link`, `useRouter`, and `usePathname` from `@/lib/navigation`,
never from `next/link` or `next-intl/navigation` directly.**

`lib/navigation.ts` wraps `createNavigation` from next-intl, which auto-prefixes
hrefs with the current locale. Using `next/link` directly bypasses this and
produces locale-stripped URLs (and TS errors if you forget the prefix).

### Translations
String files: `messages/en.json` and `messages/af.json`. All pages are fully
extracted. Namespaces: `Header`, `Auth`, `Home`, `Jobs`, `Shared`, `Profile`,
`AccountSettings`, `Applications`, `Saved`, `Messaging`, `News`, `Employer`
(sub-namespaces: `dashboard`, `applicants`, `verify`, `post`).

Server components use `getTranslations("Namespace")` from `next-intl/server`
(requires `await`). Client components use `useTranslations("Namespace")` from
`next-intl`. ICU message format is used for plurals and relative time throughout.

### Locale switcher
`components/layout/locale-switcher.tsx` — `"use client"` component rendering
`EN | AF`. Active locale = ink-coloured span; inactive = muted link with rust
hover. Uses `useSearchParams()` to preserve the current URL's query string
(e.g. active job filters) when switching locale. Rendered in the desktop header
(`hidden lg:flex`) and in the mobile slide-out nav panel.

### Auth redirects
Protected pages redirect to `/${locale}/auth/login` (locale-aware) rather than
the hardcoded `/auth/login` path. Without this, proxy.ts would add an extra
redirect hop to normalise the missing locale prefix.

---

## Database schema overview

Migrations live in `supabase/migrations/`.

**Applied to production:** 0001–0018, 0021
**Built, pending production apply:** 0019 (DPSA source type), 0020 (cv_drafts)

**Migration 0018 — critical rule for future SECURITY DEFINER functions:**
All future `SECURITY DEFINER` functions must include `SET search_path = public`.
Without it, `::user_role` casts fail when triggered via `supabase_auth_admin`
(whose session search_path may not include `public`). This caused "Database error
saving new user" on every signup until fixed in 0018.

### Core tables

| Table | Notes |
|---|---|
| `profiles` | Extends `auth.users`. Role: `job_seeker` \| `employer` \| `admin`. Has `resume_url`, `avatar_url`, `consented_at timestamptz` (migration 0017 — captures signup consent). |
| `companies` | Created on first employer job post. `verified boolean`, `verification_method text`, `verified_at timestamptz`. One company per employer (`owner_id`). |
| `sectors` | Static taxonomy (seeded in 0003). Slug-addressed. |
| `jobs` | `source`: `adzuna` \| `manual` \| `employer_direct` \| `dpsa`. `status`: `draft` \| `pending_review` \| `published` \| `expired` \| `rejected`. Has full-text `search_vector`. SA-specific fields: `province`, `employment_equity_note`, `required_nqf_level`. `source_metadata jsonb` column added in migration 0019 for DPSA-specific data (enquiries, apply address, circular ref). |
| `applications` | Joins `jobs` ↔ `profiles`. Status: `submitted` → `viewed` → `shortlisted` → `rejected` \| `hired`. |
| `messages` | Per-application thread. `sender_id`, `body`, `read_at` (null until recipient opens). |
| `news_articles` | Populated by the news ingestion pipeline (3 live RSS feeds). `slug` nullable, `UNIQUE (source_url)` for dedup, `ingested_at timestamptz` (migration 0016). |
| `saved_jobs` | User-scoped bookmarks. |
| `job_alerts` | Schema exists; alerting logic not yet implemented. |
| `cv_drafts` | Stores non-sensitive CV wizard data per user (JSONB). UNIQUE on `user_id`. Migration 0020, pending production apply. |
| `z83_drafts` | Stores non-sensitive Z83 wizard data per user (JSONB). UNIQUE on `user_id`. Migration 0021, applied. See Z83 sensitivity model below. |

### Storage buckets

| Bucket | Public | Limit | Types |
|---|---|---|---|
| `resumes` | No (private) | 5 MB | PDF only |
| `avatars` | Yes | 2 MB | JPEG, PNG, WebP |

Both buckets enforce path-based RLS: the first path segment must equal the
authenticated user's UID (`storage.foldername(name)[1] = auth.uid()::text`).

---

## RLS security model

RLS is enabled on all tables. The model is summarised here; see
`supabase/migrations/0002_rls.sql` and `0011_messages.sql` for the exact policy SQL.

### Table policies

**profiles** — Public select. Users update only their own row (`auth.uid() = id`).

**companies** — Public select. Insert requires `owner_id = auth.uid()`. Update
requires `owner_id = auth.uid()`. Verification writes bypass RLS via the
service-role client (`createServiceClient()`) because the route computes
verification server-side.

**jobs** — Published jobs: public select. Unpublished jobs: visible only to
the poster or an admin. Insert requires `role in ('employer', 'admin')`.
Update/delete requires poster ownership or admin role.

**applications** — Select: visible to the applicant (`applicant_id = auth.uid()`)
**or** the employer who posted the job (`jobs.posted_by = auth.uid()` via join).
Insert: only the applicant can insert, and `applicant_id` must equal `auth.uid()`.
Update (status changes): only the employer side.

**messages** — The party check joins `applications → jobs` to identify both sides
of a thread without storing employer identity directly on the message row.
- SELECT: applicant or job poster of that application.
- INSERT: `sender_id = auth.uid()` + party check (prevents impersonation and third-party injection).
- UPDATE: only the **recipient** of a message may update it (used exclusively
  to set `read_at`). Enforced via `USING (sender_id != auth.uid() AND party check)`.

**news_articles** — Public select only. No client insert path.

**cv_drafts / z83_drafts** — Owner-only select, insert, update (`user_id = auth.uid()`).

---

## Known architectural constraints

### Supabase region — Singapore
The Supabase project is hosted in Singapore (`ap-southeast-1`). Vercel
deployments currently land in US-East (IAD). Every server-side DB query
incurs ~200–250ms round-trip latency. This is the dominant factor in
authenticated page load times and is not fixable without migrating the
Supabase project or moving to Vercel's Singapore region.

Public data queries use `unstable_cache` to absorb this cost; they pay the
round-trip once per TTL period, not once per request.

### Messaging — no real-time updates
The messages table, schema, RLS policies, and read/write UI are complete.
What is not built: Supabase Realtime subscriptions. The message thread page
loads messages on navigation; new messages sent by the other party do not
appear until the user refreshes or navigates away and back.

### News — Cloudflare-blocked sources
Three live RSS feeds are active: Daily Maverick (`/dmrss/`), Moneyweb
(`/feed/`), IOL (`/rss`). BusinessTech, News24, and The Citizen are blocked
by Cloudflare; TimesLive and EWN return 404. Do not attempt to add those
sources without a proxy or scraping workaround.

### DPSA migrations — pending production apply
Migration 0019 (`alter type job_source add value 'dpsa'`) has not yet been
applied to production. The ingest endpoint will fail in production until it is.

### Job alerts — schema only
The `job_alerts` table exists (columns: user, search criteria, frequency).
No alerting logic, email sending, or cron job has been built for it.

### Employer verification — email-domain check only
`POST /api/employer/verify` checks that the employer's account email domain
matches the submitted website domain (via DNS/HTTP fetch). This is the only
verification method. More robust methods (Companies House lookup, document
upload) are not implemented.

### No Database generic on Supabase clients
Passing `Database` as a generic to `createServerClient` / `createBrowserClient`
triggers a TypeScript inference bug in supabase-js 2.114 when using named
interfaces. All query results are typed at the call site using the types in
`types/database.ts` instead.

### middleware → proxy migration (complete)
The Supabase session-refresh middleware lives in `proxy.ts` at the project root.
The official Next.js codemod (`npx @next/codemod@canary middleware-to-proxy .`)
has already been applied on this branch. Both the Supabase `updateSession` call
and the next-intl `intlMiddleware` run inside `proxy.ts`, with Supabase cookies
forwarded onto the intl response. No build warning is emitted.

---

## Content ingestion pipelines

### Combined daily cron
`POST /api/ingest` — Vercel Cron slot 1, 03:00 UTC daily. Runs Adzuna job
ingestion and news ingestion concurrently via `Promise.allSettled`. Auth:
`Bearer CRON_SECRET`.

### Adzuna jobs
Fetches listings across 6 SA cities; upserts via service-role client. Dedup
by `external_id`. Source: `adzuna`.

### News articles
Three live RSS feeds: Daily Maverick, Moneyweb, IOL. Filter: 50
employment-related keywords (strikes, retrenchments, minimum wage, UIF,
SETA, EPWP, etc.). Dedup: `INSERT … ON CONFLICT (source_url) DO NOTHING`.
Config + parser + filter: `lib/news-feeds.ts`. Expected yield: 0–5 articles
per typical day; spikes on Stats SA release days and major retrenchment news.

### DPSA vacancy circulars
`POST /api/dpsa/ingest` — Vercel Cron slot 2, Fridays 06:00 UTC. Parses DPSA
Public Service Vacancy Circular PDFs (~250 posts per circular). Auth: `Bearer
CRON_SECRET`. Preview mode (no DB writes): `?preview=true`. Override target
circular: `?circular=N&year=YYYY`. Parser: `lib/dpsa-pdf.ts` (pdfjs-dist
coordinate extraction) + `lib/dpsa-parser.ts` (state machine). DPSA job
detail pages show a government apply panel (enquiries + postal address) in
place of the standard ApplyPanel.

---

## Tools

### CV Maker (`/tools/cv-maker`)
5-step wizard: Contact → Summary → Work Experience → Education + Skills → Preview.

- **PDF:** `@react-pdf/renderer` v4.9.0. Fonts registered as base64 data URIs
  (WOFF2 fails during pdfkit embed; `file://` fails in Next.js fetch polyfill —
  data URI is the correct pattern).
- **Types:** `types/cv.ts` — `CvData` interface. `photo_url` and `id_number`
  are display-only in the wizard; never written to `cv_drafts.data`.
- **Draft:** `cv_drafts` table (migration 0020). Auto-saves on step navigation
  for logged-in users; `localStorage` fallback for anonymous users.
- **Profile pre-fill:** name, email, phone, city, province, headline → summary,
  qualification → education, professional registration → skills.
- **API:** `POST /api/tools/cv/generate` (no auth required, returns PDF),
  `PUT /api/tools/cv/draft` (auth required, upserts `cv_drafts`).

### Z83 Form Filler (`/tools/z83`)
7-step wizard for the South African government employment application form (Z83).

- **PDF fill:** `pdf-lib` + `public/forms/z83-template.pdf`. All AcroForm field
  names and radio button choice values documented in `lib/z83-fill.ts`.
- **Types:** `types/z83.ts`. `Z83DraftData` = persistable subset (8 keys);
  `Z83FillData` extends it with session-only sensitive fields.
- **Draft:** `z83_drafts` table (migration 0021, applied). Auto-saves on step
  navigation for logged-in users. **No localStorage fallback** — anonymous users
  lose data on close. This is intentional: sensitive declaration data must not
  persist in the browser.
- **API:** `POST /api/tools/z83/generate` (no auth required, returns PDF),
  `PUT /api/tools/z83/draft` (auth required, upserts `z83_drafts`).

**Sensitivity model — NEVER write these to the database:**

| Field | Reason |
|---|---|
| `id_number` | 13-digit SA ID number |
| `dob` | Date of birth (DDMMYY) |
| `section_b_declarations` | All 9 Yes/No answers: criminal record, disciplinary history, pending charges, business interests, etc. |
| `page1_initials`, `page2_initials`, `signature` | PNG data URIs of handwritten marks |
| `declaration_date` | Date of signing |

`section_f_ps_reappointment` (previous public service Yes/No) IS in
`Z83DraftData` and is persisted, but is **forced to `null` on every draft
load** regardless of what is stored, so it never silently pre-answers the
question across sessions.

All 9 declaration fields use `boolean | null` (not `boolean`). `null` means
not yet answered; validation blocks Next until every question is explicitly
answered. Defaulting to `false` was rejected as it would silently pre-answer
legal declarations on a government form.

**Build status as of 2026-09-14:**

| Step | Content | Status |
|---|---|---|
| 1 | Job specifics (Section A) | Committed |
| 2 | Personal details — identity, demographics, citizenship (Section B) | Committed |
| 3 | Declarations — 9 Yes/No questions, never saved (Section B) | Committed |
| 4 | Contact, profile details, language proficiency (Sections B + D) | Committed |
| 5 | Qualifications (Section E) | **NOT YET COMMITTED** |
| 6 | Work experience + references (Sections F + G) | **NOT YET COMMITTED** |
| 7 | Signature canvas + declaration date + PDF download | **NOT YET COMMITTED** |

Steps 5–7 are built and wired (`step-e.tsx`, `step-f.tsx`, `step-preview.tsx`,
`z83-wizard.tsx` updated). Awaiting commit after pre-commit review of Step 7.

---

## API routes

| Route | Auth | Purpose |
|---|---|---|
| `POST /api/ingest` | `Bearer CRON_SECRET` | Combined daily cron: runs Adzuna + news ingestion concurrently. |
| `POST /api/jobs/ingest` | `Bearer CRON_SECRET` | Adzuna job ingestion across 6 SA cities. |
| `POST /api/dpsa/ingest` | `Bearer CRON_SECRET` | DPSA vacancy circular parsing + upsert. |
| `GET /api/dpsa/ingest` | None (dev only) | Preview mode — parses PDF without DB writes. |
| `POST /api/news/ingest` | `Bearer CRON_SECRET` | News RSS ingestion (3 feeds). |
| `POST /api/employer/verify` | Session cookie | Checks email domain vs website domain, marks `companies.verified = true` via service-role client. |
| `GET /api/messages/unread-count` | Session cookie | Returns unread count for the current user. **Currently unused** — the header computes this server-side. Route exists if a client-side path is needed in future. |
| `POST /api/tools/cv/generate` | None | Renders and returns a CV PDF. Accepts `CvData` JSON. |
| `PUT /api/tools/cv/draft` | Session cookie | Upserts non-sensitive CV data to `cv_drafts`. |
| `POST /api/tools/z83/generate` | None | Fills and returns a Z83 PDF. Accepts `Z83FillData` JSON. Sensitive fields accepted but never stored. |
| `PUT /api/tools/z83/draft` | Session cookie | Upserts non-sensitive Z83 data to `z83_drafts`. Server-side allowlist strips any sensitive keys even if sent. |

---

## Performance characteristics

Measured from production (Vercel, fast connection, Playwright/Chrome, median of 5 runs).

### Signed-out (public pages)
| Page | TTFB | LCP | Settled |
|---|---|---|---|
| `/` | ~38ms | ~450ms | ~550ms |
| `/jobs` | ~38ms | ~550ms | ~555ms |
| `/jobs/:slug` | ~38ms | ~390ms | ~460ms |
| `/news` | ~38ms | ~390ms | ~390ms |

### Signed-in overhead
Auth-dependent header parts stream asynchronously via Suspense. Signed-in
users see roughly the same LCP as signed-out (content is available from
cache before auth resolves) but the page fully settles 500–900ms later as
the UserMenu, Messages badge, and MobileNav fill in from the server stream.

### "Fully loaded" vs LCP
External tools measuring "fully loaded" (all 14 requests / ~380 kB complete)
report ~1.7–1.8s from a fresh connection, which is correct and expected.
The 14 requests are: 1 HTML + 1 CSS + 3 font woff2 files + 9 JS chunks.
LCP fires at ~450ms because the largest content element is present in the
initial HTML before JS or fonts complete. The two metrics are measuring
different things.

### Benchmark scripts
Scripts live in `scripts/`. All target `https://jobnewssa.vercel.app`.

| Script | Purpose |
|---|---|
| `perf-quick-check.mjs` | 5 cold runs, 6 pages, signed-out, fast connection |
| `perf-auth-compare.mjs` | Signed-out vs signed-in comparison; logs in via Playwright |
| `perf-benchmark.mjs` | Full 200-load benchmark (4 conditions × 5 pages × 5 runs × 2 cache states) |
| `perf-full-audit.mjs` | All pages + client-side navigation timings |
