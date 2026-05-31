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
