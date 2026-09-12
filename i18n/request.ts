import { getRequestConfig } from "next-intl/server";

export default getRequestConfig(async ({ requestLocale }) => {
  // requestLocale comes from the [locale] URL segment matched by the proxy.
  // Fall back to 'en' for edge cases outside locale routing (e.g. internal pages).
  const locale = (await requestLocale) ?? "en";

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
