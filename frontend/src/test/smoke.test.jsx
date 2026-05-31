/**
 * Render smoke tests — mount the major pages/tabs and assert they don't throw.
 *
 * Scope & honest limits: this runs in jsdom, which has no WebGL. So it CANNOT
 * catch a runtime crash that only happens inside a live <Canvas> / web worker
 * (e.g. the CSP-blocked troika worker). What it DOES catch is the larger class
 * of crashes we actually shipped: an undefined component (the <CaptureController>
 * white screen), a bad/missing import, or a render-time ReferenceError. The
 * heavy 3D modules are mocked so the surrounding component tree still renders.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// ── Mock the 3D stack (no WebGL in jsdom) ──────────────────────────────────
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
  OrbitControls: () => null,
  Environment: () => null,
  ContactShadows: () => null,
  Html: ({ children }) => <div>{children}</div>,
  Text: ({ children }) => <div>{children}</div>,
  Billboard: ({ children }) => <div>{children}</div>,
}));
// The actual 3D scene + cabinet renderer aren't meaningful in jsdom; stub them
// so consumers (LeadClosetPreview, ClosetDesigner) still mount and we exercise
// their own logic/JSX.
vi.mock("../pages/admin/closet3d/ClosetScene.jsx", () => ({
  default: ({ children }) => <div data-testid="closet-scene">{children}</div>,
}));
vi.mock("../pages/admin/closet3d/ClosetFromConfig.jsx", () => ({
  default: () => <div data-testid="closet-from-config" />,
}));

// ── Mock the API so tabs can fetch without a backend ───────────────────────
vi.mock("../api.js", () => {
  const ok = (v) => () => Promise.resolve(v);
  const api = {
    get: ok({}), post: ok({}), patch: ok({}), delete: ok({}),
    postForm: ok({}), downloadFile: ok(undefined),
  };
  return {
    default: api,
    api,
    // leads
    adminGetLeads: ok([]), adminGetTrashedLeads: ok([]), adminUpdateLead: ok({}),
    adminDeleteLead: ok({}), adminRestoreLead: ok({}), adminGetLeadCounts: ok({ all: 0, new: 0, contacted: 0, closed: 0 }),
    adminExportLeadsCsv: ok(undefined), adminGetLeadsUnreadCount: ok({ count: 0 }),
    adminCreateOrder: ok({}),
    // orders
    adminGetOrders: ok([]), adminGetOrderCounts: ok({ all: 0 }), adminUpdateOrder: ok({}),
    adminDeleteOrder: ok({}), adminExportOrdersCsv: ok(undefined),
    // activity / media / settings used by other tabs
    adminGetActivity: ok([]),
  };
});

import LeadClosetPreview from "../pages/admin/LeadClosetPreview.jsx";
import LeadsTab from "../pages/admin/LeadsTab.jsx";
import OrdersTab from "../pages/admin/OrdersTab.jsx";

function wrap(ui) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

const SAMPLE_ITEM = {
  name: "ארון בדיקה",
  config_json: JSON.stringify({
    kind: "hinged",
    dimensions: { H: 240, D: 56, T: 2, compartmentWidth: 80 },
    doors: [{ id: "d1", kind: "hinged", compartment: { defaultVariant: "v", variants: [{ id: "v", items: [] }] } }],
    color: "white",
  }),
  snapshot: { customDims: { H: 240, D: 56, compartmentWidth: 80 }, customColor: "white" },
};

describe("admin pages mount without throwing", () => {
  beforeEach(() => vi.clearAllMocks());

  it("LeadsTab renders", () => {
    const { container } = wrap(<LeadsTab />);
    expect(container).toBeTruthy();
  });

  it("OrdersTab renders", () => {
    const { container } = wrap(<OrdersTab />);
    expect(container).toBeTruthy();
  });

  it("LeadClosetPreview renders (the white-screen regression guard)", () => {
    // This is the component whose 3D view crashed twice. Mounting it exercises
    // the config-merge + capture wiring; an undefined component or bad import
    // here throws and fails the test.
    const { getByText } = wrap(<LeadClosetPreview item={SAMPLE_ITEM} onClose={() => {}} />);
    expect(getByText("ארון בדיקה")).toBeTruthy();
  });
});
