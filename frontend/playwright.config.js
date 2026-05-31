import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E config — covers the ONE thing jsdom/vitest can't: the live
 * WebGL 3D canvas. Headless Chromium renders Three.js via SwiftShader, so a
 * crash *inside* the scene (the class of bug that shipped as the activeItems /
 * CaptureController / CSP white-screens) surfaces here as a page error.
 *
 * Hermetic: the spec mocks /api/** via page.route, so no backend/DB is needed.
 * The web server is the production build served by `vite preview` — closest to
 * what users actually get.
 *
 * Separate from vitest: tests live in ./e2e (vitest only scans src/**), so the
 * two runners never pick up each other's files.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  timeout: 60_000,
  use: {
    baseURL: "http://localhost:4173",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    // Build then serve the production bundle on a fixed port.
    command: "npm run build && npm run preview -- --port 4173 --strictPort",
    url: "http://localhost:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
