"use client";

import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from "react";

type ThemeMode = "dark";

interface ThemeContextValue {
  theme: ThemeMode;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const THEME_STORAGE_KEY = "aterinay_theme";

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return "dark";
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      return (saved as ThemeMode) || "dark";
    } catch {
      return "dark";
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
      document.documentElement.setAttribute("data-theme", theme);
    } catch {
      /* noop */
    }
  }, [theme]);

  /* Toggle is a no-op now, but keep it for API compat */
  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "dark" : "dark"));
  }, []);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setTheme(mode);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
};
