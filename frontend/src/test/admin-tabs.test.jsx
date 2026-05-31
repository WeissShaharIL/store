/**
 * Render smoke tests for the admin tabs (non-3D ones). Same jsdom caveat as the
 * other render tests: no WebGL. These tabs are forms/lists, so jsdom renders
 * them fully — an undefined component, bad import, or render-time crash throws
 * here and fails. The 3D-heavy PituchTab/DevClosetBuilder are intentionally
 * NOT covered (they need the WebGL canvas; that's the Playwright phase).
 *
 * api.js is mocked with a Proxy so any named import resolves to an async no-op
 * returning [] — safe for both list consumers (.map) and dict consumers
 * (Object.entries([]) === []). This keeps the mock robust as api.js grows.
 */
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("../api.js", () => {
  const handler = {
    get(_target, prop) {
      if (prop === "__esModule") return true;
      if (prop === "default") return {};
      // Every named export is an async fn returning an empty list.
      return () => Promise.resolve([]);
    },
  };
  return new Proxy({}, handler);
});

import ActivityTab from "../pages/admin/ActivityTab.jsx";
import SettingsTab from "../pages/admin/SettingsTab.jsx";
import ImagesTab from "../pages/admin/ImagesTab.jsx";
import LandingSettingsTab from "../pages/admin/LandingSettingsTab.jsx";
import HandlesTab from "../pages/admin/HandlesTab.jsx";
import ColorsTab from "../pages/admin/ColorsTab.jsx";
import ClosetTemplatesTab from "../pages/admin/ClosetTemplatesTab.jsx";
import OrdersTab from "../pages/admin/OrdersTab.jsx";
import LeadsTab from "../pages/admin/LeadsTab.jsx";

function wrap(ui) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe("admin tabs mount without throwing", () => {
  const tabs = [
    ["ActivityTab", ActivityTab],
    ["SettingsTab", SettingsTab],
    ["ImagesTab", ImagesTab],
    ["LandingSettingsTab", LandingSettingsTab],
    ["HandlesTab", HandlesTab],
    ["ColorsTab", ColorsTab],
    ["ClosetTemplatesTab", ClosetTemplatesTab],
    ["OrdersTab", OrdersTab],
    ["LeadsTab", LeadsTab],
  ];

  for (const [name, Tab] of tabs) {
    it(`${name} renders`, () => {
      const { container } = wrap(<Tab />);
      expect(container).toBeTruthy();
    });
  }
});
