import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

type Theme = "dark" | "light";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeCtx = createContext<ThemeContextType | null>(null);

export function useTheme(): ThemeContextType {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error("useTheme must be used within <ThemeProvider>");
  return ctx;
}

function getInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem("iman_theme");
    if (stored === "light") return "light";
  } catch {}
  return "dark";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  // Sync data-theme attribute
  useEffect(() => {
    if (theme === "light") {
      document.documentElement.setAttribute("data-theme", "light");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      localStorage.setItem("iman_theme", next);
      return next;
    });
  }, []);

  return (
    <ThemeCtx.Provider value={{ theme, toggleTheme, isDark: theme === "dark" }}>
      {children}
    </ThemeCtx.Provider>
  );
}
