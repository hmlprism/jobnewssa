/**
 * Employer auth setup.
 *
 * Logs in as the test employer account and saves storage state for
 * employer-verification.spec.ts.
 *
 * The test employer account must have role = 'employer' in the database
 * (set at signup). No company record is required — that endpoint is mocked
 * in the spec itself.
 */

import { test as setup } from "@playwright/test";
import fs from "fs";
import path from "path";

const AUTH_FILE = path.join(process.cwd(), "tests/.auth/employer.json");

setup("employer auth setup", async ({ page }) => {
  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });

  const email = process.env.TEST_EMPLOYER_EMAIL;
  const password = process.env.TEST_EMPLOYER_PASSWORD;

  if (!email || !password) {
    fs.writeFileSync(AUTH_FILE, JSON.stringify({ cookies: [], origins: [] }));
    console.log("⚠  TEST_EMPLOYER_EMAIL / TEST_EMPLOYER_PASSWORD not set — writing empty auth file");
    return;
  }

  await page.goto("/auth/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("/jobs", { timeout: 15_000 });

  await page.context().storageState({ path: AUTH_FILE });
  console.log(`✓  Employer session saved to ${AUTH_FILE}`);
});
