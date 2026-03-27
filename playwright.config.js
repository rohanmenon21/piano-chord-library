import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  retries: 0,
  timeout: 30_000,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  webServer: {
    command: "node tests/smoke-server.js",
    url: process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000",
    reuseExistingServer: true,
  },
});
