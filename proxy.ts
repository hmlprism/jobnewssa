import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import createIntlMiddleware from "next-intl/middleware";

// PoC: test whether next-intl locale routing composes with Supabase auth.
// Scoped to /test-i18n paths only — existing routes are untouched.
// Delete this block (and revert to the original export below) once the
// architecture question is answered.
const intlMiddleware = createIntlMiddleware({
  locales: ["en", "af"],
  defaultLocale: "en",
  // 'always' = every locale gets a URL prefix (/en/..., /af/...).
  // This is intentional for the PoC — we want to verify the redirect
  // from /test-i18n → /en/test-i18n and that /af/test-i18n works.
  localePrefix: "always",
});

const TEST_I18N_PATHS = ["/test-i18n", "/en/test-i18n", "/af/test-i18n"];

export async function proxy(request: NextRequest) {
  // Supabase session refresh runs for ALL routes (existing behaviour, unchanged).
  const supabaseResponse = await updateSession(request);

  // For the PoC test paths, also run next-intl locale routing on top.
  const { pathname } = request.nextUrl;
  const isTestPath = TEST_I18N_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  if (isTestPath) {
    const intlResponse = intlMiddleware(request);
    // Forward any refreshed Supabase session cookies onto the intl response
    // so the browser receives them regardless of whether intl redirects or passes through.
    for (const cookie of supabaseResponse.cookies.getAll()) {
      const { name, value, ...options } = cookie;
      intlResponse.cookies.set(name, value, options);
    }
    return intlResponse;
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
