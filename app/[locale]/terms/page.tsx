import { SiteHeader } from "@/components/layout/header";
import { SiteFooter } from "@/components/layout/footer";
import { Link } from "@/lib/navigation";

export const metadata = { title: "Terms & Conditions — Job News SA" };

function Gap({ children }: { children: React.ReactNode }) {
  return (
    <span className="bg-[var(--color-amber-dim)] px-1.5 py-0.5 text-sm font-medium text-[var(--color-amber)]">
      ⚑ PLACEHOLDER: {children}
    </span>
  );
}

function LegalReview({ children }: { children: React.ReactNode }) {
  return (
    <span className="bg-[var(--color-clay-dim)] px-1.5 py-0.5 text-xs font-medium text-[var(--color-clay)]">
      ⚑ Pending legal review — {children}
    </span>
  );
}

export default function TermsPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="font-display text-3xl font-semibold">Terms &amp; Conditions</h1>
        <p className="mt-2 text-sm text-[var(--color-muted)]">Last updated: 14 September 2026</p>

        {/* 1. Acceptance */}
        <section className="mt-10 border-t border-[var(--color-line)] pt-8">
          <h2 className="font-display text-xl font-semibold">1. Acceptance of these terms</h2>
          <p className="mt-4 leading-relaxed">
            By creating an account or using Job News SA ("we", "us", "the Site"), you agree to
            these Terms &amp; Conditions and our{" "}
            <Link
              href="/privacy"
              prefetch={false}
              className="underline hover:text-[var(--color-rust)]"
            >
              Privacy Policy
            </Link>
            . If you don't agree, please don't use the Site.
          </p>
        </section>

        {/* 2. What the Site is */}
        <section className="mt-10 border-t border-[var(--color-line)] pt-8">
          <h2 className="font-display text-xl font-semibold">2. What the Site is</h2>
          <p className="mt-4 leading-relaxed">
            Job News SA is a free job listing platform for South Africa. Job seekers can search and
            apply for jobs; employers can post job listings and review applicants. We also aggregate
            publicly available job listings from third parties (currently Adzuna) and South
            Africa's official Public Service Vacancy Circulars, and provide free tools (a CV
            builder and a Z83 government form filler).
          </p>
          <p className="mt-4 leading-relaxed">
            We are not affiliated with Careers24, Indeed, or any other job board.
          </p>
        </section>

        {/* 3. Accounts */}
        <section className="mt-10 border-t border-[var(--color-line)] pt-8">
          <h2 className="font-display text-xl font-semibold">3. Accounts</h2>
          <ul className="mt-4 list-disc space-y-3 pl-6 leading-relaxed">
            <li>You must provide accurate information when creating an account.</li>
            <li>
              You are responsible for keeping your password secure and for all activity under your
              account.
            </li>
            <li>
              You must be legally able to work in South Africa (or, for employers, legally able to
              hire in South Africa) to use the relevant parts of the Site.{" "}
              <LegalReview>
                lawyer to advise on age and capacity requirements.
              </LegalReview>
            </li>
            <li>
              We may suspend or terminate accounts that violate these terms.{" "}
              <LegalReview>
                lawyer to advise on what process, if any, should be followed before suspension or
                termination.
              </LegalReview>
            </li>
          </ul>
        </section>

        {/* 4. Job listings */}
        <section className="mt-10 border-t border-[var(--color-line)] pt-8">
          <h2 className="font-display text-xl font-semibold">4. Job listings</h2>

          <h3 className="mt-6 text-base font-semibold">4.1 For job seekers</h3>
          <ul className="mt-3 list-disc space-y-3 pl-6 leading-relaxed">
            <li>
              Job listings come from three sources: employers who post directly on the Site, Adzuna
              (a third-party job aggregator), and South Africa's official Public Service Vacancy
              Circulars (government jobs).
            </li>
            <li>
              <strong>We do not verify every job listing.</strong> Employer accounts undergo a
              basic check (matching their account email domain to their company website), but this
              is not formal verification. Unverified employer listings are labeled as such on the
              Site.
            </li>
            <li>
              Listings sourced from Adzuna link out to the original posting — applying happens on
              that external site, not through us, and we have no visibility into whether you
              actually applied.
            </li>
            <li>
              Government (Z83) listings require applying directly to the relevant department by
              post, email, or hand delivery, following the instructions on that specific listing —
              not through the Site.
            </li>
            <li>
              We are not responsible for the accuracy of listings we did not create, or for the
              hiring decisions or conduct of any employer.
            </li>
          </ul>

          <h3 className="mt-6 text-base font-semibold">4.2 For employers</h3>
          <ul className="mt-3 list-disc space-y-3 pl-6 leading-relaxed">
            <li>You are responsible for the accuracy of any job listing you post.</li>
            <li>You must not post discriminatory, fraudulent, or misleading job listings.</li>
            <li>
              You must comply with the Employment Equity Act and other applicable South African
              employment law in your hiring practices.{" "}
              <LegalReview>
                lawyer to advise on the appropriate level of detail here and what liability
                disclaimer, if any, is appropriate.
              </LegalReview>
            </li>
            <li>Posting a job is currently free.</li>
          </ul>
        </section>

        {/* 5. CV Maker and Z83 */}
        <section className="mt-10 border-t border-[var(--color-line)] pt-8">
          <h2 className="font-display text-xl font-semibold">
            5. The CV Maker and Z83 Form Filler tools
          </h2>
          <ul className="mt-4 list-disc space-y-3 pl-6 leading-relaxed">
            <li>
              These tools are provided free of charge, as-is, to help you prepare application
              documents.
            </li>
            <li>
              <strong>
                The Z83 Form Filler produces a filled copy of South Africa's official government
                Z83 application form.
              </strong>{" "}
              We are not the South African government or the Department of Public Service and
              Administration (DPSA), and this tool is not an official government service. You are
              responsible for reviewing the completed form for accuracy before submitting it to any
              government department.
            </li>
            <li>
              Certain sensitive information you enter into these tools (ID number, date of birth,
              Z83 declaration answers, and your drawn signature) is used only to generate the PDF
              you download and is never saved to our systems — see the{" "}
              <Link
                href="/privacy"
                prefetch={false}
                className="underline hover:text-[var(--color-rust)]"
              >
                Privacy Policy
              </Link>{" "}
              for details. If you close your browser or lose the downloaded file before saving it
              elsewhere, we cannot recover it.
            </li>
            <li>
              We do not guarantee that documents generated by these tools will be accepted by any
              employer or government department.{" "}
              <LegalReview>
                Highest priority — lawyer to draft an appropriate disclaimer of liability for this
                item, given the Z83's real-world stakes for an applicant.
              </LegalReview>
            </li>
          </ul>
        </section>

        {/* 6. Messaging */}
        <section className="mt-10 border-t border-[var(--color-line)] pt-8">
          <h2 className="font-display text-xl font-semibold">6. Messaging</h2>
          <ul className="mt-4 list-disc space-y-3 pl-6 leading-relaxed">
            <li>
              Messages between job seekers and employers are limited to the specific job
              application they relate to.
            </li>
            <li>
              You must not use messaging to harass, spam, or send unlawful content to another user.
            </li>
            <li>
              We may review messages if required to investigate a report of abuse or as required by
              law.{" "}
              <LegalReview>
                lawyer to advise on the appropriate scope of this statement.
              </LegalReview>
            </li>
          </ul>
        </section>

        {/* 7. Acceptable use */}
        <section className="mt-10 border-t border-[var(--color-line)] pt-8">
          <h2 className="font-display text-xl font-semibold">7. Acceptable use</h2>
          <p className="mt-4 leading-relaxed">You agree not to:</p>
          <ul className="mt-3 list-disc space-y-2 pl-6 leading-relaxed">
            <li>
              Post false, fraudulent, or misleading information (job listings, profile information,
              or messages)
            </li>
            <li>Use the Site to harass, discriminate against, or defraud another user</li>
            <li>Attempt to access another user's account or data</li>
            <li>
              Scrape, copy, or republish job listings or other content from the Site without
              permission
            </li>
            <li>
              Use automated tools to interact with the Site in a way that degrades it for other
              users
            </li>
          </ul>
        </section>

        {/* 8. Intellectual property */}
        <section className="mt-10 border-t border-[var(--color-line)] pt-8">
          <h2 className="font-display text-xl font-semibold">8. Intellectual property</h2>
          <ul className="mt-4 list-disc space-y-3 pl-6 leading-relaxed">
            <li>The Site's design, branding, and original content belong to Job News SA.</li>
            <li>
              Job listings sourced from Adzuna or government circulars remain the property of their
              original publishers; we display them under applicable terms.{" "}
              <LegalReview>
                lawyer to confirm the correct legal basis for Adzuna content (API terms) and DPSA
                circular content (public/government nature).
              </LegalReview>
            </li>
            <li>
              Content you submit (your profile, resume, job listings you post, messages) remains
              yours, but you grant us the right to display it on the Site as necessary to provide
              the service (e.g. showing your job listing to job seekers, showing your application
              to the employer you applied to).
            </li>
          </ul>
        </section>

        {/* 9. Disclaimers */}
        <section className="mt-10 border-t border-[var(--color-line)] pt-8">
          <h2 className="font-display text-xl font-semibold">9. Disclaimers</h2>
          <ul className="mt-4 list-disc space-y-3 pl-6 leading-relaxed">
            <li>
              The Site is provided "as is." We do not guarantee that job listings are accurate,
              current, or will result in employment.
            </li>
            <li>
              We are not a party to, and have no responsibility for, the employment relationship
              between any job seeker and employer.
            </li>
          </ul>
          <p className="mt-4 bg-[var(--color-amber-dim)] px-4 py-3 text-sm font-medium text-[var(--color-amber)]">
            ⚑ PLACEHOLDER — Limitation of liability clause not yet drafted. This section requires
            proper legal drafting for South African law before this page can be published. Lawyer
            to draft an appropriate limitation of liability clause.
          </p>
        </section>

        {/* 10. Changes */}
        <section className="mt-10 border-t border-[var(--color-line)] pt-8">
          <h2 className="font-display text-xl font-semibold">
            10. Changes to the Site or these terms
          </h2>
          <p className="mt-4 leading-relaxed">
            We may update these terms, or change, suspend, or discontinue any part of the Site, at
            any time.{" "}
            <LegalReview>
              lawyer to advise on appropriate notice requirements for material changes.
            </LegalReview>
          </p>
        </section>

        {/* 11. Governing law */}
        <section className="mt-10 border-t border-[var(--color-line)] pt-8">
          <h2 className="font-display text-xl font-semibold">11. Governing law</h2>
          <p className="mt-4 leading-relaxed">
            These terms are governed by the laws of the Republic of South Africa.{" "}
            <LegalReview>
              lawyer to confirm and add appropriate jurisdiction and dispute resolution language.
            </LegalReview>
          </p>
        </section>

        {/* 12. Contact us */}
        <section className="mt-10 border-t border-[var(--color-line)] pt-8">
          <h2 className="font-display text-xl font-semibold">12. Contact us</h2>
          <p className="mt-4 leading-relaxed">Questions about these terms? Contact us at:</p>
          <p className="mt-3">
            <Gap>contact email address</Gap>
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
