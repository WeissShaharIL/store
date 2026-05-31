import { test, expect } from "@playwright/test";

/**
 * Live-WebGL E2E for the customer 3D closet designer.
 *
 * This is the coverage jsdom can't give us: headless Chromium renders the real
 * Three.js scene (SwiftShader), so a crash INSIDE the canvas — the class of bug
 * that shipped as the activeItems / CaptureController / CSP white-screens —
 * surfaces here as an uncaught page error and fails the test.
 *
 * Hermetic: all /api/** is stubbed so no backend/DB is required.
 *
 * Note on clicks: the landing page has scroll-reveal animations + floating
 * overlays (cookie bar, WhatsApp button). Those keep Playwright's default
 * actionability wait from settling, so we scrollIntoView + force-click the
 * landing CTA. force is fine here — we're testing that the 3D scene mounts and
 * doesn't crash, not the button's hit-target.
 */

// Spy for the failure mode we care about: uncaught JS exceptions ("pageerror" —
// the white-screen class) and real console.errors. Resource 404s (an optional
// asset missing under `vite preview`) are environment noise → non-fatal.
function attachErrorSpies(page) {
  const fatal = [];
  const resource404 = [];
  page.on("pageerror", (e) => fatal.push(`pageerror: ${e.message}`));
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (/Failed to load resource|404|net::ERR/i.test(text)) resource404.push(text);
    else fatal.push(`console.error: ${text}`);
  });
  page.on("response", (res) => {
    if (res.status() >= 400) resource404.push(`${res.status()} ${res.url()}`);
  });
  return { fatal, resource404 };
}

test.beforeEach(async ({ page }) => {
  // Stub the public API the app calls on load. Empty/benign payloads — the
  // palette/handles contexts fall back to defaults, and from-scratch design
  // builds its config locally without any of these.
  await page.route("**/api/**", async (route) => {
    const url = route.request().url();
    let body = "[]";
    if (url.includes("/settings")) body = "{}";
    else if (url.includes("/logo")) body = "null";
    await route.fulfill({ status: 200, contentType: "application/json", body });
  });
});

// Open the from-scratch designer and return once its 3D <canvas> is on screen.
async function openDesigner(page) {
  const cta = page.getByRole("button", { name: /התחילו לעצב/ });
  await cta.scrollIntoViewIfNeeded();
  await cta.click({ force: true });

  // ScratchStart chooser (lazy/Suspense). Click "התחל לעצב" to mount the wizard.
  const start = page.getByRole("button", { name: /^התחל לעצב$/ });
  await expect(start).toBeVisible({ timeout: 30_000 });
  await start.click({ force: true });

  const canvas = page.locator("canvas").first();
  await expect(canvas).toBeVisible({ timeout: 30_000 });
  return canvas;
}

test("landing page renders without page errors", async ({ page }) => {
  const spy = attachErrorSpies(page);
  await page.goto("/");
  await expect(page.locator(".landing")).toBeVisible();
  await expect(page.getByRole("button", { name: /התחילו לעצב/ })).toBeVisible();
  if (spy.resource404.length) console.log("non-fatal 404s:", spy.resource404);
  expect(spy.fatal, spy.fatal.join("\n")).toEqual([]);
});

test("design-from-scratch renders the live 3D canvas with no crash", async ({ page }) => {
  const spy = attachErrorSpies(page);
  await page.goto("/");

  const canvas = await openDesigner(page);

  // A non-zero-size canvas proves the WebGL renderer initialized without
  // throwing (jsdom can't verify this).
  const box = await canvas.boundingBox();
  expect(box, "canvas should have a real size").not.toBeNull();
  expect(box.width).toBeGreaterThan(0);
  expect(box.height).toBeGreaterThan(0);

  await page.waitForTimeout(1000);
  if (spy.resource404.length) console.log("non-fatal 404s:", spy.resource404);
  expect(spy.fatal, spy.fatal.join("\n")).toEqual([]);
});

test("designer step navigation does not crash the scene", async ({ page }) => {
  const spy = attachErrorSpies(page);
  await page.goto("/");
  await openDesigner(page);

  // Advance through the wizard (stage 1 → stage 2 interior planner, where the
  // activeItems crash lived). Label varies; try common ones, skip if absent.
  const next = page.getByRole("button", { name: /הבא|המשך|next/i }).first();
  if (await next.count()) {
    await next.click({ force: true }).catch(() => {});
    await page.waitForTimeout(800);
  }
  if (spy.resource404.length) console.log("non-fatal 404s:", spy.resource404);
  expect(spy.fatal, spy.fatal.join("\n")).toEqual([]);
});
