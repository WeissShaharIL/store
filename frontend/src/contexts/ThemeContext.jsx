import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext(null);
const STORAGE_KEY = "demo_theme";

export const THEMES = ["light", "dark", "sepia"];

function initial() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (THEMES.includes(stored)) return stored;
  if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) return "dark";
  return "light";
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(initial);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  function setTheme(next) {
    if (THEMES.includes(next)) setThemeState(next);
  }

  function cycleTheme() {
    setThemeState((t) => {
      const i = THEMES.indexOf(t);
      return THEMES[(i + 1) % THEMES.length];
    });
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, cycleTheme, toggle: cycleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be inside ThemeProvider");
  return ctx;
}

export function useForceLightTheme() {
  const { setTheme } = useTheme();
  useEffect(() => {
    setTheme("light");
  }, [setTheme]);
}
