import React, {
  createContext,
  useLayoutEffect,
  useState,
} from "react";

export interface ThemeContextType {
  theme: string;
  setTheme: (theme: string) => void;
}

export const ThemeContext = createContext<ThemeContextType>({
  theme: "auto",
  setTheme: () => {},
});

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  function getSystemTheme() {
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    return "light";
  }

  const [themePreference, setThemePreference] = useState(() => {
    const token = localStorage.getItem("ks_token");
    if (!token) return "light";
    return localStorage.getItem("ks_theme") || "auto";
  });

  // Resolve theme từ preference
  const theme = themePreference === "auto" ? getSystemTheme() : themePreference;

  // Áp dụng theme mỗi khi theme thay đổi
  useLayoutEffect(() => {
    const token = localStorage.getItem("ks_token");
    if (!token) {
      document.documentElement.classList.remove("dark");
      return;
    }
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  // Khi theme thay đổi từ context
  function setTheme(t: string) {
    setThemePreference(t);
    localStorage.setItem("ks_theme", t);
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
