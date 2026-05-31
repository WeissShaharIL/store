/**
 * Render smoke tests for the CUSTOMER-facing pages. Same jsdom caveat as
 * smoke.test.jsx: no WebGL, so the live 3D canvas isn't exercised — but an
 * undefined component, bad import, or render-time ReferenceError in the page
 * tree (the class of bug we've actually shipped) throws here and fails.
 *
 * Pages are rendered directly under MemoryRouter (not via App), which avoids
 * ScrollManager's IntersectionObserver wiring and keeps each test isolated.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

// 3D stack (no WebGL in jsdom).
vi.mock("@react-three/fiber", () => ({
  Canvas: ({ children }) => <div data-testid="canvas">{children}</div>,
  useFrame: () => {},
  useThree: () => ({
    camera: { position: { set() {}, clone: () => ({}), copy() {} }, lookAt() {}, updateProjectionMatrix() {} },
    gl: { domElement: { toDataURL: () => "data:," }, render() {} },
    scene: {},
  }),
}));
vi.mock("@react-three/drei", () => ({
  OrbitControls: () => null, Environment: () => null, ContactShadows: () => null,
  Html: ({ children }) => <div>{children}</div>, Text: ({ children }) => <div>{children}</div>,
  Billboard: ({ children }) => <div>{children}</div>,
}));
vi.mock("../pages/admin/closet3d/ClosetScene.jsx", () => ({
  default: ({ children }) => <div data-testid="closet-scene">{children}</div>,
}));
vi.mock("../pages/admin/closet3d/ClosetFromConfig.jsx", () => ({
  default: () => <div data-testid="closet-from-config" />,
}));

// API — public getters return empty/benign data so useEffect fetches resolve.
vi.mock("../api.js", () => {
  const ok = (v) => () => Promise.resolve(v);
  return {
    default: { get: ok({}), post: ok({}) },
    getPublicClosets: ok([]),
    getPublicSettings: ok({}),
    getPublicHeroBanners: ok([]),
    getActiveLogo: ok(null),
    getDoorTypeCovers: ok([]),
    submitLead: ok({ ok: true }),
  };
});

import ShowroomPage from "../pages/ShowroomPage.jsx";
import CartPage from "../pages/CartPage.jsx";
import LandingPage from "../pages/LandingPage.jsx";
import ScratchStart from "../pages/ScratchStart.jsx";
import ClosetDesigner from "../pages/ClosetDesigner.jsx";
import { newConfig } from "../pages/admin/closet-builder/defaults.js";

beforeEach(() => {
  sessionStorage.clear();
});

describe("customer pages mount without throwing", () => {
  it("LandingPage renders", () => {
    const { container } = render(<MemoryRouter><LandingPage /></MemoryRouter>);
    expect(container).toBeTruthy();
  });

  it("ShowroomPage renders (with a :kind route param)", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/showroom?kind=hinged"]}>
        <Routes>
          <Route path="/showroom" element={<ShowroomPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(container).toBeTruthy();
  });

  it("CartPage renders empty", () => {
    const { container } = render(<MemoryRouter><CartPage /></MemoryRouter>);
    expect(container).toBeTruthy();
  });

  it("CartPage renders with items in the cart", () => {
    sessionStorage.setItem(
      "store_cart",
      JSON.stringify([{ id: "x", name: "ארון", config_json: "{}" }]),
    );
    const { container } = render(<MemoryRouter><CartPage /></MemoryRouter>);
    expect(container).toBeTruthy();
  });

  it("ScratchStart (design-from-scratch chooser) renders", () => {
    const { container } = render(
      <MemoryRouter><ScratchStart onClose={() => {}} /></MemoryRouter>,
    );
    // The kind/door chooser shows before any designer is mounted.
    expect(container.textContent.length).toBeGreaterThan(0);
  });
});

describe("ClosetDesigner mounts without throwing (white-screen guard)", () => {
  // The designer has white-screened multiple times (undefined CaptureController,
  // the activeItems crash). Context hooks have createContext defaults, so it
  // renders without providers; the 3D scene is mocked. This guards the wizard
  // shell + step-1 controls from render-time crashes.
  function makeItem() {
    const config = newConfig();
    return { id: "test-item", name: "ארון בדיקה", config, config_json: JSON.stringify(config) };
  }

  it("renders a template-mode designer (step 1)", () => {
    const { container } = render(
      <MemoryRouter><ClosetDesigner item={makeItem()} onClose={() => {}} /></MemoryRouter>,
    );
    expect(container.textContent).toContain("ארון בדיקה");
  });

  it("renders a from-scratch designer", () => {
    const { container } = render(
      <MemoryRouter><ClosetDesigner item={makeItem()} onClose={() => {}} fromScratch /></MemoryRouter>,
    );
    expect(container).toBeTruthy();
  });
});
