import { SiteHeader } from "@/components/layout/header";
import { SiteFooter } from "@/components/layout/footer";

export const metadata = { title: "Privacy Policy — Job News SA" };

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="font-display text-3xl font-semibold">Privacy Policy</h1>
        <div className="mt-8 border border-[var(--color-line)] px-6 py-12 text-center">
          <p className="font-display text-lg">Coming soon</p>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            Full privacy policy is being prepared. Check back shortly.
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
