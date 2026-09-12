import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import createIntlMiddleware from "next-intl/middleware";

const intlMiddleware = createIntlMiddleware({
  locales: ["en", "af"],
  defaultLocale: "en",
  // Every locale gets a URL prefix — /en/... and /af/...
  // Requests without a prefix are redirected to /en/...
  localePrefix: "always",
});

// Paths that must NOT receive locale routing:
//  - /api/* — server-side API routes, never locale-prefixed
//  - /auth/callback — OAuth callback URL registered in Supabase; must stay stable
const NO_LOCALE_PREFIXES = ["/api/", "/auth/callback"];

export async function proxy(request: NextRequest) {
  // Supabase session refresh runs for ALL routes (existing behaviour, unchanged).
  const supabaseResponse = await updateSession(request);

  const { pathname } = request.nextUrl;

  // Skip locale routing for API routes and the auth callback handler.
  if (NO_LOCALE_PREFIXES.some((p) => pathname.startsWith(p))) {
    return supabaseResponse;
  }

  // Run next-intl locale routing for all page routes.
  const intlResponse = intlMiddleware(request);

  // Forward any refreshed Supabase session cookies onto the intl response
  // so the browser receives them whether intl redirects or passes through.
  for (const cookie of supabaseResponse.cookies.getAll()) {
    const { name, value, ...options } = cookie;
    intlResponse.cookies.set(name, value, options);
  }

  return intlResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
