import { SiteHeader } from "@/components/layout/header";
import { SiteFooter } from "@/components/layout/footer";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = { title: "CV Maker — Job News SA" };

export default function CvMakerPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <Link
          href="/tools"
          prefetch={false}
          className="mb-10 inline-flex items-center gap-1.5 text-sm text-[var(--color-muted)] hover:text-[var(--color-rust)]"
        >
          <ArrowLeft size={14} />
          Back to tools
        </Link>
        <h1 className="mt-6 font-display text-3xl font-semibold">CV Maker</h1>
        <p className="mt-4 max-w-md text-[var(--color-muted)]">
          We&apos;re building this. A clean, ATS-friendly CV builder tailored
          for South African employers — no account required, download as PDF.
        </p>
        <p className="mt-6 text-sm text-[var(--color-muted)]">Check back soon.</p>
      </main>
      <SiteFooter />
    </>
  );
}
