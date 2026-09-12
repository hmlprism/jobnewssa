// Throwaway PoC page — tests whether [locale] routing works in Next.js 16.3.4
// with next-intl's createMiddleware alongside the existing Supabase auth middleware.
// Delete this file once the architecture question is answered.

const LABELS: Record<string, { greeting: string; description: string }> = {
  en: {
    greeting: "Hello",
    description: "This page is being served in English.",
  },
  af: {
    greeting: "Hallo",
    description: "Hierdie bladsy word in Afrikaans bedien.",
  },
};

export default async function TestI18nPage({
  params,
}: PageProps<"/[locale]/test-i18n">) {
  const { locale } = await params;
  const label = LABELS[locale] ?? LABELS["en"];

  return (
    <html lang={locale}>
      <body style={{ fontFamily: "sans-serif", padding: "2rem" }}>
        <h1>i18n Routing PoC</h1>
        <p>
          <strong>Locale param:</strong> <code>{locale}</code>
        </p>
        <p>
          <strong>Greeting:</strong> {label.greeting}
        </p>
        <p>{label.description}</p>
        <hr />
        <p>
          Switch:{" "}
          <a href="/en/test-i18n">/en/test-i18n</a>
          {" | "}
          <a href="/af/test-i18n">/af/test-i18n</a>
          {" | "}
          <a href="/test-i18n">/test-i18n</a> (should redirect → /en/test-i18n)
        </p>
      </body>
    </html>
  );
}
