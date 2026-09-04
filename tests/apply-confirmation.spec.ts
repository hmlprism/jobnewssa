/**
 * Apply confirmation — editorial moment
 *
 * Verifies that after submitting a job application the UI shows the
 * Broadsheet-designed confirmation state:
 *   Fraunces headline "Your application is in."
 *   + a calm, useful next-step sentence with a "browse more vacancies" link
 *
 * ─── CREDENTIALS REQUIRED ─────────────────────────────────────────────────
 * Set these env vars before running:
 *
 *   TEST_SEEKER_EMAIL     email of a job-seeker account in production Supabase
 *   TEST_SEEKER_PASSWORD  its password
 *   TEST_JOB_SLUG         slug of an employer_direct job (NOT an Adzuna job —
 *                         those show "Apply on original site" instead of a form)
 *
 * Run setup first to capture the session:
 *   npx playwright test --project=seeker-setup
 *   npx playwright test --project=seeker
 *
 * ─── NO PERMANENT ARTIFACTS ───────────────────────────────────────────────
 * The Supabase INSERT into `applications` is intercepted via page.route() and
 * fulfilled with a mock 201 response. Nothing is written to the production
 * database — the test is fully idempotent and leaves no junk in the DB.
 *
 * The profile GET is also mocked to return a profile with a resume_url so
 * the test account does not need a real resume uploaded.
 *
 * The applications GET is mocked to return empty (not-yet-applied) so the
 * form always renders fresh, not the "already applied" state.
 *
 * Implementation reference: components/jobs/apply-panel.tsx
 */

import { test, expect } from "@playwright/test";

const SEEKER_EMAIL  = process.env.TEST_SEEKER_EMAIL;
const SEEKER_PASS   = process.env.TEST_SEEKER_PASSWORD;
const JOB_SLUG      = process.env.TEST_JOB_SLUG;

test.describe("Apply confirmation", () => {
  // Skip the entire describe block when credentials are missing.
  test.skip(
    !SEEKER_EMAIL || !SEEKER_PASS || !JOB_SLUG,
    "Set TEST_SEEKER_EMAIL, TEST_SEEKER_PASSWORD, and TEST_JOB_SLUG to run these tests"
  );

  test.beforeEach(async ({ page }) => {
    // ── Mock: profile has a resume (avoids "no resume" gate) ──────────────
    // No DB write — only intercepts the read.
    await page.route("**/rest/v1/profiles*", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([{ resume_url: "test/placeholder-resume.pdf" }]),
        });
      } else {
        await route.continue();
      }
    });

    // ── Mock: applications endpoint ────────────────────────────────────────
    // GET  → empty array   (not already applied — show the form)
    // POST → 201 success   (intercept the insert — NO write to production DB)
    await page.route("**/rest/v1/applications*", async (route) => {
      const method = route.request().method();
      if (method === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([]),
        });
      } else if (method === "POST") {
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify([
            { id: "mock-test-application-id", job_id: JOB_SLUG, applicant_id: "mock" },
          ]),
        });
      } else {
        await route.continue();
      }
    });
  });

  test("shows Fraunces confirmation headline and next-step link after applying", async ({
    page,
  }) => {
    await page.goto(`/jobs/${JOB_SLUG}`);

    // If this is an external (Adzuna) job it shows an external apply button,
    // not our apply panel. Fail fast with a clear message.
    const externalBtn = page.getByRole("link", {
      name: /Apply on original site/i,
    });
    const isExternal = await externalBtn.isVisible({ timeout: 5_000 }).catch(() => false);
    if (isExternal) {
      throw new Error(
        `TEST_JOB_SLUG "${JOB_SLUG}" is an external (Adzuna) job — ` +
        "choose an employer_direct job slug instead."
      );
    }

    // Wait for the apply form to fully load (auth check + API calls complete)
    const submitBtn = page.getByRole("button", { name: /Submit application/i });
    await expect(submitBtn).toBeVisible({ timeout: 15_000 });

    await submitBtn.click();

    // ── Assertions on the confirmation state ──────────────────────────────
    // Fraunces display headline
    await expect(page.getByText("Your application is in.")).toBeVisible({
      timeout: 10_000,
    });

    // Useful next-step link
    await expect(
      page.getByRole("link", { name: /browse more vacancies/i })
    ).toBeVisible();

    // Regression guard: old green box copy must be gone
    await expect(
      page.getByText("You've applied to this job.")
    ).not.toBeVisible();
  });
});
