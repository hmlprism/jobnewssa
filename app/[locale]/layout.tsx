import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";

// Locale layout — registers the locale for every request and provides
// next-intl's client-side context to all pages under /[locale]/*.
export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const { locale } = await params;

  // Required for pages that use static rendering (generateStaticParams).
  // For dynamic routes it is a no-op, but included for future-proofing.
  setRequestLocale(locale);

  // Load the message catalogue for this locale. Empty ({}) until string
  // extraction begins — the provider still needs to be in the tree so
  // client components that later call useTranslations() work without changes.
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
