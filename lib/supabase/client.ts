import { createBrowserClient } from "@supabase/ssr";

// Not passing a Database generic here deliberately. supabase-js 2.114's
// generic inference chain (SupabaseClient's nested conditional types) fails
// to resolve correctly against a Database type built from named `interface`
// declarations — every table collapses to `never` even though the shape is
// structurally identical to an inline literal that works fine. This is an
// upstream inference limitation, not a schema mistake (confirmed via minimal
// repro outside this project). Once you generate real types from the live
// Supabase project (`npx supabase gen types typescript --project-id <id>`),
// swap that generated file in here — generated output uses inline literals
// throughout and does not hit this bug.
//
// In the meantime, query results are typed at the call-site boundary using
// the hand-written interfaces in types/database.ts (see lib/jobs-query.ts).
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
