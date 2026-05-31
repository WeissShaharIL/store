import "@testing-library/jest-dom";

// ── jsdom polyfills for browser APIs the app touches ───────────────────────
// jsdom implements none of these; without stubs, rendering components that use
// them (ScrollManager, useIsMobile, etc.) throws. Minimal no-op implementations
// are enough for render smoke tests.

if (!window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent() { return false; },
  });
}

if (!window.IntersectionObserver) {
  class IO {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
  }
  window.IntersectionObserver = IO;
  globalThis.IntersectionObserver = IO;
}

if (!window.ResizeObserver) {
  class RO {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  window.ResizeObserver = RO;
  globalThis.ResizeObserver = RO;
}

// requestIdleCallback / cancelIdleCallback: jsdom (via vitest) provides these,
// and components use them to PREFETCH heavy chunks (dynamic import of the 3D
// designer) on idle. In tests that prefetch fires real dynamic imports whose
// async init touches browser APIs jsdom lacks → an unhandled rejection AFTER
// the test passes, which vitest reports as a non-zero exit. Stub them as no-ops
// that never invoke the callback so render tests don't trigger background
// prefetch side effects. (The prefetch is a perf optimization, not behavior
// under test — the real first-open path still works.)
window.requestIdleCallback = () => 0;
window.cancelIdleCallback = () => {};
globalThis.requestIdleCallback = window.requestIdleCallback;
globalThis.cancelIdleCallback = window.cancelIdleCallback;
