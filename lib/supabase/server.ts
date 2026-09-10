import { createServerClient } from "@supabase/ssr";
import { createClient as createRawClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { cache } from "react";
import type { Profile } from "@/types/database";

// No Database generic passed to either client below — see the comment in
// lib/supabase/client.ts for why. Query results are typed at the call-site
// boundary using the interfaces in types/database.ts.

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // called from a Server Component; middleware refreshes sessions instead
          }
        },
      },
    }
  );
}

// Deduplicated auth helpers — memoised per request via react.cache so that
// every server component in the same render tree (e.g. page + SiteHeader)
// shares a single cookie read instead of independent network calls.
//
// Safe to use getSession() here (reads JWT from cookies, no network call)
// because middleware already called auth.getUser() which validates the JWT
// with the Supabase Auth server and refreshes expired tokens. By the time
// a server component renders, the forwarded request cookies are guaranteed
// fresh and verified.

export const getAuthUser = cache(async () => {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user ?? null;
});

export const getAuthProfile = cache(async () => {
  const user = await getAuthUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, role, full_name, phone, province, city, headline, resume_url, avatar_url, created_at, updated_at, nqf_level, qualification_title, qualification_type, professional_registration, work_authorization, preferred_province, preferred_contract_type")
    .eq("id", user.id)
    .single();
  return data as Profile | null;
});

// Service-role client for trusted server-only operations (ingestion, admin tasks).
// NEVER import this into client components or expose SUPABASE_SERVICE_ROLE_KEY to the browser.
export function createServiceClient() {
  return createRawClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
