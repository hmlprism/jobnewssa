/**
 * Job card hover — rust left keyline
 *
 * Verifies the Broadsheet personality moment: hovering a job card reveals a
 * 3px rust-coloured left keyline (implemented as a ::before pseudo-element
 * whose opacity transitions 0 → 1 over 75 ms).
 *
 * Implementation reference: components/jobs/job-card.tsx
 *   before:opacity-0  hover:before:opacity-100  before:bg-[var(--color-rust)]
 */

import { test, expect } from "@playwright/test";

// #c9481f resolved to RGB
const RUST_RGB = "rgb(201, 72, 31)";

test.describe("Job card hover — rust keyline", () => {
  test("::before pseudo-element is hidden before hover and visible after", async ({
    page,
  }) => {
    await page.goto("/jobs");

    // Select the first link that goes to a specific job (not the /jobs listing page itself)
    const card = page
      .locator('a[href^="/jobs/"]:not([href="/jobs"])')
      .first();
    await expect(card).toBeVisible({ timeout: 20_000 });

    // Before hover: pseudo-element opacity must be 0
    const opacityBefore = await card.evaluate((el) =>
      window.getComputedStyle(el, "::before").opacity
    );
    expect(opacityBefore).toBe("0");

    // Hover — hold the mouse over the card
    await card.hover();
    // Wait slightly longer than the 75 ms transition
    await page.waitForTimeout(200);

    // After hover: pseudo-element must be fully opaque
    const opacityAfter = await card.evaluate((el) =>
      window.getComputedStyle(el, "::before").opacity
    );
    expect(opacityAfter).toBe("1");

    // Keyline must use the rust accent colour
    const keylineColor = await card.evaluate((el) =>
      window.getComputedStyle(el, "::before").backgroundColor
    );
    expect(keylineColor).toBe(RUST_RGB);
  });

  test("::before pseudo-element is 3 px wide", async ({ page }) => {
    await page.goto("/jobs");

    const card = page
      .locator('a[href^="/jobs/"]:not([href="/jobs"])')
      .first();
    await expect(card).toBeVisible({ timeout: 20_000 });

    const width = await card.evaluate(
      (el) => window.getComputedStyle(el, "::before").width
    );
    // 3px — allow a sub-pixel tolerance from the browser
    const px = parseFloat(width);
    expect(px).toBeGreaterThanOrEqual(2.5);
    expect(px).toBeLessThanOrEqual(3.5);
  });
});
