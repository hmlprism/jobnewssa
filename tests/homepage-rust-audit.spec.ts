/**
 * Homepage rust colour audit
 *
 * Per the Broadsheet visual identity brief: rust (#c9481f) must appear ONLY
 * on primary CTAs, active filter states, links on hover, and the days-left
 * urgency indicator. It must NOT be used decoratively on secondary text.
 *
 * Checks:
 *  - Vacancy count stat: rendered in --color-muted (#6b6558), never rust
 *  - "View all jobs →" link: muted by default, becomes rust on hover
 *
 * Implementation references:
 *   app/page.tsx lines 23-25 (stat), line 77 (view all link)
 */

import { test, expect } from "@playwright/test";

// Resolved CSS custom property values
const RUST_RGB  = "rgb(201, 72, 31)";  // #c9481f
const MUTED_RGB = "rgb(107, 101, 88)"; // #6b6558

test.describe("Homepage rust colour audit", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Wait for the hero section to be painted
    await expect(page.getByText(/vacancies live right now/)).toBeVisible({
      timeout: 20_000,
    });
  });

  test('vacancy count stat uses muted colour — not rust', async ({ page }) => {
    const stat = page.getByText(/\d[\d,]* vacancies live right now/);
    await expect(stat).toBeVisible();

    const color = await stat.evaluate(
      (el) => window.getComputedStyle(el).color
    );

    // Must be muted, not rust
    expect(color).not.toBe(RUST_RGB);
    expect(color).toBe(MUTED_RGB);
  });

  test('"View all jobs →" is muted by default', async ({ page }) => {
    const link = page.getByRole("link", { name: "View all jobs →" });
    await expect(link).toBeVisible();

    const colorDefault = await link.evaluate(
      (el) => window.getComputedStyle(el).color
    );
    expect(colorDefault).not.toBe(RUST_RGB);
  });

  test('"View all jobs →" becomes rust on hover', async ({ page }) => {
    const link = page.getByRole("link", { name: "View all jobs →" });
    await expect(link).toBeVisible();

    await link.hover();
    // No transition on this element — colour change is instant.
    // A small settle time guards against any paint delay.
    await page.waitForTimeout(50);

    const colorHover = await link.evaluate(
      (el) => window.getComputedStyle(el).color
    );
    expect(colorHover).toBe(RUST_RGB);
  });
});
