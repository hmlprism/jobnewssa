import { SiteHeader } from "@/components/layout/header";
import { SiteFooter } from "@/components/layout/footer";
import { Link } from "@/lib/navigation";
import { FileText, ClipboardList } from "lucide-react";

export const metadata = { title: "Job Tools — Job News SA" };

const TOOLS = [
  {
    Icon: FileText,
    title: "CV Maker",
    description:
      "Build a professional South African CV in minutes. Choose from clean, ATS-friendly layouts and download as PDF.",
    href: "/tools/cv-maker",
  },
  {
    Icon: ClipboardList,
    title: "Z83 Form Filler",
    description:
      "Fill out the 2021 revised Z83 government application form online and download a print-ready PDF.",
    href: "/tools/z83",
  },
] as const;

export default function ToolsPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <h1 className="mb-2 font-display text-3xl font-semibold">
          Job search tools
        </h1>
        <p className="mb-10 text-[var(--color-muted)]">
          Free tools to help South African job seekers put their best foot
          forward.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          {TOOLS.map(({ Icon, title, description, href }) => (
            <div key={title} className="border border-[var(--color-line)] p-6">
              <div className="mb-4">
                <Icon size={28} className="text-[var(--color-ink)]" />
              </div>
              <h2 className="font-display text-xl font-semibold">{title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
                {description}
              </p>
              <Link
                href={href}
                prefetch={false}
                className="mt-5 inline-flex border border-[var(--color-rust)] px-4 py-2 text-sm font-medium text-[var(--color-rust)] hover:bg-[var(--color-rust)] hover:text-[var(--color-paper)]"
              >
                Open
              </Link>
            </div>
          ))}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
