import { createServerClient } from "@supabase/ssr";
import { createClient as createRawClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

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

// Service-role client for trusted server-only operations (ingestion, admin tasks).
// NEVER import this into client components or expose SUPABASE_SERVICE_ROLE_KEY to the browser.
export function createServiceClient() {
  return createRawClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
