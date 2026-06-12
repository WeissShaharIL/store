import { createContext, useContext, useEffect, useState } from "react";
import { getPublicSettings } from "../api.js";

const DEFAULT_NAV_ITEMS = [
  { id: "catalog",  label: "קטלוג",  visible: true },
  { id: "orders",   label: "הזמנות", visible: true },
  { id: "messages", label: "הודעות", visible: true },
];

const NAV_FONT_SIZES = { sm: "12px", md: "14px", lg: "16px" };

const SiteSettingsContext = createContext(null);

export function ThemeProvider({ children }) {
  const [settings, setSettings] = useState({
    site_theme: "light",
    nav_font_size: "md",
    nav_items_json: JSON.stringify(DEFAULT_NAV_ITEMS),
  });

  useEffect(() => {
    getPublicSettings()
      .then((data) => setSettings((prev) => ({ ...prev, ...data })))
      .catch(() => {});
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", settings.site_theme || "light");
  }, [settings.site_theme]);

  useEffect(() => {
    const px = NAV_FONT_SIZES[settings.nav_font_size] ?? NAV_FONT_SIZES.md;
    document.documentElement.style.setProperty("--nav-font-size", px);
  }, [settings.nav_font_size]);

  return (
    <SiteSettingsContext.Provider value={{ settings, setSettings }}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings() {
  const ctx = useContext(SiteSettingsContext);
  return ctx ?? { settings: {}, setSettings: () => {} };
}

export function useTheme() {
  return useSiteSettings();
}

export function useForceLightTheme() {
  // No-op — theme is controlled by admin settings.
}

export function parseNavItems(json) {
  try {
    const parsed = JSON.parse(json || "[]");
    return Array.isArray(parsed) && parsed.length ? parsed : DEFAULT_NAV_ITEMS;
  } catch {
    return DEFAULT_NAV_ITEMS;
  }
}
