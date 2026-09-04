/**
 * Empty search state — editorial moment
 *
 * Verifies that when no jobs match a search query:
 * 1. The editorial Fraunces headline is shown
 * 2. Two useful actions are present (clear filters, job alert CTA)
 * 3. There are NO illustration images in the main content area
 * 4. The old "No jobs match those filters" copy is gone
 *
 * Implementation reference: app/jobs/page.tsx (empty state block)
 */

import { test, expect } from "@playwright/test";

const IMPOSSIBLE_QUERY = "xyznonexistentjob123456789";

test.describe("Empty search state", () => {
  test("shows the editorial headline and useful actions", async ({ page }) => {
    await page.goto(`/jobs?q=${IMPOSSIBLE_QUERY}`);

    // Editorial headline (Fraunces display font)
    const heading = page.getByRole("heading", {
      name: "No listings match — yet.",
    });
    await expect(heading).toBeVisible({ timeout: 20_000 });

    // Primary action: clear filters
    await expect(
      page.getByRole("link", { name: "Clear all filters" })
    ).toBeVisible();

    // Secondary action: job alert prompt
    await expect(
      page.getByRole("link", { name: "Create a free account" })
    ).toBeVisible();
  });

  test("contains no illustration images in main content", async ({ page }) => {
    await page.goto(`/jobs?q=${IMPOSSIBLE_QUERY}`);
    await expect(
      page.getByRole("heading", { name: "No listings match — yet." })
    ).toBeVisible({ timeout: 20_000 });

    // Design constraint: empty states must be text-only — no mascots, no SVG illustrations
    const imgCount = await page.locator("main img").count();
    expect(imgCount).toBe(0);
  });

  test("does not show the old copy", async ({ page }) => {
    await page.goto(`/jobs?q=${IMPOSSIBLE_QUERY}`);
    await expect(
      page.getByRole("heading", { name: "No listings match — yet." })
    ).toBeVisible({ timeout: 20_000 });

    // Regression guard: old copy must be gone
    await expect(page.getByText("No jobs match those filters")).not.toBeVisible();
  });

  test("clear-all-filters link points to /jobs with no query", async ({
    page,
  }) => {
    await page.goto(`/jobs?q=${IMPOSSIBLE_QUERY}`);
    await expect(
      page.getByRole("heading", { name: "No listings match — yet." })
    ).toBeVisible({ timeout: 20_000 });

    const link = page.getByRole("link", { name: "Clear all filters" });
    const href = await link.getAttribute("href");
    expect(href).toBe("/jobs");
  });
});
