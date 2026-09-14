import { SiteHeader } from "@/components/layout/header";
import { SiteFooter } from "@/components/layout/footer";
import { Link } from "@/lib/navigation";

export const metadata = { title: "Privacy Policy — Job News SA" };

// Inline notation helpers — no border-radius per design rules
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

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="font-display text-3xl font-semibold">Privacy Policy</h1>
        <p className="mt-2 text-sm text-[var(--color-muted)]">Last updated: 14 September 2026</p>

        {/* 1. Who we are */}
        <section className="mt-10 border-t border-[var(--color-line)] pt-8">
          <h2 className="font-display text-xl font-semibold">1. Who we are</h2>
          <p className="mt-4 leading-relaxed">
            Job News SA ("we", "us", "the Site") operates a free job listing website for South
            Africa at{" "}
            <a
              href="https://jobnewssa.com"
              className="underline hover:text-[var(--color-rust)]"
            >
              jobnewssa.com
            </a>
            . This policy explains what personal information we collect from job seekers and
            employers who use the Site, why we collect it, who we share it with, and what rights
            you have over it.
          </p>
          <p className="mt-4 leading-relaxed">
            This policy is written to comply with South Africa's Protection of Personal Information
            Act, 2013 ("POPIA").{" "}
            <LegalReview>lawyer to confirm this statement is accurate once reviewed.</LegalReview>
          </p>
        </section>

        {/* 2. Information we collect */}
        <section className="mt-10 border-t border-[var(--color-line)] pt-8">
          <h2 className="font-display text-xl font-semibold">2. Information we collect</h2>

          <h3 className="mt-6 text-base font-semibold">2.1 Account information (all users)</h3>
          <p className="mt-3 leading-relaxed">When you create an account, we collect:</p>
          <ul className="mt-3 list-disc space-y-2 pl-6 leading-relaxed">
            <li>Your email address</li>
            <li>
              A password (stored as a secure hash — we never see or store your actual password)
            </li>
            <li>Your full name</li>
            <li>Whether you are signing up as a job seeker or an employer</li>
          </ul>

          <h3 className="mt-6 text-base font-semibold">
            2.2 Job seeker profile information (optional — you choose what to share)
          </h3>
          <p className="mt-3 leading-relaxed">If you complete your profile, you may provide:</p>
          <ul className="mt-3 list-disc space-y-2 pl-6 leading-relaxed">
            <li>Phone number, province, and city</li>
            <li>A short professional headline</li>
            <li>Your resume (PDF upload, stored privately)</li>
            <li>A profile photo</li>
            <li>Highest qualification title, qualification type, and NQF level</li>
            <li>
              Professional registration details (e.g. SAICA, HPCSA, ECSA — self-reported, not
              independently verified against any official registry)
            </li>
            <li>
              Work authorisation status (e.g. citizen, permanent resident, work permit holder)
            </li>
            <li>Job preferences (preferred province, contract type, minimum salary)</li>
          </ul>

          <h3 className="mt-6 text-base font-semibold">
            2.3 Special category information (optional, extra protection)
          </h3>
          <p className="mt-3 leading-relaxed">
            We separately, and optionally, ask whether you wish to share:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-6 leading-relaxed">
            <li>
              <strong>Disability status</strong>
            </li>
            <li>
              <strong>Employment Equity (EE) designation</strong> (population group, per the
              Employment Equity Act)
            </li>
          </ul>
          <p className="mt-4 leading-relaxed">
            <strong>These two fields are always optional.</strong> You can create an account, build
            a profile, apply for jobs, and use every feature of the Site without ever providing
            this information. If you choose to provide it:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-6 leading-relaxed">
            <li>
              It is stored with additional database-level protection separate from the rest of your
              profile
            </li>
            <li>It is never shown to employers or other users</li>
            <li>
              It may be used only in aggregated, anonymised form for reporting purposes.{" "}
              <LegalReview>
                Highest priority — lawyer to confirm the legal basis for collecting this category
                of data under POPIA sections 26–27 and 32–33, and whether this statement of purpose
                is accurate and sufficient.
              </LegalReview>
            </li>
          </ul>
          <p className="mt-4 leading-relaxed">
            We ask for your explicit consent before you provide this information.{" "}
            <LegalReview>
              lawyer to confirm the consent mechanism is adequate for this purpose under POPIA.
            </LegalReview>
          </p>

          <h3 className="mt-6 text-base font-semibold">2.4 Job applications and messages</h3>
          <p className="mt-3 leading-relaxed">If you apply for a job through the Site:</p>
          <ul className="mt-3 list-disc space-y-2 pl-6 leading-relaxed">
            <li>
              We store your application (which job, when, your cover note if you wrote one, and a
              copy of the resume you applied with)
            </li>
            <li>
              If the employer messages you (or you message them) about that application, we store
              those messages
            </li>
          </ul>
          <p className="mt-3 leading-relaxed">
            Messages and applications are only visible to you and the employer for that specific
            job — not to other users.
          </p>

          <h3 className="mt-6 text-base font-semibold">2.5 CV Maker and Z83 Form Filler tools</h3>
          <p className="mt-3 leading-relaxed">
            These tools let you build a CV or fill in South Africa's official Z83 government job
            application form and download it as a PDF.
          </p>
          <p className="mt-4 leading-relaxed">
            <strong>
              Some of the information these tools handle is never saved to our database, even if
              you are signed in
            </strong>{" "}
            — it exists only in your browser and in the PDF file you download:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-6 leading-relaxed">
            <li>Your South African ID number</li>
            <li>Your date of birth</li>
            <li>
              Your Z83 declaration answers (criminal record, disciplinary history, business
              interests with the State, and related details)
            </li>
            <li>Your drawn signature and initials</li>
          </ul>
          <p className="mt-4 leading-relaxed">
            Everything else you enter (contact details, work history, qualifications, references)
            may be saved as a draft to your account if you are signed in, so you don't have to
            retype it next time. If you are not signed in, your progress is kept only in your
            browser and is lost if you close the tab.
          </p>

          <h3 className="mt-6 text-base font-semibold">2.6 Employer information</h3>
          <p className="mt-3 leading-relaxed">
            If you sign up as an employer, we collect your company name, description, location,
            website, and the job listings you post. We check whether your account's email domain
            matches your company website's domain as a basic verification step — this is not formal
            identity verification.
          </p>

          <h3 className="mt-6 text-base font-semibold">2.7 Information we do NOT collect</h3>
          <ul className="mt-3 list-disc space-y-2 pl-6 leading-relaxed">
            <li>
              We do not run any analytics or tracking software on the Site.{" "}
              <LegalReview>
                Team to re-confirm this remains true before publishing, and periodically
                thereafter.
              </LegalReview>
            </li>
            <li>We do not use advertising cookies or tracking pixels</li>
            <li>We do not sell or rent your personal information to anyone</li>
          </ul>
        </section>

        {/* 3. Cookies */}
        <section className="mt-10 border-t border-[var(--color-line)] pt-8">
          <h2 className="font-display text-xl font-semibold">3. Cookies</h2>
          <p className="mt-4 leading-relaxed">
            The Site uses only one type of cookie: a session cookie that keeps you signed in. This
            cookie is strictly necessary for the Site to function and does not track you across
            other websites.{" "}
            <LegalReview>
              lawyer to confirm no cookie consent banner is required for this cookie profile under
              POPIA and applicable guidelines.
            </LegalReview>
          </p>
        </section>

        {/* 4. How we use your information */}
        <section className="mt-10 border-t border-[var(--color-line)] pt-8">
          <h2 className="font-display text-xl font-semibold">4. How we use your information</h2>
          <p className="mt-4 leading-relaxed">We use your information to:</p>
          <ul className="mt-3 list-disc space-y-2 pl-6 leading-relaxed">
            <li>Create and manage your account</li>
            <li>Show job seekers relevant job listings</li>
            <li>Let employers post jobs and review applications</li>
            <li>
              Let job seekers and employers message each other about a specific application
            </li>
            <li>
              Generate CVs and Z83 forms using the CV Maker and Z83 Form Filler tools
            </li>
            <li>
              Send you transactional emails (e.g. confirming your account, resetting your password)
            </li>
          </ul>
          <p className="mt-4 leading-relaxed">
            We do not use your information for advertising, and we do not share it with
            advertisers.
          </p>
        </section>

        {/* 5. Who we share your information with */}
        <section className="mt-10 border-t border-[var(--color-line)] pt-8">
          <h2 className="font-display text-xl font-semibold">
            5. Who we share your information with
          </h2>
          <ul className="mt-4 list-disc space-y-4 pl-6 leading-relaxed">
            <li>
              <strong>Supabase</strong> (our database, authentication, and file storage provider)
              — hosted in Singapore.{" "}
              <LegalReview>
                lawyer to advise on cross-border transfer implications under POPIA section 72, and
                whether this requires a specific safeguard or additional disclosure here.
              </LegalReview>
            </li>
            <li>
              <strong>Vercel</strong> (our hosting provider) — processes standard web request logs
              (IP address, browser type, page requested) as part of normal infrastructure operation
            </li>
            <li>
              <strong>Adzuna</strong> (a job listing aggregator) — we query Adzuna for job
              listings; we do not send them any of your personal information
            </li>
            <li>
              Employers, but only your application materials for jobs you specifically apply to —
              never your full profile, and never the information described in Section 2.3
            </li>
          </ul>
          <p className="mt-4 leading-relaxed">
            We do not share your information with any advertising network, data broker, or any
            party not listed above.
          </p>
        </section>

        {/* 6. How long we keep your information */}
        <section className="mt-10 border-t border-[var(--color-line)] pt-8">
          <h2 className="font-display text-xl font-semibold">
            6. How long we keep your information
          </h2>
          <p className="mt-4 bg-[var(--color-amber-dim)] px-4 py-3 text-sm font-medium text-[var(--color-amber)]">
            ⚑ PLACEHOLDER — Retention periods not yet decided. This section cannot be published
            until the following decisions are made and reviewed by a lawyer: (1) how long an
            inactive account's data is kept; (2) how long an application, cover note, and resume
            are kept after the job listing closes; (3) whether messages are ever automatically
            deleted.
          </p>
        </section>

        {/* 7. Your rights */}
        <section className="mt-10 border-t border-[var(--color-line)] pt-8">
          <h2 className="font-display text-xl font-semibold">7. Your rights</h2>
          <p className="mt-4 leading-relaxed">Under POPIA, you have the right to:</p>
          <ul className="mt-3 list-disc space-y-2 pl-6 leading-relaxed">
            <li>Access the personal information we hold about you</li>
            <li>Request that we correct inaccurate information</li>
            <li>
              Request deletion of your account and associated data —{" "}
              <strong>this is not yet self-service</strong>; see Section 9
            </li>
            <li>Object to certain processing of your information</li>
            <li>
              Lodge a complaint with the Information Regulator of South Africa if you believe we
              have handled your information unlawfully
            </li>
          </ul>
          <p className="mt-4 leading-relaxed">
            To exercise these rights, contact us at{" "}
            <Gap>contact email address</Gap>.
          </p>
          <p className="mt-3">
            <LegalReview>
              lawyer to confirm this list of rights is complete and correctly stated for POPIA.
            </LegalReview>
          </p>
        </section>

        {/* 8. Consent */}
        <section className="mt-10 border-t border-[var(--color-line)] pt-8">
          <h2 className="font-display text-xl font-semibold">8. Consent</h2>
          <p className="mt-4 leading-relaxed">
            When you create an account, you are asked to confirm you have read and agree to this
            Privacy Policy and our{" "}
            <Link href="/terms" prefetch={false} className="underline hover:text-[var(--color-rust)]">
              Terms &amp; Conditions
            </Link>{" "}
            before you can register.{" "}
            <LegalReview>
              lawyer to confirm whether any additional, separate consent step is needed for Section
              2.3's special category information beyond this general consent checkbox.
            </LegalReview>
          </p>
        </section>

        {/* 9. Account deletion */}
        <section className="mt-10 border-t border-[var(--color-line)] pt-8">
          <h2 className="font-display text-xl font-semibold">9. Account deletion</h2>
          <p className="mt-4 leading-relaxed">
            At the time of writing, there is no self-service way to delete your account and
            associated data. This is a known gap — POPIA gives you rights around deletion and
            objection to processing that this Site does not yet fully support in a self-service
            way. Until this is built, contact us at{" "}
            <Gap>contact email address</Gap> to request deletion.
          </p>
        </section>

        {/* 10. Children */}
        <section className="mt-10 border-t border-[var(--color-line)] pt-8">
          <h2 className="font-display text-xl font-semibold">10. Children</h2>
          <p className="mt-4 leading-relaxed">
            This Site is intended for use by people who are legally able to enter employment in
            South Africa.{" "}
            <LegalReview>
              lawyer to advise on whether a specific minimum-age statement is needed and what it
              should say.
            </LegalReview>
          </p>
        </section>

        {/* 11. Changes to this policy */}
        <section className="mt-10 border-t border-[var(--color-line)] pt-8">
          <h2 className="font-display text-xl font-semibold">11. Changes to this policy</h2>
          <p className="mt-4 leading-relaxed">
            We may update this policy from time to time.{" "}
            <LegalReview>
              lawyer to advise on appropriate notice requirements — e.g. whether material changes
              must be notified via email.
            </LegalReview>
          </p>
        </section>

        {/* 12. Contact us */}
        <section className="mt-10 border-t border-[var(--color-line)] pt-8">
          <h2 className="font-display text-xl font-semibold">12. Contact us</h2>
          <p className="mt-4 leading-relaxed">
            If you have questions about this policy or how we handle your information, contact us
            at:
          </p>
          <p className="mt-3">
            <Gap>contact email address</Gap>
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
