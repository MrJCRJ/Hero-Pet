import React, { createContext, useContext, useEffect, type ReactNode } from "react";

/** Tema dark fixo – sem alternância light/dark. */
interface ThemeContextValue {
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (ctx == null) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}

const THEME_VALUE: ThemeContextValue = {
  isDark: true,
  toggleTheme: () => {},
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    document.documentElement.classList.add("dark");
    document.documentElement.classList.remove("light");
  }, []);

  return (
    <ThemeContext.Provider value={THEME_VALUE}>{children}</ThemeContext.Provider>
  );
}
