// contexts/ThemeContext.js
import React, { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext();

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)");

    const applyTheme = (dark) => {
      setIsDark(dark);
      document.documentElement.classList.toggle("dark", dark);
      document.documentElement.classList.toggle("light", !dark);
    };

    if (savedTheme) {
      applyTheme(savedTheme === "dark");
    } else {
      applyTheme(systemPrefersDark.matches);
    }

    const listener = (e) => applyTheme(e.matches);
    systemPrefersDark.addEventListener("change", listener);

    return () => systemPrefersDark.removeEventListener("change", listener);
  }, []);

  const toggleTheme = () => {
    setIsDark((prev) => {
      const newTheme = !prev;
      localStorage.setItem("theme", newTheme ? "dark" : "light");
      document.documentElement.classList.toggle("dark", newTheme);
      document.documentElement.classList.toggle("light", !newTheme);
      return newTheme;
    });
  };

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
