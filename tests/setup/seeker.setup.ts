/**
 * Seeker auth setup.
 *
 * Logs in as the test job-seeker account and saves the browser storage state
 * so apply-confirmation.spec.ts can reuse the session without logging in again.
 *
 * If TEST_SEEKER_EMAIL / TEST_SEEKER_PASSWORD are absent, writes an empty
 * auth file — the spec will skip itself on the credential check.
 */

import { test as setup } from "@playwright/test";
import fs from "fs";
import path from "path";

const AUTH_FILE = path.join(process.cwd(), "tests/.auth/seeker.json");

setup("seeker auth setup", async ({ page }) => {
  // Always ensure the file exists so the storageState reference never throws.
  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });

  const email = process.env.TEST_SEEKER_EMAIL;
  const password = process.env.TEST_SEEKER_PASSWORD;

  if (!email || !password) {
    fs.writeFileSync(AUTH_FILE, JSON.stringify({ cookies: [], origins: [] }));
    console.log("⚠  TEST_SEEKER_EMAIL / TEST_SEEKER_PASSWORD not set — writing empty auth file");
    return;
  }

  await page.goto("/auth/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("/jobs", { timeout: 15_000 });

  await page.context().storageState({ path: AUTH_FILE });
  console.log(`✓  Seeker session saved to ${AUTH_FILE}`);
});
