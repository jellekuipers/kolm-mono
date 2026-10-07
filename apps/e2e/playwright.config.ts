import { defineConfig, devices } from "@playwright/test";

const baseURL = "http://localhost:3001";

/** Smoke tests against the full stack (client + API) started with `vp run dev`. */
export default defineConfig({
  testDir: "tests",
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL, trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "vp run dev",
    cwd: "../..",
    // Through the client's /api proxy, so both servers must be up.
    url: `${baseURL}/api/health/ready`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
