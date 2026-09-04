/**
 * Employer verification — domain-match flow
 *
 * Tests two cases on the /employer/verify page:
 *   1. Mismatched domain → shows the mismatch message
 *   2. Matching domain   → page transitions to "verified" state
 *
 * ─── CREDENTIALS REQUIRED ─────────────────────────────────────────────────
 * Set these env vars before running:
 *
 *   TEST_EMPLOYER_EMAIL     email of an employer account (role = 'employer')
 *   TEST_EMPLOYER_PASSWORD  its password
 *
 * The employer account must have signed up with role = "employer". It does
 * NOT need to have posted any jobs — the companies Supabase call is mocked.
 *
 * ─── NO PERMANENT ARTIFACTS ───────────────────────────────────────────────
 * Both the Supabase companies SELECT and the /api/employer/verify POST are
 * fully mocked:
 *
 *   companies GET  → fake unverified company (avoids "no company" gate)
 *   /api/employer/verify POST → controlled JSON response (no DB write ever)
 *
 * The domain-match case mocks the API response to return { verified: true }
 * without hitting the real endpoint, so company_verified is never set in the
 * production database. Idempotent across unlimited test runs.
 *
 * Implementation reference: app/employer/verify/page.tsx, app/api/employer/verify/route.ts
 */

import { test, expect } from "@playwright/test";

const EMPLOYER_EMAIL = process.env.TEST_EMPLOYER_EMAIL;
const EMPLOYER_PASS  = process.env.TEST_EMPLOYER_PASSWORD;

// The URL whose domain matches the employer email's domain.
// E.g. if email is test@jobnewssa.vercel.app → use https://jobnewssa.vercel.app
// Update this constant to match your test employer's email domain.
const MATCHING_URL   = process.env.TEST_EMPLOYER_WEBSITE ?? "https://jobnewssa.vercel.app";
const MISMATCH_URL   = "https://wrongdomain-notreal-xyz.example.com";

test.describe("Employer verification", () => {
  test.skip(
    !EMPLOYER_EMAIL || !EMPLOYER_PASS,
    "Set TEST_EMPLOYER_EMAIL and TEST_EMPLOYER_PASSWORD to run these tests"
  );

  test.beforeEach(async ({ page }) => {
    // ── Mock: companies endpoint → fake unverified company ─────────────────
    // Bypasses the "Post a job first" gate without touching the DB.
    await page.route("**/rest/v1/companies*", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([
            {
              id: "mock-company-id",
              owner_id: "mock-owner-id",
              name: "Test Company",
              slug: "test-company",
              logo_url: null,
              website: null,
              description: null,
              province: null,
              city: null,
              verified: false,
              verification_method: null,
              verified_at: null,
              created_at: new Date().toISOString(),
            },
          ]),
        });
      } else {
        await route.continue();
      }
    });

    // ── Mock: /api/employer/verify POST ────────────────────────────────────
    // Returns a controlled response based on the submitted URL.
    // The real API endpoint is NEVER called — no DB write, no domain fetch.
    await page.route("**/api/employer/verify", async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }

      let body: { websiteUrl?: string } = {};
      try {
        body = JSON.parse(route.request().postData() ?? "{}");
      } catch {
        // malformed — fall through to mismatch
      }

      const url = (body.websiteUrl ?? "").toLowerCase();
      const emailDomain = (EMPLOYER_EMAIL ?? "").split("@")[1]?.toLowerCase() ?? "";
      const hostMatches =
        emailDomain && (url.includes(emailDomain) || url.includes("jobnewssa.vercel.app"));

      if (hostMatches) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ verified: true }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            verified: false,
            reason: "domain_mismatch",
            message:
              "Your account email domain doesn't match the website domain. " +
              "Manual review isn't available yet — your jobs will continue to post as unverified.",
          }),
        });
      }
    });

    await page.goto("/employer/verify");

    // Wait for the page to leave the loading state and show the form
    await expect(
      page.getByRole("heading", { name: "Verify your employer account" })
    ).toBeVisible({ timeout: 20_000 });

    await expect(
      page.getByPlaceholder("https://yourcompany.co.za")
    ).toBeVisible({ timeout: 10_000 });
  });

  test("shows domain mismatch message for a non-matching URL", async ({ page }) => {
    await page
      .getByPlaceholder("https://yourcompany.co.za")
      .fill(MISMATCH_URL);

    await page.getByRole("button", { name: "Verify now" }).click();

    // The mismatch message must appear
    await expect(page.getByText(/doesn't match/i)).toBeVisible({
      timeout: 10_000,
    });

    // The verified state must NOT appear
    await expect(
      page.getByText("✓ Your account is verified")
    ).not.toBeVisible();
  });

  test("transitions to verified state for a matching domain URL", async ({ page }) => {
    await page
      .getByPlaceholder("https://yourcompany.co.za")
      .fill(MATCHING_URL);

    await page.getByRole("button", { name: "Verify now" }).click();

    // Verified confirmation must appear (indigo panel, Fraunces font)
    await expect(
      page.getByText("✓ Your account is verified")
    ).toBeVisible({ timeout: 10_000 });

    // The form should no longer be visible
    await expect(
      page.getByRole("button", { name: "Verify now" })
    ).not.toBeVisible();
  });
});
