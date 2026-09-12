// Locale layout — wraps all localised page routes under /[locale]/*.
// Minimal for now; will later set up NextIntlClientProvider here
// when string extraction begins.
export default function LocaleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
