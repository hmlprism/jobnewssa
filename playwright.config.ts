import { defineConfig, devices } from "@playwright/test";

/**
 * Tests run against the live production site — no local dev server is started.
 * Auth-dependent tests use storageState files written by the setup projects.
 * Those files are created by tests/setup/*.setup.ts and are gitignored.
 */
export default defineConfig({
  testDir: "./tests",
  fullyParallel: false, // sequential against prod avoids race conditions
  retries: 1,           // one retry catches transient network blips
  timeout: 30_000,
  reporter: "list",
  use: {
    baseURL: "https://jobnewssa.vercel.app",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    headless: true,
  },

  projects: [
    // ─── Auth setup (runs before dependent projects) ───────────────────────
    {
      name: "seeker-setup",
      testMatch: "**/setup/seeker.setup.ts",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "employer-setup",
      testMatch: "**/setup/employer.setup.ts",
      use: { ...devices["Desktop Chrome"] },
    },

    // ─── No-auth tests — always run ───────────────────────────────────────
    {
      name: "public",
      testMatch: [
        "**/job-card-hover.spec.ts",
        "**/empty-search.spec.ts",
        "**/homepage-rust-audit.spec.ts",
      ],
      use: { ...devices["Desktop Chrome"] },
    },

    // ─── Auth-dependent: job seeker ───────────────────────────────────────
    {
      name: "seeker",
      testMatch: "**/apply-confirmation.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "tests/.auth/seeker.json",
      },
      dependencies: ["seeker-setup"],
    },

    // ─── Auth-dependent: employer ─────────────────────────────────────────
    {
      name: "employer",
      testMatch: "**/employer-verification.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "tests/.auth/employer.json",
      },
      dependencies: ["employer-setup"],
    },
  ],
});
